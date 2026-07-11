from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from .models import Suscripcion


class SubscriptionTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user('billing-user', 'billing@example.com', 'password')

    def test_status_public_reports_authentication(self):
        response = self.client.get('/suscripcion/estado/')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()['authenticated'])

    def test_status_returns_local_subscription(self):
        self.client.force_login(self.user)
        Suscripcion.objects.create(usuario=self.user, estado='active', stripe_customer_id='cus_test')
        response = self.client.get('/suscripcion/estado/')
        self.assertTrue(response.json()['active'])
        self.assertEqual(response.json()['status'], 'active')

    @override_settings(STRIPE_SECRET_KEY='sk_test_configured', STRIPE_PRICE_ID='price_test_monthly')
    @patch('clasificacion.views_subscription.stripe.checkout.Session.create')
    def test_checkout_uses_recurring_price_and_user_reference(self, create_session):
        create_session.return_value = SimpleNamespace(url='https://checkout.stripe.test/session')
        self.client.force_login(self.user)
        response = self.client.post('/suscripcion/checkout/', content_type='application/json', data={})
        self.assertEqual(response.status_code, 200)
        args = create_session.call_args.kwargs
        self.assertEqual(args['mode'], 'subscription')
        self.assertEqual(args['client_reference_id'], str(self.user.id))
        self.assertEqual(args['line_items'][0]['price'], 'price_test_monthly')

    def test_webhook_without_secret_is_rejected(self):
        response = self.client.post('/suscripcion/webhook/', data=b'{}', content_type='application/json')
        self.assertEqual(response.status_code, 503)
