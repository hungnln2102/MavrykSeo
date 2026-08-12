import { clickhouse } from '@seo/clickhouse';
import axios from 'axios';

export interface IndexabilityIssueSignal {
  detector_type: 'indexability_issue';
  url: string;
  metrics: {
    issue_type: 'robots_blocked_with_traffic' | 'robots_blocked_in_sitemap' | 'noindex_with_traffic' | 'noindex_in_sitemap';
    in_sitemap: boolean;
    has_traffic: boolean;
    clicks: number;
    impressions: number;
  };
}

export class IndexabilityIssueDetector {
  private static normalizeUrl(urlStr: string): string {
    try {
      const u = new URL(urlStr.trim());
      return (u.hostname + u.pathname).replace(/\/$/, '').toLowerCase();
    } catch (e) {
      return urlStr.trim().toLowerCase();
    }
  }

  static async detect(siteId: string, siteDomain: string): Promise<IndexabilityIssueSignal[]> {
    const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';
    const crawlerApiUrl = (process.env.CRAWLER_API_URL || 'http://localhost:8081/crawl').replace('/crawl', '/sitemap');

    // 1. Fetch Sitemap URLs from Go crawler sitemap API
    const sitemapNormalized = new Set<string>();
    const originalSitemapUrls = new Map<string, string>(); // normalized -> original
    const protocols = ['https', 'http'];
    let fetched = false;

    for (const proto of protocols) {
      if (fetched) break;
      try {
        const sitemapUrl = `${proto}://${siteDomain}/sitemap.xml`;
        const resp = await axios.post(crawlerApiUrl, { url: sitemapUrl }, { timeout: 10000 });
        if (resp.data && resp.data.success && Array.isArray(resp.data.urls)) {
          for (const url of resp.data.urls) {
            const normalized = this.normalizeUrl(url);
            sitemapNormalized.add(normalized);
            originalSitemapUrls.set(normalized, url);
          }
          fetched = true;
          console.log(`IndexabilityIssueDetector: Successfully loaded ${resp.data.urls.length} URLs from sitemap ${sitemapUrl}`);
        }
      } catch (err) {
        // Log and try next protocol
        console.warn(`IndexabilityIssueDetector: Failed to fetch sitemap via ${proto}:`, err.message);
      }
    }

    // 2. Fetch GSC Historical Traffic from ClickHouse
    const trafficNormalized = new Map<string, { clicks: number; impressions: number }>();
    const trafficQuery = `
      SELECT page, sum(clicks) as total_clicks, sum(impressions) as total_impressions
      FROM ${clickhouseDb}.gsc_page_daily
      WHERE site_id = '${siteId}' AND date >= today() - 60
      GROUP BY page
      HAVING total_clicks > 0 OR total_impressions > 0
    `;

    try {
      const resultSet = await clickhouse.query({
        query: trafficQuery,
        format: 'JSONEachRow',
      });
      const rows = (await resultSet.json()) as any[];
      for (const row of rows) {
        const normalized = this.normalizeUrl(row.page);
        trafficNormalized.set(normalized, {
          clicks: Number(row.total_clicks),
          impressions: Number(row.total_impressions),
        });
      }
      console.log(`IndexabilityIssueDetector: Loaded ${rows.length} GSC page traffic entries.`);
    } catch (err) {
      console.error('IndexabilityIssueDetector: Failed to query GSC traffic from ClickHouse:', err.message);
    }

    // 3. Fetch recent crawled observations (robots_blocked or noindex issues)
    const obsQuery = `
      SELECT url, argMax(status_code, timestamp) as status_code, argMax(issues, timestamp) as issues
      FROM ${clickhouseDb}.crawl_page_observations
      WHERE site_id = '${siteId}' AND timestamp >= today() - 1
      GROUP BY url
    `;

    const signals: IndexabilityIssueSignal[] = [];

    try {
      const resultSet = await clickhouse.query({
        query: obsQuery,
        format: 'JSONEachRow',
      });
      const rows = (await resultSet.json()) as any[];

      for (const row of rows) {
        const pageUrl = row.url;
        const normalized = this.normalizeUrl(pageUrl);
        const issuesList = Array.isArray(row.issues) ? row.issues : [];

        const hasNoindex = issuesList.includes('noindex');
        const hasRobotsBlocked = issuesList.includes('robots_blocked') || row.status_code === 403;

        if (hasNoindex || hasRobotsBlocked) {
          const inSitemap = sitemapNormalized.has(normalized);
          const trafficInfo = trafficNormalized.get(normalized);
          const hasTraffic = !!trafficInfo;
          const clicks = trafficInfo ? trafficInfo.clicks : 0;
          const impressions = trafficInfo ? trafficInfo.impressions : 0;

          if (inSitemap || hasTraffic) {
            let issueType: IndexabilityIssueSignal['metrics']['issue_type'];
            if (hasRobotsBlocked) {
              issueType = hasTraffic ? 'robots_blocked_with_traffic' : 'robots_blocked_in_sitemap';
            } else {
              issueType = hasTraffic ? 'noindex_with_traffic' : 'noindex_in_sitemap';
            }

            signals.push({
              detector_type: 'indexability_issue',
              url: pageUrl,
              metrics: {
                issue_type: issueType,
                in_sitemap: inSitemap,
                has_traffic: hasTraffic,
                clicks,
                impressions,
              },
            });
          }
        }
      }
    } catch (err) {
      console.error('IndexabilityIssueDetector: Failed to query page observations from ClickHouse:', err.message);
    }

    return signals;
  }
}
