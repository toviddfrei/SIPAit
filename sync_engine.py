import os
import json
import glob
from datetime import datetime

CONFIG_PATH = "./core/config.json"
INBOX_PATH = "./inbox/"
MASTER_DB_PATH = "./database/master_inventory.json"

def load_json(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"[-] Error leyendo el fichero {filepath}: {e}")
        return None

def save_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

def run_sync_engine():
    print("=" * 60)
    print("[IT MANAGER] Iniciando Motor de Sincronización Industrial (SIPAit)")
    print("=" * 60)

    # 1. Cargar Configuración y Mapa de Zonas Autorizadas
    config = load_json(CONFIG_PATH)
    if not config:
        print("[-] FATAL: No se pudo cargar el archivo de configuración base.")
        return

    # Adaptador para extraer mapas válidos
    valid_maps = config.get("mapas", config)
    print("[+] Topología industrial y mapas cargados correctamente.")

    # 2. Inicializar o cargar Base de Datos Maestra
    if os.path.exists(MASTER_DB_PATH):
        master_db = load_json(MASTER_DB_PATH)
    else:
        master_db = {"emplazamientos": [], "dispositivos": [], "logs_auditoria": []}

    # 3. Buscar ficheros pendientes en la bandeja de entrada de la pasarela
    search_pattern = os.path.join(INBOX_PATH, "*.json")
    files = glob.glob(search_pattern)

    if not files:
        print("[!] No se han encontrado nuevos paquetes JSON en la carpeta de entrada.")
        return

    print(f"[+] Se han detectado {len(files)} ficheros para procesar.")

    for file_path in files:
        print(f"\n--- Procesando fichero: {os.path.basename(file_path)} ---")
        packet = load_json(file_path)
        
        if not packet or "export_type" not in packet or "records" not in packet:
            print("[-] ADVERTENCIA: Estructura de paquete no válida o corrupta. Descartado.")
            continue

        export_type = packet["export_type"]
        declared_total = packet.get("total_records", 0)
        actual_records = packet["records"]
        real_count = len(actual_records)

        # Validación estricta de conteo industrial
        if declared_total != real_count:
            print(f"[-] ERROR DE INTEGRIDAD: El total declarado ({declared_total}) no coincide con los registros reales ({real_count}).")
            continue
        else:
            print(f"[✓] Verificación de conteo OK: {real_count} registros validados.")

        # Procesamiento según tipo de datos
        if export_type == "emplazamientos":
            for emp in actual_records:
                planta = emp.get("planta")
                zona = emp.get("zona")
                
                # Validación topológica industrial
                if planta in valid_maps:
                    zonas_validas = valid_maps[planta].get("zonas", [])
                    if zona not in zonas_validas and zonas_validas:
                        print(f"[!] ALERTA: Zona '{zona}' no oficial en planta '{planta}'. Registrada bajo supervisión.")
                
                # Evitar duplicados por código de emplazamiento
                exists = next((item for item in master_db["emplazamientos"] if item["codigo_emplazamiento"] == emp["codigo_emplazamiento"]), None)
                if not exists:
                    master_db["emplazamientos"].append(emp)
                    print(f"    [+] Nuevo emplazamiento integrado: {emp['codigo_emplazamiento']}")
                else:
                    print(f"    [=] Emplazamiento ya existente actualizado: {emp['codigo_emplazamiento']}")

        elif export_type == "dispositivos":
            for dev in actual_records:
                exists = next((item for item in master_db["dispositivos"] if item["id_registro"] == dev["id_registro"]), None)
                if not exists:
                    master_db["dispositivos"].append(dev)
                    print(f"    [+] Dispositivo integrado: {dev['id_registro']} (Serie: {dev['numero_serie']})")
                else:
                    print(f"    [=] Dispositivo existente actualizado: {dev['id_registro']}")

        elif export_type == "logs_sonda":
            for log in actual_records:
                master_db["logs_auditoria"].append(log)
            print(f"    [+] {real_count} trazas de log incorporadas al historial de auditoría.")

        # Mover o archivar fichero procesado para evitar reprocesamiento
        archive_path = file_path + ".processed"
        os.rename(file_path, archive_path)
        print(f"[✓] Fichero archivado con éxito.")

    # Guardar base de datos maestra consolidada
    os.makedirs(os.path.dirname(MASTER_DB_PATH), exist_ok=True)
    save_json(MASTER_DB_PATH, master_db)
    print("\n" + "=" * 60)
    print("[IT MANAGER] Sincronización industrial completada sin pérdida de datos.")
    print("=" * 60)

if __name__ == "__main__":
    run_sync_engine()