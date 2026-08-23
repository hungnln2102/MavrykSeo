import React from 'react';
import { ArrowUpRight, ArrowDownRight, Sparkles, CheckCircle2, ChevronRight, Activity, TrendingUp } from 'lucide-react';
import { renderProvenanceBadge } from '../styles';

interface DashboardTabProps {
  metrics: any[];
  keywords: any[];
  chartData: any[];
  chartWidth: number | null;
  containerRef: React.RefObject<HTMLDivElement>;
  displayRecs: any[];
  apiLoading: boolean;
  apiError: string | null;
  setSelectedRecForDetail: (act: any) => void;
  setRecAssigneeId: (id: string) => void;
  setRecInternalNotes: (notes: string) => void;
  setRecClientNotes: (notes: string) => void;
}

export default function DashboardTab({
  metrics,
  keywords,
  chartData,
  chartWidth,
  containerRef,
  displayRecs,
  apiLoading,
  apiError,
  setSelectedRecForDetail,
  setRecAssigneeId,
  setRecInternalNotes,
  setRecClientNotes,
}: DashboardTabProps) {
  
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

  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);
  const [mousePos, setMousePos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const paddingX = 50;
  const chartW = (chartWidth || 800) - paddingX * 2;
  const chartH = 165;
  const startY = 185;

  const points = React.useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return [];
    }

    const maxClicks = Math.max(...chartData.map(d => d.clicks), 1);
    const maxImpressions = Math.max(...chartData.map(d => d.impressions), 1);
    const N = chartData.length;

    return chartData.map((d, i) => {
      const x = paddingX + (N > 1 ? (i * chartW) / (N - 1) : 0);
      const cY = startY - (d.clicks / maxClicks) * chartH;
      const iY = startY - (d.impressions / maxImpressions) * chartH;
      
      let formattedDate = d.date;
      try {
        const dateObj = new Date(d.date);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
      } catch (e) {}

      return {
        date: formattedDate,
        clicks: d.clicks,
        impressions: d.impressions,
        x,
        clicksY: cY,
        impressionsY: iY
      };
    });
  }, [chartData, chartW]);

  const clicksPath = React.useMemo(() => {
    if (points.length < 2) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.clicksY}`).join(' ');
  }, [points]);

  const impressionsPath = React.useMemo(() => {
    if (points.length < 2) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.impressionsY}`).join(' ');
  }, [points]);

  const clicksAreaPath = React.useMemo(() => {
    if (points.length < 2) return '';
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    return `${clicksPath} L ${lastX} 200 L ${firstX} 200 Z`;
  }, [points, clicksPath]);

  const impressionsAreaPath = React.useMemo(() => {
    if (points.length < 2) return '';
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    return `${impressionsPath} L ${lastX} 200 L ${firstX} 200 Z`;
  }, [points, impressionsPath]);

  const yLabels = React.useMemo(() => {
    if (!chartData || chartData.length === 0) return { clicks: ['0', '0', '0', '0'], impressions: ['0', '0', '0', '0'] };
    const maxClicks = Math.max(...chartData.map(d => d.clicks), 1);
    const maxImpressions = Math.max(...chartData.map(d => d.impressions), 1);

    const formatLabel = (val: number) => {
      if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
      if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
      return Math.round(val).toString();
    };

    return {
      clicks: [
        formatLabel(maxClicks),
        formatLabel(maxClicks * 0.7),
        formatLabel(maxClicks * 0.3555),
        formatLabel(maxClicks * 0.05),
      ],
      impressions: [
        formatLabel(maxImpressions),
        formatLabel(maxImpressions * 0.7),
        formatLabel(maxImpressions * 0.3555),
        formatLabel(maxImpressions * 0.05),
      ]
    };
  }, [chartData]);

  const xAxisLabels = React.useMemo(() => {
    if (points.length === 0) return [];
    if (points.length <= 6) return points;
    const indices = [
      0,
      Math.floor((points.length - 1) * 0.2),
      Math.floor((points.length - 1) * 0.4),
      Math.floor((points.length - 1) * 0.6),
      Math.floor((points.length - 1) * 0.8),
      points.length - 1
    ];
    return indices.map(idx => points[idx]);
  }, [points]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!chartWidth || points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    const hoverX = (x / rect.width) * chartWidth;
    
    let nearestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < points.length; i++) {
      const diff = Math.abs(hoverX - points[i].x);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIdx = i;
      }
    }
    setHoveredIdx(nearestIdx);
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
  };

  const x_start = paddingX;
  const x_end = (chartWidth || 800) - paddingX;

  return (
    <>
      {/* Metrics Grid */}
      <div className="dashboard-metrics-grid metrics-grid">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className="glass-card metric-card">
              <div className="metric-card__header">
                <span className="metric-card__label">
                  {m.label}
                  {m.provenance && renderProvenanceBadge(m.provenance as any)}
                </span>
                <div className="metric-card__icon-wrap">
                  <Icon size={16} color="var(--accent-primary)" />
                </div>
              </div>
              <div className="metric-card__body">
                <span className="metric-card__value">{m.value}</span>
                <span className="metric-card__change" style={{ color: m.positive ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {m.change && (m.change.startsWith('+') || m.change.startsWith('-')) ? (
                    m.positive ? <ArrowUpRight size={14} className="metric-card__change-icon" /> : <ArrowDownRight size={14} className="metric-card__change-icon" />
                  ) : null}
                  {m.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart Card */}
      <div className="glass-card performance-chart">
        <div className="dashboard-chart-header performance-chart__header">
          <div>
            <h2 className="card-header__title">Performance Overview {renderProvenanceBadge('observed')}</h2>
            <p className="card-header__subtitle">Organic traffic trends and daily impressions</p>
          </div>
          <div className="performance-chart__period">
            <button className="performance-chart__period-btn--active">Last 30 Days</button>
            <button className="performance-chart__period-btn">Last 90 Days</button>
          </div>
        </div>
        
        {/* Custom SVG Line Chart */}
        <div 
          ref={containerRef} 
          className="performance-chart__wrapper"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {chartWidth !== null && points.length > 0 && (
            <svg viewBox={`0 0 ${chartWidth} 240`} className="performance-chart__svg">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-secondary)" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="var(--accent-secondary)" stopOpacity="0.0" />
                </linearGradient>
                <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              {/* Grid Lines */}
              <line x1={x_start} y1="20" x2={x_end} y2="20" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
              <line x1={x_start} y1="75" x2={x_end} y2="75" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
              <line x1={x_start} y1="130" x2={x_end} y2="130" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
              <line x1={x_start} y1="185" x2={x_end} y2="185" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
              
              {/* Axis Y Values left (Clicks) */}
              <text x={x_start - 12} y="24" textAnchor="end" fill="var(--text-muted)" fontSize="9" fontWeight="500">{yLabels.clicks[0]}</text>
              <text x={x_start - 12} y="79" textAnchor="end" fill="var(--text-muted)" fontSize="9" fontWeight="500">{yLabels.clicks[1]}</text>
              <text x={x_start - 12} y="134" textAnchor="end" fill="var(--text-muted)" fontSize="9" fontWeight="500">{yLabels.clicks[2]}</text>
              <text x={x_start - 12} y="189" textAnchor="end" fill="var(--text-muted)" fontSize="9" fontWeight="500">{yLabels.clicks[3]}</text>

              {/* Axis Y Values right (Impressions) */}
              <text x={x_end + 12} y="24" textAnchor="start" fill="var(--text-muted)" fontSize="9" fontWeight="500">{yLabels.impressions[0]}</text>
              <text x={x_end + 12} y="79" textAnchor="start" fill="var(--text-muted)" fontSize="9" fontWeight="500">{yLabels.impressions[1]}</text>
              <text x={x_end + 12} y="134" textAnchor="start" fill="var(--text-muted)" fontSize="9" fontWeight="500">{yLabels.impressions[2]}</text>
              <text x={x_end + 12} y="189" textAnchor="start" fill="var(--text-muted)" fontSize="9" fontWeight="500">{yLabels.impressions[3]}</text>

              {/* Axis X Values (Dates) */}
              {xAxisLabels.map((p, idx) => (
                <text key={idx} x={p.x} y="215" textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontWeight="500">
                  {p.date}
                </text>
              ))}

              {/* Fill Curves */}
              {clicksAreaPath && (
                <path d={clicksAreaPath} fill="url(#chartGradient)" />
              )}
              {impressionsAreaPath && (
                <path d={impressionsAreaPath} fill="url(#purpleGradient)" />
              )}

              {/* Line Curves */}
              {clicksPath && (
                <path d={clicksPath} fill="none" stroke="var(--accent-primary)" strokeWidth="3" strokeLinecap="round" />
              )}
              {impressionsPath && (
                <path d={impressionsPath} fill="none" stroke="var(--accent-secondary)" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />
              )}

              {/* Glow guideline crosshair */}
              {hoveredIdx !== null && points[hoveredIdx] && (
                <line
                  x1={points[hoveredIdx].x}
                  y1="10"
                  x2={points[hoveredIdx].x}
                  y2="200"
                  stroke="rgba(99, 102, 241, 0.25)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              )}

              {/* Data points */}
              {hoveredIdx !== null && points[hoveredIdx] && (
                <>
                  <circle cx={points[hoveredIdx].x} cy={points[hoveredIdx].clicksY} r="7" fill="var(--accent-primary)" stroke="#fff" strokeWidth="2.5" filter="url(#glowFilter)" />
                  <circle cx={points[hoveredIdx].x} cy={points[hoveredIdx].impressionsY} r="7" fill="var(--accent-secondary)" stroke="#fff" strokeWidth="2.5" filter="url(#glowFilter)" />
                </>
              )}
            </svg>
          )}

          {/* Floating glassmorphic tooltip */}
          {hoveredIdx !== null && points[hoveredIdx] && (
            <div
              className="chart-tooltip"
              style={{
                position: 'absolute',
                left: `${(points[hoveredIdx].x / (chartWidth || 800)) * 100}%`,
                top: `${points[hoveredIdx].clicksY - 100}px`,
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
                zIndex: 100,
                padding: '0.6rem 0.8rem',
                minWidth: '150px',
                borderRadius: '8px',
                background: 'rgba(10, 13, 22, 0.95)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.2), 0 0 10px rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.2rem' }}>
                {points[hoveredIdx].date}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)' }} />
                  Clicks:
                </span>
                <strong>{points[hoveredIdx].clicks.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-secondary)' }} />
                  Impressions:
                </span>
                <strong>{points[hoveredIdx].impressions.toLocaleString()}</strong>
              </div>
            </div>
          )}
        </div>
        
        <div className="performance-chart__legends">
          <div className="performance-chart__legend-item">
            <div className="performance-chart__legend-dot" style={{ background: 'var(--accent-primary)' }} />
            <span>Clicks (Search Console)</span>
          </div>
          <div className="performance-chart__legend-item">
            <div className="performance-chart__legend-dot" style={{ border: '1px dashed var(--accent-secondary)', background: 'transparent' }} />
            <span>Impressions</span>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="details-grid">
        {/* GSC Keywords Table */}
        <div className="glass-card keywords-card">
          <div className="keywords-card__header">
            <h2 className="card-header__title">Top Keywords (GSC)</h2>
            <p className="card-header__subtitle">Queries driving the most traffic</p>
          </div>
          <div className="keywords-table__wrapper">
            <table className="keywords-table">
              <thead>
                <tr className="keywords-table__tr-head">
                  <th className="keywords-table__th">Keyword Query</th>
                  <th className="keywords-table__th keywords-table__th--right">Clicks</th>
                  <th className="keywords-table__th keywords-table__th--right">Impressions</th>
                  <th className="keywords-table__th keywords-table__th--right">CTR</th>
                  <th className="keywords-table__th keywords-table__th--right">Position</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((k, idx) => (
                  <tr key={idx} className="keywords-table__tr-body">
                    <td className="keywords-table__td--keyword">{k.query}</td>
                    <td className="keywords-table__td keywords-table__td--right">{k.clicks.toLocaleString('en-US')}</td>
                    <td className="keywords-table__td keywords-table__td--right">{k.impressions.toLocaleString('en-US')}</td>
                    <td className="keywords-table__td keywords-table__td--right">{k.ctr}</td>
                    <td className="keywords-table__td keywords-table__td--right">
                      <span className="keywords-table__badge-position">{k.pos}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Center / Recommendations */}
        <div className="glass-card actions-card">
          <div className="keywords-card__header">
            <div className="card-header__actions">
              <div>
                <h2 className="card-header__title">Action Center</h2>
                <p className="card-header__subtitle">AI generated SEO recommendations</p>
              </div>
              {apiLoading && <span className="dashboard-header__api-status--connecting">Connecting API...</span>}
              {apiError && <span className="dashboard-header__api-status--offline" title={apiError}>Offline Mode (Mock)</span>}
            </div>
          </div>
          <div className="action-center__list">
            {displayRecs.map((act) => {
              const isCompleted = act.status === 'completed';
              const pri = getPriorityDetails(act.priority);
              const indicatorColor = isCompleted ? 'var(--accent-secondary)' : pri.color;
              
              return (
                <div key={act.id} className="action-item" style={{ ...(isCompleted ? { opacity: 0.55 } : {}) }}>
                  <div className="action-item__indicator" style={{ background: indicatorColor }} />
                  <div className="action-item__body">
                    <div className="action-item__header-row">
                      <span className="action-item__title" style={{ ...(isCompleted ? { textDecoration: 'line-through', color: 'var(--text-muted)' } : {}) }}>
                        {act.title}
                      </span>
                      <span className="action-item__badge-impact" style={{ color: indicatorColor, borderColor: indicatorColor }}>
                        {isCompleted ? 'Done' : `${act.impactScore || 0} Impact`}
                      </span>
                    </div>
                    <p className="action-item__desc" style={{ ...(isCompleted ? { color: 'var(--text-muted)' } : {}) }}>
                      {act.description}
                    </p>
                    <div className="action-item__footer-row">
                      <span className="action-item__type-tag">{isCompleted ? 'Resolved' : `${act.priority.toUpperCase()}`}</span>
                      <button onClick={() => { setSelectedRecForDetail(act); setRecAssigneeId(act.assigneeId || ''); setRecInternalNotes(act.internalNotes || ''); setRecClientNotes(act.clientNotes || ''); }} className="action-item__btn-optimize" style={{ color: indicatorColor, fontWeight: isCompleted ? 500 : 600 }}>
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
  );
}
