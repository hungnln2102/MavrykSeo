import React from 'react';
import { Loader2, Plus } from 'lucide-react';
import { renderProvenanceBadge } from '../styles';

interface RankTrackerTabProps {
  newKeywordInput: string;
  setNewKeywordInput: (val: string) => void;
  newKeywordTargetUrl: string;
  setNewKeywordTargetUrl: (val: string) => void;
  isAddingKeyword: boolean;
  handleAddKeyword: (e: React.FormEvent | React.MouseEvent) => Promise<void>;
  keywordsList: any[];
  handleDeleteKeyword: (id: string) => Promise<void>;
}

export default function RankTrackerTab({
  newKeywordInput,
  setNewKeywordInput,
  newKeywordTargetUrl,
  setNewKeywordTargetUrl,
  isAddingKeyword,
  handleAddKeyword,
  keywordsList,
  handleDeleteKeyword,
}: RankTrackerTabProps) {
  return (
    <div className="content-planner__element-41--auto-41">
      {/* Keyword Addition Form */}
      <div className="glass-card glass-card--padded">
        <h2 className="card-header__title" style={{ marginBottom: '1rem' }}>Theo dõi Từ khóa (Track New Keywords)</h2>
        
        <div className="reports-tab__element-190--auto-190">
          <div className="reports-tab__element-191--auto-191">
            <label className="jss-form-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Từ khóa tìm kiếm (Keyword)*</label>
            <input type="text" value={newKeywordInput} onChange={e => setNewKeywordInput(e.target.value)} placeholder="Ví dụ: công cụ seo ai, rank tracker..." className="dashboard-form__input" />
          </div>

          <div className="reports-tab__element-191--auto-191">
            <label className="jss-form-label" style={{ display: 'block', marginBottom: '0.4rem' }}>URL Đích mong muốn (Target URL)</label>
            <input type="text" value={newKeywordTargetUrl} onChange={e => setNewKeywordTargetUrl(e.target.value)} placeholder="Ví dụ: https://domain.com/blog/seo" className="dashboard-form__input" />
          </div>

          <button onClick={handleAddKeyword} disabled={isAddingKeyword} className="jss-submit-btn" style={{ marginTop: 0, padding: '0.6rem 1.5rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isAddingKeyword ? (
              <Loader2 size={16} className="keyword-tracker__element-47--auto-47" />
            ) : (
              <Plus size={16} />
            )}
            <span>Thêm Từ Khóa</span>
          </button>
        </div>
      </div>

      {/* Keyword Table Card */}
      <div className="glass-card glass-card--padded">
        <div className="keywords-card__header" style={{ marginBottom: '1.25rem' }}>
          <h3 className="card-header__title">Danh sách Từ khóa đang theo dõi</h3>
          <p className="card-header__subtitle">Theo dõi vị trí thực tế trên Google Search Engine thu thập qua ClickHouse</p>
        </div>

        {keywordsList.length === 0 ? (
          <div className="jss-empty-state">
            <p>Chưa có từ khóa nào được theo dõi. Hãy nhập từ khóa ở phía trên để hệ thống bắt đầu giám sát thứ hạng!</p>
          </div>
        ) : (
          <div className="jss-table-wrapper">
            <table className="keywords-table">
              <thead>
                <tr className="jss-tr-head">
                  <th className="keywords-table__th" style={{ textAlign: 'left' }}>Từ khóa</th>
                  <th className="keywords-table__th" style={{ textAlign: 'left' }}>Target URL</th>
                  <th className="keywords-table__th" style={{ textAlign: 'center' }}>Thứ hạng (Rank)</th>
                  <th className="keywords-table__th" style={{ textAlign: 'center' }}>Lượng Tìm kiếm (Vol)</th>
                  <th className="keywords-table__th" style={{ textAlign: 'center' }}>Độ khó (KD)</th>
                  <th className="keywords-table__th" style={{ textAlign: 'center' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {keywordsList.map((kw: any) => {
                  const rankVal = kw.latestRank;
                  const hasRank = rankVal !== null && rankVal !== undefined && rankVal > 0;
                  
                  return (
                    <tr key={kw.id} className="jss-tr-body">
                      <td className="keywords-table__td--keyword" style={{ textAlign: 'left' }}>{kw.keyword}</td>
                      <td className="keywords-table__td" style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {kw.targetUrl || <span className="reports-tab__text-span--auto-192">Tự động phát hiện</span>}
                      </td>
                      <td className="keywords-table__td" style={{ textAlign: 'center' }}>
                        <span className="jss-badge-position" style={{ background: hasRank && rankVal <= 3 ? 'rgba(16, 185, 129, 0.15)' : hasRank && rankVal <= 10 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)', color: hasRank && rankVal <= 3 ? 'var(--accent-green)' : hasRank && rankVal <= 10 ? 'var(--accent-primary)' : 'var(--text-primary)', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                          {hasRank ? `#${rankVal}` : 'Đang quét...'}
                        </span>
                        {hasRank && renderProvenanceBadge('observed')}
                      </td>
                      <td className="keywords-table__td" style={{ textAlign: 'center' }}>
                        <span>{kw.volume ? kw.volume.toLocaleString('en-US') : 'N/A'}</span>
                        {!!kw.volume && renderProvenanceBadge('estimated')}
                      </td>
                      <td className="keywords-table__td" style={{ textAlign: 'center' }}>
                        {kw.difficulty ? (
                          <>
                            <span style={{
                              color: kw.difficulty > 60 ? 'var(--accent-red)' : kw.difficulty > 35 ? 'var(--accent-orange)' : 'var(--accent-green)',
                              fontWeight: 500
                            }}>
                              {kw.difficulty}%
                            </span>
                            {renderProvenanceBadge('estimated')}
                          </>
                        ) : 'N/A'}
                      </td>
                      <td className="keywords-table__td" style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteKeyword(kw.id)}
                          className="reports-tab__element-193--auto-193"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-red)', fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}
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
  );
}
