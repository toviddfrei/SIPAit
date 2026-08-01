#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SIPAit - Herramienta Portable de Asistencia IT y Diagnóstico Pedagógico
Punto de Entrada Único (PEUS) y Gestión POO
"""

import re
from datetime import datetime

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


def main():
    print("==================================================")
    print("           SIPAit - Asistencia IT v0.5            ")
    print("==================================================")
    
    # Hito 1: Inicialización y ejecución de la clase de Metadatos
    gestor = GestorMetadatos()
    metadata = gestor.capturar()
    
    print("\n[✔] Hito 1 completado con éxito. Metadatos registrados en objeto.")
    print(metadata)

if __name__ == "__main__":
    main()