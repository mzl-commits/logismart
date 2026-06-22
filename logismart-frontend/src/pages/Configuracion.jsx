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

  // --- Telemetría AGV ---
  const [telemetry, setTelemetry] = useState({
    estado: 'desconectado',
    pos_x: 0,
    pos_y: 0,
    destino_x: 0,
    destino_y: 0,
    sensor_opt_izq_ext: false,
    sensor_opt_izq_int: false,
    sensor_opt_der_int: false,
    sensor_opt_der_ext: false,
    sensor_obstaculo_frontal: false,
    sensor_obstaculo_trasero: false,
    motor_izq_vel: 1500,
    motor_der_vel: 1500
  });
  const [wsConnected, setWsConnected] = useState(false);
  const [simulation, setSimulation] = useState(true);
  const [simStep, setSimStep] = useState(0);
  const [simValues, setSimValues] = useState(null);

  useEffect(() => {
    const prot = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const host = window.location.host;
    const url = `${prot}${host}/ws/carro/`;
    let socket;
    let retryTimer = null;

    const connect = () => {
      socket = new WebSocket(url);

      socket.onopen = () => {
        setWsConnected(true);
        socket.send(JSON.stringify({ action: 'get_state', carro_id: 1 }));
      };

      socket.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if ((msg.type === 'initial_state' || msg.type === 'state_update') && msg.data?.id === 1) {
            setTelemetry(prev => ({
              ...prev,
              ...msg.data
            }));
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
        retryTimer = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      if (socket) socket.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  useEffect(() => {
    const estaMoviendose = (telemetry.estado === 'moviendo' || telemetry.estado === 'regresando');
    if (simulation && estaMoviendose) {
      const interval = setInterval(() => {
        setSimStep(prev => {
          const nextStep = prev + 1;
          let sOpt1 = false;
          let sOpt2 = true;
          let sOpt3 = true;
          let sOpt4 = false;

          // Simular zig-zag de alineación
          if (nextStep % 12 < 3) {
            sOpt2 = true; sOpt3 = false;
          } else if (nextStep % 12 >= 6 && nextStep % 12 < 9) {
            sOpt2 = false; sOpt3 = true;
          }

          // Simular conteo de nodos (intersección activa brevemente cada 30 pasos)
          if (nextStep % 30 === 0 || nextStep % 30 === 1) {
            sOpt1 = true;
            sOpt4 = true;
          }

          // Calcular velocidad motor en base a corrección
          let mIzq = 1600;
          let mDer = 1400;
          if (!sOpt2) mIzq = 1500;
          if (!sOpt3) mDer = 1500;

          setSimValues({
            sensor_opt_izq_ext: sOpt1,
            sensor_opt_izq_int: sOpt2,
            sensor_opt_der_int: sOpt3,
            sensor_opt_der_ext: sOpt4,
            sensor_obstaculo_frontal: false,
            sensor_obstaculo_trasero: false,
            motor_izq_vel: mIzq,
            motor_der_vel: mDer,
            estado: telemetry.estado,
            pos_x: telemetry.pos_x,
            pos_y: telemetry.pos_y,
            destino_x: telemetry.destino_x,
            destino_y: telemetry.destino_y
          });

          return nextStep;
        });
      }, 150);

      return () => clearInterval(interval);
    } else {
      setSimValues(null);
    }
  }, [simulation, telemetry.estado, telemetry.pos_x, telemetry.pos_y, telemetry.destino_x, telemetry.destino_y]);

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
        notes: cfgData.notas || ''
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

  // --- Telemetry status variables ---
  const currentValues = simValues || telemetry;
  const motorIzqPct = Math.min(100, Math.max(-100, Math.round((currentValues.motor_izq_vel - 1500) / 5)));
  const motorDerPct = Math.min(100, Math.max(-100, Math.round((1500 - currentValues.motor_der_vel) / 5)));

  const spinSpeedL = currentValues.motor_izq_vel !== 1500 ? `${Math.max(0.1, 1 - (Math.abs(motorIzqPct) / 100))}s` : '0s';
  const spinSpeedR = currentValues.motor_der_vel !== 1500 ? `${Math.max(0.1, 1 - (Math.abs(motorDerPct) / 100))}s` : '0s';

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
          <h2 className="text-2xl font-bold mb-1 text-white"><i className="bi bi-gear me-2 text-sky-400"></i>Configuración y Telemetría</h2>
          <p className="text-sm text-slate-400 mb-0">Monitoreo del robot AGV y análisis de capacidad del carro</p>
        </div>
        <div>
          <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20" disabled={saving} onClick={handleSave}>
            <i className="bi bi-check-lg"></i> {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 fade-in">
        {/* Columna Izquierda: Telemetría y Desglose de Medidas */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Card Telemetría */}
          <div className="bg-surface border border-slate-800/60 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800/60 font-semibold text-white flex items-center justify-between bg-slate-900/30">
              <div className="flex items-center gap-2">
                <i className="bi bi-cpu text-sky-400 animate-pulse"></i> Telemetría del AGV (MQTT) — {config.nombre}
              </div>
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  wsConnected 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                }`}>
                  <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${wsConnected ? 'bg-emerald-500 live-dot' : 'bg-slate-500'}`}></span>
                  {wsConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Chasis AGV (4 cols) */}
                <div className="lg:col-span-4 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-800/60 pb-6 lg:pb-0 lg:pr-6">
                  <div className="agv-container">
                    <div className="agv-chassis">
                      {/* Ruedas */}
                      <div className="wheel wheel-left">
                        <div 
                          className={`wheel-tread ${
                            currentValues.motor_izq_vel > 1500 ? 'wheel-spin-fw' : currentValues.motor_izq_vel < 1500 ? 'wheel-spin-rv' : ''
                          }`}
                          style={{ '--spin-speed': spinSpeedL }}
                        ></div>
                      </div>
                      <div className="wheel wheel-right">
                        <div 
                          className={`wheel-tread ${
                            currentValues.motor_der_vel < 1500 ? 'wheel-spin-fw' : currentValues.motor_der_vel > 1500 ? 'wheel-spin-rv' : ''
                          }`}
                          style={{ '--spin-speed': spinSpeedR }}
                        ></div>
                      </div>

                      {/* Sensor Obstáculo Frontal */}
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2" title="Sensor Obstáculo Frontal">
                        <div className={`sensor-dot w-3 h-3 ${currentValues.sensor_obstaculo_frontal ? 'sensor-obstacle-active' : ''}`}></div>
                      </div>

                      {/* Sensores Ópticos de Línea */}
                      <div className="absolute top-4 left-[56px] flex flex-col items-center" title="SI-Int (Alineación)">
                        <div className={`sensor-dot ${currentValues.sensor_opt_izq_int ? 'sensor-align-active' : ''}`}></div>
                        <span className="text-[8px] text-slate-500 mt-0.5 font-semibold">SI-Int</span>
                      </div>
                      <div className="absolute top-4 right-[56px] flex flex-col items-center" title="SD-Int (Alineación)">
                        <div className={`sensor-dot ${currentValues.sensor_opt_der_int ? 'sensor-align-active' : ''}`}></div>
                        <span className="text-[8px] text-slate-500 mt-0.5 font-semibold">SD-Int</span>
                      </div>

                      <div className="absolute bottom-[58px] left-[6px] flex flex-col items-center" title="SI-Ext (Detección de Nodos)">
                        <div className={`sensor-dot ${currentValues.sensor_opt_izq_ext ? 'sensor-node-active' : ''}`}></div>
                        <span className="text-[8px] text-slate-500 mt-0.5 font-semibold">SI-Ext</span>
                      </div>
                      <div className="absolute top-[58px] right-[6px] flex flex-col items-center" title="SD-Ext (Detección de Nodos)">
                        <div className={`sensor-dot ${currentValues.sensor_opt_der_ext ? 'sensor-node-active' : ''}`}></div>
                        <span className="text-[8px] text-slate-500 mt-0.5 font-semibold">SD-Ext</span>
                      </div>

                      {/* Cuerpo del carro */}
                      <span className="text-[9px] font-black text-slate-600 tracking-wider">LOGISMART AGV</span>
                      <div className="text-[10px] font-black text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                        {currentValues.estado ? currentValues.estado.toUpperCase() : 'ESPERANDO'}
                      </div>
                      <div className="text-xl font-extrabold text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.3)] mt-1">
                        ({currentValues.pos_x ?? 0}, {currentValues.pos_y ?? 0})
                      </div>
                      <div className="text-[9px] text-slate-500 mt-1">
                        {currentValues.estado === 'moviendo' && currentValues.destino_x !== undefined
                          ? `Dest: (${currentValues.destino_x}, ${currentValues.destino_y})`
                          : currentValues.estado === 'regresando'
                          ? 'Regresando a Base'
                          : `Base: (${config.pos_base_x}, ${config.pos_base_y})`}
                      </div>

                      {/* Sensor Obstáculo Trasero */}
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2" title="Sensor Obstáculo Trasero">
                        <div className={`sensor-dot w-3 h-3 ${currentValues.sensor_obstaculo_trasero ? 'sensor-obstacle-active' : ''}`}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Motores y Diagnóstico (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800/40 pb-2">
                    <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Diagnóstico de Motores</span>
                    <label className="relative inline-flex items-center cursor-pointer" title="Simular comportamiento de sensores cuando el carro esté en marcha">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={simulation} 
                        onChange={(e) => setSimulation(e.target.checked)} 
                      />
                      <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-500 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
                      <span className="ml-1.5 text-[10px] font-medium text-slate-400">Simulación</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Motor Izquierdo */}
                    <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-400">Motor Izquierdo</span>
                        <span className="text-xs font-extrabold text-sky-400">{currentValues.motor_izq_vel ?? 1500} us</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mb-2 flex justify-between">
                        <span className="font-semibold">
                          {currentValues.motor_izq_vel > 1500 ? 'AVANCE' : currentValues.motor_izq_vel < 1500 ? 'REVERSA' : 'PARADO'}
                        </span>
                        <span className="font-semibold">{motorIzqPct}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden relative">
                        <div 
                          className="h-full bg-sky-500 rounded-full transition-all duration-300" 
                          style={{ width: `${50 + (motorIzqPct / 2)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Motor Derecho */}
                    <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-400">Motor Derecho</span>
                        <span className="text-xs font-extrabold text-sky-400">{currentValues.motor_der_vel ?? 1500} us</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mb-2 flex justify-between">
                        <span className="font-semibold">
                          {currentValues.motor_der_vel < 1500 ? 'AVANCE' : currentValues.motor_der_vel > 1500 ? 'REVERSA' : 'PARADO'}
                        </span>
                        <span className="font-semibold">{motorDerPct}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden relative">
                        <div 
                          className="h-full bg-sky-500 rounded-full transition-all duration-300" 
                          style={{ width: `${50 + (motorDerPct / 2)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de medidas */}
          <div className="bg-surface rounded-2xl border border-slate-800/60 p-0 overflow-hidden fade-in fade-d2">
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

        {/* Columna Derecha: Parámetros y Capacidad */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card Parámetros */}
          <div className="bg-surface border border-slate-800/60 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800/60 font-semibold text-white flex items-center gap-2 bg-slate-900/30">
              <i className="bi bi-sliders text-sky-400"></i> Ajustar Parámetros
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Nombre del carro</label>
                <input type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all" id="nombre" value={config.nombre} onChange={handleChange} />
              </div>

              <div className="mb-4">
                <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Dimensiones (cm) — Largo × Ancho × Alto</label>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.1" min="1" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-2 py-3 text-white text-center focus:outline-none focus:border-sky-500 transition-all" id="largo_cm" value={config.largo_cm} onChange={handleChange} placeholder="L" />
                  <span className="text-slate-500">×</span>
                  <input type="number" step="0.1" min="1" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-2 py-3 text-white text-center focus:outline-none focus:border-sky-500 transition-all" id="ancho_cm" value={config.ancho_cm} onChange={handleChange} placeholder="A" />
                  <span className="text-slate-500">×</span>
                  <input type="number" step="0.1" min="1" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-2 py-3 text-white text-center focus:outline-none focus:border-sky-500 transition-all" id="alto_cm" value={config.alto_cm} onChange={handleChange} placeholder="H" />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Peso máximo (kg)</label>
                <input type="number" step="0.5" min="1" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-all" id="peso_maximo_kg" value={config.peso_maximo_kg} onChange={handleChange} />
              </div>

              <div className="mb-4">
                <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Máximo paradas por ruta</label>
                <input type="number" min="1" max="50" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-all" id="max_paradas" value={config.max_paradas} onChange={handleChange} />
              </div>

              <div className="mb-4">
                <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Posición base (X, Y)</label>
                <div className="flex gap-4">
                  <input type="number" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-center focus:outline-none focus:border-sky-500 transition-all" id="pos_base_x" value={config.pos_base_x} onChange={handleChange} placeholder="X" />
                  <input type="number" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-center focus:outline-none focus:border-sky-500 transition-all" id="pos_base_y" value={config.pos_base_y} onChange={handleChange} placeholder="Y" />
                </div>
              </div>

              <div className="mb-2">
                <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Notas</label>
                <textarea className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-all resize-none" id="notas" rows="2" value={config.notes} onChange={handleChange}></textarea>
              </div>
            </div>
          </div>

          {/* Card Capacidad Calculada */}
          <div className="bg-surface border border-slate-800/60 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800/60 font-semibold text-white flex items-center gap-2 bg-slate-900/30">
              <i className="bi bi-box text-sky-400"></i> Capacidad calculada
            </div>
            <div className="p-6">
              <div className="flex flex-col mb-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Volumen total del carro</span>
                <span className="text-xl font-extrabold text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)] mt-1">{cartVol > 0 ? `${Math.round(cartVol).toLocaleString()} cm³` : '—'}</span>
              </div>
              
              <div className="h-px bg-slate-800/60 w-full mb-4"></div>

              <div className="space-y-4">
                <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 flex items-center justify-between relative overflow-hidden group">
                  <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="z-10">
                    <span className="text-sm font-bold text-slate-300">📦 Pequeñas</span>
                    <div className="text-[10px] text-slate-500">≤ 8,000 cm³</div>
                  </div>
                  <div className="text-3xl font-black text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.3)] z-10">{maxPorTipo.pequena}</div>
                </div>
                
                <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 flex items-center justify-between relative overflow-hidden group">
                  <div className="absolute inset-0 bg-sky-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="z-10">
                    <span className="text-sm font-bold text-slate-300">🗃️ Medianas</span>
                    <div className="text-[10px] text-slate-500">8,001 – 64,000 cm³</div>
                  </div>
                  <div className="text-3xl font-black text-sky-400 drop-shadow-[0_0_12px_rgba(56,189,248,0.3)] z-10">{maxPorTipo.mediana}</div>
                </div>
                
                <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 flex items-center justify-between relative overflow-hidden group">
                  <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="z-10">
                    <span className="text-sm font-bold text-slate-300">📫 Grandes</span>
                    <div className="text-[10px] text-slate-500">&gt; 64,000 cm³</div>
                  </div>
                  <div className="text-3xl font-black text-indigo-400 drop-shadow-[0_0_12px_rgba(99,102,241,0.3)] z-10">{maxPorTipo.grande}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
