import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, AlertTriangle, CalendarRange, Download, History, PackageSearch, RefreshCw, Search,
} from 'lucide-react';
import { createPoliticaStock, exportarStock, getAlertasStock, getCategorias, getInventario, getKardex, getStock, reservarStock } from '../api/endpoints';
import { EmptyState, MetricStrip, PageHeader, Panel, SkeletonRows, StatusBadge } from '../components/ui';

const today = new Date();
const rangeStart = new Date(today);
rangeStart.setDate(rangeStart.getDate() - 29);
const dateValue = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');

const stateLabels = {
  pendiente: 'Pendiente',
  clasificada: 'Clasificada',
  en_transito: 'En tránsito',
  almacenada: 'Almacenada',
};

const stateTones = {
  pendiente: 'warning',
  clasificada: 'info',
  en_transito: 'info',
  almacenada: 'success',
};

function filenameFromDisposition(disposition) {
  return disposition?.match(/filename="?([^";]+)"?/i)?.[1] || 'reporte_stock.xlsx';
}

export default function Stock() {
  const [filters, setFilters] = useState({
    fecha_desde: dateValue(rangeStart),
    fecha_hasta: dateValue(today),
    search: '',
    categoria: '',
    estado: '',
  });
  const [applied, setApplied] = useState(filters);
  const [data, setData] = useState({ items: [], resumen: {} });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [operations, setOperations] = useState({ inventory: [], movements: [], alerts: [] });
  const [reservation, setReservation] = useState({ caja: '', cantidad: 1, destino: '' });
  const [policy, setPolicy] = useState({ producto: '', minimo: 0, maximo: '', dias_sin_movimiento: 30 });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: response } = await getStock(applied);
      setData(response);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo cargar el stock.');
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    getCategorias().then(({ data: response }) => setCategories(response?.results ?? response ?? [])).catch(() => {});
  }, []);
  useEffect(() => {
    Promise.all([getInventario(), getKardex(), getAlertasStock()]).then(([inventory, movements, alerts]) => {
      setOperations({ inventory: inventory.data.items ?? [], movements: movements.data ?? [], alerts: alerts.data ?? [] });
    }).catch(() => {});
  }, [data]);

  const exportReport = async () => {
    setExporting(true);
    setError('');
    try {
      const response = await exportarStock(applied);
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filenameFromDisposition(response.headers['content-disposition']);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo generar el reporte Excel.');
    } finally {
      setExporting(false);
    }
  };

  const groupedProducts = useMemo(() => new Set(data.items.map((item) => item.producto.toLowerCase())).size, [data.items]);
  const summary = data.resumen || {};
  const refreshOperations = async () => {
    const [inventory, movements, alerts] = await Promise.all([getInventario(), getKardex(), getAlertasStock()]);
    setOperations({ inventory: inventory.data.items ?? [], movements: movements.data ?? [], alerts: alerts.data ?? [] });
  };
  const saveReservation = async (event) => { event.preventDefault(); setError(''); try { await reservarStock({...reservation,cantidad:Number(reservation.cantidad)}); setReservation({caja:'',cantidad:1,destino:''}); await refreshOperations(); } catch (requestError) { setError(requestError.response?.data?.error || 'No se pudo reservar el stock.'); } };
  const savePolicy = async (event) => { event.preventDefault(); setError(''); try { await createPoliticaStock({...policy,minimo:Number(policy.minimo),maximo:policy.maximo===''?null:Number(policy.maximo),dias_sin_movimiento:Number(policy.dias_sin_movimiento)}); setPolicy({producto:'',minimo:0,maximo:'',dias_sin_movimiento:30}); await refreshOperations(); } catch { setError('No se pudo guardar la política de stock.'); } };

  return <div className="page-stack stock-page">
    <PageHeader
      title="Stock"
      description="Consulta las existencias registradas y genera reportes por periodo de ingreso."
      meta={<StatusBadge tone="success">Inventario activo</StatusBadge>}
      actions={<button className="button button--primary" onClick={exportReport} disabled={exporting || loading}>
        <Download size={16} />{exporting ? 'Generando…' : 'Exportar Excel'}
      </button>}
    />

    <MetricStrip items={[
      { label: 'Unidades', value: summary.unidades ?? 0, tone: 'success', detail: `${summary.referencias ?? 0} referencias` },
      { label: 'Productos', value: groupedProducts, detail: 'Productos únicos' },
      { label: 'Almacenadas', value: summary.almacenadas ?? 0, tone: 'success' },
      { label: 'En tránsito', value: summary.en_transito ?? 0, tone: 'info' },
      { label: 'Peso total', value: `${Number(summary.peso_total_kg || 0).toFixed(1)} kg` },
    ]} />

    <Panel title="Periodo y filtros" description="El rango seleccionado también se aplica al archivo Excel.">
      <form className="stock-filters" onSubmit={(event) => { event.preventDefault(); setApplied({ ...filters }); }}>
        <label><span>Desde</span><div className="stock-control"><CalendarRange size={15}/><input type="date" value={filters.fecha_desde} max={filters.fecha_hasta} onChange={(event) => setFilters({ ...filters, fecha_desde: event.target.value })}/></div></label>
        <label><span>Hasta</span><div className="stock-control"><CalendarRange size={15}/><input type="date" value={filters.fecha_hasta} min={filters.fecha_desde} onChange={(event) => setFilters({ ...filters, fecha_hasta: event.target.value })}/></div></label>
        <label className="stock-search"><span>Buscar</span><div className="stock-control"><Search size={15}/><input type="search" placeholder="Producto o ID" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })}/></div></label>
        <label><span>Categoría</span><select value={filters.categoria} onChange={(event) => setFilters({ ...filters, categoria: event.target.value })}><option value="">Todas</option>{categories.map((category) => <option value={category.slug} key={category.slug}>{category.nombre}</option>)}</select></label>
        <label><span>Estado</span><select value={filters.estado} onChange={(event) => setFilters({ ...filters, estado: event.target.value })}><option value="">Todos</option>{Object.entries(stateLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <button className="button button--secondary stock-filter-submit" type="submit" disabled={loading}><RefreshCw size={15}/>{loading ? 'Actualizando…' : 'Aplicar filtros'}</button>
      </form>
    </Panel>

    {error && <div className="stock-alert" role="alert"><AlertCircle size={17}/>{error}</div>}

    <Panel title="Detalle de existencias" description={`${data.items.length} registros en el periodo seleccionado`}>
      {loading ? <SkeletonRows count={6}/> : data.items.length ? <div className="stock-table-wrap"><table className="stock-table">
        <thead><tr><th>Producto / ID</th><th>Categoría</th><th>Cantidad</th><th>Peso total</th><th>Ubicación</th><th>Ingreso</th><th>Estado</th></tr></thead>
        <tbody>{data.items.map((item) => <tr key={item.id}>
          <td><strong>{item.producto}</strong><small>{item.id} · {item.proveedor || 'Sin proveedor'}</small></td>
          <td>{item.categoria || 'Otro'}</td>
          <td><strong>{item.cantidad}</strong><small>{item.unidad}</small></td>
          <td>{item.peso_total_kg.toFixed(2)} kg</td>
          <td>{item.ubicacion}</td>
          <td>{new Date(item.fecha_ingreso).toLocaleDateString('es-PE')}</td>
          <td><StatusBadge tone={stateTones[item.estado]}>{stateLabels[item.estado] || item.estado}</StatusBadge></td>
        </tr>)}</tbody>
      </table></div> : <EmptyState icon={PackageSearch} title="No hay stock para este periodo" description="Prueba ampliando las fechas o retirando alguno de los filtros."/>}
    </Panel>
    <div className="stock-operations-grid">
      <Panel title="Reservar existencias" description="Separa unidades sin alterar el stock físico."><form className="stock-inline-form" onSubmit={saveReservation}><select required value={reservation.caja} onChange={e=>setReservation({...reservation,caja:e.target.value})}><option value="">Seleccionar producto / lote</option>{operations.inventory.filter(item=>item.disponible>0).map(item=><option key={item.id} value={item.id}>{item.producto} · {item.id} · {item.disponible} disponibles</option>)}</select><input type="number" min="1" value={reservation.cantidad} onChange={e=>setReservation({...reservation,cantidad:e.target.value})}/><input placeholder="Destino o pedido" value={reservation.destino} onChange={e=>setReservation({...reservation,destino:e.target.value})}/><button className="button button--primary">Reservar</button></form></Panel>
      <Panel title="Política de stock" description="Define mínimos, máximos y días sin movimiento."><form className="stock-inline-form" onSubmit={savePolicy}><input required placeholder="Producto exacto" value={policy.producto} onChange={e=>setPolicy({...policy,producto:e.target.value})}/><div className="stock-policy-numbers"><input type="number" min="0" placeholder="Mínimo" value={policy.minimo} onChange={e=>setPolicy({...policy,minimo:e.target.value})}/><input type="number" min="0" placeholder="Máximo" value={policy.maximo} onChange={e=>setPolicy({...policy,maximo:e.target.value})}/><input type="number" min="1" title="Días sin movimiento" value={policy.dias_sin_movimiento} onChange={e=>setPolicy({...policy,dias_sin_movimiento:e.target.value})}/></div><button className="button button--secondary">Guardar política</button></form></Panel>
      <Panel title="Alertas de inventario" description="Mínimos, máximos, inmovilización y vencimientos.">
        {operations.alerts.length ? <div className="stock-event-list">{operations.alerts.slice(0,8).map((alert,index)=><article key={`${alert.tipo}-${alert.producto}-${index}`}><AlertTriangle size={16}/><div><strong>{alert.producto}</strong><small>{alert.tipo.replace('_',' ')} · {alert.actual ?? alert.fecha ?? alert.registros}</small></div></article>)}</div> : <EmptyState icon={AlertTriangle} title="Sin alertas activas" description="Configura políticas de mínimo y máximo para recibir avisos."/>}
      </Panel>
      <Panel title="Kardex reciente" description="Últimos movimientos de existencias y reservas.">
        {operations.movements.length ? <div className="stock-event-list">{operations.movements.slice(0,8).map(move=><article key={move.id_movimiento}><History size={16}/><div><strong>{move.producto}</strong><small>{move.get_tipo_display || move.tipo} · {Math.abs(move.cantidad)} unidades · saldo {move.existencia_posterior}</small></div><time>{new Date(move.fecha).toLocaleDateString('es-PE')}</time></article>)}</div> : <EmptyState icon={History} title="Aún no hay movimientos" description="Las reservas, ajustes y despachos aparecerán aquí."/>}
      </Panel>
    </div>
  </div>;
}
