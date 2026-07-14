# clasificacion/models.py
from django.db import models

class Medida(models.Model):
    id_medida = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100)
    largo = models.DecimalField(max_digits=10, decimal_places=2)
    ancho = models.DecimalField(max_digits=10, decimal_places=2)
    alto = models.DecimalField(max_digits=10, decimal_places=2)
    volumen = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'medidas'
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(largo__gt=0)
                    & models.Q(ancho__gt=0)
                    & models.Q(alto__gt=0)
                    & models.Q(volumen__gt=0)
                ),
                name='medida_dimensiones_positivas',
            ),
        ]

    def save(self, *args, **kwargs):
        self.volumen = self.largo * self.ancho * self.alto
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nombre} ({self.largo}x{self.ancho}x{self.alto})"


class Proveedor(models.Model):
    id_proveedor = models.AutoField(primary_key=True)
    nombre_empresa = models.CharField(max_length=150)
    contacto = models.CharField(max_length=100)

    class Meta:
        db_table = 'proveedores'
        ordering = ['nombre_empresa']

    def __str__(self):
        return self.nombre_empresa


class Categoria(models.Model):
    """
    Categorías dinámicas de cajas. El usuario puede agregar nuevas desde la UI.
    El campo `slug` es el valor almacenado en Caja.categoria.
    """
    slug = models.CharField(max_length=30, unique=True)  # valor en DB (ej. 'electronica')
    nombre = models.CharField(max_length=50)              # nombre display (ej. 'Electrónica')
    icono = models.CharField(max_length=10, default='📦') # emoji
    descripcion = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'categorias'
        ordering = ['nombre']

    def __str__(self):
        return f'{self.icono} {self.nombre}'


class Ubicacion(models.Model):
    TIPOS_ESTANTE = [
        ('general', 'General'),
        ('pesado', 'Carga pesada'),
        ('fragil', 'Frágil'),
        ('quimico', 'Químico'),
        ('refrigerado', 'Refrigerado'),
    ]
    PRIORIDAD_CATEGORIA = [
        ('sin_preferencia', 'Sin preferencia'),
        ('electronica', 'Electrónica'),
        ('textil', 'Textil'),
        ('alimento', 'Alimento'),
        ('herramienta', 'Herramienta'),
        ('quimico', 'Químico'),
        ('otro', 'Otro'),
    ]

    id_ubicacion = models.AutoField(primary_key=True)
    pasillo = models.CharField(max_length=10)
    estante = models.IntegerField()
    nivel = models.IntegerField()
    estado_ocupacion = models.BooleanField(default=False)

    # Metadatos logísticos del estante
    tipo_estante = models.CharField(max_length=20, choices=TIPOS_ESTANTE, default='general')
    capacidad_peso_kg = models.DecimalField(max_digits=8, decimal_places=2, default=50)
    ancho_util_cm = models.DecimalField(max_digits=7, decimal_places=2, default=80)
    fondo_util_cm = models.DecimalField(max_digits=7, decimal_places=2, default=80)
    alto_util_cm = models.DecimalField(max_digits=7, decimal_places=2, default=60)
    distancia_salida_m = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    activo = models.BooleanField(default=True)
    permite_fragil = models.BooleanField(default=True)
    permite_quimico = models.BooleanField(default=False)
    prioridad_categoria = models.CharField(
        max_length=20,
        choices=PRIORIDAD_CATEGORIA,
        default='sin_preferencia'
    )

    lado = models.CharField(max_length=20, choices=[('adelante', 'Adelante'), ('posterior', 'Posterior')], default='adelante')
    casillero = models.IntegerField(choices=[(1, 'Casillero 1'), (2, 'Casillero 2')], default=1)

    class Meta:
        db_table = 'ubicaciones'
        unique_together = ('pasillo', 'estante', 'nivel', 'lado', 'casillero')
        constraints = [
            models.CheckConstraint(
                condition=models.Q(capacidad_peso_kg__gt=0),
                name='ubicacion_capacidad_peso_positiva',
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(ancho_util_cm__gt=0)
                    & models.Q(fondo_util_cm__gt=0)
                    & models.Q(alto_util_cm__gt=0)
                ),
                name='ubicacion_dimensiones_positivas',
            ),
            models.CheckConstraint(
                condition=models.Q(distancia_salida_m__gte=0),
                name='ubicacion_distancia_no_negativa',
            ),
            models.CheckConstraint(
                condition=models.Q(estante__gte=1) & models.Q(nivel__gte=1),
                name='ubicacion_indices_positivos',
            ),
        ]

    @property
    def coord_x(self):
        # Convierte pasillo (A,B,C...) a número.
        # Si es del lado posterior, se accede desde el pasillo siguiente (x + 1)
        x = ord(self.pasillo.upper()) - ord('A')
        if self.lado == 'posterior':
            return x + 1
        return x

    @property
    def coord_y(self):
        return self.estante

    @property
    def capacidad_volumen_cm3(self):
        return self.ancho_util_cm * self.fondo_util_cm * self.alto_util_cm

    def __str__(self):
        lado_char = self.lado[0].upper() if self.lado else 'A'
        caja_num = 3 if self.lado == 'posterior' and self.casillero == 1 else \
                   4 if self.lado == 'posterior' and self.casillero == 2 else \
                   1 if self.casillero == 1 else 2
        return f"{self.pasillo}{self.estante}-N{self.nivel}-{lado_char}{self.casillero} (Caja {caja_num})"


class Usuario(models.Model):
    ROLES = [
        ('admin', 'Administrador'),
        ('operador', 'Operador'),
        ('despachador', 'Despachador'),
    ]
    id_usuario = models.AutoField(primary_key=True)
    usuario_auth = models.OneToOneField(
        'auth.User', on_delete=models.PROTECT, null=True, blank=True,
        related_name='perfil_logistico'
    )
    nombre = models.CharField(max_length=100)
    rol = models.CharField(max_length=20, choices=ROLES)

    class Meta:
        db_table = 'usuarios'
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} ({self.rol})"


class Producto(models.Model):
    sku = models.CharField(max_length=40, unique=True)
    nombre = models.CharField(max_length=150)
    categoria = models.CharField(max_length=30, default='otro')
    codigo_barras = models.CharField(max_length=64, unique=True, null=True, blank=True)
    unidad = models.CharField(max_length=30, default='unidad')
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'producto'
        ordering = ['nombre']
    def __str__(self):
        return f'{self.sku} · {self.nombre}'


class Caja(models.Model):
    PRIORIDADES = [
        ('baja', 'Baja'),
        ('media', 'Media'),
        ('alta', 'Alta'),
        ('urgente', 'Urgente'),
    ]
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('clasificada', 'Clasificada'),
        ('en_transito', 'En tránsito'),
        ('almacenada', 'Almacenada'),
        ('despachada', 'Despachada'),
    ]
    # CATEGORIAS_DEFAULT: referencia legacy, la fuente dinámica es el modelo Categoria
    CATEGORIAS_DEFAULT = [
        ('electronica', 'Electrónica'),
        ('textil', 'Textil'),
        ('alimento', 'Alimento'),
        ('herramienta', 'Herramienta'),
        ('quimico', 'Químico'),
        ('otro', 'Otro'),
    ]

    id = models.CharField(primary_key=True, max_length=20)
    producto = models.CharField(max_length=150)
    producto_ref = models.ForeignKey(Producto, on_delete=models.PROTECT, null=True, blank=True, related_name='lotes')
    codigo_barras = models.CharField(max_length=64, unique=True, null=True, blank=True)
    lote = models.CharField(max_length=80, blank=True)
    fecha_vencimiento = models.DateField(null=True, blank=True, db_index=True)
    cantidad = models.IntegerField(default=1)
    id_medida = models.ForeignKey(Medida, on_delete=models.PROTECT, db_column='id_medida')
    id_ubicacion = models.ForeignKey(Ubicacion, on_delete=models.SET_NULL,
                                      null=True, blank=True, db_column='id_ubicacion')
    id_proveedor = models.ForeignKey(Proveedor, on_delete=models.PROTECT, db_column='id_proveedor')
    peso_kg = models.DecimalField(max_digits=8, decimal_places=2)
    prioridad = models.CharField(max_length=20, choices=PRIORIDADES, default='media')
    categoria = models.CharField(max_length=30, default='otro')  # slug de Categoria
    es_fragil = models.BooleanField(default=False)
    requiere_refrigeracion = models.BooleanField(default=False)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    hora_llegada = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'caja'
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(cantidad__gt=0)
                    | models.Q(cantidad=0, estado='despachada')
                ),
                name='caja_cantidad_positiva',
            ),
            models.CheckConstraint(
                condition=models.Q(peso_kg__gt=0),
                name='caja_peso_positivo',
            ),
        ]

    def __str__(self):
        return f"Caja {self.id} - {self.producto}"


class Vehiculo(models.Model):
    id_vehiculo = models.AutoField(primary_key=True)
    placa = models.CharField(max_length=20, unique=True)
    marca = models.CharField(max_length=50, blank=True)
    capacidad_kg = models.DecimalField(max_digits=8, decimal_places=2, default=1000)

    class Meta:
        db_table = 'vehiculo'
        ordering = ['placa']

    def __str__(self):
        return f"{self.placa} ({self.marca})"


class Destino(models.Model):
    id_destino = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100, unique=True)
    direccion = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'destino'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre

class Despacho(models.Model):
    id_despacho = models.AutoField(primary_key=True)
    id_caja = models.ForeignKey(Caja, on_delete=models.CASCADE, db_column='id_caja')
    id_usuario_despacho = models.ForeignKey(Usuario, on_delete=models.PROTECT, db_column='id_usuario_despacho')
    destino = models.CharField(max_length=200)
    transporte_placa = models.CharField(max_length=20)
    cantidad = models.PositiveIntegerField(default=1)
    fecha_salida = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'despacho'

    def __str__(self):
        return f"Despacho {self.id_despacho} → {self.destino}"


class DespachoOperacion(models.Model):
    """Registro idempotente de una operación de despacho por lote."""
    clave = models.CharField(max_length=120, unique=True)
    usuario = models.ForeignKey('auth.User', on_delete=models.PROTECT)
    respuesta = models.JSONField(default=dict)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'despacho_operacion'
        ordering = ['-creado_en']


class HistorialMovimientos(models.Model):
    id_log = models.AutoField(primary_key=True)
    id_caja = models.ForeignKey(Caja, on_delete=models.CASCADE, db_column='id_caja')
    id_usuario = models.ForeignKey(Usuario, on_delete=models.PROTECT, db_column='id_usuario')
    estado_anterior = models.CharField(max_length=20)
    estado_nuevo = models.CharField(max_length=20)
    fecha_cambio = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'historial_movimientos'

    def __str__(self):
        return f"Log {self.id_log}: {self.estado_anterior} → {self.estado_nuevo}"



class MovimientoInventario(models.Model):
    TIPOS = [('entrada', 'Entrada'), ('salida', 'Salida'), ('reserva', 'Reserva'), ('liberacion', 'Liberación'), ('traslado', 'Traslado'), ('ajuste', 'Ajuste')]
    id_movimiento = models.BigAutoField(primary_key=True)
    caja = models.ForeignKey(Caja, on_delete=models.PROTECT, related_name='movimientos_inventario')
    tipo = models.CharField(max_length=20, choices=TIPOS)
    cantidad = models.IntegerField()
    existencia_anterior = models.PositiveIntegerField()
    existencia_posterior = models.PositiveIntegerField()
    ubicacion_origen = models.ForeignKey(Ubicacion, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    ubicacion_destino = models.ForeignKey(Ubicacion, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    usuario = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    motivo = models.CharField(max_length=240, blank=True)
    referencia = models.CharField(max_length=80, blank=True)
    fecha = models.DateTimeField(auto_now_add=True, db_index=True)
    class Meta:
        db_table = 'movimiento_inventario'
        ordering = ['-fecha', '-id_movimiento']


class ReservaStock(models.Model):
    ESTADOS = [('activa', 'Activa'), ('consumida', 'Consumida'), ('cancelada', 'Cancelada')]
    caja = models.ForeignKey(Caja, on_delete=models.PROTECT, related_name='reservas')
    cantidad = models.PositiveIntegerField()
    estado = models.CharField(max_length=12, choices=ESTADOS, default='activa', db_index=True)
    destino = models.CharField(max_length=200, blank=True)
    creada_por = models.ForeignKey('auth.User', on_delete=models.PROTECT, related_name='reservas_creadas')
    creada_en = models.DateTimeField(auto_now_add=True)
    actualizada_en = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'reserva_stock'
        ordering = ['-creada_en']


class PoliticaStock(models.Model):
    producto = models.CharField(max_length=150, unique=True)
    minimo = models.PositiveIntegerField(default=0)
    maximo = models.PositiveIntegerField(null=True, blank=True)
    dias_sin_movimiento = models.PositiveIntegerField(default=30)
    activa = models.BooleanField(default=True)
    class Meta:
        db_table = 'politica_stock'
        ordering = ['producto']


class Suscripcion(models.Model):
    ESTADOS = [
        ('incomplete', 'Incompleta'), ('incomplete_expired', 'Expirada'),
        ('trialing', 'En prueba'), ('active', 'Activa'), ('past_due', 'Pago pendiente'),
        ('canceled', 'Cancelada'), ('unpaid', 'Impaga'), ('paused', 'Pausada'),
    ]
    usuario = models.OneToOneField('auth.User', on_delete=models.CASCADE, related_name='suscripcion_logismart')
    stripe_customer_id = models.CharField(max_length=80, unique=True, null=True, blank=True)
    stripe_subscription_id = models.CharField(max_length=80, unique=True, null=True, blank=True)
    stripe_price_id = models.CharField(max_length=80, blank=True)
    estado = models.CharField(max_length=24, choices=ESTADOS, default='incomplete')
    periodo_fin = models.DateTimeField(null=True, blank=True)
    cancela_al_final = models.BooleanField(default=False)
    ultimo_evento = models.CharField(max_length=80, blank=True)
    creada_en = models.DateTimeField(auto_now_add=True)
    actualizada_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'suscripcion_logismart'

    @property
    def activa(self):
        return self.estado in {'active', 'trialing'}


class SolicitudDespacho(models.Model):
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('aprobada', 'Aprobada'),
        ('rechazada', 'Rechazada'),
    ]
    id_solicitud = models.AutoField(primary_key=True)
    cajas_ids = models.JSONField(default=list)  # Lista de IDs de cajas
    usuario_solicita = models.ForeignKey('auth.User', on_delete=models.PROTECT, db_column='id_usuario_solicita')
    operador_responsable = models.ForeignKey(Usuario, on_delete=models.PROTECT, db_column='id_operador_responsable')
    destino = models.CharField(max_length=200)
    transporte_placa = models.CharField(max_length=20)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    fecha_solicitud = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'solicitud_despacho'
        ordering = ['-fecha_solicitud']

    def __str__(self):
        return f"Solicitud {self.id_solicitud} ({self.estado})"


class Planilla(models.Model):
    id_planilla = models.AutoField(primary_key=True)
    cajas_ids = models.JSONField(default=list)  # Lista de IDs de cajas
    operador = models.ForeignKey('auth.User', on_delete=models.CASCADE, db_column='id_operador')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    completada = models.BooleanField(default=False)
    fecha_completada = models.DateTimeField(null=True, blank=True)
    completada_por = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='planillas_completadas', db_column='id_completada_por'
    )

    class Meta:
        db_table = 'planilla'
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f"Planilla {self.id_planilla} - {self.operador.username}"
