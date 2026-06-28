import { NavLink } from 'react-router-dom';
import { Package, Search, Terminal, Plus, Menu, X, ShieldAlert, Star, ChevronDown, User, LogOut, Sun, Moon } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { getCajas, getCurrentUser } from '../api/endpoints';

export default function Navbar() {
  const [pendientes, setPendientes] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [user, setUser] = useState(null);
  const dropdownRef = useRef(null);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    // Obtener información del usuario logueado en la sesión
    getCurrentUser()
      .then(res => {
        if (res.data && res.data.is_authenticated) {
          setUser(res.data);
        } else {
          window.location.href = '/login/?next=' + encodeURIComponent(window.location.pathname);
        }
      })
      .catch(() => {
        window.location.href = '/login/?next=' + encodeURIComponent(window.location.pathname);
      });

    // Simular el badge de cajas pendientes
    getCajas()
      .then(res => {
        const data = res.data.results ?? res.data;
        setPendientes(data.filter(c => c.estado === 'pendiente').length);
      })
      .catch(console.error);

    // Event listener para cerrar el dropdown de Admin al hacer clic afuera
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setAdminOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const closeMenu = () => {
    setMobileMenuOpen(false);
    setAdminOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 h-[68px] bg-gradient-to-r from-main-bg via-surface to-main-bg border-b border-surface2/60 backdrop-blur-xl px-4 md:px-6 flex items-center justify-between gap-4">
      {/* Brand logo */}
      <NavLink to="/" className="flex items-center gap-3 group no-underline shrink-0" onClick={closeMenu}>
        <img 
          src="/logo.png?v=3" 
          alt="LogiSmart" 
          className="h-11 md:h-[52px] object-contain transition-transform group-hover:scale-[1.01] dark:invert-0 invert" 
        />
      </NavLink>

      {/* Desktop Navigation Links */}
      <div className="hidden lg:flex items-center gap-1">
        <NavLink to="/" className={({ isActive }) => `px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 no-underline transition-colors ${isActive ? 'text-light bg-surface2/45' : 'text-muted hover:text-light hover:bg-surface2/20'}`}>
          <i className="bi bi-speedometer2"></i> Dashboard
        </NavLink>
        <NavLink to="/almacen" className={({ isActive }) => `px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 no-underline transition-colors ${isActive ? 'text-light bg-surface2/45' : 'text-muted hover:text-light hover:bg-surface2/20'}`}>
          <i className="bi bi-grid-3x3-gap"></i> Almacén
        </NavLink>
        <NavLink to="/despachos" className={({ isActive }) => `px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 no-underline transition-colors ${isActive ? 'text-light bg-surface2/45' : 'text-muted hover:text-light hover:bg-surface2/20'}`}>
          <i className="bi bi-truck"></i> Despachos
        </NavLink>

        {/* Admin dropdown - solo superusuarios */}
        {user?.is_superuser && (
          <div className="relative admin-dropdown-wrap" ref={dropdownRef}>
            <button 
              onClick={() => setAdminOpen(!adminOpen)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors text-muted hover:text-light hover:bg-surface2/20 focus:outline-none`}
            >
              <i className="bi bi-shield-lock"></i> Admin <ChevronDown size={12} className={`transition-transform duration-200 ${adminOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {adminOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-surface border border-surface2/80 rounded-xl shadow-2xl py-1.5 z-50">
                <NavLink 
                  to="/configuracion" 
                  onClick={closeMenu}
                  className={({ isActive }) => `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors no-underline ${isActive ? 'text-white bg-surface2/45' : 'text-muted hover:text-white hover:bg-surface2/30'}`}
                >
                  <i className="bi bi-robot"></i> Robot AGV
                </NavLink>
                <NavLink 
                  to="/administracion" 
                  onClick={closeMenu}
                  className={({ isActive }) => `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors no-underline ${isActive ? 'text-white bg-surface2/45' : 'text-muted hover:text-white hover:bg-surface2/30'}`}
                >
                  <i className="bi bi-people"></i> Administración
                </NavLink>
                <div className="h-px bg-surface2/60 mx-3 my-1"></div>
                <a 
                  href="/api/docs/" 
                  target="_blank" 
                  rel="noreferrer"
                  onClick={closeMenu}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted hover:text-white hover:bg-surface2/30 transition-colors no-underline"
                >
                  <i className="bi bi-terminal"></i> Docs API
                </a>
              </div>
            )}
          </div>
        )}

        {/* Suscripción */}
        <a 
          href="/suscripcion/" 
          className="ml-1 px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 no-underline transition-all text-amber-500/70 hover:text-amber-300 hover:bg-amber-500/10"
        >
          <i className="bi bi-stars"></i> Suscripción
        </a>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-3 md:gap-4 shrink-0">
        {/* Search input - hidden on mobile/tablet */}
        <div className="relative hidden xl:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/70 pointer-events-none" />
          <input 
            type="text" 
            placeholder="Buscar caja..." 
            className="bg-surface2/40 border border-surface2/60 rounded-lg text-sm pl-9 pr-4 py-2 w-40 focus:w-56 transition-all focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/60 text-light placeholder-muted/60" 
          />
        </div>

        {/* Pendientes Badge */}
        <div className="flex items-center gap-2 text-sm text-muted">
          <span className="w-2 h-2 rounded-full bg-emerald-500 live-dot inline-block"></span>
          <span className="hidden md:inline">{pendientes > 0 ? pendientes : '—'} pendientes</span>
          {pendientes > 0 && (
            <span className="bg-amber-500 text-main-bg text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
              {pendientes}
            </span>
          )}
        </div>

        {/* User profile chip con botón Logout */}
        {user && (
          <div className="hidden sm:flex items-center gap-2 text-xs bg-surface2/35 border border-surface2/60 px-3 py-1.5 rounded-xl text-light">
            <User size={13} className="text-muted" />
            <span className="font-semibold">{user.username}</span>
            <span className="text-[9px] text-light bg-main-bg/60 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
              {user.is_superuser ? 'Admin' : 'Ctrl'}
            </span>
            <a 
              href="/logout/" 
              className="text-muted hover:text-red-400 ml-1 transition-colors flex items-center justify-center" 
              title="Cerrar sesión"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/logout/';
              }}
            >
              <LogOut size={13} />
            </a>
          </div>
        )}

        {/* Nueva Caja Button - solo superusuarios */}
        {user?.is_superuser && (
          <NavLink to="/cajas" className="bg-gradient-to-r from-surface2 to-accent hover:from-accent hover:to-surface2 text-light hover:text-white text-sm font-semibold px-3 py-1.5 md:px-4 md:py-2 rounded-lg flex items-center gap-1.5 md:gap-2 shadow-lg shadow-accent/20 hover:shadow-accent/30 transition-all hover:-translate-y-0.5 no-underline">
            <Plus size={16} />
            <span className="hidden sm:inline">Nueva Caja</span>
          </NavLink>
        )}

        {/* Theme Switcher Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="text-muted hover:text-light p-2 rounded-lg hover:bg-surface2/25 transition-colors focus:outline-none"
          title={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Hamburger toggle button - visible below lg */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          className="lg:hidden text-muted hover:text-light p-1.5 rounded-lg hover:bg-surface2/20 focus:outline-none transition-colors"
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-[68px] left-0 right-0 bg-main-bg border-b border-surface2/60 shadow-2xl flex flex-col p-4 gap-1.5 lg:hidden animate-slide-down z-50">
          {/* Mobile search bar */}
          <div className="relative mb-2 xl:hidden">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/70 pointer-events-none" />
            <input 
              type="text" 
              placeholder="Buscar caja..." 
              className="bg-surface2/40 border border-surface2/60 rounded-lg text-sm pl-9 pr-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/60 text-light placeholder-muted/60" 
            />
          </div>

          <NavLink to="/" className={({ isActive }) => `px-4 py-2.5 rounded-lg text-base font-medium flex items-center gap-3 no-underline transition-colors ${isActive ? 'text-light bg-surface2/40' : 'text-muted hover:text-light hover:bg-surface2/20'}`} onClick={closeMenu}>
            <i className="bi bi-speedometer2"></i> Dashboard
          </NavLink>
          <NavLink to="/almacen" className={({ isActive }) => `px-4 py-2.5 rounded-lg text-base font-medium flex items-center gap-3 no-underline transition-colors ${isActive ? 'text-light bg-surface2/40' : 'text-muted hover:text-light hover:bg-surface2/20'}`} onClick={closeMenu}>
            <i className="bi bi-grid-3x3-gap"></i> Almacén
          </NavLink>
          <NavLink to="/despachos" className={({ isActive }) => `px-4 py-2.5 rounded-lg text-base font-medium flex items-center gap-3 no-underline transition-colors ${isActive ? 'text-light bg-surface2/40' : 'text-muted hover:text-light hover:bg-surface2/20'}`} onClick={closeMenu}>
            <i className="bi bi-truck"></i> Despachos
          </NavLink>

          {/* Menú móvil admin - solo superusuarios */}
          {user?.is_superuser && (
            <>
              <hr className="border-surface2/30 my-2" />
              <div className="text-[10px] font-bold text-slate-500 px-4 uppercase tracking-wider mb-1">Administración</div>
              <NavLink to="/configuracion" className={({ isActive }) => `px-4 py-2.5 rounded-lg text-base font-medium flex items-center gap-3 no-underline transition-colors ${isActive ? 'text-light bg-surface2/40' : 'text-muted hover:text-light hover:bg-surface2/20'}`} onClick={closeMenu}>
                <i className="bi bi-robot"></i> Robot AGV
              </NavLink>
              <NavLink to="/administracion" className={({ isActive }) => `px-4 py-2.5 rounded-lg text-base font-medium flex items-center gap-3 no-underline transition-colors ${isActive ? 'text-light bg-surface2/40' : 'text-muted hover:text-light hover:bg-surface2/20'}`} onClick={closeMenu}>
                <i className="bi bi-people"></i> Administración
              </NavLink>
              <a href="/api/docs/" target="_blank" rel="noreferrer" className="text-muted hover:text-light text-base no-underline flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-surface2/10 transition-colors" onClick={closeMenu}>
                <i className="bi bi-terminal"></i> Docs API
              </a>
            </>
          )}

          <hr className="border-surface2/30 my-2" />
          
          <a href="/suscripcion/" className="px-4 py-2.5 rounded-lg text-base font-medium flex items-center gap-3 no-underline transition-all text-amber-500 hover:bg-amber-500/10" onClick={closeMenu}>
            <i className="bi bi-stars"></i> Suscripción
          </a>
        </div>
      )}
    </nav>
  );
}
