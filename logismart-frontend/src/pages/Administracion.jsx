import { useCallback, useEffect, useState } from 'react';
import {
  createDestino, createProveedor, createVehiculo,
  getDestinos, getProveedores, getUsuarios, getVehiculos,
} from '../api/endpoints';

const rows = (response) => response.data?.results ?? response.data ?? [];

export default function Administracion() {
  const [data, setData] = useState({ usuarios: [], proveedores: [], destinos: [], vehiculos: [] });
  const [loading, setLoading] = useState(true);
  const [proveedor, setProveedor] = useState({ nombre_empresa: '', contacto: '' });
  const [destino, setDestino] = useState({ nombre: '', direccion: '' });
  const [vehiculo, setVehiculo] = useState({ placa: '', marca: '', capacidad_kg: 1000 });

  const load = useCallback(async () => {
    setLoading(true);
    const [usuarios, proveedores, destinos, vehiculos] = await Promise.allSettled([
      getUsuarios(), getProveedores(), getDestinos(), getVehiculos(),
    ]);
    setData({
      usuarios: usuarios.status === 'fulfilled' ? rows(usuarios.value) : [],
      proveedores: proveedores.status === 'fulfilled' ? rows(proveedores.value) : [],
      destinos: destinos.status === 'fulfilled' ? rows(destinos.value) : [],
      vehiculos: vehiculos.status === 'fulfilled' ? rows(vehiculos.value) : [],
    });
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submitProveedor = async (event) => {
    event.preventDefault();
    await createProveedor(proveedor);
    setProveedor({ nombre_empresa: '', contacto: '' });
    await load();
  };
  const submitDestino = async (event) => {
    event.preventDefault();
    await createDestino(destino);
    setDestino({ nombre: '', direccion: '' });
    await load();
  };
  const submitVehiculo = async (event) => {
    event.preventDefault();
    await createVehiculo({ ...vehiculo, placa: vehiculo.placa.toUpperCase() });
    setVehiculo({ placa: '', marca: '', capacidad_kg: 1000 });
    await load();
  };

  return <div className="page-stack">
    <header className="page-header"><div><h1>Administracion</h1><p>Usuarios, proveedores, destinos y vehículos operativos.</p></div><button className="button" onClick={load} aria-label="Actualizar"><i className="bi bi-arrow-clockwise" /></button></header>
    {loading ? <p>Cargando administracion...</p> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section className="bg-surface border border-surface2 rounded-lg p-5"><h2 className="text-base font-semibold text-light mb-3">Usuarios</h2><Table headers={['Nombre', 'Rol']} rows={data.usuarios.map((user) => [user.nombre, user.rol])} /></section>
      <section className="bg-surface border border-surface2 rounded-lg p-5"><h2 className="text-base font-semibold text-light mb-3">Vehículos</h2><Table headers={['Placa', 'Marca', 'Capacidad']} rows={data.vehiculos.map((item) => [item.placa, item.marca, `${item.capacidad_kg} kg`])} /><form className="form-stack mt-4" onSubmit={submitVehiculo}><input required placeholder="Placa (ej. ABC-123)" value={vehiculo.placa} onChange={(event) => setVehiculo({ ...vehiculo, placa: event.target.value })} /><input placeholder="Marca / Modelo" value={vehiculo.marca} onChange={(event) => setVehiculo({ ...vehiculo, marca: event.target.value })} /><input required type="number" placeholder="Capacidad (kg)" value={vehiculo.capacidad_kg} onChange={(event) => setVehiculo({ ...vehiculo, capacidad_kg: Number(event.target.value) || 0 })} /><button className="button button--primary">Agregar vehículo</button></form></section>
      <section className="bg-surface border border-surface2 rounded-lg p-5"><h2 className="text-base font-semibold text-light mb-3">Proveedores</h2><Table headers={['Empresa', 'Contacto']} rows={data.proveedores.map((item) => [item.nombre_empresa, item.contacto])} /><form className="form-stack mt-4" onSubmit={submitProveedor}><input required placeholder="Empresa" value={proveedor.nombre_empresa} onChange={(event) => setProveedor({ ...proveedor, nombre_empresa: event.target.value })} /><input required placeholder="Contacto" value={proveedor.contacto} onChange={(event) => setProveedor({ ...proveedor, contacto: event.target.value })} /><button className="button button--primary">Agregar proveedor</button></form></section>
      <section className="bg-surface border border-surface2 rounded-lg p-5"><h2 className="text-base font-semibold text-light mb-3">Destinos</h2><Table headers={['Nombre', 'Direccion']} rows={data.destinos.map((item) => [item.nombre, item.direccion])} /><form className="form-stack mt-4" onSubmit={submitDestino}><input required placeholder="Destino" value={destino.nombre} onChange={(event) => setDestino({ ...destino, nombre: event.target.value })} /><input placeholder="Direccion" value={destino.direccion} onChange={(event) => setDestino({ ...destino, direccion: event.target.value })} /><button className="button button--primary">Agregar destino</button></form></section>
    </div>}
  </div>;
}

function Table({ headers, rows: values }) {
  return <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{headers.map((header) => <th key={header} className="text-left text-slate-400 pb-2">{header}</th>)}</tr></thead><tbody>{values.map((row, index) => <tr key={index} className="border-t border-surface2">{row.map((value, column) => <td key={column} className="py-2 text-slate-200">{value || '-'}</td>)}</tr>)}{!values.length && <tr><td colSpan={headers.length} className="py-3 text-slate-400">Sin registros.</td></tr>}</tbody></table></div>;
}
