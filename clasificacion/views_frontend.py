from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from .models import Caja, Ubicacion, HistorialMovimientos, Medida, Proveedor, Usuario, Categoria, ConfigCarro, Vehiculo, Destino, SolicitudDespacho
from .services import ClasificadorCajas, OptimizadorUbicaciones


@login_required
def dashboard(request):
    # Solo cajas activas (excluye despachadas)
    cajas_activas = Caja.objects.exclude(estado='despachada').select_related(
        'id_medida', 'id_proveedor', 'id_ubicacion'
    ).order_by('-hora_llegada')[:30]

    # Pre-calcular recomendación para pendientes
    recomendaciones = {}
    for caja in cajas_activas:
        if caja.estado == 'pendiente':
            try:
                clasificacion = ClasificadorCajas.clasificar(caja)
                mejor_ubi, detalle = OptimizadorUbicaciones.encontrar_mejor_ubicacion(
                    clasificacion, caja=caja, incluir_detalle=True
                )
                recomendaciones[caja.id] = {
                    'nombre': str(mejor_ubi) if mejor_ubi else None,
                    'score': detalle.get('score') if detalle else None,
                }
            except Exception:
                recomendaciones[caja.id] = {'nombre': None, 'score': None}

    total_ubicaciones = Ubicacion.objects.count()
    ocupadas = Ubicacion.objects.filter(estado_ocupacion=True).count()

    from django.utils import timezone
    from datetime import timedelta
    from django.db.models.functions import TruncDate
    from django.db.models import Count

    # Datos para gráfico (últimos 7 días)
    hoy = timezone.now().date()
    hace_7_dias = hoy - timedelta(days=6)
    
    # Ingresos (Cajas creadas)
    ingresos_qs = Caja.objects.filter(hora_llegada__date__gte=hace_7_dias) \
        .annotate(fecha=TruncDate('hora_llegada')) \
        .values('fecha').annotate(total=Count('id')).order_by('fecha')
    
    # Salidas (Despachos creados)
    from .models import Despacho
    salidas_qs = Despacho.objects.filter(fecha_salida__date__gte=hace_7_dias) \
        .annotate(fecha=TruncDate('fecha_salida')) \
        .values('fecha').annotate(total=Count('id_despacho')).order_by('fecha')

    import json
    
    dict_ingresos = {item['fecha'].strftime('%Y-%m-%d'): item['total'] for item in ingresos_qs}
    dict_salidas = {item['fecha'].strftime('%Y-%m-%d'): item['total'] for item in salidas_qs}

    fechas_chart = [(hace_7_dias + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(7)]
    chart_ingresos = [dict_ingresos.get(f, 0) for f in fechas_chart]
    chart_salidas = [dict_salidas.get(f, 0) for f in fechas_chart]
    fechas_labels = [(hace_7_dias + timedelta(days=i)).strftime('%d %b') for i in range(7)]

    return render(request, 'clasificacion/dashboard.html', {
        'cajas_activas': cajas_activas,
        'recomendaciones_json': json.dumps(recomendaciones),
        'total_cajas': Caja.objects.exclude(estado='despachada').count(),
        'cajas_pendientes': Caja.objects.filter(estado='pendiente').count(),
        'cajas_transito': Caja.objects.filter(estado='en_transito').count(),
        'cajas_almacenadas': Caja.objects.filter(estado='almacenada').count(),
        'total_ubicaciones': total_ubicaciones,
        'ubicaciones_ocupadas': ocupadas,
        'ubicaciones_libres': total_ubicaciones - ocupadas,
        'pct_ocupacion': round((ocupadas / total_ubicaciones * 100) if total_ubicaciones else 0),
        'historial_reciente': HistorialMovimientos.objects.select_related(
            'id_caja', 'id_usuario'
        ).order_by('-fecha_cambio')[:15],
        'categorias': Categoria.objects.all(),
        'chart_labels_json': json.dumps(fechas_labels),
        'chart_ingresos_json': json.dumps(chart_ingresos),
        'chart_salidas_json': json.dumps(chart_salidas),
        'usuarios': Usuario.objects.all(),
        'vehiculos': Vehiculo.objects.all(),
        'destinos': Destino.objects.all(),
    })



@login_required
def almacen_visual(request):
    return render(request, 'clasificacion/almacen_visual.html')


@login_required
def nueva_caja(request):
    if not request.user.is_superuser:
        return redirect('/?error=no_access')
    return render(request, 'clasificacion/nueva_caja.html', {
        'proveedores': Proveedor.objects.all(),
        'medidas': Medida.objects.all(),
        'usuarios': Usuario.objects.all(),
        'categorias': Categoria.objects.all(),
    })


@login_required
def configuracion(request):
    if not request.user.is_superuser:
        return redirect('/?error=no_access')
    carro_id = int(request.GET.get('carro_id', 1))
    if carro_id not in [1, 2]:
        carro_id = 1
    config = ConfigCarro.get_config(carro_id)
    medidas = list(Medida.objects.all())
    cart_vol = config.volumen_cm3
    cart_peso = float(config.peso_maximo_kg)

    breakdown = []
    for m in medidas:
        vol_m = float(m.volumen) if m.volumen else 0
        caben_vol = int(cart_vol / vol_m) if vol_m > 0 else None
        if vol_m == 0:
            tamano = 'indefinido'
        elif vol_m <= 8000:
            tamano = 'pequena'
        elif vol_m <= 64000:
            tamano = 'mediana'
        else:
            tamano = 'grande'
        breakdown.append({
            'medida': m,
            'vol_cm3': round(vol_m),
            'caben_vol': caben_vol,
            'tamano': tamano,
        })

    # Medida representativa mas pequeña de cada tipo
    def _primero(tipo):
        found = [b for b in breakdown if b['tamano'] == tipo]
        return max(found, key=lambda x: x['caben_vol'] or 0)['caben_vol'] if found else 0

    resumen = {
        'pequenas': _primero('pequena'),
        'medianas': _primero('mediana'),
        'grandes':  _primero('grande'),
    }

    return render(request, 'clasificacion/configuracion.html', {
        'config': config,
        'carro_id': carro_id,
        'breakdown': breakdown,
        'resumen': resumen,
        'cart_vol': round(cart_vol),
    })


@login_required
def despachos(request):
    from .models import Despacho
    cajas_almacenadas = Caja.objects.filter(estado='almacenada')
    historial_despachos = Despacho.objects.select_related('id_caja', 'id_usuario_despacho').order_by('-fecha_salida')[:50]
    
    return render(request, 'clasificacion/despachos.html', {
        'cajas_almacenadas': cajas_almacenadas,
        'historial_despachos': historial_despachos,
        'usuarios': Usuario.objects.all(),
        'vehiculos': Vehiculo.objects.all(),
        'destinos': Destino.objects.all(),
    })


@login_required
def administracion(request):
    if not request.user.is_superuser:
        return redirect('/?error=no_access')
    return render(request, 'clasificacion/administracion.html', {
        'usuarios': Usuario.objects.all(),
        'proveedores': Proveedor.objects.all(),
        'vehiculos': Vehiculo.objects.all(),
        'destinos': Destino.objects.all(),
        'solicitudes_pendientes': SolicitudDespacho.objects.filter(estado='pendiente').select_related('usuario_solicita', 'operador_responsable'),
    })


def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    
    error = None
    if request.method == 'POST':
        u = request.POST.get('username')
        p = request.POST.get('password')
        user = authenticate(request, username=u, password=p)
        if user is not None:
            auth_login(request, user)
            next_url = request.GET.get('next', 'dashboard')
            if not next_url or not next_url.startswith('/'):
                next_url = '/'
            return redirect(next_url)
        else:
            error = "Usuario o contraseña incorrectos."
            
    return render(request, 'clasificacion/login.html', {'error': error})


def logout_view(request):
    auth_logout(request)
    return redirect('login')