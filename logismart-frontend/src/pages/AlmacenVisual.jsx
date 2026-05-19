import { useEffect, useState, useCallback } from 'react';
import { getUbicaciones, getCajas, getEstadoCarro, avanzarCarro, resetCarro, confirmarParada } from '../api/endpoints';

export default function AlmacenVisual() {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [carro, setCarro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('carro'); // 'carro' | 'ubicacion'
  const [ubiSeleccionada, setUbiSeleccionada] = useState(null);

  const cargarTodo = useCallback(async () => {
    try {
      const [rU, rC, rCarro] = await Promise.all([
        getUbicaciones(),
        getCajas(),
        getEstadoCarro(),
      ]);
      const getData = res => res.data.results ?? res.data;
      setUbicaciones(getData(rU));
      setCajas(getData(rC));
      setCarro(Array.isArray(rCarro.data) ? rCarro.data[0] : rCarro.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarTodo();
    const interval = setInterval(cargarTodo, 3000);
    return () => clearInterval(interval);
  }, [cargarTodo]);

  const enRuta = (x, y) => carro?.ruta?.some(p => p.x === x && p.y === y) ?? false;
  const esCarro = (x, y) => carro?.pos_x === x && carro?.pos_y === y;
  const getParada = (x, y) => {
    if (!carro?.paradas?.length) return null;
    const idx = carro.paradas.findIndex(p => p.x === x && p.y === y);
    if (idx === -1) return null;
    return { numero: idx + 1, esCurrent: idx === carro.parada_actual, esHecha: idx < carro.parada_actual };
  };

  const agruparPorPasillo = () => {
    const porPasillo = {};
    ubicaciones.forEach(u => {
      if (!porPasillo[u.pasillo]) porPasillo[u.pasillo] = [];
      porPasillo[u.pasillo].push(u);
    });
    return porPasillo;
  };

  const porPasillo = agruparPorPasillo();

  if (loading && !ubicaciones.length) {
    return (
      <div className="text-center py-12 text-slate-500">
        <div className="spinner mb-4 mx-auto"></div>
        <p className="text-sm">Cargando almacén...</p>
      </div>
    );
  }

  const catIcon = { electronica: '💻', textil: '👕', alimento: '🍎', herramienta: '🔧', quimico: '⚗️', otro: '📦' };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 fade-in">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <i className="bi bi-grid-3x3-gap text-sky-400"></i> Mapa del Almacén
          </h2>
          <p className="text-slate-500 text-sm mt-1">Recorrido del carro en tiempo real · Confirma entregas directamente aquí</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors" onClick={cargarTodo}>
            <i className="bi bi-arrow-clockwise"></i> Actualizar
          </button>
          <button className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors" onClick={async () => { await avanzarCarro(); cargarTodo(); }}>
            <i className="bi bi-skip-forward-fill"></i> Avanzar
          </button>
          <button className="border border-red-500/50 hover:bg-red-500/10 text-red-400 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors" onClick={async () => { if(confirm('¿Reiniciar carro al origen?')) { await resetCarro(); cargarTodo(); } }}>
            <i className="bi bi-x-circle"></i> Reset
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 mb-5 fade-in fade-d1 text-xs font-medium text-slate-300 bg-surface2/30 py-2 px-4 rounded-xl inline-flex border border-surface2/60">
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-emerald-800 rounded flex-shrink-0"></span>Libre</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-slate-800 rounded flex-shrink-0"></span>Ocupada</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 border-2 border-sky-400 rounded flex-shrink-0"></span>Carro</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-amber-500 rounded-full text-[9px] text-amber-950 font-bold flex items-center justify-center flex-shrink-0">N</span>Parada</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 border-2 border-dashed border-amber-600 rounded flex-shrink-0"></span>Ruta</span>
      </div>

      {/* Layout principal */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start fade-in fade-d2">
        {/* Mapa */}
        <div className="bg-surface border border-surface2/60 rounded-2xl p-6 min-h-[550px] overflow-x-auto shadow-2xl shadow-black/30">
          {!ubicaciones.length ? (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-4 rounded-xl text-sm">Sin ubicaciones.</div>
          ) : (
            Object.keys(porPasillo).sort().map(pasillo => {
              const ubis = porPasillo[pasillo].sort((a, b) => a.estante !== b.estante ? a.estante - b.estante : a.nivel - b.nivel);
              return (
                <div key={pasillo} className="flex items-start gap-4 mb-6 flex-wrap">
                  <div className="text-2xl font-black text-sky-400 w-10 shrink-0 pt-5 drop-shadow-[0_0_12px_rgba(56,189,248,0.4)]">{pasillo}</div>
                  <div className="flex gap-3.5 flex-wrap flex-1">
                    {ubis.map(u => {
                      const ocupada = u.estado_ocupacion;
                      const esCar = esCarro(u.coord_x, u.coord_y);
                      const ruta = enRuta(u.coord_x, u.coord_y);
                      const parada = getParada(u.coord_x, u.coord_y);
                      
                      let clases = `w-[100px] min-h-[85px] rounded-xl p-3 text-center cursor-pointer transition-all duration-300 border-2 relative shrink-0 select-none flex flex-col justify-center items-center backdrop-blur-sm hover:-translate-y-1 hover:scale-105 hover:z-10 hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] `;
                      
                      if (ocupada) clases += "bg-surface2 text-slate-200 border-slate-600/50 ";
                      else clases += "bg-gradient-to-br from-emerald-900 to-emerald-800 text-emerald-200 border-emerald-500/50 ";
                      
                      if (esCar) {
                        clases += "border-sky-400 bg-gradient-to-br from-sky-900 to-sky-700 !border-sky-400 animate-pulse ";
                      } else if (ruta) {
                        clases += "border-amber-500/60 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.2),0_0_16px_rgba(245,158,11,0.1)] !border-amber-500/60 ";
                      } else if (!esCar && !ocupada) {
                         clases += "border-transparent "
                      }

                      return (
                        <div key={u.id_ubicacion} className={clases} onClick={() => { setUbiSeleccionada(u); setTab('ubicacion'); }} title={`${u.pasillo}${u.estante}-N${u.nivel}`}>
                          {parada && (
                            <div className={`absolute -top-2 -right-2 w-[22px] h-[22px] rounded-full text-[10px] font-black flex items-center justify-center bg-gradient-to-br from-amber-500 to-amber-600 text-amber-950 border-2 border-slate-950 shadow-[0_2px_8px_rgba(245,158,11,0.4)] ${parada.esCurrent ? 'from-emerald-500 to-emerald-600 text-emerald-950 shadow-[0_2px_12px_rgba(34,197,94,0.5)] animate-pulse' : parada.esHecha ? 'bg-slate-700 text-slate-400 shadow-none' : ''}`}>
                              {parada.esHecha ? '✓' : parada.numero}
                            </div>
                          )}
                          <div className="text-sm font-black leading-tight tracking-wide mb-1">{u.pasillo}{u.estante}<br/>N{u.nivel}</div>
                          {esCar && <span className="text-xl block drop-shadow-md">🚗</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Panel lateral */}
        <div className="bg-gradient-to-b from-surface to-main-bg border border-surface2/60 rounded-2xl overflow-hidden sticky top-6 shadow-xl flex flex-col max-h-[calc(100vh-140px)]">
          <div className="flex border-b border-surface2/60 bg-surface2/40">
            <div className={`flex-1 py-4 text-center text-xs font-bold uppercase tracking-wider cursor-pointer transition-all border-b-2 ${tab === 'carro' ? 'text-sky-400 border-sky-500 bg-sky-500/5' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5'}`} onClick={() => setTab('carro')}>
              <i className="bi bi-truck text-base mr-1"></i> Carro
            </div>
            <div className={`flex-1 py-4 text-center text-xs font-bold uppercase tracking-wider cursor-pointer transition-all border-b-2 ${tab === 'ubicacion' ? 'text-sky-400 border-sky-500 bg-sky-500/5' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5'}`} onClick={() => setTab('ubicacion')}>
              <i className="bi bi-geo-alt text-base mr-1"></i> Ubicación
            </div>
          </div>

          <div className="p-5 overflow-y-auto flex-1">
            {tab === 'carro' ? (
              !carro ? <p className="text-slate-500 text-center py-6 text-sm">Sin datos del carro.</p> : (
                <>
                  <div className="flex justify-between items-center mb-5 bg-surface2/50 border border-surface2 p-3 rounded-xl">
                    <span className="font-bold text-sm text-slate-200 flex items-center gap-2"><i className="bi bi-truck text-sky-400"></i> Carro automatizado</span>
                    <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-800/80 text-slate-400">{carro.estado || 'esperando'}</span>
                  </div>

                  {carro.estado === 'llego' && carro.paradas?.length > 0 && (
                    <div className="mb-5 bg-surface2/40 border border-surface2 rounded-xl p-5 text-center">
                      <div className="text-3xl mb-2">🎯</div>
                      <h5 className="text-emerald-400 font-bold mb-1">¡Carro llegó!</h5>
                      <p className="text-white font-bold text-sm mb-1">{carro.paradas[carro.parada_actual]?.ubicacion_nombre}</p>
                      <button className="w-full mt-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2" onClick={async () => { await confirmarParada({ id_usuario: 1 }); cargarTodo(); }}>
                        <i className="bi bi-check-circle-fill"></i> Confirmar entrega
                      </button>
                    </div>
                  )}

                  {carro.estado === 'regresando' && (
                    <div className="mb-5 bg-violet-900/20 border border-violet-500/40 rounded-xl p-5 text-center">
                      <div className="text-3xl mb-2">🏠</div>
                      <h5 className="text-violet-300 font-bold mb-1">Regresando a base</h5>
                    </div>
                  )}

                  <div className="text-sm bg-surface2/30 border border-surface2/60 rounded-xl p-4 mb-4">
                    <div className="flex justify-between py-2 border-b border-surface2/60"><span className="text-slate-400">Posición</span> <span className="font-mono text-sky-400">({carro.pos_x}, {carro.pos_y})</span></div>
                    <div className="flex justify-between py-2 border-b border-surface2/60"><span className="text-slate-400">Destino</span> <span className="font-mono text-amber-400">({carro.destino_x}, {carro.destino_y})</span></div>
                    <div className="flex justify-between py-2"><span className="text-slate-400">Pasos restantes</span> <span className="font-bold text-white">{carro.ruta?.length ?? 0}</span></div>
                  </div>
                </>
              )
            ) : (
              !ubiSeleccionada ? (
                <div className="text-center py-8">
                  <i className="bi bi-hand-index text-5xl block mb-4 text-slate-600"></i>
                  <p className="text-sm text-slate-400">Selecciona una celda del mapa para ver detalles.</p>
                </div>
              ) : (() => {
                const u = ubiSeleccionada;
                const c = cajas.find(cx => cx.id_ubicacion === u.id_ubicacion);
                return (
                  <>
                    <div className="bg-surface2/50 border border-surface2 rounded-xl p-5 mb-5 text-center">
                      <div className="font-black text-2xl text-sky-400 drop-shadow-md">{u.pasillo}{u.estante}-N{u.nivel}</div>
                      <div className="flex justify-center gap-2 mt-3 flex-wrap">
                        <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">{u.tipo_estante}</span>
                        {u.estado_ocupacion ? <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-red-900/50 text-red-300 border border-red-500/30">Ocupada</span> : <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-900/50 text-emerald-300 border border-emerald-500/30">Libre</span>}
                        {u.permite_fragil && <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-900/50 text-sky-300 border border-sky-500/30">Frágil OK</span>}
                      </div>
                    </div>
                    
                    <div className="text-sm bg-surface2/30 border border-surface2/60 rounded-xl p-4 mb-5">
                      <div className="flex justify-between py-2 border-b border-slate-800/60"><span className="text-slate-400">Capacidad</span><span className="font-bold text-white">{u.capacidad_peso_kg} kg</span></div>
                      <div className="flex justify-between py-2 border-b border-slate-800/60"><span className="text-slate-400">Prioridad cat.</span><span className="font-bold text-white">{u.prioridad_categoria}</span></div>
                      <div className="flex justify-between py-2"><span className="text-slate-400">Coords</span><span className="font-mono text-sky-400">X:{u.coord_x} Y:{u.coord_y}</span></div>
                    </div>

                    {c ? (
                      <div className="bg-surface border border-slate-700 rounded-xl p-5 shadow-lg relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 text-7xl opacity-5">{catIcon[c.categoria] || '📦'}</div>
                        <div className="font-bold text-lg mb-1 flex items-center gap-2">{catIcon[c.categoria] || '📦'} {c.producto}</div>
                        <div className="text-slate-400 text-xs mb-3 flex items-center gap-1.5"><span className="text-sky-400 font-mono">{c.id}</span> · {c.peso_kg} kg {c.es_fragil && <span className="text-sky-300">🔷 Frágil</span>}</div>
                        <span className="inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider mb-4 bg-emerald-900/50 text-emerald-300 border border-emerald-500/30">{c.estado.replace("_"," ")}</span>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-emerald-500/50 border border-emerald-500/20 bg-emerald-500/5 rounded-xl">
                        <i className="bi bi-check-circle text-4xl block mb-2"></i>
                        <span className="text-sm font-medium">Ubicación libre</span>
                      </div>
                    )}
                  </>
                );
              })()
            )}
          </div>
        </div>
      </div>
    </>
  );
}
