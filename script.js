// Inicializa el mapa centrado en Bogotá
let map = L.map('map').setView([4.60971, -74.08175], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Capas globales
let roadLayer = null;
let pointsLayer = null;
let algorithmLayer = null;

// Función para cargar el archivo .osm y enviarlo al backend
function uploadOSM() {
  const fileInput = document.getElementById('file-osm');
  const file = fileInput.files[0];
  if (!file) {
    alert("Selecciona un archivo OSM");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  fetch("http://localhost:8080/api/osm", {
    method: "POST",
    body: formData
  })
    .then(res => res.json())
    .then(geojsonData => {
      if (roadLayer) map.removeLayer(roadLayer);
      roadLayer = L.geoJSON(geojsonData, {
        style: { color: '#555', weight: 4 }
      }).addTo(map);
      map.fitBounds(roadLayer.getBounds());
      alert("Red cargada desde el backend y pintada en el mapa.");
    })
    .catch(err => {
      console.error(err);
      alert("Error al enviar el archivo OSM al backend.");
    });
}

// Función para cargar puntos y enviarlos al backend
function uploadPoints() {
  const fileInput = document.getElementById('file-points');
  const file = fileInput.files[0];
  if (!file) {
    alert("Selecciona un archivo de puntos");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  fetch("http://localhost:8080/api/points", {
    method: "POST",
    body: formData
  })
    .then(res => res.json())
    .then(pointsData => {
      if (pointsLayer) map.removeLayer(pointsLayer);
      pointsLayer = L.layerGroup();

      pointsData.forEach(point => {
        const marker = L.circleMarker([point.lat, point.lng], {
          radius: 6,
          color: 'blue',
          fillOpacity: 0.8
        }).bindPopup(`Punto ID: ${point.id}`);
        marker.addTo(pointsLayer);
      });

      pointsLayer.addTo(map);
      alert("Puntos cargados e integrados desde el backend.");
    })
    .catch(err => {
      console.error(err);
      alert("Error al cargar los puntos.");
    });
}

// Función para ejecutar algoritmo y pintar la ruta
function runAlgorithm(type) {
  if (!roadLayer || !pointsLayer) {
    alert("Primero debes cargar la red y los puntos.");
    return;
  }

  fetch(`http://localhost:8080/api/tsp?type=${type}`)
    .then(res => res.json())
    .then(result => {
      if (algorithmLayer) map.removeLayer(algorithmLayer);
      algorithmLayer = L.polyline(result.path, {
        color: result.color || 'red',
        weight: 5
      }).addTo(map);
      map.fitBounds(algorithmLayer.getBounds());

      alert(`Algoritmo ${type} ejecutado.\nDistancia: ${result.distance} km\nTiempo: ${result.time} ms`);
    })
    .catch(err => {
      console.error(err);
      alert("Error al ejecutar el algoritmo.");
    });
}

// Función para descargar el archivo resultante desde el backend
function download() {
  fetch('http://localhost:8080/api/result/download')
    .then(res => res.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "resultado.geojson";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    })
    .catch(err => {
      console.error(err);
      alert("Error al descargar el archivo resultante.");
    });
}
