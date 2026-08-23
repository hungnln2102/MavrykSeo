import React from 'react';
import {
  Calendar,
  BookOpen,
  Search,
  Sparkles,
  Plus,
  ChevronRight,
  TrendingUp,
  Loader2,
  ExternalLink,
  ArrowLeft,
  Globe,
  RefreshCw,
  FileText,
  Link2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { renderProvenanceBadge } from '../styles';

interface ContentPlannerTabProps {
  token: string | null;
  workspaceId: string | null;
  projectId: string | null;
  activeSite: any;
  selectedSite: string;
  topicsList: any[];
  contentPlansList: any[];
  decayedPlansList: any[];
  
  selectedPlanId: string | null;
  setSelectedPlanId: (id: string | null) => void;
  editorBody: string;
  setEditorBody: (body: string) => void;

  contentSubTab: 'topics' | 'calendar' | 'editor' | 'research';
  setContentSubTab: (tab: 'topics' | 'calendar' | 'editor' | 'research') => void;

  researchSubTab: 'single' | 'clustering' | 'gap';
  setResearchSubTab: (sub: 'single' | 'clustering' | 'gap') => void;

  keywordResearchInput: string;
  setKeywordResearchInput: (text: string) => void;
  keywordResearchResult: any;
  isResearchingKeyword: boolean;

  keywordClusteringInput: string;
  setKeywordClusteringInput: (text: string) => void;
  keywordClusteringResult: any[];
  isClusteringKeywords: boolean;

  competitorGapResult: any[];
  isLoadingCompetitorGap: boolean;

  newTopicName: string;
  setNewTopicName: (name: string) => void;
  newTopicParentId: string;
  setNewTopicParentId: (id: string) => void;
  newTopicKeywords: string;
  setNewTopicKeywords: (kw: string) => void;

  newPlanTitle: string;
  setNewPlanTitle: (title: string) => void;
  newPlanPrimaryKeyword: string;
  setNewPlanPrimaryKeyword: (kw: string) => void;
  newPlanSecondaryKeywords: string;
  setNewPlanSecondaryKeywords: (kw: string) => void;
  newPlanTopicId: string;
  setNewPlanTopicId: (id: string) => void;
  newPlanDueDate: string;
  setNewPlanDueDate: (d: string) => void;

  brief: any;
  isGeneratingBrief: boolean;
  optimizationResult: any;
  isOptimizing: boolean;
  performanceData: any;

  // Modals controllers
  setShowImportModal: (show: boolean) => void;
  setImportUrlStr: (url: string) => void;
  setImportKeyword: (kw: string) => void;
  setImportTopicId: (id: string) => void;

  setShowPublishModal: (show: boolean) => void;
  setPublishingPlanId: (id: string | null) => void;
  setPublishUrlStr: (url: string) => void;

  // Methods
  handleRefreshContent: (planId: string) => Promise<void>;
  fetchBriefForPlan: (planId: string) => Promise<void>;
  handleCreateContentPlan: () => Promise<void>;
  handleCreateTopic: () => Promise<void>;
  handleResearchKeyword: () => Promise<void>;
  handleTrackKeywordDirectly: (keyword: string) => Promise<void>;
  handleClusterKeywords: () => Promise<void>;
  handleCreateTopicFromCluster: (clusterName: string, keywordsStr: string[]) => Promise<void>;
  handleFetchCompetitorGap: () => Promise<void>;
  handleGenerateBrief: () => Promise<void>;
}

export default function ContentPlannerTab({
  token,
  workspaceId,
  projectId,
  activeSite,
  selectedSite,
  topicsList,
  contentPlansList,
  decayedPlansList,
  selectedPlanId,
  setSelectedPlanId,
  editorBody,
  setEditorBody,
  contentSubTab,
  setContentSubTab,
  researchSubTab,
  setResearchSubTab,
  keywordResearchInput,
  setKeywordResearchInput,
  keywordResearchResult,
  isResearchingKeyword,
  keywordClusteringInput,
  setKeywordClusteringInput,
  keywordClusteringResult,
  isClusteringKeywords,
  competitorGapResult,
  isLoadingCompetitorGap,
  newTopicName,
  setNewTopicName,
  newTopicParentId,
  setNewTopicParentId,
  newTopicKeywords,
  setNewTopicKeywords,
  newPlanTitle,
  setNewPlanTitle,
  newPlanPrimaryKeyword,
  setNewPlanPrimaryKeyword,
  newPlanSecondaryKeywords,
  setNewPlanSecondaryKeywords,
  newPlanTopicId,
  setNewPlanTopicId,
  newPlanDueDate,
  setNewPlanDueDate,
  brief,
  isGeneratingBrief,
  optimizationResult,
  isOptimizing,
  performanceData,
  setShowImportModal,
  setImportUrlStr,
  setImportKeyword,
  setImportTopicId,
  setShowPublishModal,
  setPublishingPlanId,
  setPublishUrlStr,
  handleRefreshContent,
  fetchBriefForPlan,
  handleCreateContentPlan,
  handleCreateTopic,
  handleResearchKeyword,
  handleTrackKeywordDirectly,
  handleClusterKeywords,
  handleCreateTopicFromCluster,
  handleFetchCompetitorGap,
  handleGenerateBrief,
}: ContentPlannerTabProps) {

  const currentPlan = contentPlansList.find(p => p.id === selectedPlanId);

  const getStatusBadgeStyle = (status: string) => {
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
  };

  const getInternalLinkSuggestions = () => {
    if (!selectedPlanId) return [];
    const current = contentPlansList.find(p => p.id === selectedPlanId);
    if (!current) return [];

    return contentPlansList
      .filter(p => p.id !== selectedPlanId && p.status === 'published' && p.publishUrl)
      .map(p => {
        let score = 0;
        let reason = '';

        if (p.topicId && p.topicId === current.topicId) {
          score += 50;
          reason = 'Same Topic Hub';
        }

        const currentKeywords = [current.primaryKeyword, ...(current.secondaryKeywords || [])];
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

  return (
    <div className="dashboard-grid">
      {/* Sub-tab Switcher */}
      <div className="jss-sub-tab-container">
        <button
          onClick={() => setContentSubTab('calendar')}
          className={`sub-nav__btn ${contentSubTab === 'calendar' ? 'sub-nav__btn--active' : ''}`}
        >
          <Calendar size={16} />
          <span>Editorial Calendar</span>
        </button>
        <button
          onClick={() => setContentSubTab('topics')}
          className={`sub-nav__btn ${contentSubTab === 'topics' ? 'sub-nav__btn--active' : ''}`}
        >
          <BookOpen size={16} />
          <span>Topical Authority Map {renderProvenanceBadge('derived')}</span>
        </button>
        <button
          onClick={() => setContentSubTab('research')}
          className={`sub-nav__btn ${contentSubTab === 'research' ? 'sub-nav__btn--active' : ''}`}
        >
          <Search size={16} />
          <span>Keyword Research {renderProvenanceBadge('estimated')}</span>
        </button>
        <button
          onClick={() => setContentSubTab('editor')}
          className={`sub-nav__btn ${contentSubTab === 'editor' ? 'sub-nav__btn--active' : ''}`}
        >
          <Sparkles size={16} />
          <span>AI SEO Writer {renderProvenanceBadge('ai')}</span>
        </button>
      </div>

      {/* Sub-tab 1: Editorial Calendar */}
      {contentSubTab === 'calendar' && (
        <div className="jss-content-planner-grid">
          {/* Plans List */}
          <div className="dashboard__inner">
            <div className="glass-card glass-card--padded">
              <div className="content-calendar__day-content">
                <h3 className="card-header__title" style={{ marginBottom: 0 }}>Scheduled Content Drafts</h3>
                <button
                  onClick={() => {
                    setImportUrlStr('');
                    setImportKeyword('');
                    setImportTopicId('');
                    setShowImportModal(true);
                  }}
                  className="btn--full"
                >
                  <Plus size={14} />
                  <span>Import URL</span>
                </button>
              </div>

              {/* Decayed Content Alert Section */}
              {decayedPlansList.length > 0 && (
                <div className="layout-flex">
                  <div className="badge-row">
                    <span className="warning-callout__title">⚠️ Content Decay Alert</span>
                    <span className="warning-callout__desc">The following published articles have dropped &gt;20% in traffic over the last 30 days:</span>
                  </div>
                  <div className="layout-flex-grow">
                    {decayedPlansList.map(plan => (
                      <div key={plan.id} className="decaying-list">
                        <div>
                          <div className="decaying-list__title">{plan.title}</div>
                          <div className="text-divider">
                            Keyword: <span className="meta-badge">{plan.primaryKeyword}</span> | Drop: <span className="layout-flex-row">-{plan.dropPercentage}%</span> (Recent clicks: {plan.recentClicks} vs Historic clicks: {plan.historicClicks})
                          </div>
                        </div>
                        <button
                          onClick={() => handleRefreshContent(plan.id)}
                          className="form-row"
                        >
                          Refresh Content
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {contentPlansList.length === 0 ? (
                <div className="jss-empty-state">
                  <p>No content plans found. Create a new plan on the right to start your SEO strategy!</p>
                </div>
              ) : (
                <div className="font-size-md">
                  {contentPlansList.map(plan => (
                    <div key={plan.id} className="jss-plan-card">
                      <div className="content-planner__element-25--auto-25">
                        <div className="content-planner__element-26--auto-26">
                          <h4 className="content-planner__title--auto-27">{plan.title}</h4>
                          <span className="status-badge" style={{ ...getStatusBadgeStyle(plan.status) }}>{plan.status}</span>
                        </div>
                        <div className="content-planner__element-28--auto-28">
                          <span className="jss-keyword-tag-primary">Primary: {plan.primaryKeyword}</span>
                          {plan.secondaryKeywords?.map((k: string) => (
                            <span key={k} className="jss-keyword-tag-secondary">{k}</span>
                          ))}
                        </div>
                        <div className="content-planner__badge--auto-29">
                          Due Date: {plan.dueDate ? new Date(plan.dueDate).toLocaleDateString() : 'Unscheduled'}
                        </div>
                      </div>
                      <button onClick={() => { setSelectedPlanId(plan.id); setEditorBody(plan.body || ''); setContentSubTab('editor'); fetchBriefForPlan(plan.id); }} className="content-editor__open-btn">
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
          <div className="content-planner__element-30--auto-30">
            <div className="glass-card content-planner__element-31--auto-31">
              <h3 className="card-header__title">Plan New Content</h3>
              
              <div>
                <label className="jss-form-label">Article Title</label>
                <input type="text" value={newPlanTitle} onChange={e => setNewPlanTitle(e.target.value)} placeholder="e.g. Complete Guide to React SEO in 2026" className="dashboard-form__input" />
              </div>
              
              <div>
                <label className="jss-form-label">Primary Target Keyword</label>
                <input type="text" value={newPlanPrimaryKeyword} onChange={e => setNewPlanPrimaryKeyword(e.target.value)} placeholder="e.g. react seo guide" className="dashboard-form__input" />
              </div>
              
              <div>
                <label className="jss-form-label">Secondary Keywords (comma separated)</label>
                <input type="text" value={newPlanSecondaryKeywords} onChange={e => setNewPlanSecondaryKeywords(e.target.value)} placeholder="e.g. nextjs seo, react helmet" className="dashboard-form__input" />
              </div>

              <div>
                <label className="jss-form-label">Authority Topic Group</label>
                <select value={newPlanTopicId} onChange={e => setNewPlanTopicId(e.target.value)} className="dashboard-form__select">
                  <option value="">None (Independent Draft)</option>
                  {topicsList.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="jss-form-label">Due Date</label>
                <input type="date" value={newPlanDueDate} onChange={e => setNewPlanDueDate(e.target.value)} className="dashboard-form__input" />
              </div>

              <button onClick={handleCreateContentPlan} className="jss-submit-btn">
                <Plus size={16} />
                <span>Add to Calendar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Topical Authority Map */}
      {contentSubTab === 'topics' && (
        <div className="jss-content-planner-grid">
          {/* Topic Map List */}
          <div className="content-planner__element-32--auto-32">
            <div className="glass-card glass-card--padded">
              <h3 className="card-header__title" style={{ marginBottom: '1.25rem' }}>Topical Authority Structure {renderProvenanceBadge('derived')}</h3>
              {topicsList.length === 0 ? (
                <div className="jss-empty-state">
                  <p>No topical hubs established yet. Create parent topics on the right to build visual clusters!</p>
                </div>
              ) : (
                <div className="content-planner__element-33--auto-33">
                  {topicsList.filter(t => !t.parentId).map(parent => (
                    <div key={parent.id} className="jss-topic-cluster-card">
                      <div className="content-planner__element-34--auto-34">
                        <span className="content-planner__text-span--auto-35">{parent.name}</span>
                        <div className="content-planner__element-28--auto-28">
                          {parent.keywords?.map((k: string) => (
                            <span key={k} className="jss-topic-keyword-tag">{k}</span>
                          ))}
                        </div>
                      </div>

                      {/* Subtopics */}
                      <div className="content-planner__element-36--auto-36">
                        {topicsList.filter(t => t.parentId === parent.id).length === 0 ? (
                          <span className="topic-clusters__text-span--auto-37">No sub-topics created. Add one on the right with this parent selected.</span>
                        ) : (
                          topicsList.filter(t => t.parentId === parent.id).map(child => (
                            <div key={child.id} className="content-planner__element-38--auto-38">
                              <div className="content-planner__element-39--auto-39">
                                <ChevronRight size={12} color="var(--accent-secondary)" />
                                <span className="decaying-list__title">{child.name}</span>
                              </div>
                              <div className="content-planner__element-40--auto-40">
                                {child.keywords?.map((k: string) => (
                                  <span key={k} className="jss-topic-keyword-tag-secondary">{k}</span>
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
          <div className="content-planner__element-30--auto-30">
            <div className="glass-card content-planner__element-31--auto-31">
              <h3 className="card-header__title">Add Topic Entity</h3>
              
              <div>
                <label className="jss-form-label">Topic Name</label>
                <input type="text" value={newTopicName} onChange={e => setNewTopicName(e.target.value)} placeholder="e.g. Technical Audit" className="dashboard-form__input" />
              </div>
              
              <div>
                <label className="jss-form-label">Associated Keywords (comma separated)</label>
                <input type="text" value={newTopicKeywords} onChange={e => setNewTopicKeywords(e.target.value)} placeholder="e.g. core web vitals, speed" className="dashboard-form__input" />
              </div>

              <div>
                <label className="jss-form-label">Parent Authority Group</label>
                <select value={newTopicParentId} onChange={e => setNewTopicParentId(e.target.value)} className="dashboard-form__select">
                  <option value="">None (Is Parent Topic)</option>
                  {topicsList.filter(t => !t.parentId).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <button onClick={handleCreateTopic} className="jss-submit-btn">
                <Plus size={16} />
                <span>Establish Topic Hub</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2.5: Keyword Research & Clustering */}
      {contentSubTab === 'research' && (
        <div className="content-planner__element-41--auto-41">
          {/* Switcher for Research Sub-tabs */}
          <div className="content-planner__element-42--auto-42">
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
            <div className="keyword-tracker__element-43--auto-43">
              <div className="glass-card glass-card--padded">
                <h3 className="card-header__title" style={{ marginBottom: '0.5rem' }}>Keyword Research (Keyword Universe)</h3>
                <p className="keyword-tracker__description--auto-44">
                  Search for a target search query to check its estimated search volume, CPC, intent classification, and SERP positions.
                </p>
                <div className="keyword-tracker__element-45--auto-45">
                  <input type="text" value={keywordResearchInput} onChange={e => setKeywordResearchInput(e.target.value)} placeholder="Enter keyword (e.g. ai writing tools, best cloud storage)..." className="dashboard-form__input" style={{ flex: 1, margin: 0 }} onKeyDown={e => {
                      if (e.key === 'Enter') handleResearchKeyword();
                    }}
                  />
                  <button
                    onClick={handleResearchKeyword}
                    disabled={isResearchingKeyword}
                    className="keyword-tracker__element-46--auto-46"
                  >
                    {isResearchingKeyword ? (
                      <Loader2 size={16} className="keyword-tracker__element-47--auto-47" />
                    ) : (
                      <Search size={16} />
                    )}
                    <span>Research</span>
                  </button>
                </div>
              </div>

              {keywordResearchResult && (
                <div className="grid keyword-tracker__grid-wrapper--auto-48">
                  {/* Keyword Metrics */}
                  <div className="glass-card keyword-tracker__element-49--auto-49">
                    <h4 className="card-header__title" style={{ fontSize: '1rem' }}>Metrics for &quot;{keywordResearchResult.keyword}&quot;</h4>
                    
                    <div className="keyword-tracker__element-50--auto-50">
                      <div className="keyword-tracker__element-51--auto-51">
                        <span className="keyword-tracker__text-span--auto-52">Search Volume</span>
                        <span className="keyword-tracker__text-span--auto-53">
                          {keywordResearchResult.searchVolume?.toLocaleString('en-US') || '0'} /mo
                        </span>
                      </div>
                      <div className="keyword-tracker__element-51--auto-51">
                        <span className="keyword-tracker__text-span--auto-52">CPC (USD)</span>
                        <span className="keyword-tracker__text-span--auto-53">
                          ${keywordResearchResult.cpc?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                      <div className="keyword-tracker__element-51--auto-51">
                        <span className="keyword-tracker__text-span--auto-52">Search Intent</span>
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

                    <div className="keyword-tracker__element-54--auto-54">
                      <button
                        onClick={() => handleTrackKeywordDirectly(keywordResearchResult.keyword)}
                        className="keyword-tracker__element-55--auto-55"
                      >
                        Track in Rank Tracker
                      </button>
                      <button
                        onClick={() => {
                          setContentSubTab('calendar');
                          setNewPlanTitle(`Guide to ${keywordResearchResult.keyword.charAt(0).toUpperCase() + keywordResearchResult.keyword.slice(1)}`);
                          setNewPlanPrimaryKeyword(keywordResearchResult.keyword);
                        }}
                        className="keyword-tracker__element-56--auto-56"
                      >
                        Create Content Plan
                      </button>
                    </div>
                  </div>

                  {/* SERP Results */}
                  <div className="glass-card glass-card--padded">
                    <h4 className="card-header__title" style={{ fontSize: '1rem', marginBottom: '1rem' }}>Top 10 Google SERP Results</h4>
                    
                    {(!keywordResearchResult.results || keywordResearchResult.results.length === 0) ? (
                      <p className="keyword-tracker__description--auto-57">No SERP records returned.</p>
                    ) : (
                      <div className="jss-table-wrapper">
                        <table className="keywords-table">
                          <thead>
                            <tr className="jss-tr-head">
                              <th className="keywords-table__th" style={{ width: '60px', textAlign: 'center' }}>Rank</th>
                              <th className="keywords-table__th" style={{ textAlign: 'left' }}>Page Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {keywordResearchResult.results.map((r: any) => (
                              <tr key={r.rank} className="jss-tr-body">
                                <td className="keywords-table__td" style={{ textAlign: 'center', fontWeight: 600, color: 'var(--accent-primary)' }}>
                                  #{r.rank}
                                </td>
                                <td className="keywords-table__td" style={{ textAlign: 'left' }}>
                                  <div className="decaying-list__title">{r.title}</div>
                                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="keyword-tracker__link--auto-58">
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
            <div className="keyword-tracker__element-43--auto-43">
              <div className="glass-card glass-card--padded">
                <h3 className="card-header__title" style={{ marginBottom: '0.5rem' }}>Keyword Clustering (Hub Builder)</h3>
                <p className="keyword-tracker__description--auto-44">
                  Input multiple search terms (one per line) to group them into clusters based on SERP overlap. Establish these groups directly as topical hubs.
                </p>
                
                <div className="font-size-md">
                  <textarea rows={6} value={keywordClusteringInput} onChange={e => setKeywordClusteringInput(e.target.value)} placeholder="Enter keywords here (e.g.&#13;ai writing tools&#13;best ai copywriter&#13;local seo tips&#13;google ranking guide)..." className="dashboard-form__input" style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem', resize: 'vertical' }} />
                  <button
                    onClick={handleClusterKeywords}
                    disabled={isClusteringKeywords}
                    className="keyword-tracker__element-59--auto-59"
                  >
                    {isClusteringKeywords ? (
                      <Loader2 size={16} className="keyword-tracker__element-47--auto-47" />
                    ) : (
                      <Sparkles size={16} />
                    )}
                    <span>Cluster Keywords</span>
                  </button>
                </div>
              </div>

              {keywordClusteringResult.length > 0 && (
                <div className="content-planner__element-33--auto-33">
                  <h4 className="card-header__title" style={{ fontSize: '1rem' }}>Clustered Topic Suggestions</h4>
                  
                  <div className="keyword-tracker__element-60--auto-60">
                    {keywordClusteringResult.map((cluster: any, idx: number) => (
                      <div key={idx} className="glass-card keyword-tracker__element-61--auto-61">
                        <div>
                          <div className="keyword-tracker__element-62--auto-62">
                            <h5 className="card-header__title" style={{ fontSize: '0.95rem', margin: 0 }}>
                              Cluster: {cluster.name}
                            </h5>
                            <span className="keyword-tracker__text-span--auto-63">
                              {cluster.intent || 'Commercial'}
                            </span>
                          </div>

                          <div className="keyword-tracker__element-64--auto-64">
                            {cluster.keywords?.map((kw: string, kwIdx: number) => (
                              <span key={kwIdx} className="keyword-tracker__text-span--auto-65">
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="keyword-tracker__element-66--auto-66">
                          <button
                            onClick={() => handleCreateTopicFromCluster(cluster.name, cluster.keywords)}
                            className="keyword-tracker__element-67--auto-67"
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
            <div className="keyword-tracker__element-43--auto-43">
              <div className="glass-card glass-card--padded">
                <div className="audit-results__element-68--auto-68">
                  <div>
                    <h3 className="card-header__title" style={{ marginBottom: '0.5rem' }}>Competitor Content Gap Analysis</h3>
                    <p className="keyword-tracker__text-span--auto-52">
                      Find keywords where your competitors rank in the top 10 positions, but your project is ranking poorly (&gt; 10) or not ranking at all.
                    </p>
                  </div>
                  <button
                    onClick={handleFetchCompetitorGap}
                    disabled={isLoadingCompetitorGap}
                    className="keyword-tracker__element-46--auto-46"
                  >
                    {isLoadingCompetitorGap ? (
                      <Loader2 size={16} className="keyword-tracker__element-47--auto-47" />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                    <span>Run Analysis</span>
                  </button>
                </div>
              </div>

              <div className="glass-card glass-card--padded">
                <h4 className="card-header__title" style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>Content Gap Opportunities</h4>
                
                {isLoadingCompetitorGap ? (
                  <div className="audit-results__element-69--auto-69">
                    <Loader2 size={24} className="audit-results__element-70--auto-70" />
                  </div>
                ) : competitorGapResult.length === 0 ? (
                  <div className="jss-empty-state">
                    <p>No content gaps detected. Click &quot;Run Analysis&quot; to query competitor data from ClickHouse.</p>
                  </div>
                ) : (
                  <div className="jss-table-wrapper">
                    <table className="keywords-table">
                      <thead>
                        <tr className="jss-tr-head">
                          <th className="keywords-table__th" style={{ textAlign: 'left' }}>Target Keyword</th>
                          <th className="keywords-table__th" style={{ textAlign: 'left' }}>Competitor Domain</th>
                          <th className="keywords-table__th" style={{ textAlign: 'center' }}>Competitor Rank</th>
                          <th className="keywords-table__th" style={{ textAlign: 'center' }}>Our Rank</th>
                          <th className="keywords-table__th" style={{ textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {competitorGapResult.map((item: any, idx: number) => (
                          <tr key={idx} className="jss-tr-body">
                            <td className="keywords-table__td--keyword" style={{ textAlign: 'left' }}>{item.keyword}</td>
                            <td className="keywords-table__td" style={{ textAlign: 'left', color: 'var(--text-secondary)' }}>{item.competitorDomain}</td>
                            <td className="keywords-table__td" style={{ textAlign: 'center' }}>
                              <span className="audit-results__text-span--auto-71">
                                #{item.competitorRank}
                              </span>
                            </td>
                            <td className="keywords-table__td" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                              {item.ownRank ? `#${item.ownRank}` : 'Unranked'}
                            </td>
                            <td className="keywords-table__td" style={{ textAlign: 'center' }}>
                              <div className="audit-results__element-72--auto-72">
                                <button
                                  onClick={() => handleTrackKeywordDirectly(item.keyword)}
                                  className="audit-results__element-73--auto-73"
                                >
                                  Track
                                </button>
                                <button
                                  onClick={() => {
                                    setContentSubTab('calendar');
                                    setNewPlanTitle(`Guide to ${item.keyword.charAt(0).toUpperCase() + item.keyword.slice(1)}`);
                                    setNewPlanPrimaryKeyword(item.keyword);
                                  }}
                                  className="audit-results__element-74--auto-74"
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
        <div className="audit-results__element-75--auto-75">
          {/* Selector Header if no plan chosen */}
          {!selectedPlanId ? (
            <div className="glass-card standards-tab__element-76--auto-76">
              <h3 className="card-header__title" style={{ marginBottom: '0.5rem' }}>Select a Content Draft to Write</h3>
              <p className="keyword-tracker__description--auto-44">
                Choose one of your scheduled content pieces from the list below to begin optimizing.
              </p>
              <select value={selectedPlanId || ''} onChange={e => { setSelectedPlanId(e.target.value); const plan = contentPlansList.find(p => p.id === e.target.value); setEditorBody(plan ? plan.body || '' : ''); if (e.target.value) fetchBriefForPlan(e.target.value); }} className="dashboard-form__select" style={{ maxWidth: '400px', margin: '0 auto' }}>
                <option value="">-- Choose Content Plan --</option>
                {contentPlansList.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          ) : (
            // Workspace is Active
            <div className="font-size-md">
              {/* Back header bar */}
              <div className="audit-results__element-68--auto-68">
                <div className="keyword-tracker__element-45--auto-45">
                  <button onClick={() => setSelectedPlanId(null)} className="content-editor__open-btn" style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}>
                    <ArrowLeft size={14} />
                    <span>Select different draft</span>
                  </button>
                  <h3 className="card-header__title" style={{ margin: 0 }}>{currentPlan?.title}</h3>
                </div>
                
                <div className="content-planner__element-26--auto-26">
                  {currentPlan?.status === 'published' ? (
                    <>
                      {currentPlan.publishUrl && (
                        <a
                          href={currentPlan.publishUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="standards-tab__element-77--auto-77"
                        >
                          <Globe size={14} />
                          <span>Live URL</span>
                        </a>
                      )}
                      <button
                        onClick={() => handleRefreshContent(currentPlan.id)}
                        className="standards-tab__element-78--auto-78"
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
                      className="btn--full"
                    >
                      <Globe size={14} />
                      <span>Publish Live</span>
                    </button>
                  )}
                  <span className="standards-tab__text-span--auto-79">
                    Target: <strong className="standards-tab__element-80--auto-80">{currentPlan?.primaryKeyword}</strong>
                  </span>
                </div>
              </div>

              {/* ClickHouse GSC Performance Stats Card Dashboard */}
              {currentPlan?.status === 'published' && (
                <div className="standards-tab__element-81--auto-81">
                  {/* Clicks */}
                  <div className="glass-card standards-tab__element-82--auto-82">
                    <span className="text-divider">30d Clicks (GSC)</span>
                    <div className="standards-tab__element-83--auto-83">
                      <span className="standards-tab__text-span--auto-84">
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
                  <div className="glass-card standards-tab__element-82--auto-82">
                    <span className="text-divider">30d Impressions</span>
                    <div className="standards-tab__element-83--auto-83">
                      <span className="standards-tab__text-span--auto-84">
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
                  <div className="glass-card standards-tab__element-82--auto-82">
                    <span className="text-divider">Average CTR</span>
                    <div className="standards-tab__text-span--auto-84">
                      {performanceData?.recent?.ctr ? `${(performanceData.recent.ctr * 100).toFixed(2)}%` : '0.00%'}
                    </div>
                  </div>

                  {/* Position */}
                  <div className="glass-card standards-tab__element-82--auto-82">
                    <span className="text-divider">Average Position</span>
                    <div className="standards-tab__text-span--auto-84">
                      {performanceData?.recent?.position ? performanceData.recent.position.toFixed(1) : '0.0'}
                    </div>
                  </div>

                  {/* Primary Rank */}
                  <div className="glass-card standards-tab__element-82--auto-82">
                    <span className="text-divider">Keyword Rank</span>
                    <div className="standards-tab__element-85--auto-85">
                      {performanceData?.primaryKeywordRank ? `#${performanceData.primaryKeywordRank}` : 'Not Ranked'}
                    </div>
                  </div>
                </div>
              )}

              {/* Active work deck */}
              <div className="jss-editor-workspace-grid">
                {/* Left: AI SEO Brief */}
                <div className="jss-editor-col-brief">
                  <div className="glass-card standards-tab__element-86--auto-86">
                    <h3 className="card-header__title">AI Content Brief {renderProvenanceBadge('ai')}</h3>
                    
                    {!brief ? (
                      <div className="standards-tab__element-87--auto-87">
                        <FileText size={32} color="var(--text-muted)" />
                        <p className="keyword-tracker__text-span--auto-52">No AI Content Brief has been created for this topic yet.</p>
                        <button onClick={handleGenerateBrief} disabled={isGeneratingBrief} className="jss-submit-btn">
                          {isGeneratingBrief ? (
                            <>
                              <Loader2 size={14} className="keyword-tracker__element-47--auto-47" />
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
                      <div className="standards-tab__element-88--auto-88">
                        {/* Word Count Indicator */}
                        <div className="standards-tab__element-89--auto-89">
                          <span className="content-planner__badge--auto-29">Suggested Word Count {renderProvenanceBadge('estimated')}</span>
                          <div className="standards-tab__element-90--auto-90">
                              {brief.targetWordCount}+ words
                          </div>
                        </div>

                        {/* Target Headings */}
                        <div>
                          <h4 className="standards-tab__title--auto-91">AI Outline Structure {renderProvenanceBadge('ai')}</h4>
                          <div className="standards-tab__element-92--auto-92">
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
                                  <span className="standards-tab__text-span--auto-93">{cleanText}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Competitor Strategy */}
                        <div>
                          <h4 className="standards-tab__title--auto-91">Competitor Analysis</h4>
                          <div className="standards-tab__element-94--auto-94">
                            {brief.competitorOutlines?.map((comp: any, idx: number) => (
                              <div key={idx} className="standards-tab__element-95--auto-95">
                                <div className="standards-tab__element-96--auto-96">{comp.domain || `Competitor ${idx+1}`}</div>
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
                <div className="content-editor__col-main">
                  <div className="glass-card standards-tab__element-97--auto-97">
                    <div className="content-planner__element-38--auto-38">
                      <h3 className="card-header__title">Editor Draft</h3>
                      {isOptimizing && (
                        <div className="standards-tab__element-98--auto-98">
                          <RefreshCw size={12} className="keyword-tracker__element-47--auto-47" />
                          <span>Analyzing SEO...</span>
                        </div>
                      )}
                    </div>
                    
                    <textarea value={editorBody} onChange={e => setEditorBody(e.target.value)} placeholder="# Write your Markdown article here...&#10;&#10;Use headings matching the AI brief and sprinkle keywords naturally." className="content-editor__text-area" />
                  </div>
                </div>

                {/* Right: SEO Score & Recommendations */}
                <div className="content-editor__col-sidebar">
                  <div className="glass-card standards-tab__element-99--auto-99">
                    <h3 className="card-header__title">SEO Scorecard</h3>
                    
                    {/* Radial Progress Score */}
                    <div className="standards-tab__element-100--auto-100">
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
                        <div className="standards-tab__element-101--auto-101">
                          <span className="standards-tab__text-span--auto-102">
                            {optimizationResult?.score || 0}
                          </span>
                          <span className="standards-tab__text-span--auto-103">
                            SEO Grade
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="layout-flex-grow">
                      <div className="standards-tab__element-104--auto-104">
                        <span className="standards-tab__text-span--auto-93">Word Count:</span>
                        <span className="standards-tab__text-span--auto-105">
                          {optimizationResult?.word_count || 0} / {brief?.targetWordCount || 1000}
                        </span>
                      </div>
                      <div className="standards-tab__element-104--auto-104">
                        <span className="standards-tab__text-span--auto-93">Keyword Density:</span>
                        <span className="standards-tab__text-span--auto-105">
                          {optimizationResult?.primary_keyword_density?.toFixed(2) || '0.00'}%
                        </span>
                      </div>
                    </div>

                    {/* Actionable Suggestions */}
                    <div className="standards-tab__element-106--auto-106">
                      <h4 className="standards-tab__title--auto-107">Optimization Checklist</h4>
                      
                      {!optimizationResult || optimizationResult.suggestions?.length === 0 ? (
                        <span className="standards-tab__text-span--auto-108">
                          Start writing to view specific recommendations.
                        </span>
                      ) : (
                        <div className="layout-flex-grow">
                          {optimizationResult.suggestions.map((sug: string, idx: number) => {
                            const isPerfect = sug.includes('✓') || sug.includes('Perfect');
                            
                            return (
                              <div key={idx} className="content-editor__suggestion-item">
                                {isPerfect ? (
                                  <CheckCircle2 size={12} color="var(--accent-green)" className="standards-tab__element-109--auto-109" />
                                ) : (
                                  <AlertCircle size={12} color="var(--accent-orange)" className="standards-tab__element-109--auto-109" />
                                )}
                                <span style={{ color: isPerfect ? 'var(--text-muted)' : 'var(--text-secondary)' }}>{sug}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Internal Link Suggestions */}
                      <div className="standards-tab__element-110--auto-110">
                        <h4 className="standards-tab__title--auto-111">
                          <Link2 size={12} color="var(--accent-primary)" />
                          <span>Internal Link Builder</span>
                        </h4>
                        <p className="standards-tab__description--auto-112">
                          Improve topical authority by linking to these relevant published pages:
                        </p>
                        {getInternalLinkSuggestions().length === 0 ? (
                          <span className="standards-tab__text-span--auto-108">
                            No published pages in this topic hub yet.
                          </span>
                        ) : (
                          <div className="standards-tab__element-113--auto-113">
                            {getInternalLinkSuggestions().map((link, idx) => (
                              <div key={idx} className="standards-tab__element-114--auto-114">
                                <div className="content-planner__element-38--auto-38">
                                  <span className="standards-tab__text-span--auto-115" title={link.title}>
                                    {link.title}
                                  </span>
                                  <span className="standards-tab__text-span--auto-116">
                                    {link.reason}
                                  </span>
                                </div>
                                <div className="standards-tab__element-117--auto-117">
                                  <span className="standards-tab__text-span--auto-118">Anchor: &quot;{link.keyword}&quot;</span>
                                  <a href={link.url} target="_blank" rel="noreferrer" className="standards-tab__link--auto-119">
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
  );
}
