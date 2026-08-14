import os
import json
import shutil
import hashlib
from datetime import datetime

# Directorios base del sistema SIPAit
CORE_CONFIG_PATH = "./core/config.json"
DATA_ROOT = "./data"
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

def calculate_file_hash(filepath):
    """Calcula el hash SHA-256 de un fichero para garantizar su integridad y evitar duplicados."""
    sha256_hash = hashlib.sha256()
    try:
        with open(filepath, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    except Exception as e:
        write_audit_log("ERROR", f"No se pudo calcular el hash de {filepath}: {e}")
        return None

def get_sync_config():
    """Obtiene las rutas de origen y destino configuradas en el core o usa la URI MTP por defecto."""
    config = load_json_safe(CORE_CONFIG_PATH)
    if config and isinstance(config, dict) and "sync" in config:
        return config["sync"].get("usb_inbox_dir"), config["sync"].get("target_data_root", DATA_ROOT)
    
    # Ruta MTP por defecto proporcionada por el operador para el Motorola Moto G54
    default_mtp_path = "mtp://motorola_moto_g54_5G_ZY22JQDTVR/Almacenamiento%20interno%20compartido/Download"
    return default_mtp_path, DATA_ROOT

def run_sync_engine():
    write_audit_log("INFO", "=== INICIO DE CICLO DE SINCRONIZACIÓN DE SONDA MÓVIL (PULL) ===")
    
    usb_inbox_dir, target_root = get_sync_config()
    
    # Nota: Si la ruta empieza por mtp://, Python nativo requiere un punto de montaje local FUSE.
    # Si tu entorno monta el MTP en local, asegúrate de pasar la ruta absoluta local (ej: /run/user/1000/gvfs/...).
    if usb_inbox_dir.startswith("mtp://") and not os.path.exists(usb_inbox_dir):
        write_audit_log("WARNING", f"La ruta URI MTP detectada [{usb_inbox_dir}] no es accesible directamente por el sistema de ficheros de Python sin un punto de montaje local.")
        print(f"\n[AVISO TÉCNICO] La ruta es una URI MTP virtual: {usb_inbox_dir}")
        print("Sugerencia: Si tu explorador de ficheros ya la ha montado, busca la ruta física en '/run/user/.../gvfs/' o copia temporalmente los ficheros a './data/usb' para la prueba.")
        
        # Intentamos un fallback seguro a ./data/usb si la ruta virtual no es accesible por os.listdir
        fallback_dir = "./data/usb"
        if os.path.exists(fallback_dir):
            print(f"[INFO] Utilizando directorio local de respaldo: {fallback_dir}")
            usb_inbox_dir = fallback_dir
        else:
            return

    if not os.path.exists(usb_inbox_dir):
        write_audit_log("WARNING", f"El directorio origen {usb_inbox_dir} no existe.")
        print(f"[ERROR] No se puede acceder al directorio origen: {usb_inbox_dir}")
        return

    files = [f for f in os.listdir(usb_inbox_dir) if f.endswith(".json")]
    if not files:
        write_audit_log("INFO", "Bandeja de entrada limpia. No hay ficheros pendientes.")
        print("[INFO] No se han encontrado ficheros JSON pendientes de sincronizar.")
        return

    print(f"\n--- INFORME DE PRE-INSPECCIÓN (HUMAN-IN-THE-LOOP) ---")
    file_manifest = []

    for file_name in files:
        source_path = os.path.join(usb_inbox_dir, file_name)
        file_hash = calculate_file_hash(source_path)
        
        payload = load_json_safe(source_path)
        if payload == "CORRUPTED" or not payload:
            write_audit_log("ERROR", f"El fichero {file_name} está corrupto o vacío.")
            continue
            
        export_type = payload.get("export_type")
        records = payload.get("records", [])
        total_records = len(records)
        
        manifest_entry = {
            "file_name": file_name,
            "source_path": source_path,
            "sha256": file_hash,
            "export_type": export_type,
            "total_records": total_records,
            "payload": payload
        }
        file_manifest.append(manifest_entry)
        hash_short = file_hash[:12] if file_hash else "N/A"
        print(f" -> Fichero: {file_name} | Tipo: {export_type} | Registros: {total_records} | SHA256: {hash_short}...")

    if not file_manifest:
        print("[INFO] No hay paquetes válidos para procesar tras la inspección.")
        return

    # Validación humana interactiva
    confirm = input("\n¿Desea proceder con la fusión de estos paquetes en la base de datos central? (s/n): ").strip().lower()
    if confirm != 's':
        write_audit_log("WARNING", "Sincronización abortada por el operador humano.")
        print("[CANCELADO] Operación detenida por el usuario.")
        return

    # Fase de ejecución y volcado
    for item in file_manifest:
        file_name = item["file_name"]
        source_path = item["source_path"]
        payload = item["payload"]
        export_type = item["export_type"]
        records = item["records"]

        processed_count = 0
        skipped_count = 0

        for record in records:
            map_name = record.get("planta", "Raquel Casa") 
            
            if export_type == "emplazamientos":
                target_filename = "ubicaciones.json"
                unique_key = "codigo_emplazamiento"
            elif export_type == "dispositivos":
                target_filename = "inventario.json"
                unique_key = "id_registro"
            else:
                write_audit_log("WARNING", f"Tipo de exportación desconocido en {file_name}: {export_type}")
                continue

            target_path = os.path.join(target_root, str(map_name), target_filename)
            base_data = load_json_safe(target_path)
            
            if base_data == "CORRUPTED":
                write_audit_log("ERROR", f"Abortando fusión: El fichero base {target_path} está corrupto.")
                continue
                
            if base_data is None:
                base_data = []

            if isinstance(base_data, list):
                existing_keys = {item.get(unique_key) for item in base_data}
                record_id_val = record.get(unique_key)
                
                if record_id_val and record_id_val not in existing_keys:
                    base_data.append(record)
                    save_json_safe(target_path, base_data)
                    processed_count += 1
                    write_audit_log("SUCCESS", f"[{map_name}] Incorporado {export_type} [{unique_key}: {record_id_val}]")
                else:
                    skipped_count += 1
                    write_audit_log("WARNING", f"[{map_name}] Omitido duplicado o clave vacía: {record_id_val}")

        write_audit_log("INFO", f"Paquete {file_name} procesado: {processed_count} añadidos, {skipped_count} omitidos.")

        # Traslado a papelera de seguridad
        os.makedirs(TRASH_DIR, exist_ok=True)
        timestamp_prefix = datetime.now().strftime("%Y%m%d_%H%M%S")
        trash_dest_path = os.path.join(TRASH_DIR, f"{timestamp_prefix}_{file_name}")
        shutil.move(source_path, trash_dest_path)
        write_audit_log("INFO", f"Fichero origen {file_name} movido a papelera: {trash_dest_path}")

    write_audit_log("INFO", "=== FIN DE CICLO DE SINCRONIZACIÓN DE SONDA MÓVIL ===")
    print("[OK] Ciclo de sincronización completado con éxito.")

if __name__ == "__main__":
    run_sync_engine()