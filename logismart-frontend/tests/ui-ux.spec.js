import { test, expect } from '@playwright/test';

const adminSession = {
  is_authenticated: true,
  username: 'admin.demo',
  is_superuser: true,
  is_staff: true,
};

const operatorSession = {
  is_authenticated: true,
  username: 'operador.demo',
  is_superuser: false,
  is_staff: false,
};

async function mockApi(page, { session = adminSession, vehicles = [] } = {}) {
  await page.route('**/api/me/', (route) => route.fulfill({ json: session }));
  await page.route('**/api/cajas/', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, json: { id: 'CAJ-002', estado: 'pendiente' } });
      return;
    }
    await route.fulfill({ json: { results: [{ id: 'CAJ-001', producto: 'Caja demo', estado: 'pendiente' }] } });
  });
  await page.route('**/api/cajas/sugerir_id/', (route) => route.fulfill({ json: { id_sugerido: 'CAJ-002' } }));
  await page.route('**/api/proveedores/', (route) => route.fulfill({ json: { results: [{ id_proveedor: 11, nombre_empresa: 'Proveedor demo', contacto: '999999999' }] } }));
  await page.route('**/api/destinos/', (route) => route.fulfill({ json: { results: [{ id_destino: 3, nombre: 'Almacen Norte', direccion: 'Av. Norte 123' }] } }));
  await page.route('**/api/usuarios/', (route) => route.fulfill({ json: { results: [{ id_usuario: 5, nombre: 'Operador demo', rol: 'operador' }] } }));
  await page.route('**/api/vehiculos/', (route) => route.fulfill({ json: { results: vehicles } }));
  await page.route('**/api/categorias/', (route) => route.fulfill({ json: { results: [{ id: 1, slug: 'electronica', nombre: 'Electronica' }] } }));
  await page.route('**/api/medidas/', (route) => route.fulfill({ json: { results: [{ id_medida: 1, nombre: 'Mediana', largo: 10, ancho: 10, alto: 10 }] } }));
  await page.route('**/api/ubicaciones/', (route) => route.fulfill({ json: { results: [] } }));
  await page.route('**/api/despachos/', (route) => route.fulfill({ json: { results: [] } }));
}

test.describe('Formularios y feedback', () => {
  test('Nueva Caja valida campos, envia el payload y muestra confirmacion', async ({ page }) => {
    let payload;
    await mockApi(page);
    await page.route('**/api/cajas/', async (route) => {
      if (route.request().method() === 'POST') {
        payload = route.request().postDataJSON();
        await route.fulfill({ status: 201, json: { id: payload.id, estado: 'pendiente' } });
        return;
      }
      await route.fulfill({ json: { results: [{ id: 'CAJ-001', producto: 'Caja demo', estado: 'pendiente' }] } });
    });

    await page.goto('/nueva-caja');
    await expect(page.getByText('Registrar Cajas')).toBeVisible();

    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#caja-producto')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Por favor completa todos los campos marcados en rojo.')).toBeVisible();

    await page.locator('#caja-id').fill('CAJ-002');
    await page.locator('#caja-producto').fill('Laptop de prueba');
    await page.locator('#caja-peso').fill('10');
    await page.locator('#caja-proveedor').selectOption('11');
    await page.locator('#caja-medida').selectOption('1');
    await page.locator('#caja-refrigeracion').check();
    await page.locator('button[type="submit"]').click();

    await expect.poll(() => payload).toMatchObject({
      id: 'CAJ-002',
      producto: 'Laptop de prueba',
      peso_kg: 10,
      requiere_refrigeracion: true,
      id_medida: 1,
      id_proveedor: 11,
    });
    await expect(page.getByText('Caja registrada y agregada a la cola.')).toBeVisible();
  });
});

test.describe('CRUD de administracion', () => {
  const vehicles = [{ id_vehiculo: 7, placa: 'ABC-123', marca: 'Toyota', capacidad_kg: 1000 }];

  test('edita vehiculo con su id, crea proveedor y confirma eliminacion de destino', async ({ page }) => {
    const requests = [];
    await mockApi(page, { vehicles });
    await page.route('**/api/vehiculos/7/', async (route) => {
      requests.push({ method: route.request().method(), body: route.request().postDataJSON() });
      await route.fulfill({ status: 200, json: { ...vehicles[0], marca: 'Volvo' } });
    });
    await page.route('**/api/proveedores/', async (route) => {
      if (route.request().method() === 'POST') {
        requests.push({ method: 'POST', body: route.request().postDataJSON() });
        await route.fulfill({ status: 201, json: { id_proveedor: 12, ...route.request().postDataJSON() } });
        return;
      }
      await route.fulfill({ json: { results: [{ id_proveedor: 11, nombre_empresa: 'Proveedor demo', contacto: '999999999' }] } });
    });
    await page.route('**/api/destinos/3/', async (route) => {
      requests.push({ method: route.request().method() });
      await route.fulfill({ status: 204, body: '' });
    });

    await page.goto('/administracion');
    await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible();
    await expect(page.getByText('ABC-123')).toBeVisible();

    const vehicleSection = page.locator('section').filter({ hasText: /Veh[ií]culos/ });
    await vehicleSection.getByRole('button', { name: 'Editar' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByPlaceholder('Marca / Modelo').fill('Volvo');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect.poll(() => requests.find((request) => request.method === 'PATCH')).toMatchObject({
      method: 'PATCH',
      body: { marca: 'Volvo' },
    });

    const supplierSection = page.locator('section').filter({ hasText: 'Proveedores' });
    await supplierSection.getByRole('button', { name: 'Nuevo' }).click();
    await page.getByPlaceholder('Nombre de la empresa').fill('Proveedor nuevo');
    await page.getByPlaceholder('Persona o teléfono').fill('999999999');
    await page.getByRole('button', { name: 'Crear' }).click();
    await expect.poll(() => requests.find((request) => request.method === 'POST')).toBeTruthy();

    const destinationSection = page.locator('section').filter({ hasText: 'Destinos' });
    await destinationSection.getByRole('button', { name: 'Eliminar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: /eliminar/i }).click();
    await expect.poll(() => requests.find((request) => request.method === 'DELETE')).toMatchObject({ method: 'DELETE' });
  });

  test('el modal devuelve el foco y se cierra con Escape', async ({ page }) => {
    await mockApi(page, { vehicles });
    await page.goto('/administracion');
    const trigger = page.locator('section').filter({ hasText: 'Destinos' }).getByRole('button', { name: 'Nuevo' });
    await trigger.focus();
    await trigger.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Cerrar ventana' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});

test('un operador autenticado no ve administracion ni acciones administrativas', async ({ page }) => {
  await mockApi(page, { session: operatorSession });
  await page.goto('/administracion');
  await expect(page.getByText('Acceso Denegado')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nuevo' })).toHaveCount(0);
});
