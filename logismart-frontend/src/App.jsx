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

export default function App() {
  return (
    <BrowserRouter>
      <div className="bg-base text-light font-sans min-h-screen">
        <Navbar />
        
        <main className="max-w-[1440px] mx-auto px-6 py-6 fade-in">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/almacen" element={<AlmacenVisual />} />
            <Route path="/cajas" element={<NuevaCaja />} />
            <Route path="/despachos" element={<Despachos />} />
            <Route path="/administracion" element={<Administracion />} />
            <Route path="/configuracion" element={<Configuracion />} />
            <Route path="/carro" element={<CarroIoT />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
