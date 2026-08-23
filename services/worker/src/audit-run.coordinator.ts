import { Injectable } from '@nestjs/common';
import { db, sites, auditRuns, auditControlResults, auditControls } from '@seo/db';
import { eq, and } from 'drizzle-orm';
import { clickhouse } from '@seo/clickhouse';

@Injectable()
export class AuditRunCoordinator {
  async runAudit(auditRunId: string): Promise<void> {
    console.log(`[AuditRunCoordinator] Running audit analysis for run: ${auditRunId}`);
    try {
      // 1. Fetch Audit Run details
      const runs = await db
        .select()
        .from(auditRuns)
        .where(eq(auditRuns.id, auditRunId))
        .limit(1);

      if (runs.length === 0) {
        console.error(`Audit run not found for ID: ${auditRunId}`);
        return;
      }
      const run = runs[0];
      const projectId = run.projectId;

      // 2. Fetch sites linked to project
      const projectSites = await db
        .select()
        .from(sites)
        .where(eq(sites.projectId, projectId));

      if (projectSites.length === 0) {
        console.warn(`No sites found for project: ${projectId}. Cannot run technical analysis.`);
        return;
      }
      const site = projectSites[0];
      const siteId = site.id;
      const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';

      // 3. Fetch Control Results linked to audit run
      const results = await db
        .select({
          id: auditControlResults.id,
          controlId: auditControlResults.controlId,
          result: auditControlResults.result,
          controlCode: auditControls.code,
        })
        .from(auditControlResults)
        .innerJoin(auditControls, eq(auditControlResults.controlId, auditControls.id))
        .where(eq(auditControlResults.auditRunId, auditRunId));

      if (results.length === 0) {
        console.log(`No applicable control results found for audit run: ${auditRunId}`);
        return;
      }

      // 4. Gather ClickHouse observations for that siteId
      const pageObsResult = await clickhouse.query({
        query: `
          SELECT 
            url,
            status_code,
            canonical_url,
            issues,
            redirect_chain,
            redirect_status_codes,
            robots_meta
          FROM ${clickhouseDb}.crawl_page_observations
          WHERE site_id = '${siteId}'
        `,
        format: 'JSONEachRow',
      });
      const pageObs = (await pageObsResult.json()) as any[];

      const sitemapObsResult = await clickhouse.query({
        query: `
          SELECT sitemap_url, crawled_url
          FROM ${clickhouseDb}.sitemap_observations
          WHERE site_id = '${siteId}'
        `,
        format: 'JSONEachRow',
      });
      const sitemapObs = (await sitemapObsResult.json()) as any[];

      const renderObsResult = await clickhouse.query({
        query: `
          SELECT url, console_errors, title_mismatch, text_parity_percent
          FROM ${clickhouseDb}.render_observations
          WHERE site_id = '${siteId}'
        `,
        format: 'JSONEachRow',
      });
      const renderObs = (await renderObsResult.json()) as any[];

      const pagespeedObsResult = await clickhouse.query({
        query: `
          SELECT url, lcp_ms, cls, fid_ms, inp_ms, performance_score, accessibility_score, best_practices_score, seo_score
          FROM ${clickhouseDb}.pagespeed_observations
          WHERE site_id = '${siteId}'
        `,
        format: 'JSONEachRow',
      });
      const pagespeedObs = (await pagespeedObsResult.json()) as any[];

      console.log(`[AuditRunCoordinator] Gathered data:
        - Pages observations: ${pageObs.length}
        - Sitemap observations: ${sitemapObs.length}
        - Render observations: ${renderObs.length}
        - PageSpeed observations: ${pagespeedObs.length}
      `);

      // 5. Evaluate control checks one by one
      for (const res of results) {
        if (res.result === 'NOT_APPLICABLE') {
          continue;
        }

        let evaluatedResult: 'PASS' | 'FAIL' | 'WARNING' | 'NEED_DATA' = 'PASS';
        let reason: string | null = null;
        const code = res.controlCode;

        // --- Host & SSL checks ---
        if (code.startsWith('TECH-HOST-')) {
          if (pageObs.length === 0) {
            evaluatedResult = 'NEED_DATA';
            reason = 'No crawl data available for host verification.';
          } else {
            if (code === 'TECH-HOST-002') {
              const nonHttps = pageObs.filter(o => !o.url.startsWith('https://'));
              if (nonHttps.length > 0) {
                evaluatedResult = 'FAIL';
                reason = `Found ${nonHttps.length} pages served over insecure HTTP connection.`;
              }
            } else if (code === 'TECH-HOST-003') {
              const redirectLoops = pageObs.filter(o => o.issues && o.issues.includes('redirect_loop'));
              const serverErrors = pageObs.filter(o => o.status_code >= 500);
              const clientErrors = pageObs.filter(o => o.status_code >= 400 && o.status_code < 500);
              const redirectChains = pageObs.filter(o => o.redirect_chain && o.redirect_chain.length > 3);

              if (redirectLoops.length > 0) {
                evaluatedResult = 'FAIL';
                reason = `Found redirect loops on pages: ${redirectLoops.map(o => o.url).slice(0, 3).join(', ')}`;
              } else if (serverErrors.length > 0) {
                evaluatedResult = 'FAIL';
                reason = `Server returned status 5xx on ${serverErrors.length} pages.`;
              } else if (clientErrors.length > 0) {
                evaluatedResult = 'FAIL';
                reason = `Client returned status 4xx on ${clientErrors.length} pages.`;
              } else if (redirectChains.length > 0) {
                evaluatedResult = 'WARNING';
                reason = `Found redirect chains with more than 3 redirect hops on pages: ${redirectChains.map(o => o.url).slice(0, 3).join(', ')}`;
              }
            }
          }
        }
        // --- Crawl & Sitemap checks ---
        else if (code.startsWith('TECH-CRAWL-')) {
          if (code === 'TECH-CRAWL-001' || code === 'TECH-CRAWL-002') {
            const robotsBlockList = pageObs.filter(o => o.issues && o.issues.includes('robots_blocked'));
            if (robotsBlockList.length > 0) {
              evaluatedResult = 'FAIL';
              reason = `Important URLs are blocked by robots.txt directives: ${robotsBlockList.map(o => o.url).slice(0, 3).join(', ')}`;
            }
          } else if (code === 'TECH-CRAWL-004' || code === 'TECH-CRAWL-005') {
            if (sitemapObs.length === 0) {
              evaluatedResult = 'FAIL';
              reason = 'No active sitemaps found or sitemap crawl returned zero URLs.';
            }
          }
        }
        // --- Indexability & Canonical checks ---
        else if (code.startsWith('TECH-IDX-')) {
          if (pageObs.length === 0) {
            evaluatedResult = 'NEED_DATA';
          } else {
            if (code === 'TECH-IDX-004' || code === 'TECH-IDX-006') {
              const missingCanonical = pageObs.filter(o => !o.canonical_url);
              const loops = pageObs.filter(o => o.issues && o.issues.includes('canonical_loop'));
              const facetConflicts = pageObs.filter(o => {
                try {
                  const u = new URL(o.url);
                  const hasParams = u.search && u.search.length > 1;
                  return hasParams && o.canonical_url === o.url;
                } catch {
                  return false;
                }
              });

              if (loops.length > 0) {
                evaluatedResult = 'FAIL';
                reason = `Canonical loops detected: ${loops.map(o => o.url).slice(0, 3).join(', ')}`;
              } else if (missingCanonical.length > 0) {
                evaluatedResult = 'FAIL';
                reason = `Found ${missingCanonical.length} pages missing canonical tags.`;
              } else if (facetConflicts.length > 0) {
                evaluatedResult = 'WARNING';
                reason = `Query parameter/facet URLs have self-referential canonicals: ${facetConflicts.map(o => o.url).slice(0, 3).join(', ')}`;
              }
            }
          }
        }
        // --- Javascript rendering checks ---
        else if (code.startsWith('TECH-JS-')) {
          if (renderObs.length === 0) {
            evaluatedResult = 'NEED_DATA';
            reason = 'Remote Chromium rendering is in queue or has not completed.';
          } else {
            const consoleErrors = renderObs.filter(o => o.console_errors && o.console_errors.length > 0);
            const lowParity = renderObs.filter(o => o.text_parity_percent !== null && o.text_parity_percent < 80);

            if (consoleErrors.length > 0) {
              evaluatedResult = 'FAIL';
              reason = `Chromium rendering encountered console errors on ${consoleErrors.length} pages.`;
            } else if (lowParity.length > 0) {
              evaluatedResult = 'WARNING';
              reason = `Low HTML vs DOM text parity (<80%) on ${lowParity.length} pages. Dynamic JS rendering mismatch.`;
            }
          }
        }
        // --- Core Web Vitals checks ---
        else if (code.startsWith('TECH-CWV-')) {
          if (pagespeedObs.length === 0) {
            evaluatedResult = 'NEED_DATA';
            reason = 'Google PageSpeed Insights analysis did not run or is still processing.';
          } else {
            const poorLcp = pagespeedObs.filter(o => o.lcp_ms > 2500);
            const poorInp = pagespeedObs.filter(o => o.inp_ms > 200);
            const poorCls = pagespeedObs.filter(o => o.cls > 0.1);

            if (poorLcp.length > 0 || poorInp.length > 0 || poorCls.length > 0) {
              evaluatedResult = 'FAIL';
              reason = `Core Web Vitals failed thresholds: ${poorLcp.length} pages slow LCP (>2.5s), ${poorInp.length} slow INP (>200ms), ${poorCls.length} high CLS (>0.1).`;
            }
          }
        }

        // 6. Update PostgreSQL control result
        await db
          .update(auditControlResults)
          .set({
            result: evaluatedResult,
            exceptionReason: reason,
            updatedAt: new Date(),
          })
          .where(eq(auditControlResults.id, res.id));
      }

      // 7. Update overall audit run status to completed
      await db
        .update(auditRuns)
        .set({
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(eq(auditRuns.id, auditRunId));

      console.log(`[AuditRunCoordinator] Successfully finished analysis for audit run: ${auditRunId}`);
    } catch (err: any) {
      console.error(`[AuditRunCoordinator] Error executing coordinator for run ${auditRunId}:`, err.message);
    }
  }
}
