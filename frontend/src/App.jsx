import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const iconoEmplazamiento = L.divIcon({
  className: 'custom-emplazamiento',
  html: '<div style="background-color: #007bff; width: 16px; height: 16px; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.6); border-radius: 2px;" title="Emplazamiento"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 16],
});

const iconoDispositivo = L.divIcon({
  className: 'custom-dispositivo',
  html: '<div style="background-color: #28a745; width: 14px; height: 14px; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.6); border-radius: 50%;" title="Dispositivo"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 14],
});

const API_URL = 'http://localhost:8000';

function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, zoom);
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }
  }, [center, zoom, map]);
  return null;
}

function App() {
  const [vista, setVista] = useState('ubicacion');
  const [config, setConfig] = useState(null);
  const [mapaActivo, setMapaActivo] = useState('');

  const [pinIngresado, setPinIngresado] = useState('');
  const [configDesbloqueada, setConfigDesbloqueada] = useState(false);

  const [ubicacionForm, setUbicacionForm] = useState({
    codigo_emplazamiento: '',
    planta: '',
    zona: '',
    latitud: null,
    longitud: null,
    altitud: null,
    observaciones: ''
  });
  const [geoStatus, setGeoStatus] = useState('No capturada');
  const [loadingGeo, setLoadingGeo] = useState(false);

  const [dispositivoForm, setDispositivoForm] = useState({
    id_registro: '',
    tipo: 'PC Sobremesa',
    marca: '',
    modelo: '',
    numero_serie: '',
    etiqueta: '', 
    estado: 'Operativo',
    codigo_emplazamiento: '',
    latitud: null,
    longitud: null,
    altitud: null,
    observaciones: ''
  });
  const [geoStatusDisp, setGeoStatusDisp] = useState('No capturada');
  const [loadingGeoDisp, setLoadingGeoDisp] = useState(false);

  const [listaUbicaciones, setListaUbicaciones] = useState([]);
  const [listaDispositivos, setListaDispositivos] = useState([]);

  const [centroMapa, setCentroMapa] = useState([40.4168, -3.7038]);
  const [coordenadasModificadas, setCoordenadasModificadas] = useState({ lat: '', lon: '' });

  const [ficherosParaImportar, setFicherosParaImportar] = useState([]);

  useEffect(() => {
    axios.get(`${API_URL}/api/config`)
      .then(res => {
        setConfig(res.data);
        if (res.data.mapas && res.data.mapas.length > 0) {
          const primerMapa = res.data.mapas[0];
          setMapaActivo(primerMapa.id);
          const anioActual = new Date().getFullYear();
          const autoEmpId = `EMP-${anioActual}-${String(1).padStart(4, '0')}`;
          const autoInvId = `INV-${anioActual}-${String(1).padStart(4, '0')}`;

          setUbicacionForm(prev => ({
            ...prev,
            codigo_emplazamiento: autoEmpId,
            planta: primerMapa.plantas[0] || '',
            zona: primerMapa.zonas[0] || ''
          }));
          
          setDispositivoForm(prev => ({
            ...prev,
            id_registro: autoInvId
          }));

          if (primerMapa.latitud_base && primerMapa.longitud_base) {
            const lat = Number(primerMapa.latitud_base);
            const lon = Number(primerMapa.longitud_base);
            setCentroMapa([lat, lon]);
            setCoordenadasModificadas({ lat: lat.toString(), lon: lon.toString() });
          }
        }
      })
      .catch(err => console.error('Error al cargar configuración desde la API:', err));
  }, []);

  const mapaConfigActual = config?.mapas.find(m => m.id === mapaActivo) || { plantas: [], zonas: [], nombre_visual: '', nombre_mental: '' };

  const handleCambioMapa = (nuevoMapaId) => {
    setMapaActivo(nuevoMapaId);
    const mapaSeleccionado = config?.mapas.find(m => m.id === nuevoMapaId);
    if (mapaSeleccionado) {
      const anioActual = new Date().getFullYear();
      const autoEmpId = `EMP-${anioActual}-${String(listaUbicaciones.length + 1).padStart(4, '0')}`;
      const autoInvId = `INV-${anioActual}-${String(listaDispositivos.length + 1).padStart(4, '0')}`;

      setUbicacionForm(prev => ({
        ...prev,
        codigo_emplazamiento: autoEmpId,
        planta: mapaSeleccionado.plantas[0] || '',
        zona: mapaSeleccionado.zonas[0] || ''
      }));

      setDispositivoForm(prev => ({
        ...prev,
        id_registro: autoInvId
      }));

      if (mapaSeleccionado.latitud_base && mapaSeleccionado.longitud_base) {
        const lat = Number(mapaSeleccionado.latitud_base);
        const lon = Number(mapaSeleccionado.longitud_base);
        setCentroMapa([lat, lon]);
        setCoordenadasModificadas({ lat: lat.toString(), lon: lon.toString() });
      }
    }
  };

  useEffect(() => {
    if (!mapaActivo) return;

    axios.get(`${API_URL}/api/${mapaActivo}/ubicaciones`)
      .then(res => {
        const ubsValidada = res.data.map(ub => ({
          ...ub,
          latitud: ub.latitud !== null && ub.latitud !== undefined ? Number(ub.latitud) : null,
          longitud: ub.longitud !== null && ub.longitud !== undefined ? Number(ub.longitud) : null
        }));
        setListaUbicaciones(ubsValidada);
        
        const anioActual = new Date().getFullYear();
        const autoEmpId = `EMP-${anioActual}-${String(ubsValidada.length + 1).padStart(4, '0')}`;
        
        setUbicacionForm(prev => ({
          ...prev,
          codigo_emplazamiento: autoEmpId
        }));

        if (ubsValidada.length > 0 && !dispositivoForm.codigo_emplazamiento) {
          setDispositivoForm(prev => ({ ...prev, codigo_emplazamiento: ubsValidada[0].codigo_emplazamiento }));
        }
      })
      .catch(err => console.error('Error al cargar ubicaciones:', err));

    axios.get(`${API_URL}/api/${mapaActivo}/inventario`)
      .then(res => {
        const dispValidada = res.data.map(dev => ({
          ...dev,
          latitud: dev.latitud !== null && dev.latitud !== undefined ? Number(dev.latitud) : null,
          longitud: dev.longitud !== null && dev.longitud !== undefined ? Number(dev.longitud) : null
        }));
        setListaDispositivos(dispValidada);
        const anioActual = new Date().getFullYear();
        const autoInvId = `INV-${anioActual}-${String(dispValidada.length + 1).padStart(4, '0')}`;
        setDispositivoForm(prev => ({ ...prev, id_registro: autoInvId }));
      })
      .catch(err => console.error('Error al cargar inventario:', err));
  }, [vista, mapaActivo]);

  const capturarGPS = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no está soportada por tu navegador');
      return;
    }
    setLoadingGeo(true);
    setGeoStatus('Fijando coordenadas GPS de alta precisión...');
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude);
        const lon = Number(pos.coords.longitude);
        const alt = pos.coords.altitude ? Number(pos.coords.altitude) : null;
        const precision = pos.coords.accuracy;

        setUbicacionForm(prev => ({ ...prev, latitud: lat, longitud: lon, altitud: alt }));
        setLoadingGeo(false);
        setGeoStatus(`OK [±${precision.toFixed(1)}m] (${lat.toFixed(6)}, ${lon.toFixed(6)})`);
      },
      (err) => {
        setLoadingGeo(false);
        setGeoStatus('Error GPS: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const capturarGPSDispositivo = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no está soportada por tu navegador');
      return;
    }
    setLoadingGeoDisp(true);
    setGeoStatusDisp('Fijando coordenadas GPS para dispositivo...');
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude);
        const lon = Number(pos.coords.longitude);
        const alt = pos.coords.altitude ? Number(pos.coords.altitude) : null;
        const precision = pos.coords.accuracy;

        setDispositivoForm(prev => ({ ...prev, latitud: lat, longitud: lon, altitud: alt }));
        setLoadingGeoDisp(false);
        setGeoStatusDisp(`OK [±${precision.toFixed(1)}m] (${lat.toFixed(6)}, ${lon.toFixed(6)})`);
      },
      (err) => {
        setLoadingGeoDisp(false);
        setGeoStatusDisp('Error GPS: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleUbicacionSubmit = async (e) => {
    e.preventDefault();
    if (ubicacionForm.latitud === null || ubicacionForm.longitud === null) {
      alert('⚠️ Captura primero la posición GPS.');
      return;
    }
    try {
      const payload = {
        ...ubicacionForm,
        latitud: Number(ubicacionForm.latitud),
        longitud: Number(ubicacionForm.longitud)
      };
      await axios.post(`${API_URL}/api/${mapaActivo}/ubicaciones`, payload);
      alert('¡Emplazamiento registrado con éxito!');
      
      const anioActual = new Date().getFullYear();
      const nuevoAutoId = `EMP-${anioActual}-${String(listaUbicaciones.length + 2).padStart(4, '0')}`;

      setUbicacionForm(prev => ({
        ...prev,
        codigo_emplazamiento: nuevoAutoId,
        latitud: null,
        longitud: null,
        altitud: null,
        observaciones: ''
      }));
      setGeoStatus('No capturada');
      setVista('dispositivo');
    } catch (err) {
      alert('Error al registrar ubicación');
    }
  };

  const handleDispositivoSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...dispositivoForm,
        latitud: dispositivoForm.latitud !== null && dispositivoForm.latitud !== '' ? Number(dispositivoForm.latitud) : null,
        longitud: dispositivoForm.longitud !== null && dispositivoForm.longitud !== '' ? Number(dispositivoForm.longitud) : null,
        altitud: dispositivoForm.altitud !== null && dispositivoForm.altitud !== '' ? Number(dispositivoForm.altitud) : null
      };

      await axios.post(`${API_URL}/api/${mapaActivo}/registrar`, payload);
      alert('¡Dispositivo registrado con éxito!');

      const anioActual = new Date().getFullYear();
      const nuevoAutoId = `INV-${anioActual}-${String(listaDispositivos.length + 2).padStart(4, '0')}`;

      setDispositivoForm(prev => ({ 
        ...prev, 
        id_registro: nuevoAutoId,
        marca: '', 
        modelo: '', 
        numero_serie: '', 
        etiqueta: '', 
        latitud: null,
        longitud: null,
        altitud: null,
        observaciones: '' 
      }));
      setGeoStatusDisp('No capturada');
    } catch (err) {
      alert('Error al registrar dispositivo');
    }
  };

  const validarPinConfig = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/config/validar`, { pin: pinIngresado });
      setConfigDesbloqueada(true);
      alert('🔓 Acceso concedido a la configuración.');
    } catch (err) {
      alert('❌ PIN incorrecto.');
    }
  };

  const handlePreValidarFicheros = async (event) => {
    const files = Array.from(event.target.files);
    if (!files || files.length === 0) return;
    
    const resultados = [];

    for (const file of files) {
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const esValido = json && json.export_type && Array.isArray(json.records);
        
        resultados.push({ 
          name: file.name, 
          path: file.webkitRelativePath || file.name, 
          valido: esValido, 
          data: json, 
          count: esValido ? json.records.length : 0,
          error: esValido ? null : "Estructura JSON no reconocida por SIPAit" 
        });
      } catch (e) {
        resultados.push({ 
          name: file.name, 
          path: file.name,
          valido: false, 
          error: "Error de sintaxis JSON o archivo corrupto" 
        });
      }
    }
    setFicherosParaImportar(resultados);
  };

  if (!config) {
    return <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'Arial' }}>Cargando sistema SIPAit...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '750px', margin: 'auto' }}>
      <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '15px' }}>SIPAit - Control Industrial</h2>
      
      {/* Selector de Entorno */}
      <div style={{ marginBottom: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #ddd', textAlign: 'center' }}>
        <label style={{ fontWeight: 'bold', marginRight: '10px' }}>🗺️ Ubicación / Entorno:</label>
        <select 
          value={mapaActivo}
          onChange={(e) => handleCambioMapa(e.target.value)}
          style={{ padding: '6px 10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          {config.mapas.map((mapa) => (
            <option key={mapa.id} value={mapa.id}>
              {mapa.nombre_mental} ({mapa.nombre_visual})
            </option>
          ))}
        </select>
      </div>

      {/* --- SECCIÓN GLOBAL DE SINCRONIZACIÓN USB (Ubicación general en el Main) --- */}
      <div style={{ marginBottom: '15px', padding: '12px', background: '#f1f8ff', borderRadius: '6px', border: '1px dashed #007bff' }}>
        <div style={{ textAlign: 'center' }}>
          <label 
            htmlFor="file-upload-global-usb" 
            style={{ cursor: 'pointer', display: 'inline-block', padding: '8px 16px', background: '#007bff', color: 'white', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px' }}
          >
            📥 Sincronización Global USB (Sonda &rarr; Base)
          </label>
          <input 
            id="file-upload-global-usb" 
            type="file" 
            multiple 
            accept=".json" 
            onChange={(e) => {
              e.stopPropagation();
              handlePreValidarFicheros(e);
            }} 
            style={{ display: 'none' }} 
          />
        </div>

        {Array.isArray(ficherosParaImportar) && ficherosParaImportar.length > 0 && (
          <div style={{ marginTop: '12px', background: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#333' }}>🔍 Verificación Previa y Hashes:</h4>
            <ul style={{ paddingLeft: '20px', margin: '0 0 10px 0', fontSize: '12px' }}>
              {ficherosParaImportar.map((f, idx) => (
                <li key={idx} style={{ color: f.valido ? 'green' : 'red', marginBottom: '3px' }}>
                  <strong>{f.name}</strong> &rarr; {f.valido ? `OK [${f.count} registros listos]` : `⚠️ ${f.error}`}
                </li>
              ))}
            </ul>
            <button 
              type="button"
              onClick={async () => {
                try {
                  const response = await axios.post(`${API_URL}/api/sincronizar-global`);
                  const data = response.data;
                  alert(`✅ Sincronización global completada.\n- Ficheros procesados: ${data.ficheros_procesados}\n- Registros integrados: ${data.registros_integrados}`);
                  setFicherosParaImportar([]);
                  window.location.reload();
                } catch (err) {
                  alert('❌ Error en sincronización global: ' + (err.response?.data?.detail || err.message));
                }
              }}
              style={{ width: '100%', padding: '8px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
            >
              🚀 Ejecutar Volcado Transaccional, Hashes y Papelera
            </button>
          </div>
        )}
      </div>

      {/* Botones de Navegación */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
        <button onClick={() => setVista('ubicacion')} style={{ flex: 1, padding: '10px', background: vista === 'ubicacion' ? '#007bff' : '#e0e0e0', color: vista === 'ubicacion' ? 'white' : '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>1. Emplazamiento</button>
        <button onClick={() => setVista('dispositivo')} style={{ flex: 1, padding: '10px', background: vista === 'dispositivo' ? '#28a745' : '#e0e0e0', color: vista === 'dispositivo' ? 'white' : '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>2. Dispositivos</button>
        <button onClick={() => setVista('resumen')} style={{ flex: 1, padding: '10px', background: vista === 'resumen' ? '#6c757d' : '#e0e0e0', color: vista === 'resumen' ? 'white' : '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>📋 Resumen</button>
        <button onClick={() => setVista('mapa')} style={{ flex: 1, padding: '10px', background: vista === 'mapa' ? '#17a2b8' : '#e0e0e0', color: vista === 'mapa' ? 'white' : '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>🗺️ Mapa Real</button>
        <button onClick={() => setVista('config')} style={{ flex: 1, padding: '10px', background: vista === 'config' ? '#343a40' : '#e0e0e0', color: vista === 'config' ? 'white' : '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>⚙️ Config</button>
      </div>

      {/* VISTA 1: UBICACIÓN */}
      {vista === 'ubicacion' && (
        <form onSubmit={handleUbicacionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3>📍 Registrar Emplazamiento ({mapaConfigActual.nombre_mental})</h3>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Código de Emplazamiento (Autogenerado):</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                style={{ flex: 1, padding: '10px', fontSize: '15px', background: '#e9ecef', boxSizing: 'border-box', fontWeight: 'bold' }} 
                value={ubicacionForm.codigo_emplazamiento} 
                onChange={(e) => setUbicacionForm({...ubicacionForm, codigo_emplazamiento: e.target.value})} 
                required 
              />
              <button 
                type="button" 
                onClick={() => {
                  const anioActual = new Date().getFullYear();
                  const autoId = `EMP-${anioActual}-${String(listaUbicaciones.length + 1).padStart(4, '0')}`;
                  setUbicacionForm(prev => ({ ...prev, codigo_emplazamiento: autoId }));
                }}
                style={{ padding: '0 15px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                🔄 Recalcular ID
              </button>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Planta:</label>
            <select 
              style={{ width: '100%', padding: '10px', fontSize: '15px' }}
              value={ubicacionForm.planta}
              onChange={(e) => setUbicacionForm(prev => ({ ...prev, planta: e.target.value }))}
            >
              {mapaConfigActual.plantas.map((planta, idx) => (
                <option key={idx} value={planta}>{planta}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Zona:</label>
            <select 
              style={{ width: '100%', padding: '10px', fontSize: '15px' }}
              value={ubicacionForm.zona}
              onChange={(e) => setUbicacionForm(prev => ({ ...prev, zona: e.target.value }))}
            >
              {mapaConfigActual.zonas.map((zona, idx) => (
                <option key={idx} value={zona}>{zona}</option>
              ))}
            </select>
          </div>

          <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Estado GPS: <strong>{geoStatus}</strong></p>
            <button type="button" onClick={capturarGPS} style={{ width: '100%', padding: '10px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '12px' }}>
              {loadingGeo ? 'Capturando...' : '📍 Capturar Terna GPS Actual'}
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '3px' }}>Latitud:</label>
                <input type="text" value={ubicacionForm.latitud !== null ? ubicacionForm.latitud : ''} onChange={(e) => setUbicacionForm({...ubicacionForm, latitud: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '3px' }}>Longitud:</label>
                <input type="text" value={ubicacionForm.longitud !== null ? ubicacionForm.longitud : ''} onChange={(e) => setUbicacionForm({...ubicacionForm, longitud: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '3px' }}>Altitud (m):</label>
                <input type="text" value={ubicacionForm.altitud !== null ? ubicacionForm.altitud : ''} onChange={(e) => setUbicacionForm({...ubicacionForm, altitud: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Observaciones:</label>
            <input style={{ width: '100%', padding: '10px', fontSize: '15px', boxSizing: 'border-box' }} value={ubicacionForm.observaciones} onChange={(e) => setUbicacionForm({...ubicacionForm, observaciones: e.target.value})} />
          </div>
          <button type="submit" style={{ padding: '15px', background: '#007bff', color: 'white', fontSize: '16px', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
            Guardar Emplazamiento
          </button>
        </form>
      )}

      {/* VISTA 2: DISPOSITIVOS */}
      {vista === 'dispositivo' && (
        <form onSubmit={handleDispositivoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3>💻 Registrar Dispositivo ({mapaConfigActual.nombre_mental})</h3>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>ID de Registro (Autogenerado):</label>
            <input 
              style={{ width: '100%', padding: '10px', fontSize: '15px', background: '#e9ecef', boxSizing: 'border-box', fontWeight: 'bold' }} 
              value={dispositivoForm.id_registro} 
              onChange={(e) => setDispositivoForm({...dispositivoForm, id_registro: e.target.value})} 
              required 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Emplazamiento Asociado:</label>
            <select 
              style={{ width: '100%', padding: '10px', fontSize: '15px', background: '#fff' }}
              value={dispositivoForm.codigo_emplazamiento}
              onChange={(e) => setDispositivoForm({...dispositivoForm, codigo_emplazamiento: e.target.value})}
              required
            >
              {listaUbicaciones.map((ub, idx) => (
                <option key={idx} value={ub.codigo_emplazamiento}>
                  {ub.codigo_emplazamiento} ({ub.planta} - {ub.zona})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Tipo:</label>
            <select 
              style={{ width: '100%', padding: '10px', fontSize: '15px' }}
              value={dispositivoForm.tipo}
              onChange={(e) => setDispositivoForm({...dispositivoForm, tipo: e.target.value})}
            >
              {config.tipos_dispositivos.map((t, idx) => (
                <option key={idx} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Marca:</label>
            <input style={{ width: '100%', padding: '10px', fontSize: '15px', boxSizing: 'border-box' }} value={dispositivoForm.marca} onChange={(e) => setDispositivoForm({...dispositivoForm, marca: e.target.value})} required />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Modelo:</label>
            <input style={{ width: '100%', padding: '10px', fontSize: '15px', boxSizing: 'border-box' }} value={dispositivoForm.modelo} onChange={(e) => setDispositivoForm({...dispositivoForm, modelo: e.target.value})} required />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Número de Serie:</label>
            <input style={{ width: '100%', padding: '10px', fontSize: '15px', boxSizing: 'border-box' }} value={dispositivoForm.numero_serie} onChange={(e) => setDispositivoForm({...dispositivoForm, numero_serie: e.target.value})} required />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Etiqueta de Inventario (Compañía):</label>
            <input style={{ width: '100%', padding: '10px', fontSize: '15px', boxSizing: 'border-box' }} value={dispositivoForm.etiqueta} onChange={(e) => setDispositivoForm({...dispositivoForm, etiqueta: e.target.value})} placeholder="Ej: ETQ-998822" required />
          </div>

          <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Geolocalización del Dispositivo: <strong>{geoStatusDisp}</strong></p>
            <button type="button" onClick={capturarGPSDispositivo} style={{ width: '100%', padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '12px' }}>
              {loadingGeoDisp ? 'Capturando...' : '📍 Capturar GPS de Dispositivo'}
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '3px' }}>Latitud:</label>
                <input type="text" value={dispositivoForm.latitud !== null ? dispositivoForm.latitud : ''} onChange={(e) => setDispositivoForm({...dispositivoForm, latitud: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '3px' }}>Longitud:</label>
                <input type="text" value={dispositivoForm.longitud !== null ? dispositivoForm.longitud : ''} onChange={(e) => setDispositivoForm({...dispositivoForm, longitud: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '3px' }}>Altitud (m):</label>
                <input type="text" value={dispositivoForm.altitud !== null ? dispositivoForm.altitud : ''} onChange={(e) => setDispositivoForm({...dispositivoForm, altitud: e.target.value})} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>

          <button type="submit" style={{ padding: '15px', background: '#28a745', color: 'white', fontSize: '16px', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
            Registrar Dispositivo
          </button>
        </form>
      )}

      {/* VISTA 3: RESUMEN DE REGISTROS (Limpio de importadores locales) */}
      {vista === 'resumen' && (
        <div>
          <h3>📋 Resumen de Datos: {mapaConfigActual.nombre_mental}</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <h4>📍 Emplazamientos Registrados ({listaUbicaciones.length})</h4>
            {listaUbicaciones.map((ub, idx) => (
              <li key={idx}><strong>{ub.codigo_emplazamiento}</strong> ({ub.planta} - {ub.zona}) {ub.latitud && ub.longitud ? '📍 [GPS OK]' : ''}</li>
            ))}
          </div>
          <div>
            <h4>💻 Dispositivos Registrados ({listaDispositivos.length})</h4>
            {listaDispositivos.map((dev, idx) => (
              <li key={idx}><strong>[{dev.id_registro}] {dev.tipo}</strong> {dev.marca} {dev.modelo} [Etq: {dev.etiqueta}] &rarr; <code>{dev.codigo_emplazamiento}</code> {dev.latitud && dev.longitud ? '📍 [GPS OK]' : ''}</li>
            ))}
          </div>
        </div>
      )}

      {/* VISTA 4: MAPA REAL */}
      {vista === 'mapa' && (
        <div>
          <div style={{ height: '450px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ccc' }}>
            <MapContainer center={centroMapa} zoom={19} maxZoom={20} style={{ height: '100%', width: '100%' }}>
              <ChangeView center={centroMapa} zoom={19} />
              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxNativeZoom={19} maxZoom={20} />
              
              {listaUbicaciones.map((ub, idx) => (
                ub.latitud && ub.longitud && (
                  <Marker key={`ub-${idx}`} position={[ub.latitud, ub.longitud]} icon={iconoEmplazamiento}>
                    <Popup>
                      <strong>Emplazamiento:</strong> {ub.codigo_emplazamiento}<br/>
                      Planta: {ub.planta} | Zona: {ub.zona}
                    </Popup>
                  </Marker>
                )
              ))}

              {listaDispositivos.map((dev, idx) => (
                dev.latitud && dev.longitud && (
                  <Marker key={`dev-${idx}`} position={[dev.latitud, dev.longitud]} icon={iconoDispositivo}>
                    <Popup>
                      <strong>Dispositivo:</strong> [{dev.id_registro}] {dev.tipo}<br/>
                      Marca/Modelo: {dev.marca} {dev.modelo}<br/>
                      Emplazamiento: {dev.codigo_emplazamiento}
                    </Popup>
                  </Marker>
                )
              ))}

            </MapContainer>
          </div>
        </div>
      )}

      {/* VISTA 5: CONFIGURACIÓN */}
      {vista === 'config' && (
        <div>
          <h3>⚙️ Configuración del Sistema (Core)</h3>
          {!configDesbloqueada ? (
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '6px', border: '1px solid #ddd', textAlign: 'center' }}>
              <p>Esta sección está protegida para evitar modificaciones accidentales.</p>
              <form onSubmit={validarPinConfig} style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
                <input 
                  type="password" 
                  placeholder="Introduce PIN (por defecto 1234)" 
                  value={pinIngresado} 
                  onChange={(e) => setPinIngresado(e.target.value)}
                  style={{ padding: '8px', fontSize: '14px' }}
                  required
                />
                <button type="submit" style={{ padding: '8px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Desbloquear</button>
              </form>
            </div>
          ) : (
            <div style={{ background: '#e2f0d9', padding: '15px', borderRadius: '6px', border: '1px solid #c3e6cb' }}>
              <h4 style={{ color: '#155724', marginTop: 0 }}>🔓 Panel de Configuración Maestro Desbloqueado</h4>
              <p style={{ fontSize: '14px' }}>Aquí gestionaremos próximamente la adición dinámica de tipos de dispositivos, plantas y zonas directamente sobre el fichero del core.</p>
              <pre style={{ background: '#fff', padding: '10px', fontSize: '12px', overflowX: 'auto', border: '1px solid #ddd' }}>
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;