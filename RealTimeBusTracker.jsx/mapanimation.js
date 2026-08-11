// Center point used by the Mapbox map in index.html
const bostonLngLat = [-71.1011, 42.35173];

// Coordinates for MIT and Harvard
const mitCoords = [-71.0921, 42.3601];
const harvardCoords = [-71.1189, 42.3736];

// Keep track of the refresh timer and the markers currently on the map
let timer;
let currentMarkers = [];

/**
 * Fetch the current Route 1 buses and display them on the map.
 */
async function run() {
  // Prevent multiple refresh timers from running at the same time
  clearTimeout(timer);

  // Remove old bus markers before adding updated ones
  currentMarkers.forEach((marker) => {
    marker.remove();
  });

  currentMarkers = [];

  // Update the button state
  const runButton = document.getElementById("run");

  if (runButton) {
    runButton.classList.add("on");
  }

  try {
    // Get current bus data from the MBTA API
    const locationData = await getBusLocationData();

    const updatedAt = new Date();
    
    console.log("Bus data updated:", updatedAt);
    console.log(locationData);

    // Store information about active buses
    const activeBuses = [];

    // Loop through every bus returned by the API
    locationData.forEach((vehicle) => {
      const bus = vehicle.attributes;

      const lngLat = [bus.longitude, bus.latitude];

      // Create the HTML element that Mapbox will use as the marker
      const markerElement = document.createElement("div");
      markerElement.className = "marker";

      // Display the bus number underneath the marker
      const busNumber = document.createElement("span");
      busNumber.className = "bus-number";
      busNumber.textContent = bus.label || "Bus";

      markerElement.appendChild(busNumber);

      // Create the Mapbox marker
      const mapMarker = new mapboxgl.Marker(markerElement)
        .setLngLat(lngLat)
        .addTo(map);

      // Save the marker so it can be removed during the next refresh
      currentMarkers.push(mapMarker);

      // Save information for the information box
      const busInfo = {
        label: bus.label || "Unknown",
        stopSequence: bus.current_stop_sequence ?? "Unknown",
        occupancy: bus.occupancy_status || "Unknown",
      };

      activeBuses.push(busInfo);
    });

    updateInfoBox(activeBuses, updatedAt);
  } catch (error) {
    console.error("Unable to load MBTA bus data:", error);

    const infobox = document.getElementById("infobox");

    if (infobox) {
      infobox.innerHTML = `
        <h3>Unable to load live bus data</h3>
        <p>Please try again in a moment.</p>
      `;
    }
  }

  // Refresh bus locations every 10 seconds
  timer = setTimeout(run, 10000);
}

/**
 * Fetch Route 1 vehicle data from the MBTA API.
 */
async function getBusLocationData() {
  const url =
    "https://api-v3.mbta.com/vehicles?filter[route]=1&include=trip";

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`MBTA API returned status ${response.status}`);
  }

  const json = await response.json();

  return json.data;
}

/**
 * Update the information box containing the active buses.
 */
function updateInfoBox(activeBuses, updatedAt) {
  const infobox = document.getElementById("infobox");

  if (!infobox) {
    return;
  }

  let html = `
  <h3>Currently Active Buses: ${activeBuses.length}</h3>
  <p>Last updated: ${updatedAt.toLocaleTimeString()}</p>
  <ul>
`;

  activeBuses.forEach((bus) => {
    html += `
      <li>
        ${bus.label}
        // Current Stop: ${bus.stopSequence}
        // Occupancy: ${bus.occupancy}
      </li>
    `;
  });

  html += "</ul>";

  infobox.innerHTML = html;
}

/**
 * Draw a driving route between MIT and Harvard.
 */
async function highlightRoute() {
  try {
    // Don't add the same route layer more than once
    if (map.getLayer("route")) {
      return;
    }

    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/` +
      `${mitCoords[0]},${mitCoords[1]};` +
      `${harvardCoords[0]},${harvardCoords[1]}` +
      `?geometries=geojson&access_token=${mapboxgl.accessToken}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Mapbox API returned status ${response.status}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error("Mapbox did not return a route.");
    }

    const routeGeojson = data.routes[0].geometry;

    // Add a green marker for MIT
    new mapboxgl.Marker({ color: "green" })
      .setLngLat(mitCoords)
      .addTo(map);

    // Add a red marker for Harvard
    new mapboxgl.Marker({ color: "red" })
      .setLngLat(harvardCoords)
      .addTo(map);

    // Draw the route
    map.addLayer({
      id: "route",
      type: "line",
      source: {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: routeGeojson,
        },
      },
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#ADD8E6",
        "line-width": 5,
      },
    });
  } catch (error) {
    console.error("Unable to display MIT-Harvard route:", error);
  }
}

/**
 * Start the application after the entire page has loaded.
 *
 * This is safer than calling run() immediately because it ensures
 * that the HTML and the Mapbox map already exist.
 */
window.addEventListener("load", () => {
  run();
});