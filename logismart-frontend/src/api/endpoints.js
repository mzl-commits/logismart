import api from './client';

// ── Cajas ──────────────────────────────────────────────
export const getCajas        = ()       => api.get('cajas/');
export const createCaja      = (data)   => api.post('cajas/', data);
export const crearCaja       = (data)   => api.post('cajas/', data);
export const updateCaja      = (id, d)  => api.patch(`cajas/${id}/`, d);
export const deleteCaja      = (id)     => api.delete(`cajas/${id}/`);
export const sugerirId       = ()       => api.get('cajas/sugerir_id/');
export const procesarLote    = (data)   => api.post('cajas/procesar_lote/', data);
export const procesarCaja      = (id, data) => api.post(`cajas/${id}/procesar/`, data);
export const confirmarAlmacenada = (id, data) => api.post(`cajas/${id}/confirmar_almacenada/`, data);
export const confirmarDespacho = (id, data) => api.post(`cajas/${id}/confirmar_despacho/`, data);

// ── Ubicaciones ───────────────────────────────────────
export const getUbicaciones  = ()       => api.get('ubicaciones/');

// ── Despachos ─────────────────────────────────────────
export const getDespachos    = ()       => api.get('despachos/');
export const createDespacho  = (data)   => api.post('despachos/', data);

// ── Medidas ───────────────────────────────────────────
export const getMedidas      = ()       => api.get('medidas/');

// ── Proveedores ───────────────────────────────────────
export const getProveedores  = ()       => api.get('proveedores/');
export const createProveedor = (data)   => api.post('proveedores/', data);
export const updateProveedor = (id, d)  => api.patch(`proveedores/${id}/`, d);
export const deleteProveedor = (id)     => api.delete(`proveedores/${id}/`);

// ── Usuarios ──────────────────────────────────────────
export const getUsuarios     = ()       => api.get('usuarios/');
export const createUsuario   = (data)   => api.post('usuarios/', data);
export const updateUsuario   = (id, d)  => api.patch(`usuarios/${id}/`, d);
export const deleteUsuario   = (id)     => api.delete(`usuarios/${id}/`);

// ── Vehículos ─────────────────────────────────────────
export const getVehiculos    = ()       => api.get('vehiculos/');
export const createVehiculo  = (data)   => api.post('vehiculos/', data);
export const updateVehiculo  = (id, d)  => api.patch(`vehiculos/${id}/`, d);
export const deleteVehiculo  = (id)     => api.delete(`vehiculos/${id}/`);

// ── Destinos ──────────────────────────────────────────
export const getDestinos     = ()       => api.get('destinos/');
export const createDestino   = (data)   => api.post('destinos/', data);
export const updateDestino   = (id, d)  => api.patch(`destinos/${id}/`, d);
export const deleteDestino   = (id)     => api.delete(`destinos/${id}/`);

// ── Historial ─────────────────────────────────────────
export const getHistorial    = ()       => api.get('historial/');

// ── Config Carro ──────────────────────────────────────
export const getConfigCarro  = ()       => api.get('config-carro/');
export const updateConfigCarro = (data) => api.patch('config-carro/actualizar/', data);

// ── Categorías ────────────────────────────────────────
export const getCategorias   = ()       => api.get('categorias/');

// ── Estado del Carro (MQTT/IoT) ───────────────────────
export const getEstadoCarro  = ()       => api.get('carro/');
export const avanzarCarro    = ()       => api.post('carro/avanzar/');
export const resetCarro      = ()       => api.post('carro/reset/');
export const confirmarParada = (data)   => api.post('carro/confirmar_parada/', data);
export const getCurrentUser  = ()       => api.get('me/');
