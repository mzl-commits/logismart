import { useCallback, useEffect, useState } from 'react';
import { getCajas, getUbicaciones } from '../api/endpoints';

export default function AlmacenVisual() {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [ubicacionesResponse, cajasResponse] = await Promise.all([getUbicaciones(), getCajas()]);
      setUbicaciones(ubicacionesResponse.data.results ?? ubicacionesResponse.data);
      setCajas(cajasResponse.data.results ?? cajasResponse.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  const ocupadas = ubicaciones.filter((ubicacion) => ubicacion.estado_ocupacion).length;

  return <div className="space-y-6">
    <header className="flex items-center justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-light">Mapa del almacén</h1><p className="text-sm text-slate-400">Consulta la ocupación y ubicación de las cajas.</p></div>
      <button onClick={cargar} className="button" aria-label="Actualizar almacén"><i className="bi bi-arrow-clockwise" /></button>
    </header>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Metric label="Ubicaciones" value={ubicaciones.length} icon="bi-grid-3x3-gap" />
      <Metric label="Ocupadas" value={ocupadas} icon="bi-box-seam" />
      <Metric label="Cajas activas" value={cajas.filter((caja) => caja.estado !== 'despachada').length} icon="bi-archive" />
    </div>
    <section className="bg-surface border border-surface2 rounded-lg p-5">
      {loading ? <p className="text-sm text-slate-400">Cargando...</p> : <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">{ubicaciones.map((ubicacion) => <div key={ubicacion.id_ubicacion} className={`border rounded-md p-3 ${ubicacion.estado_ocupacion ? 'border-amber-500/50 bg-amber-500/10' : 'border-surface2 bg-surface2/30'}`}><p className="text-xs font-semibold text-light">{ubicacion.pasillo}{ubicacion.estante} · N{ubicacion.nivel}</p><p className="text-xs text-slate-400 mt-1">{ubicacion.estado_ocupacion ? 'Ocupada' : 'Libre'}</p></div>)}</div>}
    </section>
  </div>;
}

function Metric({ label, value, icon }) { return <div className="bg-surface border border-surface2 rounded-lg p-4 flex items-center gap-3"><i className={`bi ${icon} text-accent text-xl`} /><div><p className="text-xs text-slate-400">{label}</p><p className="text-xl font-bold text-light">{value}</p></div></div>; }
