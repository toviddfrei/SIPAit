from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
import json
import os
from datetime import datetime
from typing import Optional

app = FastAPI(title="SIPAit API Topológica de Inventario", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Directorio Base de Datos ---
BASE_DATA_DIR = "data"
os.makedirs(BASE_DATA_DIR, exist_ok=True)

# --- Funciones de Utilidad Dinámicas ---
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
    codigo_emplazamiento: Optional[str] = None  # <-- Permitimos que sea opcional/null
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
    estado: str
    codigo_emplazamiento: str
    observaciones: str | None = ""

# --- Endpoints ---

@app.post("/api/{mapa}/ubicaciones")
def registrar_ubicacion(mapa: str, ubicacion: UbicacionEntrada):
    ubicaciones = cargar_datos(mapa, "ubicaciones.json")
    
    # Autogenerar código secuencial
    nuevo_id = f"EMP-{datetime.now().year}-{len(ubicaciones) + 1:04d}"
    
    # Convertimos los datos a diccionario y forzamos el nuevo ID autonumérico
    datos_dict = ubicacion.model_dump()
    datos_dict["codigo_emplazamiento"] = nuevo_id
    datos_dict["timestamp"] = datetime.now().isoformat()
    
    ubicaciones.append(datos_dict)
    guardar_datos(mapa, "ubicaciones.json", ubicaciones)
    
    return {"status": "success", "codigo": nuevo_id}

@app.get("/api/{mapa}/ubicaciones")
def obtener_ubicaciones(mapa: str):
    return cargar_datos(mapa, "ubicaciones.json")

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
def obtener_inventario(mapa: str):
    return cargar_datos(mapa, "inventario.json")

@app.get("/api/{mapa}/dispositivos")
def obtener_dispositivos(mapa: str):
    return cargar_datos(mapa, "inventario.json")