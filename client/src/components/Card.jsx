import React from 'react';
export default function Card({ children, title }) {
  return (
    <div className="bg-white dark:bg-surface-900 shadow card p-4 rounded" role="region" aria-label={title || 'card'}>
      {title && <h3 className="text-sm font-medium mb-2">{title}</h3>}
      <div>{children}</div>
    </div>
  );
}
