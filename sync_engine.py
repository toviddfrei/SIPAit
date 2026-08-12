import os
import json
import shutil
from datetime import datetime

# Directorios del sistema SIPAit
DATA_ROOT = "./data"
USB_INBOX_DIR = os.path.join(DATA_ROOT, "usb")
TRASH_DIR = os.path.join(DATA_ROOT, "trash")
LOG_FILE_PATH = os.path.join(DATA_ROOT, "sync_audit.log")

def write_audit_log(level, message):
    """Registra eventos en el log centralizado de auditoría del sistema."""
    os.makedirs(DATA_ROOT, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] [{level.upper()}] {message}\n"
    print(log_entry.strip(), flush=True)
    
    with open(LOG_FILE_PATH, "a", encoding="utf-8") as log_file:
        log_file.write(log_entry)

def load_json_safe(filepath):
    """Carga un fichero JSON controlando posibles errores de corrupción."""
    if not os.path.exists(filepath):
        return None
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        write_audit_log("ERROR", f"Fallo al parsear el fichero {filepath}: {e}")
        return "CORRUPTED"

def save_json_safe(filepath, data):
    """Guarda de forma segura la estructura JSON con formato legible."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def run_sync_engine():
    write_audit_log("INFO", "=== INICIO DE CICLO DE SINCRONIZACIÓN DE SONDA MÓVIL ===")
    
    if not os.path.exists(USB_INBOX_DIR):
        os.makedirs(USB_INBOX_DIR, exist_ok=True)
        write_audit_log("WARNING", f"Directorio USB {USB_INBOX_DIR} no existía. Creado automáticamente.")
        return

    files = [f for f in os.listdir(USB_INBOX_DIR) if f.endswith(".json")]
    if not files:
        write_audit_log("INFO", "Bandeja USB limpia. No hay nuevos ficheros pendientes de procesar.")
        return

    for file_name in files:
        source_path = os.path.join(USB_INBOX_DIR, file_name)
        write_audit_log("INFO", f"Inspeccionando paquete de entrada: {file_name}")
        
        payload = load_json_safe(source_path)
        if payload == "CORRUPTED" or not payload:
            write_audit_log("ERROR", f"El fichero {file_name} está corrupto o vacío. Omitido.")
            continue
            
        export_type = payload.get("export_type") # 'emplazamientos' o 'dispositivos'
        records = payload.get("records", [])
        
        if not export_type or not isinstance(records, list):
            write_audit_log("ERROR", f"El fichero {file_name} no cumple con la estructura estándar de metadatos.")
            continue

        processed_count = 0
        skipped_count = 0

        for record in records:
            # Determinamos el mapa de destino en función del contexto o valor por defecto ("Raquel Casa" por defecto operativo)
            # Puedes ajustar esta lógica según el selector de contexto que use la sonda
            map_name = "Raquel Casa" 
            
            if export_type == "emplazamientos":
                target_filename = "ubicaciones.json"
                unique_key = "record_id"
                # Mapeo opcional para unificar nomenclaturas si fuera necesario
            elif export_type == "dispositivos":
                target_filename = "inventario.json"
                unique_key = "serial_number"
            else:
                write_audit_log("WARNING", f"Tipo de exportación desconocido: {export_type}")
                continue

            target_path = os.path.join(DATA_ROOT, map_name, target_filename)
            
            # Verificación del estado actual del fichero base
            base_data = load_json_safe(target_path)
            if base_data == "CORRUPTED":
                write_audit_log("ERROR", f"Abortando fusión: El fichero base {target_path} está corrupto.")
                continue
                
            if base_data is None:
                base_data = []

            # Si el fichero base es una lista directa de registros
            if isinstance(base_data, list):
                existing_keys = {item.get(unique_key) for item in base_data}
                record_id_val = record.get(unique_key)
                
                if record_id_val and record_id_val not in existing_keys:
                    base_data.append(record)
                    save_json_safe(target_path, base_data)
                    processed_count += 1
                    write_audit_log("SUCCESS", f"[{map_name}] Incorporado {export_type[:-1]} [{unique_key}: {record_id_val}]. Total actual en base: {len(base_data)}")
                else:
                    skipped_count += 1
                    write_audit_log("WARNING", f"[{map_name}] Omitido duplicado o clave vacía en {export_type}: {record_id_val}")

        write_audit_log("INFO", f"Resumen paquete {file_name}: {processed_count} añadidos, {skipped_count} omitidos.")

        # Traslado seguro del fichero procesado a la papelera (data/trash) para trazabilidad forense
        os.makedirs(TRASH_DIR, exist_ok=True)
        timestamp_prefix = datetime.now().strftime("%Y%m%d_%H%M%S")
        trash_dest_path = os.path.join(TRASH_DIR, f"{timestamp_prefix}_{file_name}")
        shutil.move(source_path, trash_dest_path)
        write_audit_log("INFO", f"Fichero origen {file_name} trasladado a papelera de seguridad en: {trash_dest_path}")

    write_audit_log("INFO", "=== FIN DE CICLO DE SINCRONIZACIÓN DE SONDA MÓVIL ===")

if __name__ == "__main__":
    run_sync_engine()