from django.db import migrations

CATEGORIAS_INICIALES = [
    ('electronica', 'Electrónica', '💻'),
    ('textil',      'Textil',      '👕'),
    ('alimento',    'Alimento',    '🍎'),
    ('herramienta', 'Herramienta', '🔧'),
    ('quimico',     'Químico',     '⚗️'),
    ('otro',        'Otro',        '📦'),
]


def crear_categorias(apps, schema_editor):
    Categoria = apps.get_model('clasificacion', 'Categoria')
    for slug, nombre, icono in CATEGORIAS_INICIALES:
        Categoria.objects.get_or_create(slug=slug, defaults={'nombre': nombre, 'icono': icono})


def eliminar_categorias(apps, schema_editor):
    Categoria = apps.get_model('clasificacion', 'Categoria')
    Categoria.objects.filter(slug__in=[s for s, _, __ in CATEGORIAS_INICIALES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('clasificacion', '0005_add_categoria_model'),
    ]

    operations = [
        migrations.RunPython(crear_categorias, eliminar_categorias),
    ]
