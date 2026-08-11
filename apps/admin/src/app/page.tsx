'use client';

import React, { useState } from 'react';
import {
  Shield,
  Users,
  Layers,
  Database,
  Sliders,
  LogOut,
  Search,
  Activity,
  CheckCircle,
  AlertTriangle,
  Server,
  Key,
  HardDrive,
  Cpu,
  ChevronRight,
  Filter,
  UserPlus
} from 'lucide-react';

export default function Page() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('All');

  // Admin specific mock data
  const workspaces = [
    { id: '1', name: 'Mavryk Agency', owner: 'agency@mavryk.io', plan: 'Enterprise', projects: 8, status: 'Active', created: '2026-05-12' },
    { id: '2', name: 'Acme Corp', owner: 'admin@acme.com', plan: 'Pro', projects: 3, status: 'Active', created: '2026-06-01' },
    { id: '3', name: 'Tech Solutions Ltd', owner: 'john@techsol.io', plan: 'Pro', projects: 5, status: 'Active', created: '2026-07-22' },
    { id: '4', name: 'Hobby Developer', owner: 'dev@gmail.com', plan: 'Free', projects: 1, status: 'Active', created: '2026-08-01' },
    { id: '5', name: 'Spam Blog Network', owner: 'spammer@yahoo.com', plan: 'Free', projects: 4, status: 'Suspended', created: '2026-08-09' }
  ];

  const systemStatus = [
    { name: 'PostgreSQL Database', status: 'Healthy', latency: '4ms', details: 'Running on port 5435', icon: Database, color: 'var(--accent-green)' },
    { name: 'ClickHouse Analytics', status: 'Healthy', latency: '12ms', details: '9.4M observation rows', icon: Server, color: 'var(--accent-green)' },
    { name: 'Redis Cache', status: 'Healthy', latency: '0.8ms', details: '5.2K active sessions', icon: Activity, color: 'var(--accent-green)' },
    { name: 'MinIO S3 Storage', status: 'Degraded', latency: '42ms', details: 'Object upload lag', icon: HardDrive, color: 'var(--accent-orange)' }
  ];

  const filteredWorkspaces = workspaces.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) || w.owner.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = selectedPlan === 'All' || w.plan === selectedPlan;
    return matchesSearch && matchesPlan;
  });

  return (
    <main className="dashboard-layout">
      {/* Admin Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logoContainer}>
          <div style={styles.logoGlow}></div>
          <span style={styles.logoText}>Mavryk<span style={{ color: 'var(--accent-primary)' }}>Admin</span></span>
        </div>

        {/* Security SSO Status Indicator */}
        <div style={styles.ssoBadgeCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Shield size={16} color="var(--accent-primary)" />
            <span style={styles.ssoTitle}>SSO Session</span>
          </div>
          <div style={styles.ssoUser}>admin@mavryk.io</div>
          <div style={styles.ssoExpiry}>Expires in 4h 12m</div>
        </div>

        {/* Admin Navigation */}
        <nav style={styles.navMenu}>
          <button style={{ ...styles.navItem, ...styles.navItemActive }}>
            <Layers size={18} />
            <span>Active Tenants</span>
            <div style={styles.activeDot} />
          </button>
          <button style={styles.navItem}>
            <Users size={18} />
            <span>User Accounts</span>
          </button>
          <button style={styles.navItem}>
            <Database size={18} />
            <span>ClickHouse DDL</span>
          </button>
          <button style={styles.navItem}>
            <Cpu size={18} />
            <span>Job Workers</span>
          </button>
          <button style={styles.navItem}>
            <Sliders size={18} />
            <span>System Config</span>
          </button>
        </nav>

        {/* Exit Admin */}
        <div style={styles.userCardContainer}>
          <button style={styles.exitButton} onClick={() => alert('Returning to main website...')}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Admin Main Body */}
      <section style={styles.mainContent}>
        {/* Cloudflare Access secure notification banner */}
        <div style={styles.securityBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={styles.ssoShieldIcon}>
              <Shield size={18} color="white" />
            </div>
            <div>
              <div style={styles.bannerHeading}>Secured by Cloudflare Access SSO</div>
              <div style={styles.bannerSubheading}>Only authorized administrator emails are permitted. All administrative queries are cryptographically signed and logged.</div>
            </div>
          </div>
          <div style={styles.accessGrantedLabel}>Access Granted</div>
        </div>

        {/* Main Header */}
        <header style={styles.header}>
          <div>
            <h1 style={styles.headerTitle}>System Overview</h1>
            <p style={styles.headerSubtitle}>Workspace allocation, database nodes, and system quotas</p>
          </div>
          <button style={styles.actionButton}>
            <UserPlus size={16} />
            <span>Add Workspace</span>
          </button>
        </header>

        {/* System Health Cards */}
        <div style={styles.metricsGrid}>
          {systemStatus.map((node, idx) => {
            const Icon = node.icon;
            return (
              <div key={idx} className="glass-card" style={styles.healthCard}>
                <div style={styles.healthCardHeader}>
                  <div style={styles.healthNodeName}>
                    <Icon size={18} color="var(--accent-primary)" style={{ marginRight: '0.5rem' }} />
                    <span>{node.name}</span>
                  </div>
                  <span style={{
                    ...styles.statusTag,
                    color: node.color,
                    borderColor: node.color,
                    background: `rgba(${node.color === 'var(--accent-green)' ? '16,185,129' : '245,158,11'}, 0.08)`
                  }}>
                    {node.status}
                  </span>
                </div>
                <div style={styles.healthLatencyRow}>
                  <span style={styles.latencyLabel}>Response time:</span>
                  <span style={styles.latencyValue}>{node.latency}</span>
                </div>
                <div style={styles.healthDetails}>{node.details}</div>
              </div>
            );
          })}
        </div>

        {/* Middle Area: Quota Management & Resource Meters */}
        <div style={styles.quotaSectionGrid}>
          {/* Workspace Management Table */}
          <div className="glass-card" style={styles.tableCard}>
            <div style={styles.tableHeaderRow}>
              <div>
                <h2 style={styles.cardTitle}>Tenant Workspaces</h2>
                <p style={styles.cardSubtitle}>Configure billing plans and projects visibility</p>
              </div>
              <div style={styles.filterRow}>
                <div style={styles.searchWrap}>
                  <Search size={14} color="var(--text-muted)" />
                  <input
                    type="text"
                    placeholder="Search workspaces..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={styles.searchInput}
                  />
                </div>
                <div style={styles.planSelector}>
                  <Filter size={14} color="var(--text-muted)" style={{ marginRight: '0.25rem' }} />
                  <select
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    style={styles.planSelect}
                  >
                    <option value="All">All Plans</option>
                    <option value="Enterprise">Enterprise</option>
                    <option value="Pro">Pro</option>
                    <option value="Free">Free</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.trHead}>
                    <th style={styles.th}>Workspace Name</th>
                    <th style={styles.th}>Owner Email</th>
                    <th style={styles.th}>Plan</th>
                    <th style={styles.th}>Projects</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkspaces.map((w) => (
                    <tr key={w.id} style={styles.trBody}>
                      <td style={styles.tdName}>{w.name}</td>
                      <td style={styles.td}>{w.owner}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badgePlan,
                          color: w.plan === 'Enterprise' ? 'var(--accent-secondary)' : w.plan === 'Pro' ? 'var(--accent-primary)' : 'var(--text-muted)',
                          borderColor: w.plan === 'Enterprise' ? 'var(--accent-secondary)' : w.plan === 'Pro' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)'
                        }}>
                          {w.plan}
                        </span>
                      </td>
                      <td style={styles.td}>{w.projects}</td>
                      <td style={styles.td}>
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: w.status === 'Active' ? 'var(--accent-green)' : 'var(--accent-red)'
                        }}>
                          ● {w.status}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button style={styles.actionBtnOptimize} onClick={() => alert(`Managing limits for workspace ${w.name}`)}>
                          <span>Config</span>
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quota Progress Meters */}
          <div className="glass-card" style={styles.quotaCard}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Global Resource Usage</h2>
              <p style={styles.cardSubtitle}>API quota limits across all active tenants</p>
            </div>
            <div style={styles.quotaMeters}>
              {/* Meter 1 */}
              <div style={styles.meterItem}>
                <div style={styles.meterHeader}>
                  <span style={styles.meterLabel}>GSC Requests Limit</span>
                  <span style={styles.meterValue}>6,800 / 10,000 daily</span>
                </div>
                <div style={styles.progressTrack}>
                  <div style={{ ...styles.progressFill, width: '68%', background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))' }} />
                </div>
              </div>

              {/* Meter 2 */}
              <div style={styles.meterItem}>
                <div style={styles.meterHeader}>
                  <span style={styles.meterLabel}>Active Crawl Job Workers</span>
                  <span style={styles.meterValue}>2 / 5 active</span>
                </div>
                <div style={styles.progressTrack}>
                  <div style={{ ...styles.progressFill, width: '40%', background: 'var(--accent-primary)' }} />
                </div>
              </div>

              {/* Meter 3 */}
              <div style={styles.meterItem}>
                <div style={styles.meterHeader}>
                  <span style={styles.meterLabel}>MinIO Server Storage</span>
                  <span style={styles.meterValue}>12.4 GB / 100 GB</span>
                </div>
                <div style={styles.progressTrack}>
                  <div style={{ ...styles.progressFill, width: '12.4%', background: 'var(--accent-green)' }} />
                </div>
              </div>

              {/* Meter 4 */}
              <div style={styles.meterItem}>
                <div style={styles.meterHeader}>
                  <span style={styles.meterLabel}>FastAPI AI Token Quota</span>
                  <span style={styles.meterValue}>824,105 / 1,000,000 tokens</span>
                </div>
                <div style={styles.progressTrack}>
                  <div style={{ ...styles.progressFill, width: '82.4%', background: 'var(--accent-orange)' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// Admin Panel Styles
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
    marginBottom: '1.5rem'
  },
  logoGlow: {
    position: 'absolute',
    left: '-10px',
    width: '40px',
    height: '40px',
    background: 'radial-gradient(circle, rgba(244, 63, 94, 0.3) 0%, rgba(244, 63, 94, 0) 70%)',
    pointerEvents: 'none'
  },
  logoText: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-outfit)',
    letterSpacing: '-0.03em'
  },
  ssoBadgeCard: {
    background: 'rgba(244, 63, 94, 0.05)',
    border: '1px solid rgba(244, 63, 94, 0.15)',
    borderRadius: 'var(--radius-md)',
    padding: '0.8rem',
    marginBottom: '2rem'
  },
  ssoTitle: {
    fontSize: '0.8rem',
    fontWeight: 700,
    color: 'var(--accent-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  ssoUser: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '0.2rem'
  },
  ssoExpiry: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)'
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
    background: 'rgba(244, 63, 94, 0.08)',
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
  exitButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-secondary)',
    padding: '0.6rem',
    width: '100%',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    transition: 'all 0.2s ease'
  },
  mainContent: {
    flex: 1,
    padding: '2rem',
    overflowY: 'auto',
    height: '100vh'
  },
  securityBanner: {
    background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(236, 72, 153, 0.05) 100%)',
    border: '1px solid rgba(244, 63, 94, 0.25)',
    borderRadius: 'var(--radius-lg)',
    padding: '1rem 1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    gap: '1.5rem'
  },
  ssoShieldIcon: {
    background: 'var(--accent-primary)',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(244, 63, 94, 0.3)'
  },
  bannerHeading: {
    fontSize: '0.9rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '0.2rem'
  },
  bannerSubheading: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.3
  },
  accessGrantedLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: 'var(--accent-green)',
    border: '1px solid var(--accent-green)',
    borderRadius: '4px',
    padding: '0.2rem 0.5rem',
    background: 'rgba(16, 185, 129, 0.08)'
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
  actionButton: {
    background: 'var(--accent-primary)',
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
    boxShadow: '0 4px 12px rgba(244, 63, 94, 0.25)',
    transition: 'background 0.2s ease'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.25rem',
    marginBottom: '2rem'
  },
  healthCard: {
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  healthCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  healthNodeName: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--text-primary)'
  },
  statusTag: {
    fontSize: '0.7rem',
    fontWeight: 700,
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
    border: '1px solid'
  },
  healthLatencyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
    marginTop: '0.5rem'
  },
  latencyLabel: {
    color: 'var(--text-muted)'
  },
  latencyValue: {
    fontWeight: 600,
    color: 'var(--text-primary)'
  },
  healthDetails: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)'
  },
  quotaSectionGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '1.5rem'
  },
  tableCard: {
    padding: '1.5rem'
  },
  tableHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
    marginBottom: '1.25rem'
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
  filterRow: {
    display: 'flex',
    gap: '0.5rem'
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '6px',
    padding: '0.35rem 0.6rem',
    gap: '0.4rem'
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '0.8rem',
    outline: 'none',
    width: '120px'
  },
  planSelector: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '6px',
    padding: '0.35rem 0.6rem'
  },
  planSelect: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '0.8rem',
    outline: 'none',
    cursor: 'pointer'
  },
  tableWrapper: {
    overflowX: 'auto'
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
  tdName: {
    padding: '0.85rem 0.5rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-primary)'
  },
  td: {
    padding: '0.85rem 0.5rem',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)'
  },
  badgePlan: {
    fontSize: '0.7rem',
    fontWeight: 700,
    padding: '0.1rem 0.35rem',
    borderRadius: '4px',
    border: '1px solid'
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
    gap: '0.1rem',
    padding: '0.2rem 0.4rem',
    borderRadius: '4px'
  },
  quotaCard: {
    padding: '1.5rem'
  },
  quotaMeters: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    marginTop: '1.25rem'
  },
  meterItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem'
  },
  meterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem'
  },
  meterLabel: {
    fontWeight: 600,
    color: 'var(--text-primary)'
  },
  meterValue: {
    color: 'var(--text-secondary)'
  },
  progressTrack: {
    width: '100%',
    height: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px'
  }
};
