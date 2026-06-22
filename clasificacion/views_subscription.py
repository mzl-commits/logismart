# clasificacion/views_subscription.py
"""
Vistas de Suscripción con Stripe.
Plan Básico: $300/mes
Plan Enterprise: Solicitud de cotización
"""
import stripe
import json
import logging
from django.conf import settings
from django.shortcuts import render, redirect
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required

logger = logging.getLogger('clasificacion')

stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')
STRIPE_PUBLISHABLE_KEY = getattr(settings, 'STRIPE_PUBLISHABLE_KEY', '')
STRIPE_PRICE_ID = getattr(settings, 'STRIPE_PRICE_ID', '')       # ID del precio mensual en Stripe
STRIPE_WEBHOOK_SECRET = getattr(settings, 'STRIPE_WEBHOOK_SECRET', '')


@login_required
def suscripcion_view(request):
    """Página principal de suscripción."""
    success = request.GET.get('success')
    canceled = request.GET.get('canceled')
    return render(request, 'clasificacion/suscripcion.html', {
        'stripe_key': STRIPE_PUBLISHABLE_KEY,
        'success': success,
        'canceled': canceled,
    })


@login_required
@require_POST
def crear_checkout_session(request):
    """Crea una sesión de Stripe Checkout para el plan mensual."""
    if not stripe.api_key:
        return JsonResponse({'error': 'Stripe no configurado. Contacta al administrador.'}, status=503)

    try:
        domain = request.build_absolute_uri('/').rstrip('/')
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': STRIPE_PRICE_ID,
                'quantity': 1,
            }] if STRIPE_PRICE_ID else [{
                'price_data': {
                    'currency': 'usd',
                    'unit_amount': 30000,  # $300.00 en centavos
                    'recurring': {'interval': 'month'},
                    'product_data': {
                        'name': 'LogiSmart — Plan Básico',
                        'description': 'Acceso completo al sistema LogiSmart: Dashboard, AGV, Despachos, API.',
                        'images': [],
                    },
                },
                'quantity': 1,
            }],
            mode='subscription',
            customer_email=request.user.email or None,
            success_url=domain + '/suscripcion/?success=1',
            cancel_url=domain + '/suscripcion/?canceled=1',
            metadata={
                'user_id': str(request.user.id),
                'username': request.user.username,
            },
        )
        return JsonResponse({'checkout_url': session.url})
    except stripe.StripeError as e:
        logger.error('Stripe error al crear sesión: %s', e)
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_POST
def solicitar_cotizacion(request):
    """Guarda una solicitud de cotización Enterprise."""
    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    nombre = data.get('nombre', request.user.username)
    empresa = data.get('empresa', '')
    necesidad = data.get('necesidad', '')
    email = data.get('email', request.user.email or '')

    # Log de la solicitud (en producción esto iría a un modelo o email)
    logger.info(
        'COTIZACION ENTERPRISE — Usuario: %s | Empresa: %s | Email: %s | Necesidad: %s',
        nombre, empresa, email, necesidad
    )

    return JsonResponse({
        'ok': True,
        'mensaje': 'Solicitud recibida. Te contactaremos en menos de 24 horas.'
    })


@csrf_exempt
def stripe_webhook(request):
    """Webhook de Stripe para manejar eventos de suscripción."""
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')

    if not STRIPE_WEBHOOK_SECRET:
        return HttpResponse(status=200)

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.SignatureVerificationError) as e:
        logger.warning('Webhook inválido: %s', e)
        return HttpResponse(status=400)

    event_type = event['type']
    logger.info('Stripe webhook recibido: %s', event_type)

    if event_type == 'customer.subscription.created':
        sub = event['data']['object']
        logger.info('Nueva suscripción activa: %s', sub.get('id'))
    elif event_type == 'customer.subscription.deleted':
        sub = event['data']['object']
        logger.info('Suscripción cancelada: %s', sub.get('id'))
    elif event_type == 'invoice.payment_failed':
        logger.warning('Pago fallido para suscripción: %s', event['data']['object'].get('subscription'))

    return HttpResponse(status=200)
