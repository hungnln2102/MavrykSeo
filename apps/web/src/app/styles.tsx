import React from 'react';

export function renderProvenanceBadge(type: 'observed' | 'derived' | 'estimated' | 'ai') {
  let text = '';
  let bg = '';
  let color = '';
  if (type === 'observed') {
    text = 'Observed';
    bg = 'rgba(59, 130, 246, 0.1)';
    color = 'rgb(147, 197, 253)';
  } else if (type === 'derived') {
    text = 'Derived';
    bg = 'rgba(245, 158, 11, 0.1)';
    color = 'rgb(253, 186, 116)';
  } else if (type === 'estimated') {
    text = 'Estimated';
    bg = 'rgba(16, 185, 129, 0.1)';
    color = 'rgb(167, 243, 208)';
  } else if (type === 'ai') {
    text = 'AI-Generated';
    bg = 'rgba(139, 92, 246, 0.1)';
    color = 'rgb(196, 181, 253)';
  }

  return (
    <span style={{
      fontSize: '0.65rem',
      fontWeight: 650,
      padding: '0.1rem 0.35rem',
      borderRadius: '3px',
      marginLeft: '0.35rem',
      background: bg,
      color: color,
      border: `1px solid ${color.replace('rgb', 'rgba').replace(')', ', 0.25)')}`,
      textTransform: 'uppercase',
      letterSpacing: '0.025em',
      verticalAlign: 'middle',
      display: 'inline-block'
    }}>
      {text}
    </span>
  );
}
