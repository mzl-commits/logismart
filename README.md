# LogiSmart 📦🤖

> **Sistema Inteligente de Gestión Logística y Control de Vehículos Automatizados (AGV)**

![Estado](https://img.shields.io/badge/Estado-Producci%C3%B3n-success)
![Versi%C3%B3n](https://img.shields.io/badge/Versi%C3%B3n-1.0.0-blue)
![Django](https://img.shields.io/badge/Django-6.0-092E20?logo=django&logoColor=white)

LogiSmart es una plataforma integral desarrollada en **Django** diseñada para modernizar la gestión de almacenes. El núcleo del sistema radica en su motor de toma de decisiones que optimiza el espacio de almacenamiento y automatiza el flujo logístico a través de la integración con **Robots AGV (Automated Guided Vehicles)** controlados por hardware externo (ESP32).

## ✨ Características Principales

* **Control de Inventario Activo**: Gestión del ciclo de vida de cajas desde su estado *Pendiente* hasta su *Despacho* en vehículos designados.
* **Smart Dispatch (API)**: Filtro inteligente y enrutamiento para que el Robot AGV recoja cajas según sus capacidades físicas máximas (peso y volumen configurables).
* **Optimización de Almacén**: Algoritmos para asignar la mejor ubicación en estanterías según compatibilidad de categorías (químicos, frágiles, etc.) y peso soportado.
* **Dashboard Gerencial**: Panel con gráficos interactivos (`Chart.js`), análisis de ocupación y seguimiento en tiempo real de operaciones.
* **Integración Hardware (ESP32)**: Comunicación serial y endpoints REST documentados (`Swagger`) para que microcontroladores externos orquesten la recolección física.
* **Gestión de Despachos y Flota**: Registro avanzado de salidas conectando cajas con vehículos y destinos preconfigurados.

## 🛠️ Tecnologías Utilizadas

* **Backend:** Python 3.12, Django 6.0, Django REST Framework.
* **Base de Datos:** SQLite (Migrable a PostgreSQL).
* **Documentación API:** drf-spectacular (Swagger UI).
* **Frontend:** HTML5, CSS (Vanilla + Custom Props), Bootstrap 5, Chart.js.

## 🚀 Instalación y Despliegue Local

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/logismart.git
   cd logismart
   ```

2. **Crear y activar el entorno virtual**
   ```bash
   python -m venv venv
   # En Windows:
   .\venv\Scripts\activate
   # En macOS/Linux:
   source venv/bin/activate
   ```

3. **Instalar dependencias**
   ```bash
   pip install -r requirements.txt
   ```
   *(Asegúrate de contar con Django, djangorestframework, drf-spectacular, corsheaders y pyserial)*

4. **Migrar la base de datos y correr el servidor**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   python manage.py runserver
   ```

## 📖 Documentación de APIs
La documentación interactiva de la API (útil para el desarrollador del Robot ESP32) se autogenera al iniciar el servidor. Puedes visualizarla en el navegador ingresando a:
👉 `http://127.0.0.1:8000/api/docs/`

---
*Desarrollado para modernizar y potenciar la inteligencia logística.*
