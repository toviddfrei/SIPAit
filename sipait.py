#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SIPAit - Herramienta Portable de Asistencia IT y Diagnóstico Pedagógico
Punto de Entrada Único (PEUS) y Gestión POO
"""

import re
from datetime import datetime
import platform
import getpass
import socket
import os
import shutil
import uuid

class GestorMetadatos:
    """
    Clase encargada de solicitar, validar y almacenar los metadatos 
    contextuales de la asistencia IT.
    """
    def __init__(self):
        self.metadatos = {}

    def _validar_id(self, texto_id):
        """Valida que el ID no contenga caracteres especiales."""
        patron = re.compile(r'^[a-zA-Z0-9]+$')
        return bool(patron.match(texto_id))

    def capturar(self):
        """Ejecuta el flujo de interacción por consola para capturar la metadata."""
        print("\n--- CAPTURA DE METADATOS DE ASISTENCIA ---")
        
        tecnico = input("Nombre del Técnico: ").strip()
        
        while True:
            id_asistencia = input("ID de Asistencia (ej. 010120260001, sin espacios ni símbolos): ").strip()
            if self._validar_id(id_asistencia):
                break
            print("[!] Error pedagógico: El ID contiene caracteres especiales o espacios. Utilice únicamente caracteres alfanuméricos.")

        ubicacion = input("Ubicación (Fábrica / Externo / Área específica): ").strip()
        usuario_afectado = input("Usuario Afectado o Línea de Producción: ").strip()
        
        print("\nNiveles de Impacto: [1] Baja  [2] Media  [3] Alta  [4] Parada de Línea")
        opcion_impacto = input("Seleccione Nivel de Impacto (1-4): ").strip()
        impactos = {"1": "Baja", "2": "Media", "3": "Alta", "4": "Parada de Línea"}
        impacto = impactos.get(opcion_impacto, "No especificado")

        print("\nEstados: [1] Abierta  [2] Pendiente  [3] Cerrada")
        opcion_estado = input("Seleccione Estado (1-3): ").strip()
        estados = {"1": "Abierta", "2": "Pendiente", "3": "Cerrada"}
        estado = estados.get(opcion_estado, "Abierta")

        observaciones = input("Observaciones / Motivo breve de la intervención: ").strip()

        self.metadatos = {
            "fecha_registro": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "tecnico": tecnico,
            "id_asistencia": id_asistencia,
            "ubicacion": ubicacion,
            "usuario_afectado": usuario_afectado,
            "impacto": impacto,
            "estado": estado,
            "observaciones": observaciones
        }
        
        return self.metadatos


class ExtractorBase:
    """
    Clase base que actúa como motor pedagógico (wrapper seguro).
    Captura excepciones del sistema y devuelve mensajes explicativos.
    """
    def ejecutar_extraccion(self, funcion_extraccion, *args, **kwargs):
        try:
            return funcion_extraccion(*args, **kwargs)
        except PermissionError:
            return "[Aviso Pedagógico]: Acceso denegado. Se requieren privilegios superiores para obtener este parámetro."
        except NotImplementedError:
            return "[Aviso Pedagógico]: Funcionalidad no soportada en este Sistema Operativo."
        except Exception as e:
            return f"[Aviso Pedagógico]: No se pudo extraer el dato debido a: {str(e)}"


class ExtractorSoftware(ExtractorBase):
    """
    Extrae la información relacionada con el Software y la Identidad del equipo.
    """
    def obtener_datos(self):
        print("\n[*] Extrayendo Bloque de Software...")
        
        datos = {
            "sistema_operativo": self.ejecutar_extraccion(platform.system),
            "release_so": self.ejecutar_extraccion(platform.release),
            "version_so": self.ejecutar_extraccion(platform.version),
            "arquitectura": self.ejecutar_extraccion(platform.machine),
            "hostname": self.ejecutar_extraccion(socket.gethostname),
            "usuario_sesion": self.ejecutar_extraccion(getpass.getuser),
            "procesador": self.ejecutar_extraccion(platform.processor)
        }
        return datos


class ExtractorHardware(ExtractorBase):
    """
    Extrae la información relacionada con el Hardware adaptándose al SO.
    """
    def obtener_datos(self):
        print("[*] Extrayendo Bloque de Hardware...")
        
        def obtener_almacenamiento():
            total, usado, libre = shutil.disk_usage(os.path.abspath(os.sep))
            return f"Total: {total // (2**30)} GB | Libre: {libre // (2**30)} GB"
            
        def obtener_ram():
            sistema = platform.system()
            if sistema == "Linux":
                # Lectura nativa Linux
                with open('/proc/meminfo', 'r') as mem:
                    total_mem = mem.readline().split()[1]
                    return f"{int(total_mem) // 1024} MB"
            elif sistema == "Windows":
                # En Windows se puede usar un comando nativo rápido o ctypes, 
                # por ahora dejamos una alternativa o aviso controlado si no está mapeado
                import subprocess
                cmd = "wmic computersystem get TotalPhysicalMemory"
                output = subprocess.check_output(cmd, shell=True).decode(errors='ignore')
                linhas = [line.strip() for line in output.split('\n') if line.strip()]
                if len(linhas) > 1:
                    return f"{int(linhas[1]) // (1024*1024)} MB"
                return "No disponible por WMI"
            else:
                raise NotImplementedError("Lectura de RAM no soportada para este SO.")

        datos = {
            "cpu_nucleos": self.ejecutar_extraccion(os.cpu_count),
            "almacenamiento_raiz": self.ejecutar_extraccion(obtener_almacenamiento),
            "memoria_ram": self.ejecutar_extraccion(obtener_ram)
        }
        return datos


class ExtractorRedes(ExtractorBase):
    """
    Extrae la información de Redes de forma multiplataforma.
    """
    def obtener_datos(self, hostname_actual):
        print("[*] Extrayendo Bloque de Redes...")
        
        def obtener_ip_activa():
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            try:
                s.connect(("8.8.8.8", 80))
                ip = s.getsockname()[0]
            except Exception:
                ip = socket.gethostbyname(hostname_actual)
            finally:
                s.close()
            return ip
            
        def obtener_mac():
            mac = uuid.getnode()
            return ':'.join(('%012X' % mac)[i:i+2] for i in range(0, 12, 2))

        datos = {
            "ip_local": self.ejecutar_extraccion(obtener_ip_activa),
            "mac_address": self.ejecutar_extraccion(obtener_mac)
        }
        return datos


class GeneradorReporte:
    """
    Clase encargada de estructurar los datos recopilados en un informe Markdown
    y guardarlo localmente con una nomenclatura trazable.
    """
    def __init__(self, metadatos, software, hardware, redes):
        self.metadatos = metadatos
        self.software = software
        self.hardware = hardware
        self.redes = redes

    def generar_markdown(self):
        # Generación del nombre de archivo trazable: YYYYMMDD_HHMM_Hostname.md
        fecha_str = datetime.now().strftime("%Y%m%d_%H%M")
        hostname = self.software.get("hostname", "unknown_host")
        nombre_archivo = f"{fecha_str}_{hostname}.md"

        contenido = f"""# Informe de Asistencia IT - SIPAit v0.5

## 1. Metadatos de la Intervención
* **Fecha de Registro:** {self.metadatos.get('fecha_registro')}
* **ID de Asistencia:** {self.metadatos.get('id_asistencia')}
* **Técnico:** {self.metadatos.get('tecnico')}
* **Ubicación:** {self.metadatos.get('ubicacion')}
* **Usuario / Línea Afectada:** {self.metadatos.get('usuario_afectado')}
* **Nivel de Impacto:** {self.metadatos.get('impacto')}
* **Estado:** {self.metadatos.get('estado')}
* **Observaciones:** {self.metadatos.get('observaciones')}

---

## 2. Bloque de Software e Identidad
* **Sistema Operativo:** {self.software.get('sistema_operativo')} ({self.software.get('release_so')})
* **Versión / Kernel:** {self.software.get('version_so')}
* **Arquitectura:** {self.software.get('arquitectura')}
* **Hostname:** {self.software.get('hostname')}
* **Usuario de Sesión:** {self.software.get('usuario_sesion')}
* **Procesador:** {self.software.get('procesador')}

---

## 3. Bloque de Hardware
* **Núcleos de CPU:** {self.hardware.get('cpu_nucleos')}
* **Almacenamiento (Raíz):** {self.hardware.get('almacenamiento_raiz')}
* **Memoria RAM:** {self.hardware.get('memoria_ram')}

---

## 4. Bloque de Redes
* **IP Local Activa:** {self.redes.get('ip_local')}
* **Dirección MAC:** {self.redes.get('mac_address')}

---
*Informe generado automáticamente por SIPAit v0.5 (Motor Pedagógico Activo)*
"""

        try:
            with open(nombre_archivo, "w", encoding="utf-8") as f:
                f.write(contenido)
            print(f"\n[✔] Informe Markdown generado con éxito: {nombre_archivo}")
        except Exception as e:
            print(f"\n[!] Error al guardar el informe en disco: {e}")


def main():
    print("==================================================")
    print("           SIPAit - Asistencia IT v0.5            ")
    print("==================================================")
    
    # Hito 1: Metadatos
    gestor_meta = GestorMetadatos()
    metadata = gestor_meta.capturar()
    
    # Hito 2 & 4: Extracción Multiplataforma Blindada
    extractor_sw = ExtractorSoftware()
    datos_software = extractor_sw.obtener_datos()
    
    extractor_hw = ExtractorHardware()
    datos_hardware = extractor_hw.obtener_datos()
    
    extractor_net = ExtractorRedes()
    datos_redes = extractor_net.obtener_datos(datos_software.get("hostname"))
    
    # Hito 3: Generación del Reporte Markdown
    generador = GeneradorReporte(metadata, datos_software, datos_hardware, datos_redes)
    generador.generar_markdown()

    print("\n[✔] Hito 1 completado con éxito. Metadatos registrados en objeto.")
    print(metadata)

    print("\n[✔] Hito 2 Completado. Resultados de Hardware y Redes:")
    print("HW:", datos_hardware)
    print("NET:", datos_redes)

if __name__ == "__main__":
    main()
