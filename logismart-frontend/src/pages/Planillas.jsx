import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Clock3, UserRound, FileText } from 'lucide-react';
import { completarPlanilla, getPlanillas } from '../api/endpoints';
import { EmptyState, MetricStrip, PageHeader, Panel, StatusBadge } from '../components/ui';

export default function Planillas() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todas');
  const [busy, setBusy] = useState(null);

  const load = async () => { setLoading(true); try { const response = await getPlanillas(); setItems(response.data?.results ?? response.data ?? []); } finally { setLoading(false); } };
  useEffect(() => { const timer = setTimeout(() => { void load(); }, 0); return () => clearTimeout(timer); }, []);

  const visible = useMemo(() => items.filter((item) => filter === 'todas' || (filter === 'completadas' ? item.completada : !item.completada)), [items, filter]);
  const completed = items.filter((item) => item.completada).length;
  const complete = async (id) => { if (!confirm('¿Marcar esta planilla como completada?')) return; setBusy(id); try { await completarPlanilla(id); await load(); } finally { setBusy(null); } };

  if (loading && !items.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px', color: 'var(--color-muted)' }}>
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
        <p style={{ fontSize: '14px', fontWeight: 500 }}>Cargando planillas...</p>
      </div>
    );
  }

  return <div className="page-stack">
    <PageHeader title="Planillas de trabajo" description="Asignaciones operativas, responsables y estado de cumplimiento." />
    <MetricStrip items={[{label:'Total',value:items.length},{label:'Pendientes',value:items.length-completed,tone:'warning'},{label:'Completadas',value:completed,tone:'success'}]} />
    <Panel title="Seguimiento" description="Prioriza las planillas pendientes y conserva la trazabilidad de cierre." actions={<div className="segmented-control" role="tablist">{['todas','pendientes','completadas'].map(value=><button key={value} role="tab" aria-selected={filter===value} onClick={()=>setFilter(value)}>{value[0].toUpperCase()+value.slice(1)}</button>)}</div>}>
      {visible.length ? <div className="worklist">{visible.map((item)=><article className="worklist__row" key={item.id_planilla}>
        <div className="worklist__identity"><span className="worklist__icon"><ClipboardList size={18}/></span><div><strong>Planilla {item.id_planilla}</strong><small>{item.total_cajas} cajas asignadas</small></div></div>
        <div className="worklist__assignee"><span><UserRound size={14}/>{item.operador_nombre || item.operador_usuario || 'Sin asignar'}</span></div>
        <div className="worklist__date"><span><Clock3 size={14}/>{new Date(item.fecha_creacion).toLocaleString('es-PE')}</span></div>
        <StatusBadge tone={item.completada?'success':'warning'}>{item.completada?'Completada':'Pendiente'}</StatusBadge>
        <div className="worklist__action" style={{ display: 'flex', gap: '8px' }}>
          <a className="button" href={`/ver-pdf-lote?cajas=${Array.isArray(item.cajas_ids) ? item.cajas_ids.join(',') : (item.cajas_ids || '')}&usuario_id=${item.operador || ''}`} target="_blank" rel="noopener noreferrer"><FileText size={16}/> Previsualizar</a>
          <button className={`button ${item.completada ? 'button--outline' : 'button--primary'}`} disabled={item.completada || busy === item.id_planilla} onClick={() => !item.completada && complete(item.id_planilla)}>
            <CheckCircle2 size={16} />{item.completada ? 'Completado' : busy === item.id_planilla ? 'Guardando' : 'Completar'}
          </button>
        </div>
      </article>)}</div> : <EmptyState title="No hay planillas en este estado" description="Cambia el filtro para consultar el resto de asignaciones."/>}
    </Panel>
  </div>;
}
