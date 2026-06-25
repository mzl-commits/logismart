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
    nombre = models.CharField(max_length=100)
    rol = models.CharField(max_length=20, choices=ROLES)

    class Meta:
        db_table = 'usuarios'
    
    def __str__(self):
        return f"{self.nombre} ({self.rol})"


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
    cantidad = models.IntegerField(default=1)
    id_medida = models.ForeignKey(Medida, on_delete=models.PROTECT, db_column='id_medida')
    id_ubicacion = models.ForeignKey(Ubicacion, on_delete=models.SET_NULL, 
                                      null=True, blank=True, db_column='id_ubicacion')
    id_proveedor = models.ForeignKey(Proveedor, on_delete=models.PROTECT, db_column='id_proveedor')
    peso_kg = models.DecimalField(max_digits=8, decimal_places=2)
    prioridad = models.CharField(max_length=20, choices=PRIORIDADES, default='media')
    categoria = models.CharField(max_length=30, default='otro')  # slug de Categoria
    es_fragil = models.BooleanField(default=False)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    hora_llegada = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'caja'
    
    def __str__(self):
        return f"Caja {self.id} - {self.producto}"


class ConfigCarro(models.Model):
    """Configuración singleton del carro automatizado."""
    nombre         = models.CharField(max_length=50, default='Carro Principal')
    largo_cm       = models.DecimalField(max_digits=8, decimal_places=1, default=100)
    ancho_cm       = models.DecimalField(max_digits=8, decimal_places=1, default=80)
    alto_cm        = models.DecimalField(max_digits=8, decimal_places=1, default=120)
    peso_maximo_kg = models.DecimalField(max_digits=8, decimal_places=2, default=150)
    max_paradas    = models.IntegerField(default=10)
    pos_base_x     = models.IntegerField(default=0)
    pos_base_y     = models.IntegerField(default=0)
    notas          = models.TextField(blank=True)

    class Meta:
        db_table = 'config_carro'

    @property
    def volumen_cm3(self):
        return float(self.largo_cm) * float(self.ancho_cm) * float(self.alto_cm)

    @classmethod
    def get_config(cls, carro_id=1):
        obj, _ = cls.objects.get_or_create(pk=carro_id, defaults={'nombre': f'Carro {carro_id}'})
        return obj

    def save(self, *args, **kwargs):
        if not self.pk:
            self.pk = 1
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nombre


class Vehiculo(models.Model):
    id_vehiculo = models.AutoField(primary_key=True)
    placa = models.CharField(max_length=20, unique=True)
    marca = models.CharField(max_length=50, blank=True)
    capacidad_kg = models.DecimalField(max_digits=8, decimal_places=2, default=1000)

    class Meta:
        db_table = 'vehiculo'

    def __str__(self):
        return f"{self.placa} ({self.marca})"

class Destino(models.Model):
    id_destino = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100, unique=True)
    direccion = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'destino'

    def __str__(self):
        return self.nombre

class Despacho(models.Model):
    id_despacho = models.AutoField(primary_key=True)
    id_caja = models.ForeignKey(Caja, on_delete=models.CASCADE, db_column='id_caja')
    id_usuario_despacho = models.ForeignKey(Usuario, on_delete=models.PROTECT, db_column='id_usuario_despacho')
    destino = models.CharField(max_length=200)
    transporte_placa = models.CharField(max_length=20)
    fecha_salida = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'despacho'
    
    def __str__(self):
        return f"Despacho {self.id_despacho} → {self.destino}"


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



class EstadoCarro(models.Model):
    ESTADOS = [
        ('esperando',  'Esperando'),
        ('moviendo',   'Moviendo'),
        ('llego',      'Llegó'),
        ('regresando', 'Regresando a base'),
    ]

    id = models.AutoField(primary_key=True)
    pos_x = models.IntegerField(default=0)
    pos_y = models.IntegerField(default=0)
    destino_x = models.IntegerField(default=0)
    destino_y = models.IntegerField(default=0)
    ruta = models.JSONField(default=list, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='esperando')
    caja_id = models.CharField(max_length=20, null=True, blank=True)
    # Soporte multi-parada
    paradas = models.JSONField(default=list, blank=True)  # [{caja_id, x, y, ubicacion_id, ubicacion_nombre}]
    parada_actual = models.IntegerField(default=0)
    actualizado_en = models.DateTimeField(auto_now=True)

    # Telemetría de sensores
    sensor_opt_izq_ext = models.BooleanField(default=False)
    sensor_opt_izq_int = models.BooleanField(default=False)
    sensor_opt_der_int = models.BooleanField(default=False)
    sensor_opt_der_ext = models.BooleanField(default=False)
    sensor_obstaculo_frontal = models.BooleanField(default=False)
    sensor_obstaculo_trasero = models.BooleanField(default=False)

    # Telemetría de motores (us: 1000 - 2000, 1500 = detenido)
    motor_izq_vel = models.IntegerField(default=1500)
    motor_der_vel = models.IntegerField(default=1500)
    bateria_pct = models.IntegerField(default=100)

    class Meta:
        db_table = 'estado_carro'

    def __str__(self):
        return f"Carro ({self.pos_x},{self.pos_y}) -> ({self.destino_x},{self.destino_y}) [{self.estado}]"


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