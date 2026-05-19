import { NavLink } from 'react-router-dom';
import { Package, Search, Terminal, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCajas } from '../api/endpoints';

export default function Navbar() {
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    // Simular el badge de cajas pendientes
    getCajas()
      .then(res => {
        const data = res.data.results ?? res.data;
        setPendientes(data.filter(c => c.estado === 'pendiente').length);
      })
      .catch(console.error);
  }, []);

  return (
    <nav className="sticky top-0 z-50 h-[68px] bg-gradient-to-r from-[#0D1F23] via-[#132E35] to-[#0D1F23] border-b border-[#2D4A53]/60 backdrop-blur-xl px-6 flex items-center justify-between">
      <NavLink to="/" className="flex items-center gap-3 group no-underline">
        <div className="w-10 h-10 bg-gradient-to-br from-[#2D4A53] to-[#69818D] rounded-xl flex items-center justify-center text-white text-xl shadow-lg shadow-[#69818D]/20 group-hover:shadow-[#69818D]/40 transition-shadow">
          📦
        </div>
        <span className="text-xl font-bold bg-gradient-to-r from-[#AFB3B7] to-[#69818D] bg-clip-text text-transparent">
          LogiSmart
        </span>
      </NavLink>

      <div className="hidden md:flex items-center gap-1">
        <NavLink to="/" className={({ isActive }) => `px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 no-underline transition-colors ${isActive ? 'text-[#AFB3B7] bg-[#2D4A53]/40' : 'text-[#69818D] hover:text-[#AFB3B7] hover:bg-[#2D4A53]/20'}`}>
          <i className="bi bi-speedometer2"></i> Dashboard
        </NavLink>
        <NavLink to="/almacen" className={({ isActive }) => `px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 no-underline transition-colors ${isActive ? 'text-[#AFB3B7] bg-[#2D4A53]/40' : 'text-[#69818D] hover:text-[#AFB3B7] hover:bg-[#2D4A53]/20'}`}>
          <i className="bi bi-grid-3x3-gap"></i> Almacén
        </NavLink>
        <NavLink to="/despachos" className={({ isActive }) => `px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 no-underline transition-colors ${isActive ? 'text-[#AFB3B7] bg-[#2D4A53]/40' : 'text-[#69818D] hover:text-[#AFB3B7] hover:bg-[#2D4A53]/20'}`}>
          <i className="bi bi-truck"></i> Despachos
        </NavLink>
        <NavLink to="/configuracion" className={({ isActive }) => `px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 no-underline transition-colors ${isActive ? 'text-[#AFB3B7] bg-[#2D4A53]/40' : 'text-[#69818D] hover:text-[#AFB3B7] hover:bg-[#2D4A53]/20'}`}>
          <i className="bi bi-robot"></i> Robot AGV
        </NavLink>
        <NavLink to="/administracion" className={({ isActive }) => `px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 no-underline transition-colors ${isActive ? 'text-[#AFB3B7] bg-[#2D4A53]/40' : 'text-[#69818D] hover:text-[#AFB3B7] hover:bg-[#2D4A53]/20'}`}>
          <i className="bi bi-people"></i> Administración
        </NavLink>
      </div>

      <div className="flex items-center gap-4">
        {/* Search placeholder */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A636A] pointer-events-none" />
          <input type="text" placeholder="Buscar caja..." 
                 className="bg-[#2D4A53]/40 border border-[#2D4A53]/60 rounded-lg text-sm pl-9 pr-4 py-2 w-48 focus:w-64 transition-all focus:outline-none focus:ring-2 focus:ring-[#69818D]/30 focus:border-[#69818D]/60 text-[#AFB3B7] placeholder-[#5A636A]" />
        </div>

        <a href="http://localhost:8000/api/docs/" target="_blank" rel="noreferrer" className="text-[#5A636A] hover:text-[#AFB3B7] text-sm no-underline flex items-center gap-1 transition-colors">
          <Terminal size={14} /> API
        </a>

        <div className="flex items-center gap-2 text-sm text-[#5A636A]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 live-dot inline-block"></span>
          <span>{pendientes > 0 ? pendientes : '—'} pendientes</span>
          {pendientes > 0 && (
            <span className="bg-amber-500 text-[#0D1F23] text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
              {pendientes}
            </span>
          )}
        </div>

        <NavLink to="/cajas" className="bg-gradient-to-r from-[#2D4A53] to-[#69818D] hover:from-[#69818D] hover:to-[#2D4A53] text-[#AFB3B7] hover:text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-[#69818D]/20 hover:shadow-[#69818D]/30 transition-all hover:-translate-y-0.5 no-underline">
          <Plus size={16} /> Nueva Caja
        </NavLink>
      </div>
    </nav>
  );
}
