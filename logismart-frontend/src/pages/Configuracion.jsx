import { useCallback, useEffect, useState } from 'react';
import { getMedidas } from '../api/endpoints';
import LocalAiSettings from '../components/LocalAiSettings';

export default function Configuracion() {
  const [medidas, setMedidas] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarMedidas = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getMedidas();
      setMedidas(response.data.results ?? response.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarMedidas(); }, [cargarMedidas]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-light">Configuración</h1>
          <p className="text-sm text-slate-400">Parámetros de inventario y asistencia local.</p>
        </div>
        <button onClick={cargarMedidas} className="button" aria-label="Actualizar medidas">
          <i className="bi bi-arrow-clockwise" />
        </button>
      </header>

      <section className="bg-surface border border-surface2 rounded-lg p-5">
        <h2 className="text-base font-semibold text-light mb-4">Medidas registradas</h2>
        {loading ? <p className="text-sm text-slate-400">Cargando...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-slate-400 border-b border-surface2"><tr><th className="pb-2">Nombre</th><th className="pb-2">Largo</th><th className="pb-2">Ancho</th><th className="pb-2">Alto</th><th className="pb-2">Volumen</th></tr></thead>
              <tbody>{medidas.map((medida) => <tr key={medida.id_medida} className="border-b border-surface2/60 text-slate-200"><td className="py-3">{medida.nombre}</td><td>{medida.largo}</td><td>{medida.ancho}</td><td>{medida.alto}</td><td>{medida.volumen}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
      <LocalAiSettings />
    </div>
  );
}
