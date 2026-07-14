import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, CheckSquare, MapPin, Truck } from 'lucide-react';
import { despacharInventarioLote, getCajas, getDespachos, getDestinos, getVehiculos } from '../api/endpoints';
import { EmptyState, MetricStrip, PageHeader, Panel, SkeletonRows, StatusBadge } from '../components/ui';
import { toast } from 'react-hot-toast';

export default function Despachos() {
  const [data,setData]=useState({despachos:[],cajas:[],destinos:[],vehiculos:[]});
  const [selected,setSelected]=useState([]); const [form,setForm]=useState({placa:'',destino:'',cantidad:1});
  const [loading,setLoading]=useState(true); const [processing,setProcessing]=useState(false); const [loadError,setLoadError]=useState('');
  const idempotencyKey = useRef(null);
  const load=useCallback(async()=>{setLoading(true);setLoadError('');try{const [d,c,t,v]=await Promise.all([getDespachos(),getCajas(),getDestinos(),getVehiculos()]);const rows=(r)=>r.data?.results??r.data??[];setData({despachos:rows(d),cajas:rows(c).filter(x=>x.estado==='almacenada'),destinos:rows(t),vehiculos:rows(v)});}catch(error){setLoadError('No se pudo cargar la informacion de despachos. Intenta nuevamente.');console.error(error);}finally{setLoading(false);}},[]);
  useEffect(()=>{const timer=setTimeout(()=>{void load();},0);return()=>clearTimeout(timer);},[load]);
  const weight=useMemo(()=>selected.reduce((sum,id)=>{const item=data.cajas.find(x=>x.id===id);return sum+Number(item?.peso_kg||0)*Math.min(Number(item?.cantidad||1),Number(form.cantidad||1));},0),[selected,data.cajas,form.cantidad]);
  const toggle=(id)=>setSelected(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);
  const dispatch=async()=>{if(!form.placa||!form.destino||!selected.length)return;setProcessing(true);idempotencyKey.current ||= crypto.randomUUID();try{const items=selected.map(id=>{const item=data.cajas.find(x=>x.id===id);return {caja:id,cantidad:Math.min(Number(item?.cantidad||1),Number(form.cantidad||1))};});await despacharInventarioLote({items,transporte_placa:form.placa,destino:form.destino,idempotency_key:idempotencyKey.current});idempotencyKey.current=null;setSelected([]);setForm({placa:'',destino:'',cantidad:1});toast.success('Despacho registrado correctamente.');await load();}catch(error){toast.error(error.response?.data?.error||'No se pudo registrar el despacho. Puedes reintentar sin duplicar la salida.');}finally{setProcessing(false);}};
  const ready=data.cajas.length;

  if (loading && !data.cajas.length && !data.despachos.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px', color: 'var(--color-muted)' }}>
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
        <p style={{ fontSize: '14px', fontWeight: 500 }}>Cargando datos...</p>
      </div>
    );
  }

  return <div className="page-stack">
    <PageHeader title="Despachos" description="Selecciona la carga, asigna transporte y registra la salida del almacén." />
    {loadError && <div className="inline-alert inline-alert--warning" role="alert">{loadError} <button className="button button--secondary" onClick={load}>Reintentar</button></div>}
    <MetricStrip items={[{label:'Listas para salida',value:ready,tone:ready?'info':'neutral'},{label:'Seleccionadas',value:selected.length,tone:selected.length?'warning':'neutral'},{label:'Peso seleccionado',value:`${weight.toFixed(1)} kg`},{label:'Salidas registradas',value:data.despachos.length,tone:'success'}]} />
    <div className="dispatch-layout">
      <Panel title="Carga disponible" description="Cajas almacenadas que pueden incluirse en el siguiente despacho." actions={data.cajas.length?<label className="select-all"><input type="checkbox" checked={selected.length===data.cajas.length} onChange={e=>setSelected(e.target.checked?data.cajas.map(x=>x.id):[])}/>Seleccionar todas</label>:null}>
        {loading?<SkeletonRows count={5}/>:data.cajas.length?<div className="dispatch-list">{data.cajas.map(item=><label className={`dispatch-row ${selected.includes(item.id)?'is-selected':''}`} key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={()=>toggle(item.id)}/><span className="dispatch-row__icon"><Box size={17}/></span><span className="dispatch-row__main"><strong>{item.producto||'Producto sin nombre'}</strong><small>{item.id} / {item.categoria||'Sin categoría'}</small></span><span className="dispatch-row__weight">{item.peso_kg} kg</span><StatusBadge tone="success">{item.id_ubicacion||'Almacén'}</StatusBadge></label>)}</div>:<EmptyState title="No hay carga disponible" description="Las cajas aparecerán aquí cuando estén almacenadas."/>}
      </Panel>
      <div className="dispatch-side">
        <Panel title="Registrar salida" description="Completa los datos del transporte."><div className="form-stack">
          <label><span>Vehículo</span><select value={form.placa} onChange={e=>setForm({...form,placa:e.target.value})}><option value="">Seleccionar vehículo</option>{data.vehiculos.map(x=><option key={x.placa} value={x.placa}>{x.placa} / {x.marca} / {x.capacidad_kg} kg</option>)}</select></label>
          <label><span>Destino</span><select value={form.destino} onChange={e=>setForm({...form,destino:e.target.value})}><option value="">Seleccionar destino</option>{data.destinos.map(x=><option key={x.nombre} value={x.nombre}>{x.nombre} / {x.direccion}</option>)}</select></label>
          <label><span>Unidades por referencia</span><input type="number" min="1" value={form.cantidad} onChange={e=>setForm({...form,cantidad:Math.max(1,Number(e.target.value)||1)})}/><small>Si una referencia tiene menos unidades, se despachará únicamente su saldo disponible.</small></label>
          <button className="button button--primary dispatch-submit" disabled={processing||!selected.length||!form.placa||!form.destino} onClick={dispatch}><Truck size={17}/>{processing?'Registrando':'Confirmar despacho'}</button>
        </div></Panel>
        <Panel title="Últimas salidas"><div className="recent-dispatches">{data.despachos.slice(0,6).map(item=><article key={item.id_despacho}><span><CheckSquare size={16}/></span><div><strong>{item.id_caja_id}</strong><small><Truck size={12}/>{item.transporte_placa}<MapPin size={12}/>{item.destino}</small></div><time>{new Date(item.fecha_salida).toLocaleDateString('es-PE')}</time></article>)}{!data.despachos.length&&<EmptyState title="Sin despachos registrados"/>}</div></Panel>
      </div>
    </div>
  </div>;
}
