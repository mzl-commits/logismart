import { useCallback, useEffect, useState } from 'react';
import {
  createDestino, createProveedor, createVehiculo,
  updateDestino, updateProveedor, updateVehiculo,
  deleteDestino, deleteProveedor, deleteVehiculo,
  getDestinos, getProveedores, getUsuarios, getVehiculos, getMedidas,
  createUsuario, updateUsuario, deleteUsuario,
  createMedida, updateMedida, deleteMedida,
} from '../api/endpoints';
import { toast } from 'react-hot-toast';
import { Modal } from '../components/ui';
import RequireRole from '../components/RequireRole';
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';

const rows = (response) => response.data?.results ?? response.data ?? [];

export default function Administracion() {
  const [data, setData] = useState({ usuarios: [], medidas: [], proveedores: [], destinos: [], vehiculos: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal states
  const [modalState, setModalState] = useState({ isOpen: false, type: null, mode: 'create', currentData: null });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, id: null, display: '' });

  // Form states
  const [proveedor, setProveedor] = useState({ nombre_empresa: '', contacto: '' });
  const [destino, setDestino] = useState({ nombre: '', direccion: '' });
  const [vehiculo, setVehiculo] = useState({ placa: '', marca: '', capacidad_kg: 1000 });
  const [usuario, setUsuario] = useState({ nombre: '', username: '', email: '', rol: 'operador', password: '' });
  const [medida, setMedida] = useState({ nombre: '', largo: 1, ancho: 1, alto: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const [usuarios, medidas, proveedores, destinos, vehiculos] = await Promise.allSettled([
      getUsuarios(), getMedidas(), getProveedores(), getDestinos(), getVehiculos(),
    ]);
    setData({
      usuarios: usuarios.status === 'fulfilled' ? rows(usuarios.value) : [],
      medidas: medidas.status === 'fulfilled' ? rows(medidas.value) : [],
      proveedores: proveedores.status === 'fulfilled' ? rows(proveedores.value) : [],
      destinos: destinos.status === 'fulfilled' ? rows(destinos.value) : [],
      vehiculos: vehiculos.status === 'fulfilled' ? rows(vehiculos.value) : [],
    });
    if ([usuarios, medidas, proveedores, destinos, vehiculos].some((result) => result.status === 'rejected')) {
      setLoadError('Algunos catalogos no pudieron cargarse. Revisa la conexion y vuelve a intentar.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openModal = (type, mode = 'create', currentData = null) => {
    setModalState({ isOpen: true, type, mode, currentData });
    if (mode === 'edit' && currentData) {
      if (type === 'proveedor') setProveedor({ nombre_empresa: currentData.nombre_empresa, contacto: currentData.contacto });
      if (type === 'destino') setDestino({ nombre: currentData.nombre, direccion: currentData.direccion });
      if (type === 'vehiculo') setVehiculo({ placa: currentData.placa, marca: currentData.marca, capacidad_kg: currentData.capacidad_kg });
      if (type === 'usuario') setUsuario({ nombre: currentData.nombre, username: currentData.username, email: currentData.email || '', rol: currentData.rol, password: '' });
      if (type === 'medida') setMedida({ nombre: currentData.nombre, largo: currentData.largo, ancho: currentData.ancho, alto: currentData.alto });
    } else {
      setProveedor({ nombre_empresa: '', contacto: '' });
      setDestino({ nombre: '', direccion: '' });
      setVehiculo({ placa: '', marca: '', capacidad_kg: 1000 });
      setUsuario({ nombre: '', username: '', email: '', rol: 'operador', password: '' });
      setMedida({ nombre: '', largo: 1, ancho: 1, alto: 1 });
    }
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: null, mode: 'create', currentData: null });
  };

  const submitProveedor = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (modalState.mode === 'create') {
        await createProveedor(proveedor);
        toast.success('Proveedor agregado correctamente.');
      } else {
        await updateProveedor(modalState.currentData.id_proveedor, proveedor);
        toast.success('Proveedor actualizado correctamente.');
      }
      closeModal();
      await load();
    } catch (error) {
      toast.error(`Error al ${modalState.mode === 'create' ? 'agregar' : 'actualizar'} proveedor.`);
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const submitDestino = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (modalState.mode === 'create') {
        await createDestino(destino);
        toast.success('Destino agregado correctamente.');
      } else {
        await updateDestino(modalState.currentData.id_destino, destino);
        toast.success('Destino actualizado correctamente.');
      }
      closeModal();
      await load();
    } catch (error) {
      toast.error(`Error al ${modalState.mode === 'create' ? 'agregar' : 'actualizar'} destino.`);
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const submitVehiculo = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = { ...vehiculo, placa: vehiculo.placa.toUpperCase() };
      if (modalState.mode === 'create') {
        await createVehiculo(payload);
        toast.success('Vehículo agregado correctamente.');
      } else {
        await updateVehiculo(modalState.currentData.id_vehiculo, payload);
        toast.success('Vehículo actualizado correctamente.');
      }
      closeModal();
      await load();
    } catch (error) {
      toast.error(`Error al ${modalState.mode === 'create' ? 'agregar' : 'actualizar'} vehículo.`);
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const submitUsuario = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = { ...usuario };
      if (!payload.password) delete payload.password;
      if (modalState.mode === 'create') await createUsuario(payload);
      else await updateUsuario(modalState.currentData.id_usuario, payload);
      toast.success(`Usuario ${modalState.mode === 'create' ? 'creado' : 'actualizado'} correctamente.`);
      closeModal();
      await load();
    } catch (error) {
      toast.error(error.response?.data?.username?.[0] || error.response?.data?.error || 'No se pudo guardar el usuario.');
    } finally { setSubmitting(false); }
  };

  const submitMedida = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = { ...medida, largo: Number(medida.largo), ancho: Number(medida.ancho), alto: Number(medida.alto) };
      if (modalState.mode === 'create') await createMedida(payload);
      else await updateMedida(modalState.currentData.id_medida, payload);
      toast.success(`Medida ${modalState.mode === 'create' ? 'creada' : 'actualizada'} correctamente.`);
      closeModal();
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo guardar la medida.');
    } finally { setSubmitting(false); }
  };

  const confirmDeletion = (type, id, display) => {
    setConfirmModal({ isOpen: true, type, id, display });
  };

  const executeDeletion = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (confirmModal.type === 'proveedor') await deleteProveedor(confirmModal.id);
      if (confirmModal.type === 'destino') await deleteDestino(confirmModal.id);
      if (confirmModal.type === 'vehiculo') await deleteVehiculo(confirmModal.id);
      if (confirmModal.type === 'usuario') await deleteUsuario(confirmModal.id);
      if (confirmModal.type === 'medida') await deleteMedida(confirmModal.id);
      toast.success('Registro eliminado correctamente.');
      setConfirmModal({ isOpen: false, type: null, id: null, display: '' });
      await load();
    } catch (error) {
      toast.error('Error al eliminar registro.');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="page-stack">
    <header className="page-header">
      <div><h1>Administración</h1><p>Usuarios, proveedores, destinos y vehículos operativos.</p></div>
      <button className="icon-button" onClick={load} aria-label="Actualizar catalogos" title="Actualizar catalogos"><RefreshCw size={17} /></button>
    </header>
    {loadError && <div className="inline-alert inline-alert--warning" role="alert">{loadError} <button className="button button--secondary" onClick={load}>Reintentar</button></div>}
    {loading ? <p className="text-slate-400">Cargando administración...</p> : <div className="admin-catalog-grid">

      <section className="admin-catalog-panel bg-surface border border-surface2 rounded-lg p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-light">Usuarios</h2>
          <RequireRole><button className="button button--primary" onClick={() => openModal('usuario', 'create')}><Plus size={16} />Nuevo</button></RequireRole>
        </div>
        <Table
          headers={['Nombre', 'Usuario', 'Rol', 'Acciones']}
          rows={data.usuarios.map(u => [
            u.nombre, u.username, u.rol,
            <RequireRole key={`actions-user-${u.id_usuario}`}><TableActions onEdit={() => openModal('usuario', 'edit', u)} onDelete={() => confirmDeletion('usuario', u.id_usuario, u.nombre)} /></RequireRole>,
          ])}
        />
      </section>

      <section className="admin-catalog-panel bg-surface border border-surface2 rounded-lg p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-light">Medidas</h2>
          <RequireRole><button className="button button--primary" onClick={() => openModal('medida', 'create')}><Plus size={16} />Nueva</button></RequireRole>
        </div>
        <Table headers={['Nombre', 'Dimensiones', 'Volumen', 'Acciones']} rows={data.medidas.map(m => [
          m.nombre, `${m.largo} × ${m.ancho} × ${m.alto}`, m.volumen,
          <RequireRole key={`actions-measure-${m.id_medida}`}><TableActions onEdit={() => openModal('medida', 'edit', m)} onDelete={() => confirmDeletion('medida', m.id_medida, m.nombre)} /></RequireRole>,
        ])} />
      </section>

      <section className="admin-catalog-panel bg-surface border border-surface2 rounded-lg p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-light">Vehículos</h2>
          <RequireRole>
            <button className="button button--primary" onClick={() => openModal('vehiculo', 'create')}><Plus size={16} />Nuevo</button>
          </RequireRole>
        </div>
        <Table
          headers={['Placa', 'Marca', 'Capacidad', 'Acciones']}
          rows={data.vehiculos.map(v => [
            v.placa, v.marca, `${v.capacidad_kg} kg`,
            <RequireRole key={`actions-${v.placa}`}>
              <TableActions onEdit={() => openModal('vehiculo', 'edit', v)} onDelete={() => confirmDeletion('vehiculo', v.id_vehiculo, v.placa)} />
            </RequireRole>
          ])}
        />
      </section>

      <section className="admin-catalog-panel bg-surface border border-surface2 rounded-lg p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-light">Proveedores</h2>
          <RequireRole>
            <button className="button button--primary" onClick={() => openModal('proveedor', 'create')}><Plus size={16} />Nuevo</button>
          </RequireRole>
        </div>
        <Table
          headers={['Empresa', 'Contacto', 'Acciones']}
          rows={data.proveedores.map(p => [
            p.nombre_empresa, p.contacto,
            <RequireRole key={`actions-${p.id_proveedor}`}>
              <TableActions onEdit={() => openModal('proveedor', 'edit', p)} onDelete={() => confirmDeletion('proveedor', p.id_proveedor, p.nombre_empresa)} />
            </RequireRole>
          ])}
        />
      </section>

      <section className="admin-catalog-panel bg-surface border border-surface2 rounded-lg p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-light">Destinos</h2>
          <RequireRole>
            <button className="button button--primary" onClick={() => openModal('destino', 'create')}><Plus size={16} />Nuevo</button>
          </RequireRole>
        </div>
        <Table
          headers={['Nombre', 'Dirección', 'Acciones']}
          rows={data.destinos.map(d => [
            d.nombre, d.direccion,
            <RequireRole key={`actions-${d.id_destino}`}>
              <TableActions onEdit={() => openModal('destino', 'edit', d)} onDelete={() => confirmDeletion('destino', d.id_destino, d.nombre)} />
            </RequireRole>
          ])}
        />
      </section>
    </div>}

    {/* Form Modal */}
    <Modal isOpen={modalState.isOpen} onClose={closeModal} title={`${modalState.mode === 'create' ? 'Nuevo' : 'Editar'} ${modalState.type || ''}`}>
      {modalState.type === 'usuario' && (
        <form className="form-stack" onSubmit={submitUsuario}>
          <label><span>Nombre completo</span><input required value={usuario.nombre} onChange={e => setUsuario({...usuario, nombre:e.target.value})} /></label>
          <label><span>Nombre de usuario</span><input required value={usuario.username} autoComplete="off" onChange={e => setUsuario({...usuario, username:e.target.value})} /></label>
          <label><span>Correo</span><input type="email" value={usuario.email} onChange={e => setUsuario({...usuario, email:e.target.value})} /></label>
          <label><span>Rol</span><select value={usuario.rol} onChange={e => setUsuario({...usuario, rol:e.target.value})}><option value="operador">Operador</option><option value="despachador">Despachador</option><option value="admin">Administrador</option></select></label>
          <label><span>{modalState.mode === 'create' ? 'Contraseña' : 'Nueva contraseña (opcional)'}</span><input type="password" required={modalState.mode === 'create'} minLength={8} autoComplete="new-password" value={usuario.password} onChange={e => setUsuario({...usuario, password:e.target.value})} /></label>
          <button disabled={submitting} className="button button--primary">{submitting ? 'Guardando...' : 'Guardar usuario'}</button>
        </form>
      )}
      {modalState.type === 'medida' && (
        <form className="form-stack" onSubmit={submitMedida}>
          <label><span>Nombre</span><input required value={medida.nombre} onChange={e => setMedida({...medida, nombre:e.target.value})} /></label>
          <div className="form-grid-3">
            {['largo','ancho','alto'].map(field => <label key={field}><span>{field[0].toUpperCase()+field.slice(1)}</span><input type="number" min="0.01" step="0.01" required value={medida[field]} onChange={e => setMedida({...medida,[field]:e.target.value})} /></label>)}
          </div>
          <p className="text-sm text-slate-400">Volumen calculado: {(Number(medida.largo || 0) * Number(medida.ancho || 0) * Number(medida.alto || 0)).toFixed(2)}</p>
          <button disabled={submitting} className="button button--primary">{submitting ? 'Guardando...' : 'Guardar medida'}</button>
        </form>
      )}
      {modalState.type === 'proveedor' && (
        <form className="form-stack" onSubmit={submitProveedor}>
          <div>
            <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1 block">Empresa</label>
            <input className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 mb-4" required placeholder="Nombre de la empresa" value={proveedor.nombre_empresa} onChange={(e) => setProveedor({ ...proveedor, nombre_empresa: e.target.value })} />
          </div>
          <div>
            <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1 block">Contacto</label>
            <input className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 mb-6" required placeholder="Persona o teléfono" value={proveedor.contacto} onChange={(e) => setProveedor({ ...proveedor, contacto: e.target.value })} />
          </div>
          <button disabled={submitting} className="w-full button button--primary py-3">{submitting ? 'Guardando...' : modalState.mode === 'create' ? 'Crear' : 'Guardar cambios'}</button>
        </form>
      )}
      {modalState.type === 'destino' && (
        <form className="form-stack" onSubmit={submitDestino}>
          <div>
            <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1 block">Nombre</label>
            <input className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 mb-4" required placeholder="Ej. Almacén Norte" value={destino.nombre} onChange={(e) => setDestino({ ...destino, nombre: e.target.value })} />
          </div>
          <div>
            <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1 block">Dirección</label>
            <input className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 mb-6" placeholder="Dirección completa" value={destino.direccion} onChange={(e) => setDestino({ ...destino, direccion: e.target.value })} />
          </div>
          <button disabled={submitting} className="w-full button button--primary py-3">{submitting ? 'Guardando...' : modalState.mode === 'create' ? 'Crear' : 'Guardar cambios'}</button>
        </form>
      )}
      {modalState.type === 'vehiculo' && (
        <form className="form-stack" onSubmit={submitVehiculo}>
          <div>
            <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1 block">Placa</label>
            <input className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 mb-4" required disabled={modalState.mode === 'edit'} placeholder="Placa (ej. ABC-123)" value={vehiculo.placa} onChange={(e) => setVehiculo({ ...vehiculo, placa: e.target.value })} />
          </div>
          <div>
            <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1 block">Marca / Modelo</label>
            <input className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 mb-4" placeholder="Marca / Modelo" value={vehiculo.marca} onChange={(e) => setVehiculo({ ...vehiculo, marca: e.target.value })} />
          </div>
          <div>
            <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1 block">Capacidad (kg)</label>
            <input className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 mb-6" required type="number" placeholder="Ej. 1000" value={vehiculo.capacidad_kg} onChange={(e) => setVehiculo({ ...vehiculo, capacidad_kg: Number(e.target.value) || 0 })} />
          </div>
          <button disabled={submitting} className="w-full button button--primary py-3">{submitting ? 'Guardando...' : modalState.mode === 'create' ? 'Crear' : 'Guardar cambios'}</button>
        </form>
      )}
    </Modal>

    {/* Confirm Deletion Modal */}
    <Modal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ isOpen: false, type: null, id: null, display: '' })} title="Confirmar eliminación">
      <div className="text-slate-300 mb-6">
        ¿Estás seguro que deseas eliminar <strong>{confirmModal.display}</strong>? Esta acción no se puede deshacer.
      </div>
      <div className="flex gap-4 justify-end">
        <button className="button bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 border-0" onClick={() => setConfirmModal({ isOpen: false, type: null, id: null, display: '' })}>Cancelar</button>
        <button className="button bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50 px-4 py-2" onClick={executeDeletion}>Sí, eliminar</button>
      </div>
    </Modal>
  </div>;
}

function Table({ headers, rows: values }) {
  return <div className="admin-table-wrap"><table className="admin-table w-full text-sm"><thead><tr>{headers.map((header) => <th key={header} className={`text-left text-slate-400 ${header==='Acciones'?'text-right':''}`}>{header}</th>)}</tr></thead><tbody>{values.map((row, index) => <tr key={row[0]?.key ?? row[0] ?? index}>{row.map((value, column) => <td key={column} className={`text-slate-200 ${headers[column]==='Acciones'?'text-right':''}`}>{value || '-'}</td>)}</tr>)}{!values.length && <tr><td colSpan={headers.length} className="py-8 text-slate-400 text-center">Sin registros.</td></tr>}</tbody></table></div>;
}

function TableActions({ onEdit, onDelete }) {
  return (
    <div className="flex gap-3 justify-end text-lg">
      {onEdit && <button onClick={onEdit} className="icon-button table-action" aria-label="Editar" title="Editar"><Pencil size={16} /></button>}
      {onDelete && <button onClick={onDelete} className="icon-button table-action" aria-label="Eliminar" title="Eliminar"><Trash2 size={16} /></button>}
    </div>
  );
}
