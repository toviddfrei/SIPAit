from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
import json
import os
from datetime import datetime

app = FastAPI(title="SIPAit API Topológica de Inventario", version="2.0")

# Permitir CORS para que la PWA móvil/frontend pueda comunicarse sin restricciones
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Directorio y Ficheros de Datos Seguros ---
DIRECTORIO_DATOS = "data"
ARCHIVO_UBICACIONES = os.path.join(DIRECTORIO_DATOS, "ubicaciones.json")
ARCHIVO_INVENTARIO = os.path.join(DIRECTORIO_DATOS, "inventario.json")

# Asegurar que el directorio data existe al arrancar el servidor
os.makedirs(DIRECTORIO_DATOS, exist_ok=True)

# --- Modelos Pydantic ---

class UbicacionEntrada(BaseModel):
    model_config = ConfigDict(extra='allow')
    
    codigo_emplazamiento: str  # Ej: FAB-PL2-T01
    planta: str                # Ej: Planta 2 - Producción
    zona: str                  # Ej: Línea de Ensambaje 3
    latitud: float | None = None
    longitud: float | None = None
    observaciones: str | None = ""

class DispositivoEntrada(BaseModel):
    model_config = ConfigDict(extra='allow')
    
    tipo: str                  # Ej: PC Sobremesa, Monitor, Switch
    marca: str
    modelo: str
    numero_serie: str
    estado: str
    codigo_emplazamiento: str  # Relación: Debe apuntar a un emplazamiento existente
    observaciones: str | None = ""

# --- Funciones de Utilidad para Ficheros ---

def cargar_datos(archivo):
    if os.path.exists(archivo):
        with open(archivo, "r", encoding="utf-8") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

def guardar_datos(archivo, datos):
    with open(archivo, "w", encoding="utf-8") as f:
        json.dump(datos, f, indent=4, ensure_ascii=False)

# --- Endpoints de Ubicaciones (Paso 1) ---

@app.post("/api/ubicaciones")
def registrar_ubicacion(ubicacion: UbicacionEntrada):
    ubicaciones = cargar_datos(ARCHIVO_UBICACIONES)
    
    # Evitar duplicados por código de emplazamiento
    for u in ubicaciones:
        if u["codigo_emplazamiento"].lower() == ubicacion.codigo_emplazamiento.lower():
            raise HTTPException(status_code=400, detail="El código de emplazamiento ya existe.")
            
    nueva_ubicacion = {
        "timestamp": datetime.now().isoformat(),
        **ubicacion.model_dump()
    }
    
    ubicaciones.append(nueva_ubicacion)
    guardar_datos(ARCHIVO_UBICACIONES, ubicaciones)
    
    return {
        "status": "success",
        "message": f"Emplazamiento {ubicacion.codigo_emplazamiento} registrado correctamente.",
        "codigo_emplazamiento": ubicacion.codigo_emplazamiento
    }

@app.get("/api/ubicaciones")
def obtener_ubicaciones():
    return cargar_datos(ARCHIVO_UBICACIONES)

# --- Endpoints de Dispositivos (Paso 2) ---

@app.post("/api/registrar")
def registrar_dispositivo_api(dispositivo: DispositivoEntrada):
    ubicaciones = cargar_datos(ARCHIVO_UBICACIONES)
    
    # Validar integridad referencial: la ubicación debe existir previamente
    ubicacion_existe = any(u["codigo_emplazamiento"] == dispositivo.codigo_emplazamiento for u in ubicaciones)
    if not ubicacion_existe:
        raise HTTPException(
            status_code=404, 
            detail=f"El emplazamiento '{dispositivo.codigo_emplazamiento}' no existe. Debe registrar la ubicación primero."
        )

    inventario = cargar_inventario() if 'cargar_inventario' in globals() else cargar_datos(ARCHIVO_INVENTARIO)
    
    # Autogenerar ID correlativo real
    nuevo_id = f"INV-{datetime.now().year}-{len(inventario) + 1:04d}"
    
    nuevo_registro = {
        "id_registro": nuevo_id,
        "timestamp": datetime.now().isoformat(),
        **dispositivo.model_dump()
    }
    
    inventario.append(nuevo_registro)
    guardar_datos(ARCHIVO_INVENTARIO, inventario)
    
    return {
        "status": "success",
        "message": "Dispositivo registrado y enlazado a ubicación correctamente",
        "id_registro": nuevo_id
    }

@app.get("/api/inventario")
def obtener_inventario():
    return cargar_datos(ARCHIVO_INVENTARIO)