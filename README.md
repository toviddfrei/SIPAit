# SIPAit

## INICIO

Lo primero en funcionar son los servidores encubiertos al puerto 8000 y el del puerto del frontend en el 5173

- Arrancar en la raiz /SIPAit/: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
- Arrancar el frontend: npm run dev -- --host 

Verificamos que ambos servidores funcionan
