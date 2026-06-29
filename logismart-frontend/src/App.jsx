import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';

// Páginas
import Dashboard from './pages/Dashboard';
import AlmacenVisual from './pages/AlmacenVisual';
import NuevaCaja from './pages/NuevaCaja';
import Despachos from './pages/Despachos';
import Administracion from './pages/Administracion';
import Configuracion from './pages/Configuracion';
import CarroIoT from './pages/CarroIoT';
import Planillas from './pages/Planillas';

export default function App() {
  return (
    <BrowserRouter>
      <div className="bg-main-bg text-light font-sans min-h-screen">
        <a href="#contenido-principal" className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:top-3 focus:left-3 bg-slate-900 text-white px-4 py-2 rounded-lg">Saltar al contenido</a>
        <Navbar />
        
        <main id="contenido-principal" className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 sm:py-6 fade-in">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/almacen" element={<AlmacenVisual />} />
            <Route path="/cajas" element={<NuevaCaja />} />
            <Route path="/despachos" element={<Despachos />} />
            <Route path="/administracion" element={<Administracion />} />
            <Route path="/configuracion" element={<Configuracion />} />
            <Route path="/carro" element={<CarroIoT />} />
            <Route path="/planillas" element={<Planillas />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
