import { useState } from 'react';
import { getLocalAiConfig, saveLocalAiConfig, testLocalAi } from '../services/localAi';

export default function LocalAiSettings() {
  const [config, setConfig] = useState(getLocalAiConfig);
  const [status, setStatus] = useState({ type: 'idle', message: 'Sin comprobar' });
  const [models, setModels] = useState([]);

  const test = async () => {
    setStatus({ type: 'loading', message: 'Comprobando Ollama…' });
    try {
      const result = await testLocalAi(config);
      setModels(result.models);
      setStatus({
        type: result.modelAvailable ? 'ok' : 'warning',
        message: result.modelAvailable ? 'Ollama y el modelo están listos' : 'Ollama está activo, pero falta descargar el modelo',
      });
    } catch {
      setStatus({ type: 'error', message: 'No se detectó Ollama en este equipo' });
    }
  };

  const save = () => {
    saveLocalAiConfig(config);
    setStatus(prev => ({ ...prev, message: 'Configuración local guardada' }));
  };

  const statusColor = status.type === 'ok' ? 'text-emerald-400' : status.type === 'error' ? 'text-red-400' : status.type === 'warning' ? 'text-amber-400' : 'text-slate-400';

  return (
    <div className="bg-surface border border-slate-800/60 rounded-2xl shadow-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800/60 bg-slate-900/30 flex items-center justify-between">
        <div>
          <div className="font-semibold text-white flex items-center gap-2"><i className="bi bi-stars text-violet-400"></i> IA local para documentos</div>
          <div className="text-xs text-slate-500 mt-1">La inferencia ocurre en este PC; el servidor no ejecuta el modelo.</div>
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={config.enabled} onChange={e => setConfig(prev => ({ ...prev, enabled: e.target.checked }))} className="accent-violet-500 w-4 h-4" />
          <span className="text-sm text-slate-300">Activar</span>
        </label>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <label className="text-xs text-slate-400">Dirección de Ollama
            <input value={config.endpoint} onChange={e => setConfig(prev => ({ ...prev, endpoint: e.target.value }))} className="mt-2 w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white" />
          </label>
          <label className="text-xs text-slate-400">Modelo
            <input list="ollama-models" value={config.model} onChange={e => setConfig(prev => ({ ...prev, model: e.target.value }))} className="mt-2 w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white" />
            <datalist id="ollama-models">{models.map(model => <option value={model} key={model} />)}</datalist>
          </label>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-sm text-slate-400">
          Instala Ollama y ejecuta <code className="text-violet-300">ollama pull gemma3:1b</code>. Autoriza este portal mediante <code className="text-violet-300">OLLAMA_ORIGINS=https://logistica.promube.com</code>.
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={test} disabled={status.type === 'loading'} className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm">Probar conexión</button>
          <button type="button" onClick={save} className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold">Guardar IA local</button>
          <span className={`text-xs ${statusColor}`}>● {status.message}</span>
        </div>
      </div>
    </div>
  );
}
