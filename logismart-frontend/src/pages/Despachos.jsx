import { useEffect, useState, useCallback } from 'react';
import { getDespachos, getCajas, getUsuarios, getVehiculos, getDestinos, confirmarDespacho } from '../api/endpoints';

export default function Despachos() {
  const [despachos, setDespachos] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [destinos, setDestinos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [seleccionadas, setSeleccionadas] = useState([]);
  const [form, setForm] = useState({ usuario: '', placa: '', destino: '' });
  const [procesando, setProcesando] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rd, rc, ru, rv, rdt] = await Promise.all([
        getDespachos(), getCajas(), getUsuarios(), getVehiculos(), getDestinos()
      ]);
      const getData = res => res.data?.results ?? res.data ?? [];
      setDespachos(getData(rd));
      setCajas(getData(rc).filter(c => c.estado === 'almacenada'));
      setUsuarios(getData(ru));
      setVehiculos(getData(rv));
      setDestinos(getData(rdt));
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = (id) => {
    setSeleccionadas(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleToggleAll = (e) => {
    setSeleccionadas(e.target.checked ? cajas.map(c => c.id) : []);
  };

  const pesoTotal = seleccionadas.reduce((acc, id) => acc + parseFloat(cajas.find(c => c.id === id)?.peso_kg || 0), 0);

  const handleDespachar = async () => {
    if (!form.usuario) return alert('Selecciona un usuario responsable.');
    if (!form.placa) return alert('Ingresa la placa del transporte.');
    if (!form.destino) return alert('Ingresa el destino final.');
    if (seleccionadas.length === 0) return alert('Selecciona al menos una caja.');

    setProcesando(true);
    let errores = 0;
    for (const cajaId of seleccionadas) {
      try {
        await confirmarDespacho(cajaId, {
          id_usuario: parseInt(form.usuario),
          transporte_placa: form.placa,
          destino: form.destino
        });
      } catch {
        errores++;
      }
    }
    setProcesando(false);
    if (errores === 0) {
      alert('Despacho registrado correctamente.');
      setSeleccionadas([]);
      setForm({ usuario: '', placa: '', destino: '' });
      load();
    } else {
      alert(`Se completó con ${errores} errores.`);
      load();
    }
  };

  if (loading && !cajas.length && !despachos.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-[#AFB3B7]">
        <div className="spinner mb-3"></div>
        Cargando despachos...
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 fade-in">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <i className="bi bi-truck text-sky-400"></i> Gestión de Despachos
          </h2>
          <p className="text-slate-500 text-sm mt-1">Registra la salida de cajas almacenadas hacia su destino final</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Panel Izquierdo: Cajas Almacenadas */}
        <div className="lg:col-span-7 fade-in">
          <div className="bg-surface rounded-2xl border border-surface2/60 overflow-hidden shadow-xl shadow-black/20 h-full flex flex-col">
            <div className="px-6 py-4 border-b border-surface2/60 bg-surface2/40">
              <span className="font-semibold text-white flex items-center gap-2"><i className="bi bi-box-seam text-sky-400"></i> Cajas Listas para Despacho</span>
            </div>
            
            <div className="overflow-x-auto flex-grow max-h-[500px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface/95 backdrop-blur z-10">
                  <tr className="border-b border-surface2/60">
                    <th className="px-6 py-4 w-12 text-center">
                      <input className="form-check-input mt-0 cursor-pointer w-4 h-4 rounded border-slate-600 bg-slate-800 focus:ring-sky-500 focus:ring-offset-slate-900" type="checkbox" onChange={handleToggleAll} checked={seleccionadas.length === cajas.length && cajas.length > 0} />
                    </th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-4 py-4">Caja</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-4 py-4">Peso</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-4 py-4">Ubicación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface2/30">
                  {cajas.map(caja => (
                    <tr key={caja.id} className="hover:bg-surface2/20 transition-colors">
                      <td className="px-6 py-3 text-center">
                        <input className="form-check-input cursor-pointer w-4 h-4 rounded border-slate-600 bg-slate-800 focus:ring-sky-500 focus:ring-offset-slate-900" type="checkbox" checked={seleccionadas.includes(caja.id)} onChange={() => handleToggle(caja.id)} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200 text-base">{caja.producto}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{caja.id} <span className="mx-1">·</span> {caja.categoria}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{caja.peso_kg} kg</td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-600/20 text-emerald-400 border border-emerald-500/20">
                          {caja.id_ubicacion}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!cajas.length && (
                    <tr>
                      <td colSpan="4" className="text-center text-slate-500 py-12">
                        <i className="bi bi-inbox text-5xl block mb-3 opacity-30"></i>
                        <p className="text-base font-medium">No hay cajas en el almacén.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-surface2/60 bg-surface2/30 flex justify-between items-center text-sm">
              <span className="text-slate-400">Seleccionadas: <strong className="text-white text-base ml-1">{seleccionadas.length}</strong> <span className="mx-1 text-slate-600">|</span> <span className="text-white">{pesoTotal.toFixed(2)}</span> kg</span>
            </div>
          </div>
        </div>

        {/* Panel Derecho: Formulario de Despacho */}
        <div className="lg:col-span-5 fade-in fade-d1">
          <div className="bg-surface rounded-2xl border border-surface2/60 overflow-hidden shadow-xl shadow-black/20 mb-6">
            <div className="px-6 py-4 border-b border-surface2/60 bg-surface2/40">
              <span className="font-semibold text-white flex items-center gap-2"><i className="bi bi-send-check text-sky-400"></i> Registrar Salida</span>
            </div>
            <div className="p-6">
              <div className="mb-5">
                <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Usuario Responsable</label>
                <select className="w-full bg-surface2/40 border border-surface2 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all appearance-none" value={form.usuario} onChange={e => setForm({...form, usuario: e.target.value})}>
                  <option value="">-- Seleccionar Operador --</option>
                  {usuarios.map(u => <option key={u.id_usuario} value={u.id_usuario}>{u.nombre} ({u.rol})</option>)}
                </select>
              </div>
              <div className="mb-5">
                <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Placa del Transporte</label>
                <select className="w-full bg-surface2/40 border border-surface2 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all appearance-none" value={form.placa} onChange={e => setForm({...form, placa: e.target.value})}>
                  <option value="">-- Seleccionar Vehículo --</option>
                  {vehiculos.map(v => <option key={v.placa} value={v.placa}>{v.placa} - {v.marca} (Capacidad: {v.capacidad_kg}kg)</option>)}
                </select>
              </div>
              <div className="mb-6">
                <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Destino Final</label>
                <select className="w-full bg-surface2/40 border border-surface2 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all appearance-none" value={form.destino} onChange={e => setForm({...form, destino: e.target.value})}>
                  <option value="">-- Seleccionar Destino --</option>
                  {destinos.map(d => <option key={d.nombre} value={d.nombre}>{d.nombre} ({d.direccion})</option>)}
                </select>
              </div>
              <button className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all" disabled={!seleccionadas.length || procesando} onClick={handleDespachar}>
                <i className="bi bi-truck text-lg"></i> {procesando ? 'Procesando...' : 'Confirmar Despacho'}
              </button>
            </div>
          </div>

          {/* Historial Reciente de Despachos */}
          <div className="bg-surface rounded-2xl border border-surface2/60 overflow-hidden shadow-xl shadow-black/20 fade-in fade-d2 flex flex-col">
            <div className="px-6 py-4 border-b border-surface2/60 bg-surface2/40 shrink-0">
              <span className="font-semibold text-white flex items-center gap-2"><i className="bi bi-clock-history text-sky-400"></i> Últimas Salidas</span>
            </div>
            <div className="flex-grow max-h-[250px] overflow-y-auto p-4">
              <div className="space-y-3">
                {despachos.slice(0,10).map(des => (
                  <div key={des.id_despacho} className="bg-surface2/30 border border-surface2/50 rounded-xl p-4 hover:bg-surface2/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-emerald-400 flex items-center gap-2"><i className="bi bi-box"></i> {des.id_caja_id}</div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5"><i className="bi bi-truck"></i> {des.transporte_placa} <i className="bi bi-arrow-right text-[9px]"></i> {des.destino}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">{new Date(des.fecha_salida).toLocaleString('es-PE')}</div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center justify-end gap-1"><i className="bi bi-person"></i> Operador</div>
                      </div>
                    </div>
                  </div>
                ))}
                {!despachos.length && (
                  <div className="text-center text-slate-500 py-6">
                    <i className="bi bi-clock-history text-3xl block mb-2 opacity-30"></i>
                    Aún no hay despachos registrados.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
