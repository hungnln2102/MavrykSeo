import React, { useState, useEffect } from 'react';
import { X, Activity, FileText, CheckCircle, AlertTriangle, Globe, Cpu, Image, Terminal, ArrowRight, CornerDownRight, Loader2 } from 'lucide-react';

interface TechnicalDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobRunId: string;
  siteId: string;
  siteDomain: string;
  token: string | null;
  workspaceId: string | null;
}

export default function TechnicalDetailsModal({
  isOpen,
  onClose,
  jobRunId,
  siteId,
  siteDomain,
  token,
  workspaceId,
}: TechnicalDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'render' | 'sitemaps' | 'webvitals' | 'urls'>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>({
    crawlUrlObservations: [],
    sitemapObservations: [],
    renderObservations: [],
    pagespeedObservations: [],
  });

  const [selectedPageUrl, setSelectedPageUrl] = useState<string>('');
  const [screenshotSrc, setScreenshotSrc] = useState<string | null>(null);
  const [loadingScreenshot, setLoadingScreenshot] = useState(false);

  useEffect(() => {
    if (isOpen && jobRunId && siteId) {
      fetchDetails();
    }
  }, [isOpen, jobRunId, siteId]);

  // Read URL explorer change to pull corresponding screenshots and PSI data
  useEffect(() => {
    if (selectedPageUrl && isOpen) {
      loadPageScreenshot(selectedPageUrl);
    }
  }, [selectedPageUrl]);

  const fetchDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `http://localhost:3000/sites/${siteId}/crawls/${jobRunId}/technical-details`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-workspace-id': workspaceId || '',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load technical details: HTTP ${response.status}`);
      }

      const resData = await response.json();
      setData(resData);
      
      // Auto-select first URL from crawl observations
      if (resData.crawlUrlObservations && resData.crawlUrlObservations.length > 0) {
        const primary = resData.crawlUrlObservations[0].url;
        setSelectedPageUrl(primary);
      } else {
        setSelectedPageUrl(`https://${siteDomain}/`);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi không xác định khi tải dữ liệu kĩ thuật.');
    } finally {
      setLoading(false);
    }
  };

  const loadPageScreenshot = async (url: string) => {
    setLoadingScreenshot(true);
    setScreenshotSrc(null);
    try {
      const response = await fetch(
        `http://localhost:3000/sites/${siteId}/crawls/${jobRunId}/screenshot?url=${encodeURIComponent(url)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-workspace-id': workspaceId || '',
          },
        }
      );
      if (response.ok) {
        const blob = await response.blob();
        setScreenshotSrc(URL.createObjectURL(blob));
      }
    } catch (err) {
      console.error('Failed to load screen buffer:', err);
    } finally {
      setLoadingScreenshot(false);
    }
  };

  if (!isOpen) return null;

  // Compute stats helper
  const successPages = data.crawlUrlObservations.filter((p: any) => p.status_code === 200).length;
  const redirectPages = data.crawlUrlObservations.filter((p: any) => p.status_code >= 300 && p.status_code < 400).length;
  const errorPages = data.crawlUrlObservations.filter((p: any) => p.status_code >= 400).length;
  
  // Find current rendering observation
  const currentRender = data.renderObservations.find((r: any) => r.url === selectedPageUrl) || data.renderObservations[0];
  // Find current pagespeed observation
  const currentPSI = data.pagespeedObservations.find((p: any) => p.url === selectedPageUrl) || data.pagespeedObservations[0];

  // Core Web Vitals thresholds
  const getFcpStatus = (val: number) => {
    if (val <= 1800) return { label: 'GOOD', color: 'var(--accent-green)', bg: 'rgba(16,185,129,0.1)' };
    if (val <= 3000) return { label: 'NEEDS EXP', color: 'var(--accent-orange)', bg: 'rgba(245,158,11,0.1)' };
    return { label: 'POOR', color: 'var(--accent-red)', bg: 'rgba(239, 68, 68, 0.1)' };
  };

  const getLcpStatus = (val: number) => {
    if (val <= 2500) return { label: 'GOOD', color: 'var(--accent-green)', bg: 'rgba(16,185,129,0.1)' };
    if (val <= 4000) return { label: 'NEEDS EXP', color: 'var(--accent-orange)', bg: 'rgba(245,158,11,0.1)' };
    return { label: 'POOR', color: 'var(--accent-red)', bg: 'rgba(239, 68, 68, 0.1)' };
  };

  const getClsStatus = (val: number) => {
    if (val <= 0.1) return { label: 'GOOD', color: 'var(--accent-green)', bg: 'rgba(16,185,129,0.1)' };
    if (val <= 0.25) return { label: 'NEEDS EXP', color: 'var(--accent-orange)', bg: 'rgba(245,158,11,0.1)' };
    return { label: 'POOR', color: 'var(--accent-red)', bg: 'rgba(239, 68, 68, 0.1)' };
  };

  const getPsiScoreColor = (score: number) => {
    if (score >= 90) return 'var(--accent-green)';
    if (score >= 50) return 'var(--accent-orange)';
    return 'var(--accent-red)';
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(5, 5, 8, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '2rem',
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '1200px',
        height: '85vh',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        background: 'rgba(21, 23, 30, 0.95)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.01)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-bright)', fontWeight: 700 }}>
                Chi tiết Kỹ thuật SEO & Kiểm toán Code
              </h3>
              <span style={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--accent-primary)',
                fontWeight: 650
              }}>
                RUN-{jobRunId.substring(0, 8).toUpperCase()}
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Site: <strong style={{ color: 'var(--text-bright)' }}>{siteDomain}</strong>
            </p>
          </div>

          <button onClick={onClose} style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            transition: 'all 0.2s ease',
          }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
             onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}>
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '1rem' }}>
            <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Đang nạp báo kĩ thuật ClickHouse...</span>
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '2rem' }}>
            <AlertTriangle size={36} color="var(--accent-red)" style={{ marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-bright)', margin: 0 }}>Có lỗi xảy ra khi load dữ liệu.</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            
            {/* Sidebar navigation */}
            <div style={{
              width: '240px',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '1rem 0'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0 0.75rem' }}>
                {[
                  { id: 'overview', title: 'Tổng quan (Overview)', icon: Activity },
                  { id: 'render', title: 'Chromium Render', icon: Image },
                  { id: 'sitemaps', title: 'Sitemaps & Robots', icon: Globe },
                  { id: 'webvitals', title: 'Core Web Vitals', icon: Cpu },
                  { id: 'urls', title: 'Hồ sơ URLs / Explorer', icon: FileText },
                ].map((t) => {
                  const Icon = t.icon;
                  const isSelected = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id as any)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                        border: 'none',
                        borderLeft: isSelected ? '3px solid var(--accent-primary)' : '3px solid transparent',
                        borderRadius: '0 4px 4px 0',
                        color: isSelected ? 'var(--text-bright)' : 'var(--text-muted)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontWeight: isSelected ? 650 : 500,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Icon size={16} color={isSelected ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                      <span>{t.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* URL selector indicator for the dynamic page preview */}
              <div style={{ padding: '0 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trang đang kiểm tra:</span>
                <div style={{
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  padding: '0.4rem',
                  borderRadius: '4px',
                  color: 'var(--accent-secondary)',
                  wordBreak: 'break-all',
                }}>
                  {selectedPageUrl.replace(`https://${siteDomain}`, '') || '/'}
                </div>
              </div>
            </div>

            {/* Content pane */}
            <div style={{ flex: 1, padding: '1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Headline Stats cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tổng số URLs Crawford</span>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-bright)', marginTop: '0.25rem' }}>
                        {data.crawlUrlObservations.length}
                      </div>
                    </div>
                    
                    <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center', border: '1px solid rgba(16,185,129,0.1)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Thành công (200 OK)</span>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-green)', marginTop: '0.25rem' }}>
                        {successPages}
                      </div>
                    </div>

                    <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center', border: '1px solid rgba(245,158,11,0.1)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Redirects (3xx)</span>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-orange)', marginTop: '0.25rem' }}>
                        {redirectPages}
                      </div>
                    </div>

                    <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center', border: '1px solid rgba(239,68,68,0.1)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Lỗi HTTP (4xx/5xx)</span>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-red)', marginTop: '0.25rem' }}>
                        {errorPages}
                      </div>
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--accent-primary)', fontSize: '0.95rem', fontWeight: 650 }}>
                      Thuộc tính Tải trang đầu (Front Page Metrics)
                    </h4>
                    
                    {data.crawlUrlObservations.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Không có log URL nào.</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Kích thước File HTML thô:</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-bright)', fontFamily: 'monospace' }}>
                              {(data.crawlUrlObservations[0]?.page_size_bytes || 0).toLocaleString()} bytes
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Kích thước HTML Dynamic:</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-bright)', fontFamily: 'monospace' }}>
                              {(currentRender?.dynamic_html_length || 0).toLocaleString()} bytes
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Độ lệch Tiêu đề (Title Mismatch):</span>
                            <span style={{
                              fontSize: '0.8rem',
                              color: currentRender?.title_mismatch ? 'var(--accent-red)' : 'var(--accent-green)',
                              fontWeight: 650
                            }}>
                              {currentRender?.title_mismatch ? 'Phát hiện sự sai lệch' : 'Khớp tiêu đề (Khớp)'}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Thời gian phản hồi thô (Load Time):</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-bright)', fontFamily: 'monospace' }}>
                              {data.crawlUrlObservations[0]?.load_time_ms} ms
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Số lượng từ (Word Count):</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-bright)', fontFamily: 'monospace' }}>
                              {data.crawlUrlObservations[0]?.word_count} từ
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mật độ chữ so sánh (Text Parity):</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: 650, fontFamily: 'monospace' }}>
                              {currentRender?.text_parity_percent}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: CHROMIUM RENDER */}
              {activeTab === 'render' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', height: '100%', minHeight: '400px' }}>
                  {/* Left Column: Screenshot */}
                  <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '1rem', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Image size={14} color="var(--accent-primary)" />
                        Ảnh Chụp DOM headless browser
                      </span>
                    </div>

                    <div style={{
                      flex: 1,
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: '4px',
                      border: '1px solid rgba(255,255,255,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative',
                      minHeight: '260px'
                    }}>
                      {loadingScreenshot ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đang tải screenshot...</span>
                        </div>
                      ) : screenshotSrc ? (
                        <img
                          src={screenshotSrc}
                          alt="DOM render"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            display: 'block',
                          }}
                        />
                      ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          Ảnh screenshot không khả dụng cho trang này.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Parity & Console Logs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="glass-card" style={{ padding: '1.25rem' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tương quan nội dung dynamic vs static</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          fontSize: '1.8rem',
                          fontWeight: 800,
                          color: 'var(--accent-green)',
                          fontFamily: 'monospace'
                        }}>
                          {currentRender?.text_parity_percent ?? 100}%
                        </div>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                          Mức tương đồng của dữ liệu văn bản thuần túy được trích xuất. Độ lệch thấp chỉ ra rằng bot crawl dạng text-based (như HTML thô) có thể đọc trọn vẹn nội dung mà không cần render Javascript tốn tài nguyên.
                        </p>
                      </div>
                    </div>

                    <div className="glass-card" style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                        <Terminal size={14} color="var(--accent-orange)" />
                        Console Error Logs ({currentRender?.console_errors?.length || 0} issues)
                      </span>

                      <div style={{
                        flex: 1,
                        background: '#0a0a0f',
                        padding: '0.75rem',
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        color: '#d1d1d8',
                        borderRadius: '4px',
                        overflowY: 'auto',
                        border: '1px solid rgba(255,255,255,0.06)',
                        maxHeight: '200px'
                      }}>
                        {(!currentRender || !currentRender.console_errors || currentRender.console_errors.length === 0) ? (
                          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Không ghi nhận console error nào khi chạy Chromium.</div>
                        ) : (
                          currentRender.console_errors.map((err: string, i: number) => (
                            <div key={i} style={{
                              color: 'var(--accent-red)',
                              borderBottom: '1px solid rgba(255,255,255,0.02)',
                              paddingBottom: '0.25rem',
                              marginBottom: '0.25rem',
                              wordBreak: 'break-all'
                            }}>
                              <span style={{ color: 'var(--text-muted)' }}>[{i+1}]</span> {err}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SITEMAPS */}
              {activeTab === 'sitemaps' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Globe size={16} color="var(--accent-primary)" />
                      Chỉ mục sitemap.xml
                    </h4>
                    
                    {data.sitemapObservations.length === 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-orange)', fontSize: '0.8rem', padding: '0.5rem', background: 'rgba(245,158,11,0.05)', borderRadius: '4px' }}>
                        <AlertTriangle size={14} />
                        <span>Không tìm thấy bản ghi Sitemap nào cho JobRun này trong ClickHouse.</span>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        Sitemap URL được phát hiện: <strong style={{ color: 'var(--text-bright)' }}>{data.sitemapObservations[0]?.sitemap_url}</strong>
                      </div>
                    )}
                  </div>

                  <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tệp liên kết thu thập trong Sitemap ({data.sitemapObservations.length} URLs)</span>
                    
                    <div style={{
                      marginTop: '0.75rem',
                      maxHeight: '260px',
                      overflowY: 'auto',
                      border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: '4px'
                    }}>
                      {data.sitemapObservations.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', padding: '1rem', textAlign: 'center', margin: 0 }}>Không có liên kết sitemap.</p>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                          <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                              <th style={{ padding: '0.6rem 1rem', color: 'var(--text-secondary)' }}>Sitemap URL</th>
                              <th style={{ padding: '0.6rem 1rem', color: 'var(--text-secondary)' }}>Discovered URL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.sitemapObservations.map((s: any, idx: number) => (
                              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{s.sitemap_url}</td>
                                <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', color: 'var(--accent-secondary)' }}>{s.crawled_url}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: WEB VITALS */}
              {activeTab === 'webvitals' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Google PSI Scores */}
                  <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: 'var(--accent-primary)', fontWeight: 650 }}>
                      Google PageSpeed Insights Lab Scores (Mobile Device)
                    </h4>
                    
                    {!currentPSI ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                        PSI metrics are queueing or Pagespeed API key is missing.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                          {[
                            { label: 'Performance', score: currentPSI.performance_score },
                            { label: 'Accessibility', score: currentPSI.accessibility_score },
                            { label: 'Best Practices', score: currentPSI.best_practices_score },
                            { label: 'SEO', score: currentPSI.seo_score },
                          ].map((metric, idx) => (
                            <div key={idx} style={{
                              padding: '1rem',
                              background: 'rgba(255,255,255,0.01)',
                              border: `1px solid ${getPsiScoreColor(metric.score)}25`,
                              borderRadius: '6px',
                              textAlign: 'center'
                            }}>
                              <div style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                border: `4px solid ${getPsiScoreColor(metric.score)}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 0.5rem auto',
                                fontSize: '1.25rem',
                                fontWeight: 800,
                                color: getPsiScoreColor(metric.score)
                              }}>
                                {metric.score}
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 550 }}>{metric.label}</span>
                            </div>
                          ))}
                        </div>

                        {/* Core Web Vitals Key indicators */}
                        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.25rem' }}>
                          <h5 style={{ margin: '0 0 0.85rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Core Web Vitals Metrics</h5>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                            {/* FCP */}
                            <div style={{ padding: '0.75rem', borderRadius: '4px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>First Contentful Paint (FCP)</div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                                <span style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace' }}>{(currentPSI.fcp_ms / 1000).toFixed(1)}s</span>
                                <span style={{
                                  fontSize: '0.65rem',
                                  padding: '0.1rem 0.3rem',
                                  borderRadius: '3px',
                                  color: getFcpStatus(currentPSI.fcp_ms).color,
                                  background: getFcpStatus(currentPSI.fcp_ms).bg,
                                  fontWeight: 650
                                }}>{getFcpStatus(currentPSI.fcp_ms).label}</span>
                              </div>
                            </div>

                            {/* LCP */}
                            <div style={{ padding: '0.75rem', borderRadius: '4px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Largest Contentful Paint (LCP)</div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                                <span style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace' }}>{(currentPSI.lcp_ms / 1000).toFixed(1)}s</span>
                                <span style={{
                                  fontSize: '0.65rem',
                                  padding: '0.1rem 0.3rem',
                                  borderRadius: '3px',
                                  color: getLcpStatus(currentPSI.lcp_ms).color,
                                  background: getLcpStatus(currentPSI.lcp_ms).bg,
                                  fontWeight: 650
                                }}>{getLcpStatus(currentPSI.lcp_ms).label}</span>
                              </div>
                            </div>

                            {/* CLS */}
                            <div style={{ padding: '0.75rem', borderRadius: '4px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cumulative Layout Shift (CLS)</div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                                <span style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace' }}>{currentPSI.cls.toFixed(3)}</span>
                                <span style={{
                                  fontSize: '0.65rem',
                                  padding: '0.1rem 0.3rem',
                                  borderRadius: '3px',
                                  color: getClsStatus(currentPSI.cls).color,
                                  background: getClsStatus(currentPSI.cls).bg,
                                  fontWeight: 650
                                }}>{getClsStatus(currentPSI.cls).label}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: URL EXPLORER */}
              {activeTab === 'urls' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Chi tiết quan trắc SEO URLs ({data.crawlUrlObservations.length} crawled)</span>
                  
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '5px',
                    maxHeight: '380px'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Status</th>
                          <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>URL Path</th>
                          <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Robots</th>
                          <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Canonical Tag</th>
                          <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Redirect Chain</th>
                          <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Issues</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.crawlUrlObservations.map((o: any, idx: number) => {
                          const isSelected = selectedPageUrl === o.url;
                          const showRedirect = o.redirect_chain && o.redirect_chain.length > 0;
                          
                          // Style status code
                          let scColor = 'var(--text-secondary)';
                          let scBg = 'rgba(255,255,255,0.05)';
                          if (o.status_code === 200) {
                            scColor = 'var(--accent-green)';
                            scBg = 'rgba(16, 185, 129, 0.12)';
                          } else if (o.status_code >= 300 && o.status_code < 400) {
                            scColor = 'var(--accent-orange)';
                            scBg = 'rgba(245, 158, 11, 0.12)';
                          } else if (o.status_code >= 400) {
                            scColor = 'var(--accent-red)';
                            scBg = 'rgba(239, 68, 68, 0.12)';
                          }

                          return (
                            <tr
                              key={idx}
                              onClick={() => setSelectedPageUrl(o.url)}
                              style={{
                                borderBottom: '1px solid rgba(255,255,255,0.02)',
                                cursor: 'pointer',
                                background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                                transition: 'background 0.15s ease'
                              }}
                              onMouseEnter={(e) => { if(!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                              onMouseLeave={(e) => { if(!isSelected) e.currentTarget.style.background = 'transparent'; }}
                            >
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '0.2rem 0.4rem',
                                  borderRadius: '3px',
                                  color: scColor,
                                  background: scBg,
                                }}>{o.status_code}</span>
                              </td>
                              <td style={{ padding: '0.75rem 1rem', fontWeight: 550, color: 'var(--text-bright)' }}>
                                <div style={{ fontFamily: 'monospace' }}>{o.url.replace(`https://${siteDomain}`, '') || '/'}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{o.title || '(No Title)'}</div>
                              </td>
                              <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                {o.robots_meta || 'index, follow'}
                              </td>
                              <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: o.canonical_url && o.canonical_url !== o.url ? 'var(--accent-orange)' : 'var(--text-muted)' }}>
                                {o.canonical_url ? o.canonical_url.replace(`https://${siteDomain}`, '') : 'None'}
                              </td>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                {showRedirect ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                    {o.redirect_chain.map((link: string, lIdx: number) => (
                                      <div key={lIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                        <CornerDownRight size={10} color="var(--accent-orange)" />
                                        <span style={{ fontFamily: 'monospace' }}>{link.replace(`https://${siteDomain}`, '')}</span>
                                        {o.redirect_status_codes && o.redirect_status_codes[lIdx] && (
                                          <span style={{ color: 'var(--accent-orange)' }}>({o.redirect_status_codes[lIdx]})</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No redirects</span>
                                )}
                              </td>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                {o.issues && o.issues.length > 0 ? (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                    {o.issues.map((issue: string, iIdx: number) => (
                                      <span key={iIdx} style={{
                                        fontSize: '0.65rem',
                                        padding: '0.1rem 0.3rem',
                                        borderRadius: '3px',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        color: 'var(--accent-red)',
                                        border: '1px solid rgba(239, 68, 68, 0.15)',
                                      }}>{issue.replace(/_/g, ' ')}</span>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--accent-green)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem' }}>
                                    <CheckCircle size={10} /> pass
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
