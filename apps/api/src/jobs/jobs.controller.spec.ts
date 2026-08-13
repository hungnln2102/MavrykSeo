import { AUDIT_LOG_METADATA_KEY } from '../tenancy/audit-log.decorator';
import { ROLES_KEY } from '../tenancy/roles.decorator';
import { JobsController } from './jobs.controller';
import type { JobsService } from './jobs.service';

jest.mock('../tenancy/tenant.guard', () => ({
  TenantGuard: class TenantGuard {},
}));

jest.mock('./jobs.service', () => ({
  JobsService: class JobsService {},
}));

describe('JobsController', () => {
  const jobsService = {
    getFailedJobs: jest.fn(),
    replayFailedJob: jest.fn(),
  };

  let controller: JobsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new JobsController(jobsService as unknown as JobsService);
  });

  it('delegates failed-job reads using the workspace verified by guards', async () => {
    const failedJobs = [{ id: 'job-run-1', state: 'dead_lettered' }];
    jobsService.getFailedJobs.mockResolvedValue(failedJobs);

    await expect(controller.getFailedJobs('workspace-verified')).resolves.toBe(failedJobs);

    expect(jobsService.getFailedJobs).toHaveBeenCalledWith('workspace-verified');
  });

  it('delegates replay requests using the workspace verified by guards', async () => {
    const replayedJob = { replayedFromJobRunId: 'job-run-1' };
    jobsService.replayFailedJob.mockResolvedValue(replayedJob);

    await expect(
      controller.replayFailedJob('workspace-verified', 'job-run-1'),
    ).resolves.toBe(replayedJob);

    expect(jobsService.replayFailedJob).toHaveBeenCalledWith('workspace-verified', 'job-run-1');
  });

  it('restricts failed-job operations to owners and admins with audit metadata', () => {
    expect(Reflect.getMetadata(ROLES_KEY, JobsController)).toEqual(['owner', 'admin']);
    expect(
      Reflect.getMetadata(
        AUDIT_LOG_METADATA_KEY,
        JobsController.prototype.getFailedJobs,
      ),
    ).toEqual({ action: 'job.failed.read', entityType: 'job_run' });
    expect(
      Reflect.getMetadata(
        AUDIT_LOG_METADATA_KEY,
        JobsController.prototype.replayFailedJob,
      ),
    ).toEqual({ action: 'job.replay', entityType: 'job_run' });
  });
});
