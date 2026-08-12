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
  const [contentSubTab, setContentSubTab] = useState<'topics' | 'calendar' | 'editor'>('calendar');
  const [topicsList, setTopicsList] = useState<any[]>([]);
  const [contentPlansList, setContentPlansList] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

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

  // Fetch Topics and Content Plans when token, workspaceId or projectId change
  React.useEffect(() => {
    if (!token || !workspaceId || !projectId) return;
    fetchTopics();
    fetchContentPlans();
  }, [token, workspaceId, projectId]);

  // Debounced Real-time Content Optimization
  React.useEffect(() => {
    if (!selectedPlanId || !editorBody.trim()) return;

    const timer = setTimeout(() => {
      runOptimization(selectedPlanId, editorBody);
    }, 800);

    return () => clearTimeout(timer);
  }, [editorBody, selectedPlanId]);

  async function fetchTopics() {
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
  }

  async function fetchContentPlans() {
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

  async function runOptimization(planId: string, bodyText: string) {
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
              onChange={(e) => setSelectedSite(e.target.value)}
              style={styles.selectInput}
            >
              {sites.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
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
                              onClick={() => handleToggleStatus(act.id, act.status)}
                              style={{ 
                                ...styles.actionBtnOptimize, 
                                color: indicatorColor,
                                fontWeight: isCompleted ? 500 : 600
                              }}
                            >
                              <span>{isCompleted ? 'Completed ✓' : 'Optimize Now'}</span>
                              {!isCompleted && <ChevronRight size={14} />}
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
                    <h3 style={{ ...styles.cardTitle, marginBottom: '1.25rem' }}>Scheduled Content Drafts</h3>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        onClick={() => setSelectedPlanId(null)}
                        style={{ ...styles.openEditorBtn, background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}
                      >
                        <ArrowLeft size={14} />
                        <span>Select different draft</span>
                      </button>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Target: <strong style={{ color: 'var(--text-primary)' }}>{contentPlansList.find(p => p.id === selectedPlanId)?.primaryKeyword}</strong>
                      </span>
                    </div>

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
