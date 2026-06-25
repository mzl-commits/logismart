import { useEffect, useState } from 'react';
import { Radio, Battery, Wifi, Activity, AlertTriangle, ArrowUp, ArrowDown, Disc } from 'lucide-react';
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

  const parseMotorValue = (val, state) => {
    const v = Number(val) || 0;
    // Si parece un valor en microsegundos (1000 - 2000)
    if (v >= 900 && v <= 2100) {
      const isStopped = Math.abs(v - 1500) <= 15;
      const isForward = v > 1515;
      const isReverse = v < 1485;
      const pct = Math.min(100, Math.round(Math.abs(v - 1500) / 5));
      return {
        raw: v,
        pct,
        status: isStopped ? 'Detenido' : isForward ? 'Avance' : 'Reversa',
        direction: isStopped ? 'stop' : isForward ? 'forward' : 'reverse',
        label: `${v} us`
      };
    } else {
      // Si es un valor de PWM directo del ESP32 (0 - 255)
      const isStopped = v < 10;
      const pct = Math.min(100, Math.round((v / 255) * 100));
      const isReturning = state === 'regresando';
      return {
        raw: v,
        pct,
        status: isStopped ? 'Detenido' : (isReturning ? 'Retorno' : 'Avance'),
        direction: isStopped ? 'stop' : (isReturning ? 'reverse' : 'forward'),
        label: `${v} PWM`
      };
    }
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

  const motorIzqInfo = parseMotorValue(estado?.motor_izq_vel, estado?.estado);
  const motorDerInfo = parseMotorValue(estado?.motor_der_vel, estado?.estado);

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
                  <td>Motor Izquierdo</td>
                  <td style={{fontWeight:600, color:'var(--text-light)'}}>
                    {motorIzqInfo.label}
                  </td>
                </tr>
                <tr>
                  <td>Motor Derecho</td>
                  <td style={{fontWeight:600, color:'var(--text-light)'}}>
                    {motorDerInfo.label}
                  </td>
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

        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyItems: 'center', minHeight: 280 }}>
          <div className="card-title mb-4" style={{ width: '100%', textAlign: 'left' }}>
            <Disc size={14} style={{ display: 'inline', marginRight: 6, animation: (motorIzqInfo.direction !== 'stop' || motorDerInfo.direction !== 'stop') ? 'spin 2s linear infinite' : 'none' }}/>
            Estado Dinámico del AGV
          </div>
          
          <div className="agv-container" style={{ width: '100%' }}>
            <div style={{ display: 'flex', gap: '32px', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              {/* Left Motor label */}
              <div style={{ textAlign: 'right', minWidth: '80px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Motor Izq</div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>
                  {motorIzqInfo.label}
                </div>
                <div style={{ fontSize: '10px', marginTop: '2px', fontWeight: '600', color: motorIzqInfo.direction === 'forward' ? '#10b981' : motorIzqInfo.direction === 'reverse' ? '#f43f5e' : 'var(--text-muted)' }}>
                  {motorIzqInfo.direction === 'forward' ? '↑ Avance' : motorIzqInfo.direction === 'reverse' ? '↓ Reversa' : '■ Detenido'}
                </div>
              </div>

              {/* The Chassis Graphic */}
              <div className="agv-chassis">
                {/* Front Obstacle Warning */}
                {estado?.sensor_obstaculo_frontal && (
                  <div style={{
                    position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)',
                    fontSize: '8px', background: '#f43f5e', color: '#fff', padding: '2px 6px',
                    borderRadius: '4px', fontWeight: 'bold', whiteSpace: 'nowrap', zIndex: 20
                  }}>
                    OBSTÁCULO FRONTAL
                  </div>
                )}

                {/* Front Obstacle Sensor dot */}
                <div style={{ position: 'absolute', top: '10px' }}>
                  <div className={`sensor-dot ${estado?.sensor_obstaculo_frontal ? 'sensor-obstacle-active' : ''}`} title="Sensor Obstáculo Frontal" />
                </div>

                {/* Left Wheel */}
                <div className="wheel wheel-left">
                  {motorIzqInfo.direction !== 'stop' && (
                    <div 
                      className={`wheel-tread ${motorIzqInfo.direction === 'forward' ? 'wheel-spin-fw' : 'wheel-spin-rv'}`} 
                      style={{ '--spin-speed': `${Math.max(0.1, 1 - motorIzqInfo.pct / 100)}s` }}
                    />
                  )}
                </div>

                {/* Right Wheel */}
                <div className="wheel wheel-right">
                  {motorDerInfo.direction !== 'stop' && (
                    <div 
                      className={`wheel-tread ${motorDerInfo.direction === 'forward' ? 'wheel-spin-fw' : 'wheel-spin-rv'}`} 
                      style={{ '--spin-speed': `${Math.max(0.1, 1 - motorDerInfo.pct / 100)}s` }}
                    />
                  )}
                </div>

                {/* Coordinates inside the chassis */}
                <div style={{ textAlign: 'center', zIndex: 10 }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Coordenadas</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>
                    ({estado?.pos_x ?? 0}, {estado?.pos_y ?? 0})
                  </div>
                  {estado?.destino_x !== undefined && estado?.destino_y !== undefined && (
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Destino: ({estado.destino_x}, {estado.destino_y})
                    </div>
                  )}
                </div>

                {/* Line Follower Sensors (optical sensors) at bottom/front */}
                <div style={{ position: 'absolute', bottom: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{ fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Sensores Ópticos</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <div className={`sensor-dot ${estado?.sensor_opt_izq_ext ? 'sensor-align-active' : ''}`} title="Izq Extremo" />
                    <div className={`sensor-dot ${estado?.sensor_opt_izq_int ? 'sensor-align-active' : ''}`} title="Izq Interno" />
                    <div className={`sensor-dot ${estado?.sensor_opt_der_int ? 'sensor-align-active' : ''}`} title="Der Interno" />
                    <div className={`sensor-dot ${estado?.sensor_opt_der_ext ? 'sensor-align-active' : ''}`} title="Der Extremo" />
                  </div>
                </div>

                {/* Rear Obstacle Sensor dot */}
                <div style={{ position: 'absolute', bottom: '40px' }}>
                  <div className={`sensor-dot ${estado?.sensor_obstaculo_trasero ? 'sensor-obstacle-active' : ''}`} title="Sensor Obstáculo Trasero" />
                </div>
                
                {/* Rear Obstacle Warning */}
                {estado?.sensor_obstaculo_trasero && (
                  <div style={{
                    position: 'absolute', bottom: '-15px', left: '50%', transform: 'translateX(-50%)',
                    fontSize: '8px', background: '#f43f5e', color: '#fff', padding: '2px 6px',
                    borderRadius: '4px', fontWeight: 'bold', whiteSpace: 'nowrap', zIndex: 20
                  }}>
                    OBSTÁCULO TRASERO
                  </div>
                )}
              </div>

              {/* Right Motor label */}
              <div style={{ textAlign: 'left', minWidth: '80px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Motor Der</div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>
                  {motorDerInfo.label}
                </div>
                <div style={{ fontSize: '10px', marginTop: '2px', fontWeight: '600', color: motorDerInfo.direction === 'forward' ? '#10b981' : motorDerInfo.direction === 'reverse' ? '#f43f5e' : 'var(--text-muted)' }}>
                  {motorDerInfo.direction === 'forward' ? '↑ Avance' : motorDerInfo.direction === 'reverse' ? '↓ Reversa' : '■ Detenido'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
