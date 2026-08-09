#!/bin/bash
echo "=================================================="
echo "           SIPAit - Asistencia IT v0.5            "
echo "=================================================="
echo "Iniciando herramienta portable desde USB..."
cd "$(dirname "$0")"
./sipait
read -p "Presione [Enter] para salir..."
