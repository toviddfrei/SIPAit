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
        - [ ] Ubicar los logs en una sola ubicación
        - [ ] La nomenclatura debe ser entendible a simple vista
        - [ ] Crear un sistema de almacenaje continuo
    - [ ] Verificar implantación sistema log en la sonda
        - [ ] Ubicar los logs en una sola ubicación
        - [ ] La nomenclatura debe ser entendible a simple vista
        - [ ] Crear un sistema de almacenaje continuo

- Estandarización de nombres
    - [ ] Campos en emplazamientos
        - [ ]
    - [ ] Campos en ubicaciones
        - [ ]
    - [ ] Campos en dispositivos
        - [ ]

- Sincronización automática sonda a base
    - [ ] Conexión entre equipo y smartphone
        - [ ] El sistema oficial sería sobre un dominio propio desde la propia app se subirian los ficheros
        - [x] Temporalmente utilizamos sistema híbrido, arrancamos server ftp en mobil con app gratuita y cliente desde portatil con filezilla conectado en wifi que monta el portatil
    - [ ] Extracción de ficheros y ubicación en destino
        - [ ] La extracción de ficheros desde el mobil al portatil es temporalmente manual utilizando el sistema híbrido, se borra el mobil cuando se traslada al hd del portatil
        - Definir origen y destino claramente
            - [x] El origen es el mobil directorio de descargas
            - [x] El destino es en el portatil SIPAit/data/usb
    - [ ] Verificación de la extracción y logs del mismo
        - [ ] La sonda debe realizar un registro completo de su actividad, registrando sobre todo los ficheros que crea
        - [ ] El sistema de log debe verificar de alguna manera que los ficheros creados por la sonda, se ubicaron en el directorio de destino
        - [ ] Emision de un log de sincronizacion registrando los ficheros creados e identificados

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
|codigo_emplazamiento|str|Opcional (Autogenerado)|ID único del emplazamiento (Ej.: EMP-2026-0001).|
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
|marca|str|Obligatorio|"Fabricante del equipo (Ej.: Dell, HP, Lenovo)."|
|modelo|str|Obligatorio|Modelo comercial del dispositivo.|
|numero_serie|str|Obligatorio|Identificador único o Service Tag de fábrica.|
|etiqueta: str  # <-- Nuevo campo: Etiqueta de inventario de la compañía|
|estado|str|Obligatorio|"Estado operativo (Ej.: Operativo, Baja)."|
|codigo_emplazamiento|str|Obligatorio|Relación o vínculo con la ubicación física donde se ubica.|
|observaciones|str|Opcional|Notas específicas del hardware.|