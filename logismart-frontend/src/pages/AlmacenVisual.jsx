import { useEffect, useState, useCallback } from 'react';
import { getUbicaciones, getCajas, getEstadoCarro, avanzarCarro, resetCarro, confirmarParada } from '../api/endpoints';

/* ── helpers ─────────────────────────────────────── */
const CAT_ICON  = { electronica:'💻', textil:'👕', alimento:'🍎', herramienta:'🔧', quimico:'⚗️', otro:'📦' };
const CAT_COLOR = {
  electronica: 'from-blue-900/80 to-blue-800/60 border-blue-500/50',
  textil:      'from-pink-900/80 to-pink-800/60 border-pink-500/50',
  alimento:    'from-green-900/80 to-green-800/60 border-green-500/50',
  herramienta: 'from-orange-900/80 to-orange-800/60 border-orange-500/50',
  quimico:     'from-purple-900/80 to-purple-800/60 border-purple-500/50',
  otro:        'from-slate-800/80 to-slate-700/60 border-slate-500/50',
};

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="bg-surface border border-surface2 rounded-xl p-3 flex items-center gap-3">
      <div className="text-2xl">{icon}</div>
      <div>
        <div className="text-xl font-black leading-none text-light">{value}</div>
        <div className="text-[10px] font-semibold text-muted uppercase tracking-wider mt-0.5">{label}</div>
        {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
      </div>
    </div>
  );
}

/* ── celda del mapa ──────────────────────────────── */
function CeldaUbi({ u, esCar, enRuta, parada, onClick }) {
  const ocupada = u.estado_ocupacion;

  let base = 'warehouse-cell relative flex flex-col items-center justify-center text-center cursor-pointer select-none transition-all duration-200 rounded-xl border-2 ';
  let style = {};

  if (esCar) {
    base += 'border-accent shadow-[0_0_15px_rgba(142,149,165,0.3)] scale-110 z-20 ';
    style = { background: '#22242B' };
  } else if (parada?.esCurrent) {
    base += 'border-[#52A27F] shadow-[0_0_12px_rgba(82,162,127,0.3)] animate-pulse ';
    style = { background: '#121E19' };
  } else if (parada && !parada.esHecha) {
    base += 'border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.2)] ';
    style = { background: '#1E1912' };
  } else if (parada?.esHecha) {
    base += 'border-slate-800/60 opacity-60 ';
    style = { background: '#121214' };
  } else if (enRuta) {
    base += 'border-amber-500/40 ';
    style = { background: '#1E1B15' };
  } else if (ocupada) {
    base += 'border-surface2 hover:-translate-y-0.5 hover:border-slate-700/60 hover:shadow-lg ';
    style = { background: '#1E1E22' };
  } else {
    base += 'border-surface2 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_4px_12px_rgba(255,255,255,0.02)] ';
    style = { background: '#121214' };
  }

  return (
    <div 
      className={base} 
      style={{ width: '100%', minWidth: '95px', minHeight: '82px', ...style }} 
      onClick={onClick} 
      title={`${u.pasillo}${u.estante}-N${u.nivel}`}
    >
      {/* badge parada */}
      {parada && (
        <div className={`
          absolute -top-2 -right-2 w-5.5 h-5.5 rounded-full text-[9px] font-black flex items-center justify-center
          border-2 border-slate-950 z-10
          ${parada.esCurrent ? 'bg-[#52A27F] text-white shadow-[0_0_8px_rgba(82,162,127,0.4)]' :
            parada.esHecha   ? 'bg-slate-600 text-slate-300' :
                               'bg-amber-400 text-amber-950 shadow-[0_0_6px_rgba(251,191,36,0.5)]'}
        `}>
          {parada.esHecha ? '✓' : parada.numero}
        </div>
      )}

      {/* indicador "en ruta" dashed */}
      {enRuta && !esCar && !parada && (
        <div className="absolute inset-0 rounded-xl border-2 border-dashed border-amber-500/30 pointer-events-none" />
      )}

      {/* carro emoji */}
      {esCar && <span className="text-2xl mb-0.5 drop-shadow-[0_0_8px_rgba(142,149,165,0.5)]">🤖</span>}

      {/* label ubicación */}
      <div className={`text-xs md:text-sm font-black leading-tight tracking-wide ${esCar ? 'text-light' : ocupada ? 'text-slate-400' : 'text-muted'}`}>
        {u.pasillo}{u.estante}<br />
        <span className="text-[11px] md:text-xs font-semibold opacity-70">N{u.nivel}</span>
      </div>

      {/* dot ocupación */}
      <div className={`w-1.5 h-1.5 rounded-full mt-1 ${esCar ? 'bg-accent' : ocupada ? 'bg-red-500/80' : 'bg-emerald-500/80'}`} />
    </div>
  );
}

/* ── componente principal ────────────────────────── */
export default function AlmacenVisual() {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [cajas,       setCajas]       = useState([]);
  const [carro,       setCarro]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState('carro');
  const [ubiSel,      setUbiSel]      = useState(null);
  const [flash,       setFlash]       = useState(false);

  const cargarTodo = useCallback(async () => {
    try {
      const [rU, rC, rCarro] = await Promise.all([getUbicaciones(), getCajas(), getEstadoCarro()]);
      const getData = r => r.data.results ?? r.data;
      setUbicaciones(getData(rU));
      setCajas(getData(rC));
      setCarro(Array.isArray(rCarro.data) ? rCarro.data[0] : rCarro.data);
      setFlash(true);
      setTimeout(() => setFlash(false), 400);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarTodo();
    const iv = setInterval(cargarTodo, 3000);
    return () => clearInterval(iv);
  }, [cargarTodo]);

  const enRuta   = (x, y) => carro?.ruta?.some(p => p.x === x && p.y === y) ?? false;
  const esCarro  = (x, y) => carro?.pos_x === x && carro?.pos_y === y;
  const getParada = (x, y) => {
    if (!carro?.paradas?.length) return null;
    const idx = carro.paradas.findIndex(p => p.x === x && p.y === y);
    if (idx === -1) return null;
    return { numero: idx + 1, esCurrent: idx === carro.parada_actual, esHecha: idx < carro.parada_actual };
  };

  /* agrupación por pasillo */
  const porPasillo = {};
  ubicaciones.forEach(u => {
    if (!porPasillo[u.pasillo]) porPasillo[u.pasillo] = [];
    porPasillo[u.pasillo].push(u);
  });

  /* stats */
  const totalUbi  = ubicaciones.length;
  const ocupadas  = ubicaciones.filter(u => u.estado_ocupacion).length;
  const libres    = totalUbi - ocupadas;
  const pct       = totalUbi ? Math.round((ocupadas / totalUbi) * 100) : 0;

  if (loading && !ubicaciones.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-light">
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
        <p className="text-sm font-medium">Cargando mapa del almacén...</p>
      </div>
    );
  }

  const carroColor = {
    esperando:  'text-slate-400 bg-slate-800/60 border-slate-600',
    en_ruta:    'text-amber-400 bg-amber-900/30 border-amber-500/50',
    llego:      'text-emerald-400 bg-emerald-900/30 border-emerald-500/50',
    regresando: 'text-violet-400 bg-violet-900/30 border-violet-500/50',
  };
  const estadoCarro = carro?.estado || 'esperando';
  const carroClase  = carroColor[estadoCarro] || carroColor.esperando;

  return (
    <>
      {/* ── HEADER ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 fade-in">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <span className="text-3xl">🏭</span>
            Mapa del Almacén
            <span className={`ml-2 w-2 h-2 rounded-full inline-block ${flash ? 'bg-emerald-400' : 'bg-emerald-600'} transition-colors`} title="Actualización en tiempo real" />
          </h2>
          <p className="text-slate-500 text-sm mt-1">Vista en tiempo real · actualiza cada 3 s · haz clic en una celda para ver detalles</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={cargarTodo}
            className="flex items-center gap-1.5 bg-surface2 hover:bg-surface border border-surface2 text-light text-xs font-semibold px-3 py-2 rounded-lg transition-all"
          >
            <i className="bi bi-arrow-clockwise" /> Actualizar
          </button>
          <button
            onClick={async () => { await avanzarCarro(); cargarTodo(); }}
            className="flex items-center gap-1.5 bg-[#1E1912] hover:bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold px-3 py-2 rounded-lg transition-all"
          >
            <i className="bi bi-skip-forward-fill" /> Avanzar
          </button>
          <button
            onClick={async () => { if (confirm('¿Reiniciar carro al origen?')) { await resetCarro(); cargarTodo(); } }}
            className="flex items-center gap-1.5 bg-[#1E1212] hover:bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold px-3 py-2 rounded-lg transition-all"
          >
            <i className="bi bi-x-circle" /> Reset
          </button>
        </div>
      </div>

      {/* ── STATS BAR ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 fade-in fade-d1">
        <StatCard icon="📦" label="Total celdas"  value={totalUbi} />
        <StatCard icon="✅" label="Libres"        value={libres} />
        <StatCard icon="🔴" label="Ocupadas"      value={ocupadas}  sub={`${pct}% ocupación`} />
        <StatCard icon="🤖" label="Estado carro"  value={estadoCarro} />
      </div>

      {/* ── LAYOUT PRINCIPAL ─────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start fade-in fade-d2">

        {/* ── MAPA ──────────────────────────── */}
        <div className="bg-surface border border-surface2 rounded-2xl p-6 shadow-2xl shadow-black/50 overflow-x-auto">

          {/* Leyenda */}
          <div className="flex flex-wrap gap-3 mb-5 text-[11px] font-semibold text-slate-400">
            {[
              { color: 'bg-[#121214] border border-[#2A2A30]', label: 'Libre' },
              { color: 'bg-[#1E1E22] border border-[#2A2A30]', label: 'Ocupada' },
              { color: 'bg-[#22242B] border border-[#8E95A5] shadow-[0_0_6px_rgba(142,149,165,0.4)]', label: 'Carro 🤖' },
              { color: 'bg-[#1E1912] border border-amber-500/60', label: 'Parada' },
              { color: 'border-2 border-dashed border-amber-500/40 bg-transparent', label: 'En ruta' },
              { color: 'bg-[#121E19] border border-[#52A27F]', label: 'Parada actual' },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5 bg-surface2/60 border border-surface2 px-2.5 py-1 rounded-lg">
                <span className={`w-3 h-3 rounded ${color}`} />
                {label}
              </span>
            ))}
          </div>

          {/* Barra de ocupación */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>Ocupación del almacén</span>
              <span className="font-bold text-slate-300">{pct}%</span>
            </div>
            <div className="h-2 bg-[#2A2A30] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: pct > 90 ? 'linear-gradient(90deg,#dc2626,#ef4444)' :
                              pct > 70 ? 'linear-gradient(90deg,#d97706,#f59e0b)' :
                                         'linear-gradient(90deg,#10B981,#52A27F)',
                }}
              />
            </div>
          </div>

          {/* Grid de pasillos */}
          {!ubicaciones.length ? (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-6 rounded-xl text-sm text-center">
              <div className="text-3xl mb-2">⚠️</div>
              Sin ubicaciones registradas
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(porPasillo).sort().map(pasillo => {
                const ubis = [...porPasillo[pasillo]].sort((a, b) =>
                  a.estante !== b.estante ? a.estante - b.estante : a.nivel - b.nivel
                );

                // agrupar por estante para mostrar niveles apilados
                const porEstante = {};
                ubis.forEach(u => {
                  if (!porEstante[u.estante]) porEstante[u.estante] = [];
                  porEstante[u.estante].push(u);
                });

                return (
                  <div key={pasillo}>
                    {/* Label del pasillo */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-surface2 border border-accent/20 text-light font-black text-sm shadow-[0_0_12px_rgba(255,255,255,0.01)]">
                        {pasillo}
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-accent/25 to-transparent" />
                      <span className="text-[11px] text-slate-500 font-medium">
                        {ubis.filter(u => u.estado_ocupacion).length}/{ubis.length} ocupadas
                      </span>
                    </div>

                    {/* Estantes del pasillo */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3.5 pl-12">
                      {Object.keys(porEstante).sort((a, b) => a - b).map(est => {
                        const niveles = [...porEstante[est]].sort((a, b) => b.nivel - a.nivel); // nivel alto arriba
                        return (
                          <div
                            key={est}
                            className="flex flex-col gap-1.5 p-2 bg-surface2/30 border border-surface2 rounded-xl"
                            title={`Estante ${pasillo}${est}`}
                          >
                            <div className="text-[9px] text-slate-500 font-bold text-center uppercase tracking-widest mb-1">Est {est}</div>
                            {niveles.map(u => (
                              <CeldaUbi
                                key={u.id_ubicacion}
                                u={u}
                                esCar={esCarro(u.coord_x, u.coord_y)}
                                enRuta={enRuta(u.coord_x, u.coord_y)}
                                parada={getParada(u.coord_x, u.coord_y)}
                                onClick={() => { setUbiSel(u); setTab('ubicacion'); }}
                              />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── PANEL LATERAL ─────────────────── */}
        <div className="bg-surface border border-surface2 rounded-2xl overflow-hidden sticky top-6 shadow-xl flex flex-col" style={{ maxHeight: 'calc(100vh - 140px)' }}>

          {/* tabs */}
          <div className="flex border-b border-surface2">
            {[
              { key: 'carro',    icon: 'bi-robot',   label: 'Carro AGV' },
              { key: 'ubicacion', icon: 'bi-geo-alt', label: 'Ubicación'  },
            ].map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2
                  ${tab === key
                    ? 'text-light border-accent bg-surface2/40'
                    : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5'}`}
              >
                <i className={`bi ${icon} text-sm mr-1.5`} /> {label}
              </button>
            ))}
          </div>

          <div className="p-5 overflow-y-auto flex-1">

            {/* ── TAB CARRO ── */}
            {tab === 'carro' && (
              !carro
                ? <p className="text-slate-500 text-center py-8 text-sm">Sin datos del carro.</p>
                : (
                  <div className="space-y-4">
                    {/* estado badge */}
                    <div className={`flex items-center justify-between p-4 rounded-xl border ${carroClase}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🤖</span>
                        <div>
                          <div className="font-bold text-sm text-white">Carro Automatizado</div>
                          <div className="text-[11px] opacity-70">AGV LogiSmart</div>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${carroClase}`}>
                        {estadoCarro}
                      </span>
                    </div>

                    {/* alerta llegó */}
                    {carro.estado === 'llego' && carro.paradas?.length > 0 && (
                      <div className="bg-[#121E19] border border-[#52A27F]/40 rounded-xl p-4 text-center">
                        <div className="text-3xl mb-2">🎯</div>
                        <h5 className="text-[#52A27F] font-black mb-1">¡Carro llegó!</h5>
                        <p className="text-white font-bold text-sm mb-3">
                          {carro.paradas[carro.parada_actual]?.ubicacion_nombre}
                        </p>
                        <button
                          className="w-full bg-[#1E1E22] hover:bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                          onClick={async () => { await confirmarParada({ id_usuario: 1 }); cargarTodo(); }}
                        >
                          <i className="bi bi-check-circle-fill" /> Confirmar entrega
                        </button>
                      </div>
                    )}

                    {/* regresando */}
                    {carro.estado === 'regresando' && (
                      <div className="bg-surface2/50 border border-accent/20 rounded-xl p-4 text-center">
                        <div className="text-3xl mb-2">🏠</div>
                        <h5 className="text-light font-bold">Regresando a base</h5>
                      </div>
                    )}

                    {/* posición */}
                    <div className="bg-surface2/40 border border-surface2 rounded-xl divide-y divide-surface2 text-sm">
                      {[
                        { label: 'Posición actual', value: `(${carro.pos_x}, ${carro.pos_y})`, mono: true, color: 'text-accent' },
                        { label: 'Destino',         value: `(${carro.destino_x}, ${carro.destino_y})`, mono: true, color: 'text-amber-500/80' },
                        { label: 'Pasos restantes', value: carro.ruta?.length ?? 0, color: 'text-light font-bold' },
                        { label: 'Paradas',         value: `${carro.parada_actual ?? 0} / ${carro.paradas?.length ?? 0}`, color: 'text-light' },
                      ].map(({ label, value, mono, color }) => (
                        <div key={label} className="flex justify-between items-center px-4 py-2.5">
                          <span className="text-slate-400">{label}</span>
                          <span className={`${mono ? 'font-mono' : ''} ${color}`}>{value}</span>
                        </div>
                      ))}
                    </div>

                    {/* ruta visualizada */}
                    {carro.paradas?.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Cola de paradas</div>
                        <div className="space-y-2">
                          {carro.paradas.map((p, i) => {
                            const hecha = i < carro.parada_actual;
                            const actual = i === carro.parada_actual;
                            return (
                              <div
                                key={i}
                                className={`flex items-center gap-3 p-2.5 rounded-xl text-xs border transition-all
                                  ${actual ? 'bg-[#121E19] border-[#52A27F]/40 text-emerald-400' :
                                    hecha  ? 'bg-surface2/30 border-surface2 text-slate-500 opacity-50' :
                                             'bg-[#1E1912] border-amber-500/30 text-amber-400'}`}
                              >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] border
                                  ${actual ? 'bg-[#52A27F] border-[#52A27F] text-white' :
                                    hecha  ? 'bg-slate-700 border-slate-600 text-slate-300' :
                                             'bg-amber-500 border-amber-400 text-amber-950'}`}>
                                  {hecha ? '✓' : i + 1}
                                </div>
                                <div>
                                  <div className="font-semibold">{p.ubicacion_nombre || `(${p.x},${p.y})`}</div>
                                  {actual && <div className="text-[10px] opacity-70">← Destino actual</div>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
            )}

            {/* ── TAB UBICACIÓN ── */}
            {tab === 'ubicacion' && (
              !ubiSel
                ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-surface2 border border-surface2 flex items-center justify-center text-3xl">
                      👆
                    </div>
                    <p className="text-sm text-slate-400 font-medium">Haz clic en una celda<br />para ver sus detalles</p>
                  </div>
                )
                : (() => {
                  const u = ubiSel;
                  const c = cajas.find(cx => cx.id_ubicacion === u.id_ubicacion);
                  const cat = c?.categoria || 'otro';
                  return (
                    <div className="space-y-4">
                      {/* cabecera ubicación */}
                      <div className="bg-surface2 border border-surface2 rounded-xl p-4 text-center">
                        <div className="font-black text-2xl text-accent drop-shadow-[0_0_10px_rgba(142,149,165,0.2)] mb-2">
                          {u.pasillo}{u.estante}-N{u.nivel}
                        </div>
                        <div className="flex flex-wrap justify-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-surface/80 text-slate-300 border border-surface2">
                            {u.tipo_estante}
                          </span>
                          {u.estado_ocupacion
                            ? <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-950/50 text-red-300 border border-red-500/20">Ocupada</span>
                            : <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-950/50 text-emerald-300 border border-[#52A27F]/20">Libre</span>
                          }
                          {u.permite_fragil && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-surface/50 text-[#8E95A5] border border-surface2">
                              Frágil ✓
                            </span>
                          )}
                        </div>
                      </div>

                      {/* propiedades */}
                      <div className="bg-surface2/40 border border-surface2 rounded-xl divide-y divide-surface2 text-sm">
                        {[
                          { label: 'Capacidad',      value: `${u.capacidad_peso_kg} kg` },
                          { label: 'Prioridad cat.', value: u.prioridad_categoria },
                          { label: 'Coordenadas',    value: `X:${u.coord_x} Y:${u.coord_y}`, mono: true },
                        ].map(({ label, value, mono }) => (
                          <div key={label} className="flex justify-between px-4 py-2.5">
                            <span className="text-slate-400">{label}</span>
                            <span className={`text-white font-semibold ${mono ? 'font-mono text-accent' : ''}`}>{value}</span>
                          </div>
                        ))}
                      </div>

                      {/* caja almacenada */}
                      {c ? (
                        <div className={`bg-gradient-to-br ${CAT_COLOR[cat]} border rounded-xl p-4 relative overflow-hidden`}>
                          <div className="absolute -right-3 -top-3 text-6xl opacity-10 select-none">{CAT_ICON[cat] || '📦'}</div>
                          <div className="flex items-start gap-2 mb-3">
                            <span className="text-xl">{CAT_ICON[cat] || '📦'}</span>
                            <div>
                              <div className="font-black text-white leading-tight">{c.producto}</div>
                              <div className="text-[11px] font-mono text-sky-400 mt-0.5">{c.id}</div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 text-[10px]">
                            <span className="px-2 py-0.5 rounded-md bg-white/10 text-white font-semibold">{c.peso_kg} kg</span>
                            <span className="px-2 py-0.5 rounded-md bg-white/10 text-white font-semibold capitalize">{c.categoria}</span>
                            {c.es_fragil && <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-semibold">🔷 Frágil</span>}
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-semibold capitalize">
                              {c.estado?.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-emerald-500/60 border border-emerald-500/20 bg-emerald-500/5 rounded-xl">
                          <i className="bi bi-check-circle text-4xl block mb-2" />
                          <span className="text-sm font-semibold">Ubicación libre</span>
                          <p className="text-[11px] text-emerald-600/60 mt-1">Sin caja asignada</p>
                        </div>
                      )}
                    </div>
                  );
                })()
            )}
          </div>
        </div>
      </div>
    </>
  );
}
