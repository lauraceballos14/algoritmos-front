// 1. Punto base de la API
const API_BASE = 'http://localhost:5000' + '/api/network'; // Cambia esto según tu configuración

// 2. Inicialización del mapa y capas
const map = L.map('map').setView([4.60971, -74.08175], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Capa para la malla vial, inicializada vacía
let roadLayer = L.geoJSON().addTo(map);

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
  } finally {
    // Oculta el spinner si lo usaste
  }
}


// 4. Función para cargar y pintar puntos
async function uploadPoints() {
  const input = document.getElementById('file-points');
  const file = input.files[0];
  if (!file) {
    return alert('Selecciona un archivo de puntos');
  }

  const form = new FormData();
  form.append('file', file);               // coincide con req.files.file en el back

  try {
    const res = await fetch(`${API_BASE}/points`, {
      method: 'POST',
      body: form
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    // data.points: [{ id, lat, lng }], data.updatedMesh?: GeoJSON

    // Pintar puntos
    pointsLayer.clearLayers();
    data.points.forEach(pt => {
      L.circleMarker([pt.lat, pt.lng], { radius: 5, color: 'blue' })
       .bindPopup(pt.id)
       .addTo(pointsLayer);
    });

    // Si el back retorna un updatedMesh, actualiza también la malla
    if (data.updatedMesh) {
      roadLayer.clearLayers();
      roadLayer.addData(data.updatedMesh);
      map.fitBounds(roadLayer.getBounds());
    }
  } catch (err) {
    console.error(err);
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