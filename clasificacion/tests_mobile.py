from django.contrib.auth import get_user_model
from django.test import TestCase


class MobileLoginTests(TestCase):
    def setUp(self):
        self.user, _ = get_user_model().objects.get_or_create(
            username='admin',
            defaults={'first_name': 'Admin'},
        )
        self.user.first_name = 'Admin'
        self.user.set_password('admin123')
        self.user.save()

    def test_login_mobile_retorna_token(self):
        response = self.client.post(
            '/api/mobile/login/',
            {'username': 'admin', 'password': 'admin123'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['token'])
        self.assertEqual(response.json()['full_name'], 'Admin')

    def test_login_mobile_rechaza_credenciales_invalidas(self):
        response = self.client.post(
            '/api/mobile/login/',
            {'username': 'admin', 'password': 'incorrecta'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {'detail': 'Credenciales inválidas'})

    def test_dashboard_mobile_requiere_token(self):
        response = self.client.get('/api/mobile/dashboard/')
        self.assertEqual(response.status_code, 401)

    def test_dashboard_mobile_retorna_resumen(self):
        login = self.client.post(
            '/api/mobile/login/',
            {'username': 'admin', 'password': 'admin123'},
            content_type='application/json',
        )
        token = login.json()['token']
        response = self.client.get(
            '/api/mobile/dashboard/',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['pending_boxes'], 0)
        self.assertEqual(response.json()['completed_dispatches'], 0)
        self.assertEqual(
            response.json()['quick_actions'],
            ['Ver estado', 'Alertas', 'Cerrar sesión'],
        )
