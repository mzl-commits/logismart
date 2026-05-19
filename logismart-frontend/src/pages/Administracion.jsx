import { useEffect, useState, useCallback } from 'react';
import { getUsuarios, getProveedores, getVehiculos, getDestinos } from '../api/endpoints';

export default function Administracion() {
  const [usuarios, setUsuarios] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [destinos, setDestinos] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ru, rp, rv, rd] = await Promise.all([
        getUsuarios(), getProveedores(), getVehiculos(), getDestinos()
      ]);
      const getData = res => res.data?.results ?? res.data ?? [];
      setUsuarios(getData(ru));
      setProveedores(getData(rp));
      setVehiculos(getData(rv));
      setDestinos(getData(rd));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !usuarios.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-[#AFB3B7]">
        <div className="spinner mb-3"></div>
        Cargando administración...
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 fade-in">
        <div>
          <h2 className="text-2xl font-bold mb-1 text-white"><i className="bi bi-people me-2 text-sky-400"></i>Panel de Administración</h2>
          <p className="text-sm text-slate-400 mb-0">Gestión de Usuarios, Proveedores y Datos Logísticos (Vehículos/Destinos)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        {/* Panel Usuarios */}
        <div className="bg-surface border border-surface2/60 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[450px] fade-in">
          <div className="px-6 py-4 border-b border-surface2/60 font-semibold text-white flex items-center justify-between bg-surface2/40 shrink-0">
            <span className="flex items-center gap-2"><i className="bi bi-person-badge text-sky-400"></i>Usuarios (Operadores)</span>
          </div>
          <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface/95 backdrop-blur z-10">
                <tr className="border-b border-surface2/60 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4">Rol</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-surface2/30">
                {usuarios.map(u => (
                  <tr key={u.id_usuario} className="hover:bg-surface2/30 transition-colors">
                    <td className="px-6 py-3 text-slate-500">{u.id_usuario}</td>
                    <td className="px-6 py-3 font-semibold text-white">{u.nombre}</td>
                    <td className="px-6 py-3">
                      <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md text-xs font-semibold">{u.rol}</span>
                    </td>
                  </tr>
                ))}
                {!usuarios.length && <tr><td colSpan="3" className="text-center text-slate-500 py-6">No hay usuarios.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel Proveedores */}
        <div className="bg-surface border border-surface2/60 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[450px] fade-in fade-d1">
          <div className="px-6 py-4 border-b border-surface2/60 font-semibold text-white flex items-center justify-between bg-surface2/40 shrink-0">
            <span className="flex items-center gap-2"><i className="bi bi-building text-sky-400"></i>Proveedores</span>
            <button className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-600/30 hover:border-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
              <i className="bi bi-plus-lg"></i> Nuevo
            </button>
          </div>
          <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface/95 backdrop-blur z-10">
                <tr className="border-b border-surface2/60 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  <th className="px-6 py-4">RUC/ID</th>
                  <th className="px-6 py-4">Razón Social</th>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-surface2/30">
                {proveedores.map(p => (
                  <tr key={p.id_proveedor} className="hover:bg-surface2/30 transition-colors">
                    <td className="px-6 py-3 text-slate-500">{p.id_proveedor}</td>
                    <td className="px-6 py-3 font-semibold text-white">{p.razon_social}</td>
                    <td className="px-6 py-3 text-xs">
                      <div className="text-slate-300">{p.contacto_nombre}</div>
                      <div className="text-slate-500">{p.contacto_telefono}</div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-400/10 transition-colors"><i className="bi bi-trash"></i></button>
                    </td>
                  </tr>
                ))}
                {!proveedores.length && <tr><td colSpan="4" className="text-center text-slate-500 py-6">No hay proveedores.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel Vehículos */}
        <div className="bg-surface border border-surface2/60 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[450px] fade-in fade-d2">
          <div className="px-6 py-4 border-b border-surface2/60 font-semibold text-white flex items-center justify-between bg-surface2/40 shrink-0">
            <span className="flex items-center gap-2"><i className="bi bi-truck text-sky-400"></i>Flota de Vehículos</span>
            <button className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-600/30 hover:border-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
              <i className="bi bi-plus-lg"></i> Nuevo
            </button>
          </div>
          <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface/95 backdrop-blur z-10">
                <tr className="border-b border-surface2/60 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  <th className="px-6 py-4">Placa</th>
                  <th className="px-6 py-4">Marca / Modelo</th>
                  <th className="px-6 py-4">Capacidad</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-surface2/30">
                {vehiculos.map(v => (
                  <tr key={v.id_vehiculo} className="hover:bg-surface2/30 transition-colors">
                    <td className="px-6 py-3 font-semibold text-white">{v.placa}</td>
                    <td className="px-6 py-3 text-slate-300">{v.marca}</td>
                    <td className="px-6 py-3 text-slate-500">{v.capacidad_kg} kg</td>
                    <td className="px-6 py-3 text-right">
                      <button className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-400/10 transition-colors"><i className="bi bi-trash"></i></button>
                    </td>
                  </tr>
                ))}
                {!vehiculos.length && <tr><td colSpan="4" className="text-center text-slate-500 py-6">No hay vehículos registrados.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel Destinos */}
        <div className="bg-surface border border-surface2/60 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[450px] fade-in fade-d3">
          <div className="px-6 py-4 border-b border-surface2/60 font-semibold text-white flex items-center justify-between bg-surface2/40 shrink-0">
            <span className="flex items-center gap-2"><i className="bi bi-geo-alt text-sky-400"></i>Sedes y Destinos</span>
            <button className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-600/30 hover:border-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
              <i className="bi bi-plus-lg"></i> Nuevo
            </button>
          </div>
          <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface/95 backdrop-blur z-10">
                <tr className="border-b border-surface2/60 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  <th className="px-6 py-4">Nombre / Sucursal</th>
                  <th className="px-6 py-4">Dirección</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-surface2/30">
                {destinos.map(d => (
                  <tr key={d.id_destino} className="hover:bg-surface2/30 transition-colors">
                    <td className="px-6 py-3 font-semibold text-white">{d.nombre}</td>
                    <td className="px-6 py-3 text-xs text-slate-400">{d.direccion}</td>
                    <td className="px-6 py-3 text-right">
                      <button className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-400/10 transition-colors"><i className="bi bi-trash"></i></button>
                    </td>
                  </tr>
                ))}
                {!destinos.length && <tr><td colSpan="3" className="text-center text-slate-500 py-6">No hay destinos registrados.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
