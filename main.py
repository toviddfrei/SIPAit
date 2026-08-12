import time
import os
import json
import logging
import traceback
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict

# --- Configuración del Sistema de Logs Centralizado ---
LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIR, "backend_api.log"), encoding="utf-8"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("SIPAit-API")

app = FastAPI(title="SIPAit API Topológica de Inventario", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Middleware para Trazas HTTP e Industria ---
@app.middleware("http")
async def auditoria_industrial_middleware(request: Request, call_next):
    start_time = time.time()
    method = request.method
    path = request.url.path
    
    # Captura de payload para auditoría POST
    body_payload = ""
    if method == "POST":
        try:
            body_bytes = await request.body()
            async def receive(): return {"type": "http.request", "body": body_bytes}
            request._receive = receive
            body_payload = body_bytes.decode("utf-8", errors="ignore")
        except: body_payload = "[Payload inaccesible]"

    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        
        log_msg = f"Method: {method} Path: {path} Status: {response.status_code} Duration: {process_time:.2f}ms"
        if method == "POST": log_msg += f" | Payload: {body_payload}"
        
        logger.info(log_msg)
        return response
    
    except Exception as exc:
        process_time = (time.time() - start_time) * 1000
        error_trace = traceback.format_exc()
        logger.error(f"CRÍTICO en {method} {path} | Duracion: {process_time:.2f}ms\n{error_trace}")
        return JSONResponse(status_code=500, content={"detail": "Error interno registrado en auditoría.", "error": str(exc)})

# --- Directorio Base de Datos y Core ---
BASE_DATA_DIR = "data"
CORE_DIR = "core"
CONFIG_FILE = os.path.join(CORE_DIR, "config.json")

os.makedirs(BASE_DATA_DIR, exist_ok=True)
os.makedirs(CORE_DIR, exist_ok=True)

# --- Funciones de Utilidad Dinámicas ---
def cargar_configuracion():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            try: return json.load(f)
            except Exception as e: logger.error(f"Error al leer config.json: {e}")
    return {}

def guardar_configuracion(config_data):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config_data, f, indent=4, ensure_ascii=False)
    logger.info("Fichero core/config.json actualizado.")

def get_map_path(mapa: str):
    path = os.path.join(BASE_DATA_DIR, mapa)
    os.makedirs(path, exist_ok=True)
    return path

def cargar_datos(mapa: str, archivo: str):
    path = os.path.join(get_map_path(mapa), archivo)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            try: return json.load(f)
            except: return []
    return []

def guardar_datos(mapa: str, archivo: str, datos):
    path = os.path.join(get_map_path(mapa), archivo)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(datos, f, indent=4, ensure_ascii=False)

# --- Modelos Pydantic ---
class UbicacionEntrada(BaseModel):
    model_config = ConfigDict(extra='allow')
    codigo_emplazamiento: Optional[str] = None
    planta: str
    zona: str
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    altitud: Optional[float] = None
    observaciones: Optional[str] = None

class DispositivoEntrada(BaseModel):
    model_config = ConfigDict(extra='allow')
    tipo: str
    marca: str
    modelo: str
    numero_serie: str
    etiqueta: str
    estado: str
    codigo_emplazamiento: str
    observaciones: str | None = ""

class ValidacionPinEntrada(BaseModel):
    pin: str

# --- Endpoints ---

@app.get("/api/config")
def obtener_configuracion_sistema():
    config = cargar_configuracion()
    if not config: raise HTTPException(status_code=500, detail="Configuración corrupta.")
    return config

@app.post("/api/config/validar")
def validar_pin_configuracion(payload: ValidacionPinEntrada):
    config = cargar_configuracion()
    sistema_info = config.get("sistema", {})
    pin_valido = str(sistema_info.get("pin_config", "1234"))
    if str(payload.pin).strip() == pin_valido.strip():
        return {"status": "success"}
    raise HTTPException(status_code=401, detail="PIN incorrecto.")

@app.post("/api/{mapa}/ubicaciones")
def registrar_ubicacion(mapa: str, ubicacion: UbicacionEntrada):
    ubicaciones = cargar_datos(mapa, "ubicaciones.json")
    nuevo_id = f"EMP-{datetime.now().year}-{len(ubicaciones) + 1:04d}"
    datos_dict = ubicacion.model_dump()
    datos_dict["codigo_emplazamiento"] = nuevo_id
    datos_dict["timestamp"] = datetime.now().isoformat()
    ubicaciones.append(datos_dict)
    guardar_datos(mapa, "ubicaciones.json", ubicaciones)
    return {"status": "success", "codigo": nuevo_id}

@app.get("/api/{mapa}/ubicaciones")
def obtener_ubicaciones(mapa: str): return cargar_datos(mapa, "ubicaciones.json")

@app.post("/api/{mapa}/registrar")
def registrar_dispositivo_api(mapa: str, dispositivo: DispositivoEntrada):
    ubicaciones = cargar_datos(mapa, "ubicaciones.json")
    if not any(u["codigo_emplazamiento"] == dispositivo.codigo_emplazamiento for u in ubicaciones):
        raise HTTPException(status_code=404, detail="El emplazamiento no existe.")
    inventario = cargar_datos(mapa, "inventario.json")
    nuevo_id = f"INV-{datetime.now().year}-{len(inventario) + 1:04d}"
    nuevo_registro = {"id_registro": nuevo_id, "timestamp": datetime.now().isoformat(), **dispositivo.model_dump()}
    inventario.append(nuevo_registro)
    guardar_datos(mapa, "inventario.json", inventario)
    return {"status": "success", "id_registro": nuevo_id}

@app.get("/api/{mapa}/inventario")
def obtener_inventario(mapa: str): return cargar_datos(mapa, "inventario.json")