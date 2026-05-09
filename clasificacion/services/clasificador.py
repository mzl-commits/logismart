# clasificacion/services/clasificador.py

class ClasificadorCajas:
    """Clasifica cajas según peso, fragilidad, prioridad y categoría"""
    
    @staticmethod
    def clasificar_peso(peso_kg):
        peso = float(peso_kg)
        if peso <= 5:
            return 'ligero'
        elif peso <= 20:
            return 'normal'
        else:
            return 'pesado'
    
    @classmethod
    def clasificar(cls, caja):
        """Retorna clasificación completa de una caja"""
        clasificacion = {
            'peso_categoria': cls.clasificar_peso(caja.peso_kg),
            'es_fragil': caja.es_fragil,
            'prioridad_nivel': caja.prioridad,
            'categoria': caja.categoria,
            'tags': []
        }
        
        # Generar tags
        if clasificacion['peso_categoria'] == 'pesado':
            clasificacion['tags'].append('pesado')
        if clasificacion['peso_categoria'] == 'ligero':
            clasificacion['tags'].append('ligero')
        if caja.es_fragil:
            clasificacion['tags'].append('fragil')
        if caja.prioridad in ['alta', 'urgente']:
            clasificacion['tags'].append('urgente')
        
        return clasificacion