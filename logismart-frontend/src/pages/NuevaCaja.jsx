import { useEffect, useState, useCallback } from 'react';
import { getCajas, getProveedores, getMedidas, getUsuarios, getCategorias, crearCaja, sugerirId, procesarLote, previsualizarLote, getUbicaciones } from '../api/endpoints';

export default function NuevaCaja() {
  const [cajas, setCajas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [medidas, setMedidas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const [form, setForm] = useState({
    id: '', producto: '', categoria: '', prioridad: 'media', 
    peso: '', cantidad: 1, fragil: false, proveedor: '', medida: ''
  });

  const [loadingForm, setLoadingForm] = useState(false);
  const [loadingEnvio, setLoadingEnvio] = useState(false);
  const [usuarioEnvio, setUsuarioEnvio] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [asignaciones, setAsignaciones] = useState({});
  const [loadingConfirmar, setLoadingConfirmar] = useState(false);
  const [allUbicaciones, setAllUbicaciones] = useState([]);
  const [selectedBoxId, setSelectedBoxId] = useState('');
  const [activePasillo, setActivePasillo] = useState('A');

  const load = useCallback(async () => {
    try {
      const [rc, rp, rm, ru, rcat, rsug, rubi] = await Promise.all([
        getCajas(), getProveedores(), getMedidas(), getUsuarios(), getCategorias(), sugerirId(), getUbicaciones()
      ]);
      const getData = res => res.data?.results ?? res.data ?? [];
      
      const allCajas = getData(rc);
      setCajas(allCajas.filter(c => c.estado === 'pendiente'));
      setProveedores(getData(rp));
      setMedidas(getData(rm));
      setUsuarios(getData(ru));
      setAllUbicaciones(getData(rubi));
      
      const cats = getData(rcat);
      setCategorias(cats);

      setForm(f => {
        const nextForm = { ...f };
        if (rsug.data?.id_sugerido) {
          nextForm.id = rsug.data.id_sugerido;
        }
        if (!nextForm.categoria) {
          nextForm.categoria = cats.length ? cats[0].slug : 'electronica';
        }
        return nextForm;
      });
    } catch(e) {
      console.error(e);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.id || !form.producto || !form.categoria || !form.prioridad || !form.peso || !form.proveedor || !form.medida) {
      alert("Por favor completa todos los campos.");
      return;
    }

    setLoadingForm(true);
    try {
      await crearCaja({
        id: form.id,
        producto: form.producto,
        categoria: form.categoria,
        prioridad: form.prioridad,
        peso_kg: parseFloat(form.peso),
        cantidad: parseInt(form.cantidad),
        es_fragil: form.fragil,
        id_medida: parseInt(form.medida),
        id_proveedor: parseInt(form.proveedor)
      });
      setForm({
        id: '', producto: '', categoria: '', prioridad: 'media', 
        peso: '', cantidad: 1, fragil: false, proveedor: '', medida: ''
      });
      load();
    } catch (error) {
      alert("Error al crear caja.");
      console.error(error);
    } finally {
      setLoadingForm(false);
    }
  };

  const handlePrevisualizarCola = async () => {
    if (!usuarioEnvio) {
      alert('Selecciona un operador responsable.');
      return;
    }
    setLoadingEnvio(true);
    try {
      const res = await previsualizarLote();
      setPreviewData(res.data);
      const initialAsignaciones = {};
      res.data.cajas.forEach(caja => {
        initialAsignaciones[caja.id] = caja.sugerida_id;
      });
      setAsignaciones(initialAsignaciones);

      if (res.data.cajas.length > 0) {
        const firstCaja = res.data.cajas[0];
        setSelectedBoxId(firstCaja.id);
        if (firstCaja.sugerida_nombre && firstCaja.sugerida_nombre !== 'Ninguna compatible') {
          setActivePasillo(firstCaja.sugerida_nombre.charAt(0));
        } else {
          setActivePasillo('A');
        }
      }

      setShowPreview(true);
    } catch (error) {
      alert('Error al generar la previsualización de la cola');
      console.error(error);
    } finally {
      setLoadingEnvio(false);
    }
  };

  const handleUbiChange = (cajaId, ubiId) => {
    setAsignaciones(prev => ({
      ...prev,
      [cajaId]: ubiId ? parseInt(ubiId) : null
    }));
  };

  const confirmarYProcesarCola = async () => {
    if (!usuarioEnvio) {
      alert('Selecciona un operador responsable.');
      return;
    }

    const selectedUbis = Object.values(asignaciones).filter(Boolean);
    const duplicates = selectedUbis.some((item, index) => selectedUbis.indexOf(item) !== index);
    if (duplicates) {
      alert('Error: No puedes asignar la misma ubicación a dos cajas distintas.');
      return;
    }

    setLoadingConfirmar(true);
    try {
      const res = await procesarLote({
        id_usuario: parseInt(usuarioEnvio),
        asignaciones: asignaciones
      });
      // Abrimos el PDF primero para evitar el bloqueo del popup del navegador
      if (res.data.pdf_url) {
        window.open(window.location.origin + res.data.pdf_url, '_blank');
      }
      alert(res.data.mensaje || 'Cola procesada con éxito. Descargando guía de ruta...');
      setShowPreview(false);
      load();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al procesar la cola');
      console.error(error);
    } finally {
      setLoadingConfirmar(false);
    }
  };

  const catIcon = { electronica: '💻', textil: '👕', alimento: '🍎', herramienta: '🔧', quimico: '⚗️', otro: '📦' };
  const prioColors = { 
    urgente: 'bg-red-500/20 text-red-400 border border-red-500/30', 
    alta: 'bg-amber-500/20 text-amber-400 border border-amber-500/30', 
    media: 'bg-sky-500/20 text-sky-400 border border-sky-500/30', 
    baja: 'bg-slate-500/20 text-slate-400 border border-slate-500/30' 
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6 fade-in">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <i className="bi bi-plus-circle text-emerald-400"></i> Registrar Cajas
          </h2>
          <p className="text-slate-500 text-sm mt-1">Agrega cajas a la cola y luego genera la guía de ruta optimizada en PDF.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulario */}
        <div className="lg:col-span-7 fade-in fade-d1">
          <div className="bg-surface rounded-2xl border border-slate-800/60 overflow-hidden shadow-xl shadow-black/20">
            <div className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between bg-slate-900/50">
              <span className="font-semibold text-white flex items-center gap-2"><i className="bi bi-box"></i> Datos de la caja</span>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit}>
                {/* ID + Producto */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-6">
                  <div className="md:col-span-5">
                    <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">ID de caja</label>
                    <input type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all" 
                           value={form.id} onChange={e => setForm({...form, id: e.target.value})} required />
                  </div>
                  <div className="md:col-span-7">
                    <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Producto / descripción</label>
                    <input type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all" 
                           value={form.producto} onChange={e => setForm({...form, producto: e.target.value})} placeholder="Ej. Laptop Dell XPS 15" required />
                  </div>
                </div>

                {/* Categoría */}
                <div className="mb-6">
                  <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Categoría</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {(categorias.length ? categorias : Object.keys(catIcon).map(k => ({slug:k, nombre:k, icono: catIcon[k]}))).map(cat => (
                      <div key={cat.slug} className={`border-2 rounded-xl p-3 text-center cursor-pointer transition-all select-none ${form.categoria === cat.slug ? 'border-indigo-500 bg-indigo-500/15 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'border-slate-700 bg-surface text-slate-400 hover:border-indigo-500/50 hover:bg-indigo-500/5 hover:text-slate-200'}`}
                           onClick={() => setForm({...form, categoria: cat.slug})}>
                        <span className="block text-3xl mb-1 drop-shadow-md">{cat.icono || catIcon[cat.slug]}</span>
                        <span className="text-xs font-bold capitalize">{cat.nombre}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prioridad */}
                <div className="mb-6">
                  <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Prioridad</label>
                  <div className="flex gap-3 flex-wrap">
                    {['baja', 'media', 'alta', 'urgente'].map(p => {
                      const colors = { baja: 'bg-slate-500', media: 'bg-sky-500', alta: 'bg-amber-500', urgente: 'bg-red-500' };
                      const activeClasses = {
                        baja: 'border-slate-400 bg-slate-500/20 text-slate-300',
                        media: 'border-sky-500 bg-sky-500/20 text-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.15)]',
                        alta: 'border-amber-500 bg-amber-500/20 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
                        urgente: 'border-red-500 bg-red-500/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.15)]'
                      };
                      const hoverClasses = {
                        baja: 'hover:border-slate-500 hover:bg-slate-800/50 hover:text-slate-200',
                        media: 'hover:border-sky-600 hover:bg-sky-900/20 hover:text-sky-200',
                        alta: 'hover:border-amber-600 hover:bg-amber-900/20 hover:text-amber-200',
                        urgente: 'hover:border-red-600 hover:bg-red-900/20 hover:text-red-200'
                      };
                      return (
                        <div key={p} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border bg-surface cursor-pointer transition-all text-sm font-semibold text-slate-400 ${form.prioridad === p ? activeClasses[p] : `border-slate-700 ${hoverClasses[p]}`}`}
                             onClick={() => setForm({...form, prioridad: p})}>
                          <div className={`w-3 h-3 rounded-full ${colors[p]}`}></div> <span className="capitalize">{p}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Peso + Frágil */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
                  <div>
                    <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Peso (kg)</label>
                    <input type="number" step="0.1" min="0.1" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all" 
                           value={form.peso} onChange={e => setForm({...form, peso: e.target.value})} placeholder="0.0" required />
                  </div>
                  <div>
                    <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Cantidad</label>
                    <input type="number" min="1" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all" 
                           value={form.cantidad} onChange={e => setForm({...form, cantidad: e.target.value})} required />
                  </div>
                  <div>
                    <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">¿Es frágil?</label>
                    <div className="flex items-center gap-3 mt-3">
                      <div className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors border ${form.fragil ? 'bg-sky-500 border-sky-400' : 'bg-slate-800 border-slate-700'}`}
                           onClick={() => setForm({...form, fragil: !form.fragil})}>
                        <div className={`absolute top-[1px] w-[20px] h-[20px] bg-white rounded-full transition-all ${form.fragil ? 'left-[25px]' : 'left-[1px]'}`}></div>
                      </div>
                      <span className={`font-medium ${form.fragil ? 'text-sky-400' : 'text-slate-400'}`}>{form.fragil ? 'Sí' : 'No'}</span>
                    </div>
                  </div>
                </div>

                {/* Proveedor + Medida */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                  <div>
                    <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Proveedor</label>
                    <select className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all appearance-none" 
                            value={form.proveedor} onChange={e => setForm({...form, proveedor: e.target.value})} required>
                      <option value="">Seleccionar proveedor...</option>
                      {proveedores.map(p => <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre_empresa}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Medida / tamaño</label>
                    <select className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all appearance-none" 
                            value={form.medida} onChange={e => setForm({...form, medida: e.target.value})} required>
                      <option value="">Seleccionar medida...</option>
                      {medidas.map(m => <option key={m.id_medida} value={m.id_medida}>{m.nombre} ({m.largo}x{m.ancho}x{m.alto})</option>)}
                    </select>
                  </div>
                </div>

                <button type="submit" disabled={loadingForm} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50">
                  <i className="bi bi-plus-lg"></i> {loadingForm ? 'Procesando...' : 'Agregar a la cola'} <i className="bi bi-arrow-right"></i>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Cola de cajas */}
        <div className="lg:col-span-5 fade-in fade-d2">
          <div className="bg-surface rounded-2xl border border-slate-800/60 overflow-hidden shadow-xl shadow-black/20 h-full flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between bg-slate-900/50">
              <span className="font-semibold text-white flex items-center gap-2"><i className="bi bi-list-task"></i> Cola de pendientes</span>
              <span className="bg-indigo-500/20 text-indigo-400 font-bold px-3 py-1 rounded-lg text-sm">{cajas.length} cajas</span>
            </div>
            
            <div className="p-4 flex-grow flex flex-col">
              <div className="flex flex-col gap-3 flex-grow overflow-y-auto max-h-[500px]">
                {!cajas.length ? (
                  <div className="text-center py-12 text-slate-500">
                    <i className="bi bi-inbox text-5xl block mb-3 opacity-30"></i>
                    <p className="text-base font-medium">La cola está vacía.</p>
                    <p className="text-sm">Agrega cajas para generar la guía de ruta.</p>
                  </div>
                ) : cajas.map(c => (
                  <div key={c.id} className="p-4 rounded-xl border border-slate-700 bg-slate-800/40 flex items-center gap-4 animate-[fadeInUp_0.3s_ease]">
                    <div className="text-3xl drop-shadow-md">{catIcon[c.categoria] || '📦'}</div>
                    <div className="flex-1">
                      <div className="font-bold text-white text-base">{c.producto}</div>
                      <div className="text-sm text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                        <span className="text-sky-400 font-medium">{c.id}</span> · {c.peso_kg} kg · 
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${prioColors[c.prioridad] || prioColors.media}`}>{c.prioridad}</span>
                      </div>
                    </div>
                    {c.es_fragil && <span title="Frágil" className="text-2xl drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]">🔷</span>}
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-5 border-t border-slate-800/60 shrink-0">
                <div className="mb-4">
                  <label className="form-label text-slate-400 text-xs uppercase tracking-wider font-semibold mb-2 block">Operador Responsable</label>
                  <select className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all appearance-none" 
                          value={usuarioEnvio} onChange={e => setUsuarioEnvio(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {usuarios.map(u => <option key={u.id_usuario} value={u.id_usuario}>{u.nombre} ({u.rol})</option>)}
                  </select>
                </div>
                <button className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:hover:bg-sky-600 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 transition-all" 
                        disabled={!cajas.length || loadingEnvio} onClick={handlePrevisualizarCola}>
                  <i className="bi bi-file-earmark-pdf text-lg"></i> {loadingEnvio ? 'Cargando...' : 'Procesar cola y previsualizar guía'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
          <div className="bg-surface border border-slate-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl animate-[fadeInUp_0.2s_ease-out] flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <i className="bi bi-eye text-sky-400"></i> Previsualización de la Cola y Asignación de Estantes
              </h3>
              <button type="button" onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-white transition-colors">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {/* Body (Side-by-side) */}
            <div className="p-6 overflow-y-auto flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
              
              {/* Left Column: Cajas */}
              <div className="lg:col-span-4 flex flex-col gap-3 overflow-y-auto max-h-[55vh] pr-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cajas en la cola (haz clic para modificar)</div>
                {previewData.cajas.length === 0 ? (
                  <p className="text-slate-400 text-sm">No hay cajas compatibles para procesar en esta cola.</p>
                ) : (
                  previewData.cajas.map(caja => {
                    const active = selectedBoxId === caja.id;
                    const assignedUbiId = asignaciones[caja.id];
                    const assignedUbi = allUbicaciones.find(u => u.id_ubicacion === assignedUbiId);
                    const assignedLabel = assignedUbi ? `${assignedUbi.pasillo}${assignedUbi.estante}-N${assignedUbi.nivel}` : 'Sin asignar';
                    const isManual = assignedUbiId !== caja.sugerida_id;

                    return (
                      <button
                        key={caja.id}
                        type="button"
                        onClick={() => {
                          setSelectedBoxId(caja.id);
                          if (assignedUbi) {
                            setActivePasillo(assignedUbi.pasillo);
                          }
                        }}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1 ${active ? 'border-sky-500 bg-sky-950/20 shadow-md ring-1 ring-sky-500/30' : 'border-slate-800 bg-slate-900/10 hover:bg-slate-900/20'}`}
                      >
                        <div className="font-bold text-white text-xs leading-snug">{caja.producto}</div>
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between w-full">
                          <span>ID: <strong className="text-slate-400">{caja.id}</strong> · {caja.peso_kg} kg</span>
                          <span className={`px-2 py-0.5 rounded font-black ${isManual ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
                            {isManual ? 'Manual' : 'Óptima'}: {assignedLabel}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Right Column: Visual Warehouse Map */}
              <div className="lg:col-span-8 flex flex-col min-h-0">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Asignar ubicación para: <strong className="text-sky-400">{(previewData.cajas.find(c => c.id === selectedBoxId))?.producto || ''}</strong></span>
                  <span className="text-slate-600">Pasillos & Estantes en cuadrícula</span>
                </div>

                {/* Pasillo selector tabs */}
                {(() => {
                  const porPasillo = {};
                  allUbicaciones.forEach(u => {
                    if (!porPasillo[u.pasillo]) porPasillo[u.pasillo] = [];
                    porPasillo[u.pasillo].push(u);
                  });

                  const pasillosFiltrados = porPasillo[activePasillo] || [];
                  const porEstante = {};
                  pasillosFiltrados.forEach(u => {
                    if (!porEstante[u.estante]) porEstante[u.estante] = [];
                    porEstante[u.estante].push(u);
                  });

                  return (
                    <>
                      <div className="flex gap-2 flex-wrap mb-4 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800">
                        {Object.keys(porPasillo).sort().map(pas => (
                          <button
                            key={pas}
                            type="button"
                            onClick={() => setActivePasillo(pas)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activePasillo === pas ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                          >
                            Pasillo {pas}
                          </button>
                        ))}
                      </div>

                      {/* Map legend */}
                      <div className="flex flex-wrap gap-2 mb-3 text-[10px] text-slate-500 font-semibold">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded border border-slate-850 bg-slate-950"></span> Ocupado</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded border border-emerald-500 bg-emerald-950"></span> Seleccionado</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded border border-amber-600/30 bg-amber-950/40"></span> Reservado otro</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded border border-indigo-500/50 bg-indigo-950/40"></span> Sugerido ⭐</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded border border-slate-800 bg-slate-900/30"></span> Libre</span>
                      </div>

                      {/* Grid representation */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto max-h-[42vh] pr-2">
                        {Object.keys(porEstante).sort((a, b) => parseInt(a) - parseInt(b)).map(est => {
                          const slots = porEstante[est];
                          // Group slots by level: 3, 2, 1
                          const ubiPorNivel = { 3: [], 2: [], 1: [] };
                          slots.forEach(u => {
                            if (ubiPorNivel[u.nivel]) {
                              ubiPorNivel[u.nivel].push(u);
                            }
                          });

                          return (
                            <div key={est} className="p-3.5 bg-slate-900/20 border border-slate-800/80 rounded-2xl flex flex-col gap-2">
                              <div className="text-[10px] text-slate-500 font-bold text-center uppercase tracking-widest pb-1.5 border-b border-slate-800/60">
                                Estante {activePasillo}{est}
                              </div>
                              <div className="flex flex-col gap-2">
                                {[3, 2, 1].map(lvlNum => {
                                  const lvlSlots = ubiPorNivel[lvlNum] || [];
                                  const c1 = lvlSlots.find(u => u.lado === 'adelante' && u.casillero === 1);
                                  const c2 = lvlSlots.find(u => u.lado === 'adelante' && u.casillero === 2);
                                  const c3 = lvlSlots.find(u => u.lado === 'posterior' && u.casillero === 1);
                                  const c4 = lvlSlots.find(u => u.lado === 'posterior' && u.casillero === 2);
                                  const cellList = [
                                    { u: c1, label: 'C1', num: 1 },
                                    { u: c2, label: 'C2', num: 2 },
                                    { u: c3, label: 'C3', num: 3 },
                                    { u: c4, label: 'C4', num: 4 }
                                  ];

                                  return (
                                    <div key={lvlNum} className="border border-slate-800/50 bg-slate-950/20 rounded-xl p-2 flex flex-col gap-1.5">
                                      <div className="text-[9px] text-slate-400 font-bold px-0.5">Nivel {lvlNum}</div>
                                      <div className="grid grid-cols-2 gap-1">
                                        {cellList.map(({ u, label }) => {
                                          if (!u) return <div key={label} className="w-full py-1 text-[9px] border border-transparent opacity-0 pointer-events-none" />;

                                          const isOccupied = u.estado_ocupacion;
                                          const isSelectedByCurrent = asignaciones[selectedBoxId] === u.id_ubicacion;
                                          const isSelectedByOther = Object.entries(asignaciones).some(([cajaId, ubiId]) => cajaId !== selectedBoxId && ubiId === u.id_ubicacion);
                                          const isRecommendedForCurrent = previewData.cajas.find(c => c.id === selectedBoxId)?.sugerida_id === u.id_ubicacion;

                                          let cellClass = 'w-full py-1 px-1.5 rounded-lg text-[9px] font-black text-center transition-all border select-none flex items-center justify-between ';
                                          let clickHandler = null;

                                          if (isOccupied) {
                                            cellClass += 'border-slate-850 bg-slate-950 text-slate-700 cursor-not-allowed';
                                          } else if (isSelectedByCurrent) {
                                            cellClass += 'border-emerald-500 bg-emerald-950 text-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.3)] cursor-pointer';
                                            clickHandler = () => handleUbiChange(selectedBoxId, u.id_ubicacion);
                                          } else if (isSelectedByOther) {
                                            cellClass += 'border-amber-600/30 bg-amber-950/40 text-amber-500/30 opacity-55 cursor-not-allowed';
                                          } else if (isRecommendedForCurrent) {
                                            cellClass += 'border-indigo-500/50 bg-indigo-950/40 text-indigo-300 hover:border-sky-500 cursor-pointer';
                                            clickHandler = () => handleUbiChange(selectedBoxId, u.id_ubicacion);
                                          } else {
                                            cellClass += 'border-slate-800 bg-slate-900/30 text-slate-400 hover:border-sky-500 hover:text-white cursor-pointer';
                                            clickHandler = () => handleUbiChange(selectedBoxId, u.id_ubicacion);
                                          }

                                          return (
                                            <div
                                              key={u.id_ubicacion}
                                              className={cellClass}
                                              onClick={clickHandler}
                                              title={isOccupied ? 'Ocupado' : isSelectedByOther ? 'Reservado por otra caja' : isRecommendedForCurrent ? 'Recomendada ⭐' : 'Disponible'}
                                            >
                                              <span className="flex items-center gap-0.5">
                                                {isRecommendedForCurrent && <span className="text-[8px]">⭐</span>}
                                                {label}
                                              </span>
                                              {isSelectedByCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}

              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/10 flex justify-between items-center gap-3 shrink-0">
              <div className="text-xs text-slate-500">
                Peso total de la cola: <span className="text-slate-300 font-bold">{previewData.peso_total?.toFixed(1)}</span> kg / {previewData.max_paradas} paradas máx.
              </div>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={confirmarYProcesarCola}
                  disabled={loadingConfirmar}
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-lg shadow-sky-500/20"
                >
                  <i className="bi bi-check-lg"></i> {loadingConfirmar ? 'Procesando...' : 'Confirmar Cola y Generar Guía PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
