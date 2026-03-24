// GPS Location Feature for AgriUrbanAI Dashboard
// This module handles user GPS location requests and maps it on the Leaflet map

let userLocationMarker = null;

// Initialize GPS location functionality
function initGPSLocation() {
  const gpsBtn = document.getElementById('gps-location-btn');
  
  if (gpsBtn) {
    gpsBtn.addEventListener('click', getUserLocation);
  }

  // Automatically request location when dashboard loads, but wait for map
  console.log('Waiting for map to initialize before requesting location...');
  
  let attempts = 0;
  const maxAttempts = 20; // 10 seconds total
  
  const checkMapInterval = setInterval(() => {
    attempts++;
    if (typeof map !== 'undefined' && map) {
      clearInterval(checkMapInterval);
      console.log('Map initialized. Requesting user location...');
      getUserLocation();
    } else if (attempts >= maxAttempts) {
      clearInterval(checkMapInterval);
      console.warn('Map initialization timed out. User must manually request location.');
    }
  }, 500);
}

// Request and get user's GPS location
function getUserLocation() {
  const gpsBtn = document.getElementById('gps-location-btn');
  
  if (!navigator.geolocation) {
    showGPSStatus('Geolocation is not supported by your browser', 'error');
    return;
  }

  // Update button state
  if (gpsBtn) {
    gpsBtn.disabled = true;
    gpsBtn.innerHTML = '<i class="ph-spinner"></i><span>Getting Location...</span>';
  }
  
  // Show loading status
  showGPSStatus('Requesting location permission...', 'loading');

  // Request location
  navigator.geolocation.getCurrentPosition(
    (position) => onLocationSuccess(position),
    (error) => onLocationError(error),
    {
      enableHighAccuracy: true,
      timeout: 15000, // Increased timeout to 15s
      maximumAge: 0
    }
  );
}

// Handle successful location retrieval
function onLocationSuccess(position) {
  // Use real coordinates from Geolocation API
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  
  // Use actual accuracy
  const accuracy = position.coords.accuracy;

  console.log(`Location found: ${lat}, ${lng}`);

  // Store globally for other modules (like weather)
  window.currentCoordinates = { lat, lng };

  // Refresh weather data for new location
  if (typeof updateCurrentWeather === 'function') {
    // Small delay to ensure variable is set
    setTimeout(updateCurrentWeather, 100);
  }
  
  // Refresh location details text
  if (typeof updateLocationInfo === 'function') {
    setTimeout(updateLocationInfo, 100);
  }

  // Update button
  const gpsBtn = document.getElementById('gps-location-btn');
  if (gpsBtn) {
    gpsBtn.disabled = false;
    gpsBtn.innerHTML = '<i class="ph-map-pin"></i><span>Get My Location</span>';
  }

  // Show success message with coordinates
  showGPSStatus(
    `Location found! Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`,
    'success'
  );

  // Add marker to map
  if (typeof map !== 'undefined' && map) {
    addUserLocationToMap(lat, lng, accuracy);
  } else {
    showGPSStatus('Map not ready yet. Retrying...', 'loading');
    // Retry once after 1 second
    setTimeout(() => {
      if (typeof map !== 'undefined' && map) {
        addUserLocationToMap(lat, lng, accuracy);
        showGPSStatus('Location mapped successfully!', 'success');
      } else {
        showGPSStatus('Map not initialized. Please try again.', 'error');
      }
    }, 1000);
  }
}

// Handle location error
function onLocationError(error) {
  console.error('GPS Error:', error);
  
  const gpsBtn = document.getElementById('gps-location-btn');
  if (gpsBtn) {
    gpsBtn.disabled = false;
    gpsBtn.innerHTML = '<i class="ph-map-pin"></i><span>Get My Location</span>';
  }

  let errorMsg = '';
  switch (error.code) {
    case error.PERMISSION_DENIED:
      errorMsg = 'Location permission denied. Please enable location access.';
      break;
    case error.POSITION_UNAVAILABLE:
      errorMsg = 'Location information unavailable. Check your GPS signal.';
      break;
    case error.TIMEOUT:
      errorMsg = 'Location request timed out. Please try again.';
      break;
    default:
      errorMsg = 'An unknown error occurred while getting your location.';
  }

  showGPSStatus(errorMsg, 'error');
}

// Add user location marker to the map
function addUserLocationToMap(lat, lng, accuracy) {
  if (!map) return;

  // Remove existing user location marker if any
  if (userLocationMarker) {
    map.removeLayer(userLocationMarker);
  }

  // Create custom icon for user location
  const userLocationIcon = L.divIcon({
    className: 'user-location-marker',
    html: `
      <div class="user-location-pulse">
        <div class="user-location-dot"></div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });

  // Add marker
  userLocationMarker = L.marker([lat, lng], {
    icon: userLocationIcon,
    title: 'Your Location',
    zIndexOffset: 1000 // Ensure it's on top
  }).addTo(map);

  // Add popup with details
  const popupContent = `
    <div class="user-location-popup">
      <h4>📍 Your Current Location</h4>
      <p><strong>Latitude:</strong> ${lat.toFixed(6)}</p>
      <p><strong>Longitude:</strong> ${lng.toFixed(6)}</p>
      <button onclick="centerOnUserLocation()" class="center-btn">Center Map</button>
    </div>
  `;

  userLocationMarker.bindPopup(popupContent).openPopup();

  // Add accuracy circle (optional, can be distracting if accuracy is low)
  // Only show if accuracy is reasonable (< 5000m)


  // Zoom to user location
  map.setView([lat, lng], 15, {
    animate: true,
    pan: {
      duration: 1
    }
  });
}

// Center map on user location
function centerOnUserLocation() {
  if (userLocationMarker && map) {
    const latlng = userLocationMarker.getLatLng();
    map.setView(latlng, 15, {
      animate: true
    });
    userLocationMarker.openPopup();
  }
}

// Show GPS status message
function showGPSStatus(message, type) {
  const gpsStatus = document.getElementById('gps-status');
  if (!gpsStatus) return;

  gpsStatus.textContent = message;
  gpsStatus.className = `gps-status gps-status-${type}`;
  gpsStatus.style.display = 'block';

  // Auto-hide after 5 seconds for success
  if (type === 'success') {
    setTimeout(() => {
      gpsStatus.style.display = 'none';
      gpsStatus.className = 'gps-status';
    }, 5000);
  }
}

// Export for use in dashboard
if (typeof window !== 'undefined') {
  window.initGPSLocation = initGPSLocation;
  window.getUserLocation = getUserLocation;
  window.centerOnUserLocation = centerOnUserLocation;
}
