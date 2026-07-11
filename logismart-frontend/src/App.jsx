import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';

// Páginas
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AlmacenVisual = lazy(() => import('./pages/AlmacenVisual'));
const NuevaCaja = lazy(() => import('./pages/NuevaCaja'));
const Despachos = lazy(() => import('./pages/Despachos'));
const Administracion = lazy(() => import('./pages/Administracion'));
const Configuracion = lazy(() => import('./pages/Configuracion'));
const Planillas = lazy(() => import('./pages/Planillas'));
const Login = lazy(() => import('./pages/Login'));
const Suscripcion = lazy(() => import('./pages/Suscripcion'));
const PdfViewer = lazy(() => import('./pages/PdfViewer'));
const Stock = lazy(() => import('./pages/Stock'));

function AppContent() {
  const { pathname } = useLocation();
  const isPublic = pathname === '/login/' || pathname === '/login' || pathname.startsWith('/suscripcion') || pathname.startsWith('/ver-pdf-lote');

  return (
      <div className={`app-shell bg-main-bg text-light font-sans min-h-[100dvh] ${isPublic ? 'public-shell' : ''}`}>
        <a href="#contenido-principal" className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:top-3 focus:left-3 bg-slate-900 text-white px-4 py-2 rounded-lg">Saltar al contenido</a>
        {!isPublic && <Navbar />}
        
        <main id="contenido-principal" className="workspace max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
          <Suspense fallback={<div className="spinner" role="status" aria-label="Cargando página" />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/almacen" element={<AlmacenVisual />} />
            <Route path="/stock" element={<Stock />} />
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
          </Suspense>
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
