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

function StatCard({ icon, label, value, sub, color = 'sky' }) {
  const colors = {
    sky:     'from-sky-500/20 to-sky-600/10 border-sky-500/30 text-sky-400',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
    amber:   'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
    violet:  'from-violet-500/20 to-violet-600/10 border-violet-500/30 text-violet-400',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-3 flex items-center gap-3`}>
      <div className="text-2xl">{icon}</div>
      <div>
        <div className={`text-xl font-black leading-none ${colors[color].split(' ').at(-1)}`}>{value}</div>
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{label}</div>
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
    base += 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5),inset_0_0_12px_rgba(34,211,238,0.1)] scale-110 z-20 ';
    style = { background: 'linear-gradient(135deg, #0c4a6e 0%, #0e7490 100%)' };
  } else if (parada?.esCurrent) {
    base += 'border-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.4)] animate-pulse ';
    style = { background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)' };
  } else if (parada && !parada.esHecha) {
    base += 'border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)] ';
    style = { background: 'linear-gradient(135deg, #451a03 0%, #78350f 100%)' };
  } else if (parada?.esHecha) {
    base += 'border-slate-600/60 opacity-60 ';
    style = { background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' };
  } else if (enRuta) {
    base += 'border-amber-500/50 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.15)] ';
    style = { background: 'linear-gradient(135deg, #292524 0%, #1c1917 100%)' };
  } else if (ocupada) {
    base += 'border-slate-600/40 hover:-translate-y-0.5 hover:border-slate-500/60 hover:shadow-lg ';
    style = { background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' };
  } else {
    base += 'border-emerald-500/30 hover:-translate-y-1 hover:border-emerald-400/60 hover:shadow-[0_6px_20px_rgba(52,211,153,0.2)] ';
    style = { background: 'linear-gradient(135deg, #052e16 0%, #064e3b 100%)' };
  }

  return (
    <div className={base} style={{ width: 90, minHeight: 76, ...style }} onClick={onClick} title={`${u.pasillo}${u.estante}-N${u.nivel}`}>
      {/* badge parada */}
      {parada && (
        <div className={`
          absolute -top-2 -right-2 w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center
          border-2 border-slate-950 z-10
          ${parada.esCurrent ? 'bg-emerald-400 text-emerald-950 shadow-[0_0_8px_rgba(52,211,153,0.6)]' :
            parada.esHecha   ? 'bg-slate-600 text-slate-300' :
                               'bg-amber-400 text-amber-950 shadow-[0_0_6px_rgba(251,191,36,0.5)]'}
        `}>
          {parada.esHecha ? '✓' : parada.numero}
        </div>
      )}

      {/* indicador "en ruta" dashed */}
      {enRuta && !esCar && !parada && (
        <div className="absolute inset-0 rounded-xl border-2 border-dashed border-amber-500/40 pointer-events-none" />
      )}

      {/* carro emoji */}
      {esCar && <span className="text-xl mb-0.5 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">🤖</span>}

      {/* label ubicación */}
      <div className={`text-[11px] font-black leading-tight tracking-wide ${esCar ? 'text-cyan-200' : ocupada ? 'text-slate-300' : 'text-emerald-300'}`}>
        {u.pasillo}{u.estante}<br />
        <span className="text-[10px] font-semibold opacity-70">N{u.nivel}</span>
      </div>

      {/* dot ocupación */}
      <div className={`w-1.5 h-1.5 rounded-full mt-1 ${esCar ? 'bg-cyan-400' : ocupada ? 'bg-red-400' : 'bg-emerald-500'}`} />
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
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-500">
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
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg transition-all hover:border-slate-500"
          >
            <i className="bi bi-arrow-clockwise" /> Actualizar
          </button>
          <button
            onClick={async () => { await avanzarCarro(); cargarTodo(); }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-lg shadow-amber-900/40 transition-all"
          >
            <i className="bi bi-skip-forward-fill" /> Avanzar
          </button>
          <button
            onClick={async () => { if (confirm('¿Reiniciar carro al origen?')) { await resetCarro(); cargarTodo(); } }}
            className="flex items-center gap-1.5 border border-red-500/40 hover:bg-red-500/10 hover:border-red-400/60 text-red-400 text-xs font-semibold px-3 py-2 rounded-lg transition-all"
          >
            <i className="bi bi-x-circle" /> Reset
          </button>
        </div>
      </div>

      {/* ── STATS BAR ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 fade-in fade-d1">
        <StatCard icon="📦" label="Total celdas"  value={totalUbi}  color="sky" />
        <StatCard icon="✅" label="Libres"        value={libres}    color="emerald" />
        <StatCard icon="🔴" label="Ocupadas"      value={ocupadas}  sub={`${pct}% ocupación`} color="amber" />
        <StatCard icon="🤖" label="Estado carro"  value={estadoCarro} color="violet" />
      </div>

      {/* ── LAYOUT PRINCIPAL ─────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start fade-in fade-d2">

        {/* ── MAPA ──────────────────────────── */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/60 rounded-2xl p-6 shadow-2xl shadow-black/50 overflow-x-auto">

          {/* Leyenda */}
          <div className="flex flex-wrap gap-3 mb-5 text-[11px] font-semibold text-slate-400">
            {[
              { color: 'bg-emerald-700', label: 'Libre' },
              { color: 'bg-slate-700',   label: 'Ocupada' },
              { color: 'bg-cyan-600',    label: 'Carro 🤖', glow: true },
              { color: 'bg-amber-600',   label: 'Parada' },
              { color: 'border-2 border-dashed border-amber-500/60 bg-transparent', label: 'En ruta' },
              { color: 'bg-emerald-500', label: 'Parada actual' },
            ].map(({ color, label, glow }) => (
              <span key={label} className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/60 px-2.5 py-1 rounded-lg">
                <span className={`w-3 h-3 rounded ${color} ${glow ? 'shadow-[0_0_6px_rgba(34,211,238,0.6)]' : ''}`} />
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
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: pct > 80 ? 'linear-gradient(90deg,#dc2626,#ef4444)' :
                              pct > 50 ? 'linear-gradient(90deg,#d97706,#f59e0b)' :
                                         'linear-gradient(90deg,#059669,#10b981)',
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
                      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-sky-600 to-cyan-600 text-white font-black text-sm shadow-[0_0_16px_rgba(14,165,233,0.3)]">
                        {pasillo}
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-sky-500/30 to-transparent" />
                      <span className="text-[11px] text-slate-500 font-medium">
                        {ubis.filter(u => u.estado_ocupacion).length}/{ubis.length} ocupadas
                      </span>
                    </div>

                    {/* Estantes del pasillo */}
                    <div className="flex flex-wrap gap-2 pl-12">
                      {Object.keys(porEstante).sort((a, b) => a - b).map(est => {
                        const niveles = [...porEstante[est]].sort((a, b) => b.nivel - a.nivel); // nivel alto arriba
                        return (
                          <div
                            key={est}
                            className="flex flex-col gap-1.5 p-2 bg-slate-800/40 border border-slate-700/40 rounded-xl"
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
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/60 rounded-2xl overflow-hidden sticky top-6 shadow-xl flex flex-col" style={{ maxHeight: 'calc(100vh - 140px)' }}>

          {/* tabs */}
          <div className="flex border-b border-slate-700/60">
            {[
              { key: 'carro',    icon: 'bi-robot',   label: 'Carro AGV' },
              { key: 'ubicacion', icon: 'bi-geo-alt', label: 'Ubicación'  },
            ].map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2
                  ${tab === key
                    ? 'text-sky-400 border-sky-500 bg-sky-500/5'
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
                      <div className="bg-emerald-900/30 border border-emerald-500/40 rounded-xl p-4 text-center">
                        <div className="text-3xl mb-2">🎯</div>
                        <h5 className="text-emerald-400 font-black mb-1">¡Carro llegó!</h5>
                        <p className="text-white font-bold text-sm mb-3">
                          {carro.paradas[carro.parada_actual]?.ubicacion_nombre}
                        </p>
                        <button
                          className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2"
                          onClick={async () => { await confirmarParada({ id_usuario: 1 }); cargarTodo(); }}
                        >
                          <i className="bi bi-check-circle-fill" /> Confirmar entrega
                        </button>
                      </div>
                    )}

                    {/* regresando */}
                    {carro.estado === 'regresando' && (
                      <div className="bg-violet-900/20 border border-violet-500/40 rounded-xl p-4 text-center">
                        <div className="text-3xl mb-2">🏠</div>
                        <h5 className="text-violet-300 font-bold">Regresando a base</h5>
                      </div>
                    )}

                    {/* posición */}
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl divide-y divide-slate-700/50 text-sm">
                      {[
                        { label: 'Posición actual', value: `(${carro.pos_x}, ${carro.pos_y})`, mono: true, color: 'text-sky-400' },
                        { label: 'Destino',         value: `(${carro.destino_x}, ${carro.destino_y})`, mono: true, color: 'text-amber-400' },
                        { label: 'Pasos restantes', value: carro.ruta?.length ?? 0, color: 'text-white font-bold' },
                        { label: 'Paradas',         value: `${carro.parada_actual ?? 0} / ${carro.paradas?.length ?? 0}`, color: 'text-violet-400' },
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
                                  ${actual ? 'bg-emerald-900/30 border-emerald-500/40 text-emerald-300' :
                                    hecha  ? 'bg-slate-800/30 border-slate-700/30 text-slate-500 opacity-50' :
                                             'bg-amber-900/20 border-amber-500/30 text-amber-300'}`}
                              >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] border
                                  ${actual ? 'bg-emerald-500 border-emerald-400 text-emerald-950' :
                                    hecha  ? 'bg-slate-600 border-slate-500 text-slate-300' :
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
                    <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-3xl">
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
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
                        <div className="font-black text-2xl text-sky-400 drop-shadow-[0_0_10px_rgba(56,189,248,0.4)] mb-2">
                          {u.pasillo}{u.estante}-N{u.nivel}
                        </div>
                        <div className="flex flex-wrap justify-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-700/80 text-slate-300 border border-slate-600">
                            {u.tipo_estante}
                          </span>
                          {u.estado_ocupacion
                            ? <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-900/50 text-red-300 border border-red-500/30">Ocupada</span>
                            : <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-900/50 text-emerald-300 border border-emerald-500/30">Libre</span>
                          }
                          {u.permite_fragil && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-sky-900/50 text-sky-300 border border-sky-500/30">
                              Frágil ✓
                            </span>
                          )}
                        </div>
                      </div>

                      {/* propiedades */}
                      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl divide-y divide-slate-700/40 text-sm">
                        {[
                          { label: 'Capacidad',      value: `${u.capacidad_peso_kg} kg` },
                          { label: 'Prioridad cat.', value: u.prioridad_categoria },
                          { label: 'Coordenadas',    value: `X:${u.coord_x} Y:${u.coord_y}`, mono: true },
                        ].map(({ label, value, mono }) => (
                          <div key={label} className="flex justify-between px-4 py-2.5">
                            <span className="text-slate-400">{label}</span>
                            <span className={`text-white font-semibold ${mono ? 'font-mono text-sky-400' : ''}`}>{value}</span>
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
