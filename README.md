# SIPAit

## INICIO

Lo primero en funcionar son los servidores encubiertos al puerto 8000 y el del puerto del frontend en el 5173

- Arrancar en la raiz /SIPAit/: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
- Arrancar el frontend: npm run dev -- --host 

Verificamos que ambos servidores funcionan


## CRONOGRAMA

- Refactorización
    - [x] Creación de directorio core/
    - [x] Traslado de SIPAit/frontend/config.json a SIPAit/core/ centralizando rutas| valores| y otras configuraciones

- Sistema de log en la base y en la sonda
    - [ ] Verificar implantación sistema log de la base
    - [ ] Verificar implantación sistema log en la sonda

- Estandarización de nombres
    - [ ] Campos en emplazamientos
    - [ ] Campos en ubicaciones
    - [ ] Campos en dispositivos

- Sincronización automática sonda a base
    - [ ] Conexión entre equipo y smartphone
    - [ ] Extracción de ficheros y ubicación en destino
        - Definir origen y destino claramente
    - [ ] Verificación de la extracción y logs del mismo
    - [ ] Informe visual de la extración finalizada correctamente

- Sincronización datos sonda en datos base SIPAit/data/usb
    - [ ] Conteo pre sincronización
        - [ ] Registros en base total
        - [ ] Registros que va a recibir de la sonda
        - [ ] Autorización humana
        - [ ] Backup previo
        - [ ] Sincronización
        - [ ] Informe visual y registro log de la sincronización
        - [ ] Backup final operación de sincronización correcta
        - [ ] Verificación humana
    - [ ] Pruebas de sincronización

- Interfaz sonda| incluir mapa
- Interfaz sonda| incluir opciones
    - Opción generar dosier fotográfico (para emplazamientos y dispositivos)

## VALORES Y NOMBRE DE CAMPOS ESTANDARIZADOS

### PARA REGISTROS DE EMPLAZAMIENTOS

1. Modelo de Ubicaciones (UbicacionEntrada)
    
    - Propósito: Registrar un emplazamiento físico topológico (asociado a un mapa/entorno).
    - Total de campos gestionados: 7 campos (2 obligatorios por lógica de negocio/flujo| 5 opcionales).

|Nombre técnico en main.py|Tipo de dato|Requerido / Opcional|Rol / Etiqueta equivalente en Interfaz / Sonda|
|--|--|--|--|
|codigo_emplazamiento|str|Opcional (Autogenerado)|ID único del emplazamiento (Ej: EMP-2026-0001).|
|planta|str|Obligatorio|Planta o nivel físico (Desplegable basado en config.json).|
|zona|str|Obligatorio|Zona o espacio específico (Desplegable basado en config.json).|
|latitud|float|Opcional|Coordenada GPS de latitud capturada por la sonda.|
|longitud|float|Opcional|Coordenada GPS de longitud capturada por la sonda.|
|altitud|float|Opcional|Altitud sobre el nivel del mar.|
|observaciones|str|Opcional|Notas de campo o incidencias del emplazamiento.|


### PARA REGISTROS DE DISPOSITIVOS

2. Modelo de Dispositivos / Inventario (DispositivoEntrada)
    - Propósito: Registrar un activo hardware dentro de un emplazamiento ya existente.
    - Total de campos gestionados: 7 campos (6 obligatorios| 1 opcional).

|Nombre técnico en main.py|Tipo de dato|Requerido / Opcional|Rol / Etiqueta equivalente en Interfaz / Sonda|
|--|--|--|--|
|model_config = ConfigDict(extra='allow')| | | |
|tipo|str|Obligatorio|"Categoría del activo (Desplegable: PC, Portátil, Monitor, etc.)."|
|marca|str|Obligatorio|"Fabricante del equipo (Ej: Dell, HP, Lenovo)."|
|modelo|str|Obligatorio|Modelo comercial del dispositivo.|
|numero_serie|str|Obligatorio|Identificador único o Service Tag de fábrica.|
|etiqueta: str  # <-- Nuevo campo: Etiqueta de inventario de la compañía|
|estado|str|Obligatorio|"Estado operativo (Ej: Operativo, Baja)."|
|codigo_emplazamiento|str|Obligatorio|Relación o vínculo con la ubicación física donde se ubica.|
|observaciones|str|Opcional|Notas específicas del hardware.|