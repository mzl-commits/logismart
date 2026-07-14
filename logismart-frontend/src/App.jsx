import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ShieldAlert } from 'lucide-react';
import Navbar from './components/Navbar';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { EmptyState } from './components/ui';

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
const NotFound = lazy(() => import('./pages/NotFound'));

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="spinner" role="status" aria-label="Validando sesión" />;
  if (!isAdmin) {
    return <div className="p-8 mt-10"><EmptyState title="Acceso Denegado" description="No tienes permisos para ver esta página." icon={ShieldAlert} /></div>;
  }
  return children;
}

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
            <Route path="/nueva-caja" element={<AdminRoute><NuevaCaja /></AdminRoute>} />
            <Route path="/cajas" element={<AdminRoute><NuevaCaja /></AdminRoute>} />
            <Route path="/despachos" element={<Despachos />} />
            <Route path="/administracion" element={<AdminRoute><Administracion /></AdminRoute>} />
            <Route path="/configuracion" element={<AdminRoute><Configuracion /></AdminRoute>} />
            <Route path="/planillas" element={<Planillas />} />
            <Route path="/login" element={<Login />} />
            <Route path="/suscripcion" element={<Suscripcion />} />
            <Route path="/ver-pdf-lote" element={<PdfViewer />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </main>
      </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--color-surface)',
              color: 'var(--color-light)',
              border: '1px solid var(--color-border)'
            }
          }}
        />
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
