import json
import math

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.test import Client

from clasificacion.models import Caja, Categoria, Medida, Proveedor, Ubicacion, Usuario


SAMPLES = [
    {'producto': 'Monitor industrial', 'categoria': 'electronica', 'peso': 8, 'cantidad': 2, 'fragil': True, 'prioridad': 'alta', 'medida': ('Demo monitor 50x25x45', 50, 25, 45)},
    {'producto': 'Kit de herramientas', 'categoria': 'herramienta', 'peso': 26, 'cantidad': 2, 'fragil': False, 'prioridad': 'media', 'medida': ('Demo herramientas 60x40x35', 60, 40, 35)},
    {'producto': 'Uniformes operativos', 'categoria': 'textil', 'peso': 6, 'cantidad': 5, 'fragil': False, 'prioridad': 'baja', 'medida': ('Demo textil 55x45x35', 55, 45, 35)},
    {'producto': 'Conservas selladas', 'categoria': 'alimento', 'peso': 12, 'cantidad': 2, 'fragil': False, 'prioridad': 'media', 'medida': ('Demo conservas 35x30x25', 35, 30, 25)},
    {'producto': 'Sensores de temperatura', 'categoria': 'electronica', 'peso': 4, 'cantidad': 3, 'fragil': True, 'prioridad': 'urgente', 'medida': ('Demo sensores 35x25x20', 35, 25, 20)},
    {'producto': 'Repuestos mecánicos', 'categoria': 'herramienta', 'peso': 18, 'cantidad': 4, 'fragil': False, 'prioridad': 'alta', 'medida': ('Demo repuestos 70x50x40', 70, 50, 40)},
    {'producto': 'Material de embalaje', 'categoria': 'otro', 'peso': 7, 'cantidad': 3, 'fragil': False, 'prioridad': 'media', 'medida': ('Demo embalaje 75x55x45', 75, 55, 45)},
    {'producto': 'Lácteos refrigerados', 'categoria': 'alimento', 'peso': 5, 'cantidad': 6, 'fragil': False, 'prioridad': 'alta', 'refrigeracion': True, 'medida': ('Demo frío 45x35x30', 45, 35, 30)},
    {'producto': 'Reactivos de laboratorio', 'categoria': 'quimico', 'peso': 8, 'cantidad': 4, 'fragil': True, 'prioridad': 'alta', 'medida': ('Demo reactivos 40x30x35', 40, 30, 35)},
]


class Command(BaseCommand):
    help = 'Carga cajas demo mediante la API y completa el flujo hasta 30% de ocupación.'

    def handle(self, *args, **options):
        total = Ubicacion.objects.count()
        if not total:
            self.stderr.write('No hay ubicaciones; no se puede sembrar el almacén.')
            return
        target = math.ceil(total * 0.30)
        occupied = Ubicacion.objects.filter(estado_ocupacion=True).count()
        if occupied >= target:
            self.stdout.write(self.style.SUCCESS(f'Ocupación existente {occupied}/{total}; objetivo {target} ya cumplido.'))
            return

        User = get_user_model()
        auth_user = User.objects.filter(is_staff=True, perfil_logistico__isnull=False).first()
        if not auth_user:
            auth_user, _ = User.objects.get_or_create(username='demo_seed_admin', defaults={'is_staff': True})
            auth_user.is_staff = True
            auth_user.set_unusable_password()
            auth_user.save()
            Usuario.objects.get_or_create(usuario_auth=auth_user, defaults={'nombre': 'Administrador de datos demo', 'rol': 'admin'})

        provider, _ = Proveedor.objects.get_or_create(nombre_empresa='Proveedor Demo QA', defaults={'contacto': 'qa@local.test'})
        measures = {}
        for sample in SAMPLES:
            nombre, largo, ancho, alto = sample['medida']
            measures[nombre], _ = Medida.objects.get_or_create(
                nombre=nombre,
                defaults={
                    'largo': largo,
                    'ancho': ancho,
                    'alto': alto,
                    'volumen': largo * ancho * alto,
                },
            )
        for slug, name in [('electronica','Electrónica'),('herramienta','Herramienta'),('textil','Textil'),('alimento','Alimento'),('quimico','Químico'),('otro','Otro')]:
            Categoria.objects.get_or_create(slug=slug, defaults={'nombre': name, 'icono': 'box'})

        client = Client(HTTP_HOST='127.0.0.1')
        client.force_login(auth_user)
        created = []
        failures = []
        sequence = Caja.objects.filter(id__startswith='DEMO-QA-').count() + 1

        while occupied < target:
            sample = SAMPLES[(sequence - 1) % len(SAMPLES)]
            box_id = f'DEMO-QA-{sequence:03d}'
            while Caja.objects.filter(pk=box_id).exists():
                sequence += 1
                box_id = f'DEMO-QA-{sequence:03d}'
            payload = {
                'id': box_id, 'producto': sample['producto'], 'categoria': sample['categoria'],
                'prioridad': sample['prioridad'], 'peso_kg': sample['peso'],
                'cantidad': sample['cantidad'],
                'codigo_barras': f'DEMO{sequence:08d}', 'lote': 'QA-LOCAL',
                'es_fragil': sample['fragil'],
                'requiere_refrigeracion': sample.get('refrigeracion', False),
                'id_medida': measures[sample['medida'][0]].pk,
                'id_proveedor': provider.pk,
            }
            create_response = client.post('/api/cajas/', data=json.dumps(payload), content_type='application/json')
            if create_response.status_code not in (200, 201):
                failures.append(f'{box_id}: alta {create_response.status_code}')
                break
            process_response = client.post(f'/api/cajas/{box_id}/procesar/', data='{}', content_type='application/json')
            if process_response.status_code != 200:
                failures.append(f'{box_id}: proceso {process_response.status_code}')
                break
            confirm_response = client.post(f'/api/cajas/{box_id}/confirmar_almacenada/', data='{}', content_type='application/json')
            if confirm_response.status_code != 200:
                failures.append(f'{box_id}: confirmación {confirm_response.status_code}')
                break
            created.append(box_id)
            occupied = Ubicacion.objects.filter(estado_ocupacion=True).count()
            sequence += 1

        self.stdout.write(f'Cajas procesadas: {len(created)} ({", ".join(created)})')
        self.stdout.write(f'Ocupación final: {occupied}/{total} ({occupied / total:.1%})')
        if failures:
            self.stderr.write('Hallazgos: ' + '; '.join(failures))
        else:
            self.stdout.write(self.style.SUCCESS('Flujo alta -> proceso -> almacenamiento completado sin errores.'))
