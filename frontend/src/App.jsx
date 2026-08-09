import { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Solución estándar para los iconos de Leaflet en React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const API_URL = 'http://localhost:8000'; 

function App() {
  const [vista, setVista] = useState('ubicacion'); // 'ubicacion', 'dispositivo', o 'mapa'

  // --- Estados para Ubicación ---
  const [ubicacionForm, setUbicacionForm] = useState({
    codigo_emplazamiento: '',
    planta: 'Planta Baja',
    zona: 'Línea de Producción 1',
    latitud: null,
    longitud: null,
    observaciones: ''
  });
  const [geoStatus, setGeoStatus] = useState('No capturada');
  const [loadingGeo, setLoadingGeo] = useState(false);

  // --- Estados para Dispositivo ---
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

  // Cargar ubicaciones cuando se necesiten
  useEffect(() => {
    if (vista === 'dispositivo' || vista === 'mapa') {
      axios.get(`${API_URL}/api/ubicaciones`)
        .then(res => {
          setListaUbicaciones(res.data);
          if (res.data.length > 0 && !dispositivoForm.codigo_emplazamiento && vista === 'dispositivo') {
            setDispositivoForm(prev => ({ ...prev, codigo_emplazamiento: res.data[0].codigo_emplazamiento }));
          }
        })
        .catch(err => console.error('Error al cargar ubicaciones:', err));
    }
  }, [vista]);

  // Capturar GPS
  const capturarGPS = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no está soportada por tu navegador');
      return;
    }
    setLoadingGeo(true);
    setGeoStatus('Obteniendo coordenadas...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacionForm({
          ...ubicacionForm,
          latitud: pos.coords.latitude,
          longitud: pos.coords.longitude
        });
        setLoadingGeo(false);
        setGeoStatus(`OK (${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)})`);
      },
      (err) => {
        setLoadingGeo(false);
        setGeoStatus('Error GPS: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Enviar Ubicación
  const handleUbicacionSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/ubicaciones`, ubicacionForm);
      alert('¡Emplazamiento registrado con éxito!');
      setUbicacionForm({
        codigo_emplazamiento: '',
        planta: 'Planta Baja',
        zona: 'Línea de Producción 1',
        latitud: null,
        longitud: null,
        observaciones: ''
      });
      setGeoStatus('No capturada');
      setVista('dispositivo');
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Enviar Dispositivo
  const handleDispositivoSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/registrar`, dispositivoForm);
      alert('¡Dispositivo registrado y enlazado a la ubicación con éxito!');
      setDispositivoForm({
        ...dispositivoForm,
        marca: '',
        modelo: '',
        numero_serie: '',
        observaciones: ''
      });
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Coordenadas por defecto para centrar el mapa
  const centroMapa = listaUbicaciones.length > 0 && listaUbicaciones[0].latitud 
    ? [listaUbicaciones[0].latitud, listaUbicaciones[0].longitud] 
    : [40.4168, -3.7038]; // Madrid por defecto

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '600px', margin: 'auto' }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>SIPAit - Control Industrial</h2>
      
      {/* Botones de Navegación */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
        <button 
          onClick={() => setVista('ubicacion')}
          style={{ flex: 1, padding: '10px', background: vista === 'ubicacion' ? '#007bff' : '#e0e0e0', color: vista === 'ubicacion' ? 'white' : '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
        >
          1. Emplazamiento
        </button>
        <button 
          onClick={() => setVista('dispositivo')}
          style={{ flex: 1, padding: '10px', background: vista === 'dispositivo' ? '#28a745' : '#e0e0e0', color: vista === 'dispositivo' ? 'white' : '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
        >
          2. Dispositivos
        </button>
        <button 
          onClick={() => setVista('mapa')}
          style={{ flex: 1, padding: '10px', background: vista === 'mapa' ? '#17a2b8' : '#e0e0e0', color: vista === 'mapa' ? 'white' : '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
        >
          🗺️ Mapa
        </button>
      </div>

      {/* VISTA 1: REGISTRO DE UBICACIÓN */}
      {vista === 'ubicacion' && (
        <form onSubmit={handleUbicacionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3>📍 Paso 1: Registrar Ubicación Física</h3>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Código de Emplazamiento:</label>
            <input 
              style={{ width: '100%', padding: '10px', fontSize: '16px', boxSizing: 'border-box' }}
              placeholder="Ej: FAB-PL2-TOMA04" 
              value={ubicacionForm.codigo_emplazamiento} 
              onChange={(e) => setUbicacionForm({...ubicacionForm, codigo_emplazamiento: e.target.value})} 
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Planta / Área:</label>
            <select 
              style={{ width: '100%', padding: '10px', fontSize: '16px', boxSizing: 'border-box' }}
              value={ubicacionForm.planta}
              onChange={(e) => setUbicacionForm({...ubicacionForm, planta: e.target.value})}
            >
              <option>Planta Baja</option>
              <option>Planta 1 - Oficinas</option>
              <option>Planta 2 - Producción</option>
              <option>Zona Logística / Almacén</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Zona Específica:</label>
            <select 
              style={{ width: '100%', padding: '10px', fontSize: '16px', boxSizing: 'border-box' }}
              value={ubicacionForm.zona}
              onChange={(e) => setUbicacionForm({...ubicacionForm, zona: e.target.value})}
            >
              <option>Línea de Producción 1</option>
              <option>Línea de Producción 2</option>
              <option>Control de Calidad</option>
              <option>Mantenimiento</option>
              <option>Administración</option>
            </select>
          </div>
          <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>GPS: <strong>{geoStatus}</strong></p>
            <button 
              type="button" 
              onClick={capturarGPS}
              style={{ width: '100%', padding: '10px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {loadingGeo ? 'Localizando...' : '📍 Capturar Posición Actual'}
            </button>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Observaciones:</label>
            <input 
              style={{ width: '100%', padding: '10px', fontSize: '16px', boxSizing: 'border-box' }}
              placeholder="Ej: Junto al armario principal" 
              value={ubicacionForm.observaciones} 
              onChange={(e) => setUbicacionForm({...ubicacionForm, observaciones: e.target.value})} 
            />
          </div>
          <button 
            type="submit" 
            style={{ padding: '15px', background: '#007bff', color: 'white', fontSize: '16px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Guardar Emplazamiento
          </button>
        </form>
      )}

      {/* VISTA 2: REGISTRO DE DISPOSITIVOS */}
      {vista === 'dispositivo' && (
        <form onSubmit={handleDispositivoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3>💻 Paso 2: Registrar Dispositivo y Enlazar</h3>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Asociar a Emplazamiento:</label>
            {listaUbicaciones.length === 0 ? (
              <p style={{ color: 'red', fontSize: '14px' }}>⚠️ No hay ubicaciones creadas. Registra una en el Paso 1 primero.</p>
            ) : (
              <select 
                style={{ width: '100%', padding: '10px', fontSize: '16px', boxSizing: 'border-box', background: '#e9ecef' }}
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
            )}
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Tipo de Dispositivo:</label>
            <select 
              style={{ width: '100%', padding: '10px', fontSize: '16px', boxSizing: 'border-box' }}
              value={dispositivoForm.tipo}
              onChange={(e) => setDispositivoForm({...dispositivoForm, tipo: e.target.value})}
            >
              <option>PC Sobremesa</option>
              <option>Portátil</option>
              <option>Monitor</option>
              <option>Impresora</option>
              <option>Switch / Hub</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Marca:</label>
            <input 
              style={{ width: '100%', padding: '10px', fontSize: '16px', boxSizing: 'border-box' }}
              placeholder="Ej: HP, Dell, Lenovo" 
              value={dispositivoForm.marca} 
              onChange={(e) => setDispositivoForm({...dispositivoForm, marca: e.target.value})} 
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Modelo:</label>
            <input 
              style={{ width: '100%', padding: '10px', fontSize: '16px', boxSizing: 'border-box' }}
              placeholder="Ej: OptiPlex 3090" 
              value={dispositivoForm.modelo} 
              onChange={(e) => setDispositivoForm({...dispositivoForm, modelo: e.target.value})} 
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Número de Serie:</label>
            <input 
              style={{ width: '100%', padding: '10px', fontSize: '16px', boxSizing: 'border-box' }}
              placeholder="Introduce Nº de Serie" 
              value={dispositivoForm.numero_serie} 
              onChange={(e) => setDispositivoForm({...dispositivoForm, numero_serie: e.target.value})} 
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={listaUbicaciones.length === 0}
            style={{ padding: '15px', background: listaUbicaciones.length === 0 ? '#ccc' : '#28a745', color: 'white', fontSize: '16px', border: 'none', borderRadius: '5px', cursor: listaUbicaciones.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
          >
            Registrar y Enlazar Dispositivo
          </button>
        </form>
      )}

      {/* VISTA 3: MAPA INTERACTIVO */}
      {vista === 'mapa' && (
        <div>
          <h3>🗺️ Visualización de Emplazamientos</h3>
          <p style={{ fontSize: '13px', color: '#666' }}>Puntos de red y equipos registrados geolocalizados:</p>
          
          <div style={{ height: '450px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ccc', marginTop: '10px' }}>
            <MapContainer 
              center={centroMapa} 
              zoom={19} 
              maxZoom={20} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxNativeZoom={19} 
                maxZoom={20}
              />
              {listaUbicaciones.map((ub, idx) => {
                if (!ub.latitud || !ub.longitud) return null;
                return (
                  <Marker key={idx} position={[ub.latitud, ub.longitud]}>
                    <Popup>
                      <strong>{ub.codigo_emplazamiento}</strong><br />
                      Planta: {ub.planta}<br />
                      Zona: {ub.zona}<br />
                      {ub.observaciones && <em>Obs: {ub.observaciones}</em>}
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