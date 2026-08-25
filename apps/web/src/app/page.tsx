'use client';

import React, { useState } from 'react';

import DashboardTab from './tabs/DashboardTab';
import ContentPlannerTab from './tabs/ContentPlannerTab';
import RankTrackerTab from './tabs/RankTrackerTab';
import AuditTab from './tabs/AuditTab';
import StandardsTab from './tabs/StandardsTab';
import ReportsTab from './tabs/ReportsTab';
import BacklinksTab from './tabs/BacklinksTab';
import SettingsTab from './tabs/SettingsTab';
import {
  LayoutDashboard,
  TrendingUp,
  Search,
  Link2,
  Settings,
  AlertCircle,
  CheckCircle2,
  Bell,
  ChevronDown,
  Globe,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  User,
  ExternalLink,
  ChevronRight,
  Calendar,
  BookOpen,
  Plus,
  ArrowLeft,
  RefreshCw,
  Loader2,
  FileText
} from 'lucide-react';

export default function Page() {
  const [selectedSite, setSelectedSite] = useState('mavryk.io');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [chartWidth, setChartWidth] = useState<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Authentication Context States
  const [token, setToken] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  // Content Marketing States
  const [contentSubTab, setContentSubTab] = useState<'topics' | 'calendar' | 'editor' | 'research'>('calendar');
  
  // Import URL, Publish & Performance/Decay States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrlStr, setImportUrlStr] = useState('');
  const [importKeyword, setImportKeyword] = useState('');
  const [importTopicId, setImportTopicId] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishUrlStr, setPublishUrlStr] = useState('');
  const [publishingPlanId, setPublishingPlanId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const [performanceData, setPerformanceData] = useState<any>(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  const [gscPerformance, setGscPerformance] = useState<any>(null);
  const [loadingGsc, setLoadingGsc] = useState(false);


  const [decayedPlansList, setDecayedPlansList] = useState<any[]>([]);
  const [loadingDecay, setLoadingDecay] = useState(false);

  const [topicsList, setTopicsList] = useState<any[]>([]);
  const [contentPlansList, setContentPlansList] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const currentPlan = contentPlansList.find(p => p.id === selectedPlanId);

  // Keyword Research, Clustering & Competitor Gap States
  const [keywordResearchInput, setKeywordResearchInput] = useState('');
  const [keywordResearchResult, setKeywordResearchResult] = useState<any>(null);
  const [isResearchingKeyword, setIsResearchingKeyword] = useState(false);

  const [keywordClusteringInput, setKeywordClusteringInput] = useState('');
  const [keywordClusteringResult, setKeywordClusteringResult] = useState<any[]>([]);
  const [isClusteringKeywords, setIsClusteringKeywords] = useState(false);

  const [competitorGapResult, setCompetitorGapResult] = useState<any[]>([]);
  const [isLoadingCompetitorGap, setIsLoadingCompetitorGap] = useState(false);
  const [researchSubTab, setResearchSubTab] = useState<'single' | 'clustering' | 'gap'>('single');

  // Content Creation Form States
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicParentId, setNewTopicParentId] = useState('');
  const [newTopicKeywords, setNewTopicKeywords] = useState('');
  
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanPrimaryKeyword, setNewPlanPrimaryKeyword] = useState('');
  const [newPlanSecondaryKeywords, setNewPlanSecondaryKeywords] = useState('');
  const [newPlanTopicId, setNewPlanTopicId] = useState('');
  const [newPlanDueDate, setNewPlanDueDate] = useState('');

  // Brief & SEO Editor States
  const [brief, setBrief] = useState<any>(null);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [editorBody, setEditorBody] = useState<string>('');
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Site Audit & Sites States
  const [sitesList, setSitesList] = useState<any[]>([]);
  const [activeSite, setActiveSite] = useState<any>(null);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlStatusText, setCrawlStatusText] = useState<string>('');

  // Rank Tracker States
  const [keywordsList, setKeywordsList] = useState<any[]>([]);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [newKeywordTargetUrl, setNewKeywordTargetUrl] = useState('');
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);

  // Settings States
  const [workspacePlan, setWorkspacePlan] = useState<string>('free');
  const [projectName, setProjectName] = useState<string>('Mavryk Project');
  const [isGscConnected, setIsGscConnected] = useState<boolean>(true);
  const [isMockGsc, setIsMockGsc] = useState<boolean>(true);

  // Team / Collaboration States
  const [membersList, setMembersList] = useState<any[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<string>('viewer');

  // Reports States
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [newReportTitle, setNewReportTitle] = useState('');
  const [newReportType, setNewReportType] = useState<string>('audit');
  const [selectedReport, setSelectedReport] = useState<any>(null);

  // Recommendation Detail & Notes States
  const [selectedRecForDetail, setSelectedRecForDetail] = useState<any>(null);
  const [recAssigneeId, setRecAssigneeId] = useState<string>('');
  const [recInternalNotes, setRecInternalNotes] = useState<string>('');
  const [recClientNotes, setRecClientNotes] = useState<string>('');
  const [isSavingRecDetail, setIsSavingRecDetail] = useState<boolean>(false);

  React.useEffect(() => {
    if (!containerRef.current) return;
    
    // Set initial width
    setChartWidth(containerRef.current.clientWidth);

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const rect = entries[0].contentRect;
      setChartWidth(rect.width);
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [activeTab]);

  // API states
  const [recs, setRecs] = useState<any[]>([]);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Ingestion Inbound History & Audit logs states
  const [crawlsHistory, setCrawlsHistory] = useState<any[]>([]);
  const [loadingCrawlsHistory, setLoadingCrawlsHistory] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState<boolean>(false);
  const [viewingRawHtmlJobRunId, setViewingRawHtmlJobRunId] = useState<string | null>(null);
  const [rawHtmlContent, setRawHtmlContent] = useState<string>('');
  const [loadingRawHtml, setLoadingRawHtml] = useState<boolean>(false);

  // SEO Standards & Audits States
  const [standardsVersions, setStandardsVersions] = useState<any[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [standardsControls, setStandardsControls] = useState<any[]>([]);
  const [loadingStandards, setLoadingStandards] = useState<boolean>(false);
  const [activeStandardsTab, setActiveStandardsTab] = useState<'browser' | 'audit_runs'>('browser');
  const [auditRunsList, setAuditRunsList] = useState<any[]>([]);
  const [selectedAuditRunId, setSelectedAuditRunId] = useState<string>('');
  const [auditResultsList, setAuditResultsList] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState<boolean>(false);
  const [triggeringAudit, setTriggeringAudit] = useState<boolean>(false);
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [editResultStatus, setEditResultStatus] = useState<string>('PASS');
  const [editExceptionReason, setEditExceptionReason] = useState<string>('');
  const [submittingVerification, setSubmittingVerification] = useState<boolean>(false);

  React.useEffect(() => {
    async function initApi() {
      try {
        setApiLoading(true);
        setApiError(null);

        // 1. Check for stored auth token
        const storedToken = localStorage.getItem('mavryk_token');
        if (!storedToken) {
          window.location.href = '/login';
          return;
        }

        const jwtToken = storedToken;
        setToken(jwtToken);

        // 2. Fetch workspaces
        const wsRes = await fetch('http://localhost:3000/workspaces', {
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
          },
        });

        if (!wsRes.ok) {
          if (wsRes.status === 401) {
            // Token expired or invalid — clear and redirect to login
            localStorage.removeItem('mavryk_token');
            localStorage.removeItem('mavryk_refresh_token');
            localStorage.removeItem('mavryk_user');
            window.location.href = '/login';
            return;
          }
          throw new Error('Failed to fetch workspaces');
        }

        const workspaces = await wsRes.json();
        if (workspaces.length === 0) {
          throw new Error('No workspaces found for user');
        }

        // Try to find a workspace that has a project with active GSC integration
        let selectedWs = workspaces[0];
        let selectedProjId: string | null = null;

        for (const ws of workspaces) {
          try {
            const projRes = await fetch('http://localhost:3000/projects', {
              headers: {
                'Authorization': `Bearer ${jwtToken}`,
                'x-workspace-id': ws.id,
              },
            });
            if (!projRes.ok) continue;
            const wsProjects = await projRes.json();
            if (wsProjects.length === 0) continue;

            // Check each project for active GSC integration
            for (const proj of wsProjects) {
              try {
                const syncRes = await fetch(
                  `http://localhost:3000/projects/${proj.id}/integrations/google-search-console/sync-status`,
                  { headers: { 'Authorization': `Bearer ${jwtToken}`, 'x-workspace-id': ws.id } }
                );
                if (syncRes.ok) {
                  const syncData = await syncRes.json();
                  if (syncData.connectionStatus === 'active') {
                    selectedWs = ws;
                    selectedProjId = proj.id;
                    break;
                  }
                }
              } catch { /* skip */ }
            }
            if (selectedProjId) break;
          } catch { /* skip */ }
        }

        const wsId = selectedWs.id;
        setWorkspaceId(wsId);

        // 3. Fetch projects for the selected workspace
        const projRes = await fetch('http://localhost:3000/projects', {
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'x-workspace-id': wsId,
          },
        });

        if (!projRes.ok) {
          throw new Error('Failed to fetch projects');
        }

        const projects = await projRes.json();
        if (projects.length === 0) {
          throw new Error('No projects found in workspace');
        }

        // Use the project that had GSC, or fallback to first
        const projId = selectedProjId || projects[0].id;
        setProjectId(projId);

        // 4. Fetch recommendations
        const recsRes = await fetch(`http://localhost:3000/recommendations?projectId=${projId}`, {
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'x-workspace-id': wsId,
          },
        });

        if (!recsRes.ok) {
          throw new Error('Failed to fetch recommendations');
        }

        const recommendationsList = await recsRes.json();
        setRecs(recommendationsList);
        
        (window as any)._apiCtx = { token: jwtToken, workspaceId: wsId };

        // Handle GSC OAuth callback query params
        const urlParams = new URLSearchParams(window.location.search);
        const gscConnected = urlParams.get('gsc_connected');
        const gscErrorParam = urlParams.get('gsc_error');
        const tabParam = urlParams.get('tab');

        if (gscConnected === '1' || tabParam === 'settings') {
          setActiveTab('settings');
        }
        if (gscErrorParam) {
          console.error('GSC OAuth error:', gscErrorParam);
        }

        // Clean up URL query params
        if (gscConnected || gscErrorParam || tabParam) {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        }
      } catch (err: any) {
        console.error('API Initialization error:', err);
        setApiError(err.message);
      } finally {
        setApiLoading(false);
      }
    }

    initApi();
  }, []);

  const getInternalLinkSuggestions = () => {
    if (!selectedPlanId) return [];
    const currentPlan = contentPlansList.find(p => p.id === selectedPlanId);
    if (!currentPlan) return [];

    // Find other published plans
    return contentPlansList
      .filter(p => p.id !== selectedPlanId && p.status === 'published' && p.publishUrl)
      .map(p => {
        // Compute relevance score
        let score = 0;
        let reason = '';

        if (p.topicId && p.topicId === currentPlan.topicId) {
          score += 50;
          reason = 'Same Topic Hub';
        }

        const currentKeywords = [currentPlan.primaryKeyword, ...(currentPlan.secondaryKeywords || [])];
        const peerKeywords = [p.primaryKeyword, ...(p.secondaryKeywords || [])];
        const overlap = currentKeywords.filter(k => peerKeywords.includes(k));

        if (overlap.length > 0) {
          score += overlap.length * 30;
          reason = reason ? `${reason} & Overlapping Keywords` : 'Overlapping Keywords';
        }

        return {
          id: p.id,
          title: p.title,
          url: p.publishUrl,
          keyword: p.primaryKeyword,
          score,
          reason: reason || 'Related Hub',
        };
      })
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  };

  const fetchTopics = React.useCallback(async () => {
    if (!token || !workspaceId || !projectId) return;
    try {
      const res = await fetch(`http://localhost:3000/projects/${projectId}/topics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
      });
      if (res.ok) {
        setTopicsList(await res.json());
      }
    } catch (err) {
      console.error('Error fetching topics:', err);
    }
  }, [token, workspaceId, projectId]);

  const fetchContentPlans = React.useCallback(async () => {
    if (!token || !workspaceId || !projectId) return;
    try {
      const res = await fetch(`http://localhost:3000/projects/${projectId}/content-plans`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
      });
      if (res.ok) {
        setContentPlansList(await res.json());
      }
    } catch (err) {
      console.error('Error fetching content plans:', err);
    }
  }, [token, workspaceId, projectId]);

  const fetchSites = React.useCallback(async () => {
    if (!token || !workspaceId || !projectId) return;
    try {
      const res = await fetch(`http://localhost:3000/sites?projectId=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setSitesList(data);
        if (data.length > 0) {
          setActiveSite(data[0]);
          setSelectedSite(data[0].domain);
        }
      }
    } catch (err) {
      console.error('Error fetching sites:', err);
    }
  }, [token, workspaceId, projectId]);

  const fetchKeywords = React.useCallback(async () => {
    if (!token || !workspaceId || !projectId) return;
    try {
      const res = await fetch(`http://localhost:3000/projects/${projectId}/keywords`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
      });
      if (res.ok) {
        setKeywordsList(await res.json());
      }
    } catch (err) {
      console.error('Error fetching keywords:', err);
    }
  }, [token, workspaceId, projectId]);

  const fetchCrawlsHistory = React.useCallback(async () => {
    if (!token || !workspaceId || !activeSite) return;
    try {
      setLoadingCrawlsHistory(true);
      const res = await fetch(`http://localhost:3000/sites/${activeSite.id}/crawls`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
      });
      if (res.ok) {
        setCrawlsHistory(await res.json());
      }
    } catch (err) {
      console.error('Error fetching crawls history:', err);
    } finally {
      setLoadingCrawlsHistory(false);
    }
  }, [token, workspaceId, activeSite]);

  const fetchAuditLogs = React.useCallback(async () => {
    if (!token || !workspaceId) return;
    try {
      setLoadingAuditLogs(true);
      const res = await fetch(`http://localhost:3000/workspaces/active/audit-logs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
      });
      if (res.ok) {
        setAuditLogs(await res.json());
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoadingAuditLogs(false);
    }
  }, [token, workspaceId]);

  async function handleReplayJob(jobRunId: string) {
    if (!token || !workspaceId) return;
    try {
      const res = await fetch(`http://localhost:3000/jobs/${jobRunId}/replay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
      });
      if (res.ok) {
        alert('Đã gửi yêu cầu chạy lại Job thành công!');
        fetchCrawlsHistory();
      } else {
        const errorData = await res.json();
        alert(`Không thể chạy lại Job: ${errorData.message || 'Lỗi hệ thống'}`);
      }
    } catch (err: any) {
      alert(`Lỗi chạy lại Job: ${err.message}`);
    }
  }

  async function handleReprocessJob(jobRunId: string) {
    if (!token || !workspaceId) return;
    try {
      const res = await fetch(`http://localhost:3000/jobs/${jobRunId}/reprocess`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
      });
      if (res.ok) {
        alert('Đã gửi yêu cầu reprocessing (xử lý lại từ S3) thành công!');
        fetchCrawlsHistory();
      } else {
        const errorData = await res.json();
        alert(`Không thể reprocessing: ${errorData.message || 'Lỗi hệ thống'}`);
      }
    } catch (err: any) {
      alert(`Lỗi reprocessing: ${err.message}`);
    }
  }

  async function handleViewRawHtml(jobRunId: string) {
    if (!token || !workspaceId || !activeSite) return;
    setViewingRawHtmlJobRunId(jobRunId);
    setRawHtmlContent('');
    setLoadingRawHtml(true);
    try {
      const res = await fetch(`http://localhost:3000/sites/${activeSite.id}/crawls/${jobRunId}/raw`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
      });
      if (res.ok) {
        const html = await res.text();
        setRawHtmlContent(html);
      } else {
        const errorVal = await res.json();
        setRawHtmlContent(`Lỗi: ${errorVal.message || 'Không thể tải HTML thô'}`);
      }
    } catch (err: any) {
      setRawHtmlContent(`Lỗi kết nối: ${err.message}`);
    } finally {
      setLoadingRawHtml(false);
    }
  }

  async function handleTriggerCrawl() {
    if (!token || !workspaceId || !activeSite) return;
    try {
      setIsCrawling(true);
      setCrawlStatusText('Crawl job enqueued...');
      const res = await fetch(`http://localhost:3000/sites/${activeSite.id}/crawl`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
      });
      if (res.ok) {
        setCrawlStatusText('Crawl enqueued! Running SEO audit detectors...');
        setTimeout(async () => {
          // Refresh recommendations after crawl
          if (projectId) {
            const recsRes = await fetch(`http://localhost:3000/recommendations?projectId=${projectId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'x-workspace-id': workspaceId,
              },
            });
            if (recsRes.ok) {
              setRecs(await recsRes.json());
            }
          }
          setIsCrawling(false);
          setCrawlStatusText('');
          alert('Crawl and SEO audit finished successfully!');
        }, 5000);
      } else {
        setIsCrawling(false);
        setCrawlStatusText('');
        alert('Failed to trigger crawl.');
      }
    } catch (err) {
      console.error('Error triggering crawl:', err);
      setIsCrawling(false);
      setCrawlStatusText('');
    }
  }

  async function handleAddKeyword() {
    if (!token || !workspaceId || !projectId || !newKeywordInput.trim()) {
      alert('Please enter a keyword');
      return;
    }
    try {
      setIsAddingKeyword(true);
      const res = await fetch(`http://localhost:3000/projects/${projectId}/keywords`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          keyword: newKeywordInput.trim(),
          targetUrl: newKeywordTargetUrl.trim() || undefined,
        }),
      });
      if (res.ok) {
        setNewKeywordInput('');
        setNewKeywordTargetUrl('');
        fetchKeywords();
      } else {
        const errorData = await res.json();
        alert(`Failed to add keyword: ${errorData.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error adding keyword:', err);
    } finally {
      setIsAddingKeyword(false);
    }
  }

  async function handleDeleteKeyword(keywordId: string) {
    if (!token || !workspaceId || !projectId) return;
    if (!confirm('Are you sure you want to delete this keyword from tracking?')) return;
    try {
      const res = await fetch(`http://localhost:3000/projects/${projectId}/keywords/${keywordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
      });
      if (res.ok) {
        fetchKeywords();
      } else {
        alert('Failed to delete keyword.');
      }
    } catch (err) {
      console.error('Error deleting keyword:', err);
    }
  }

  async function handleTogglePlan() {
    if (!token || !workspaceId) return;
    const nextPlan = workspacePlan === 'free' ? 'pro' : 'free';
    try {
      const res = await fetch(`http://localhost:3000/workspaces/${workspaceId}/plan`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({ plan: nextPlan }),
      });
      if (res.ok) {
        setWorkspacePlan(nextPlan);
        alert(`Workspace plan updated to ${nextPlan.toUpperCase()}!`);
      } else {
        alert('Failed to update plan.');
      }
    } catch (err) {
      console.error('Error changing plan:', err);
    }
  }

  const fetchMembers = React.useCallback(async () => {
    if (!token || !workspaceId) return;
    try {
      const res = await fetch('http://localhost:3000/workspaces/active/members', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
      });
      if (res.ok) {
        setMembersList(await res.json());
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  }, [token, workspaceId]);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !workspaceId || !newMemberEmail.trim()) {
      alert('Vui lòng nhập email hợp lệ');
      return;
    }
    try {
      const res = await fetch('http://localhost:3000/workspaces/active/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({ email: newMemberEmail.trim(), role: newMemberRole }),
      });
      if (res.ok) {
        alert('Đã thêm thành viên mới thành công!');
        setNewMemberEmail('');
        fetchMembers();
      } else {
        const errData = await res.json();
        alert(`Không thể thêm thành viên: ${errData.message || res.statusText}`);
      }
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    }
  }

  const fetchReports = React.useCallback(async () => {
    if (!token || !workspaceId || !projectId) return;
    try {
      const res = await fetch(`http://localhost:3000/projects/${projectId}/reports`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
      });
      if (res.ok) {
        setReportsList(await res.json());
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
  }, [token, workspaceId, projectId]);

  async function handleCreateReport(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !workspaceId || !projectId || !newReportTitle.trim()) {
      alert('Vui lòng nhập tiêu đề báo cáo');
      return;
    }
    try {
      const res = await fetch(`http://localhost:3000/projects/${projectId}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({ title: newReportTitle.trim(), type: newReportType }),
      });
      if (res.ok) {
        alert('Đã tạo báo cáo mới thành công!');
        setNewReportTitle('');
        fetchReports();
      } else {
        const errData = await res.json();
        alert(`Không thể tạo báo cáo: ${errData.message || res.statusText}`);
      }
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    }
  }

  const fetchStandardsVersions = React.useCallback(async () => {
    if (!token || !workspaceId) return;
    try {
      setLoadingStandards(true);
      const res = await fetch(`http://localhost:3000/standards/versions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setStandardsVersions(data);
        if (data.length > 0 && !selectedVersionId) {
          setSelectedVersionId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching standard versions:', err);
    } finally {
      setLoadingStandards(false);
    }
  }, [token, workspaceId, selectedVersionId]);

  const fetchStandardsControls = React.useCallback(async (versionId: string) => {
    if (!token || !workspaceId || !versionId) return;
    try {
      setLoadingStandards(true);
      const res = await fetch(`http://localhost:3000/standards/versions/${versionId}/controls`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
      });
      if (res.ok) {
        setStandardsControls(await res.json());
      }
    } catch (err) {
      console.error('Error fetching standard controls:', err);
    } finally {
      setLoadingStandards(false);
    }
  }, [token, workspaceId]);

  const fetchAuditRuns = React.useCallback(async () => {
    if (!token || !workspaceId || !projectId) return;
    try {
      const res = await fetch(`http://localhost:3000/projects/${projectId}/audit-runs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
      });
      if (res.ok) {
        setAuditRunsList(await res.json());
      }
    } catch (err) {
      console.error('Error fetching audit runs:', err);
    }
  }, [token, workspaceId, projectId]);

  const fetchAuditResults = React.useCallback(async (runId: string) => {
    if (!token || !workspaceId || !runId) return;
    try {
      setLoadingResults(true);
      const res = await fetch(`http://localhost:3000/audit-runs/${runId}/results`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
      });
      if (res.ok) {
        setAuditResultsList(await res.json());
      }
    } catch (err) {
      console.error('Error fetching audit results:', err);
    } finally {
      setLoadingResults(false);
    }
  }, [token, workspaceId]);

  async function handleTriggerAuditRun() {
    if (!token || !workspaceId || !projectId || !selectedVersionId) {
      alert('Vui lòng chọn phiên bản tiêu chuẩn để bắt đầu đánh giá.');
      return;
    }

    try {
      setTriggeringAudit(true);
      const res = await fetch(`http://localhost:3000/projects/${projectId}/audit-runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          standardVersionId: selectedVersionId,
          scopeSnapshot: {
            domain: selectedSite ?? 'unknown',
            triggeredAt: new Date().toISOString(),
          },
        }),
      });

      if (res.ok) {
        const newRun = await res.json();
        alert('Khởi chạy đánh giá tiêu chuẩn SEO thành công!');
        fetchAuditRuns();
        setSelectedAuditRunId(newRun.id);
        fetchAuditResults(newRun.id);
        setActiveStandardsTab('audit_runs');
      } else {
        const err = await res.json();
        alert(`Lỗi khởi chạy đánh giá: ${err.message || 'Không rõ nguyên nhân'}`);
      }
    } catch (err: any) {
      alert(`Lỗi kết nối: ${err.message}`);
    } finally {
      setTriggeringAudit(false);
    }
  }

  async function handleVerifyControlResult(resultId: string) {
    if (!token || !workspaceId) return;
    try {
      setSubmittingVerification(true);
      const res = await fetch(`http://localhost:3000/control-results/${resultId}/manual-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          result: editResultStatus,
          exceptionReason: editExceptionReason.trim() || undefined,
        }),
      });

      if (res.ok) {
        alert('Xác thực thủ công và ghi chú sự vụ thành công!');
        setEditingResultId(null);
        setEditExceptionReason('');
        if (selectedAuditRunId) {
          fetchAuditResults(selectedAuditRunId);
        }
      } else {
        const err = await res.json();
        alert(`Không thể xác thực: ${err.message || 'Lỗi hệ thống'}`);
      }
    } catch (err: any) {
      alert(`Lỗi kết nối: ${err.message}`);
    } finally {
      setSubmittingVerification(false);
    }
  }

  async function handleSaveRecDetail() {
    if (!token || !workspaceId || !selectedRecForDetail) return;
    try {
      setIsSavingRecDetail(true);
      // 1. Save Assignee
      const resAssignee = await fetch(`http://localhost:3000/recommendations/${selectedRecForDetail.id}/assignee`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({ assigneeId: recAssigneeId || null }),
      });

      // 2. Save Notes
      const resNotes = await fetch(`http://localhost:3000/recommendations/${selectedRecForDetail.id}/notes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          internalNotes: recInternalNotes || null,
          clientNotes: recClientNotes || null,
        }),
      });

      if (resAssignee.ok && resNotes.ok) {
        alert('Đã cập nhật phân công và ghi chú thành công!');
        setSelectedRecForDetail(null);
        // Refresh recommendations
        if (projectId) {
          const recsRes = await fetch(`http://localhost:3000/recommendations?projectId=${projectId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'x-workspace-id': workspaceId,
            },
          });
          if (recsRes.ok) {
            setRecs(await recsRes.json());
          }
        }
      } else {
        alert('Không thể lưu thông tin chi tiết. Vui lòng kiểm tra quyền hạn của bạn.');
      }
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setIsSavingRecDetail(false);
    }
  }

  const runOptimization = React.useCallback(async (planId: string, bodyText: string) => {
    if (!token || !workspaceId || !projectId) return;

    try {
      setIsOptimizing(true);
      const res = await fetch(`http://localhost:3000/projects/${projectId}/content-plans/${planId}/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({ bodyText }),
      });

      if (res.ok) {
        const data = await res.json();
        setOptimizationResult(data);
      }
    } catch (err) {
      console.error('Error running optimization:', err);
    } finally {
      setIsOptimizing(false);
    }
  }, [token, workspaceId, projectId]);

  const fetchBriefForPlan = React.useCallback(async (planId: string) => {
    if (!token || !workspaceId || !projectId) return;
    setBrief(null);
    setOptimizationResult(null);

    try {
      const res = await fetch(`http://localhost:3000/projects/${projectId}/content-plans/${planId}/brief`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setBrief(data);
        
        // Trigger initial optimization if body text exists
        const plan = contentPlansList.find(p => p.id === planId);
        if (plan && plan.body) {
          runOptimization(planId, plan.body);
        }
      }
    } catch (err) {
      console.error('Error fetching brief:', err);
    }
  }, [token, workspaceId, projectId, contentPlansList, runOptimization]);

  async function handleCreateTopic() {
    if (!newTopicName || !token || !workspaceId || !projectId) {
      alert('Please fill in Topic Name');
      return;
    }

    try {
      const kws = newTopicKeywords.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch(`http://localhost:3000/projects/${projectId}/topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          name: newTopicName,
          parentId: newTopicParentId || undefined,
          keywords: kws,
        }),
      });

      if (res.ok) {
        setNewTopicName('');
        setNewTopicKeywords('');
        setNewTopicParentId('');
        fetchTopics();
      } else {
        alert('Failed to create topic');
      }
    } catch (err) {
      console.error('Error creating topic:', err);
    }
  }

  async function handleCreateContentPlan() {
    if (!newPlanTitle || !newPlanPrimaryKeyword || !token || !workspaceId || !projectId) {
      alert('Please fill in Title and Primary Keyword');
      return;
    }

    try {
      const kws = newPlanSecondaryKeywords.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch(`http://localhost:3000/projects/${projectId}/content-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          title: newPlanTitle,
          primaryKeyword: newPlanPrimaryKeyword,
          secondaryKeywords: kws,
          topicId: newPlanTopicId || undefined,
          status: 'planned',
          dueDate: newPlanDueDate ? new Date(newPlanDueDate).toISOString() : undefined,
        }),
      });

      if (res.ok) {
        setNewPlanTitle('');
        setNewPlanPrimaryKeyword('');
        setNewPlanSecondaryKeywords('');
        setNewPlanTopicId('');
        setNewPlanDueDate('');
        fetchContentPlans();
      } else {
        alert('Failed to create content plan');
      }
    } catch (err) {
      console.error('Error creating content plan:', err);
    }
  }

  async function handleGenerateBrief() {
    if (!selectedPlanId || !token || !workspaceId || !projectId) return;

    try {
      setIsGeneratingBrief(true);
      const res = await fetch(`http://localhost:3000/projects/${projectId}/content-plans/${selectedPlanId}/brief`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const data = await res.json();
        setBrief(data);
        fetchContentPlans();
      } else {
        alert('Failed to generate brief.');
      }
    } catch (err) {
      console.error('Error generating brief:', err);
    } finally {
      setIsGeneratingBrief(false);
    }
  }

  async function handleImportUrl() {
    if (!importUrlStr.trim() || !importKeyword.trim() || !token || !workspaceId || !projectId) {
      alert('Please enter a URL and a Primary Keyword');
      return;
    }

    try {
      setIsImporting(true);
      const res = await fetch(`http://localhost:3000/projects/${projectId}/content-plans/import-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          url: importUrlStr,
          primaryKeyword: importKeyword,
          topicId: importTopicId || undefined,
        }),
      });

      if (res.ok) {
        setImportUrlStr('');
        setImportKeyword('');
        setImportTopicId('');
        setShowImportModal(false);
        fetchContentPlans();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Failed to import URL: ${errorData.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error importing URL:', err);
    } finally {
      setIsImporting(false);
    }
  }

  async function handlePublishContent() {
    if (!publishUrlStr.trim() || !publishingPlanId || !token || !workspaceId || !projectId) {
      alert('Please enter the Live Publish URL');
      return;
    }

    try {
      setIsPublishing(true);
      const res = await fetch(`http://localhost:3000/projects/${projectId}/content-plans/${publishingPlanId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          status: 'published',
          publishUrl: publishUrlStr,
        }),
      });

      if (res.ok) {
        setPublishUrlStr('');
        setPublishingPlanId(null);
        setShowPublishModal(false);
        fetchContentPlans();
        fetchDecayedPlans(); // Refresh decayed plans list if any
      } else {
        alert('Failed to publish content plan');
      }
    } catch (err) {
      console.error('Error publishing content plan:', err);
    } finally {
      setIsPublishing(false);
    }
  }

  const fetchPerformanceData = React.useCallback(async (planId: string) => {
    if (!token || !workspaceId || !projectId) return;

    try {
      setLoadingPerformance(true);
      setPerformanceData(null);
      const res = await fetch(`http://localhost:3000/projects/${projectId}/content-plans/${planId}/performance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setPerformanceData(data);
      }
    } catch (err) {
      console.error('Error fetching performance data:', err);
    } finally {
      setLoadingPerformance(false);
    }
  }, [token, workspaceId, projectId]);

  const fetchDecayedPlans = React.useCallback(async () => {
    if (!token || !workspaceId || !projectId) return;

    try {
      setLoadingDecay(true);
      const res = await fetch(`http://localhost:3000/projects/${projectId}/content-plans/decayed`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
      });

      if (res.ok) {
        setDecayedPlansList(await res.json());
      }
    } catch (err) {
      console.error('Error fetching decayed plans:', err);
    } finally {
      setLoadingDecay(false);
    }
  }, [token, workspaceId, projectId]);

  const fetchGscPerformance = React.useCallback(async () => {
    if (!token || !workspaceId || !projectId) return;

    try {
      setLoadingGsc(true);
      const res = await fetch(`http://localhost:3000/projects/${projectId}/gsc-performance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
      });

      if (res.ok) {
        setGscPerformance(await res.json());
      }
    } catch (err) {
      console.error('Error fetching GSC performance data:', err);
    } finally {
      setLoadingGsc(false);
    }
  }, [token, workspaceId, projectId]);

  // Fetch Topics, Content Plans, Sites, Keywords, Members, Reports when token, workspaceId or projectId change
  React.useEffect(() => {
    if (!token || !workspaceId || !projectId) return;
    fetchTopics();
    fetchContentPlans();
    fetchSites();
    fetchKeywords();
    fetchMembers();
    fetchReports();
    fetchDecayedPlans();
    fetchStandardsVersions();
    fetchAuditRuns();
    fetchGscPerformance();
  }, [token, workspaceId, projectId, fetchTopics, fetchContentPlans, fetchSites, fetchKeywords, fetchMembers, fetchReports, fetchDecayedPlans, fetchStandardsVersions, fetchAuditRuns, fetchGscPerformance]);

  // Re-fetch dashboard data when switching to Dashboard tab
  React.useEffect(() => {
    if (activeTab === 'dashboard' && token && workspaceId && projectId) {
      fetchGscPerformance();
    }
  }, [activeTab]);

  // Fetch controls when active version changes
  React.useEffect(() => {
    if (selectedVersionId) {
      fetchStandardsControls(selectedVersionId);
    }
  }, [selectedVersionId, fetchStandardsControls]);

  // Fetch audit results when active audit run changes
  React.useEffect(() => {
    if (selectedAuditRunId) {
      fetchAuditResults(selectedAuditRunId);
    }
  }, [selectedAuditRunId, fetchAuditResults]);

  // Fetch Crawls History and system Audit Logs when tab is active or activeSite changes
  React.useEffect(() => {
    if (activeTab === 'audit') {
      fetchCrawlsHistory();
      fetchAuditLogs();
    }
  }, [activeTab, fetchCrawlsHistory, fetchAuditLogs]);

  // Debounced Real-time Content Optimization
  React.useEffect(() => {
    if (!selectedPlanId || !editorBody.trim()) return;

    const timer = setTimeout(() => {
      runOptimization(selectedPlanId, editorBody);
    }, 800);

    return () => clearTimeout(timer);
  }, [editorBody, selectedPlanId, runOptimization]);

  // Fetch performance data when a published content plan is selected
  React.useEffect(() => {
    if (selectedPlanId) {
      const plan = contentPlansList.find(p => p.id === selectedPlanId);
      if (plan && plan.status === 'published') {
        fetchPerformanceData(selectedPlanId);
      } else {
        setPerformanceData(null);
      }
    } else {
      setPerformanceData(null);
    }
  }, [selectedPlanId, contentPlansList, fetchPerformanceData]);

  async function handleRefreshContent(planId: string) {
    if (!token || !workspaceId || !projectId) return;

    try {
      const res = await fetch(`http://localhost:3000/projects/${projectId}/content-plans/${planId}/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
      });

      if (res.ok) {
        fetchContentPlans();
        fetchDecayedPlans();
        alert('Content plan is now set back to Planned status for update.');
      } else {
        alert('Failed to refresh content plan');
      }
    } catch (err) {
      console.error('Error refreshing content plan:', err);
    }
  }

  async function handleResearchKeyword() {
    if (!keywordResearchInput.trim() || !token || !workspaceId || !projectId) {
      alert('Please enter a keyword to research.');
      return;
    }

    try {
      setIsResearchingKeyword(true);
      setKeywordResearchResult(null);
      const res = await fetch(`http://localhost:3000/projects/${projectId}/keywords/research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({ keyword: keywordResearchInput.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setKeywordResearchResult(data);
      } else {
        const errData = await res.json();
        alert(`Failed to perform keyword research: ${errData.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error in keyword research:', err);
    } finally {
      setIsResearchingKeyword(false);
    }
  }

  async function handleClusterKeywords() {
    if (!keywordClusteringInput.trim() || !token || !workspaceId || !projectId) {
      alert('Please enter keywords to cluster.');
      return;
    }

    try {
      setIsClusteringKeywords(true);
      setKeywordClusteringResult([]);
      const keywords = keywordClusteringInput
        .split('\n')
        .map((k) => k.trim())
        .filter(Boolean);

      const res = await fetch(`http://localhost:3000/projects/${projectId}/keywords/cluster`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({ keywords }),
      });

      if (res.ok) {
        const clusters = await res.json();
        setKeywordClusteringResult(clusters);
      } else {
        alert('Failed to cluster keywords');
      }
    } catch (err) {
      console.error('Error in keyword clustering:', err);
    } finally {
      setIsClusteringKeywords(false);
    }
  }

  async function handleFetchCompetitorGap() {
    if (!token || !workspaceId || !projectId) return;

    try {
      setIsLoadingCompetitorGap(true);
      const res = await fetch(`http://localhost:3000/projects/${projectId}/competitors/gap`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setCompetitorGapResult(data);
      } else {
        alert('Failed to fetch competitor gap analysis');
      }
    } catch (err) {
      console.error('Error fetching competitor gap:', err);
    } finally {
      setIsLoadingCompetitorGap(false);
    }
  }

  async function handleCreateTopicFromCluster(clusterName: string, keywordsList: string[]) {
    if (!token || !workspaceId || !projectId) return;

    try {
      const res = await fetch(`http://localhost:3000/projects/${projectId}/topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          name: clusterName,
          keywords: keywordsList,
        }),
      });

      if (res.ok) {
        alert(`Successfully established topic hub for "${clusterName}"!`);
        fetchTopics();
      } else {
        alert('Failed to create topic hub');
      }
    } catch (err) {
      console.error('Error creating topic from cluster:', err);
    }
  }

  async function handleTrackKeywordDirectly(keyword: string) {
    if (!token || !workspaceId || !projectId) return;
    try {
      const res = await fetch(`http://localhost:3000/projects/${projectId}/keywords`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          keyword: keyword.trim().toLowerCase(),
        }),
      });
      if (res.ok) {
        alert(`Successfully tracking keyword: "${keyword}"!`);
        fetchKeywords();
      } else {
        const errorData = await res.json();
        alert(`Failed to add keyword: ${errorData.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error tracking keyword:', err);
    }
  }

  function getStatusBadgeStyle(status: string) {
    switch (status) {
      case 'published':
        return { background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)' };
      case 'under_review':
        return { background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-orange)' };
      case 'writing':
        return { background: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-secondary)' };
      case 'planned':
      default:
        return { background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)' };
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      const ctx = (window as any)._apiCtx;
      if (!ctx) return;

      const nextStatus = currentStatus === 'pending' ? 'completed' : 'pending';

      const res = await fetch(`http://localhost:3000/recommendations/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.token}`,
          'x-workspace-id': ctx.workspaceId,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update recommendation status');
      }

      const updated = await res.json();
      
      setRecs(prev => prev.map(r => r.id === id ? { ...r, status: updated.status } : r));
    } catch (err: any) {
      console.error('Error toggling status:', err);
      alert(`Error updating recommendation: ${err.message}`);
    }
  };

  const getPriorityDetails = (priority: string) => {
    switch (priority) {
      case 'high':
        return { label: 'High', color: 'var(--accent-red)' };
      case 'medium':
        return { label: 'Medium', color: 'var(--accent-orange)' };
      case 'low':
      default:
        return { label: 'Low', color: 'var(--accent-primary)' };
    }
  };

  // Dynamic data mockups
  const sites = ['mavryk.io', 'seo-platform.dev', 'e-commerce-shop.com'];

  const iconMap: Record<string, any> = React.useMemo(() => ({
    Activity,
    TrendingUp,
    Sparkles,
    CheckCircle2
  }), []);

  const mappedMetrics = React.useMemo(() => {
    if (!gscPerformance?.metrics) return [];
    return gscPerformance.metrics.map((m: any) => ({
      ...m,
      icon: iconMap[m.iconName] || Activity
    }));
  }, [gscPerformance, iconMap]);

  const displayRecs = recs;


  return (
    <main className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar__logo-wrap">
          <div className="sidebar__logo-glow"></div>
          <span className="sidebar__logo-text">Mavryk<span className="sidebar__logo-text--highlight">Seo</span></span>
        </div>

        {/* Workspace/Site Selector */}
        <div className="sidebar__site-selector">
          <div className="sidebar__selector-card">
            <Globe size={16} color="var(--accent-primary)" />
            <select
              value={selectedSite}
              onChange={(e) => {
                const domain = e.target.value;
                setSelectedSite(domain);
                const matched = sitesList.find(s => s.domain === domain);
                if (matched) setActiveSite(matched);
              }}
              className="sidebar__select-input"
            >
              {sitesList.map((s) => (
                <option key={s.id} value={s.domain}>{s.domain}</option>
              ))}
              {sitesList.length === 0 && (
                <option value="mavryk.io">mavryk.io</option>
              )}
            </select>
            <ChevronDown size={14} color="var(--text-secondary)" />
          </div>
        </div>

        {/* Nav Links */}
        <nav aria-label={'Primary navigation'} className="sidebar__nav-menu">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`sidebar__nav-item ${activeTab === 'dashboard' ? 'sidebar__nav-item--active' : ''}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
            {activeTab === 'dashboard' && <div className="sidebar__nav-item-dot" />}
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`sidebar__nav-item ${activeTab === 'content' ? 'sidebar__nav-item--active' : ''}`}
          >
            <Sparkles size={18} />
            <span>Content Planner</span>
            {activeTab === 'content' && <div className="sidebar__nav-item-dot" />}
          </button>
          <button
            onClick={() => setActiveTab('keywords')}
            className={`sidebar__nav-item ${activeTab === 'keywords' ? 'sidebar__nav-item--active' : ''}`}
          >
            <TrendingUp size={18} />
            <span>Rank Tracker</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`sidebar__nav-item ${activeTab === 'audit' ? 'sidebar__nav-item--active' : ''}`}
          >
            <Search size={18} />
            <span>Audit Site</span>
          </button>
          <button
            onClick={() => setActiveTab('standards')}
            className={`sidebar__nav-item ${activeTab === 'standards' ? 'sidebar__nav-item--active' : ''}`}
          >
            <BookOpen size={18} />
            <span>SEO Standards</span>
          </button>
          <button
            onClick={() => setActiveTab('backlinks')}
            className={`sidebar__nav-item ${activeTab === 'backlinks' ? 'sidebar__nav-item--active' : ''}`}
          >
            <Link2 size={18} />
            <span>Backlinks</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`sidebar__nav-item ${activeTab === 'reports' ? 'sidebar__nav-item--active' : ''}`}
          >
            <FileText size={18} />
            <span>Báo cáo</span>
            {activeTab === 'reports' && <div className="sidebar__nav-item-dot" />}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`sidebar__nav-item ${activeTab === 'settings' ? 'sidebar__nav-item--active' : ''}`}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </nav>

        {/* User Card */}
        <div className="sidebar__user-wrap">
          <div className="sidebar__user-card">
            <div className="sidebar__user-avatar">
              <User size={16} color="var(--text-primary)" />
            </div>
            <div className="sidebar__user-info">
              <div className="sidebar__user-name">Mavryk Agency</div>
              <div className="sidebar__user-role">Workspace Owner</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Panel Content */}
      <section className="dashboard-main">
        {/* Header */}
        <header className="dashboard-header">
          <div>
            <h1 className="dashboard-header__title">
              {activeTab === 'dashboard' && 'SEO Dashboard'}
              {activeTab === 'content' && 'Content Marketing'}
              {activeTab === 'keywords' && 'Rank Tracker'}
              {activeTab === 'audit' && 'Audit Site'}
              {activeTab === 'standards' && 'Tiêu chuẩn & Đánh giá SEO'}
              {activeTab === 'backlinks' && 'Backlinks'}
              {activeTab === 'reports' && 'Báo cáo White-label'}
              {activeTab === 'settings' && 'Settings'}
            </h1>
            <p className="dashboard-header__subtitle">
              {activeTab === 'dashboard' && 'Real-time Google Search Console & Audit Insights for '}
              {activeTab === 'content' && 'Plan, outline, and optimize your content authority for '}
              {activeTab === 'standards' && 'Quản lý chuẩn SEO và kiểm tra checklist nội bộ cho '}
              {activeTab !== 'dashboard' && activeTab !== 'content' && activeTab !== 'standards' && 'Manage your '}
              <span className="dashboard-header__site-name">{selectedSite}</span>
            </p>
          </div>
          <div className="dashboard-header__actions">
            <button className="dashboard-header__icon-btn">
              <Bell size={18} />
              <div className="dashboard-header__notification-badge" />
            </button>
            <div className="dashboard-header__divider" />
            <button className="dashboard-header__action-btn">
              <Sparkles size={16} />
              <span>AI recommendations</span>
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <DashboardTab
            metrics={mappedMetrics}
            keywords={gscPerformance?.topKeywords || []}
            chartData={gscPerformance?.chartData || []}
            containerRef={containerRef}
            chartWidth={chartWidth}
            displayRecs={displayRecs}
            apiLoading={apiLoading || loadingGsc}
            apiError={apiError}
            setSelectedRecForDetail={setSelectedRecForDetail}
            setRecAssigneeId={setRecAssigneeId}
            setRecInternalNotes={setRecInternalNotes}
            setRecClientNotes={setRecClientNotes}
          />
        )}

        {/* Content Marketing Tab */}
        {activeTab === 'content' && (
          <ContentPlannerTab
            token={token}
            workspaceId={workspaceId}
            projectId={projectId}
            activeSite={activeSite}
            selectedSite={selectedSite}
            topicsList={topicsList}
            contentPlansList={contentPlansList}
            decayedPlansList={decayedPlansList}
            selectedPlanId={selectedPlanId}
            setSelectedPlanId={setSelectedPlanId}
            editorBody={editorBody}
            setEditorBody={setEditorBody}
            contentSubTab={contentSubTab}
            setContentSubTab={setContentSubTab}
            researchSubTab={researchSubTab}
            setResearchSubTab={setResearchSubTab}
            keywordResearchInput={keywordResearchInput}
            setKeywordResearchInput={setKeywordResearchInput}
            keywordResearchResult={keywordResearchResult}
            isResearchingKeyword={isResearchingKeyword}
            keywordClusteringInput={keywordClusteringInput}
            setKeywordClusteringInput={setKeywordClusteringInput}
            keywordClusteringResult={keywordClusteringResult}
            isClusteringKeywords={isClusteringKeywords}
            competitorGapResult={competitorGapResult}
            isLoadingCompetitorGap={isLoadingCompetitorGap}
            newTopicName={newTopicName}
            setNewTopicName={setNewTopicName}
            newTopicParentId={newTopicParentId}
            setNewTopicParentId={setNewTopicParentId}
            newTopicKeywords={newTopicKeywords}
            setNewTopicKeywords={setNewTopicKeywords}
            newPlanTitle={newPlanTitle}
            setNewPlanTitle={setNewPlanTitle}
            newPlanPrimaryKeyword={newPlanPrimaryKeyword}
            setNewPlanPrimaryKeyword={setNewPlanPrimaryKeyword}
            newPlanSecondaryKeywords={newPlanSecondaryKeywords}
            setNewPlanSecondaryKeywords={setNewPlanSecondaryKeywords}
            newPlanTopicId={newPlanTopicId}
            setNewPlanTopicId={setNewPlanTopicId}
            newPlanDueDate={newPlanDueDate}
            setNewPlanDueDate={setNewPlanDueDate}
            brief={brief}
            isGeneratingBrief={isGeneratingBrief}
            optimizationResult={optimizationResult}
            isOptimizing={isOptimizing}
            performanceData={performanceData}
            setShowImportModal={setShowImportModal}
            setImportUrlStr={setImportUrlStr}
            setImportKeyword={setImportKeyword}
            setImportTopicId={setImportTopicId}
            setShowPublishModal={setShowPublishModal}
            setPublishingPlanId={setPublishingPlanId}
            setPublishUrlStr={setPublishUrlStr}
            handleRefreshContent={handleRefreshContent}
            fetchBriefForPlan={fetchBriefForPlan}
            handleCreateContentPlan={handleCreateContentPlan}
            handleCreateTopic={handleCreateTopic}
            handleResearchKeyword={handleResearchKeyword}
            handleTrackKeywordDirectly={handleTrackKeywordDirectly}
            handleClusterKeywords={handleClusterKeywords}
            handleCreateTopicFromCluster={handleCreateTopicFromCluster}
            handleFetchCompetitorGap={handleFetchCompetitorGap}
            handleGenerateBrief={handleGenerateBrief}
          />
        )}

        {/* Site Audit Tab */}
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
            sitesList={sitesList}
            selectedSite={selectedSite}
            workspaceId={workspaceId}
            token={token}
          />
        )}

        {/* Rank Tracker Tab */}
        {activeTab === 'keywords' && (
          <RankTrackerTab
            newKeywordInput={newKeywordInput}
            setNewKeywordInput={setNewKeywordInput}
            newKeywordTargetUrl={newKeywordTargetUrl}
            setNewKeywordTargetUrl={setNewKeywordTargetUrl}
            isAddingKeyword={isAddingKeyword}
            handleAddKeyword={handleAddKeyword}
            keywordsList={keywordsList}
            handleDeleteKeyword={handleDeleteKeyword}
          />
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <ReportsTab
            newReportTitle={newReportTitle}
            setNewReportTitle={setNewReportTitle}
            newReportType={newReportType}
            setNewReportType={setNewReportType}
            reportsList={reportsList}
            setSelectedReport={setSelectedReport}
            handleCreateReport={handleCreateReport}
            activeSite={activeSite}
          />
        )}

        {/* Backlinks Tab */}
        {activeTab === 'backlinks' && (
          <BacklinksTab />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            projectName={projectName}
            setProjectName={setProjectName}
            workspaceId={workspaceId}
            isGscConnected={isGscConnected}
            setIsGscConnected={setIsGscConnected}
            workspacePlan={workspacePlan}
            handleTogglePlan={handleTogglePlan}
            sitesList={sitesList}
            keywordsList={keywordsList}
            contentPlansList={contentPlansList}
            membersList={membersList}
            newMemberEmail={newMemberEmail}
            setNewMemberEmail={setNewMemberEmail}
            newMemberRole={newMemberRole}
            setNewMemberRole={setNewMemberRole}
            handleAddMember={handleAddMember}
            activeSite={activeSite}
            token={token}
            projectId={projectId}
          />
        )}

        {/* Import URL Modal */}
        {showImportModal && (
          <div className="settings-tab__element-224--auto-224">
            <div className="glass-card modal-box modal-box--sm">
              <div className="settings-tab__element-226--auto-226">
                <h3 className="settings-tab__title--auto-227">Import Article from URL</h3>
                <button onClick={() => setShowImportModal(false)} className="settings-tab__btn-close--auto-228">×</button>
              </div>
              <div className="font-size-md modal-body--form">
                <div>
                  <label className="jss-form-label">Article URL</label>
                  <input type="text" value={importUrlStr} onChange={e => setImportUrlStr(e.target.value)} placeholder="https://example.com/blog/article" className="dashboard-form__input" />
                </div>
                <div>
                  <label className="jss-form-label">Primary Keyword</label>
                  <input type="text" value={importKeyword} onChange={e => setImportKeyword(e.target.value)} placeholder="e.g. react seo" className="dashboard-form__input" />
                </div>
                <div>
                  <label className="jss-form-label">Topic Authority Group</label>
                  <select value={importTopicId} onChange={e => setImportTopicId(e.target.value)} className="dashboard-form__select">
                    <option value="">None</option>
                    {topicsList.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="modal-footer">
                  <button onClick={() => setShowImportModal(false)} className="modal-btn-secondary">Cancel</button>
                  <button onClick={handleImportUrl} disabled={isImporting} className="modal-btn-primary">
                    {isImporting ? 'Importing...' : 'Import'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Publish Content Plan Modal */}
        {showPublishModal && (
          <div className="settings-tab__element-224--auto-224">
            <div className="glass-card modal-box modal-box--sm">
              <div className="settings-tab__element-226--auto-226">
                <h3 className="settings-tab__title--auto-227">Publish Content Plan</h3>
                <button onClick={() => { setShowPublishModal(false); setPublishingPlanId(null); }} className="settings-tab__btn-close--auto-228">×</button>
              </div>
              <div className="font-size-md modal-body--form">
                <p className="modal-desc">
                  Please enter the live URL where this article has been published to track its performance.
                </p>
                <div>
                  <label className="jss-form-label">Live Publish URL</label>
                  <input type="text" value={publishUrlStr} onChange={e => setPublishUrlStr(e.target.value)} placeholder="https://yourdomain.com/blog/live-article" className="dashboard-form__input" />
                </div>
                <div className="modal-footer">
                  <button onClick={() => { setShowPublishModal(false); setPublishingPlanId(null); }} className="modal-btn-secondary">Cancel</button>
                  <button onClick={handlePublishContent} disabled={isPublishing} className="modal-btn-primary">
                    {isPublishing ? 'Publishing...' : 'Mark as Published'}
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Report Preview Modal */}
        {selectedReport && (
          <div className="modal-overlay modal-overlay--padded">
            <div className="glass-card modal-box modal-box--report-preview">
              {/* Header */}
              <div className="modal-header">
                <h3 className="modal-title">
                  Bản xem trước Báo cáo: {selectedReport.title}
                </h3>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="modal-close-btn"
                >
                  ✕
                </button>
              </div>

              {/* Preview Content */}
              <div className="modal-body modal-body--report">
                <div dangerouslySetInnerHTML={{ __html: selectedReport.metadata?.renderedHtml || '<p>Không có nội dung báo cáo</p>' }} />
              </div>

              {/* Footer */}
              <div className="modal-footer">
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(selectedReport.metadata?.renderedHtml || '');
                      printWindow.document.close();
                      printWindow.focus();
                      printWindow.print();
                    }
                  }}
                  className="modal-btn-primary"
                >
                  In / Xuất PDF
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="modal-btn-secondary"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recommendation Detail Modal */}
        {selectedRecForDetail && (
          <div className="modal-overlay modal-overlay--padded">
            <div className="glass-card modal-box modal-box--rec-detail">
              {/* Header */}
              <div className="modal-header">
                <h3 className="modal-title">
                  Chi tiết Kiến nghị & Phân công
                </h3>
                <button
                  onClick={() => setSelectedRecForDetail(null)}
                  className="modal-close-btn"
                >
                  ✕
                </button>
              </div>

              {/* Rec info */}
              <div className="modal-rec-info">
                <h4 className="modal-rec-info__title">
                  {selectedRecForDetail.title}
                </h4>
                <p className="modal-rec-info__desc">
                  {selectedRecForDetail.description}
                </p>
              </div>

              {/* Assignee selection */}
              <div className="modal-form-group">
                <label className="jss-form-label">Người phụ trách (Assignee)</label>
                <select
                  value={recAssigneeId}
                  onChange={e => setRecAssigneeId(e.target.value)}
                  className="dashboard-form__input"
                >
                  <option value="">-- Chưa phân công --</option>
                  {membersList.map((mem: any) => (
                    <option key={mem.membershipId || mem.id} value={mem.user?.id || mem.userId}>
                      {mem.user?.email || mem.user?.id || mem.userId} ({mem.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes: Internal Notes & Client Notes */}
              <div className="modal-form-group modal-form-group--notes">
                <div>
                  <div className="modal-form-group__header">
                    <label className="jss-form-label jss-form-label--no-margin">Ghi chú nội bộ (Internal Notes)</label>
                    <span className="modal-form-group__badge modal-form-group__badge--internal">CHỈ NỘI BỘ AGENCY</span>
                  </div>
                  <textarea
                    value={recInternalNotes}
                    onChange={e => setRecInternalNotes(e.target.value)}
                    placeholder="Nhập ghi chú kỹ thuật, lưu ý nội bộ công việc..."
                    className="dashboard-form__input"
                  />
                </div>

                <div>
                  <div className="modal-form-group__header">
                    <label className="jss-form-label jss-form-label--no-margin">Ghi chú gửi khách hàng (Client Notes)</label>
                    <span className="modal-form-group__badge modal-form-group__badge--client">KHÁCH HÀNG CÓ THỂ XEM</span>
                  </div>
                  <textarea
                    value={recClientNotes}
                    onChange={e => setRecClientNotes(e.target.value)}
                    placeholder="Giải thích cho khách hàng về lỗi này và cách xử lý..."
                    className="dashboard-form__input"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="modal-footer modal-footer--bordered">
                <button
                  onClick={() => setSelectedRecForDetail(null)}
                  className="modal-btn-secondary"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveRecDetail}
                  disabled={isSavingRecDetail}
                  className="modal-btn-primary"
                >
                  {isSavingRecDetail ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HTML Viewer Modal */}
        {viewingRawHtmlJobRunId && (
          <div className="modal-overlay modal-overlay--padded">
            <div className="glass-card modal-box modal-box--html-viewer">
              <div className="modal-header">
                <h3 className="modal-title">Nguồn HTML thô (Raw Web Content)</h3>
                <button
                  onClick={() => setViewingRawHtmlJobRunId(null)}
                  className="modal-close-btn"
                >
                  ✕
                </button>
              </div>
              
              <div className="modal-body modal-body--html-viewer">
                {loadingRawHtml ? (
                  <div className="modal-loader-wrap">
                    <Loader2 size={32} className="modal-loader-icon" />
                  </div>
                ) : (
                  rawHtmlContent || 'Không có nội dung HTML'
                )}
              </div>

              <div className="modal-footer">
                <button
                  onClick={() => setViewingRawHtmlJobRunId(null)}
                  className="modal-btn-secondary"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
