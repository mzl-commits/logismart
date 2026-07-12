# Despliegue

1. Configurar las variables de producción en `.env`.
2. Instalar dependencias y ejecutar migraciones.
3. Generar los estáticos del frontend.
4. Servir Django detrás de Nginx mediante Daphne.

```bash
cd /home/yuri/proyecto_logistica
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
cd logismart-frontend && npm ci && npm run build
cd ..
python manage.py collectstatic --noinput
python manage.py check --deploy
sudo systemctl restart logismart.service
sudo systemctl reload nginx
```

La base de datos de producción debe ser PostgreSQL. SQLite queda reservado para desarrollo local.
