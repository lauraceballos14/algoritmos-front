// 1. Punto base de la API
const API_BASE = 'http://localhost:5000' + '/api/network';
const POINTS_BASE = 'http://localhost:5000' + '/api/points';

// 2. Inicialización del mapa y capas
const map = L.map('map').setView([4.60971, -74.08175], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Creamos roadLayer con filtro y estilo
let roadLayer = L.geoJSON(null, {
  filter: feature => feature.geometry.type === 'LineString',
  style: () => ({ color: '#FF6600', weight: 2 }) 
}).addTo(map);

// Capas para puntos y rutas de algoritmo
let pointsLayer = L.layerGroup().addTo(map);
let algorithmLayer = L.layerGroup().addTo(map);


// 3. Función para cargar y pintar la malla (.osm → Graph backend → {nodes, edges})
async function uploadOSM() {
  const input = document.getElementById('file-osm');
  const file = input.files[0];
  if (!file) {
    return alert('Por favor selecciona un archivo .osm');
  }

  const form = new FormData();
  form.append('file', file);// coincide con req.files.file en el back

  try {
    const res = await fetch(`${API_BASE}/upload-osm`, {
      method: 'POST',
      body: form
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // Convertir edges a GeoJSON
    const meshGeoJSON = await res.json();

    // Limpiar y pintar
    roadLayer.clearLayers();
    roadLayer.addData(meshGeoJSON);

    // Ajustar vista
    map.fitBounds(roadLayer.getBounds());
  } catch (err) {
    console.error(err);
    alert('Error cargando la malla: ' + err.message);
  }
}


// 4. Función para cargar y pintar puntos
async function uploadPoints() {
  const input = document.getElementById('file-points');
  const file = input.files[0];
  if (!file) {
    return alert('Por favor selecciona un archivo .tsv');
  }

  const form = new FormData();
  form.append('file', file);// coincide con req.files.file en el back

  try {
    // Llamada al endpoint que maneja la subida de puntos
    const res = await fetch(`${POINTS_BASE}/upload-points`, {
      method: 'POST',
      body: form
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // Se asume respuesta { pints; [{id,lat,lng}], updateMesh? }
    const { points, updateMesh } = await res.json();

    // 1. Si el back devolvio mesh actualizado, repintamos
    if(updateMesh) {
      roadLayer.clearLayers();
      roadLayer.addData(updateMesh);
      map.fitBounds(roadLayer.getBounds());
    }

    // 2. Pintar los puntos sobre la capa
    pointsLayer.clearLayers();
    points.forEach(pt => {
      L.circleMarker([pt.lat, pt.lng], {
        radius: 5,
        color: '1E90FF',
        fillColor: '#1E90FF',
        fillOpacity: 0.7,
        weight: 1,
        interactive: true
      })
      .bindPopup(`ID: ${pt.id}`)
      .addTo(pointsLayer);
    });
    
  } catch (err) {
    console.erro('uploadPoints error: ' + err);
    alert('Error cargando los puntos: ' + err.message);
  }
}


// 5. Función para ejecutar un algoritmo TSP
async function runAlgorithm(type) {
  if (!roadLayer.getLayers().length || !pointsLayer.getLayers().length) {
    return alert('Debes cargar primero la malla y los puntos.');
  }

  try {
    // Limpia ruta anterior
    algorithmLayer.clearLayers();

    const res = await fetch(`${API_BASE}/tsp?type=${type}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const result = await res.json();
    // result.path: [[lat,lng],…], result.color, result.distance, result.time

    // Dibuja la ruta
    L.polyline(result.path, { color: result.color || 'red', weight: 3 })
     .addTo(algorithmLayer);

    alert(`Algoritmo ${type}: distancia ${result.distance.toFixed(2)} — tiempo ${result.time}ms`);
  } catch (err) {
    console.error(err);
    alert('Error ejecutando algoritmo: ' + err.message);
  }
}


// 6. Función para descargar el resultado final
async function downloadResult() {
  try {
    const res = await fetch(`${API_BASE}/result/download`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resultado.geojson';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert('Error descargando el resultado: ' + err.message);
  }
}

// 7. Vinculación con los botones de tu HTML
document.getElementById('btn-upload-osm').onclick     = uploadOSM;
document.getElementById('btn-upload-points').onclick  = uploadPoints;
document.getElementById('btn-brute').onclick          = () => runAlgorithm('brute');
document.getElementById('btn-greedy').onclick         = () => runAlgorithm('greedy');
document.getElementById('btn-dp').onclick             = () => runAlgorithm('dp');
document.getElementById('btn-download').onclick       = downloadResult;