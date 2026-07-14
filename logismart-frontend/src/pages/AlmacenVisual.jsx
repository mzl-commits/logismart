import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, RefreshCw, Warehouse } from 'lucide-react';
import { getCajas, getUbicaciones } from '../api/endpoints';
import WarehouseGrid from '../components/WarehouseGrid';
import { EmptyState, MetricStrip, PageHeader, Panel, SkeletonRows, StatusBadge } from '../components/ui';

const shelfLabels = { general:'General', pesado:'Carga pesada', fragil:'Frágil', quimico:'Químico', refrigerado:'Refrigerado' };

export default function AlmacenVisual() {
  const [locations, setLocations] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const [locationResponse, boxResponse] = await Promise.all([getUbicaciones(), getCajas()]);
      const nextLocations = locationResponse.data?.results ?? locationResponse.data ?? [];
      setLocations(nextLocations);
      setBoxes((boxResponse.data?.results ?? boxResponse.data ?? []).filter(box=>box.estado!=='despachada'));
      setSelected(current => nextLocations.find(item=>item.id_ubicacion===current?.id_ubicacion) || nextLocations[0] || null);
    } catch { setLoadError('No se pudo cargar el mapa del almacén.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const occupied = locations.filter(item=>item.estado_ocupacion).length;
  const occupancy = locations.length ? Math.round(occupied / locations.length * 100) : 0;
  const selectedBox = useMemo(()=>boxes.find(box=>Number(box.id_ubicacion)===Number(selected?.id_ubicacion)),[boxes,selected]);

  return <div className="page-stack">
    <PageHeader title="Mapa del almacén" description="Ubicación física organizada por pasillo, estante, nivel y casillero." actions={<button className="icon-button" onClick={load} aria-label="Actualizar almacén"><RefreshCw size={17}/></button>}/>
    {loadError && <div className="inline-alert inline-alert--warning" role="alert">{loadError} <button className="button button--secondary" onClick={load}>Reintentar</button></div>}
    <MetricStrip items={[{label:'Ubicaciones',value:locations.length},{label:'Ocupadas',value:occupied,tone:'warning'},{label:'Libres',value:locations.length-occupied,tone:'success'},{label:'Ocupación',value:`${occupancy}%`,tone:occupancy>=80?'warning':'info'}]}/>
    {loading ? <Panel><SkeletonRows count={6}/></Panel> : locations.length ? <div className="warehouse-layout">
      <Panel title="Distribución física" description="Selecciona cualquier casillero para consultar sus restricciones y contenido."><WarehouseGrid locations={locations} boxes={boxes} selectedId={selected?.id_ubicacion} onSelect={location=>setSelected(location)}/></Panel>
      <Panel title="Detalle del espacio" description={selected ? `Pasillo ${selected.pasillo} · Estante ${selected.estante} · Nivel ${selected.nivel}` : ''}>
        {selected ? <div className="warehouse-detail">
          <StatusBadge tone={selected.activo===false?'danger':selected.estado_ocupacion?'warning':'success'}>{selected.activo===false?'Fuera de servicio':selected.estado_ocupacion?'Ocupado':'Disponible'}</StatusBadge>
          <dl><div><dt>Pasillo</dt><dd>{selected.pasillo}</dd></div><div><dt>Estante</dt><dd>{selected.estante}</dd></div><div><dt>Nivel</dt><dd>{selected.nivel}</dd></div><div><dt>Casillero</dt><dd>{selected.lado === 'posterior' ? Number(selected.casillero)+2 : selected.casillero}</dd></div><div><dt>Lado</dt><dd>{selected.lado || 'adelante'}</dd></div><div><dt>Tipo</dt><dd>{shelfLabels[selected.tipo_estante] || selected.tipo_estante}</dd></div><div><dt>Capacidad</dt><dd>{selected.capacidad_peso_kg} kg</dd></div><div><dt>Dimensiones útiles</dt><dd>{selected.ancho_util_cm ?? '-'} × {selected.fondo_util_cm ?? '-'} × {selected.alto_util_cm ?? '-'} cm</dd></div><div><dt>Distancia a salida</dt><dd>{selected.distancia_salida_m ?? '-'} m</dd></div><div><dt>Prioridad</dt><dd>{(selected.prioridad_categoria || 'sin preferencia').replace('_',' ')}</dd></div></dl>
          <div><strong className="text-sm">Compatibilidad</strong><p className="text-sm text-slate-400 mt-1">{selected.permite_fragil?'Admite frágil':'No admite frágil'} · {selected.permite_quimico?'Contención química':'No admite químico'} · {selected.tipo_estante==='refrigerado'?'Cadena de frío':'Temperatura ambiente'}</p></div>
          {selectedBox ? <div className="inline-alert"><Box size={16}/><div><strong>{selectedBox.producto}</strong><span>{selectedBox.id} · {selectedBox.cantidad} unidades · {(Number(selectedBox.peso_kg) * Number(selectedBox.cantidad || 1)).toFixed(2)} kg totales</span></div></div> : <EmptyState icon={Box} title="Espacio libre" description="No hay una caja asignada a este casillero."/>}
        </div> : <EmptyState icon={Warehouse} title="Selecciona un espacio"/>}
      </Panel>
    </div> : <EmptyState icon={Warehouse} title="Sin estructura de almacén" description="Registra ubicaciones para visualizar el mapa."/>}
  </div>;
}
