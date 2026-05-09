# clasificacion/services/ruta_service.py

class RutaService:

    @staticmethod
    def generar_ruta(origen_x, origen_y, destino_x, destino_y):
        """Ruta Manhattan paso a paso: primero X, luego Y."""
        ruta = []
        x, y = origen_x, origen_y
        while x != destino_x:
            x += 1 if x < destino_x else -1
            ruta.append({'x': x, 'y': y})
        while y != destino_y:
            y += 1 if y < destino_y else -1
            ruta.append({'x': x, 'y': y})
        return ruta

    @staticmethod
    def optimizar_paradas(pos_x, pos_y, paradas):
        """
        Ordena las paradas por heurística del vecino más cercano (Nearest Neighbor TSP).
        Minimiza la distancia Manhattan total del recorrido.
        """
        restantes = list(paradas)
        ordenadas = []
        x, y = pos_x, pos_y

        while restantes:
            mas_cercana = min(
                restantes,
                key=lambda p: abs(p['x'] - x) + abs(p['y'] - y)
            )
            ordenadas.append(mas_cercana)
            x, y = mas_cercana['x'], mas_cercana['y']
            restantes.remove(mas_cercana)

        return ordenadas