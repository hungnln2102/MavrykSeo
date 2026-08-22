import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { clickhouse } from "@seo/clickhouse";
import { Job, UnrecoverableError, Worker } from "bullmq";
import {
  decryptToken,
  encryptToken,
  isRetryableJobError,
  isValidGscSyncJobData,
  JobProcessingError,
  nonRetryableJobError,
} from "@seo/core";
import { db } from "@seo/db";
import { GscProcessor } from "./gsc.processor";

jest.mock("@aws-sdk/client-s3", () => {
  const mockSend = jest.fn();
  class MockPutObjectCommand {
    constructor(public readonly input: any) {}
  }
  return {
    PutObjectCommand: MockPutObjectCommand,
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
  };
});

jest.mock("bullmq", () => {
  const mockOn = jest.fn();
  const mockClose = jest.fn();
  return {
    UnrecoverableError: class extends Error {},
    Worker: jest.fn().mockImplementation(() => ({
      on: mockOn,
      close: mockClose,
    })),
  };
});

jest.mock("@seo/clickhouse", () => ({
  clickhouse: {
    insert: jest.fn(),
  },
}));

jest.mock("@seo/core", () => {
  class MockJobProcessingError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly retryable: boolean,
    ) {
      super(message);
      this.name = "JobProcessingError";
    }
  }

  return {
    decryptToken: jest.fn(),
    encryptToken: jest.fn((value: string) => `encrypted:${value}`),
    isRetryableJobError: jest.fn((error: unknown) => {
      return !(error instanceof MockJobProcessingError) || error.retryable;
    }),
    isValidGscSyncJobData: jest.fn(),
    JobProcessingError: MockJobProcessingError,
    nonRetryableJobError: jest.fn((code: string, message: string) => {
      return new MockJobProcessingError(code, message, false);
    }),
  };
});

jest.mock("@seo/db", () => {
  return {
    db: {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    },
    gscSyncStates: { projectId: "gscSyncStates.projectId" },
    ingestionFences: {
      workspaceId: "ingestionFences.workspaceId",
      ingestionKey: "ingestionFences.ingestionKey",
      state: "ingestionFences.state",
    },
    integrations: { id: "integrations.id", credentials: "integrations.credentials" },
    jobRuns: {
      workspaceId: "jobRuns.workspaceId",
      idempotencyKey: "jobRuns.idempotencyKey",
    },
    projects: { id: "projects.id", workspaceId: "projects.workspaceId" },
    sites: { id: "sites.id", projectId: "sites.projectId" },
  };
});

const mockDb = db as any;

describe("GscProcessor", () => {
  let processor: GscProcessor;
  let s3SendMock: jest.Mock;
  let fetchMock: jest.Mock;

  const validJobData = {
    schemaVersion: 1,
    correlationId: "corr-123",
    idempotencyKey: "gsc.sync.requested-hash",
    workspaceId: "ws-1",
    projectId: "proj-1",
    siteUrl: "sc-domain:example.com",
    startDate: "2026-08-01",
    endDate: "2026-08-14",
    ingestionKey: "gsc.sync.requested-hash",
  };

  const mockJob = {
    data: validJobData,
    attemptsMade: 0,
    opts: { attempts: 3 },
  } as unknown as Job;

  beforeEach(() => {
    jest.clearAllMocks();
    s3SendMock = (new S3Client({}) as any).send;
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    processor = new GscProcessor();

    // Default mock behaviors
    (isValidGscSyncJobData as unknown as jest.Mock).mockReturnValue(true);
    (decryptToken as jest.Mock).mockImplementation((val: string) => {
      if (val === "invalid-encrypted-json") {
        throw new Error("decryption failed");
      }
      return val.startsWith("encrypted:") ? val.substring(10) : val;
    });

    process.env.GSC_OAUTH_CLIENT_ID = "client-id";
    process.env.GSC_OAUTH_CLIENT_SECRET = "client-secret";

    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    });
    mockDb.insert.mockReturnValue({
      values: jest.fn().mockReturnThis(),
      onConflictDoNothing: jest.fn().mockReturnThis(),
      onConflictDoUpdate: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([]),
    });
    mockDb.update.mockReturnValue({
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    });
  });

  describe("handle", () => {
    it("throws non-retryable invalid_payload if job data is invalid", async () => {
      (isValidGscSyncJobData as unknown as jest.Mock).mockReturnValue(false);

      await expect((processor as any).handle(mockJob)).rejects.toThrow();
      expect(nonRetryableJobError).toHaveBeenCalledWith("invalid_payload", expect.any(String));
    });

    it("throws tenant_scope_violation if project does not belong to workspace", async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([]), // projects empty
      });

      await expect((processor as any).handle(mockJob)).rejects.toThrow();
      expect(nonRetryableJobError).toHaveBeenCalledWith("tenant_scope_violation", expect.stringContaining("project"));
    });

    it("throws provider_authentication_failed if GSC integration not found", async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest
          .fn()
          .mockResolvedValueOnce([{ id: "proj-1" }]) // projects
          .mockResolvedValueOnce([]), // integrations empty
      });

      await expect((processor as any).handle(mockJob)).rejects.toThrow();
      expect(nonRetryableJobError).toHaveBeenCalledWith("provider_authentication_failed", expect.stringContaining("integration"));
    });

    it("throws provider_authentication_failed if GSC integration is inactive", async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest
          .fn()
          .mockResolvedValueOnce([{ id: "proj-1" }]) // projects
          .mockResolvedValueOnce([{ id: "int-1", status: "revoked" }]), // integrations inactive
      });

      await expect((processor as any).handle(mockJob)).rejects.toThrow();
      expect(nonRetryableJobError).toHaveBeenCalledWith("provider_authentication_failed", expect.stringContaining("active"));
    });

    it("throws provider_authentication_failed if credentials decrypt is invalid", async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest
          .fn()
          .mockResolvedValueOnce([{ id: "proj-1" }]) // projects
          .mockResolvedValueOnce([{ id: "int-1", status: "active", credentials: "invalid-encrypted-json" }]), // credentials fail path
      });

      await expect((processor as any).handle(mockJob)).rejects.toThrow();
      expect(nonRetryableJobError).toHaveBeenCalledWith("provider_authentication_failed", expect.stringContaining("credentials"));
    });

    it("throws tenant_scope_violation if credentials siteUrl does not match job data selection", async () => {
      const gscCreds = JSON.stringify({
        accessToken: "access-1",
        refreshToken: "refresh-1",
        expiresAt: Date.now() + 100_000,
        siteUrl: "sc-domain:different.com",
      });

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest
          .fn()
          .mockResolvedValueOnce([{ id: "proj-1" }]) // projects
          .mockResolvedValueOnce([{ id: "int-1", status: "active", credentials: `encrypted:${gscCreds}` }]), // credentials
      });

      await expect((processor as any).handle(mockJob)).rejects.toThrow();
      expect(nonRetryableJobError).toHaveBeenCalledWith("tenant_scope_violation", expect.stringContaining("match"));
    });

    it("throws invalid_target if site is missing for project", async () => {
      const gscCreds = JSON.stringify({
        accessToken: "access-1",
        refreshToken: "refresh-1",
        expiresAt: Date.now() + 100_000,
        siteUrl: "sc-domain:example.com",
      });

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest
          .fn()
          .mockResolvedValueOnce([{ id: "proj-1" }]) // projects
          .mockResolvedValueOnce([{ id: "int-1", status: "active", credentials: `encrypted:${gscCreds}` }]) // credentials
          .mockResolvedValueOnce([]), // sites empty
      });

      await expect((processor as any).handle(mockJob)).rejects.toThrow();
      expect(nonRetryableJobError).toHaveBeenCalledWith("invalid_target", expect.any(String));
    });

    it("skips and does not run sync if ingestion fence is already completed", async () => {
      const gscCreds = JSON.stringify({
        accessToken: "access-1",
        refreshToken: "refresh-1",
        expiresAt: Date.now() + 100_000,
        siteUrl: "sc-domain:example.com",
      });

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest
          .fn()
          .mockResolvedValueOnce([{ id: "proj-1" }]) // projects
          .mockResolvedValueOnce([{ id: "int-1", status: "active", credentials: `encrypted:${gscCreds}` }]) // credentials
          .mockResolvedValueOnce([{ id: "site-1" }]) // sites
          .mockResolvedValueOnce([{ state: "completed" }]), // ingestionFences state check
      });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnThis(),
        onConflictDoNothing: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValueOnce([]), // fence already exists, insert yields empty array
      });

      const result = await (processor as any).handle(mockJob);
      expect(result).toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("throws ingestion_reconciliation_required if ingestion fence state is not completed", async () => {
      const gscCreds = JSON.stringify({
        accessToken: "access-1",
        refreshToken: "refresh-1",
        expiresAt: Date.now() + 100_000,
        siteUrl: "sc-domain:example.com",
      });

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest
          .fn()
          .mockResolvedValueOnce([{ id: "proj-1" }]) // projects
          .mockResolvedValueOnce([{ id: "int-1", status: "active", credentials: `encrypted:${gscCreds}` }]) // credentials
          .mockResolvedValueOnce([{ id: "site-1" }]) // sites
          .mockResolvedValueOnce([{ state: "writing" }]), // ingestionFence is write-locked
      });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnThis(),
        onConflictDoNothing: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValueOnce([]), // fence insert fails (conflict)
      });

      await expect((processor as any).handle(mockJob)).rejects.toThrow();
      expect(nonRetryableJobError).toHaveBeenCalledWith("ingestion_reconciliation_required", expect.any(String));
    });

    it("updates GSC credentials on token expiration and calls sync APIs, persisting facts and complete fence", async () => {
      const expiredGscCreds = JSON.stringify({
        accessToken: "expired-access",
        refreshToken: "refresh-token-xyz",
        expiresAt: Date.now() - 1000,
        siteUrl: "sc-domain:example.com",
      });

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest
          .fn()
          .mockResolvedValueOnce([{ id: "proj-1" }]) // projects
          .mockResolvedValueOnce([{ id: "int-1", status: "active", credentials: `encrypted:${expiredGscCreds}` }]) // credentials
          .mockResolvedValueOnce([{ id: "site-1" }]), // sites
      });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnThis(),
        onConflictDoNothing: jest.fn().mockReturnThis(),
        onConflictDoUpdate: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValueOnce([{ id: "fence-1" }]), // acquireFence insert matches
      });

      // Google token refresh API & Search analytics API
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            access_token: "new-access-token",
            expires_in: 3600,
          }),
        }) // token refresh
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({
            rows: [
              { keys: ["2026-08-05", "google key"], clicks: 10, impressions: 100, ctr: 0.1, position: 2 },
            ],
          }),
        }) // query dimension queries
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({
            rows: [
              { keys: ["2026-08-05", "https://example.com/page1"], clicks: 20, impressions: 200, ctr: 0.1, position: 3 },
            ],
          }),
        }); // page dimension queries

      await (processor as any).handle(mockJob);

      expect(fetchMock).toHaveBeenCalledTimes(3);
      // Verify token refresh was requested first
      expect(fetchMock.mock.calls[0][0]).toBe("https://oauth2.googleapis.com/token");
      // Search console queries check
      expect(fetchMock.mock.calls[1][0]).toContain("searchAnalytics/query");

      // Verify S3 write
      expect(s3SendMock).toHaveBeenCalledWith(expect.any(PutObjectCommand));
      // Verify ClickHouse persistence
      expect(clickhouse.insert).toHaveBeenCalledTimes(2);

      // Verify DB updates
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("throws JobProcessingError (retryable) on 429 quota exhaustion during Search Console API queries", async () => {
      const freshGscCreds = JSON.stringify({
        accessToken: "fresh-access",
        refreshToken: "refresh-token-xyz",
        expiresAt: Date.now() + 100_000,
        siteUrl: "sc-domain:example.com",
      });

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest
          .fn()
          .mockResolvedValueOnce([{ id: "proj-1" }]) // projects
          .mockResolvedValueOnce([{ id: "int-1", status: "active", credentials: `encrypted:${freshGscCreds}` }]) // credentials
          .mockResolvedValueOnce([{ id: "site-1" }]), // sites

      });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnThis(),
        onConflictDoNothing: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValueOnce([{ id: "fence-1" }]), // acquireFence succeeds
      });

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      });

      await expect((processor as any).handle(mockJob)).rejects.toThrow();

      // Check S3 partial storage write
      expect(s3SendMock).toHaveBeenCalledWith(expect.any(PutObjectCommand));
      const s3CallArg = s3SendMock.mock.calls[0][0] as PutObjectCommand;
      const s3Payload = JSON.parse(s3CallArg.input.Body as string);
      expect(s3Payload.partial).toBe(true);
      expect(s3Payload.failedDimensions).toContain("query");
    });
  });
});
