import { test, expect } from '@playwright/test';

const admin = { is_authenticated: true, username: 'admin.demo', is_superuser: true, is_staff: true };
const operator = { is_authenticated: true, username: 'operador.demo', is_superuser: false, is_staff: false };

const base = {
  cajas: [
    { id: 'CAJ-001', producto: 'Laptop', estado: 'pendiente', categoria: 'electronica', prioridad: 'alta', peso_kg: 10, cantidad: 2, hora_llegada: '2026-07-12T10:00:00Z' },
    { id: 'CAJ-002', producto: 'Monitor', estado: 'almacenada', categoria: 'electronica', prioridad: 'media', peso_kg: 5, cantidad: 3, id_ubicacion: 1, hora_llegada: '2026-07-11T10:00:00Z' },
    { id: 'CAJ-003', producto: 'Archivada', estado: 'despachada', categoria: 'otro', prioridad: 'baja', peso_kg: 2, cantidad: 1, hora_llegada: '2026-07-10T10:00:00Z' },
  ],
  ubicaciones: [
    { id_ubicacion: 1, pasillo: 'A', estante: 1, nivel: 1, casillero: 1, estado_ocupacion: true, capacidad_peso_kg: 100, tipo_estante: 'general' },
    { id_ubicacion: 2, pasillo: 'A', estante: 1, nivel: 1, casillero: 2, estado_ocupacion: false, capacidad_peso_kg: 100, tipo_estante: 'general' },
  ],
  categorias: [{ id_categoria: 1, slug: 'electronica', nombre: 'Electronica' }, { id_categoria: 2, slug: 'otro', nombre: 'Otro' }],
  proveedores: [{ id_proveedor: 11, nombre_empresa: 'Proveedor Demo', contacto: '999999999' }],
  medidas: [{ id_medida: 1, nombre: 'Mediana', largo: 10, ancho: 10, alto: 10, volumen: 1000 }],
  usuarios: [{ id_usuario: 5, nombre: 'Operador Demo', rol: 'operador' }],
  vehiculos: [{ id_vehiculo: 7, placa: 'ABC-123', marca: 'Toyota', capacidad_kg: 1000 }],
  destinos: [{ id_destino: 3, nombre: 'Almacen Norte', direccion: 'Av. Norte 123' }],
  stock: {
    items: [{ id: 'CAJ-002', producto: 'Monitor', categoria: 'electronica', cantidad: 3, unidad: 'unidades', peso_total_kg: 15, ubicacion: 'A1-N1', proveedor: 'Proveedor Demo', fecha_ingreso: '2026-07-11T10:00:00Z', estado: 'almacenada' }],
    resumen: { unidades: 3, referencias: 1, almacenadas: 3, en_transito: 0, peso_total_kg: 15 },
  },
  inventario: { items: [{ id: 'CAJ-002', producto: 'Monitor', disponible: 3 }] },
  movimientos: [{ id_movimiento: 1, producto: 'Monitor', tipo: 'entrada', cantidad: 3, existencia_posterior: 3, fecha: '2026-07-11T10:00:00Z' }],
  alertas: [{ tipo: 'stock_minimo', producto: 'Monitor', actual: 3 }],
  planillas: [
    { id_planilla: 1, total_cajas: 2, completada: false, operador: 5, operador_nombre: 'Operador Demo', fecha_creacion: '2026-07-11T10:00:00Z', cajas_ids: ['CAJ-001', 'CAJ-002'] },
    { id_planilla: 2, total_cajas: 1, completada: true, operador: 5, operador_nombre: 'Operador Demo', fecha_creacion: '2026-07-10T10:00:00Z', cajas_ids: ['CAJ-003'] },
  ],
};

const clone = (value) => JSON.parse(JSON.stringify(value));

async function installMocks(page, options = {}) {
  const data = { ...clone(base), ...clone(options.data || {}) };
  const requests = [];
  const failures = new Set(options.failures || []);
  const session = options.session || admin;

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (!path.startsWith('/api/')) {
      await route.continue();
      return;
    }
    const method = request.method();
    requests.push({ path, method, search: url.search, body: request.postDataJSON?.() });

    if (failures.has(path)) {
      await route.fulfill({ status: 500, json: { error: 'Fallo simulado de integracion' } });
      return;
    }
    const json = (payload, status = 200) => route.fulfill({ status, json: payload });
    if (path === '/api/me/') return json(session);
    if (path === '/api/cajas/sugerir_id/') return json({ id_sugerido: 'CAJ-010' });
    if (path === '/api/cajas/previsualizar_lote/') return json(options.preview || { cajas: [{ id: 'CAJ-001', producto: 'Laptop', peso_kg: 10, categoria: 'electronica', sugerida_id: 2, sugerida_nombre: 'A1-N1-C2' }], paradas: [], total_cajas: 1, peso_total: 10 });
    if (path === '/api/cajas/procesar_lote/') return json({ mensaje: 'Planilla creada. Guía lista para revisión.', pdf_url: '/api/cajas/descargar_pdf_lote/?cajas=CAJ-001&usuario_id=1' });
    if (/^\/api\/cajas\/[^/]+\/(procesar|confirmar_almacenada)\/$/.test(path)) return json({ mensaje: 'Operacion completada' });
    if (path === '/api/cajas/' && method === 'POST') return json({ id: request.postDataJSON().id, estado: 'pendiente' }, 201);
    if (path === '/api/cajas/') return json({ results: data.cajas });
    if (path === '/api/ubicaciones/') return json({ results: data.ubicaciones });
    if (path === '/api/historial/') return json({ results: [{ id_historial: 1, id_caja_id: 'CAJ-001', estado_nuevo: 'pendiente', fecha_cambio: '2026-07-12T10:00:00Z' }] });
    if (path === '/api/despachos/') return json({ results: [] });
    if (path === '/api/categorias/') return json({ results: data.categorias });
    if (path === '/api/proveedores/') return json({ results: data.proveedores });
    if (path === '/api/medidas/') return json({ results: data.medidas });
    if (path === '/api/usuarios/') return json({ results: data.usuarios });
    if (path === '/api/vehiculos/') return json({ results: data.vehiculos });
    if (path === '/api/destinos/') return json({ results: data.destinos });
    if (/^\/api\/(vehiculos|proveedores|destinos)\/[^/]+\/$/.test(path)) return json({}, method === 'DELETE' ? 204 : 200);
    if (path === '/api/stock/exportar/') return route.fulfill({ status: 200, body: 'xlsx', headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } });
    if (path === '/api/stock/') return json(data.stock);
    if (path === '/api/inventario/kardex/') return json(data.movimientos);
    if (path === '/api/inventario/alertas/') return json(data.alertas);
    if (path === '/api/inventario/reservar/') return json({ ok: true }, 201);
    if (path === '/api/inventario/despachar_lote/') return json({ ok: true }, 201);
    if (path === '/api/inventario/') return json(data.inventario);
    if (path === '/api/politicas-stock/') return method === 'GET' ? json({ results: [] }) : json({ ok: true }, 201);
    if (/^\/api\/(usuarios|medidas|politicas-stock)\/[^/]+\/$/.test(path)) return json({}, method === 'DELETE' ? 204 : 200);
    if (/^\/api\/planillas\/\d+\/completar\/$/.test(path)) return json({ ok: true });
    if (path === '/api/planillas/') return json({ results: data.planillas });
    return json({ results: [] });
  });

  await page.route('**/suscripcion/estado/', (route) => route.fulfill({ json: options.subscription || { authenticated: true, configured: true, active: false, status: 'none', has_customer: false } }));
  await page.route('**/suscripcion/cotizacion/', (route) => route.fulfill({ json: { mensaje: 'Solicitud recibida.' } }));
  return { data, requests };
}

test.describe('Sesion, acceso y navegacion', () => {
  test('T01 login muestra campos y accion principal', async ({ page }) => {
    await installMocks(page); await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Acceso al sistema' })).toBeVisible();
    await expect(page.getByPlaceholder('Tu usuario')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ingresar al sistema' })).toBeVisible();
  });
  test('T02 login permite mostrar y ocultar la contrasena', async ({ page }) => {
    await installMocks(page); await page.goto('/login');
    const password = page.getByPlaceholder(/Tu contrase/); await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: /Mostrar contrase/ }).click(); await expect(password).toHaveAttribute('type', 'text');
  });
  test('T03 login comunica credenciales incorrectas', async ({ page }) => {
    await installMocks(page); await page.goto('/login?error=1');
    await expect(page.getByRole('alert')).toContainText(/credenciales no son correctas/i);
  });
  test('T04 cambio de tema persiste en almacenamiento local', async ({ page }) => {
    await installMocks(page); await page.goto('/login');
    await page.getByRole('button', { name: /Activar tema claro/ }).click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe('light');
  });
  test('T05 administrador ve accesos administrativos', async ({ page }) => {
    await installMocks(page); await page.goto('/');
    await expect(page.getByRole('button', { name: /Administraci/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Nueva caja/ }).first()).toBeVisible();
  });
  test('T06 operador no ve accesos administrativos', async ({ page }) => {
    await installMocks(page, { session: operator }); await page.goto('/');
    await expect(page.getByRole('button', { name: /Administraci/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Nueva caja/ })).toHaveCount(0);
  });
  test('T07 operador recibe acceso denegado en ruta protegida', async ({ page }) => {
    await installMocks(page, { session: operator }); await page.goto('/configuracion');
    await expect(page.getByText('Acceso Denegado')).toBeVisible();
  });
  test('T08 busqueda global navega a stock con el termino', async ({ page }) => {
    await installMocks(page); await page.goto('/');
    await page.getByPlaceholder('Buscar caja').fill('CAJ-002'); await page.getByPlaceholder('Buscar caja').press('Enter');
    await expect(page).toHaveURL(/\/stock\?search=CAJ-002/);
  });
});

test.describe('Dashboard operativo', () => {
  test('T09 presenta titulo y contexto operativo', async ({ page }) => { await installMocks(page); await page.goto('/'); await expect(page.getByText('Dashboard')).toBeVisible(); });
  test('T10 excluye cajas despachadas del total activo', async ({ page }) => { await installMocks(page); await page.goto('/'); await expect(page.getByText('Total cajas').locator('..')).toContainText('2'); });
  test('T11 cuenta cajas pendientes', async ({ page }) => { await installMocks(page); await page.goto('/'); await expect(page.getByText('Pendientes').locator('..')).toContainText('1'); });
  test('T12 calcula ocupacion fisica', async ({ page }) => { await installMocks(page); await page.goto('/'); await expect(page.getByText(/Ocupaci.n/, { exact: false }).last()).toBeVisible(); await expect(page.getByText('50%', { exact: true }).first()).toBeVisible(); });
  test('T13 filtra cajas por estado', async ({ page }) => { await installMocks(page); await page.goto('/'); await page.getByText('Almacenada', { exact: true }).first().click(); await expect(page.getByText('Monitor')).toBeVisible(); await expect(page.getByText('Laptop')).toHaveCount(0); });
  test('T14 filtra cajas por categoria', async ({ page }) => { await installMocks(page); await page.goto('/'); await page.getByText('Otro', { exact: true }).first().click(); await expect(page.getByText('No hay cajas que coincidan con los filtros.')).toBeVisible(); });
  test('T15 procesamiento confirmado invoca accion de caja', async ({ page }) => { const ctx = await installMocks(page); await page.goto('/'); await page.getByRole('button', { name: /Procesar/ }).click(); await page.getByRole('button', { name: 'Confirmar' }).click(); await expect.poll(() => ctx.requests.some((r) => r.path === '/api/cajas/CAJ-001/procesar/')).toBe(true); });
  test('T16 navbar informa pendientes reales', async ({ page }) => { await installMocks(page); await page.goto('/'); await expect(page.getByText('1 pendientes')).toBeVisible(); });
  test('T51 pagina la lista de cajas activas sin alargar el dashboard', async ({ page }) => {
    const cajas = Array.from({ length: 10 }, (_, index) => ({ ...base.cajas[0], id: `CAJ-${String(index + 20).padStart(3, '0')}`, producto: `Producto ${index + 1}` }));
    await installMocks(page, { data: { cajas } }); await page.goto('/');
    await expect(page.getByText('1-8 de 10')).toBeVisible();
    await expect(page.getByText('Producto 9')).toHaveCount(0);
    await page.getByRole('button', { name: 'Página siguiente' }).click();
    await expect(page.getByText('9-10 de 10')).toBeVisible();
    await expect(page.getByText('Producto 9')).toBeVisible();
  });
  test('T52 grafico ocupa el ancho disponible y permite cambiar rango', async ({ page }) => {
    await installMocks(page); await page.goto('/');
    const chart = page.locator('.dashboard-chart');
    const canvas = page.locator('.dashboard-chart__canvas');
    await expect(chart).toBeVisible(); await expect(canvas).toBeVisible();
    const sizes = await page.evaluate(() => ({ chart: document.querySelector('.dashboard-chart').getBoundingClientRect().width, canvas: document.querySelector('.dashboard-chart__canvas').getBoundingClientRect().width }));
    expect(sizes.canvas).toBeGreaterThan(sizes.chart * 0.9);
    await page.getByRole('button', { name: '30 días' }).click();
    await expect(page.getByRole('button', { name: '30 días' })).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('Mapa de almacen', () => {
  test('T17 carga el titulo del mapa', async ({ page }) => { await installMocks(page); await page.goto('/almacen'); await expect(page.getByRole('heading', { name: /Mapa del almac/ })).toBeVisible(); });
  test('T18 resume ubicaciones totales', async ({ page }) => { await installMocks(page); await page.goto('/almacen'); await expect(page.getByText('Ubicaciones').locator('..')).toContainText('2'); });
  test('T19 resume ubicaciones ocupadas', async ({ page }) => { await installMocks(page); await page.goto('/almacen'); await expect(page.getByText('Ocupadas').locator('..')).toContainText('1'); });
  test('T20 diferencia espacios y muestra el contenido asociado', async ({ page }) => { await installMocks(page); await page.goto('/almacen'); await expect(page.locator('.warehouse-slot.is-selected')).toHaveCount(1); await expect(page.locator('.warehouse-slot.is-free')).toHaveCount(1); await expect(page.locator('.status-badge').filter({ hasText:'Ocupado' })).toBeVisible(); await expect(page.getByText('Monitor')).toBeVisible(); });
  test('T21 mapa no desborda viewport movil', async ({ page }) => { await page.setViewportSize({ width: 390, height: 844 }); await installMocks(page); await page.goto('/almacen'); const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth); expect(overflow).toBe(false); });
  test('T53 detalle de almacen mantiene margenes y etiquetas completas', async ({ page }) => { await installMocks(page); await page.goto('/almacen'); await expect(page.getByText('Pasillo A · Estante 1 · Nivel 1')).toBeVisible(); const overflow = await page.evaluate(() => document.querySelector('.warehouse-layout').scrollWidth > document.querySelector('.warehouse-layout').clientWidth); expect(overflow).toBe(false); });
});

test.describe('Stock e inventario', () => {
  test('T22 muestra resumen de stock', async ({ page }) => { await installMocks(page); await page.goto('/stock'); await expect(page.getByRole('heading', { name: 'Stock', exact: true })).toBeVisible(); await expect(page.getByText('15.0 kg')).toBeVisible(); });
  test('T23 lista existencias con ubicacion', async ({ page }) => { await installMocks(page); await page.goto('/stock'); await expect(page.getByText('Monitor').first()).toBeVisible(); await expect(page.getByText('A1-N1')).toBeVisible(); });
  test('T24 comunica estado vacio', async ({ page }) => { await installMocks(page, { data: { stock: { items: [], resumen: {} } } }); await page.goto('/stock'); await expect(page.getByText('No hay stock para este periodo')).toBeVisible(); });
  test('T25 precarga busqueda recibida por URL', async ({ page }) => { await installMocks(page); await page.goto('/stock?search=Monitor'); await expect(page.getByPlaceholder('Producto o ID')).toHaveValue('Monitor'); });
  test('T26 aplica filtros mediante nueva consulta', async ({ page }) => { const ctx = await installMocks(page); await page.goto('/stock'); await page.getByPlaceholder('Producto o ID').fill('Laptop'); await page.getByRole('button', { name: /Aplicar filtros/ }).click(); await expect.poll(() => ctx.requests.some((r) => r.path === '/api/stock/' && r.search.includes('search=Laptop'))).toBe(true); });
  test('T27 reserva stock disponible', async ({ page }) => { const ctx = await installMocks(page); await page.goto('/stock'); const panel = page.locator('section').filter({ hasText: 'Reservar existencias' }); await panel.locator('select').selectOption('CAJ-002'); await panel.getByPlaceholder('Destino o pedido').fill('PED-1'); await panel.getByRole('button', { name: 'Reservar' }).click(); await expect.poll(() => ctx.requests.some((r) => r.path === '/api/inventario/reservar/' && r.method === 'POST')).toBe(true); });
  test('T28 guarda politica de stock desde configuracion', async ({ page }) => { const ctx = await installMocks(page); await page.goto('/configuracion'); await page.getByText('Producto exacto').locator('..').getByRole('textbox').fill('Monitor'); await page.getByRole('button', { name: /Agregar pol/ }).click(); await expect.poll(() => ctx.requests.some((r) => r.path === '/api/politicas-stock/' && r.method === 'POST')).toBe(true); });
  test('T29 muestra alertas activas', async ({ page }) => { await installMocks(page); await page.goto('/stock'); await expect(page.getByText('stock minimo', { exact: false })).toBeVisible(); });
  test('T30 muestra kardex reciente', async ({ page }) => { await installMocks(page); await page.goto('/stock'); await expect(page.getByText('saldo 3')).toBeVisible(); });
  test('T31 presenta error recuperable si falla stock', async ({ page }) => { await installMocks(page, { failures: ['/api/stock/'] }); await page.goto('/stock'); await expect(page.getByRole('alert')).toContainText('Fallo simulado de integracion'); });
});

test.describe('Registro de cajas', () => {
  test('T32 sugiere identificador de caja', async ({ page }) => { await installMocks(page); await page.goto('/nueva-caja'); await expect(page.locator('#caja-id')).toHaveValue('CAJ-010'); });
  test('T33 valida campos obligatorios con contexto', async ({ page }) => { await installMocks(page); await page.goto('/nueva-caja'); await page.getByRole('button', { name: /Agregar a la cola/ }).click(); await expect(page.locator('#caja-producto')).toHaveAttribute('aria-invalid', 'true'); });
  test('T34 calcula peso unitario desde total', async ({ page }) => { await installMocks(page); await page.goto('/nueva-caja'); await page.locator('#caja-peso').fill('12'); await page.locator('input[type="number"]').nth(1).fill('3'); await expect(page.getByText('4.00 kg', { exact: false })).toBeVisible(); });
  test('T35 crea caja con proveedor y medida', async ({ page }) => { const ctx = await installMocks(page); await page.goto('/nueva-caja'); await page.locator('#caja-producto').fill('Teclado'); await page.locator('#caja-peso').fill('4'); await page.locator('#caja-proveedor').selectOption('11'); await page.locator('#caja-medida').selectOption('1'); await page.getByRole('button', { name: /Agregar a la cola/ }).click(); await expect.poll(() => ctx.requests.some((r) => r.path === '/api/cajas/' && r.method === 'POST')).toBe(true); });
  test('T36 registra responsable desde la sesion autenticada', async ({ page }) => { await installMocks(page); await page.goto('/nueva-caja'); await page.getByRole('button', { name: /Revisar cola y ubicaciones/ }).click(); await expect(page.getByText(/responsable se registra automáticamente/i)).toBeVisible(); });
  test('T55 crea la planilla y previsualiza la guia sin abrir otra pestana', async ({ page, context }) => {
    const ctx = await installMocks(page); await page.goto('/nueva-caja');
    const pagesBefore = context.pages().length;
    await page.getByRole('button', { name: /Revisar cola y ubicaciones/ }).click();
    await page.getByRole('button', { name: /Crear planilla y generar guía/ }).click();
    await expect(page.getByRole('heading', { name: 'Guía de trabajo lista' })).toBeVisible();
    await expect(page.getByTitle('Vista previa de la guía generada')).toHaveAttribute('src', /preview=true/);
    await expect(page.getByRole('link', { name: /Descargar PDF/ })).toBeVisible();
    expect(context.pages().length).toBe(pagesBefore);
    expect(ctx.requests.some(request => request.path === '/api/cajas/procesar_lote/' && request.method === 'POST')).toBe(true);
  });
  test('T57 bloquea casilleros incompatibles en la asignacion manual', async ({ page }) => {
    await installMocks(page, {
      data: { ubicaciones: [
        ...base.ubicaciones,
        { id_ubicacion: 3, pasillo: 'A', estante: 1, nivel: 1, lado: 'posterior', casillero: 1, estado_ocupacion: false, capacidad_peso_kg: 40, tipo_estante: 'quimico' },
      ] },
      preview: { cajas: [{ id: 'CAJ-001', producto: 'Laptop', peso_kg: 10, peso_total_kg: 20, categoria: 'electronica', sugerida_id: 2, sugerida_nombre: 'A1-N1-C2', ubicaciones_compatibles_ids: [2], recomendacion: { score: 86 } }], peso_total: 20 },
    });
    await page.goto('/nueva-caja');
    await page.getByRole('button', { name: /Revisar cola y ubicaciones/ }).click();
    await expect(page.locator('.warehouse-slot.is-unavailable')).toHaveCount(2);
    await expect(page.locator('.warehouse-slot.is-unavailable').last()).toBeDisabled();
    await expect(page.locator('.warehouse-slot.is-selected')).toHaveCount(1);
  });
});

test.describe('Despachos', () => {
  test('T37 muestra carga almacenada disponible', async ({ page }) => { await installMocks(page); await page.goto('/despachos'); await expect(page.getByText('Monitor')).toBeVisible(); await expect(page.getByText('Laptop')).toHaveCount(0); });
  test('T38 seleccionar todas actualiza contador', async ({ page }) => { await installMocks(page); await page.goto('/despachos'); await page.locator('.select-all input').check(); await expect(page.getByText('Seleccionadas').locator('..')).toContainText('1'); });
  test('T39 confirmar permanece deshabilitado sin transporte', async ({ page }) => { await installMocks(page); await page.goto('/despachos'); await page.locator('.select-all input').check(); await expect(page.getByRole('button', { name: /Confirmar despacho/ })).toBeDisabled(); });
  test('T40 registra despacho con vehiculo y destino', async ({ page }) => { const ctx = await installMocks(page); await page.goto('/despachos'); await page.locator('.select-all input').check(); const panel = page.locator('section').filter({ hasText: 'Registrar salida' }); await panel.locator('select').nth(0).selectOption('ABC-123'); await panel.locator('select').nth(1).selectOption('Almacen Norte'); await page.getByRole('button', { name: /Confirmar despacho/ }).click(); await expect.poll(() => ctx.requests.some((r) => r.path === '/api/inventario/despachar_lote/' && r.method === 'POST')).toBe(true); });
  test('T41 comunica estado sin despachos previos', async ({ page }) => { await installMocks(page); await page.goto('/despachos'); await expect(page.getByText('Sin despachos registrados')).toBeVisible(); });
});

test.describe('Administracion y configuracion', () => {
  test('T42 presenta los cuatro catalogos', async ({ page }) => { await installMocks(page); await page.goto('/administracion'); for (const title of ['Usuarios', 'Vehiculos', 'Proveedores', 'Destinos']) await expect(page.getByRole('heading', { name: new RegExp(title.replace('Vehiculos', 'Veh[ií]culos')) })).toBeVisible(); });
  test('T43 administrador dispone de CRUD de usuarios', async ({ page }) => { await installMocks(page); await page.goto('/administracion'); const users = page.locator('section').filter({ hasText: 'Usuarios' }); await expect(users.getByRole('button', { name: /Nuevo/ })).toBeVisible(); await expect(users.getByRole('button', { name: /Editar/ })).toBeVisible(); });
  test('T44 edicion de vehiculo usa id interno', async ({ page }) => { const ctx = await installMocks(page); await page.goto('/administracion'); const vehicles = page.locator('section').filter({ hasText: /Veh[ií]culos/ }); await vehicles.getByRole('button', { name: 'Editar' }).click(); await page.getByPlaceholder('Marca / Modelo').fill('Volvo'); await page.getByRole('button', { name: 'Guardar cambios' }).click(); await expect.poll(() => ctx.requests.some((r) => r.path === '/api/vehiculos/7/' && r.method === 'PATCH')).toBe(true); });
  test('T45 modal administrativo cierra con Escape', async ({ page }) => { await installMocks(page); await page.goto('/administracion'); await page.locator('section').filter({ hasText: 'Destinos' }).getByRole('button', { name: 'Nuevo' }).click(); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0); });
  test('T46 configuracion contiene politicas de stock', async ({ page }) => { await installMocks(page); await page.goto('/configuracion'); await expect(page.getByRole('heading', { name: /Configuraci/ })).toBeVisible(); await expect(page.getByRole('heading', { name: /Pol.ticas de stock/ })).toBeVisible(); });
  test('T47 configuracion local guarda preferencias de IA', async ({ page }) => { await installMocks(page); await page.goto('/configuracion'); await page.getByRole('button', { name: /Guardar IA local/ }).click(); await expect(page.getByText(/Configuraci.*local guardada/)).toBeVisible(); });
  test('T54 catalogos administrativos respetan la cuadricula sin desbordar', async ({ page }) => { await installMocks(page); await page.goto('/administracion'); await expect(page.locator('.admin-catalog-grid')).toBeVisible(); const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth); expect(overflow).toBe(false); });
});

test.describe('Planillas, PDF y suscripcion', () => {
  test('T48 planillas filtra pendientes y completadas', async ({ page }) => { await installMocks(page); await page.goto('/planillas'); await page.getByRole('tab', { name: 'Pendientes' }).click(); await expect(page.getByText('Planilla 1')).toBeVisible(); await expect(page.getByText('Planilla 2')).toHaveCount(0); });
  test('T49 visor PDF conserva parametros operativos', async ({ page }) => { await installMocks(page); await page.goto('/ver-pdf-lote?cajas=CAJ-001&usuario_id=5'); const frame = page.getByTitle(/Vista previa/); await expect(frame).toHaveAttribute('src', /cajas=CAJ-001.*usuario_id=5.*preview=true/); });
  test('T50 suscripcion muestra estado y envia cotizacion', async ({ page }) => { await installMocks(page); await page.goto('/suscripcion'); await expect(page.getByRole('heading', { name: /Suscripci/ })).toBeVisible(); await page.getByPlaceholder('Empresa').fill('Logistica SAC'); await page.getByPlaceholder('Correo de contacto').fill('contacto@example.com'); await page.getByRole('button', { name: /Solicitar cotizaci/ }).click(); await expect(page.getByRole('status')).toContainText('Solicitud recibida.'); });
  test('T56 previsualiza una planilla existente dentro de la misma vista', async ({ page, context }) => { await installMocks(page); await page.goto('/planillas'); const pagesBefore = context.pages().length; const previews = page.getByRole('button', { name: 'Previsualizar' }); await expect(previews).toHaveCount(2); await previews.first().click(); await expect(page.getByRole('heading', { name: 'Vista previa de la planilla' })).toBeVisible(); await expect(page.getByTitle('Vista previa de la guía generada')).toHaveAttribute('src', /preview=true/); expect(context.pages().length).toBe(pagesBefore); });
});
