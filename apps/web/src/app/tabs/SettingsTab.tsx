import React, { useState, useEffect, useCallback } from 'react';
import { Globe, RefreshCw, Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

interface SettingsTabProps {
  projectName: string;
  setProjectName: (val: string) => void;
  workspaceId: string | null;
  isGscConnected: boolean;
  setIsGscConnected: (val: boolean) => void;
  workspacePlan: string;
  handleTogglePlan: () => Promise<void>;
  sitesList: any[];
  keywordsList: any[];
  contentPlansList: any[];
  membersList: any[];
  newMemberEmail: string;
  setNewMemberEmail: (val: string) => void;
  newMemberRole: string;
  setNewMemberRole: (val: string) => void;
  handleAddMember: (e: React.FormEvent) => Promise<void>;
  activeSite: any;
  token: string | null;
  projectId: string | null;
}

interface GscProperty {
  siteUrl: string;
  permissionLevel: string;
}

interface GscSyncStatus {
  connectionStatus: string;
  state: string;
  lastSuccessfulSyncAt: string | null;
  freshness: { ageSeconds: number | null; isStale: boolean };
  lastErrorMessage: string | null;
}

export default function SettingsTab({
  projectName,
  setProjectName,
  workspaceId,
  isGscConnected,
  setIsGscConnected,
  workspacePlan,
  handleTogglePlan,
  sitesList,
  keywordsList,
  contentPlansList,
  membersList,
  newMemberEmail,
  setNewMemberEmail,
  newMemberRole,
  setNewMemberRole,
  handleAddMember,
  activeSite,
  token,
  projectId,
}: SettingsTabProps) {

  const [gscLoading, setGscLoading] = useState(false);
  const [gscProperties, setGscProperties] = useState<GscProperty[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<GscSyncStatus | null>(null);
  const [gscError, setGscError] = useState<string>('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [propertyLoading, setPropertyLoading] = useState(false);

  const API_BASE = 'http://localhost:3000';

  const headers = useCallback(() => ({
    'Authorization': `Bearer ${token}`,
    'x-workspace-id': workspaceId || '',
    'Content-Type': 'application/json',
  }), [token, workspaceId]);

  // Fetch GSC sync status on mount and when projectId changes
  const fetchGscStatus = useCallback(async () => {
    if (!token || !projectId || !workspaceId) return;
    try {
      const res = await fetch(
        `${API_BASE}/projects/${projectId}/integrations/google-search-console/sync-status`,
        { headers: headers() }
      );
      if (res.ok) {
        const data: GscSyncStatus = await res.json();
        setSyncStatus(data);
        setIsGscConnected(data.connectionStatus === 'active');

        // If connected, also load properties
        if (data.connectionStatus === 'active') {
          fetchProperties();
        }
      } else if (res.status === 404) {
        // No integration found - not connected
        setSyncStatus(null);
        setIsGscConnected(false);
      }
    } catch {
      // Silently ignore - might not be set up yet
    }
  }, [token, projectId, workspaceId]);

  const fetchProperties = useCallback(async () => {
    if (!token || !projectId || !workspaceId) return;
    try {
      setPropertyLoading(true);
      const res = await fetch(
        `${API_BASE}/projects/${projectId}/integrations/google-search-console/properties`,
        { headers: headers() }
      );
      if (res.ok) {
        const data = await res.json();
        setGscProperties(data.properties || []);
      }
    } catch {
      // ignore
    } finally {
      setPropertyLoading(false);
    }
  }, [token, projectId, workspaceId]);

  useEffect(() => {
    fetchGscStatus();
  }, [fetchGscStatus]);

  // Handle GSC OAuth authorize redirect
  const handleGscConnect = async () => {
    if (!token || !projectId || !workspaceId) {
      setGscError('Vui lòng đăng nhập và chọn dự án trước.');
      return;
    }
    setGscLoading(true);
    setGscError('');
    try {
      const res = await fetch(
        `${API_BASE}/projects/${projectId}/integrations/google-search-console/authorize`,
        { headers: headers() }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.authorizationUrl) {
        // Redirect to Google OAuth consent screen
        window.location.href = data.authorizationUrl;
      } else {
        throw new Error('Không nhận được URL ủy quyền từ server.');
      }
    } catch (err: any) {
      setGscError(err.message || 'Không thể kết nối Google Search Console.');
      setGscLoading(false);
    }
  };

  // Handle property selection
  const handleSelectProperty = async (siteUrl: string) => {
    if (!token || !projectId || !workspaceId || !siteUrl) return;
    setPropertyLoading(true);
    setGscError('');
    try {
      const res = await fetch(
        `${API_BASE}/projects/${projectId}/integrations/google-search-console/property`,
        {
          method: 'PUT',
          headers: headers(),
          body: JSON.stringify({ siteUrl }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setSelectedProperty(data.selectedProperty || siteUrl);
      // Refresh status
      await fetchGscStatus();
    } catch (err: any) {
      setGscError(err.message || 'Không thể chọn property.');
    } finally {
      setPropertyLoading(false);
    }
  };

  // Handle data sync request — inline sync via API (not worker queue)
  const handleSyncData = async () => {
    if (!token || !projectId || !workspaceId) return;
    setSyncLoading(true);
    setGscError('');
    try {
      const res = await fetch(
        `${API_BASE}/projects/${projectId}/gsc-sync`,
        {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({}),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      const result = await res.json();
      if (result.synced) {
        alert(`✅ Đồng bộ thành công! Đã lấy ${result.queryRowsCount} query rows và ${result.pageRowsCount} page rows từ Google Search Console thật.`);
      } else {
        setGscError(`Đồng bộ thất bại: ${result.reason}`);
      }
      // Refresh status after sync
      await fetchGscStatus();
    } catch (err: any) {
      setGscError(err.message || 'Không thể yêu cầu đồng bộ.');
    } finally {
      setSyncLoading(false);
    }
  };

  // Handle revoke/disconnect
  const handleGscRevoke = async () => {
    if (!token || !projectId || !workspaceId) return;
    if (!confirm('Bạn có chắc chắn muốn ngắt kết nối Google Search Console?')) return;
    setGscLoading(true);
    setGscError('');
    try {
      const res = await fetch(
        `${API_BASE}/projects/${projectId}/integrations/google-search-console/revoke`,
        {
          method: 'POST',
          headers: headers(),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      setIsGscConnected(false);
      setGscProperties([]);
      setSelectedProperty('');
      setSyncStatus(null);
    } catch (err: any) {
      setGscError(err.message || 'Không thể ngắt kết nối.');
    } finally {
      setGscLoading(false);
    }
  };

  return (
    <div className="content-planner__element-41--auto-41">
      {/* General & Integrations */}
      <div className="keyword-tracker__element-60--auto-60">
        
        {/* Project settings card */}
        <div className="glass-card glass-card--padded">
          <h3 className="card-header__title" style={{ marginBottom: '1rem' }}>Cấu hình Dự án (Project Config)</h3>
          <div className="font-size-md">
            <div>
              <label className="jss-form-label">Tên dự án hiện tại</label>
              <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} className="dashboard-form__input" />
            </div>
            <div>
              <label className="jss-form-label">Workspace ID</label>
              <input type="text" value={workspaceId || ''} disabled className="dashboard-form__input" style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            </div>
            <button onClick={() => alert('Đã cập nhật tên dự án thành công!')} className="jss-submit-btn" style={{ width: 'fit-content', padding: '0.5rem 1rem' }}>
              Lưu cấu hình
            </button>
          </div>
        </div>

        {/* GSC card — Real Integration */}
        <div className="glass-card reports-tab__element-209--auto-209">
          <div>
            <h3 className="card-header__title" style={{ marginBottom: '0.5rem' }}>Google Search Console (GSC)</h3>
            <p className="card-header__subtitle" style={{ marginBottom: '1rem' }}>
              Kết nối tài khoản Google để đồng bộ dữ liệu Clicks, Impressions, CTR trực tiếp từ Google API.
            </p>
          </div>
          
          <div className="font-size-md">
            {/* Connection Status */}
            <div className="reports-tab__element-210--auto-210">
              <div className="badge-row">
                <Globe size={18} color={isGscConnected ? 'var(--accent-green)' : 'var(--text-muted)'} />
                <span className="decaying-list__title">
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

            {/* Error display */}
            {gscError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                color: 'var(--accent-red)',
              }}>
                <XCircle size={16} />
                <span>{gscError}</span>
              </div>
            )}

            {/* Sync status info */}
            {isGscConnected && syncStatus && (
              <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span>Trạng thái đồng bộ: <strong style={{ color: syncStatus.state === 'completed' ? 'var(--accent-green)' : 'var(--accent-secondary)' }}>{syncStatus.state}</strong></span>
                  {syncStatus.freshness.isStale && (
                    <span style={{ color: 'var(--accent-orange)', fontSize: '0.75rem' }}>⚠ Dữ liệu đã cũ</span>
                  )}
                </div>
                {syncStatus.lastSuccessfulSyncAt && (
                  <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                    Lần đồng bộ cuối: {new Date(syncStatus.lastSuccessfulSyncAt).toLocaleString('vi-VN')}
                  </span>
                )}
                {syncStatus.lastErrorMessage && (
                  <div style={{ color: 'var(--accent-red)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    Lỗi: {syncStatus.lastErrorMessage}
                  </div>
                )}
              </div>
            )}

            {/* Properties selection (shown after successful OAuth) */}
            {isGscConnected && gscProperties.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <label className="jss-form-label">Chọn Property GSC</label>
                <select
                  value={selectedProperty}
                  onChange={e => handleSelectProperty(e.target.value)}
                  className="dashboard-form__input"
                  disabled={propertyLoading}
                  style={{ cursor: propertyLoading ? 'wait' : 'pointer' }}
                >
                  <option value="">-- Chọn website từ GSC --</option>
                  {gscProperties.map(p => (
                    <option key={p.siteUrl} value={p.siteUrl}>
                      {p.siteUrl} ({p.permissionLevel})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {!isGscConnected ? (
                <button
                  onClick={handleGscConnect}
                  disabled={gscLoading}
                  className="jss-submit-btn"
                  style={{
                    background: 'var(--accent-primary)',
                    border: 'none',
                    color: 'white',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: gscLoading ? 0.6 : 1,
                    cursor: gscLoading ? 'wait' : 'pointer',
                  }}
                >
                  {gscLoading ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
                  {gscLoading ? 'Đang chuyển hướng...' : 'Liên kết tài khoản Google'}
                </button>
              ) : (
                <>
                  {/* Sync button */}
                  <button
                    onClick={handleSyncData}
                    disabled={syncLoading || !selectedProperty}
                    className="jss-submit-btn"
                    style={{
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid var(--accent-primary)',
                      color: 'var(--accent-primary)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      opacity: (syncLoading || !selectedProperty) ? 0.5 : 1,
                      cursor: (syncLoading || !selectedProperty) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {syncLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    {syncLoading ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu GSC'}
                  </button>

                  {/* Refresh properties */}
                  <button
                    onClick={fetchProperties}
                    disabled={propertyLoading}
                    className="jss-submit-btn"
                    style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid var(--accent-green)',
                      color: 'var(--accent-green)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      opacity: propertyLoading ? 0.5 : 1,
                    }}
                  >
                    {propertyLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Làm mới Properties
                  </button>

                  {/* Revoke button */}
                  <button
                    onClick={handleGscRevoke}
                    disabled={gscLoading}
                    className="jss-submit-btn"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid var(--accent-red)',
                      color: 'var(--accent-red)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <XCircle size={16} />
                    Ngắt Kết Nối GSC
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quota Limits & Plans */}
      <div className="glass-card glass-card--padded">
        <div className="reports-tab__element-211--auto-211">
          <div>
            <h3 className="card-header__title">Hạn mức & Gói Workspace (Plan & Quotas)</h3>
            <p className="card-header__subtitle">Kiểm soát và gia hạn giới hạn tài nguyên của workspace</p>
          </div>
          <div className="content-planner__element-26--auto-26">
            <span className="keyword-tracker__text-span--auto-52">
              Gói hiện tại: <strong className="reports-tab__element-212--auto-212">{workspacePlan}</strong>
            </span>
            <button onClick={handleTogglePlan} className="jss-submit-btn" style={{ marginTop: 0, background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              {workspacePlan === 'free' ? 'Nâng cấp lên PRO' : 'Hạ cấp xuống FREE'}
            </button>
          </div>
        </div>

        {/* Progress bars */}
        <div className="content-planner__element-33--auto-33">
          {/* Sites Limit */}
          <div>
            <div className="reports-tab__element-213--auto-213">
              <span className="reports-tab__text-span--auto-214">Số lượng Website (Sites)</span>
              <span className="standards-tab__text-span--auto-105">
                {sitesList.length} / {workspacePlan === 'free' ? 1 : 10} Sites
              </span>
            </div>
            <div className="reports-tab__element-215--auto-215">
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
            <div className="reports-tab__element-213--auto-213">
              <span className="reports-tab__text-span--auto-214">Từ khóa Theo dõi (Keywords)</span>
              <span className="standards-tab__text-span--auto-105">
                {keywordsList.length} / {workspacePlan === 'free' ? 5 : 100} Keywords
              </span>
            </div>
            <div className="reports-tab__element-215--auto-215">
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
            <div className="reports-tab__element-213--auto-213">
              <span className="reports-tab__text-span--auto-214">AI Content Briefs đã tạo</span>
              <span className="standards-tab__text-span--auto-105">
                {contentPlansList.filter(p => p.body).length} / {workspacePlan === 'free' ? 3 : 50} Briefs
              </span>
            </div>
            <div className="reports-tab__element-215--auto-215">
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
      <div className="glass-card glass-card--padded">
        <h3 className="card-header__title" style={{ marginBottom: '1rem' }}>Thành viên Workspace (Team Members)</h3>
        <div className="settings-tab__element-216--auto-216">
          {/* Form to add member */}
          <div>
            <h4 className="settings-tab__title--auto-217">Thêm Thành Viên</h4>
            <form onSubmit={handleAddMember} className="backlinks-tab__element-178--auto-178">
              <div>
                <label className="jss-form-label">Email</label>
                <input type="email" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} placeholder="email@domain.com" className="dashboard-form__input" required />
              </div>
              <div>
                <label className="jss-form-label">Vai trò</label>
                <select value={newMemberRole} onChange={e => setNewMemberRole(e.target.value)} className="dashboard-form__input">
                  <option value="owner">Owner (Chủ sở hữu)</option>
                  <option value="admin">Admin (Quản trị viên)</option>
                  <option value="manager">Manager (Quản lý)</option>
                  <option value="seo">SEO specialist (Chuyên viên SEO)</option>
                  <option value="content">Content specialist (Chuyên viên Nội dung)</option>
                  <option value="client">Client (Khách hàng)</option>
                  <option value="viewer">Viewer (Người xem)</option>
                </select>
              </div>
              <button type="submit" className="jss-submit-btn" style={{ width: '100%', marginTop: '0.25rem' }}>
                Thêm thành viên
              </button>
            </form>
          </div>

          {/* Member List Table */}
          <div>
            <h4 className="settings-tab__title--auto-217">Danh Sách Thành Viên</h4>
            {membersList.length === 0 ? (
              <div className="jss-empty-state">
                <p>Không có thông tin thành viên.</p>
              </div>
            ) : (
              <div className="standards-tab__element-128--auto-128">
                <table className="settings-tab__table--auto-218">
                  <thead>
                    <tr className="reports-tab__tr--auto-197">
                      <th className="settings-tab__th--auto-219">Email</th>
                      <th className="settings-tab__th--auto-219">Vai trò</th>
                      <th className="settings-tab__th--auto-219">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {membersList.map((mem: any) => (
                      <tr key={mem.membershipId || mem.id} className="settings-tab__tr--auto-220">
                        <td className="settings-tab__td--auto-221">{mem.user?.email || mem.user?.id || mem.userId}</td>
                        <td className="settings-tab__td--auto-222">{mem.role}</td>
                        <td className="settings-tab__th--auto-219">
                          <span className="settings-tab__text-span--auto-223">
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
  );
}

