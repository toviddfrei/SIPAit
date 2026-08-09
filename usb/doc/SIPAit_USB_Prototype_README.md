# SIPAit v0.5 - Prototipo USB de Campo

Herramienta portable de asistencia IT y diagnóstico pedagógico.

## Estructura del USB:
- `sipait` / `sipait.exe`: Binario principal compilado (PyInstaller).
- `lanzador.bat`: Script de inicio rápido para entornos Windows.
- `lanzador.sh`: Script de inicio rápido para entornos Linux.

## Instrucciones de Uso:
1. Conecte este USB al equipo afectado.
2. Ejecute el lanzador correspondiente a su sistema operativo (`lanzador.bat` en Windows o `lanzador.sh` en Linux) o lance el binario directamente desde la terminal.
3. Complete los metadatos de la intervención solicitados en pantalla.
4. El informe en formato Markdown (.md) se generará automáticamente en la carpeta de ejecución.
