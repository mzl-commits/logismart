import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';

// Páginas
import Dashboard from './pages/Dashboard';
import AlmacenVisual from './pages/AlmacenVisual';
import NuevaCaja from './pages/NuevaCaja';
import Despachos from './pages/Despachos';
import Administracion from './pages/Administracion';
import Configuracion from './pages/Configuracion';
import Planillas from './pages/Planillas';
import Login from './pages/Login';
import Suscripcion from './pages/Suscripcion';
import PdfViewer from './pages/PdfViewer';

function AppContent() {
  const { pathname } = useLocation();
  const isPublic = pathname === '/login/' || pathname === '/login' || pathname.startsWith('/suscripcion') || pathname.startsWith('/ver-pdf-lote');

  return (
      <div className={`app-shell bg-main-bg text-light font-sans min-h-[100dvh] ${isPublic ? 'public-shell' : ''}`}>
        <a href="#contenido-principal" className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:top-3 focus:left-3 bg-slate-900 text-white px-4 py-2 rounded-lg">Saltar al contenido</a>
        {!isPublic && <Navbar />}
        
        <main id="contenido-principal" className="workspace max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/almacen" element={<AlmacenVisual />} />
            <Route path="/nueva-caja" element={<NuevaCaja />} />
            <Route path="/cajas" element={<NuevaCaja />} />
            <Route path="/despachos" element={<Despachos />} />
            <Route path="/administracion" element={<Administracion />} />
            <Route path="/configuracion" element={<Configuracion />} />
            <Route path="/planillas" element={<Planillas />} />
            <Route path="/login" element={<Login />} />
            <Route path="/suscripcion" element={<Suscripcion />} />
            <Route path="/ver-pdf-lote" element={<PdfViewer />} />
          </Routes>
        </main>
      </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
