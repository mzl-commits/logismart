# Operación

El flujo operativo es: ingreso de caja, clasificación, asignación de ubicación, confirmación de almacenamiento y despacho.

```bash
sudo systemctl status --no-pager logismart.service
sudo journalctl -u logismart.service -n 100 --no-pager
python manage.py reconcile_warehouse
```

Antes de una actualización, respalda PostgreSQL y ejecuta las migraciones. El endpoint externo usa `X-API-Key`; no debe enviarse en URLs ni guardarse en el repositorio.
