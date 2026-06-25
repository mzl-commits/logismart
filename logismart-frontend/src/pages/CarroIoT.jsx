import { useEffect, useState } from 'react';
import { Radio, Battery, Wifi, Activity, AlertTriangle } from 'lucide-react';
import { getEstadoCarro } from '../api/endpoints';

export default function CarroIoT() {
  const [estado, setEstado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const friendlyState = (state) => {
    const map = {
      'esperando': 'Esperando instrucciones',
      'moviendo': 'En movimiento',
      'llego': 'Llegó a destino',
      'regresando': 'Regresando a base',
      'desconectado': 'Desconectado'
    };
    return map[state] || state || 'Desconocido';
  };

  const fetchEstado = async () => {
    try {
      const res = await getEstadoCarro();
      // Si la API retorna un array, toma el primero. Si es un objeto, úsalo directamente.
      const data = Array.isArray(res.data) ? res.data[0] : res.data;
      setEstado(data);
      setError(null);
    } catch (err) {
      setError('Error al conectar con el vehículo. Verifique la conexión MQTT.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstado();
    // Polling cada 2 segundos para simular tiempo real si no hay WebSockets
    const interval = setInterval(fetchEstado, 2000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !estado) return <div className="loading-center"><div className="spinner" />Conectando con el carro…</div>;

  return (
    <div>
      {error && (
        <div className="alert alert-danger mb-6">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="grid-3 mb-6">
        <div className="stat-card">
          <div className="stat-icon indigo"><Radio size={24}/></div>
          <div>
            <div className="stat-value">{friendlyState(estado?.estado)}</div>
            <div className="stat-label">Estado de Operación</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon emerald"><Battery size={24}/></div>
          <div>
            <div className="stat-value">{estado?.bateria_pct !== undefined ? `${estado.bateria_pct}%` : '—'}</div>
            <div className="stat-label">Nivel de Batería</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan"><Activity size={24}/></div>
          <div>
            <div className="stat-value">{estado?.pos_x !== undefined ? `(${estado.pos_x}, ${estado.pos_y})` : '—'}</div>
            <div className="stat-label">Coordenadas Actuales</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title mb-4"><Wifi size={14} style={{display:'inline',marginRight:6}}/>Telemetría Detallada</div>
          <div className="table-wrap">
            <table>
              <tbody>
                <tr>
                  <td>Última actualización</td>
                  <td style={{fontWeight:600, color:'var(--text-light)'}}>
                    {estado?.actualizado_en ? new Date(estado.actualizado_en).toLocaleTimeString('es-PE') : '—'}
                  </td>
                </tr>
                <tr>
                  <td>Caja asignada (Carga)</td>
                  <td style={{fontWeight:600, color:'var(--text-light)'}}>{estado?.caja_id || 'Sin carga'}</td>
                </tr>
                <tr>
                  <td>Alineación</td>
                  <td style={{fontWeight:600, color:'var(--text-light)'}}>
                    {estado?.sensor_opt_izq_int !== undefined && estado?.sensor_opt_der_int !== undefined ? (
                      (estado.sensor_opt_izq_int || estado.sensor_opt_der_int) ? '✅ Correcta' : '❌ Desalineado'
                    ) : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight: 200, borderStyle: 'dashed'}}>
           <div style={{textAlign:'center', color:'var(--text-muted)'}}>
              <Radio size={48} style={{opacity: 0.2, marginBottom: 16}}/>
              <p>Monitoreo activo del vehículo AGV</p>
              <p style={{fontSize: 12, marginTop: 8}}>Los datos se actualizan automáticamente en tiempo real</p>
           </div>
        </div>
      </div>
    </div>
  );
}
