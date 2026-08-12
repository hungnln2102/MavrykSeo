import { clickhouse } from '@seo/clickhouse';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import * as crypto from 'crypto';

export interface InternalLinkOpportunitySignal {
  detector_type: 'internal_link_opportunity';
  url: string; // The page that mentions the keyword but does not link (source_url)
  keyword: string; // The anchor text keyword
  metrics: {
    target_url: string; // The page that is ranking for the keyword (target_url)
    rank: number;
  };
}

export class InternalLinkOpportunityDetector {
  private static s3Client: S3Client;

  private static getS3Client(): S3Client {
    if (!this.s3Client) {
      this.s3Client = new S3Client({
        endpoint: process.env.S3_ENDPOINT || 'http://localhost:9002',
        region: process.env.S3_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY || 'minio',
          secretAccessKey: process.env.S3_SECRET_KEY || 'minio12345',
        },
        forcePathStyle: true,
      });
    }
    return this.s3Client;
  }

  static async detect(projectId: string, siteId: string, siteDomain: string): Promise<InternalLinkOpportunitySignal[]> {
    const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';
    const bucketName = process.env.S3_BUCKET_NAME || 'seo-platform-raw';

    // 1. Get all keywords ranking in the top 20 for this project
    const rankQuery = `
      SELECT 
        keyword,
        argMax(url, timestamp) as target_url,
        argMax(rank, timestamp) as latest_rank
      FROM ${clickhouseDb}.rank_observations
      WHERE project_id = '${projectId}' AND competitor_domain = '' AND timestamp >= today() - 30
      GROUP BY keyword
      HAVING latest_rank <= 20
    `;

    let rankingKeywords: Array<{ keyword: string; target_url: string; latest_rank: number }> = [];
    try {
      const resultSet = await clickhouse.query({
        query: rankQuery,
        format: 'JSONEachRow',
      });
      const rows = (await resultSet.json()) as any[];
      rankingKeywords = rows.map((r) => ({
        keyword: r.keyword.trim(),
        target_url: r.target_url.trim(),
        latest_rank: Number(r.latest_rank),
      }));
    } catch (error) {
      console.error('InternalLinkOpportunityDetector: Failed to fetch rank observations:', error.message);
      return [];
    }

    if (rankingKeywords.length === 0) {
      return [];
    }

    // 2. Get all crawled pages for the site in the last 24h
    const crawledQuery = `
      SELECT DISTINCT url
      FROM ${clickhouseDb}.crawl_page_observations
      WHERE site_id = '${siteId}' AND timestamp >= today() - 1 AND status_code < 400
    `;

    let crawledUrls: string[] = [];
    try {
      const resultSet = await clickhouse.query({
        query: crawledQuery,
        format: 'JSONEachRow',
      });
      const rows = (await resultSet.json()) as any[];
      crawledUrls = rows.map((r) => r.url.trim());
    } catch (error) {
      console.error('InternalLinkOpportunityDetector: Failed to fetch crawled pages from ClickHouse:', error.message);
      return [];
    }

    if (crawledUrls.length <= 1) {
      return [];
    }

    const s3 = this.getS3Client();
    const signals: InternalLinkOpportunitySignal[] = [];

    // For optimization, download HTML content of each crawled page once, parse its outbound links and plain text
    const pageContentsMap = new Map<string, { html: string; text: string; links: string[] }>();

    for (const urlStr of crawledUrls) {
      try {
        const html = await this.fetchHtmlFromS3(s3, bucketName, siteId, urlStr);
        const links = this.extractInternalLinks(html, siteDomain);
        const text = this.stripHtml(html);
        pageContentsMap.set(urlStr, { html, text, links });
      } catch (err) {
        console.warn(`InternalLinkOpportunityDetector: Could not fetch HTML from S3 for ${urlStr}: ${err.message}`);
      }
    }

    // 3. Match keywords with page contents
    for (const item of rankingKeywords) {
      const targetUrlNormalized = this.normalizeUrl(siteDomain, item.target_url);

      for (const sourceUrl of crawledUrls) {
        const sourceUrlNormalized = this.normalizeUrl(siteDomain, sourceUrl);
        // Avoid linking a page to itself
        if (sourceUrlNormalized === targetUrlNormalized) {
          continue;
        }

        const pageContent = pageContentsMap.get(sourceUrl);
        if (!pageContent) {
          continue;
        }

        // Check if source_url already links to target_url
        const alreadyLinks = pageContent.links.some(
          (link) => this.normalizeUrl(siteDomain, link) === targetUrlNormalized
        );
        if (alreadyLinks) {
          continue;
        }

        // Check if the source page's plain text contains the keyword (case-insensitive)
        // We use a boundary regex search for whole word matches
        const keywordRegex = new RegExp(`\\b${this.escapeRegExp(item.keyword)}\\b`, 'i');
        if (keywordRegex.test(pageContent.text)) {
          signals.push({
            detector_type: 'internal_link_opportunity',
            url: sourceUrl,
            keyword: item.keyword,
            metrics: {
              target_url: item.target_url,
              rank: item.latest_rank,
            },
          });
        }
      }
    }

    return signals;
  }

  private static async fetchHtmlFromS3(s3: S3Client, bucket: string, siteId: string, pageUrl: string): Promise<string> {
    const urlHash = crypto.createHash('sha256').update(pageUrl).digest('hex');
    const key = `crawl/${siteId}/${urlHash}.html`;
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const response = await s3.send(command);
    const stream = response.Body as any;
    if (!stream) {
      return '';
    }
    return new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', (err: Error) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
  }

  private static extractInternalLinks(html: string, domain: string): string[] {
    const hrefRegex = /href=["']([^"']+)["']/gi;
    const links: string[] = [];
    let match;
    while ((match = hrefRegex.exec(html)) !== null) {
      const href = match[1].trim();
      if (href.startsWith('/') || href.startsWith(domain)) {
        links.push(this.normalizeUrl(domain, href));
      }
    }
    return links;
  }

  private static stripHtml(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static normalizeUrl(domain: string, path: string): string {
    const base = domain.startsWith('http') ? domain : `https://${domain}`;
    try {
      const u = new URL(path, base);
      return u.toString();
    } catch {
      return path;
    }
  }

  private static escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
