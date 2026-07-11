from celery import shared_task
from django.utils import timezone

from .models import Caja, PoliticaStock


@shared_task
def snapshot_alertas_stock():
    """Calcula alertas periódicas; preparado para correo, webhook o notificación móvil."""
    alerts = []
    for policy in PoliticaStock.objects.filter(activa=True):
        quantity = sum(Caja.objects.filter(producto__iexact=policy.producto).exclude(estado='despachada').values_list('cantidad', flat=True))
        if quantity <= policy.minimo:
            alerts.append({'producto': policy.producto, 'tipo': 'stock_bajo', 'cantidad': quantity})
    return {'generado': timezone.now().isoformat(), 'alertas': alerts}
