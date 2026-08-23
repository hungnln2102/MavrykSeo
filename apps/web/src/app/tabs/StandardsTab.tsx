import React from 'react';
import { Loader2, BookOpen, Activity, Globe, ChevronDown, AlertCircle, ExternalLink, Search, Settings } from 'lucide-react';

interface StandardsTabProps {
  activeStandardsTab: 'browser' | 'audit_runs';
  setActiveStandardsTab: (tab: 'browser' | 'audit_runs') => void;
  selectedVersionId: string;
  setSelectedVersionId: (id: string) => void;
  standardsVersions: any[];
  loadingStandards: boolean;
  standardsControls: any[];
  selectedAuditRunId: string;
  setSelectedAuditRunId: (id: string) => void;
  auditRunsList: any[];
  loadingResults: boolean;
  auditResultsList: any[];
  triggeringAudit: boolean;
  editingResultId: string | null;
  setEditingResultId: (id: string | null) => void;
  editResultStatus: string;
  setEditResultStatus: (status: string) => void;
  editExceptionReason: string;
  setEditExceptionReason: (reason: string) => void;
  submittingVerification: boolean;
  handleTriggerAuditRun: () => Promise<void>;
  fetchAuditResults: (runId: string) => Promise<void>;
  handleVerifyControlResult: (resultId: string) => Promise<void>;
  sitesList: any[];
  selectedSite: string;
  workspaceId: string | null;
  token: string | null;
}

export default function StandardsTab({
  activeStandardsTab,
  setActiveStandardsTab,
  selectedVersionId,
  setSelectedVersionId,
  standardsVersions,
  loadingStandards,
  standardsControls,
  selectedAuditRunId,
  setSelectedAuditRunId,
  auditRunsList,
  loadingResults,
  auditResultsList,
  triggeringAudit,
  editingResultId,
  setEditingResultId,
  editResultStatus,
  setEditResultStatus,
  editExceptionReason,
  setEditExceptionReason,
  submittingVerification,
  handleTriggerAuditRun,
  fetchAuditResults,
  handleVerifyControlResult,
  sitesList,
  selectedSite,
  workspaceId,
  token,
}: StandardsTabProps) {
  const activeSite = sitesList.find(s => s.domain === selectedSite);
  const siteId = activeSite?.id;

  const [baseRunId, setBaseRunId] = React.useState('');
  const [compareRunId, setCompareRunId] = React.useState('');
  const [diffUrl, setDiffUrl] = React.useState('');
  const [comparedData, setComparedData] = React.useState<any>(null);
  const [loadingDiff, setLoadingDiff] = React.useState(false);
  const [diffError, setDiffError] = React.useState('');

  React.useEffect(() => {
    if (auditRunsList && auditRunsList.length > 0) {
      if (!baseRunId) {
        setBaseRunId(auditRunsList[0].id);
      }
      if (!compareRunId) {
        if (auditRunsList.length > 1) {
          setCompareRunId(auditRunsList[1].id);
        } else {
          setCompareRunId(auditRunsList[0].id);
        }
      }
    }
  }, [auditRunsList]);

  React.useEffect(() => {
    if (activeSite?.domain && !diffUrl) {
      setDiffUrl(`https://${activeSite.domain}/`);
    }
  }, [activeSite]);

  const runDiffComparison = async () => {
    if (!token || !workspaceId || !siteId) {
      setDiffError('Vui lòng chọn site và đảm bảo bạn đã đăng nhập.');
      return;
    }
    if (!baseRunId || !compareRunId) {
      setDiffError('Vui lòng chọn 2 phiên đánh giá để so sánh.');
      return;
    }
    setLoadingDiff(true);
    setDiffError('');
    setComparedData(null);

    try {
      const urlQuery = diffUrl ? `&url=${encodeURIComponent(diffUrl)}` : '';
      const response = await fetch(
        `http://localhost:3000/sites/${siteId}/crawls/compare?baseJobRunId=${baseRunId}&compareJobRunId=${compareRunId}${urlQuery}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-workspace-id': workspaceId,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Lỗi tải dữ liệu so sánh: HTTP ${response.status}`);
      }

      const data = await response.json();
      setComparedData(data);
    } catch (err: any) {
      setDiffError(err.message || 'Lỗi không xác định khi tải diff.');
    } finally {
      setLoadingDiff(false);
    }
  };

  const computeLineDiff = (base: string, compare: string) => {
    const baseLines = base ? base.split('\n') : [];
    const compareLines = compare ? compare.split('\n') : [];
    const diffItems: { type: 'added' | 'removed' | 'normal'; value: string; lineNumBase?: number; lineNumCompare?: number }[] = [];

    let i = 0, j = 0;
    while (i < baseLines.length || j < compareLines.length) {
      if (i < baseLines.length && j < compareLines.length) {
        if (baseLines[i] === compareLines[j]) {
          diffItems.push({ type: 'normal', value: baseLines[i], lineNumBase: i + 1, lineNumCompare: j + 1 });
          i++;
          j++;
        } else {
          let foundMatch = false;
          for (let k = 1; k <= 5; k++) {
            if (i + k < baseLines.length && baseLines[i + k] === compareLines[j]) {
              for (let m = 0; m < k; m++) {
                diffItems.push({ type: 'removed', value: baseLines[i + m], lineNumBase: i + m + 1 });
              }
              i += k;
              foundMatch = true;
              break;
            }
          }
          if (!foundMatch) {
            for (let k = 1; k <= 5; k++) {
              if (j + k < compareLines.length && baseLines[i] === compareLines[j + k]) {
                for (let m = 0; m < k; m++) {
                  diffItems.push({ type: 'added', value: compareLines[j + m], lineNumCompare: j + m + 1 });
                }
                j += k;
                foundMatch = true;
                break;
              }
            }
          }

          if (!foundMatch) {
            diffItems.push({ type: 'removed', value: baseLines[i], lineNumBase: i + 1 });
            diffItems.push({ type: 'added', value: compareLines[j], lineNumCompare: j + 1 });
            i++;
            j++;
          }
        }
      } else if (i < baseLines.length) {
        diffItems.push({ type: 'removed', value: baseLines[i], lineNumBase: i + 1 });
        i++;
      } else {
        diffItems.push({ type: 'added', value: compareLines[j], lineNumCompare: j + 1 });
        j++;
      }
    }
    return diffItems;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Top Navigation Options */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveStandardsTab('browser')}
          style={{
            padding: '0.6rem 1.2rem',
            background: activeStandardsTab === 'browser' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeStandardsTab === 'browser' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeStandardsTab === 'browser' ? 'var(--text-bright)' : 'var(--text-muted)',
            cursor: 'pointer',
            fontWeight: 650,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderRadius: '4px 4px 0 0',
            transition: 'all 0.2s ease',
          }}
        >
          <BookOpen size={16} />
          <span>Trình quản lý Tiêu chuẩn (Standards Browser)</span>
        </button>
        
        <button
          onClick={() => {
            setActiveStandardsTab('audit_runs');
            if (auditRunsList.length > 0 && !selectedAuditRunId) {
              setSelectedAuditRunId(auditRunsList[0].id);
            }
          }}
          style={{
            padding: '0.6rem 1.2rem',
            background: activeStandardsTab === 'audit_runs' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeStandardsTab === 'audit_runs' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeStandardsTab === 'audit_runs' ? 'var(--text-bright)' : 'var(--text-muted)',
            cursor: 'pointer',
            fontWeight: 655,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderRadius: '4px 4px 0 0',
            transition: 'all 0.2s ease',
          }}
        >
          <Activity size={16} />
          <span>Đánh giá Dự án (Audit Runs)</span>
        </button>
      </div>

      {/* View 1: Master standards checklist browser */}
      {activeStandardsTab === 'browser' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h2 className="jss-card-title">Duyệt Tiêu chuẩn SEO (Mavryk Master SEO Standards)</h2>
              <p className="jss-card-subtitle">
                Tra cứu các phiên cập nhật chuẩn hóa chiến dịch SEO được chứng thực bởi các tổ chức uy tín trên thế giới.
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Chọn phiên bản:</label>
              <div className="jss-site-selector-card" style={{ minWidth: '150px' }}>
                <Globe size={16} color="var(--accent-primary)" />
                <select
                  value={selectedVersionId}
                  onChange={(e) => setSelectedVersionId(e.target.value)}
                  className="jss-select-input"
                >
                  {standardsVersions.map((v) => (
                    <option key={v.id} value={v.id}>Phiên bản {v.version} ({v.status})</option>
                  ))}
                </select>
                <ChevronDown size={14} color="var(--text-secondary)" />
              </div>
            </div>
          </div>

          {loadingStandards ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
              <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
            </div>
          ) : standardsControls.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <AlertCircle size={32} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
              <p className="text-muted m-0">Không tìm thấy control hay module nào của phiên bản tiêu chuẩn này.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Render controls grouped by modules */}
              {Object.entries(
                standardsControls.reduce((acc: any, ctrl: any) => {
                  const modName = ctrl.moduleName || 'Khác';
                  if (!acc[modName]) acc[modName] = [];
                  acc[modName].push(ctrl);
                  return acc;
                }, {})
              ).map(([moduleName, controls]: [string, any]) => (
                <div key={moduleName} className="glass-card" style={{ padding: '1.5rem' }}>
                  <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                    <h3 className="jss-card-title" style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>{moduleName}</span>
                      <span style={{
                        background: 'rgba(255,255,255,0.06)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.75rem',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '3px',
                        fontWeight: 500
                      }}>{controls.length} tiêu chí</span>
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {controls.map((ctrl: any) => (
                      <div
                        key={ctrl.controlId}
                        style={{
                          padding: '1rem',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.04)',
                          borderRadius: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              background: 'rgba(99, 102, 241, 0.2)',
                              color: 'var(--accent-primary)'
                            }}>{ctrl.controlCode}</span>
                            
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              fontWeight: 650,
                              background: ctrl.controlPhase === 'P0' ? 'rgba(239, 68, 68, 0.15)' : ctrl.controlPhase === 'P1' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              color: ctrl.controlPhase === 'P0' ? 'var(--accent-red)' : ctrl.controlPhase === 'P1' ? 'var(--accent-orange)' : 'var(--accent-blue)'
                            }}>{ctrl.controlPhase} Priority</span>
                          </div>
                        </div>

                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-bright)', lineHeight: '1.4' }}>
                          {ctrl.controlDescription}
                        </p>

                        {/* Sources and authorities references */}
                        {ctrl.sources && ctrl.sources.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cơ sở tham chiếu:</span>
                            {ctrl.sources.map((src: any, idx: number) => (
                              <a
                                key={idx}
                                href={src.url || '#'}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.75rem',
                                  color: 'var(--accent-secondary)',
                                  textDecoration: 'none',
                                  background: 'rgba(168, 85, 247, 0.08)',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '3px',
                                  border: '1px solid rgba(168, 85, 247, 0.15)',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                <span>{src.name}</span>
                                <span className="text-tiny opacity-70">[{src.authorityLevel}]</span>
                                <ExternalLink size={10} />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View 2: Audit Runs management */}
      {activeStandardsTab === 'audit_runs' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 320px) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'flex-start' }}>
          
          {/* Left panel: Runs History & Trigger Action */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <h3 className="jss-card-title" style={{ marginBottom: '0.75rem' }}>Đánh giá Dự án</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label className="jss-form-label" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem' }}>Phiên bản chuẩn đối sánh:</label>
                  <select
                    value={selectedVersionId}
                    onChange={(e) => setSelectedVersionId(e.target.value)}
                    className="jss-form-input" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                  >
                    {standardsVersions.map((v) => (
                      <option key={v.id} value={v.id}>Phiên bản {v.version}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleTriggerAuditRun}
                  disabled={triggeringAudit || !selectedVersionId}
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    background: 'var(--accent-primary)',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: (triggeringAudit || !selectedVersionId) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    fontSize: '0.85rem',
                    opacity: (triggeringAudit || !selectedVersionId) ? 0.7 : 1,
                  }}
                >
                  {triggeringAudit ? (
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Search size={14} />
                  )}
                  <span>{triggeringAudit ? 'Đang khởi chạy...' : 'Khởi chạy Đánh giá mới'}</span>
                </button>
              </div>

              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 655 }}>Lịch sử Đánh giá</h4>
                
                {auditRunsList.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', margin: '1rem 0' }}>Chưa có lượt chạy kiểm toán tiêu chuẩn nào.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
                    {auditRunsList.map((run) => (
                      <button
                        key={run.id}
                        onClick={() => {
                          setSelectedAuditRunId(run.id);
                          fetchAuditResults(run.id);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: selectedAuditRunId === run.id ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255,255,255,0.02)',
                          border: selectedAuditRunId === run.id ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.04)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.2rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 655, color: selectedAuditRunId === run.id ? 'var(--text-bright)' : 'var(--text-secondary)' }}>
                            RUN-{run.id.substring(0, 6).toUpperCase()}
                          </span>
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '0.1rem 0.3rem',
                            borderRadius: '3px',
                            background: run.status === 'active' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.1)',
                            color: run.status === 'active' ? 'var(--accent-green)' : 'var(--text-secondary)'
                          }}>{run.status}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(run.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right panel: Results detail list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
            {!selectedAuditRunId ? (
              <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                <Activity size={32} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                <p style={{ color: 'var(--text-muted)' }}>Vui lòng chọn hoặc khởi chạy một lượt đánh giá tiêu chuẩn bên cột trái để xem chi tiết.</p>
              </div>
            ) : loadingResults ? (
              <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)', marginBottom: '0.5rem' }} />
                <p style={{ color: 'var(--text-muted)' }}>Đang tải danh sách kết quả checklist...</p>
              </div>
            ) : auditResultsList.length === 0 ? (
              <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                <AlertCircle size={32} color="var(--accent-orange)" style={{ marginBottom: '1rem' }} />
                <p style={{ color: 'var(--text-muted)' }}>Đang tạo hoặc không tìm thấy dữ liệu kết quả kiểm toán.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Summary dashboard of selected run results */}
                <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mã Chạy Kiểm Toán</h4>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-bright)', fontFamily: 'monospace' }}>RUN-{selectedAuditRunId.toUpperCase()}</div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Phiên bản: <strong style={{ color: 'var(--accent-primary)' }}>{auditResultsList[0]?.versionCode || 'Master v1.0'}</strong>
                    </span>
                  </div>

                  {/* Quick counts */}
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {[
                      { label: 'Cần Duyệt', value: auditResultsList.filter(r => r.result === 'NEED_DATA').length, color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.06)' },
                      { label: 'Đạt (PASS)', value: auditResultsList.filter(r => r.result === 'PASS').length, color: 'var(--accent-green)', bg: 'rgba(16, 185, 129, 0.1)' },
                      { label: 'Cảnh Báo', value: auditResultsList.filter(r => r.result === 'WARNING').length, color: 'var(--accent-orange)', bg: 'rgba(245, 158, 11, 0.1)' },
                      { label: 'Không Đạt (FAIL)', value: auditResultsList.filter(r => r.result === 'FAIL').length, color: 'var(--accent-red)', bg: 'rgba(239, 68, 68, 0.1)' },
                    ].map((stat, idx) => (
                      <div key={idx} style={{ padding: '0.5rem 0.75rem', background: stat.bg, borderRadius: '4px', textAlign: 'center', minWidth: '80px', border: `1px solid ${stat.color}20` }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Group and render results by modules */}
                {Object.entries(
                  auditResultsList.reduce((acc: any, res: any) => {
                    const modName = res.moduleName || 'Khác';
                    if (!acc[modName]) acc[modName] = [];
                    acc[modName].push(res);
                    return acc;
                  }, {})
                ).map(([moduleName, results]: [string, any]) => (
                  <div key={moduleName} className="glass-card" style={{ padding: '1.25rem' }}>
                    <h4 className="jss-card-title" style={{ color: 'var(--accent-primary)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem', marginBottom: '1rem', fontSize: '0.95rem' }}>
                      {moduleName}
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {results.map((res: any) => {
                        const isEditing = editingResultId === res.resultId;
                        
                        // Badge styling mapping
                        let badgeColor = 'var(--text-muted)';
                        let badgeBg = 'rgba(255, 255, 255, 0.06)';
                        if (res.result === 'PASS') {
                          badgeColor = 'var(--accent-green)';
                          badgeBg = 'rgba(16, 185, 129, 0.15)';
                        } else if (res.result === 'FAIL') {
                          badgeColor = 'var(--accent-red)';
                          badgeBg = 'rgba(239, 68, 68, 0.15)';
                        } else if (res.result === 'WARNING') {
                          badgeColor = 'var(--accent-orange)';
                          badgeBg = 'rgba(245, 158, 11, 0.15)';
                        } else if (res.result === 'ACCEPTED_RISK') {
                          badgeColor = 'var(--accent-blue)';
                          badgeBg = 'rgba(59, 130, 246, 0.15)';
                        }

                        return (
                          <div
                            key={res.resultId}
                            style={{
                              padding: '0.85rem',
                              background: 'rgba(255,255,255,0.01)',
                              border: '1px solid rgba(255,255,255,0.04)',
                              borderRadius: '5px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-bright)' }}>{res.controlCode}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>| {res.controlPhase}</span>
                              </div>
                              
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 650,
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                color: badgeColor,
                                background: badgeBg,
                                border: `1px solid ${badgeColor}30`,
                                textTransform: 'uppercase'
                              }}>{res.result}</span>
                            </div>

                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                              {res.controlDescription}
                            </p>

                            {/* Exception information if any */}
                            {res.exceptionReason && (
                              <div style={{
                                marginTop: '0.25rem',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                background: 'rgba(168, 85, 247, 0.06)',
                                borderLeft: '3px solid var(--accent-secondary)',
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)'
                              }}>
                                <strong>Ghi chú / Ngoại lệ:</strong> {res.exceptionReason}
                                {res.reviewerEmail && ` (Xác minh bởi: ${res.reviewerEmail})`}
                              </div>
                            )}

                            {/* Manual review controls */}
                            {editingResultId !== res.resultId ? (
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                                <button
                                  onClick={() => {
                                    setEditingResultId(res.resultId);
                                    setEditResultStatus(res.result === 'NEED_DATA' ? 'PASS' : res.result);
                                    setEditExceptionReason(res.exceptionReason || '');
                                  }}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--accent-secondary)',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    fontWeight: 650,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.2rem',
                                    opacity: 0.8,
                                    padding: '0.1rem 0.2rem'
                                  }}
                                >
                                  <Settings size={12} />
                                  <span>Cập nhật kết quả / Ghi chú ngoại lệ</span>
                                </button>
                              </div>
                            ) : (
                              <div style={{
                                marginTop: '0.75rem',
                                padding: '0.75rem',
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px dashed rgba(255, 255, 255, 0.1)',
                                borderRadius: '4px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.65rem'
                              }}>
                                <h5 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-bright)' }}>Xác thực thủ công tiêu chí {res.controlCode}</h5>
                                
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Kết quả đánh giá:</label>
                                  <div className="jss-site-selector-card" style={{ minWidth: '130px', padding: '0.25rem 0.5rem' }}>
                                    <select
                                      value={editResultStatus}
                                      onChange={(e) => setEditResultStatus(e.target.value)}
                                      className="jss-select-input" style={{ fontSize: '0.75rem' }}
                                    >
                                      <option value="PASS">PASS (Đạt)</option>
                                      <option value="FAIL">FAIL (Không đạt)</option>
                                      <option value="WARNING">WARNING (Cảnh báo)</option>
                                      <option value="ACCEPTED_RISK">ACCEPTED RISK (Chấp nhận rủi ro)</option>
                                    </select>
                                    <ChevronDown size={12} color="var(--text-secondary)" />
                                  </div>
                                </div>

                                <div>
                                  <label className="jss-form-label" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                    Mô tả chi tiết / Lý do chấp nhận ngoại lệ
                                  </label>
                                  <textarea
                                    value={editExceptionReason}
                                    onChange={(e) => setEditExceptionReason(e.target.value)}
                                    placeholder="Nêu rõ lý do hoặc kết quả đo kiểm, liên kết hồ sơ chi tiết đối sánh nếu có..."
                                    className="jss-form-input" style={{ height: '60px', padding: '0.4rem', fontSize: '0.8rem' }}
                                  />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                  <button
                                    onClick={() => setEditingResultId(null)}
                                    disabled={submittingVerification}
                                    style={{
                                      padding: '0.3rem 0.6rem',
                                      background: 'rgba(255, 255, 255, 0.05)',
                                      border: '1px solid rgba(255, 255, 255, 0.1)',
                                      borderRadius: '3px',
                                      color: 'var(--text-secondary)',
                                      cursor: 'pointer',
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    Hủy
                                  </button>
                                  
                                  <button
                                    onClick={() => handleVerifyControlResult(res.resultId)}
                                    disabled={submittingVerification}
                                    style={{
                                      padding: '0.3rem 0.6rem',
                                      background: 'var(--accent-primary)',
                                      border: 'none',
                                      borderRadius: '3px',
                                      color: '#fff',
                                      cursor: submittingVerification ? 'not-allowed' : 'pointer',
                                      fontSize: '0.75rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.2rem'
                                    }}
                                  >
                                    {submittingVerification && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                                    <span>Lưu thay đổi</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {/* Visual HTML Diff Regression section */}
                <div className="glass-card diff-container" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
                  <h3 className="jss-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                    <Activity size={18} color="var(--accent-primary)" />
                    <span>So sánh HTML Regression (Visual Code Diff)</span>
                  </h3>
                  <p className="jss-card-subtitle" style={{ margin: 0 }}>
                    So sánh mã HTML thô giữa hai phiên crawl để phát hiện sự thay đổi cấu trúc trang hoặc code regression.
                  </p>

                  <div className="diff-options-bar">
                    <div className="diff-option-col">
                      <label className="jss-form-label" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem' }}>Phiên bản gốc (Base Run):</label>
                      <div className="diff-selector-card jss-site-selector-card" style={{ width: '100%', padding: '0.35rem 0.5rem' }}>
                        <select
                          value={baseRunId}
                          onChange={(e) => setBaseRunId(e.target.value)}
                          className="jss-select-input" style={{ fontSize: '0.8rem' }}
                        >
                          <option value="">-- Chọn Base Run --</option>
                          {auditRunsList.map((run) => (
                            <option key={run.id} value={run.id}>
                              RUN-{run.id.substring(0, 6).toUpperCase()} ({new Date(run.createdAt).toLocaleDateString()})
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} color="var(--text-secondary)" />
                      </div>
                    </div>

                    <div className="diff-option-col">
                      <label className="jss-form-label" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem' }}>Phiên bản so sánh (Compare Run):</label>
                      <div className="diff-selector-card jss-site-selector-card" style={{ width: '100%', padding: '0.35rem 0.5rem' }}>
                        <select
                          value={compareRunId}
                          onChange={(e) => setCompareRunId(e.target.value)}
                          className="jss-select-input" style={{ fontSize: '0.8rem' }}
                        >
                          <option value="">-- Chọn Compare Run --</option>
                          {auditRunsList.map((run) => (
                            <option key={run.id} value={run.id}>
                              RUN-{run.id.substring(0, 6).toUpperCase()} ({new Date(run.createdAt).toLocaleDateString()})
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} color="var(--text-secondary)" />
                      </div>
                    </div>

                    <div className="diff-option-col-wide">
                      <label className="jss-form-label" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem' }}>URL trang so sánh (Bỏ trống = Trang chủ):</label>
                      <input
                        type="text"
                        value={diffUrl}
                        onChange={(e) => setDiffUrl(e.target.value)}
                        placeholder={`ví dụ: https://${activeSite?.domain || 'site.com'}/about`}
                        className="jss-form-input" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                      />
                    </div>

                    <button
                      onClick={runDiffComparison}
                      disabled={loadingDiff || !baseRunId || !compareRunId}
                      className="diff-button"
                    >
                      {loadingDiff ? (
                        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Activity size={14} />
                      )}
                      <span>So sánh</span>
                    </button>
                  </div>

                  {diffError && (
                    <div className="diff-alert-error">
                      <AlertCircle size={14} />
                      <span>{diffError}</span>
                    </div>
                  )}

                  {comparedData && (
                    <div className="diff-result-wrapper">
                      <div className="diff-result-header">
                        <span className="diff-result-url">
                          Đang so sánh URL: <strong>{comparedData.url}</strong>
                        </span>
                        <span className="diff-result-badge">
                          HTML LINE-BY-LINE DIFF
                        </span>
                      </div>

                      <div className="diff-code-panel">
                        {(() => {
                          const diffLines = computeLineDiff(comparedData.baseHtml, comparedData.compareHtml);
                          if (diffLines.length === 0) {
                            return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem', fontStyle: 'italic' }}>Mã HTML của 2 trang giống hệt nhau hoặc không tìm thấy dữ liệu.</div>;
                          }
                          return diffLines.map((line, idx) => {
                            let lineClass = "diff-code-line diff-code-line-normal";
                            let prefix = " ";
                            if (line.type === 'added') {
                              lineClass = "diff-code-line diff-code-line-added";
                              prefix = '+';
                            } else if (line.type === 'removed') {
                              lineClass = "diff-code-line diff-code-line-removed";
                              prefix = '-';
                            }
                            return (
                              <div key={idx} className={lineClass}>
                                <span className="diff-line-number">
                                  {line.type === 'added' ? line.lineNumCompare : line.lineNumBase}
                                </span>
                                <span className={line.type === 'normal' ? 'diff-line-prefix diff-line-prefix-normal' : 'diff-line-prefix'}>{prefix}</span>
                                <span className="diff-line-content">{line.value}</span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
