import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { createPoliticaStock, deletePoliticaStock, getPoliticasStock, updatePoliticaStock } from '../api/endpoints';
import LocalAiSettings from '../components/LocalAiSettings';
import AccessibilitySettings from '../components/AccessibilitySettings';
import { EmptyState, PageHeader, Panel, StatusBadge } from '../components/ui';
import { toast } from 'react-hot-toast';

const emptyPolicy = { producto: '', minimo: 0, maximo: '', dias_sin_movimiento: 30, activa: true };

export default function Configuracion() {
  const [policies, setPolicies] = useState([]);
  const [policy, setPolicy] = useState(emptyPolicy);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try { const response = await getPoliticasStock(); setPolicies(response.data?.results ?? response.data ?? []); }
    catch { setLoadError('No se pudieron cargar las políticas de stock.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async event => {
    event.preventDefault(); setSaving(true);
    const payload = { ...policy, minimo:Number(policy.minimo), maximo:policy.maximo === '' ? null : Number(policy.maximo), dias_sin_movimiento:Number(policy.dias_sin_movimiento) };
    try {
      if (editingId) await updatePoliticaStock(editingId, payload); else await createPoliticaStock(payload);
      toast.success(`Política ${editingId ? 'actualizada' : 'creada'}.`);
      setPolicy(emptyPolicy); setEditingId(null); await load();
    } catch (error) { toast.error(error.response?.data?.producto?.[0] || 'No se pudo guardar la política.'); }
    finally { setSaving(false); }
  };

  const edit = item => { setEditingId(item.id); setPolicy({ producto:item.producto, minimo:item.minimo, maximo:item.maximo ?? '', dias_sin_movimiento:item.dias_sin_movimiento, activa:item.activa }); };
  const remove = async item => { try { await deletePoliticaStock(item.id); toast.success('Política eliminada.'); await load(); } catch { toast.error('No se pudo eliminar la política.'); } };

  return <div className="page-stack">
    <PageHeader title="Configuración" description="Reglas operativas, accesibilidad y servicios locales." actions={<button className="icon-button" onClick={load} aria-label="Actualizar configuración"><RefreshCw size={17}/></button>} />
    {loadError && <div className="inline-alert inline-alert--warning" role="alert">{loadError} <button className="button button--secondary" onClick={load}>Reintentar</button></div>}
    <Panel title="Políticas de stock" description="Define umbrales por producto para activar alertas operativas.">
      <form className="stock-policy-form" onSubmit={save}>
        <label><span>Producto exacto</span><input required value={policy.producto} onChange={e=>setPolicy({...policy,producto:e.target.value})}/></label>
        <label><span>Mínimo</span><input type="number" min="0" required value={policy.minimo} onChange={e=>setPolicy({...policy,minimo:e.target.value})}/></label>
        <label><span>Máximo</span><input type="number" min="0" value={policy.maximo} onChange={e=>setPolicy({...policy,maximo:e.target.value})}/></label>
        <label><span>Días sin movimiento</span><input type="number" min="1" required value={policy.dias_sin_movimiento} onChange={e=>setPolicy({...policy,dias_sin_movimiento:e.target.value})}/></label>
        <button className="button button--primary" disabled={saving}><Plus size={16}/>{saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Agregar política'}</button>
        {editingId && <button type="button" className="button button--secondary" onClick={()=>{setEditingId(null);setPolicy(emptyPolicy);}}>Cancelar</button>}
      </form>
      {loading ? <p className="text-sm text-slate-400">Cargando políticas...</p> : policies.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th>Producto</th><th>Mínimo</th><th>Máximo</th><th>Inactividad</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{policies.map(item=><tr key={item.id}><td>{item.producto}</td><td>{item.minimo}</td><td>{item.maximo ?? 'Sin límite'}</td><td>{item.dias_sin_movimiento} días</td><td><StatusBadge tone={item.activa?'success':'neutral'}>{item.activa?'Activa':'Inactiva'}</StatusBadge></td><td><div className="flex gap-2"><button className="button button--secondary" onClick={()=>edit(item)}>Editar</button><button className="icon-button" aria-label={`Eliminar política ${item.producto}`} onClick={()=>remove(item)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div> : <EmptyState title="Sin políticas configuradas" description="Agrega una regla para comenzar a recibir alertas de mínimo, máximo e inmovilización."/>}
    </Panel>
    <LocalAiSettings />
    <AccessibilitySettings />
  </div>;
}
