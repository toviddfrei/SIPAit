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
  className: 'custom-device',
  html: '<div style="background-color: #28a745; width: 14px; height: 14px; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.6); border-radius: 50%;" title="Dispositivo"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 14],
});

const API_URL = 'http://localhost:8000';

// Componente auxiliar para forzar el re-centrado y renderizado de Leaflet
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

  const [ubicacionForm, setUbicacionForm] = useState({
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
    tipo: 'PC Sobremesa',
    marca: '',
    modelo: '',
    numero_serie: '',
    estado: 'Operativo',
    codigo_emplazamiento: '',
    observaciones: ''
  });

  const [listaUbicaciones, setListaUbicaciones] = useState([]);
  const [listaDispositivos, setListaDispositivos] = useState([]);

  // Estados para la gestión y re-fijación del mapa
  const [centroMapa, setCentroMapa] = useState([40.4168, -3.7038]);
  const [coordenadasModificadas, setCoordenadasModificadas] = useState({ lat: '', lon: '' });
  const [editandoCentro, setEditandoCentro] = useState(false);

  // 1. Cargar configuración inicial
  useEffect(() => {
    axios.get('/config.json')
      .then(res => {
        setConfig(res.data);
        if (res.data.mapas && res.data.mapas.length > 0) {
          const primerMapa = res.data.mapas[0];
          setMapaActivo(primerMapa.id);
          setUbicacionForm(prev => ({
            ...prev,
            planta: primerMapa.plantas[0] || '',
            zona: primerMapa.zonas[0] || ''
          }));
          if (primerMapa.latitud_base && primerMapa.longitud_base) {
            const lat = Number(primerMapa.latitud_base);
            const lon = Number(primerMapa.longitud_base);
            setCentroMapa([lat, lon]);
            setCoordenadasModificadas({ lat: lat.toString(), lon: lon.toString() });
          }
        }
      })
      .catch(err => console.error('Error al cargar config.json:', err));
  }, []);

  const mapaConfigActual = config?.mapas.find(m => m.id === mapaActivo) || { plantas: [], zonas: [], nombre_visual: '', nombre_mental: '' };

  const handleCambioMapa = (nuevoMapaId) => {
    setMapaActivo(nuevoMapaId);
    const mapaSeleccionado = config?.mapas.find(m => m.id === nuevoMapaId);
    if (mapaSeleccionado) {
      setUbicacionForm(prev => ({
        ...prev,
        planta: mapaSeleccionado.plantas[0] || '',
        zona: mapaSeleccionado.zonas[0] || ''
      }));
      if (mapaSeleccionado.latitud_base && mapaSeleccionado.longitud_base) {
        const lat = Number(mapaSeleccionado.latitud_base);
        const lon = Number(mapaSeleccionado.longitud_base);
        setCentroMapa([lat, lon]);
        setCoordenadasModificadas({ lat: lat.toString(), lon: lon.toString() });
      }
    }
  };

  // 2. Cargar datos del entorno activo
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
        if (ubsValidada.length > 0 && !dispositivoForm.codigo_emplazamiento) {
          setDispositivoForm(prev => ({ ...prev, codigo_emplazamiento: ubsValidada[0].codigo_emplazamiento }));
        }
      })
      .catch(err => console.error('Error al cargar ubicaciones:', err));

    axios.get(`${API_URL}/api/${mapaActivo}/inventario`)
      .then(res => setListaDispositivos(res.data))
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

        setUbicacionForm({ ...ubicacionForm, latitud: lat, longitud: lon, altitud: alt });
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

  // Función para capturar GPS e inmediatamente fijarlo como centro del mapa
  const capturarGPSParaMapa = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no está soportada por tu navegador');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude);
        const lon = Number(pos.coords.longitude);
        setCentroMapa([lat, lon]);
        setCoordenadasModificadas({ lat: lat.toString(), lon: lon.toString() });
      },
      (err) => alert('Error GPS: ' + err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleGuardarNuevoCentro = () => {
    const nuevaLat = parseFloat(coordenadasModificadas.lat);
    const nuevaLon = parseFloat(coordenadasModificadas.lon);

    if (isNaN(nuevaLat) || isNaN(nuevaLon)) {
      alert('⚠️ Introduce coordenadas numéricas válidas.');
      return;
    }

    setCentroMapa([nuevaLat, nuevaLon]);
    setEditandoCentro(false);
    alert('📍 Ubicación base del mapa actualizada correctamente.');
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
      setUbicacionForm(prev => ({
        ...prev,
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
      await axios.post(`${API_URL}/api/${mapaActivo}/registrar`, dispositivoForm);
      alert('¡Dispositivo registrado con éxito!');
      setDispositivoForm(prev => ({ ...prev, marca: '', modelo: '', numero_serie: '', observaciones: '' }));
    } catch (err) {
      alert('Error al registrar dispositivo');
    }
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

      {/* Botones de Navegación */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
        <button onClick={() => setVista('ubicacion')} style={{ flex: 1, padding: '10px', background: vista === 'ubicacion' ? '#007bff' : '#e0e0e0', color: vista === 'ubicacion' ? 'white' : '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>1. Emplazamiento</button>
        <button onClick={() => setVista('dispositivo')} style={{ flex: 1, padding: '10px', background: vista === 'dispositivo' ? '#28a745' : '#e0e0e0', color: vista === 'dispositivo' ? 'white' : '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>2. Dispositivos</button>
        <button onClick={() => setVista('resumen')} style={{ flex: 1, padding: '10px', background: vista === 'resumen' ? '#6c757d' : '#e0e0e0', color: vista === 'resumen' ? 'white' : '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>📋 Resumen</button>
        <button onClick={() => setVista('mapa')} style={{ flex: 1, padding: '10px', background: vista === 'mapa' ? '#17a2b8' : '#e0e0e0', color: vista === 'mapa' ? 'white' : '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>🗺️ Mapa Real</button>
      </div>

      {/* VISTA 1: UBICACIÓN */}
      {vista === 'ubicacion' && (
        <form onSubmit={handleUbicacionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3>📍 Registrar Emplazamiento ({mapaConfigActual.nombre_mental})</h3>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Código de Emplazamiento (Autogenerado / Referencia):</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                style={{ flex: 1, padding: '10px', fontSize: '15px', background: '#e9ecef', boxSizing: 'border-box' }} 
                value={ubicacionForm.codigo_emplazamiento || `${mapaActivo}-${ubicacionForm.planta}-${ubicacionForm.zona}`.toUpperCase()} 
                onChange={(e) => setUbicacionForm({...ubicacionForm, codigo_emplazamiento: e.target.value})} 
                placeholder="Ej: NAVE-01-SVR"
                required 
              />
              <button 
                type="button" 
                onClick={() => {
                  const autoId = `${mapaActivo}-${ubicacionForm.planta}-${ubicacionForm.zona}`.toUpperCase().replace(/\s+/g, '_');
                  setUbicacionForm(prev => ({ ...prev, codigo_emplazamiento: autoId }));
                }}
                style={{ padding: '0 15px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                🔄 Autogenerar
              </button>
            </div>
            <span style={{ fontSize: '12px', color: '#666', marginTop: '3px', display: 'block' }}>Se genera basándose en el entorno, planta y zona seleccionados.</span>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Planta:</label>
            <select 
              style={{ width: '100%', padding: '10px', fontSize: '15px' }}
              value={ubicacionForm.planta}
              onChange={(e) => {
                const nuevaPlanta = e.target.value;
                setUbicacionForm(prev => {
                  const nuevoForm = { ...prev, planta: nuevaPlanta };
                  nuevoForm.codigo_emplazamiento = `${mapaActivo}-${nuevaPlanta}-${prev.zona}`.toUpperCase().replace(/\s+/g, '_');
                  return nuevoForm;
                });
              }}
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
              onChange={(e) => {
                const nuevaZona = e.target.value;
                setUbicacionForm(prev => {
                  const nuevoForm = { ...prev, zona: nuevaZona };
                  nuevoForm.codigo_emplazamiento = `${mapaActivo}-${prev.planta}-${nuevaZona}`.toUpperCase().replace(/\s+/g, '_');
                  return nuevoForm;
                });
              }}
            >
              {mapaConfigActual.zonas.map((zona, idx) => (
                <option key={idx} value={zona}>{zona}</option>
              ))}
            </select>
          </div>

          {/* Bloque Conjunto: Terna Geográfica Inseparable (Latitud, Longitud, Altitud) */}
          <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Estado GPS: <strong>{geoStatus}</strong></p>
            <button type="button" onClick={capturarGPS} style={{ width: '100%', padding: '10px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '12px' }}>
              {loadingGeo ? 'Capturando...' : '📍 Capturar Terna GPS Actual'}
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '3px' }}>Latitud:</label>
                <input 
                  type="text" 
                  value={ubicacionForm.latitud !== null ? ubicacionForm.latitud : ''} 
                  onChange={(e) => setUbicacionForm({...ubicacionForm, latitud: e.target.value})}
                  placeholder="Ej: 40.4168"
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '3px' }}>Longitud:</label>
                <input 
                  type="text" 
                  value={ubicacionForm.longitud !== null ? ubicacionForm.longitud : ''} 
                  onChange={(e) => setUbicacionForm({...ubicacionForm, longitud: e.target.value})}
                  placeholder="Ej: -3.7038"
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '3px' }}>Altitud (m):</label>
                <input 
                  type="text" 
                  value={ubicacionForm.altitud !== null ? ubicacionForm.altitud : ''} 
                  onChange={(e) => setUbicacionForm({...ubicacionForm, altitud: e.target.value})}
                  placeholder="Ej: 650"
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
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
            <label style={{ display: 'block', marginBottom: '5px' }}>Emplazamiento Asociado:</label>
            <select 
              style={{ width: '100%', padding: '10px', fontSize: '15px', background: '#e9ecef' }}
              value={dispositivoForm.codigo_emplazamiento}
              onChange={(e) => setDispositivoForm({...dispositivoForm, codigo_emplazamiento: e.target.value})}
              required
            >
              {listaUbicaciones.map((ub, idx) => (
                <option key={idx} value={ub.codigo_emplazamiento}>
                  {ub.codigo_emplazamiento} ({ub.planta} - {ub.zona}) [Lat: {ub.latitud?.toFixed(4)}, Lon: {ub.longitud?.toFixed(4)}]
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
          <button type="submit" style={{ padding: '15px', background: '#28a745', color: 'white', fontSize: '16px', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
            Registrar Dispositivo
          </button>
        </form>
      )}

      {/* VISTA 3: RESUMEN DE REGISTROS */}
      {vista === 'resumen' && (
        <div>
          <h3>📋 Resumen de Datos: {mapaConfigActual.nombre_mental}</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <h4>📍 Emplazamientos Registrados ({listaUbicaciones.length})</h4>
            {listaUbicaciones.length === 0 ? (
              <p style={{ color: '#666', fontSize: '14px' }}>No hay emplazamientos registrados en este entorno.</p>
            ) : (
              <ul style={{ paddingLeft: '20px', fontSize: '14px' }}>
                {listaUbicaciones.map((ub, idx) => (
                  <li key={idx} style={{ marginBottom: '6px' }}>
                    <strong>{ub.codigo_emplazamiento}</strong> ({ub.planta} - {ub.zona}) &rarr; Lat: {ub.latitud?.toFixed(6)}, Lon: {ub.longitud?.toFixed(6)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4>💻 Dispositivos Registrados ({listaDispositivos.length})</h4>
            {listaDispositivos.length === 0 ? (
              <p style={{ color: '#666', fontSize: '14px' }}>No hay dispositivos registrados en este entorno.</p>
            ) : (
              <ul style={{ paddingLeft: '20px', fontSize: '14px' }}>
                {listaDispositivos.map((dev, idx) => (
                  <li key={idx} style={{ marginBottom: '6px' }}>
                    <strong>{dev.tipo}</strong> {dev.marca} {dev.modelo} (N/S: {dev.numero_serie}) &rarr; Emplazamiento: <code>{dev.codigo_emplazamiento}</code>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* VISTA 4: MAPA REAL Y VERIFICACIÓN / FIJACIÓN DE UBICACIÓN */}
      {vista === 'mapa' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0 }}>🗺️ Visor de Entorno: {mapaConfigActual.nombre_mental}</h3>
            <button 
              onClick={() => setEditandoCentro(!editandoCentro)} 
              style={{ padding: '6px 12px', background: editandoCentro ? '#6c757d' : '#ffc107', color: '#212529', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {editandoCentro ? 'Cancelar Calibración' : '⚙️ Recalibrar Ubicación Base'}
            </button>
          </div>

          {/* Panel informativo / Verificación de Dirección del Mapa */}
          <div style={{ background: '#e9ecef', padding: '12px', borderRadius: '6px', marginBottom: '15px', border: '1px solid #ced4da', fontSize: '13px' }}>
            <p style={{ margin: '0 0 5px 0' }}>
              <strong>📍 Coordenadas Base Actuales:</strong> {centroMapa[0].toFixed(6)}, {centroMapa[1].toFixed(6)}
            </p>
            <p style={{ margin: 0, color: '#555' }}>
              {listaUbicaciones.length} emplazamientos / {listaDispositivos.length} dispositivos en este entorno.
            </p>
          </div>

          {/* Formulario desplegable para ajustar o Fijar la Posición del Mapa */}
          {editandoCentro && (
            <div style={{ background: '#fff3cd', border: '1px solid #ffeeba', padding: '15px', borderRadius: '6px', marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>🎯 Ajustar Posición Central del Mapa</h4>
              <p style={{ fontSize: '13px', margin: '0 0 10px 0', color: '#856404' }}>
                Si la dirección actual no es correcta, introduce las nuevas coordenadas o utiliza tu GPS actual para fijar el centro del visor.
              </p>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Latitud Base:</label>
                  <input 
                    type="text" 
                    value={coordenadasModificadas.lat} 
                    onChange={(e) => setCoordenadasModificadas({ ...coordenadasModificadas, lat: e.target.value })}
                    style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold' }}>Longitud Base:</label>
                  <input 
                    type="text" 
                    value={coordenadasModificadas.lon} 
                    onChange={(e) => setCoordenadasModificadas({ ...coordenadasModificadas, lon: e.target.value })}
                    style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={capturarGPSParaMapa}
                  style={{ flex: 1, padding: '8px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  📍 Obtener Posición GPS Actual
                </button>
                <button 
                  type="button" 
                  onClick={handleGuardarNuevoCentro}
                  style={{ flex: 1, padding: '8px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  💾 Aplicar y Centrar Mapa
                </button>
              </div>
            </div>
          )}

          {/* Contenedor del Mapa */}
          <div style={{ height: '450px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ccc' }}>
            <MapContainer center={centroMapa} zoom={19} maxZoom={20} style={{ height: '100%', width: '100%' }}>
              <ChangeView center={centroMapa} zoom={19} />
              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxNativeZoom={19} maxZoom={20} />

              {/* Puntos de Emplazamientos */}
              {listaUbicaciones.map((ub, idx) => {
                if (ub.latitud === null || ub.longitud === null || isNaN(ub.latitud) || isNaN(ub.longitud)) return null;
                return (
                  <Marker key={`ub-${idx}`} position={[ub.latitud, ub.longitud]} icon={iconoEmplazamiento}>
                    <Popup>
                      <div style={{ fontSize: '12px' }}>
                        <strong style={{ color: '#007bff' }}>📍 EMPLAZAMIENTO</strong><br />
                        <strong>Código:</strong> {ub.codigo_emplazamiento}<br />
                        <strong>Planta/Zona:</strong> {ub.planta} - {ub.zona}<br />
                        <strong>Coordenadas:</strong> {ub.latitud.toFixed(6)}, {ub.longitud.toFixed(6)}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Puntos de Dispositivos */}
              {listaDispositivos.map((dev, idx) => {
                const ubAsociada = listaUbicaciones.find(u => u.codigo_emplazamiento === dev.codigo_emplazamiento);
                if (!ubAsociada || ubAsociada.latitud === null || ubAsociada.longitud === null || isNaN(ubAsociada.latitud) || isNaN(ubAsociada.longitud)) return null;
                return (
                  <Marker key={`dev-${idx}`} position={[ubAsociada.latitud, ubAsociada.longitud]} icon={iconoDispositivo}>
                    <Popup>
                      <div style={{ fontSize: '12px' }}>
                        <strong style={{ color: '#28a745' }}>💻 DISPOSITIVO</strong><br />
                        <strong>Tipo:</strong> {dev.tipo}<br />
                        <strong>Equipo:</strong> {dev.marca} {dev.modelo}<br />
                        <strong>N/S:</strong> {dev.numero_serie}<br />
                        <strong>Emplazamiento:</strong> {dev.codigo_emplazamiento}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;