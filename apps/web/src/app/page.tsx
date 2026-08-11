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
  ChevronRight
} from 'lucide-react';

export default function Page() {
  const [selectedSite, setSelectedSite] = useState('mavryk.io');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [chartWidth, setChartWidth] = useState(800);
  const containerRef = React.useRef<HTMLDivElement>(null);

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

  const actions = [
    {
      title: 'Fix 14 Orphan Pages',
      description: 'Found 14 pages with no incoming internal links. Critical for PageRank distribution.',
      impact: 'High',
      type: 'Technical',
      color: 'var(--accent-red)'
    },
    {
      title: 'Optimize Content Decay: /blog/seo-guide',
      description: 'Traffic dropped by 34% over the last 90 days. Update outdated sections.',
      impact: 'High',
      type: 'Content',
      color: 'var(--accent-orange)'
    },
    {
      title: 'Target striking distance keyword "seo audit checklist"',
      description: 'Currently ranking #11. Adding 2 high-quality internal links could push it to page 1.',
      impact: 'Medium',
      type: 'Keywords',
      color: 'var(--accent-primary)'
    }
  ];

  const paddingX = 50;
  const chartW = chartWidth - paddingX * 2;
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
            <h1 style={styles.headerTitle}>SEO Dashboard</h1>
            <p style={styles.headerSubtitle}>Real-time Google Search Console & Audit Insights for <span style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>{selectedSite}</span></p>
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
              <h2 style={styles.cardTitle}>Action Center</h2>
              <p style={styles.cardSubtitle}>AI generated SEO recommendations</p>
            </div>
            <div style={styles.actionList}>
              {actions.map((act, idx) => (
                <div key={idx} style={styles.actionItem}>
                  <div style={{ ...styles.actionLeftIndicator, background: act.color }} />
                  <div style={styles.actionBody}>
                    <div style={styles.actionHeaderRow}>
                      <span style={styles.actionTitle}>{act.title}</span>
                      <span style={{ ...styles.badgeImpact, color: act.color, borderColor: act.color }}>
                        {act.impact} Impact
                      </span>
                    </div>
                    <p style={styles.actionDesc}>{act.description}</p>
                    <div style={styles.actionFooterRow}>
                      <span style={styles.actionTypeTag}>{act.type}</span>
                      <button style={styles.actionBtnOptimize}>
                        <span>Optimize Now</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
  }
};
