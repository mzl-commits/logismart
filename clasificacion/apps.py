from django.apps import AppConfig


class ClasificacionConfig(AppConfig):
    name = 'clasificacion'

    def ready(self):
        import clasificacion.signals
