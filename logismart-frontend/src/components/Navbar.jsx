import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Boxes, ChevronDown, ClipboardList, Gauge, LogOut, Menu,
  CreditCard, Moon, PackagePlus, PackageSearch, Search, Settings, ShieldCheck, Sun,
  Truck, User, Warehouse, X
} from 'lucide-react';
import { getCajas, getCurrentUser } from '../api/endpoints';

const primaryLinks = [
  { to: '/', label: 'Control', icon: Gauge, end: true },
  { to: '/almacen', label: 'Almacén', icon: Warehouse },
  { to: '/stock', label: 'Stock', icon: PackageSearch },
  { to: '/despachos', label: 'Despachos', icon: Truck },
  { to: '/planillas', label: 'Planillas', icon: ClipboardList },
];

const linkClass = ({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`;

export default function Navbar() {
  const [pending, setPending] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const adminRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    getCurrentUser().then(({ data }) => {
      if (data?.is_authenticated) setUser(data);
      else window.location.href = `/login/?next=${encodeURIComponent(window.location.pathname)}`;
    }).catch(() => { window.location.href = `/login/?next=${encodeURIComponent(window.location.pathname)}`; });

    getCajas().then(({ data }) => {
      const rows = data?.results ?? data ?? [];
      setPending(rows.filter((item) => item.estado === 'pendiente').length);
    }).catch(() => setPending(0));

    const closeAdmin = (event) => {
      if (adminRef.current && !adminRef.current.contains(event.target)) setAdminOpen(false);
    };
    document.addEventListener('pointerdown', closeAdmin);
    return () => document.removeEventListener('pointerdown', closeAdmin);
  }, []);

  const closeMenus = () => { setMobileOpen(false); setAdminOpen(false); };

  return (
    <header className="command-bar">
      <div className="command-bar__inner">
        <NavLink to="/" className="brand" onClick={closeMenus} aria-label="Ir al panel principal">
          <span className="brand__mark"><Boxes size={21} strokeWidth={1.8} /></span>
          <span><strong>LogiSmart</strong><small>Control de almacén</small></span>
        </NavLink>

        <nav className="primary-nav" aria-label="Navegación principal">
          {primaryLinks.map(({ icon: Icon, ...link }) => (
            <NavLink key={link.to} {...link} className={linkClass}>
              <Icon size={16} strokeWidth={1.8} /><span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="command-actions">
          <label className="command-search">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Buscar caja</span>
            <input type="search" placeholder="Buscar caja" />
          </label>

          <div className="operation-status" title={`${pending} cajas pendientes`}>
            <span className="operation-status__dot" />
            <span>{pending} pendientes</span>
          </div>

          {user?.is_superuser && (
            <NavLink to="/nueva-caja" className="button button--primary command-new">
              <PackagePlus size={17} /><span>Nueva caja</span>
            </NavLink>
          )}

          <NavLink to="/suscripcion" className={({ isActive }) => `account-nav-link ${isActive ? 'is-active' : ''}`}>
            <CreditCard size={17} /><span>Suscripción</span>
          </NavLink>

          <a href="/api/docs/" className="account-nav-link" target="_blank" rel="noopener noreferrer">
            <span style={{fontWeight: 600, fontSize: '0.85rem'}}>API Docs</span>
          </a>

          {user?.is_superuser && (
            <div className="admin-menu" ref={adminRef}>
              <button className="icon-button" onClick={() => setAdminOpen((open) => !open)} aria-expanded={adminOpen} aria-label="Administración">
                <ShieldCheck size={18} /><ChevronDown size={13} />
              </button>
              {adminOpen && <div className="admin-popover">
                <NavLink to="/administracion" onClick={closeMenus}><User size={16} />Administración</NavLink>
                <NavLink to="/configuracion" onClick={closeMenus}><Settings size={16} />Configuración</NavLink>
              </div>}
            </div>
          )}

          <button className="icon-button" onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro'}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user && <a href="/logout/" className="user-chip" title="Cerrar sesión">
            <span>{user.username?.slice(0, 2).toUpperCase()}</span><LogOut size={15} />
          </a>}

          <button className="icon-button mobile-toggle" onClick={() => setMobileOpen((open) => !open)} aria-expanded={mobileOpen} aria-label="Abrir menú">
            {mobileOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      {mobileOpen && <nav className="mobile-nav" aria-label="Navegación móvil">
        {primaryLinks.map(({ icon: Icon, ...link }) => <NavLink key={link.to} {...link} className={linkClass} onClick={closeMenus}><Icon size={18} />{link.label}</NavLink>)}
        {user?.is_superuser && <>
          <NavLink to="/nueva-caja" className={linkClass} onClick={closeMenus}><PackagePlus size={18} />Nueva caja</NavLink>
          <NavLink to="/suscripcion" className={linkClass} onClick={closeMenus}><CreditCard size={18} />Suscripción</NavLink>
          <a href="/api/docs/" className="nav-link" target="_blank" rel="noopener noreferrer" onClick={closeMenus}>API Docs</a>
          <NavLink to="/administracion" className={linkClass} onClick={closeMenus}><ShieldCheck size={18} />Administración</NavLink>
          <NavLink to="/configuracion" className={linkClass} onClick={closeMenus}><Settings size={18} />Configuración</NavLink>
        </>}
      </nav>}
    </header>
  );
}
