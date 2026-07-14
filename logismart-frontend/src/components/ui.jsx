import { useEffect, useId, useRef } from 'react';
import { Inbox, X } from 'lucide-react';

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

export function Modal({ isOpen, onClose, title, children, size = 'default', contentClassName = '' }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const restoreFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    restoreFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTarget = closeButtonRef.current || dialogRef.current;
    focusTarget?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = [...dialogRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      restoreFocusRef.current?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity fade-in"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        className={`modal-dialog ${size === 'wide' ? 'modal-dialog--wide' : ''} bg-surface border border-slate-700 rounded-2xl shadow-2xl shadow-black w-full max-w-lg overflow-hidden flex flex-col`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex="-1"
      >
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
          <h3 id={titleId} className="text-lg font-bold text-slate-100">{title}</h3>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="icon-button modal-close" aria-label="Cerrar ventana">
            <X size={20}/>
          </button>
        </div>
        <div className={`modal-content p-6 overflow-y-auto max-h-[70vh] ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
