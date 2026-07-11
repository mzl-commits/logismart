"""Suscripciones LogiSmart respaldadas por Stripe Billing."""
import datetime
import json
import logging

import stripe
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from .models import Suscripcion

logger = logging.getLogger('clasificacion')
stripe.api_key = settings.STRIPE_SECRET_KEY


def _configured():
    return bool(
        settings.STRIPE_SECRET_KEY
        and not settings.STRIPE_SECRET_KEY.endswith('REEMPLAZA_CON_TU_CLAVE')
        and settings.STRIPE_PRICE_ID.startswith('price_')
    )


def _timestamp(value):
    if not value:
        return None
    return datetime.datetime.fromtimestamp(int(value), tz=datetime.timezone.utc)


def _sync_subscription(stripe_subscription, event_type=''):
    customer_id = stripe_subscription.get('customer')
    subscription_id = stripe_subscription.get('id')
    metadata = stripe_subscription.get('metadata') or {}
    user_id = metadata.get('user_id')
    record = None
    if user_id:
        record = Suscripcion.objects.filter(usuario_id=user_id).first()
    if not record and customer_id:
        record = Suscripcion.objects.filter(stripe_customer_id=customer_id).first()
    if not record:
        logger.warning('Suscripción Stripe sin usuario asociado: %s', subscription_id)
        return None

    items = ((stripe_subscription.get('items') or {}).get('data') or [])
    price_id = items[0].get('price', {}).get('id', '') if items else record.stripe_price_id
    period_end = stripe_subscription.get('current_period_end')
    if not period_end and items:
        period_end = items[0].get('current_period_end')
    record.stripe_customer_id = customer_id or record.stripe_customer_id
    record.stripe_subscription_id = subscription_id or record.stripe_subscription_id
    record.stripe_price_id = price_id
    record.estado = stripe_subscription.get('status', record.estado)
    record.periodo_fin = _timestamp(period_end)
    record.cancela_al_final = bool(stripe_subscription.get('cancel_at_period_end'))
    record.ultimo_evento = event_type
    record.save()
    return record


def suscripcion_view(request):
    return render(request, 'clasificacion/spa.html')


@require_GET
def estado_suscripcion(request):
    if not request.user.is_authenticated:
        return JsonResponse({'authenticated': False, 'configured': _configured()})
    record = Suscripcion.objects.filter(usuario=request.user).first()
    return JsonResponse({
        'authenticated': True,
        'configured': _configured(),
        'webhook_configured': bool(settings.STRIPE_WEBHOOK_SECRET.startswith('whsec_')),
        'plan': 'Operación',
        'status': record.estado if record else 'none',
        'active': record.activa if record else False,
        'period_end': record.periodo_fin.isoformat() if record and record.periodo_fin else None,
        'cancel_at_period_end': record.cancela_al_final if record else False,
        'has_customer': bool(record and record.stripe_customer_id),
    })


@login_required
@require_POST
def crear_checkout_session(request):
    if not _configured():
        return JsonResponse({'error': 'Stripe todavía no está configurado para cobros.'}, status=503)
    try:
        domain = request.build_absolute_uri('/').rstrip('/')
        record, _ = Suscripcion.objects.get_or_create(usuario=request.user)
        params = {
            'line_items': [{'price': settings.STRIPE_PRICE_ID, 'quantity': 1}],
            'mode': 'subscription',
            'client_reference_id': str(request.user.id),
            'success_url': domain + '/suscripcion/?success=1&session_id={CHECKOUT_SESSION_ID}',
            'cancel_url': domain + '/suscripcion/?canceled=1',
            'allow_promotion_codes': True,
            'billing_address_collection': 'auto',
            'subscription_data': {'metadata': {'user_id': str(request.user.id), 'username': request.user.username}},
            'metadata': {'user_id': str(request.user.id), 'username': request.user.username},
        }
        if record.stripe_customer_id:
            params['customer'] = record.stripe_customer_id
        elif request.user.email:
            params['customer_email'] = request.user.email
        session = stripe.checkout.Session.create(**params)
        return JsonResponse({'checkout_url': session.url})
    except stripe.StripeError as exc:
        logger.exception('Stripe no pudo crear Checkout: %s', exc)
        return JsonResponse({'error': 'Stripe no pudo iniciar el pago. Inténtalo nuevamente.'}, status=502)


@login_required
@require_POST
def confirmar_checkout(request):
    if not _configured():
        return JsonResponse({'error': 'Stripe no está configurado.'}, status=503)
    try:
        data = json.loads(request.body or '{}')
        session_id = data.get('session_id', '')
        if not session_id.startswith('cs_'):
            return JsonResponse({'error': 'Sesión de Checkout inválida.'}, status=400)
        session = stripe.checkout.Session.retrieve(session_id, expand=['subscription'])
        if str(session.get('client_reference_id')) != str(request.user.id):
            return JsonResponse({'error': 'La sesión no pertenece al usuario actual.'}, status=403)
        record, _ = Suscripcion.objects.get_or_create(usuario=request.user)
        record.stripe_customer_id = session.get('customer') or record.stripe_customer_id
        record.save()
        subscription = session.get('subscription')
        if subscription and not isinstance(subscription, dict):
            subscription = stripe.Subscription.retrieve(subscription)
        if subscription:
            _sync_subscription(subscription, 'checkout.session.completed')
        return JsonResponse({'ok': True})
    except stripe.StripeError as exc:
        logger.exception('No se pudo confirmar Checkout: %s', exc)
        return JsonResponse({'error': 'No se pudo confirmar la suscripción.'}, status=502)


@login_required
@require_POST
def crear_portal_cliente(request):
    record = Suscripcion.objects.filter(usuario=request.user).first()
    if not _configured() or not record or not record.stripe_customer_id:
        return JsonResponse({'error': 'No existe una cuenta de facturación activa.'}, status=400)
    try:
        domain = request.build_absolute_uri('/').rstrip('/')
        portal = stripe.billing_portal.Session.create(
            customer=record.stripe_customer_id,
            return_url=domain + '/suscripcion/',
        )
        return JsonResponse({'portal_url': portal.url})
    except stripe.StripeError as exc:
        logger.exception('No se pudo abrir el portal Stripe: %s', exc)
        return JsonResponse({'error': 'No se pudo abrir el portal de facturación.'}, status=502)


@login_required
@require_POST
def solicitar_cotizacion(request):
    try:
        data = json.loads(request.body)
    except (ValueError, TypeError):
        data = request.POST
    logger.info('COTIZACION ENTERPRISE — Usuario: %s | Empresa: %s | Email: %s | Necesidad: %s',
                request.user.username, data.get('empresa', ''), data.get('email', request.user.email or ''), data.get('necesidad', ''))
    return JsonResponse({'ok': True, 'mensaje': 'Solicitud recibida. Te contactaremos en menos de 24 horas.'})


@csrf_exempt
@require_POST
def stripe_webhook(request):
    if not settings.STRIPE_WEBHOOK_SECRET.startswith('whsec_'):
        logger.error('Webhook Stripe recibido sin STRIPE_WEBHOOK_SECRET configurado.')
        return HttpResponse(status=503)
    try:
        event = stripe.Webhook.construct_event(
            request.body,
            request.META.get('HTTP_STRIPE_SIGNATURE', ''),
            settings.STRIPE_WEBHOOK_SECRET,
        )
    except (ValueError, stripe.SignatureVerificationError):
        return HttpResponse(status=400)

    event_type = event['type']
    obj = event['data']['object']
    if event_type == 'checkout.session.completed':
        user_id = (obj.get('metadata') or {}).get('user_id') or obj.get('client_reference_id')
        user = get_user_model().objects.filter(pk=user_id).first()
        if user:
            record, _ = Suscripcion.objects.get_or_create(usuario=user)
            record.stripe_customer_id = obj.get('customer') or record.stripe_customer_id
            record.stripe_subscription_id = obj.get('subscription') or record.stripe_subscription_id
            record.ultimo_evento = event_type
            record.save()
    elif event_type in {'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'}:
        _sync_subscription(obj, event_type)
    elif event_type in {'invoice.paid', 'invoice.payment_failed'}:
        customer_id = obj.get('customer')
        record = Suscripcion.objects.filter(stripe_customer_id=customer_id).first()
        if record:
            record.ultimo_evento = event_type
            if event_type == 'invoice.payment_failed':
                record.estado = 'past_due'
            record.save()
    return HttpResponse(status=200)
