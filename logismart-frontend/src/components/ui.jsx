import { Inbox } from 'lucide-react';

export function PageHeader({ title, description, actions, meta }) {
  return <header className="page-header">
    <div><div className="page-header__title-row"><h1>{title}</h1>{meta}</div>{description && <p>{description}</p>}</div>
    {actions && <div className="page-header__actions">{actions}</div>}
  </header>;
}

export function MetricStrip({ items }) {
  return <dl className="metric-strip">{items.map(({ label, value, tone = 'neutral', detail }) => <div key={label} className={`metric-strip__item tone-${tone}`}><dt>{label}</dt><dd>{value}</dd>{detail && <small>{detail}</small>}</div>)}</dl>;
}

export function Panel({ title, description, actions, children, className = '' }) {
  return <section className={`ui-panel ${className}`}>
    {(title || actions) && <header className="ui-panel__header"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{actions}</header>}
    <div className="ui-panel__body">{children}</div>
  </section>;
}

export function StatusBadge({ tone = 'neutral', children }) { return <span className={`status-badge tone-${tone}`}>{children}</span>; }

export function EmptyState({ title, description, icon: Icon = Inbox }) { return <div className="empty-state"><Icon size={24}/><strong>{title}</strong>{description && <p>{description}</p>}</div>; }

export function SkeletonRows({ count = 4 }) { return <div className="skeleton-rows" aria-label="Cargando">{Array.from({ length: count }, (_, index) => <span key={index}/>)}</div>; }
