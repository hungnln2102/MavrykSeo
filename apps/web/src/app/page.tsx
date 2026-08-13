'use client';

import React, { useState } from 'react';
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
  }, []);

  // API states
  const [recs, setRecs] = useState<any[]>([]);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  React.useEffect(() => {
    async function initApi() {
      try {
        setApiLoading(true);
        setApiError(null);

        // 1. Auto-login
        const loginRes = await fetch('http://localhost:3000/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@mavryk.io' }),
        });

        if (!loginRes.ok) {
          throw new Error('Failed to login to API');
        }

        const loginData = await loginRes.json();
        const jwtToken = loginData.token;
        setToken(jwtToken);

        // 2. Fetch workspaces
        const wsRes = await fetch('http://localhost:3000/workspaces', {
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
          },
        });

        if (!wsRes.ok) {
          throw new Error('Failed to fetch workspaces');
        }

        const workspaces = await wsRes.json();
        if (workspaces.length === 0) {
          throw new Error('No workspaces found for user');
        }

        // Find test-workspace or fallback to first
        const ws = workspaces.find((w: any) => w.slug === 'test-workspace') || workspaces[0];
        const wsId = ws.id;
        setWorkspaceId(wsId);

        // 3. Fetch projects
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

        const projId = projects[0].id;
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

  async function fetchBriefForPlan(planId: string) {
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
  }

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
  }, [token, workspaceId, projectId, fetchTopics, fetchContentPlans, fetchSites, fetchKeywords, fetchMembers, fetchReports, fetchDecayedPlans]);

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

  const metrics = [
    { label: 'Total Clicks', value: '42.8K', change: '+14.2%', positive: true, icon: Activity },
    { label: 'Avg. CTR', value: '3.4%', change: '+0.8%', positive: true, icon: TrendingUp },
    { label: 'Avg. Position', value: '11.2', change: '-2.4', positive: true, icon: Sparkles },
    { label: 'Crawl Health', value: '98%', change: '0%', positive: true, icon: CheckCircle2 }
  ];

  const keywords = [
    { query: 'seo automated tool', clicks: 1240, impressions: 8400, ctr: '14.7%', pos: 2.4 },
    { query: 'ai ranking software', clicks: 942, impressions: 12100, ctr: '7.8%', pos: 4.1 },
    { query: 'nextjs seo template', clicks: 612, impressions: 5800, ctr: '10.5%', pos: 1.8 },
    { query: 'automatic index google', clicks: 580, impressions: 18400, ctr: '3.1%', pos: 8.9 },
    { query: 'content decay tool', clicks: 430, impressions: 3200, ctr: '13.4%', pos: 3.5 }
  ];

  const staticActions = [
    {
      id: 'mock-1',
      title: 'Fix 14 Orphan Pages',
      description: 'Found 14 pages with no incoming internal links. Critical for PageRank distribution.',
      priority: 'high',
      status: 'pending',
      impactScore: 85,
    },
    {
      id: 'mock-2',
      title: 'Optimize Content Decay: /blog/seo-guide',
      description: 'Traffic dropped by 34% over the last 90 days. Update outdated sections.',
      priority: 'high',
      status: 'pending',
      impactScore: 80,
    },
    {
      id: 'mock-3',
      title: 'Target striking distance keyword "seo audit checklist"',
      description: 'Currently ranking #11. Adding 2 high-quality internal links could push it to page 1.',
      priority: 'medium',
      status: 'pending',
      impactScore: 75,
    }
  ];

  const displayRecs = recs.length > 0 ? recs : staticActions;

  const paddingX = 50;
  const chartW = (chartWidth || 800) - paddingX * 2;
  const interval = chartW / 5;
  const x0 = paddingX;
  const x1 = paddingX + interval;
  const x2 = paddingX + interval * 2;
  const x3 = paddingX + interval * 3;
  const x4 = paddingX + interval * 4;
  const x5 = paddingX + interval * 5;
  const ctrlX1 = paddingX + interval / 2;

  return (
    <main className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside style={styles.sidebar}>
        <div style={styles.logoContainer}>
          <div style={styles.logoGlow}></div>
          <span style={styles.logoText}>Mavryk<span style={{ color: 'var(--accent-secondary)' }}>Seo</span></span>
        </div>

        {/* Workspace/Site Selector */}
        <div style={styles.siteSelectorContainer}>
          <div style={styles.siteSelectorCard}>
            <Globe size={16} color="var(--accent-primary)" />
            <select
              value={selectedSite}
              onChange={(e) => {
                const domain = e.target.value;
                setSelectedSite(domain);
                const matched = sitesList.find(s => s.domain === domain);
                if (matched) setActiveSite(matched);
              }}
              style={styles.selectInput}
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
        <nav style={styles.navMenu}>
          <button
            onClick={() => setActiveTab('dashboard')}
            style={{ ...styles.navItem, ...(activeTab === 'dashboard' ? styles.navItemActive : {}) }}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
            {activeTab === 'dashboard' && <div style={styles.activeDot} />}
          </button>
          <button
            onClick={() => setActiveTab('content')}
            style={{ ...styles.navItem, ...(activeTab === 'content' ? styles.navItemActive : {}) }}
          >
            <Sparkles size={18} />
            <span>Content Planner</span>
            {activeTab === 'content' && <div style={styles.activeDot} />}
          </button>
          <button
            onClick={() => setActiveTab('keywords')}
            style={{ ...styles.navItem, ...(activeTab === 'keywords' ? styles.navItemActive : {}) }}
          >
            <TrendingUp size={18} />
            <span>Rank Tracker</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            style={{ ...styles.navItem, ...(activeTab === 'audit' ? styles.navItemActive : {}) }}
          >
            <Search size={18} />
            <span>Audit Site</span>
          </button>
          <button
            onClick={() => setActiveTab('backlinks')}
            style={{ ...styles.navItem, ...(activeTab === 'backlinks' ? styles.navItemActive : {}) }}
          >
            <Link2 size={18} />
            <span>Backlinks</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            style={{ ...styles.navItem, ...(activeTab === 'reports' ? styles.navItemActive : {}) }}
          >
            <FileText size={18} />
            <span>Báo cáo</span>
            {activeTab === 'reports' && <div style={styles.activeDot} />}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            style={{ ...styles.navItem, ...(activeTab === 'settings' ? styles.navItemActive : {}) }}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </nav>

        {/* User Card */}
        <div style={styles.userCardContainer}>
          <div style={styles.userCard}>
            <div style={styles.avatar}>
              <User size={16} color="var(--text-primary)" />
            </div>
            <div style={styles.userInfo}>
              <div style={styles.userName}>Mavryk Agency</div>
              <div style={styles.userRole}>Workspace Owner</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Panel Content */}
      <section style={styles.mainContent}>
        {/* Header */}
        <header style={styles.header}>
          <div>
            <h1 style={styles.headerTitle}>
              {activeTab === 'dashboard' && 'SEO Dashboard'}
              {activeTab === 'content' && 'Content Marketing'}
              {activeTab === 'keywords' && 'Rank Tracker'}
              {activeTab === 'audit' && 'Audit Site'}
              {activeTab === 'backlinks' && 'Backlinks'}
              {activeTab === 'reports' && 'Báo cáo White-label'}
              {activeTab === 'settings' && 'Settings'}
            </h1>
            <p style={styles.headerSubtitle}>
              {activeTab === 'dashboard' && 'Real-time Google Search Console & Audit Insights for '}
              {activeTab === 'content' && 'Plan, outline, and optimize your content authority for '}
              {activeTab !== 'dashboard' && activeTab !== 'content' && 'Manage your '}
              <span style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>{selectedSite}</span>
            </p>
          </div>
          <div style={styles.headerActions}>
            <button style={styles.iconButton}>
              <Bell size={18} />
              <div style={styles.notificationBadge} />
            </button>
            <div style={styles.divider} />
            <button style={styles.actionButton}>
              <Sparkles size={16} />
              <span>AI recommendations</span>
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <>
            {/* Metrics Grid */}
            <div style={styles.metricsGrid}>
              {metrics.map((m, idx) => {
                const Icon = m.icon;
                return (
                  <div key={idx} className="glass-card" style={styles.metricCard}>
                    <div style={styles.metricHeader}>
                      <span style={styles.metricLabel}>{m.label}</span>
                      <div style={styles.metricIconWrap}>
                        <Icon size={16} color="var(--accent-primary)" />
                      </div>
                    </div>
                    <div style={styles.metricBody}>
                      <span style={styles.metricValue}>{m.value}</span>
                      <span style={{
                        ...styles.metricChange,
                        color: m.positive ? 'var(--accent-green)' : 'var(--accent-red)'
                      }}>
                        {m.change.startsWith('+') || m.change.startsWith('-') ? (
                          m.positive ? <ArrowUpRight size={14} style={{ marginRight: 2 }} /> : <ArrowDownRight size={14} style={{ marginRight: 2 }} />
                        ) : null}
                        {m.change}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chart Card */}
            <div className="glass-card" style={styles.chartCard}>
              <div style={styles.chartHeader}>
                <div>
                  <h2 style={styles.cardTitle}>Performance Overview</h2>
                  <p style={styles.cardSubtitle}>Organic traffic trends and daily impressions</p>
                </div>
                <div style={styles.chartPeriod}>
                  <button style={styles.periodBtnActive}>Last 30 Days</button>
                  <button style={styles.periodBtn}>Last 90 Days</button>
                </div>
              </div>
              
              {/* Custom SVG Line Chart */}
              <div ref={containerRef} style={styles.chartWrapper}>
                {chartWidth !== null && (
                  <svg viewBox={`0 0 ${chartWidth} 240`} style={styles.chartSvg}>
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-secondary)" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="var(--accent-secondary)" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Grid Lines */}
                    <line x1={x0} y1="20" x2={x5} y2="20" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
                    <line x1={x0} y1="75" x2={x5} y2="75" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
                    <line x1={x0} y1="130" x2={x5} y2="130" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
                    <line x1={x0} y1="185" x2={x5} y2="185" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
                    
                    {/* Fill Curves */}
                    <path
                      d={`M ${x0} 185 Q ${ctrlX1} 170 ${x1} 110 T ${x2} 90 T ${x3} 140 T ${x4} 60 T ${x5} 30 L ${x5} 200 L ${x0} 200 Z`}
                      fill="url(#chartGradient)"
                    />
                    <path
                      d={`M ${x0} 185 Q ${ctrlX1} 150 ${x1} 130 T ${x2} 110 T ${x3} 160 T ${x4} 90 T ${x5} 50 L ${x5} 200 L ${x0} 200 Z`}
                      fill="url(#purpleGradient)"
                    />

                    {/* Line Curves */}
                    <path
                      d={`M ${x0} 185 Q ${ctrlX1} 170 ${x1} 110 T ${x2} 90 T ${x3} 140 T ${x4} 60 T ${x5} 30`}
                      fill="none"
                      stroke="var(--accent-primary)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <path
                      d={`M ${x0} 185 Q ${ctrlX1} 150 ${x1} 130 T ${x2} 110 T ${x3} 160 T ${x4} 90 T ${x5} 50`}
                      fill="none"
                      stroke="var(--accent-secondary)"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                    />

                    {/* Data points */}
                    <circle cx={x4} cy="60" r="5" fill="var(--accent-primary)" stroke="var(--bg-primary)" strokeWidth="2" />
                    <circle cx={x5} cy="30" r="5" fill="var(--accent-primary)" stroke="var(--bg-primary)" strokeWidth="2" />
                  </svg>
                )}
              </div>
              
              <div style={styles.chartLegends}>
                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, background: 'var(--accent-primary)' }} />
                  <span>Clicks (Search Console)</span>
                </div>
                <div style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, border: '1px dashed var(--accent-secondary)', background: 'transparent' }} />
                  <span>Impressions</span>
                </div>
              </div>
            </div>

            {/* Details Section */}
            <div style={styles.detailsGrid}>
              {/* GSC Keywords Table */}
              <div className="glass-card" style={styles.keywordsCard}>
                <div style={styles.cardHeader}>
                  <h2 style={styles.cardTitle}>Top Keywords (GSC)</h2>
                  <p style={styles.cardSubtitle}>Queries driving the most traffic</p>
                </div>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.trHead}>
                        <th style={styles.th}>Keyword Query</th>
                        <th style={styles.th}>Clicks</th>
                        <th style={styles.th}>Impressions</th>
                        <th style={styles.th}>CTR</th>
                        <th style={styles.th}>Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keywords.map((k, idx) => (
                        <tr key={idx} style={styles.trBody}>
                          <td style={styles.tdKeyword}>{k.query}</td>
                          <td style={styles.td}>{k.clicks.toLocaleString()}</td>
                          <td style={styles.td}>{k.impressions.toLocaleString()}</td>
                          <td style={styles.td}>{k.ctr}</td>
                          <td style={styles.td}>
                            <span style={styles.badgePosition}>{k.pos}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Center / Recommendations */}
              <div className="glass-card" style={styles.actionsCard}>
                <div style={styles.cardHeader}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                      <h2 style={styles.cardTitle}>Action Center</h2>
                      <p style={styles.cardSubtitle}>AI generated SEO recommendations</p>
                    </div>
                    {apiLoading && <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', animation: 'pulse 1.5s infinite' }}>Connecting API...</span>}
                    {apiError && <span style={{ fontSize: '0.75rem', color: 'var(--accent-red)' }} title={apiError}>Offline Mode (Mock)</span>}
                  </div>
                </div>
                <div style={styles.actionList}>
                  {displayRecs.map((act) => {
                    const isCompleted = act.status === 'completed';
                    const pri = getPriorityDetails(act.priority);
                    const indicatorColor = isCompleted ? 'var(--accent-secondary)' : pri.color;
                    
                    return (
                      <div 
                        key={act.id} 
                        style={{ 
                          ...styles.actionItem, 
                          ...(isCompleted ? { opacity: 0.55 } : {}) 
                        }}
                      >
                        <div style={{ ...styles.actionLeftIndicator, background: indicatorColor }} />
                        <div style={styles.actionBody}>
                          <div style={styles.actionHeaderRow}>
                            <span 
                              style={{ 
                                ...styles.actionTitle, 
                                ...(isCompleted ? { textDecoration: 'line-through', color: 'var(--text-muted)' } : {}) 
                              }}
                            >
                              {act.title}
                            </span>
                            <span style={{ ...styles.badgeImpact, color: indicatorColor, borderColor: indicatorColor }}>
                              {isCompleted ? 'Done' : `${act.impactScore || 0} Impact`}
                            </span>
                          </div>
                          <p style={{ ...styles.actionDesc, ...(isCompleted ? { color: 'var(--text-muted)' } : {}) }}>
                            {act.description}
                          </p>
                          <div style={styles.actionFooterRow}>
                            <span style={styles.actionTypeTag}>{isCompleted ? 'Resolved' : `${act.priority.toUpperCase()}`}</span>
                            <button 
                              onClick={() => {
                                setSelectedRecForDetail(act);
                                setRecAssigneeId(act.assigneeId || '');
                                setRecInternalNotes(act.internalNotes || '');
                                setRecClientNotes(act.clientNotes || '');
                              }}
                              style={{ 
                                ...styles.actionBtnOptimize, 
                                color: indicatorColor,
                                fontWeight: isCompleted ? 500 : 600
                              }}
                            >
                              <span>{isCompleted ? 'Xem Chi Tiết' : 'Optimize / Phân công'}</span>
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Content Marketing Tab */}
        {activeTab === 'content' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
            {/* Sub-tab Switcher */}
            <div style={styles.subTabContainer}>
              <button
                onClick={() => setContentSubTab('calendar')}
                style={{ ...styles.subTabButton, ...(contentSubTab === 'calendar' ? styles.subTabButtonActive : {}) }}
              >
                <Calendar size={16} />
                <span>Editorial Calendar</span>
              </button>
              <button
                onClick={() => setContentSubTab('topics')}
                style={{ ...styles.subTabButton, ...(contentSubTab === 'topics' ? styles.subTabButtonActive : {}) }}
              >
                <BookOpen size={16} />
                <span>Topical Authority Map</span>
              </button>
              <button
                onClick={() => setContentSubTab('research')}
                style={{ ...styles.subTabButton, ...(contentSubTab === 'research' ? styles.subTabButtonActive : {}) }}
              >
                <Search size={16} />
                <span>Keyword Research</span>
              </button>
              <button
                onClick={() => setContentSubTab('editor')}
                style={{ ...styles.subTabButton, ...(contentSubTab === 'editor' ? styles.subTabButtonActive : {}) }}
              >
                <Sparkles size={16} />
                <span>AI SEO Writer</span>
              </button>
            </div>

            {/* Sub-tab 1: Editorial Calendar */}
            {contentSubTab === 'calendar' && (
              <div style={styles.contentPlannerGrid}>
                {/* Plans List */}
                <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <h3 style={{ ...styles.cardTitle, marginBottom: 0 }}>Scheduled Content Drafts</h3>
                      <button
                        onClick={() => {
                          setImportUrlStr('');
                          setImportKeyword('');
                          setImportTopicId('');
                          setShowImportModal(true);
                        }}
                        style={{
                          padding: '0.4rem 0.8rem',
                          background: 'linear-gradient(135deg, var(--accent-secondary), #06b6d4)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          boxShadow: '0 4px 12px rgba(6,182,212,0.15)',
                        }}
                      >
                        <Plus size={14} />
                        <span>Import URL</span>
                      </button>
                    </div>

                    {/* Decayed Content Alert Section */}
                    {decayedPlansList.length > 0 && (
                      <div style={{ padding: '1rem', border: '1px solid rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.03)', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ color: 'var(--accent-red)', fontWeight: 'bold', fontSize: '0.95rem' }}>⚠️ Content Decay Alert</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>The following published articles have dropped &gt;20% in traffic over the last 30 days:</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          {decayedPlansList.map(plan => (
                            <div key={plan.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px' }}>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{plan.title}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  Keyword: <span style={{ color: 'var(--accent-primary)' }}>{plan.primaryKeyword}</span> | Drop: <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>-{plan.dropPercentage}%</span> (Recent clicks: {plan.recentClicks} vs Historic clicks: {plan.historicClicks})
                                </div>
                              </div>
                              <button
                                onClick={() => handleRefreshContent(plan.id)}
                                style={{
                                  padding: '0.35rem 0.7rem',
                                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                                  border: '1px solid var(--accent-primary)',
                                  borderRadius: '6px',
                                  color: 'var(--accent-primary)',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Refresh Content
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {contentPlansList.length === 0 ? (
                      <div style={styles.emptyState}>
                        <p>No content plans found. Create a new plan on the right to start your SEO strategy!</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {contentPlansList.map(plan => (
                          <div key={plan.id} style={styles.planCard}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{plan.title}</h4>
                                <span style={{ ...styles.statusBadge, ...getStatusBadgeStyle(plan.status) }}>{plan.status}</span>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                <span style={styles.keywordTagPrimary}>Primary: {plan.primaryKeyword}</span>
                                {plan.secondaryKeywords?.map((k: string) => (
                                  <span key={k} style={styles.keywordTagSecondary}>{k}</span>
                                ))}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                Due Date: {plan.dueDate ? new Date(plan.dueDate).toLocaleDateString() : 'Unscheduled'}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedPlanId(plan.id);
                                setEditorBody(plan.body || '');
                                setContentSubTab('editor');
                                fetchBriefForPlan(plan.id);
                              }}
                              style={styles.openEditorBtn}
                            >
                              <span>Open in Editor</span>
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Create Plan Form */}
                <div style={{ flex: 1 }}>
                  <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={styles.cardTitle}>Plan New Content</h3>
                    
                    <div>
                      <label style={styles.formLabel}>Article Title</label>
                      <input
                        type="text"
                        value={newPlanTitle}
                        onChange={e => setNewPlanTitle(e.target.value)}
                        placeholder="e.g. Complete Guide to React SEO in 2026"
                        style={styles.formInput}
                      />
                    </div>
                    
                    <div>
                      <label style={styles.formLabel}>Primary Target Keyword</label>
                      <input
                        type="text"
                        value={newPlanPrimaryKeyword}
                        onChange={e => setNewPlanPrimaryKeyword(e.target.value)}
                        placeholder="e.g. react seo guide"
                        style={styles.formInput}
                      />
                    </div>
                    
                    <div>
                      <label style={styles.formLabel}>Secondary Keywords (comma separated)</label>
                      <input
                        type="text"
                        value={newPlanSecondaryKeywords}
                        onChange={e => setNewPlanSecondaryKeywords(e.target.value)}
                        placeholder="e.g. nextjs seo, react helmet"
                        style={styles.formInput}
                      />
                    </div>

                    <div>
                      <label style={styles.formLabel}>Authority Topic Group</label>
                      <select
                        value={newPlanTopicId}
                        onChange={e => setNewPlanTopicId(e.target.value)}
                        style={styles.formSelect}
                      >
                        <option value="">None (Independent Draft)</option>
                        {topicsList.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={styles.formLabel}>Due Date</label>
                      <input
                        type="date"
                        value={newPlanDueDate}
                        onChange={e => setNewPlanDueDate(e.target.value)}
                        style={styles.formInput}
                      />
                    </div>

                    <button onClick={handleCreateContentPlan} style={styles.submitBtn}>
                      <Plus size={16} />
                      <span>Add to Calendar</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 2: Topical Authority Map */}
            {contentSubTab === 'topics' && (
              <div style={styles.contentPlannerGrid}>
                {/* Topic Map List */}
                <div style={{ flex: 2 }}>
                  <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ ...styles.cardTitle, marginBottom: '1.25rem' }}>Topical Authority Structure</h3>
                    {topicsList.length === 0 ? (
                      <div style={styles.emptyState}>
                        <p>No topical hubs established yet. Create parent topics on the right to build visual clusters!</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {topicsList.filter(t => !t.parentId).map(parent => (
                          <div key={parent.id} style={styles.topicClusterCard}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.6rem', marginBottom: '0.8rem' }}>
                              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'var(--font-outfit)' }}>{parent.name}</span>
                              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {parent.keywords?.map((k: string) => (
                                  <span key={k} style={styles.topicKeywordTag}>{k}</span>
                                ))}
                              </div>
                            </div>

                            {/* Subtopics */}
                            <div style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', borderLeft: '2px solid rgba(99, 102, 241, 0.15)' }}>
                              {topicsList.filter(t => t.parentId === parent.id).length === 0 ? (
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No sub-topics created. Add one on the right with this parent selected.</span>
                              ) : (
                                topicsList.filter(t => t.parentId === parent.id).map(child => (
                                  <div key={child.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                      <ChevronRight size={12} color="var(--accent-secondary)" />
                                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{child.name}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                                      {child.keywords?.map((k: string) => (
                                        <span key={k} style={styles.topicKeywordTagSecondary}>{k}</span>
                                      ))}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Create Topic Form */}
                <div style={{ flex: 1 }}>
                  <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={styles.cardTitle}>Add Topic Entity</h3>
                    
                    <div>
                      <label style={styles.formLabel}>Topic Name</label>
                      <input
                        type="text"
                        value={newTopicName}
                        onChange={e => setNewTopicName(e.target.value)}
                        placeholder="e.g. Technical Audit"
                        style={styles.formInput}
                      />
                    </div>
                    
                    <div>
                      <label style={styles.formLabel}>Associated Keywords (comma separated)</label>
                      <input
                        type="text"
                        value={newTopicKeywords}
                        onChange={e => setNewTopicKeywords(e.target.value)}
                        placeholder="e.g. core web vitals, speed"
                        style={styles.formInput}
                      />
                    </div>

                    <div>
                      <label style={styles.formLabel}>Parent Authority Group</label>
                      <select
                        value={newTopicParentId}
                        onChange={e => setNewTopicParentId(e.target.value)}
                        style={styles.formSelect}
                      >
                        <option value="">None (Is Parent Topic)</option>
                        {topicsList.filter(t => !t.parentId).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <button onClick={handleCreateTopic} style={styles.submitBtn}>
                      <Plus size={16} />
                      <span>Establish Topic Hub</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 2.5: Keyword Research & Clustering */}
            {contentSubTab === 'research' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
                {/* Switcher for Research Sub-tabs */}
                <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.75rem' }}>
                  <button
                    onClick={() => setResearchSubTab('single')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: researchSubTab === 'single' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: researchSubTab === 'single' ? 600 : 500,
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      paddingBottom: '0.25rem',
                      borderBottom: researchSubTab === 'single' ? '2px solid var(--accent-primary)' : 'none'
                    }}
                  >
                    <Search size={14} />
                    <span>Keyword Research (Single)</span>
                  </button>
                  <button
                    onClick={() => setResearchSubTab('clustering')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: researchSubTab === 'clustering' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: researchSubTab === 'clustering' ? 600 : 500,
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      paddingBottom: '0.25rem',
                      borderBottom: researchSubTab === 'clustering' ? '2px solid var(--accent-primary)' : 'none'
                    }}
                  >
                    <Sparkles size={14} />
                    <span>Keyword Clustering (Bulk)</span>
                  </button>
                  <button
                    onClick={() => {
                      setResearchSubTab('gap');
                      handleFetchCompetitorGap();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: researchSubTab === 'gap' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: researchSubTab === 'gap' ? 600 : 500,
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      paddingBottom: '0.25rem',
                      borderBottom: researchSubTab === 'gap' ? '2px solid var(--accent-primary)' : 'none'
                    }}
                  >
                    <TrendingUp size={14} />
                    <span>Competitor Gap Analysis</span>
                  </button>
                </div>

                {/* Sub-tab A: Keyword Research (Single) */}
                {researchSubTab === 'single' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                      <h3 style={{ ...styles.cardTitle, marginBottom: '0.5rem' }}>Keyword Research (Keyword Universe)</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                        Search for a target search query to check its estimated search volume, CPC, intent classification, and SERP positions.
                      </p>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={keywordResearchInput}
                          onChange={e => setKeywordResearchInput(e.target.value)}
                          placeholder="Enter keyword (e.g. ai writing tools, best cloud storage)..."
                          style={{ ...styles.formInput, flex: 1, margin: 0 }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleResearchKeyword();
                          }}
                        />
                        <button
                          onClick={handleResearchKeyword}
                          disabled={isResearchingKeyword}
                          style={{
                            background: 'var(--accent-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.6rem 1.5rem',
                            cursor: 'pointer',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          {isResearchingKeyword ? (
                            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <Search size={16} />
                          )}
                          <span>Research</span>
                        </button>
                      </div>
                    </div>

                    {keywordResearchResult && (
                      <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
                        {/* Keyword Metrics */}
                        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                          <h4 style={{ ...styles.cardTitle, fontSize: '1rem' }}>Metrics for &quot;{keywordResearchResult.keyword}&quot;</h4>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Search Volume</span>
                              <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                                {keywordResearchResult.searchVolume?.toLocaleString() || '0'} /mo
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>CPC (USD)</span>
                              <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                                ${keywordResearchResult.cpc?.toFixed(2) || '0.00'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Search Intent</span>
                              <span style={{
                                fontSize: '0.75rem',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontWeight: 600,
                                textTransform: 'capitalize',
                                background:
                                  keywordResearchResult.intent === 'transactional'
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : keywordResearchResult.intent === 'commercial'
                                    ? 'rgba(168, 85, 247, 0.15)'
                                    : keywordResearchResult.intent === 'navigational'
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : 'rgba(59, 130, 246, 0.15)',
                                color:
                                  keywordResearchResult.intent === 'transactional'
                                    ? 'var(--accent-green)'
                                    : keywordResearchResult.intent === 'commercial'
                                    ? 'var(--accent-secondary)'
                                    : keywordResearchResult.intent === 'navigational'
                                    ? 'var(--accent-orange)'
                                    : 'var(--accent-primary)'
                              }}>
                                {keywordResearchResult.intent || 'Informational'}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
                            <button
                              onClick={() => handleTrackKeywordDirectly(keywordResearchResult.keyword)}
                              style={{
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-primary)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '0.5rem',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                width: '100%'
                              }}
                            >
                              Track in Rank Tracker
                            </button>
                            <button
                              onClick={() => {
                                setContentSubTab('calendar');
                                setNewPlanTitle(`Guide to ${keywordResearchResult.keyword.charAt(0).toUpperCase() + keywordResearchResult.keyword.slice(1)}`);
                                setNewPlanPrimaryKeyword(keywordResearchResult.keyword);
                              }}
                              style={{
                                background: 'var(--accent-primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                padding: '0.5rem',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                width: '100%'
                              }}
                            >
                              Create Content Plan
                            </button>
                          </div>
                        </div>

                        {/* SERP Results */}
                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                          <h4 style={{ ...styles.cardTitle, fontSize: '1rem', marginBottom: '1rem' }}>Top 10 Google SERP Results</h4>
                          
                          {(!keywordResearchResult.results || keywordResearchResult.results.length === 0) ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>No SERP records returned.</p>
                          ) : (
                            <div style={styles.tableWrapper}>
                              <table style={styles.table}>
                                <thead>
                                  <tr style={styles.trHead}>
                                    <th style={{ ...styles.th, width: '60px', textAlign: 'center' }}>Rank</th>
                                    <th style={{ ...styles.th, textAlign: 'left' }}>Page Details</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {keywordResearchResult.results.map((r: any) => (
                                    <tr key={r.rank} style={styles.trBody}>
                                      <td style={{ ...styles.td, textAlign: 'center', fontWeight: 600, color: 'var(--accent-primary)' }}>
                                        #{r.rank}
                                      </td>
                                      <td style={{ ...styles.td, textAlign: 'left' }}>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{r.title}</div>
                                        <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-secondary)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}>
                                          <span>{r.url}</span>
                                          <ExternalLink size={10} />
                                        </a>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-tab B: Keyword Clustering */}
                {researchSubTab === 'clustering' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                      <h3 style={{ ...styles.cardTitle, marginBottom: '0.5rem' }}>Keyword Clustering (Hub Builder)</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                        Input multiple search terms (one per line) to group them into clusters based on SERP overlap. Establish these groups directly as topical hubs.
                      </p>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <textarea
                          rows={6}
                          value={keywordClusteringInput}
                          onChange={e => setKeywordClusteringInput(e.target.value)}
                          placeholder="Enter keywords here (e.g.&#13;ai writing tools&#13;best ai copywriter&#13;local seo tips&#13;google ranking guide)..."
                          style={{
                            ...styles.formInput,
                            width: '100%',
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            resize: 'vertical'
                          }}
                        />
                        <button
                          onClick={handleClusterKeywords}
                          disabled={isClusteringKeywords}
                          style={{
                            background: 'var(--accent-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.6rem 1.5rem',
                            cursor: 'pointer',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            alignSelf: 'flex-start'
                          }}
                        >
                          {isClusteringKeywords ? (
                            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <Sparkles size={16} />
                          )}
                          <span>Cluster Keywords</span>
                        </button>
                      </div>
                    </div>

                    {keywordClusteringResult.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <h4 style={{ ...styles.cardTitle, fontSize: '1rem' }}>Clustered Topic Suggestions</h4>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                          {keywordClusteringResult.map((cluster: any, idx: number) => (
                            <div key={idx} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                  <h5 style={{ ...styles.cardTitle, fontSize: '0.95rem', margin: 0 }}>
                                    Cluster: {cluster.name}
                                  </h5>
                                  <span style={{
                                    fontSize: '0.7rem',
                                    padding: '0.15rem 0.4rem',
                                    borderRadius: '4px',
                                    fontWeight: 600,
                                    textTransform: 'capitalize',
                                    background: 'rgba(168, 85, 247, 0.15)',
                                    color: 'var(--accent-secondary)'
                                  }}>
                                    {cluster.intent || 'Commercial'}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                                  {cluster.keywords?.map((kw: string, kwIdx: number) => (
                                    <span key={kwIdx} style={{
                                      fontSize: '0.75rem',
                                      padding: '0.15rem 0.4rem',
                                      background: 'rgba(255,255,255,0.04)',
                                      border: '1px solid rgba(255,255,255,0.08)',
                                      borderRadius: '4px',
                                      color: 'var(--text-primary)'
                                    }}>
                                      {kw}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                                <button
                                  onClick={() => handleCreateTopicFromCluster(cluster.name, cluster.keywords)}
                                  style={{
                                    flex: 1,
                                    background: 'rgba(99, 102, 241, 0.15)',
                                    color: 'var(--accent-primary)',
                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '0.4rem 0.75rem',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '0.8rem'
                                  }}
                                >
                                  Establish Topic Hub
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-tab C: Competitor Content Gap */}
                {researchSubTab === 'gap' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <h3 style={{ ...styles.cardTitle, marginBottom: '0.5rem' }}>Competitor Content Gap Analysis</h3>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Find keywords where your competitors rank in the top 10 positions, but your project is ranking poorly (&gt; 10) or not ranking at all.
                          </p>
                        </div>
                        <button
                          onClick={handleFetchCompetitorGap}
                          disabled={isLoadingCompetitorGap}
                          style={{
                            background: 'var(--accent-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.6rem 1.5rem',
                            cursor: 'pointer',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          {isLoadingCompetitorGap ? (
                            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <RefreshCw size={16} />
                          )}
                          <span>Run Analysis</span>
                        </button>
                      </div>
                    </div>

                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                      <h4 style={{ ...styles.cardTitle, fontSize: '1rem', marginBottom: '1.25rem' }}>Content Gap Opportunities</h4>
                      
                      {isLoadingCompetitorGap ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
                        </div>
                      ) : competitorGapResult.length === 0 ? (
                        <div style={styles.emptyState}>
                          <p>No content gaps detected. Click &quot;Run Analysis&quot; to query competitor data from ClickHouse.</p>
                        </div>
                      ) : (
                        <div style={styles.tableWrapper}>
                          <table style={styles.table}>
                            <thead>
                              <tr style={styles.trHead}>
                                <th style={{ ...styles.th, textAlign: 'left' }}>Target Keyword</th>
                                <th style={{ ...styles.th, textAlign: 'left' }}>Competitor Domain</th>
                                <th style={{ ...styles.th, textAlign: 'center' }}>Competitor Rank</th>
                                <th style={{ ...styles.th, textAlign: 'center' }}>Our Rank</th>
                                <th style={{ ...styles.th, textAlign: 'center' }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {competitorGapResult.map((item: any, idx: number) => (
                                <tr key={idx} style={styles.trBody}>
                                  <td style={{ ...styles.tdKeyword, textAlign: 'left' }}>{item.keyword}</td>
                                  <td style={{ ...styles.td, textAlign: 'left', color: 'var(--text-secondary)' }}>{item.competitorDomain}</td>
                                  <td style={{ ...styles.td, textAlign: 'center' }}>
                                    <span style={{
                                      background: 'rgba(245, 158, 11, 0.12)',
                                      color: 'var(--accent-orange)',
                                      fontWeight: 600,
                                      padding: '0.15rem 0.4rem',
                                      borderRadius: '4px',
                                      fontSize: '0.8rem'
                                    }}>
                                      #{item.competitorRank}
                                    </span>
                                  </td>
                                  <td style={{ ...styles.td, textAlign: 'center', color: 'var(--text-muted)' }}>
                                    {item.ownRank ? `#${item.ownRank}` : 'Unranked'}
                                  </td>
                                  <td style={{ ...styles.td, textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                      <button
                                        onClick={() => handleTrackKeywordDirectly(item.keyword)}
                                        style={{
                                          background: 'rgba(255,255,255,0.04)',
                                          border: '1px solid rgba(255,255,255,0.08)',
                                          color: 'var(--text-primary)',
                                          borderRadius: 'var(--radius-sm)',
                                          padding: '0.3rem 0.6rem',
                                          fontSize: '0.75rem',
                                          fontWeight: 500,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Track
                                      </button>
                                      <button
                                        onClick={() => {
                                          setContentSubTab('calendar');
                                          setNewPlanTitle(`Guide to ${item.keyword.charAt(0).toUpperCase() + item.keyword.slice(1)}`);
                                          setNewPlanPrimaryKeyword(item.keyword);
                                        }}
                                        style={{
                                          background: 'var(--accent-primary)',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: 'var(--radius-sm)',
                                          padding: '0.3rem 0.6rem',
                                          fontSize: '0.75rem',
                                          fontWeight: 600,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Plan Article
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 3: AI SEO Editor & Real-time Optimizer */}
            {contentSubTab === 'editor' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                {/* Selector Header if no plan chosen */}
                {!selectedPlanId ? (
                  <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
                    <h3 style={{ ...styles.cardTitle, marginBottom: '0.5rem' }}>Select a Content Draft to Write</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                      Choose one of your scheduled content pieces from the list below to begin optimizing.
                    </p>
                    <select
                      value={selectedPlanId || ''}
                      onChange={e => {
                        setSelectedPlanId(e.target.value);
                        const plan = contentPlansList.find(p => p.id === e.target.value);
                        setEditorBody(plan ? plan.body || '' : '');
                        if (e.target.value) fetchBriefForPlan(e.target.value);
                      }}
                      style={{ ...styles.formSelect, maxWidth: '400px', margin: '0 auto' }}
                    >
                      <option value="">-- Choose Content Plan --</option>
                      {contentPlansList.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  // Workspace is Active
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Back header bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                          onClick={() => setSelectedPlanId(null)}
                          style={{ ...styles.openEditorBtn, background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}
                        >
                          <ArrowLeft size={14} />
                          <span>Select different draft</span>
                        </button>
                        <h3 style={{ ...styles.cardTitle, margin: 0 }}>{currentPlan?.title}</h3>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {currentPlan?.status === 'published' ? (
                          <>
                            {currentPlan.publishUrl && (
                              <a
                                href={currentPlan.publishUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.8rem',
                                  color: 'var(--accent-green)',
                                  textDecoration: 'none',
                                  background: 'rgba(16,185,129,0.1)',
                                  padding: '0.4rem 0.8rem',
                                  borderRadius: '6px',
                                  fontWeight: 600,
                                  border: '1px solid rgba(16,185,129,0.2)',
                                }}
                              >
                                <Globe size={14} />
                                <span>Live URL</span>
                              </a>
                            )}
                            <button
                              onClick={() => handleRefreshContent(currentPlan.id)}
                              style={{
                                padding: '0.4rem 0.8rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                borderRadius: '6px',
                                color: 'var(--accent-red)',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              <RefreshCw size={14} />
                              <span>Re-optimize</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              if (currentPlan) {
                                setPublishingPlanId(currentPlan.id);
                                setPublishUrlStr('');
                                setShowPublishModal(true);
                              }
                            }}
                            style={{
                              padding: '0.4rem 0.8rem',
                              background: 'linear-gradient(135deg, var(--accent-secondary), #06b6d4)',
                              border: 'none',
                              borderRadius: '6px',
                              color: '#fff',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              boxShadow: '0 4px 12px rgba(6,182,212,0.15)',
                            }}
                          >
                            <Globe size={14} />
                            <span>Publish Live</span>
                          </button>
                        )}
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Target: <strong style={{ color: 'var(--text-primary)' }}>{currentPlan?.primaryKeyword}</strong>
                        </span>
                      </div>
                    </div>

                    {/* ClickHouse GSC Performance Stats Card Dashboard */}
                    {currentPlan?.status === 'published' && (
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', width: '100%' }}>
                        {/* Clicks */}
                        <div className="glass-card" style={{ flex: 1, minWidth: '150px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>30d Clicks (GSC)</span>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {performanceData?.recent?.clicks ?? 0}
                            </span>
                            {performanceData?.hasData && (
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: (performanceData.recent.clicks >= performanceData.historic.clicks) ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                {performanceData.recent.clicks >= performanceData.historic.clicks ? '▲' : '▼'}{' '}
                                {Math.abs(performanceData.recent.clicks - performanceData.historic.clicks)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Impressions */}
                        <div className="glass-card" style={{ flex: 1, minWidth: '150px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>30d Impressions</span>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {performanceData?.recent?.impressions ?? 0}
                            </span>
                            {performanceData?.hasData && (
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: (performanceData.recent.impressions >= performanceData.historic.impressions) ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                {performanceData.recent.impressions >= performanceData.historic.impressions ? '▲' : '▼'}{' '}
                                {Math.abs(performanceData.recent.impressions - performanceData.historic.impressions)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* CTR */}
                        <div className="glass-card" style={{ flex: 1, minWidth: '150px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Average CTR</span>
                          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {performanceData?.recent?.ctr ? `${(performanceData.recent.ctr * 100).toFixed(2)}%` : '0.00%'}
                          </div>
                        </div>

                        {/* Position */}
                        <div className="glass-card" style={{ flex: 1, minWidth: '150px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Average Position</span>
                          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {performanceData?.recent?.position ? performanceData.recent.position.toFixed(1) : '0.0'}
                          </div>
                        </div>

                        {/* Primary Rank */}
                        <div className="glass-card" style={{ flex: 1, minWidth: '150px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Keyword Rank</span>
                          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                            {performanceData?.primaryKeywordRank ? `#${performanceData.primaryKeywordRank}` : 'Not Ranked'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Active work deck */}
                    <div style={styles.editorWorkspaceGrid}>
                      {/* Left: AI SEO Brief */}
                      <div style={styles.editorColBrief}>
                        <div className="glass-card" style={{ padding: '1.25rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <h3 style={styles.cardTitle}>AI Content Brief</h3>
                          
                          {!brief ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '2rem 1rem', textAlign: 'center' }}>
                              <FileText size={32} color="var(--text-muted)" />
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No AI Content Brief has been created for this topic yet.</p>
                              <button
                                onClick={handleGenerateBrief}
                                disabled={isGeneratingBrief}
                                style={styles.submitBtn}
                              >
                                {isGeneratingBrief ? (
                                  <>
                                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                    <span>Generating Brief...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles size={14} />
                                    <span>Generate AI Brief</span>
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', flex: 1 }}>
                              {/* Word Count Indicator */}
                              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Suggested Word Count</span>
                                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-secondary)', marginTop: '0.1rem' }}>
                                  {brief.targetWordCount}+ words
                                </div>
                              </div>

                              {/* Target Headings */}
                              <div>
                                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>AI Outline Structure</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                  {brief.outline?.map((item: any, idx: number) => {
                                    let isH2 = false;
                                    let isH3 = false;
                                    let cleanText = '';
                                    let cleanTag = 'H1';

                                    if (typeof item === 'object' && item !== null) {
                                      const lvl = (item.level || '').toLowerCase();
                                      isH2 = lvl === 'h2';
                                      isH3 = lvl === 'h3';
                                      cleanText = item.heading || '';
                                      cleanTag = lvl.toUpperCase() || 'H1';
                                    } else if (typeof item === 'string') {
                                      isH2 = item.toLowerCase().startsWith('h2:');
                                      isH3 = item.toLowerCase().startsWith('h3:');
                                      cleanText = item.replace(/^[hH][23]:\s*/, '');
                                      cleanTag = isH2 ? 'H2' : isH3 ? 'H3' : 'H1';
                                    } else {
                                      return null;
                                    }
                                    
                                    return (
                                      <div key={idx} style={{ 
                                        display: 'flex', 
                                        alignItems: 'baseline', 
                                        gap: '0.4rem', 
                                        paddingLeft: isH3 ? '1rem' : '0px',
                                        fontSize: '0.8rem'
                                      }}>
                                        <span style={{ 
                                          fontSize: '0.65rem', 
                                          fontWeight: 700, 
                                          background: isH2 ? 'rgba(99,102,241,0.1)' : 'rgba(168,85,247,0.1)', 
                                          color: isH2 ? 'var(--accent-primary)' : 'var(--accent-secondary)',
                                          padding: '0.05rem 0.25rem',
                                          borderRadius: '3px'
                                        }}>{cleanTag}</span>
                                        <span style={{ color: 'var(--text-secondary)' }}>{cleanText}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Competitor Strategy */}
                              <div>
                                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Competitor Analysis</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  {brief.competitorOutlines?.map((comp: any, idx: number) => (
                                    <div key={idx} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.01)', borderRadius: '4px', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.15rem' }}>{comp.domain || `Competitor ${idx+1}`}</div>
                                      <div>Headings found: {comp.headingsCount || 0} (Word count: ~{comp.avgWordCount || 1800})</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Center: Live Editor */}
                      <div style={styles.editorColMain}>
                        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={styles.cardTitle}>Editor Draft</h3>
                            {isOptimizing && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--accent-secondary)' }}>
                                <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                                <span>Analyzing SEO...</span>
                              </div>
                            )}
                          </div>
                          
                          <textarea
                            value={editorBody}
                            onChange={e => setEditorBody(e.target.value)}
                            placeholder="# Write your Markdown article here...&#10;&#10;Use headings matching the AI brief and sprinkle keywords naturally."
                            style={styles.editorTextArea}
                          />
                        </div>
                      </div>

                      {/* Right: SEO Score & Recommendations */}
                      <div style={styles.editorColSidebar}>
                        <div className="glass-card" style={{ padding: '1.25rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                          <h3 style={styles.cardTitle}>SEO Scorecard</h3>
                          
                          {/* Radial Progress Score */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem 0' }}>
                            <div style={{
                              width: '100px',
                              height: '100px',
                              borderRadius: '50%',
                              background: `conic-gradient(${
                                (optimizationResult?.score || 0) > 70 ? 'var(--accent-green)' : (optimizationResult?.score || 0) > 45 ? 'var(--accent-orange)' : 'var(--accent-red)'
                              } ${(optimizationResult?.score || 0) * 3.6}deg, rgba(255,255,255,0.03) 0deg)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: 'inset 0 0 15px rgba(0,0,0,0.5), 0 0 20px rgba(99,102,241,0.05)',
                              position: 'relative'
                            }}>
                              {/* Inner mask */}
                              <div style={{
                                width: '82px',
                                height: '82px',
                                borderRadius: '50%',
                                backgroundColor: '#0a0d16',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {optimizationResult?.score || 0}
                                </span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  SEO Grade
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.4rem' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Word Count:</span>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {optimizationResult?.word_count || 0} / {brief?.targetWordCount || 1000}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.4rem' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Keyword Density:</span>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {optimizationResult?.primary_keyword_density?.toFixed(2) || '0.00'}%
                              </span>
                            </div>
                          </div>

                          {/* Actionable Suggestions */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', flex: 1 }}>
                            <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Optimization Checklist</h4>
                            
                            {!optimizationResult || optimizationResult.suggestions?.length === 0 ? (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Start writing to view specific recommendations.
                              </span>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {optimizationResult.suggestions.map((sug: string, idx: number) => {
                                  const isPerfect = sug.includes('✓') || sug.includes('Perfect');
                                  
                                  return (
                                    <div key={idx} style={styles.suggestionItem}>
                                      {isPerfect ? (
                                        <CheckCircle2 size={12} color="var(--accent-green)" style={{ marginTop: '2px', flexShrink: 0 }} />
                                      ) : (
                                        <AlertCircle size={12} color="var(--accent-orange)" style={{ marginTop: '2px', flexShrink: 0 }} />
                                      )}
                                      <span style={{ color: isPerfect ? 'var(--text-muted)' : 'var(--text-secondary)' }}>{sug}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Internal Link Suggestions */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                              <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Link2 size={12} color="var(--accent-primary)" />
                                <span>Internal Link Builder</span>
                              </h4>
                              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                                Improve topical authority by linking to these relevant published pages:
                              </p>
                              {getInternalLinkSuggestions().length === 0 ? (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                  No published pages in this topic hub yet.
                                </span>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  {getInternalLinkSuggestions().map((link, idx) => (
                                    <div key={idx} style={{ padding: '0.5rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }} title={link.title}>
                                          {link.title}
                                        </span>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--accent-secondary)', background: 'rgba(6,182,212,0.1)', padding: '0.1rem 0.3rem', borderRadius: '3px', fontWeight: 600 }}>
                                          {link.reason}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Anchor: &quot;{link.keyword}&quot;</span>
                                        <a href={link.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
                                          Copy Link
                                        </a>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Site Audit Tab */}
        {activeTab === 'audit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
            {/* Header / Trigger Audit */}
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={styles.cardTitle}>Kiểm tra Tối ưu Kỹ thuật (Technical SEO Audit)</h2>
                <p style={styles.cardSubtitle}>
                  Chạy trình thu thập và phát hiện các lỗi technical SEO trên website <strong style={{ color: 'var(--accent-primary)' }}>{selectedSite}</strong>
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {isCrawling && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--accent-secondary)' }}>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>{crawlStatusText || 'Đang quét website...'}</span>
                  </div>
                )}
                <button
                  onClick={handleTriggerCrawl}
                  disabled={isCrawling || !activeSite}
                  className="shine-button"
                  style={{
                    ...styles.submitBtn,
                    marginTop: 0,
                    opacity: (isCrawling || !activeSite) ? 0.6 : 1,
                    cursor: (isCrawling || !activeSite) ? 'not-allowed' : 'pointer',
                    background: 'var(--accent-primary)',
                    padding: '0.6rem 1.2rem',
                  }}
                >
                  <Search size={16} />
                  <span>{isCrawling ? 'Đang thực hiện...' : 'Kích hoạt Audit'}</span>
                </button>
              </div>
            </div>

            {/* Health & Crawl Metrics */}
            <div style={styles.metricsGrid}>
              <div className="glass-card" style={styles.metricCard}>
                <div style={styles.metricHeader}>
                  <span style={styles.metricLabel}>Điểm Sức Khỏe (Health Score)</span>
                  <div style={styles.metricIconWrap}>
                    <Activity size={16} color="var(--accent-green)" />
                  </div>
                </div>
                <div style={styles.metricBody}>
                  <span style={styles.metricValue}>
                    {recs.length === 0 ? '98%' : `${Math.max(50, 100 - recs.filter(r => r.status !== 'completed').length * 6)}%`}
                  </span>
                  <span style={{ ...styles.metricChange, color: 'var(--accent-green)' }}>
                    Ổn định
                  </span>
                </div>
              </div>

              <div className="glass-card" style={styles.metricCard}>
                <div style={styles.metricHeader}>
                  <span style={styles.metricLabel}>Đã Quét (Pages Crawled)</span>
                  <div style={styles.metricIconWrap}>
                    <Globe size={16} color="var(--accent-primary)" />
                  </div>
                </div>
                <div style={styles.metricBody}>
                  <span style={styles.metricValue}>12 / 100</span>
                  <span style={{ ...styles.metricChange, color: 'var(--text-muted)' }}>
                    Trang hoạt động
                  </span>
                </div>
              </div>

              <div className="glass-card" style={styles.metricCard}>
                <div style={styles.metricHeader}>
                  <span style={styles.metricLabel}>Số Lỗi Phát Hiện (Issues)</span>
                  <div style={styles.metricIconWrap}>
                    <AlertCircle size={16} color="var(--accent-orange)" />
                  </div>
                </div>
                <div style={styles.metricBody}>
                  <span style={styles.metricValue}>
                    {recs.filter(r => r.status !== 'completed').length} Lỗi
                  </span>
                  <span style={{ ...styles.metricChange, color: 'var(--accent-orange)' }}>
                    Cần tối ưu
                  </span>
                </div>
              </div>
            </div>

            {/* Audit Issues Details */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ ...styles.cardHeader, marginBottom: '1.25rem' }}>
                <h3 style={styles.cardTitle}>Danh sách Lỗi Technical SEO & Kiến nghị</h3>
                <p style={styles.cardSubtitle}>Được sắp xếp theo độ ưu tiên và ảnh hưởng tới SEO</p>
              </div>

              {recs.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>Không phát hiện lỗi technical nào trên website của bạn. Website của bạn hoàn toàn tối ưu!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {recs.map((act) => {
                    const isCompleted = act.status === 'completed';
                    const pri = getPriorityDetails(act.priority);
                    const indicatorColor = isCompleted ? 'var(--accent-secondary)' : pri.color;
                    
                    return (
                      <div 
                        key={act.id} 
                        style={{ 
                          ...styles.actionItem, 
                          ...(isCompleted ? { opacity: 0.55 } : {}),
                          display: 'flex',
                          background: 'rgba(255, 255, 255, 0.01)',
                          border: '1px solid rgba(255, 255, 255, 0.04)',
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden'
                        }}
                      >
                        <div style={{ ...styles.actionLeftIndicator, width: '4px', background: indicatorColor }} />
                        <div style={{ ...styles.actionBody, padding: '1rem', flex: 1 }}>
                          <div style={{ ...styles.actionHeaderRow, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span 
                              style={{ 
                                ...styles.actionTitle, 
                                fontSize: '0.95rem',
                                fontWeight: 600,
                                ...(isCompleted ? { textDecoration: 'line-through', color: 'var(--text-muted)' } : { color: 'var(--text-primary)' }) 
                              }}
                            >
                              {act.title}
                            </span>
                            <span style={{ ...styles.badgeImpact, fontSize: '0.75rem', padding: '0.1rem 0.4rem', border: '1px solid', borderRadius: '4px', color: indicatorColor, borderColor: indicatorColor }}>
                              {isCompleted ? 'Hoàn thành' : `${act.impactScore || 0} Ảnh hưởng`}
                            </span>
                          </div>
                          <p style={{ ...styles.actionDesc, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                            {act.description}
                          </p>
                          <div style={{ ...styles.actionFooterRow, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ ...styles.actionTypeTag, fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              {isCompleted ? 'Đã khắc phục ✓' : `Mức độ: ${act.priority.toUpperCase()}`}
                            </span>
                            <button 
                              onClick={() => {
                                setSelectedRecForDetail(act);
                                setRecAssigneeId(act.assigneeId || '');
                                setRecInternalNotes(act.internalNotes || '');
                                setRecClientNotes(act.clientNotes || '');
                              }}
                              style={{ 
                                ...styles.actionBtnOptimize, 
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                fontSize: '0.8rem',
                                color: indicatorColor,
                                fontWeight: isCompleted ? 500 : 600
                              }}
                            >
                              <span>{isCompleted ? 'Xem Chi Tiết' : 'Sửa lỗi ngay / Phân công'}</span>
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rank Tracker Tab */}
        {activeTab === 'keywords' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
            {/* Keyword Addition Form */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h2 style={{ ...styles.cardTitle, marginBottom: '1rem' }}>Theo dõi Từ khóa (Track New Keywords)</h2>
              
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <label style={{ ...styles.formLabel, display: 'block', marginBottom: '0.4rem' }}>Từ khóa tìm kiếm (Keyword)*</label>
                  <input
                    type="text"
                    value={newKeywordInput}
                    onChange={e => setNewKeywordInput(e.target.value)}
                    placeholder="Ví dụ: công cụ seo ai, rank tracker..."
                    style={styles.formInput}
                  />
                </div>

                <div style={{ flex: 1, minWidth: '240px' }}>
                  <label style={{ ...styles.formLabel, display: 'block', marginBottom: '0.4rem' }}>URL Đích mong muốn (Target URL)</label>
                  <input
                    type="text"
                    value={newKeywordTargetUrl}
                    onChange={e => setNewKeywordTargetUrl(e.target.value)}
                    placeholder="Ví dụ: https://domain.com/blog/seo"
                    style={styles.formInput}
                  />
                </div>

                <button
                  onClick={handleAddKeyword}
                  disabled={isAddingKeyword}
                  style={{
                    ...styles.submitBtn,
                    marginTop: 0,
                    padding: '0.6rem 1.5rem',
                    background: 'var(--accent-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {isAddingKeyword ? (
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Plus size={16} />
                  )}
                  <span>Thêm Từ Khóa</span>
                </button>
              </div>
            </div>

            {/* Keyword Table Card */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ ...styles.cardHeader, marginBottom: '1.25rem' }}>
                <h3 style={styles.cardTitle}>Danh sách Từ khóa đang theo dõi</h3>
                <p style={styles.cardSubtitle}>Theo dõi vị trí thực tế trên Google Search Engine thu thập qua ClickHouse</p>
              </div>

              {keywordsList.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>Chưa có từ khóa nào được theo dõi. Hãy nhập từ khóa ở phía trên để hệ thống bắt đầu giám sát thứ hạng!</p>
                </div>
              ) : (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.trHead}>
                        <th style={{ ...styles.th, textAlign: 'left' }}>Từ khóa</th>
                        <th style={{ ...styles.th, textAlign: 'left' }}>Target URL</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>Thứ hạng (Rank)</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>Lượng Tìm kiếm (Vol)</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>Độ khó (KD)</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keywordsList.map((kw: any) => {
                        const rankVal = kw.latestRank;
                        const hasRank = rankVal !== null && rankVal !== undefined && rankVal > 0;
                        
                        return (
                          <tr key={kw.id} style={styles.trBody}>
                            <td style={{ ...styles.tdKeyword, textAlign: 'left' }}>{kw.keyword}</td>
                            <td style={{ ...styles.td, textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              {kw.targetUrl || <span style={{ fontStyle: 'italic' }}>Tự động phát hiện</span>}
                            </td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              <span style={{
                                ...styles.badgePosition,
                                background: hasRank && rankVal <= 3 ? 'rgba(16, 185, 129, 0.15)' : hasRank && rankVal <= 10 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                color: hasRank && rankVal <= 3 ? 'var(--accent-green)' : hasRank && rankVal <= 10 ? 'var(--accent-primary)' : 'var(--text-primary)',
                                fontWeight: 600,
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.85rem'
                              }}>
                                {hasRank ? `#${rankVal}` : 'Đang quét...'}
                              </span>
                            </td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              {kw.volume ? kw.volume.toLocaleString() : 'N/A'}
                            </td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              {kw.difficulty ? (
                                <span style={{
                                  color: kw.difficulty > 60 ? 'var(--accent-red)' : kw.difficulty > 35 ? 'var(--accent-orange)' : 'var(--accent-green)',
                                  fontWeight: 500
                                }}>
                                  {kw.difficulty}%
                                </span>
                              ) : 'N/A'}
                            </td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              <button
                                onClick={() => handleDeleteKeyword(kw.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--accent-red)',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                Xóa
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', width: '100%', alignItems: 'start' }}>
            {/* Create Report Card */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ ...styles.cardTitle, marginBottom: '1rem' }}>Tạo Báo Cáo SEO</h3>
              <form onSubmit={handleCreateReport} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={styles.formLabel}>Tiêu đề báo cáo</label>
                  <input
                    type="text"
                    value={newReportTitle}
                    onChange={e => setNewReportTitle(e.target.value)}
                    placeholder="Ví dụ: Báo cáo SEO Q3 2026"
                    style={styles.formInput}
                    required
                  />
                </div>
                <div>
                  <label style={styles.formLabel}>Loại báo cáo</label>
                  <select
                    value={newReportType}
                    onChange={e => setNewReportType(e.target.value)}
                    style={styles.formInput}
                  >
                    <option value="audit">Site Audit (Kiểm toán kỹ thuật)</option>
                    <option value="keywords">Rank Tracker (Thứ hạng từ khóa)</option>
                  </select>
                </div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)'
                }}>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Thông tin White-label:</p>
                  <p>• Logo: {activeSite?.domain || 'Mavryk Logo'}</p>
                  <p>• Màu chủ đạo: Indigo / Teal</p>
                </div>
                <button
                  type="submit"
                  style={{ ...styles.submitBtn, width: '100%', marginTop: '0.5rem' }}
                >
                  Tạo Báo Cáo ngay
                </button>
              </form>
            </div>

            {/* Reports List Card */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ ...styles.cardTitle, marginBottom: '1rem' }}>Lịch sử Báo Cáo</h3>
              {reportsList.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>Chưa có báo cáo nào được tạo cho dự án này.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Tiêu đề</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Loại</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Trạng thái</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Ngày tạo</th>
                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportsList.map((rep) => (
                        <tr key={rep.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)', color: 'var(--text-primary)' }}>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{rep.title}</td>
                          <td style={{ padding: '0.75rem 0.5rem', textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--accent-secondary)' }}>{rep.type}</td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <span style={{
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: 'var(--accent-green)',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 700
                            }}>
                              {rep.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>
                            {new Date(rep.createdAt).toLocaleDateString('vi-VN')}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                            <button
                              onClick={() => setSelectedReport(rep)}
                              style={{
                                background: 'rgba(99, 102, 241, 0.1)',
                                border: '1px solid var(--accent-primary)',
                                color: 'var(--accent-primary)',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                            >
                              Xem Báo Cáo
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Backlinks Tab */}
        {activeTab === 'backlinks' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', width: '100%', textAlign: 'center' }}>
            <div className="glass-card" style={{ padding: '3rem', maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                color: 'var(--accent-primary)',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)'
              }}>
                <Link2 size={32} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Tính Năng Đang Phát Triển</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Hệ thống phân tích liên kết (Backlink Analysis) đang được phát triển. Tính năng này sẽ cho phép theo dõi, kiểm tra chất lượng backlink và lập chỉ mục liên kết tự động.
                </p>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.8rem',
                color: 'var(--accent-primary)',
                fontWeight: 600
              }}>
                COMING SOON IN VERSION 1.1
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
            {/* General & Integrations */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              
              {/* Project settings card */}
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ ...styles.cardTitle, marginBottom: '1rem' }}>Cấu hình Dự án (Project Config)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={styles.formLabel}>Tên dự án hiện tại</label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={e => setProjectName(e.target.value)}
                      style={styles.formInput}
                    />
                  </div>
                  <div>
                    <label style={styles.formLabel}>Workspace ID</label>
                    <input
                      type="text"
                      value={workspaceId || ''}
                      disabled
                      style={{ ...styles.formInput, opacity: 0.6, cursor: 'not-allowed' }}
                    />
                  </div>
                  <button
                    onClick={() => alert('Đã cập nhật tên dự án thành công!')}
                    style={{ ...styles.submitBtn, width: 'fit-content', padding: '0.5rem 1rem' }}
                  >
                    Lưu cấu hình
                  </button>
                </div>
              </div>

              {/* GSC card */}
              <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ ...styles.cardTitle, marginBottom: '0.5rem' }}>Google Search Console (GSC)</h3>
                  <p style={{ ...styles.cardSubtitle, marginBottom: '1rem' }}>
                    Kết nối tài khoản Google để đồng bộ dữ liệu Clicks, Impressions, CTR trực tiếp từ Google API.
                  </p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Globe size={18} color={isGscConnected ? 'var(--accent-green)' : 'var(--text-muted)'} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {isGscConnected ? 'Trạng thái: Đã kết nối' : 'Trạng thái: Chưa kết nối'}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: isGscConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: isGscConnected ? 'var(--accent-green)' : 'var(--text-muted)',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px'
                    }}>
                      {isGscConnected ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setIsGscConnected(!isGscConnected);
                      alert(isGscConnected ? 'Đã ngắt kết nối Google Search Console!' : 'Đã kết nối thành công Google Search Console!');
                    }}
                    style={{
                      ...styles.submitBtn,
                      background: isGscConnected ? 'rgba(239, 68, 68, 0.1)' : 'var(--accent-primary)',
                      border: isGscConnected ? '1px solid var(--accent-red)' : 'none',
                      color: isGscConnected ? 'var(--accent-red)' : 'white',
                      fontWeight: 600
                    }}
                  >
                    {isGscConnected ? 'Ngắt Kết Nối GSC' : 'Liên kết tài khoản Google'}
                  </button>
                </div>
              </div>
            </div>

            {/* Quota Limits & Plans */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={styles.cardTitle}>Hạn mức & Gói Workspace (Plan & Quotas)</h3>
                  <p style={styles.cardSubtitle}>Kiểm soát và gia hạn giới hạn tài nguyên của workspace</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Gói hiện tại: <strong style={{ color: 'var(--accent-primary)', textTransform: 'uppercase' }}>{workspacePlan}</strong>
                  </span>
                  <button
                    onClick={handleTogglePlan}
                    style={{
                      ...styles.submitBtn,
                      marginTop: 0,
                      background: 'rgba(99, 102, 241, 0.1)',
                      color: 'var(--accent-primary)',
                      border: '1px solid var(--accent-primary)',
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.8rem'
                    }}
                  >
                    {workspacePlan === 'free' ? 'Nâng cấp lên PRO' : 'Hạ cấp xuống FREE'}
                  </button>
                </div>
              </div>

              {/* Progress bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Sites Limit */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Số lượng Website (Sites)</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {sitesList.length} / {workspacePlan === 'free' ? 1 : 10} Sites
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, (sitesList.length / (workspacePlan === 'free' ? 1 : 10)) * 100)}%`,
                      height: '100%',
                      background: 'var(--accent-primary)',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                {/* Keywords Limit */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Từ khóa Theo dõi (Keywords)</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {keywordsList.length} / {workspacePlan === 'free' ? 5 : 100} Keywords
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, (keywordsList.length / (workspacePlan === 'free' ? 5 : 100)) * 100)}%`,
                      height: '100%',
                      background: 'var(--accent-secondary)',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                {/* Briefs Limit */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>AI Content Briefs đã tạo</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {contentPlansList.filter(p => p.body).length} / {workspacePlan === 'free' ? 3 : 50} Briefs
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, (contentPlansList.filter(p => p.body).length / (workspacePlan === 'free' ? 3 : 50)) * 100)}%`,
                      height: '100%',
                      background: 'var(--accent-green)',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Team Management Card */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ ...styles.cardTitle, marginBottom: '1rem' }}>Thành viên Workspace (Team Members)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
                {/* Form to add member */}
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Thêm Thành Viên</h4>
                  <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <label style={styles.formLabel}>Email</label>
                      <input
                        type="email"
                        value={newMemberEmail}
                        onChange={e => setNewMemberEmail(e.target.value)}
                        placeholder="email@domain.com"
                        style={styles.formInput}
                        required
                      />
                    </div>
                    <div>
                      <label style={styles.formLabel}>Vai trò</label>
                      <select
                        value={newMemberRole}
                        onChange={e => setNewMemberRole(e.target.value)}
                        style={styles.formInput}
                      >
                        <option value="owner">Owner (Chủ sở hữu)</option>
                        <option value="admin">Admin (Quản trị viên)</option>
                        <option value="manager">Manager (Quản lý)</option>
                        <option value="seo">SEO specialist (Chuyên viên SEO)</option>
                        <option value="content">Content specialist (Chuyên viên Nội dung)</option>
                        <option value="client">Client (Khách hàng)</option>
                        <option value="viewer">Viewer (Người xem)</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      style={{ ...styles.submitBtn, width: '100%', marginTop: '0.25rem' }}
                    >
                      Thêm thành viên
                    </button>
                  </form>
                </div>

                {/* Member List Table */}
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Danh Sách Thành Viên</h4>
                  {membersList.length === 0 ? (
                    <div style={styles.emptyState}>
                      <p>Không có thông tin thành viên.</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                            <th style={{ padding: '0.5rem' }}>Email</th>
                            <th style={{ padding: '0.5rem' }}>Vai trò</th>
                            <th style={{ padding: '0.5rem' }}>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {membersList.map((mem: any) => (
                            <tr key={mem.membershipId || mem.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                              <td style={{ padding: '0.5rem', color: 'var(--text-primary)' }}>{mem.user?.email || mem.user?.id || mem.userId}</td>
                              <td style={{ padding: '0.5rem', textTransform: 'uppercase', color: 'var(--accent-primary)', fontSize: '0.75rem' }}>{mem.role}</td>
                              <td style={{ padding: '0.5rem' }}>
                                <span style={{
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  color: 'var(--accent-green)',
                                  padding: '0.05rem 0.25rem',
                                  borderRadius: '3px',
                                  fontSize: '0.65rem'
                                }}>
                                  ACTIVE
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Report Preview Modal */}
        {selectedReport && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}>
            <div className="glass-card" style={{
              background: '#0d111a',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '850px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
              overflow: 'hidden'
            }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Bản xem trước Báo cáo: {selectedReport.title}
                </h3>
                <button
                  onClick={() => setSelectedReport(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '1.2rem'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Preview Content */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1.5rem',
                background: '#ffffff',
                color: '#333333'
              }}>
                <div dangerouslySetInnerHTML={{ __html: selectedReport.metadata?.renderedHtml || '<p>Không có nội dung báo cáo</p>' }} />
              </div>

              {/* Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '1rem',
                padding: '1rem 1.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                background: 'rgba(255, 255, 255, 0.01)'
              }}>
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
                  style={{
                    background: 'var(--accent-primary)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  In / Xuất PDF
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recommendation Detail Modal */}
        {selectedRecForDetail && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}>
            <div className="glass-card" style={{
              background: '#0d111a',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '600px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
              padding: '1.5rem'
            }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                paddingBottom: '0.75rem'
              }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Chi tiết Kiến nghị & Phân công
                </h3>
                <button
                  onClick={() => setSelectedRecForDetail(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '1.2rem'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Rec info */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-secondary)', marginBottom: '0.4rem' }}>
                  {selectedRecForDetail.title}
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {selectedRecForDetail.description}
                </p>
              </div>

              {/* Assignee selection */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={styles.formLabel}>Người phụ trách (Assignee)</label>
                <select
                  value={recAssigneeId}
                  onChange={e => setRecAssigneeId(e.target.value)}
                  style={styles.formInput}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ ...styles.formLabel, marginBottom: 0 }}>Ghi chú nội bộ (Internal Notes)</label>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: 700 }}>CHỈ NỘI BỘ AGENCY</span>
                  </div>
                  <textarea
                    value={recInternalNotes}
                    onChange={e => setRecInternalNotes(e.target.value)}
                    placeholder="Nhập ghi chú kỹ thuật, lưu ý nội bộ công việc..."
                    style={{ ...styles.formInput, minHeight: '80px', fontFamily: 'inherit' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ ...styles.formLabel, marginBottom: 0 }}>Ghi chú gửi khách hàng (Client Notes)</label>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: 700 }}>KHÁCH HÀNG CÓ THỂ XEM</span>
                  </div>
                  <textarea
                    value={recClientNotes}
                    onChange={e => setRecClientNotes(e.target.value)}
                    placeholder="Giải thích cho khách hàng về lỗi này và cách xử lý..."
                    style={{ ...styles.formInput, minHeight: '80px', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                paddingTop: '1rem'
              }}>
                <button
                  onClick={() => setSelectedRecForDetail(null)}
                  style={{
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveRecDetail}
                  disabled={isSavingRecDetail}
                  style={{
                    ...styles.submitBtn,
                    marginTop: 0,
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem'
                  }}
                >
                  {isSavingRecDetail ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

// Styling Object
const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '260px',
    backgroundColor: '#0a0d16',
    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: 0,
    height: '100vh',
    padding: '1.5rem 1rem'
  },
  logoContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    padding: '0.5rem',
    marginBottom: '2rem'
  },
  logoGlow: {
    position: 'absolute',
    left: '-10px',
    width: '40px',
    height: '40px',
    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, rgba(99, 102, 241, 0) 70%)',
    pointerEvents: 'none'
  },
  logoText: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-outfit)',
    letterSpacing: '-0.03em'
  },
  siteSelectorContainer: {
    marginBottom: '2rem'
  },
  siteSelectorCard: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 'var(--radius-md)',
    padding: '0.6rem 0.8rem',
    gap: '0.5rem'
  },
  selectInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    fontWeight: 500,
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    WebkitAppearance: 'none'
  },
  navMenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    flex: 1
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    padding: '0.7rem 0.8rem',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 500,
    textAlign: 'left',
    position: 'relative',
    transition: 'all 0.2s ease'
  },
  navItemActive: {
    background: 'rgba(99, 102, 241, 0.08)',
    color: 'var(--accent-primary)'
  },
  activeDot: {
    position: 'absolute',
    left: 0,
    width: '4px',
    height: '16px',
    backgroundColor: 'var(--accent-primary)',
    borderRadius: '0 4px 4px 0'
  },
  userCardContainer: {
    marginTop: 'auto',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '1rem'
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem'
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(99, 102, 241, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(99, 102, 241, 0.4)'
  },
  userInfo: {
    overflow: 'hidden'
  },
  userName: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis'
  },
  userRole: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)'
  },
  mainContent: {
    flex: 1,
    padding: '2rem',
    overflowY: 'auto',
    height: '100vh'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  },
  headerTitle: {
    fontSize: '1.85rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '0.25rem'
  },
  headerSubtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)'
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  iconButton: {
    position: 'relative',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 'var(--radius-md)',
    padding: '0.6rem',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  },
  notificationBadge: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-secondary)'
  },
  divider: {
    width: '1px',
    height: '24px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)'
  },
  actionButton: {
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    color: 'white',
    padding: '0.6rem 1rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
    transition: 'transform 0.2s ease'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.25rem',
    marginBottom: '2rem'
  },
  metricCard: {
    padding: '1.25rem'
  },
  metricHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem'
  },
  metricLabel: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: 500
  },
  metricIconWrap: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    background: 'rgba(99, 102, 241, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  metricBody: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between'
  },
  metricValue: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-outfit)'
  },
  metricChange: {
    fontSize: '0.8rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center'
  },
  chartCard: {
    padding: '1.5rem',
    marginBottom: '2rem'
  },
  chartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem'
  },
  cardTitle: {
    fontSize: '1.15rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '0.25rem'
  },
  cardSubtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)'
  },
  chartPeriod: {
    display: 'flex',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '8px',
    padding: '0.2rem'
  },
  periodBtnActive: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: 'none',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    padding: '0.4rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  periodBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    padding: '0.4rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer'
  },
  chartWrapper: {
    width: '100%',
    height: '240px'
  },
  chartSvg: {
    width: '100%',
    height: '100%'
  },
  chartLegends: {
    display: 'flex',
    gap: '1.5rem',
    marginTop: '1rem',
    paddingLeft: '1rem'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)'
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '1.5rem'
  },
  keywordsCard: {
    padding: '1.5rem'
  },
  tableWrapper: {
    overflowX: 'auto',
    marginTop: '1.25rem'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  trHead: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
  },
  th: {
    padding: '0.75rem 0.5rem',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    letterSpacing: '0.05em'
  },
  trBody: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    transition: 'background 0.2s ease'
  },
  tdKeyword: {
    padding: '1rem 0.5rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-primary)'
  },
  td: {
    padding: '1rem 0.5rem',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)'
  },
  badgePosition: {
    background: 'rgba(99, 102, 241, 0.1)',
    color: 'var(--accent-primary)',
    padding: '0.2rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 600
  },
  actionsCard: {
    padding: '1.5rem'
  },
  actionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginTop: '1.25rem'
  },
  actionItem: {
    display: 'flex',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    transition: 'all 0.2s ease'
  },
  actionLeftIndicator: {
    width: '4px'
  },
  actionBody: {
    padding: '1rem',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  actionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem'
  },
  actionTitle: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-primary)'
  },
  badgeImpact: {
    fontSize: '0.7rem',
    fontWeight: 600,
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
    border: '1px solid'
  },
  actionDesc: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.4
  },
  actionFooterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '0.25rem'
  },
  actionTypeTag: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    background: 'rgba(255, 255, 255, 0.04)',
    padding: '0.15rem 0.45rem',
    borderRadius: '4px'
  },
  actionBtnOptimize: {
    background: 'transparent',
    border: 'none',
    color: 'var(--accent-primary)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    transition: 'background 0.2s ease'
  },
  subTabContainer: {
    display: 'flex',
    gap: '0.75rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    paddingBottom: '0.75rem',
    marginBottom: '1rem',
  },
  subTabButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  subTabButtonActive: {
    background: 'rgba(99, 102, 241, 0.1)',
    color: 'var(--accent-primary)',
    fontWeight: 600,
  },
  contentPlannerGrid: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'flex-start',
    width: '100%',
  },
  emptyState: {
    padding: '2rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    background: 'rgba(255, 255, 255, 0.01)',
    borderRadius: 'var(--radius-md)',
    border: '1px dashed rgba(255, 255, 255, 0.05)',
  },
  planCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: 'var(--radius-md)',
    padding: '1rem',
    transition: 'all 0.2s ease',
  },
  statusBadge: {
    fontSize: '0.75rem',
    padding: '0.15rem 0.45rem',
    borderRadius: '6px',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  openEditorBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    background: 'rgba(99, 102, 241, 0.1)',
    color: 'var(--accent-primary)',
    border: 'none',
    padding: '0.5rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    transition: 'all 0.2s ease',
  },
  keywordTagPrimary: {
    background: 'rgba(99, 102, 241, 0.15)',
    color: 'var(--accent-primary)',
    fontSize: '0.75rem',
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
    fontWeight: 500,
  },
  keywordTagSecondary: {
    background: 'rgba(255, 255, 255, 0.04)',
    color: 'var(--text-secondary)',
    fontSize: '0.75rem',
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
  },
  formLabel: {
    display: 'block',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    marginBottom: '0.35rem',
    fontWeight: 500,
  },
  formInput: {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.5rem 0.75rem',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  formSelect: {
    width: '100%',
    background: 'rgba(18, 24, 41, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.5rem 0.75rem',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    outline: 'none',
    cursor: 'pointer',
  },
  submitBtn: {
    background: 'var(--accent-primary)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '0.6rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    marginTop: '0.5rem',
    transition: 'all 0.2s ease',
  },
  topicClusterCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: 'var(--radius-md)',
    padding: '1.25rem',
  },
  topicKeywordTag: {
    background: 'rgba(99, 102, 241, 0.1)',
    color: 'var(--accent-primary)',
    fontSize: '0.7rem',
    padding: '0.1rem 0.35rem',
    borderRadius: '4px',
  },
  topicKeywordTagSecondary: {
    background: 'rgba(168, 85, 247, 0.1)',
    color: 'var(--accent-secondary)',
    fontSize: '0.7rem',
    padding: '0.1rem 0.35rem',
    borderRadius: '4px',
  },
  editorWorkspaceGrid: {
    display: 'grid',
    gridTemplateColumns: '320px 1fr 300px',
    gap: '1.25rem',
    width: '100%',
    alignItems: 'stretch',
    flex: 1,
    minHeight: '0',
  },
  editorColBrief: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 200px)',
  },
  editorColMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  editorColSidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 200px)',
  },
  editorTextArea: {
    flex: 1,
    width: '100%',
    minHeight: '400px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: 'var(--radius-md)',
    padding: '1rem',
    color: 'var(--text-primary)',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    lineHeight: 1.6,
    outline: 'none',
    resize: 'none',
  },
  suggestionItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  }
};