import { useEffect, useState, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  getCajas, getUbicaciones, getHistorial, getDespachos, getCategorias, procesarCaja, confirmarAlmacenada
} from '../api/endpoints';

const CAT_ICON_CLASS = {
  electronica: 'bi-cpu',
  textil:      'bi-tag',
  alimento:    'bi-egg-fried',
  herramienta: 'bi-tools',
  quimico:     'bi-funnel',
  otro:        'bi-box-seam',
};

export default function Dashboard() {
  const [cajas, setCajas] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estadoFiltro, setEstadoFiltro] = useState('all');
  const [categoriaFiltro, setCategoriaFiltro] = useState('all');
  const [categorias, setCategorias] = useState([]);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rc, ru, rh, rd, rcat] = await Promise.all([
        getCajas(), getUbicaciones(), getHistorial(), getDespachos(), getCategorias()
      ]);
      const getData = res => res.data?.results ?? res.data ?? [];

      const cajasData = getData(rc);
      const despachosData = getData(rd);

      setCajas(cajasData);
      setUbicaciones(getData(ru));
      setHistorial(getData(rh).slice(0, 15));
      setCategorias(getData(rcat));

      // Construir datos de gráfico por fecha (últimos 7 días)
      const hoy = new Date();
      const dias = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(hoy);
        d.setDate(hoy.getDate() - (6 - i));
        return d.toISOString().slice(0, 10);
      });

      const countPor = (arr, campo) =>
         dias.map(f => arr.filter(x => (x[campo] ?? '').slice(0, 10) === f).length);

      setChartData(dias.map((f, i) => ({
        fecha: f.slice(5),
        ingresos: countPor(cajasData, 'hora_llegada')[i],
        salidas: countPor(despachosData, 'fecha_salida')[i],
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activas = cajas.filter(c => c.estado !== 'despachada');
  const filtradas = activas.filter(c => (estadoFiltro === 'all' || c.estado === estadoFiltro) && (categoriaFiltro === 'all' || c.categoria === categoriaFiltro));
  const pendientes = cajas.filter(c => c.estado === 'pendiente').length;

  const getUbicacionNombre = (id) => {
    if (!id) return '—';
    const u = ubicaciones.find(x => x.id_ubicacion === id || x.id === id);
    if (u) return `${u.pasillo}${u.estante}-N${u.nivel}`;
    return id;
  };
  const enTransito = cajas.filter(c => c.estado === 'en_transito').length;
  const almacenadas = cajas.filter(c => c.estado === 'almacenada').length;
  const totalUbic = ubicaciones.length;
  const ocupadas = ubicaciones.filter(u => u.estado_ocupacion).length;
  const libres = totalUbic - ocupadas;
  const pctOcupacion = totalUbic ? Math.round((ocupadas / totalUbic) * 100) : 0;

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[300px] text-light">
      <div className="spinner mb-3"></div>
      Cargando dashboard...
    </div>
  );

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 fade-in">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <i className="bi bi-speedometer2 text-sky-400"></i> Dashboard
          </h2>
          <p className="text-slate-500 text-sm mt-1">Cajas activas · Almacén · Historial</p>
        </div>
        <div className="text-right">
          <NavLink to="/cajas" className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all hover:-translate-y-0.5 no-underline">
            <i className="bi bi-plus-lg"></i> Nueva caja
          </NavLink>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="fade-in bg-surface/80 border border-surface2/50 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
          <div className="text-2xl flex items-center justify-center w-14 h-14 rounded-2xl bg-surface2/60 text-accent">
            <i className="bi bi-box-seam" />
          </div>
          <div>
            <div className="text-3xl font-bold tracking-tight text-light">{activas.length}</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-1">Total cajas</div>
          </div>
        </div>
        <div className="fade-in fade-d1 bg-surface/80 border border-surface2/50 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
          <div className="text-2xl flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500">
            <i className="bi bi-hourglass-split" />
          </div>
          <div>
            <div className="text-3xl font-bold tracking-tight text-amber-500/90">{pendientes}</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-1">Pendientes</div>
          </div>
        </div>
        <div className="fade-in fade-d2 bg-surface/80 border border-surface2/50 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
          <div className="text-2xl flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-400">
            <i className="bi bi-truck" />
          </div>
          <div>
            <div className="text-3xl font-bold tracking-tight text-sky-400/90">{enTransito}</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-1">En tránsito</div>
          </div>
        </div>
        <div className="fade-in fade-d3 bg-surface/80 border border-surface2/50 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
          <div className="text-2xl flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500">
            <i className="bi bi-check-circle" />
          </div>
          <div>
            <div className="text-3xl font-bold tracking-tight text-emerald-500">{almacenadas}</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-1">Almacenadas</div>
          </div>
        </div>
      </div>

      {/* Ocupación */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 fade-in fade-d1">
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-slate-800/60 p-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-base font-semibold flex items-center gap-2"><i className="bi bi-building text-sky-400"></i> Ocupación física</span>
            <span className="text-sm">
              <span className={`${pctOcupacion >= 90 ? 'text-red-500' : pctOcupacion >= 70 ? 'text-amber-500' : 'text-emerald-400'} font-bold`}>{ocupadas}</span>
              <span className="text-slate-600"> / {totalUbic}</span> · <strong className="text-white">{pctOcupacion}%</strong>
            </span>
          </div>
          <div className="h-2.5 bg-[#2A2A30] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${pctOcupacion >= 90 ? 'bg-gradient-to-r from-red-600 to-red-500' : pctOcupacion >= 70 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-500'}`} style={{ width: `${pctOcupacion}%` }}></div>
          </div>
          <div className="flex justify-between mt-3 text-xs text-slate-500">
            <span>{libres} libres · incluye reservas en tránsito</span>
            <span>{pctOcupacion >= 90 ? <><i className="bi bi-exclamation-triangle-fill text-red-500" /> Crítico</> : pctOcupacion >= 70 ? 'Capacidad alta' : 'Normal'}</span>
          </div>
        </div>
        <div className="bg-surface rounded-2xl border border-slate-800/60 p-6 flex items-center justify-center gap-6">
          <div style={{ width: 100, height: 100 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{ value: ocupadas }, { value: libres }]} innerRadius={35} outerRadius={50} dataKey="value" stroke="none">
                  <Cell fill={pctOcupacion >= 90 ? '#dc2626' : pctOcupacion >= 70 ? '#d97706' : '#52A27F'} />
                  <Cell fill="#2A2A30" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-extrabold ${pctOcupacion >= 90 ? 'text-red-500' : pctOcupacion >= 70 ? 'text-amber-500' : 'text-emerald-400'}`}>{pctOcupacion}%</div>
            <div className="text-xs text-slate-500 mt-1">Ocupación</div>
          </div>
        </div>
      </div>

      {/* Tabla + Historial */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 fade-in fade-d2 mb-6">
        {/* Tabla */}
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-slate-800/60 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-surface2/60">
            <div className="flex items-center justify-between mb-4">
              <span className="text-base font-semibold flex items-center gap-2"><i className="bi bi-box-seam text-sky-400"></i> Cajas activas</span>
              <NavLink to="/cajas" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors no-underline">
                <i className="bi bi-plus-lg"></i> Agregar
              </NavLink>
            </div>
            
            <div className="flex gap-2 flex-wrap mb-3">
              <span className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-all ${estadoFiltro === 'all' ? 'border-sky-500/30 text-sky-400 bg-sky-500/15' : 'border-surface2 text-slate-400 hover:text-slate-200 hover:border-slate-500'}`} onClick={() => setEstadoFiltro('all')}>Todas</span>
              <span className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-all ${estadoFiltro === 'pendiente' ? 'border-sky-500/30 text-sky-400 bg-sky-500/15' : 'border-surface2 text-slate-400 hover:text-slate-200 hover:border-slate-500'}`} onClick={() => setEstadoFiltro('pendiente')}>Pendiente</span>
              <span className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-all ${estadoFiltro === 'en_transito' ? 'border-sky-500/30 text-sky-400 bg-sky-500/15' : 'border-surface2 text-slate-400 hover:text-slate-200 hover:border-slate-500'}`} onClick={() => setEstadoFiltro('en_transito')}>En tránsito</span>
              <span className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-all ${estadoFiltro === 'almacenada' ? 'border-sky-500/30 text-sky-400 bg-sky-500/15' : 'border-surface2 text-slate-400 hover:text-slate-200 hover:border-slate-500'}`} onClick={() => setEstadoFiltro('almacenada')}>Almacenada</span>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <span className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-all ${categoriaFiltro === 'all' ? 'border-indigo-500/30 text-indigo-400 bg-indigo-500/15' : 'border-surface2 text-slate-400 hover:text-slate-200 hover:border-slate-500'}`} onClick={() => setCategoriaFiltro('all')}>Todas cat.</span>
              {categorias.map(cat => (
                <span key={cat.slug} className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-all flex items-center gap-1.5 ${categoriaFiltro === cat.slug ? 'border-indigo-500/30 text-indigo-400 bg-indigo-500/15' : 'border-surface2 text-slate-400 hover:text-slate-200 hover:border-slate-500'}`} onClick={() => setCategoriaFiltro(cat.slug)}>
                  <i className={`bi ${CAT_ICON_CLASS[cat.slug] || 'bi-box-seam'}`} /> {cat.nombre}
                </span>
              ))}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/40">
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-slate-300 px-6 py-4">Producto / ID</th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-slate-300 px-4 py-4">Categoría</th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-slate-300 px-4 py-4">Peso</th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-slate-300 px-4 py-4">Prioridad</th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-slate-300 px-4 py-4">Estado</th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-slate-300 px-4 py-4">Ubicación</th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-slate-300 px-4 py-4">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface2/30">
              {filtradas.slice(0, 30).map((caja, i) => (
                <tr key={caja.id || i} className="hover:bg-surface2/20 transition-colors">
                  <td className="px-6 py-3">
                    <div className="font-medium text-slate-200 text-base flex items-center gap-1.5">
                      {caja.producto || '—'} 
                      {caja.es_fragil && <i className="bi bi-shield-fill-exclamation text-sky-400 text-xs" title="Frágil" />}
                    </div>
                    <div className="text-xs text-slate-500">{caja.id}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">{caja.categoria}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{caja.peso_kg} kg</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold 
                      ${caja.prioridad === 'urgente' ? 'bg-red-500/15 text-red-400 border border-red-500/20 animate-pulse' :
                        caja.prioridad === 'alta' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                        caja.prioridad === 'media' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20' :
                        'bg-slate-500/15 text-slate-400 border border-slate-500/20'}`}>
                      {caja.prioridad || 'normal'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold 
                      ${caja.estado === 'pendiente' ? 'bg-amber-600/20 text-amber-400' :
                        caja.estado === 'en_transito' ? 'bg-sky-600/20 text-sky-400' :
                        'bg-emerald-600/20 text-emerald-400'}`}>
                      {caja.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {caja.estado === 'pendiente' ? (
                      <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">—</span>
                    ) : caja.id_ubicacion ? (
                      <span className="text-sm text-slate-400">{getUbicacionNombre(caja.id_ubicacion)}</span>
                    ) : (
                      <span className="text-slate-600 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {caja.estado === 'pendiente' ? (
                      <button className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors" onClick={async () => { if(confirm('¿Procesar y enviar al almacén?')){ await procesarCaja(caja.id, {id_usuario: 1}); load(); }}}>
                        <i className="bi bi-play-fill"></i> Procesar
                      </button>
                    ) : caja.estado === 'en_transito' ? (
                      <button className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors" onClick={async () => { if(confirm('¿Confirmar que fue colocada en el estante?')){ await confirmarAlmacenada(caja.id, {id_usuario: 1}); load(); }}}>
                        <i className="bi bi-check-lg"></i> Entregar
                      </button>
                    ) : caja.estado === 'almacenada' ? (
                      <button className="border border-surface2 hover:border-slate-500 text-slate-400 hover:text-white text-xs px-3 py-1.5 rounded-lg transition-colors" onClick={() => navigate('/despachos')}>
                        <i className="bi bi-truck"></i> Despachar
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Historial */}
        <div className="bg-surface rounded-2xl border border-slate-800/60 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-800/60 shrink-0">
            <span className="text-base font-semibold flex items-center gap-2"><i className="bi bi-clock-history text-sky-400"></i> Historial Reciente</span>
          </div>
          <div className="p-6 space-y-2 overflow-y-auto flex-1 max-h-[500px]">
            {historial.map((log, i) => (
              <div key={log.id_historial || log.id || i} className="relative px-4 py-3 border border-slate-800/50 hover:bg-slate-800/20 rounded-lg transition-colors group">
                <div className={`absolute left-[-7px] top-4 w-3 h-3 rounded-full ring-4 ring-surface shadow-[0_0_8px_currentColor]
                  ${log.tipo_movimiento === 'almacenamiento' ? 'bg-emerald-500 text-emerald-500' :
                    log.tipo_movimiento === 'despacho' ? 'bg-violet-500 text-violet-500' : 'bg-sky-500 text-sky-500'}`}>
                </div>
                <div className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors">{log.id_caja}</div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                  Acción: <span className="text-slate-300 font-medium">{log.tipo_movimiento}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">{new Date(log.fecha_cambio).toLocaleString('es-PE')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-surface rounded-2xl border border-slate-800/60 p-6 fade-in fade-d3 mb-4">
        <div className="text-base font-semibold flex items-center gap-2 mb-4"><i className="bi bi-graph-up text-sky-400"></i> Flujo de Cajas (Últimos 7 días)</div>
        <div style={{ height: 320, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" vertical={false} />
              <XAxis dataKey="fecha" tick={{fill:'#94A3B8',fontSize:12}} axisLine={false} tickLine={false} />
              <YAxis tick={{fill:'#94A3B8',fontSize:12}} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{background:'#121214',border:'1px solid #2A2A30',borderRadius:8,fontSize:13,color:'#F8FAFC'}}
                itemStyle={{color:'#F8FAFC'}}
              />
              <Legend wrapperStyle={{fontSize:13, color:'#94A3B8'}} />
              <Line type="monotone" dataKey="ingresos" stroke="#8E95A5" strokeWidth={3} dot={false} name="Cajas Ingresadas" />
              <Line type="monotone" dataKey="salidas" stroke="#52A27F" strokeWidth={3} dot={false} name="Cajas Despachadas" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
