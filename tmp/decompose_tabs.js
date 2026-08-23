const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../apps/web/src/app/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Normalize line endings to \n
content = content.replace(/\r\n/g, '\n');

// 2. Add imports at the top
const importMarker = "  FileText\n} from 'lucide-react';";
const importReplacement = "  FileText\n} from 'lucide-react';\n\nimport AuditTab from './tabs/AuditTab';\nimport StandardsTab from './tabs/StandardsTab';";

if (!content.includes(importReplacement)) {
  content = content.replace(importMarker, importReplacement);
}

// 3. Locate the monolithic block between the comments
const startComment = "        {/* Site Audit Tab */}";
const endComment = "        {/* Rank Tracker Tab */}";

const startIndex = content.indexOf(startComment);
const endIndex = content.indexOf(endComment);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find start or end comments!");
  process.exit(1);
}

const replacement = `${startComment}
        {activeTab === 'audit' && (
          <AuditTab
            selectedSite={selectedSite}
            activeSite={activeSite}
            isCrawling={isCrawling}
            crawlStatusText={crawlStatusText}
            recs={recs}
            crawlsHistory={crawlsHistory}
            loadingCrawlsHistory={loadingCrawlsHistory}
            auditLogs={auditLogs}
            loadingAuditLogs={loadingAuditLogs}
            handleTriggerCrawl={handleTriggerCrawl}
            handleReplayJob={handleReplayJob}
            handleReprocessJob={handleReprocessJob}
            handleViewRawHtml={handleViewRawHtml}
            setSelectedRecForDetail={setSelectedRecForDetail}
            setRecAssigneeId={setRecAssigneeId}
            setRecInternalNotes={setRecInternalNotes}
            setRecClientNotes={setRecClientNotes}
          />
        )}

        {/* SEO Standards & Audit Runs Tab */}
        {activeTab === 'standards' && (
          <StandardsTab
            activeStandardsTab={activeStandardsTab}
            setActiveStandardsTab={setActiveStandardsTab}
            selectedVersionId={selectedVersionId}
            setSelectedVersionId={setSelectedVersionId}
            standardsVersions={standardsVersions}
            loadingStandards={loadingStandards}
            standardsControls={standardsControls}
            selectedAuditRunId={selectedAuditRunId}
            setSelectedAuditRunId={setSelectedAuditRunId}
            auditRunsList={auditRunsList}
            loadingResults={loadingResults}
            auditResultsList={auditResultsList}
            triggeringAudit={triggeringAudit}
            editingResultId={editingResultId}
            setEditingResultId={setEditingResultId}
            editResultStatus={editResultStatus}
            setEditResultStatus={setEditResultStatus}
            editExceptionReason={editExceptionReason}
            setEditExceptionReason={setEditExceptionReason}
            submittingVerification={submittingVerification}
            handleTriggerAuditRun={handleTriggerAuditRun}
            fetchAuditResults={fetchAuditResults}
            handleVerifyControlResult={handleVerifyControlResult}
          />
        )}\n\n`;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);

fs.writeFileSync(filePath, newContent, 'utf8');
console.log("Decomposition completed successfully!");
