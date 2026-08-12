import { Injectable, NotFoundException } from '@nestjs/common';
import { db, reports, projects, workspaces } from '@seo/db';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class ReportsService {
  private async verifyProjectBelongsToWorkspace(workspaceId: string, projectId: string) {
    const projectResult = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.workspaceId, workspaceId)
        )
      )
      .limit(1);

    if (projectResult.length === 0) {
      throw new NotFoundException('Project not found in this workspace');
    }
  }

  async getReports(workspaceId: string, projectId: string) {
    await this.verifyProjectBelongsToWorkspace(workspaceId, projectId);

    return db
      .select()
      .from(reports)
      .where(eq(reports.projectId, projectId));
  }

  async createReport(workspaceId: string, projectId: string, title: string, type: string) {
    // 1. Verify project-workspace match
    await this.verifyProjectBelongsToWorkspace(workspaceId, projectId);

    // 2. Fetch workspace branding colors and logo
    const workspaceResult = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (workspaceResult.length === 0) {
      throw new NotFoundException('Workspace not found');
    }

    const ws = workspaceResult[0];
    const colors = (ws.whiteLabelColors || { primary: '#000000', secondary: '#ffffff' }) as any;

    // 3. Assemble metadata representing simulated white-label PDF/HTML design
    const metadata = {
      branding: {
        logo: ws.whiteLabelLogo || null,
        colors: colors,
      },
      renderedHtml: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <header style="border-bottom: 2px solid ${colors.primary || '#000000'}; padding-bottom: 10px; margin-bottom: 20px;">
            ${ws.whiteLabelLogo ? `<img src="${ws.whiteLabelLogo}" alt="Logo" style="max-height: 50px; float: left; margin-right: 15px;" />` : ''}
            <h1 style="margin: 0; color: ${colors.primary || '#000000'};">${title}</h1>
            <p style="margin: 5px 0 0; color: #777;">Type: ${type.toUpperCase()}</p>
            <div style="clear: both;"></div>
          </header>
          <main>
            <p>This is a custom branded SEO report generated for workspace: <strong>${ws.name}</strong>.</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid ${colors.secondary || '#cccccc'};">
              <strong>Report Status:</strong> Active SEO Tracking Insights
            </div>
          </main>
        </div>
      `,
      generatedAt: new Date().toISOString(),
    };

    // 4. Insert report row
    const [newReport] = await db.insert(reports).values({
      projectId,
      title,
      type,
      status: 'completed',
      metadata,
    }).returning();

    return newReport;
  }
}
