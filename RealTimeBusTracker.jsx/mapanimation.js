// get elements from the DOM
const body = document.body;
const bostonLngLat = [-71.10110, 42.35173];
let timer;
let locationData;
let currentMarkers = [];

// Define coordinates for MIT and Harvard
const mitCoords = [-71.0921, 42.3601]; // Coordinates for MIT
const harvardCoords = [-71.1189, 42.3736]; // Coordinates for Harvard

async function run() {
  // clear the current markers if any
  currentMarkers.forEach((marker) => {
    marker.remove();
  });

  // update the button state to on
  const runButton = document.getElementById("run");
  runButton.classList.add('on');

  // clear the console
  console.clear();

  // get the location data
  locationData = await getBusLocationData();
  console.log(new Date());
  console.log(locationData);

  // create the geoJSON object
  var geojson = {
    type: 'FeatureCollection',
    features: [],
  };

  // add the bus information to the geoJSON features
  for (const busIndex in locationData) {
    bus = locationData[busIndex].attributes;
    lngLat = [bus.longitude, bus.latitude];

    _feature = {
      "type": 'Feature',
      "geometry": {
        "type": 'Point',
        "coordinates": lngLat,
      },
      "properties": {
        "title": bus.label,
        "description": " // Current Stop: "+bus.current_stop_sequence+" // Occupancy: "+bus.occupancy_status
      }
    };
    geojson.features.push(_feature);
  }

  // active bus info
  let activeBuses = [];

  // Add markers to map
  geojson.features.forEach((marker) => {
    var el = document.createElement('div');
    el.className = 'marker';

    var busNumber = document.createElement('span');
    busNumber.className = 'bus-number';
    busNumber.textContent = marker.properties.title; // Set bus number text

    el.appendChild(busNumber);

    let thisMarker = new mapboxgl.Marker(el)
        .setLngLat(marker.geometry.coordinates)
        .addTo(map);

    currentMarkers.push(thisMarker);
    activeBuses.push(marker.properties.title + marker.properties.description);
  });

  // Update the bus info box
  const infobox = document.getElementById("infobox");

  html = '<h3>Currently Active Buses: '+activeBuses.length+'</h3>';
  activeBuses.forEach((bus) => {
    html += '<li>' + bus + '</li>';
  });

  html += '</ul>';

  infobox.innerHTML = html;

  // Set timer for updates every 10 seconds
  timer = setTimeout(run, 10000);
}

async function getBusLocationData() {
  const url = 'https://api-v3.mbta.com/vehicles?filter[route]=1&include=trip';

  const response = await fetch(url);
  const json = await response.json();
  return json.data;
}

// Function to highlight the route between MIT and Harvard on Massachusetts Ave
async function highlightRoute() {
  const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${mitCoords[0]},${mitCoords[1]};${harvardCoords[0]},${harvardCoords[1]}?geometries=geojson&access_token=pk.eyJ1IjoibmljazEyMzEiLCJhIjoiY2xwMjZwdm9vMGx5dTJrbG81bjlhd3BjZSJ9.jMXU63PRiVhuR-zcIVN7Gg`);
  const data = await response.json();

  const routeGeojson = data.routes[0].geometry;

   // Add a marker for MIT (Green pin)
   const mitMarker = new mapboxgl.Marker({ color: 'green' })
   .setLngLat(mitCoords)
   .addTo(map);

 // Add a marker for Harvard (Red pin)
 const harvardMarker = new mapboxgl.Marker({ color: 'red' })
   .setLngLat(harvardCoords)
   .addTo(map);


  // Add the route to the map as a light blue line
  map.addLayer({
    id: 'route',
    type: 'line',
    source: {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: routeGeojson
      }
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#ADD8E6', // Light blue color
      'line-width': 5
    }
  });
}

// Initial call to run() function when the page loads
run();
