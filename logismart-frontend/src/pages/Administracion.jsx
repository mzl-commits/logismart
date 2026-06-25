import { useEffect, useState, useCallback } from 'react';
import { 
  getUsuarios, getProveedores, getVehiculos, getDestinos,
  createProveedor, deleteProveedor,
  createVehiculo, deleteVehiculo,
  createDestino, deleteDestino 
} from '../api/endpoints';

export default function Administracion() {
  const [usuarios, setUsuarios] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [destinos, setDestinos] = useState([]);
  const [loading, setLoading] = useState(true);

  // States to control Modals visibility
  const [showProvModal, setShowProvModal] = useState(false);
  const [showVehModal, setShowVehModal] = useState(false);
  const [showDestModal, setShowDestModal] = useState(false);

  // Form states
  const [formProv, setFormProv] = useState({ nombre_empresa: '', contacto: '' });
  const [formVeh, setFormVeh] = useState({ placa: '', marca: '', capacidad_kg: 1000 });
  const [formDest, setFormDest] = useState({ nombre: '', direccion: '' });

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

  // CRUD Handlers
  const handleCreateProveedor = async (e) => {
    e.preventDefault();
    if (!formProv.nombre_empresa || !formProv.contacto) {
      alert('Por favor completa todos los campos.');
      return;
    }
    try {
      await createProveedor(formProv);
      setFormProv({ nombre_empresa: '', contacto: '' });
      setShowProvModal(false);
      load();
    } catch (err) {
      alert('Error al crear proveedor.');
      console.error(err);
    }
  };

  const handleDeleteProveedor = async (id, name) => {
    if (!confirm(`¿Estás seguro de eliminar el proveedor "${name}"?`)) return;
    try {
      await deleteProveedor(id);
      load();
    } catch (err) {
      alert('No se pudo eliminar el proveedor. Es posible que esté en uso.');
      console.error(err);
    }
  };

  const handleCreateVehiculo = async (e) => {
    e.preventDefault();
    if (!formVeh.placa) {
      alert('Por favor ingresa la placa.');
      return;
    }
    try {
      await createVehiculo({
        placa: formVeh.placa,
        marca: formVeh.marca,
        capacidad_kg: parseFloat(formVeh.capacidad_kg)
      });
      setFormVeh({ placa: '', marca: '', capacidad_kg: 1000 });
      setShowVehModal(false);
      load();
    } catch (err) {
      alert('Error al crear vehículo.');
      console.error(err);
    }
  };

  const handleDeleteVehiculo = async (id, name) => {
    if (!confirm(`¿Estás seguro de eliminar el vehículo "${name}"?`)) return;
    try {
      await deleteVehiculo(id);
      load();
    } catch (err) {
      alert('No se pudo eliminar el vehículo. Es posible que esté en uso.');
      console.error(err);
    }
  };

  const handleCreateDestino = async (e) => {
    e.preventDefault();
    if (!formDest.nombre) {
      alert('Por favor ingresa el nombre.');
      return;
    }
    try {
      await createDestino(formDest);
      setFormDest({ nombre: '', direccion: '' });
      setShowDestModal(false);
      load();
    } catch (err) {
      alert('Error al crear destino.');
      console.error(err);
    }
  };

  const handleDeleteDestino = async (id, name) => {
    if (!confirm(`¿Estás seguro de eliminar el destino "${name}"?`)) return;
    try {
      await deleteDestino(id);
      load();
    } catch (err) {
      alert('No se pudo eliminar el destino. Es posible que esté en uso.');
      console.error(err);
    }
  };

  if (loading && !usuarios.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-light">
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
            <button 
              onClick={() => setShowProvModal(true)} 
              className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-600/30 hover:border-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
            >
              <i className="bi bi-plus-lg"></i> Nuevo
            </button>
          </div>
          <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface/95 backdrop-blur z-10">
                <tr className="border-b border-surface2/60 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Razón Social</th>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-surface2/30">
                {proveedores.map(p => (
                  <tr key={p.id_proveedor} className="hover:bg-surface2/30 transition-colors">
                    <td className="px-6 py-3 text-slate-500">{p.id_proveedor}</td>
                    <td className="px-6 py-3 font-semibold text-white">{p.nombre_empresa}</td>
                    <td className="px-6 py-3 text-slate-300">{p.contacto}</td>
                    <td className="px-6 py-3 text-right">
                      <button 
                        onClick={() => handleDeleteProveedor(p.id_proveedor, p.nombre_empresa)} 
                        className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-400/10 transition-colors"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
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
            <button 
              onClick={() => setShowVehModal(true)} 
              className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-600/30 hover:border-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
            >
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
                      <button 
                        onClick={() => handleDeleteVehiculo(v.id_vehiculo, v.placa)} 
                        className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-400/10 transition-colors"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
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
            <button 
              onClick={() => setShowDestModal(true)} 
              className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-600/30 hover:border-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
            >
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
                      <button 
                        onClick={() => handleDeleteDestino(d.id_destino, d.nombre)} 
                        className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-400/10 transition-colors"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {!destinos.length && <tr><td colSpan="3" className="text-center text-slate-500 py-6">No hay destinos registrados.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- MODALES FORMULARES --- */}

      {/* Modal Proveedor */}
      {showProvModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-surface2 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-[fadeInUp_0.2s_ease-out]">
            <div className="px-6 py-4 border-b border-surface2 bg-surface2/30 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2"><i className="bi bi-building text-sky-400"></i> Registrar Proveedor</h3>
              <button onClick={() => setShowProvModal(false)} className="text-slate-400 hover:text-white transition-colors"><i className="bi bi-x-lg"></i></button>
            </div>
            <form onSubmit={handleCreateProveedor}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Razón Social</label>
                  <input type="text" required className="w-full bg-base border border-surface2 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-accent transition-all text-sm" 
                         value={formProv.nombre_empresa} onChange={e => setFormProv({...formProv, nombre_empresa: e.target.value})} placeholder="Ej. TechCorp S.A." />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Contacto</label>
                  <input type="text" required className="w-full bg-base border border-surface2 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-accent transition-all text-sm" 
                         value={formProv.contacto} onChange={e => setFormProv({...formProv, contacto: e.target.value})} placeholder="Ej. Juan Pérez (juan@techcorp.com)" />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-surface2 bg-surface2/20 flex justify-end gap-3">
                <button type="button" onClick={() => setShowProvModal(false)} className="px-4 py-2.5 bg-surface2 hover:bg-surface border border-surface2 text-light text-xs font-semibold rounded-xl transition-all">Cancelar</button>
                <button type="submit" className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"><i className="bi bi-save"></i> Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Vehículo */}
      {showVehModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-surface2 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-[fadeInUp_0.2s_ease-out]">
            <div className="px-6 py-4 border-b border-surface2 bg-surface2/30 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2"><i className="bi bi-truck text-sky-400"></i> Registrar Vehículo</h3>
              <button onClick={() => setShowVehModal(false)} className="text-slate-400 hover:text-white transition-colors"><i className="bi bi-x-lg"></i></button>
            </div>
            <form onSubmit={handleCreateVehiculo}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Placa</label>
                  <input type="text" required className="w-full bg-base border border-surface2 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-accent transition-all text-sm" 
                         value={formVeh.placa} onChange={e => setFormVeh({...formVeh, placa: e.target.value})} placeholder="Ej. ABC-123" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Marca / Modelo</label>
                  <input type="text" className="w-full bg-base border border-surface2 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-accent transition-all text-sm" 
                         value={formVeh.marca} onChange={e => setFormVeh({...formVeh, marca: e.target.value})} placeholder="Ej. Toyota Dyna" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Capacidad de Carga (kg)</label>
                  <input type="number" required className="w-full bg-base border border-surface2 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-all text-sm" 
                         value={formVeh.capacidad_kg} onChange={e => setFormVeh({...formVeh, capacidad_kg: e.target.value})} />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-surface2 bg-surface2/20 flex justify-end gap-3">
                <button type="button" onClick={() => setShowVehModal(false)} className="px-4 py-2.5 bg-surface2 hover:bg-surface border border-surface2 text-light text-xs font-semibold rounded-xl transition-all">Cancelar</button>
                <button type="submit" className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"><i className="bi bi-save"></i> Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Destino */}
      {showDestModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-surface2 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-[fadeInUp_0.2s_ease-out]">
            <div className="px-6 py-4 border-b border-surface2 bg-surface2/30 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2"><i className="bi bi-geo-alt text-sky-400"></i> Registrar Destino</h3>
              <button onClick={() => setShowDestModal(false)} className="text-slate-400 hover:text-white transition-colors"><i className="bi bi-x-lg"></i></button>
            </div>
            <form onSubmit={handleCreateDestino}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Nombre / Identificador</label>
                  <input type="text" required className="w-full bg-base border border-surface2 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all text-sm" 
                         value={formDest.nombre} onChange={e => setFormDest({...formDest, nombre: e.target.value})} placeholder="Ej. Sucursal Centro" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Dirección</label>
                  <input type="text" className="w-full bg-base border border-surface2 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all text-sm" 
                         value={formDest.direccion} onChange={e => setFormDest({...formDest, direccion: e.target.value})} placeholder="Ej. Av. Principal 123" />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-surface2 bg-surface2/20 flex justify-end gap-3">
                <button type="button" onClick={() => setShowDestModal(false)} className="px-4 py-2.5 bg-surface2 hover:bg-surface border border-surface2 text-light text-xs font-semibold rounded-xl transition-all">Cancelar</button>
                <button type="submit" className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"><i className="bi bi-save"></i> Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
