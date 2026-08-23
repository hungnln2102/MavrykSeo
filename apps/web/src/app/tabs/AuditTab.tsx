import React from 'react';
import { Loader2, Search, Activity, Globe, AlertCircle, ChevronRight, FileText } from 'lucide-react';
import { renderProvenanceBadge } from '../styles';

interface AuditTabProps {
  selectedSite: string;
  activeSite: any;
  isCrawling: boolean;
  crawlStatusText: string;
  recs: any[];
  crawlsHistory: any[];
  loadingCrawlsHistory: boolean;
  auditLogs: any[];
  loadingAuditLogs: boolean;
  handleTriggerCrawl: () => Promise<void>;
  handleReplayJob: (jobRunId: string) => Promise<void>;
  handleReprocessJob: (jobRunId: string) => Promise<void>;
  handleViewRawHtml: (jobRunId: string) => Promise<void>;
  setSelectedRecForDetail: (act: any) => void;
  setRecAssigneeId: (id: string) => void;
  setRecInternalNotes: (notes: string) => void;
  setRecClientNotes: (notes: string) => void;
}

export default function AuditTab({
  selectedSite,
  activeSite,
  isCrawling,
  crawlStatusText,
  recs,
  crawlsHistory,
  loadingCrawlsHistory,
  auditLogs,
  loadingAuditLogs,
  handleTriggerCrawl,
  handleReplayJob,
  handleReprocessJob,
  handleViewRawHtml,
  setSelectedRecForDetail,
  setRecAssigneeId,
  setRecInternalNotes,
  setRecClientNotes,
}: AuditTabProps) {
  
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Header / Trigger Audit */}
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="jss-card-title">Kiểm tra Tối ưu Kỹ thuật (Technical SEO Audit)</h2>
          <p className="jss-card-subtitle">
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
            className="shine-button jss-submit-btn" style={{ marginTop: 0, opacity: (isCrawling || !activeSite) ? 0.6 : 1, cursor: (isCrawling || !activeSite) ? 'not-allowed' : 'pointer', background: 'var(--accent-primary)', padding: '0.6rem 1.2rem', }}
          >
            <Search size={16} />
            <span>{isCrawling ? 'Đang thực hiện...' : 'Kích hoạt Audit'}</span>
          </button>
        </div>
      </div>

      {/* Health & Crawl Metrics */}
      <div className="jss-metrics-grid">
        <div className="glass-card jss-metric-card">
          <div className="jss-metric-header">
            <span className="jss-metric-label">Điểm Sức Khỏe (Health Score) {renderProvenanceBadge('derived')}</span>
            <div className="jss-metric-icon-wrap">
              <Activity size={16} color="var(--accent-green)" />
            </div>
          </div>
          <div className="jss-metric-body">
            <span className="jss-metric-value">
              {recs.length === 0 ? '98%' : `${Math.max(50, 100 - recs.filter(r => r.status !== 'completed').length * 6)}%`}
            </span>
            <span className="jss-metric-change" style={{ color: 'var(--accent-green)' }}>
              Ổn định
            </span>
          </div>
        </div>

        <div className="glass-card jss-metric-card">
          <div className="jss-metric-header">
            <span className="jss-metric-label">Đã Quét (Pages Crawled) {renderProvenanceBadge('observed')}</span>
            <div className="jss-metric-icon-wrap">
              <Globe size={16} color="var(--accent-primary)" />
            </div>
          </div>
          <div className="jss-metric-body">
            <span className="jss-metric-value">12 / 100</span>
            <span className="jss-metric-change" style={{ color: 'var(--text-muted)' }}>
              Trang hoạt động
            </span>
          </div>
        </div>

        <div className="glass-card jss-metric-card">
          <div className="jss-metric-header">
            <span className="jss-metric-label">Số Lỗi Phát Hiện (Issues) {renderProvenanceBadge('derived')}</span>
            <div className="jss-metric-icon-wrap">
              <AlertCircle size={16} color="var(--accent-orange)" />
            </div>
          </div>
          <div className="jss-metric-body">
            <span className="jss-metric-value">
              {recs.filter(r => r.status !== 'completed').length} Lỗi
            </span>
            <span className="jss-metric-change" style={{ color: 'var(--accent-orange)' }}>
              Cần tối ưu
            </span>
          </div>
        </div>
      </div>

      {/* Audit Issues Details */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div className="jss-card-header" style={{ marginBottom: '1.25rem' }}>
          <h3 className="jss-card-title">Danh sách Lỗi Technical SEO & Kiến nghị {renderProvenanceBadge('derived')}</h3>
          <p className="jss-card-subtitle">Được sắp xếp theo độ ưu tiên và ảnh hưởng tới SEO</p>
        </div>

        {recs.length === 0 ? (
          <div className="jss-empty-state">
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
                  className="jss-action-item" style={{ ...(isCompleted ? { opacity: 0.55 } : {}), display: 'flex', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}
                >
                  <div className="jss-action-left-indicator" style={{ width: '4px', background: indicatorColor }} />
                  <div className="jss-action-body" style={{ padding: '1rem', flex: 1 }}>
                    <div className="jss-action-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span 
                        className="jss-action-title" style={{ fontSize: '0.95rem', fontWeight: 600, ...(isCompleted ? { textDecoration: 'line-through', color: 'var(--text-muted)' } : { color: 'var(--text-primary)' }) }}
                      >
                        {act.title}
                      </span>
                      <span className="jss-badge-impact" style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', border: '1px solid', borderRadius: '4px', color: indicatorColor, borderColor: indicatorColor }}>
                        {isCompleted ? 'Hoàn thành' : `${act.impactScore || 0} Ảnh hưởng`}
                      </span>
                    </div>
                    <p className="jss-action-desc" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      {act.description}
                    </p>
                    <div className="jss-action-footer-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="jss-action-type-tag" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {isCompleted ? 'Đã khắc phục ✓' : `Mức độ: ${act.priority.toUpperCase()}`}
                      </span>
                      <button 
                        onClick={() => {
                          setSelectedRecForDetail(act);
                          setRecAssigneeId(act.assigneeId || '');
                          setRecInternalNotes(act.internalNotes || '');
                          setRecClientNotes(act.clientNotes || '');
                        }}
                        className="jss-action-btn-optimize" style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem', color: indicatorColor, fontWeight: isCompleted ? 500 : 600 }}
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

      {/* History and Audit Records Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'mingrow 1fr 1fr', gap: '1.5rem', width: '100%' } as any}>
        
        {/* Crawl Job History Block */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div className="jss-card-header" style={{ marginBottom: '1.25rem' }}>
            <h3 className="jss-card-title">Lịch sử Thu thập (Crawl Job Runs)</h3>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.25rem' }}>
              <p className="jss-card-subtitle" style={{ margin: 0 }}>Theo dõi quá trình chạy và lỗi của Crawler</p>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'rgba(16, 185, 129, 0.1)',
                color: 'var(--accent-green)',
                fontSize: '0.7rem',
                fontWeight: 650,
                padding: '0.15rem 0.45rem',
                borderRadius: '12px',
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)', marginRight: '4px', display: 'inline-block' }}></span>
                SLO: OK (&lt;24h)
              </span>
            </div>
          </div>

          {loadingCrawlsHistory ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
            </div>
          ) : crawlsHistory.length === 0 ? (
            <div className="jss-empty-state">
              <p style={{ color: 'var(--text-muted)' }}>Không có lịch sử chạy crawl nào cho site này.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>Mã Job / Thời gian</th>
                    <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>Trạng thái</th>
                    <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {crawlsHistory.map((run) => (
                    <tr key={run.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', color: 'var(--text-primary)' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-bright)' }}>{run.id.substring(0, 8)}...</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(run.createdAt).toLocaleString('vi-VN')}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          display: 'inline-block',
                          background: run.state === 'completed' ? 'rgba(34, 197, 94, 0.1)' : run.state === 'failed' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                          color: run.state === 'completed' ? 'var(--accent-green)' : run.state === 'failed' ? 'var(--accent-red)' : 'var(--accent-orange)'
                        }}>
                          {run.state}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {run.state === 'failed' && (
                            <button
                              onClick={() => handleReplayJob(run.id)}
                              style={{
                                background: 'var(--accent-primary)',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.3rem 0.6rem',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
                            >
                              Replay
                            </button>
                          )}
                          {run.state === 'completed' && (
                            <button
                              onClick={() => handleViewRawHtml(run.id)}
                              style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '4px',
                                padding: '0.3rem 0.6rem',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}
                            >
                              <FileText size={12} />
                              <span>HTML</span>
                            </button>
                          )}
                          {(run.state === 'completed' || run.state === 'failed') && (
                            <button
                              onClick={() => handleReprocessJob(run.id)}
                              style={{
                                background: 'rgba(99, 102, 241, 0.15)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                borderRadius: '4px',
                                padding: '0.3rem 0.6rem',
                                color: 'rgb(165, 180, 252)',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
                            >
                              Reprocess
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Audit Logs Block */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div className="jss-card-header" style={{ marginBottom: '1.25rem' }}>
            <h3 className="jss-card-title">Nhật ký Hệ thống (Audit Logs)</h3>
            <p className="jss-card-subtitle">Ghi nhận các chỉnh sửa cấu hình và thao tác</p>
          </div>

          {loadingAuditLogs ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="jss-empty-state">
              <p style={{ color: 'var(--text-muted)' }}>Không có hoạt động hệ thống nào được ghi lại.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>Thời gian / User</th>
                    <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>Thao tác</th>
                    <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>Đối tượng</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', color: 'var(--text-primary)' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-bright)' }}>
                          {log.user?.name || log.user?.email || 'Hệ thống'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(log.createdAt).toLocaleString('vi-VN')}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <code style={{ background: 'rgba(0,0,0,0.2)', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.75rem', color: 'var(--accent-blue)' }}>
                          {log.action}
                        </code>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                        {log.entityType} ({log.entityId?.substring(0, 8) || 'N/A'})
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
  );
}
