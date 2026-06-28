# clasificacion/services/ruta_service.py

class RutaService:

    @staticmethod
    def generar_ruta(origen_x, origen_y, destino_x, destino_y):
        """
        Ruta paso a paso: primero Y (por la Avenida Central en x=1), luego X.
        Si la posición Y cambia y no estamos en la Avenida Central, primero salimos horizontalmente a x=1.
        """
        ruta = []
        x, y = origen_x, origen_y
        
        # 1. Regresar a la avenida central (x=1) si no estamos ahí y cambia la altura (Y)
        if y != destino_y and x != 1:
            x = 1
            ruta.append({'x': x, 'y': y})
            
        # 2. Moverse en Y hasta destino_y (manteniendo x=1)
        while y != destino_y:
            y += 1 if y < destino_y else -1
            ruta.append({'x': x, 'y': y})
            
        # 3. Moverse en X desde la avenida central (x=1) hasta el destino
        while x != destino_x:
            x += 1 if x < destino_x else -1
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