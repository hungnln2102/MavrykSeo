import { clickhouse } from "@seo/clickhouse";
import { db } from "@seo/db";
import { AuditRunCoordinator } from "./audit-run.coordinator";

jest.mock("@seo/clickhouse", () => ({
  clickhouse: {
    query: jest.fn(),
  },
}));

jest.mock("@seo/db", () => {
  return {
    db: {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auditRuns: {
      id: "auditRuns.id",
      status: "auditRuns.status",
    },
    auditControlResults: {
      id: "auditControlResults.id",
      auditRunId: "auditControlResults.auditRunId",
      controlId: "auditControlResults.controlId",
      result: "auditControlResults.result",
      exceptionReason: "auditControlResults.exceptionReason",
    },
    sites: {
      id: "sites.id",
      projectId: "sites.projectId",
      domain: "sites.domain",
    },
    auditControls: {
      id: "auditControls.id",
      controlCode: "auditControls.controlCode",
    }
  };
});

const mockDb = db as any;
const mockClickhouse = clickhouse as any;

describe("AuditRunCoordinator", () => {
  let coordinator: AuditRunCoordinator;

  beforeEach(() => {
    jest.clearAllMocks();
    coordinator = new AuditRunCoordinator();
  });

  it("should evaluate controls and update DB correctly when crawl observations exist", async () => {
    const limitMock = jest.fn();
    const whereMock = jest.fn();

    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: whereMock,
      limit: limitMock,
    });

    let whereCallCount = 0;
    whereMock.mockImplementation(function() {
      whereCallCount++;
      console.log(`[Test Mock] whereMock call ${whereCallCount}`);
      if (whereCallCount === 1) {
        return this;
      } else if (whereCallCount === 2) {
        return Promise.resolve([{ id: "site-1", projectId: "proj-1", domain: "example.com" }]);
      } else {
        const data = [
          { id: "res-1", controlId: "ctrl-1", result: "PASS", controlCode: "TECH-HOST-002" },
          { id: "res-2", controlId: "ctrl-2", result: "PASS", controlCode: "TECH-CRAWL-004" },
          { id: "res-3", controlId: "ctrl-3", result: "PASS", controlCode: "TECH-IDX-004" },
          { id: "res-4", controlId: "ctrl-4", result: "PASS", controlCode: "TECH-JS-001" },
          { id: "res-5", controlId: "ctrl-5", result: "PASS", controlCode: "TECH-CWV-001" },
        ];
        console.log(`[Test Mock] whereMock returning:`, data);
        return Promise.resolve(data);
      }
    });

    limitMock.mockResolvedValueOnce([{ id: "run-1", projectId: "proj-1" }]);

    const clickhouseQueryMock = jest.fn();
    mockClickhouse.query = clickhouseQueryMock;

    clickhouseQueryMock.mockImplementation((params) => {
      const q = params.query;
      let dataset: any[] = [];
      if (q.includes("crawl_page_observations")) {
        dataset = [
          { url: "https://example.com/", status_code: 200, is_canonical_matched: 1, canonical_url: "https://example.com/", issues: [], redirect_chain: [] }
        ];
      } else if (q.includes("sitemap_observations")) {
        dataset = [
          { sitemap_url: "https://example.com/sitemap.xml", crawled_url: "https://example.com/", is_in_sitemap: 1 }
        ];
      } else if (q.includes("render_observations")) {
        dataset = [
          { url: "https://example.com/", hydration_mismatch: 0, client_error_count: 0, console_errors: [], text_parity_percent: 95 }
        ];
      } else if (q.includes("pagespeed_observations")) {
        dataset = [
          { url: "https://example.com/", lcp_ms: 1500, fid_ms: 50, cls: 0.05, inp_ms: 80 }
        ];
      }
      return Promise.resolve({
        json: () => Promise.resolve(dataset)
      });
    });

    const updateMock = jest.fn().mockReturnValue({
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue({}),
    });
    mockDb.update = updateMock;

    await coordinator.runAudit("run-1");

    expect(clickhouseQueryMock).toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalled();
  });
});
