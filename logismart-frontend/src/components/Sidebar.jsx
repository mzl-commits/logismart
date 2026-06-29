import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Truck, Settings,
  Users, Warehouse, Radio, ChevronRight
} from 'lucide-react';

const navItems = [
  { section: 'Principal' },
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/almacen',      icon: Warehouse,       label: 'Almacén Visual' },

  { section: 'Operaciones' },
  { to: '/cajas',        icon: Package,         label: 'Nueva Caja' },
  { to: '/despachos',    icon: Truck,           label: 'Despachos' },
  { to: '/planillas',     icon: Package,         label: 'Planillas' },

  { section: 'Sistema' },
  { to: '/administracion', icon: Users,         label: 'Administración' },
  { to: '/configuracion',  icon: Settings,      label: 'Configuración' },
  { to: '/carro',          icon: Radio,         label: 'Carro IoT' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-text">⬡ LogiSmart</div>
        <div className="logo-sub">Sistema de Gestión Logística</div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, i) => {
          if (item.section) {
            return <div key={i} className="nav-label">{item.section}</div>;
          }
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={16} className="nav-icon" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="flex items-center gap-2 text-sm text-muted">
          <span className="status-dot" />
          API conectada
        </div>
      </div>
    </aside>
  );
}
