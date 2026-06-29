import { useEffect, useMemo, useState } from 'react';
import { completarPlanilla, getPlanillas } from '../api/endpoints';

export default function Planillas() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todas');
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await getPlanillas();
      setItems(response.data?.results ?? response.data ?? []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const visible = useMemo(() => items.filter(p =>
    filter === 'todas' || (filter === 'completadas' ? p.completada : !p.completada)
  ), [items, filter]);
  const completed = items.filter(p => p.completada).length;

  const complete = async (id) => {
    if (!confirm('¿Marcar esta planilla como completada? Esta acción registra al usuario y la fecha.')) return;
    setBusy(id);
    try { await completarPlanilla(id); await load(); }
    catch (error) { alert(error.response?.data?.detail || 'No se pudo completar la planilla.'); }
    finally { setBusy(null); }
  };

  return <div className="space-y-6">
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div><h1 className="text-2xl font-bold">Planillas de trabajo</h1><p className="text-sm text-muted mt-1">Seguimiento general de asignaciones y cumplimiento.</p></div>
      <div className="flex gap-3">
        <Metric label="Total" value={items.length} />
        <Metric label="Completadas" value={completed} accent />
        <Metric label="Pendientes" value={items.length - completed} />
      </div>
    </header>
    <div className="flex gap-2" role="tablist" aria-label="Filtrar planillas">
      {['todas','pendientes','completadas'].map(value => <button key={value} onClick={() => setFilter(value)} className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${filter===value?'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent':'bg-surface border-slate-200 dark:border-slate-700 text-muted'}`}>{value[0].toUpperCase()+value.slice(1)}</button>)}
    </div>
    {loading ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4" aria-label="Cargando planillas">{[1,2,3].map(x=><div key={x} className="h-52 rounded-2xl bg-surface2 animate-pulse" />)}</div> :
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visible.map(p => <article key={p.id_planilla} className="bg-surface border border-slate-200 dark:border-slate-800 rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex justify-between gap-3"><div><span className="text-xs text-muted">PLANILLA</span><h2 className="text-lg font-bold">#{p.id_planilla}</h2></div><Status completed={p.completada}/></div>
          <dl className="mt-5 space-y-2 text-sm"><Info label="Operador" value={p.operador_nombre || p.operador_usuario}/><Info label="Cajas" value={p.total_cajas}/><Info label="Creada" value={new Date(p.fecha_creacion).toLocaleString('es-PE')}/>{p.fecha_completada&&<Info label="Completada" value={new Date(p.fecha_completada).toLocaleString('es-PE')}/>}</dl>
          {!p.completada && <button disabled={busy===p.id_planilla} onClick={()=>complete(p.id_planilla)} className="mt-5 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold transition">{busy===p.id_planilla?'Guardando…':'Marcar completada'}</button>}
        </article>)}
      </div>}
  </div>;
}
function Metric({label,value,accent}) { return <div className="min-w-24 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3"><div className={`text-xl font-bold ${accent?'text-emerald-500':''}`}>{value}</div><div className="text-xs text-muted">{label}</div></div> }
function Status({completed}) { return <span className={`h-fit px-3 py-1 rounded-lg text-xs font-bold ${completed?'bg-emerald-500/15 text-emerald-500':'bg-amber-500/15 text-amber-500'}`}>{completed?'Completada':'Pendiente'}</span> }
function Info({label,value}) { return <div className="flex justify-between gap-3"><dt className="text-muted">{label}</dt><dd className="font-medium text-right">{value || '—'}</dd></div> }
