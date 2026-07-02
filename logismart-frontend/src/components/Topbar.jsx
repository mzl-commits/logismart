import { useLocation } from 'react-router-dom';
import { Bell, RefreshCw } from 'lucide-react';

const titles = {
  '/':              'Dashboard',
  '/almacen':       'Almacén Visual',
  '/cajas':         'Registro de Cajas',
  '/despachos':     'Despachos',
  '/administracion':'Administración',
  '/configuracion': 'Configuración del Carro',
};

export default function Topbar({ onRefresh }) {
  const { pathname } = useLocation();
  const title = titles[pathname] ?? 'LogiSmart';

  return (
    <header className="topbar">
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-right">
        <button className="btn btn-outline btn-sm" onClick={onRefresh} title="Refrescar">
          <RefreshCw size={14} />
          Refrescar
        </button>
        <button className="btn btn-outline btn-sm" title="Notificaciones">
          <Bell size={14} />
        </button>
      </div>
    </header>
  );
}
