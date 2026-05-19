import { useEffect, useState, useCallback } from 'react';
import { getConfigCarro, getMedidas, updateConfigCarro } from '../api/endpoints';

export default function Configuracion() {
  const [config, setConfig] = useState({
    nombre: '', largo_cm: 0, ancho_cm: 0, alto_cm: 0, peso_maximo_kg: 0,
    max_paradas: 0, pos_base_x: 0, pos_base_y: 0, notas: ''
  });
  const [medidas, setMedidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rc, rm] = await Promise.all([getConfigCarro(), getMedidas()]);
      const cfgData = rc.data?.results?.[0] ?? rc.data?.[0] ?? rc.data ?? {};
      setConfig({
        nombre: cfgData.nombre || '',
        largo_cm: cfgData.largo_cm || 0,
        ancho_cm: cfgData.ancho_cm || 0,
        alto_cm: cfgData.alto_cm || 0,
        peso_maximo_kg: cfgData.peso_maximo_kg || 0,
        max_paradas: cfgData.max_paradas || 0,
        pos_base_x: cfgData.pos_base_x || 0,
        pos_base_y: cfgData.pos_base_y || 0,
        notas: cfgData.notas || ''
      });
      setMedidas(rm.data?.results ?? rm.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setConfig(prev => ({ ...prev, [id]: id === 'nombre' || id === 'notas' ? value : parseFloat(value) || 0 }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateConfigCarro(config);
      alert('Configuración guardada ✓');
      load();
    } catch (e) {
      alert('Error al guardar configuración');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const cartVol = config.largo_cm * config.ancho_cm * config.alto_cm;

  const breakdown = medidas.map(m => {
    const vol = m.largo * m.ancho * m.alto;
    const tamano = vol <= 8000 ? 'pequena' : (vol <= 64000 ? 'mediana' : 'grande');
    const caben_vol = vol > 0 ? Math.floor(cartVol / vol) : 0;
    return { medida: m, vol_cm3: vol, tamano, caben_vol };
  });

  const maxPorTipo = breakdown.reduce((acc, b) => {
    if (b.caben_vol > acc[b.tamano]) acc[b.tamano] = b.caben_vol;
    return acc;
  }, { pequena: 0, mediana: 0, grande: 0 });

  const maxTotal = Math.max(maxPorTipo.pequena, 1);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-[#AFB3B7]">
        <div className="spinner mb-3"></div>
        Cargando configuración...
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 fade-in">
        <div>
          <h2 className="text-2xl font-bold mb-1 text-white"><i className="bi bi-gear me-2 text-sky-400"></i>Configuración del Carro</h2>
          <p className="text-sm text-slate-400 mb-0">Dimensiones, peso máximo y análisis de capacidad de carga</p>
        </div>
        <div>
          <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20" disabled={saving} onClick={handleSave}>
            <i className="bi bi-check-lg"></i> {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 fade-in">
        {/* Formulario */}
        <div className="lg:col-span-5">
          <div className="bg-surface border border-slate-800/60 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800/60 font-semibold text-white flex items-center gap-2 bg-slate-900/30">
              <i className="bi bi-sliders text-sky-400"></i> Parámetros
            </div>
            <div className="p-6">
              <div className="mb-5">
                <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Nombre del carro</label>
                <input type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all" id="nombre" value={config.nombre} onChange={handleChange} />
              </div>

              <div className="mb-5">
                <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Dimensiones (cm) — Largo × Ancho × Alto</label>
                <div className="flex items-center gap-3">
                  <input type="number" step="0.1" min="1" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-center focus:outline-none focus:border-sky-500 transition-all" id="largo_cm" value={config.largo_cm} onChange={handleChange} placeholder="L" />
                  <span className="text-slate-500">×</span>
                  <input type="number" step="0.1" min="1" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-center focus:outline-none focus:border-sky-500 transition-all" id="ancho_cm" value={config.ancho_cm} onChange={handleChange} placeholder="A" />
                  <span className="text-slate-500">×</span>
                  <input type="number" step="0.1" min="1" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-center focus:outline-none focus:border-sky-500 transition-all" id="alto_cm" value={config.alto_cm} onChange={handleChange} placeholder="H" />
                </div>
              </div>

              <div className="mb-5">
                <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Peso máximo (kg)</label>
                <input type="number" step="0.5" min="1" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-all" id="peso_maximo_kg" value={config.peso_maximo_kg} onChange={handleChange} />
              </div>

              <div className="mb-5">
                <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Máximo de paradas por ruta</label>
                <input type="number" min="1" max="50" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-all" id="max_paradas" value={config.max_paradas} onChange={handleChange} />
                <div className="text-[11px] text-slate-500 mt-2">Limita cuántas cajas puede llevar el carro por viaje.</div>
              </div>

              <div className="mb-5">
                <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Posición de base (X, Y)</label>
                <div className="flex gap-4">
                  <input type="number" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-center focus:outline-none focus:border-sky-500 transition-all" id="pos_base_x" value={config.pos_base_x} onChange={handleChange} placeholder="X" />
                  <input type="number" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-center focus:outline-none focus:border-sky-500 transition-all" id="pos_base_y" value={config.pos_base_y} onChange={handleChange} placeholder="Y" />
                </div>
                <div className="text-[11px] text-slate-500 mt-2">Coordenada donde el carro regresa después de entregar.</div>
              </div>

              <div className="mb-2">
                <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Notas</label>
                <textarea className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-all resize-none" id="notas" rows="2" value={config.notas} onChange={handleChange}></textarea>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de capacidad */}
        <div className="lg:col-span-7">
          <div className="bg-surface border border-slate-800/60 rounded-2xl shadow-xl overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-slate-800/60 font-semibold text-white flex items-center gap-2 bg-slate-900/30">
              <i className="bi bi-box text-sky-400"></i> Capacidad calculada
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
                  <div className="text-2xl font-black text-white">{config.largo_cm || '—'}</div>
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">Largo (cm)</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
                  <div className="text-2xl font-black text-white">{config.ancho_cm || '—'}</div>
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">Ancho (cm)</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
                  <div className="text-2xl font-black text-white">{config.alto_cm || '—'}</div>
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">Alto (cm)</div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Volumen total del carro</span>
                <span className="text-2xl font-black text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]">{cartVol > 0 ? `${Math.round(cartVol).toLocaleString()} cm³` : '—'}</span>
              </div>
              
              <div className="h-px bg-slate-800/60 w-full mb-6"></div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 flex flex-col items-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="text-4xl font-black text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.3)] z-10">{maxPorTipo.pequena}</div>
                  <div className="text-center mt-2 z-10">
                    <span className="text-sm font-bold text-slate-300">📦 Pequeñas</span><br/>
                    <span className="text-[10px] text-slate-500">≤ 8,000 cm³</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden z-10">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{width: `${Math.min(100, (maxPorTipo.pequena / maxTotal) * 100)}%`}}></div>
                  </div>
                </div>
                
                <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 flex flex-col items-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-sky-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="text-4xl font-black text-sky-400 drop-shadow-[0_0_12px_rgba(56,189,248,0.3)] z-10">{maxPorTipo.mediana}</div>
                  <div className="text-center mt-2 z-10">
                    <span className="text-sm font-bold text-slate-300">🗃️ Medianas</span><br/>
                    <span className="text-[10px] text-slate-500">8,001 – 64,000 cm³</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden z-10">
                    <div className="h-full bg-sky-500 rounded-full transition-all duration-500" style={{width: `${Math.min(100, (maxPorTipo.mediana / maxTotal) * 100)}%`}}></div>
                  </div>
                </div>
                
                <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 flex flex-col items-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="text-4xl font-black text-indigo-400 drop-shadow-[0_0_12px_rgba(99,102,241,0.3)] z-10">{maxPorTipo.grande}</div>
                  <div className="text-center mt-2 z-10">
                    <span className="text-sm font-bold text-slate-300">📫 Grandes</span><br/>
                    <span className="text-[10px] text-slate-500">&gt; 64,000 cm³</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden z-10">
                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{width: `${Math.min(100, (maxPorTipo.grande / maxTotal) * 100)}%`}}></div>
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-4 flex items-center gap-1.5">
                <i className="bi bi-info-circle"></i>
                Basado en la medida más pequeña de cada tipo. El límite real también depende del peso máximo ({config.peso_maximo_kg} kg).
              </div>
            </div>
          </div>

          {/* Tabla de medidas */}
          <div className="bg-surface rounded-2xl border border-slate-800/60 p-0 overflow-hidden fade-in fade-d2 mt-6">
            <div className="px-6 py-4 border-b border-slate-800/60 font-semibold flex items-center gap-2 text-white"><i className="bi bi-grid-3x3 text-sky-400"></i> Desglose por medida registrada</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/60 bg-slate-900/30 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    <th className="px-6 py-4">Medida</th>
                    <th className="px-6 py-4">Dimensiones</th>
                    <th className="px-6 py-4">Volumen</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4 text-center">Caben (vol.)</th>
                    <th className="px-6 py-4">Barra</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-800/30">
                  {breakdown.map((b, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 font-semibold text-white">{b.medida.nombre}</td>
                      <td className="px-6 py-4 text-xs text-slate-400">{b.medida.largo}×{b.medida.ancho}×{b.medida.alto}</td>
                      <td className="px-6 py-4 text-xs text-slate-300">{b.vol_cm3.toLocaleString()} cm³</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${b.tamano === 'pequena' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : b.tamano === 'mediana' ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]' : 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]'}`}></div>
                          <span className="text-xs text-slate-300 capitalize">{b.tamano}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-center font-bold ${b.caben_vol > 5 ? 'text-emerald-400' : b.caben_vol > 2 ? 'text-amber-400' : 'text-red-400'}`}>
                        {b.caben_vol > 0 ? b.caben_vol : '—'}
                      </td>
                      <td className="px-6 py-4 w-32">
                        {b.caben_vol > 0 && (
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${b.tamano === 'pequena' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : b.tamano === 'mediana' ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]' : 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]'}`}
                                 style={{width: `min(100%, ${b.caben_vol}%)`}}></div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!breakdown.length && <tr><td colSpan="6" className="text-center text-slate-500 py-8">No hay medidas registradas.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
