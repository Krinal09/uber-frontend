import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, Circle, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import debounce from 'lodash/debounce';
import { useSocket } from '../context/SocketContext';
import { toast } from 'react-toastify';
import { useContext } from 'react';
import { SocketContext } from '../context/SocketContext';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom marker icons
const currentLocationIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const captainIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const defaultCenter = {
  lat: 23.0225,
  lng: 72.5714,
};

function CurrentLocationMarker() {
  const map = useMap();
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 16);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError('Failed to get your location. Please check your location settings.');
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [map]);

  if (error) {
    toast.error(error);
  }

  return null;
}

function LocationMarker({ position, accuracy }) {
  const map = useMap();
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  useEffect(() => {
    if (position && position.lat && position.lng) {
      // Update marker position
      if (markerRef.current) {
        markerRef.current.setLatLng([position.lat, position.lng]);
      }
      
      // Update accuracy circle
      if (circleRef.current && accuracy) {
        circleRef.current.setLatLng([position.lat, position.lng]);
        circleRef.current.setRadius(accuracy);
      }

      // Smoothly pan to new position
      map.panTo([position.lat, position.lng], {
        animate: true,
        duration: 1
      });
    }
  }, [position, accuracy, map]);

  if (!position) return null;

  return (
    <>
      <Marker 
        position={position} 
        icon={currentLocationIcon}
        ref={markerRef}
      >
        <Popup>You are here</Popup>
      </Marker>
      {accuracy !== null && accuracy !== undefined && (
        <Circle
          center={position}
          radius={accuracy}
          fillColor="#ff3333"
          fillOpacity={0.15}
          color="#ff3333"
          weight={2}
          ref={circleRef}
        />
      )}
    </>
  );
}

function FitBoundsOnRoute({ route }) {
  const map = useMap();

  useEffect(() => {
    if (route && route.length > 0) {
      const bounds = L.latLngBounds(route);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, route]);

  return null;
}

function LiveLocationMarker({ onLocationUpdate }) {
  const map = useMap();
  const markerRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, heading } = pos.coords;
        const position = [latitude, longitude];

        if (markerRef.current) {
          markerRef.current.setLatLng(position);
        } else {
          markerRef.current = L.marker(position, { icon: currentLocationIcon })
            .addTo(map)
            .bindPopup('Your current location');
        }

        onLocationUpdate(position, accuracy, heading);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError('Failed to get your location. Please check your location settings.');
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (markerRef.current) {
        markerRef.current.remove();
      }
    };
  }, [map, onLocationUpdate]);

  if (error) {
    toast.error(error);
  }

  return null;
}

function ETAUpdater({ route, currentPosition, destinationPosition }) {
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);

  useEffect(() => {
    if (!route || !currentPosition || !destinationPosition) return;

    const calculateETA = () => {
      // Calculate remaining distance
      const remainingDistance = L.GeometryUtil.length(route.slice(route.indexOf(currentPosition)));
      setDistance(remainingDistance);

      // Calculate ETA based on average speed (assuming 30 km/h in city)
      const averageSpeed = 30; // km/h
      const etaHours = remainingDistance / (averageSpeed * 1000); // Convert to hours
      const etaMinutes = Math.round(etaHours * 60);
      setEta(etaMinutes);
    };

    calculateETA();
    const interval = setInterval(calculateETA, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [route, currentPosition, destinationPosition]);

  return (
    <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg z-50">
      {eta !== null && (
        <div className="text-lg font-semibold">
          ETA: {eta} minutes
        </div>
      )}
      {distance !== null && (
        <div className="text-sm text-gray-600">
          Distance: {(distance / 1000).toFixed(1)} km
        </div>
      )}
    </div>
  );
}

const LiveTracking = ({ ride, pickupCoords, destinationCoords, rideId, isCaptain = false }) => {
  const [route, setRoute] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [captainPosition, setCaptainPosition] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const { socket, isConnected } = useContext(SocketContext);
  const mapRef = useRef(null);
  const [error, setError] = useState(null);

  const handleOwnLocationUpdate = useCallback(
    debounce((position, accuracy, heading) => {
      setCurrentPosition(position);

      if (isCaptain && socket && rideId) {
        socket.emit('update:location', { rideId, lat: position[0], lng: position[1], accuracy, heading });
      }
    }, 1000),
    [isCaptain, socket, rideId]
  );

  useEffect(() => {
    if (!isCaptain) {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser');
        return;
      }

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy, heading } = pos.coords;
          const position = [latitude, longitude];
          handleOwnLocationUpdate(position, accuracy, heading);
        },
        (err) => {
          console.error('Geolocation error:', err);
          setError('Failed to get your location. Please check your location settings.');
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );

      setIsTracking(true);

      return () => {
        navigator.geolocation.clearWatch(watchId);
        setIsTracking(false);
      };
    }
  }, [isCaptain, handleOwnLocationUpdate]);

  useEffect(() => {
    if (!isCaptain && socket && rideId) {
      const handleCaptainLocationUpdate = ({ rideId: updateRideId, lat, lng }) => {
        if (rideId === updateRideId) {
          console.log('LiveTracking: Received captain location update:', { lat, lng });
          setCaptainPosition([lat, lng]);
        }
      };

      socket.on('captain-location', handleCaptainLocationUpdate);

      return () => {
        socket.off('captain-location', handleCaptainLocationUpdate);
      };
    }
  }, [isCaptain, socket, rideId]);

  useEffect(() => {
    if (pickupCoords?.coordinates && destinationCoords?.coordinates && rideId && !route) {
      const origin = [pickupCoords.coordinates[1], pickupCoords.coordinates[0]];
      const destination = [destinationCoords.coordinates[1], destinationCoords.coordinates[0]];
      
      setRoute([origin, destination]);
    }
  }, [pickupCoords, destinationCoords, rideId, route]);

  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      let bounds;
      if (isCaptain && currentPosition) {
        const positionsToInclude = [currentPosition];
        if (pickupCoords?.coordinates) positionsToInclude.push([pickupCoords.coordinates[1], pickupCoords.coordinates[0]]);
        if (destinationCoords?.coordinates) positionsToInclude.push([destinationCoords.coordinates[1], destinationCoords.coordinates[0]]);
        bounds = L.latLngBounds(positionsToInclude);
      } else if (!isCaptain && captainPosition) {
        const positionsToInclude = [];
        if (currentPosition) positionsToInclude.push(currentPosition);
        if (captainPosition) positionsToInclude.push(captainPosition);
        if (pickupCoords?.coordinates) positionsToInclude.push([pickupCoords.coordinates[1], pickupCoords.coordinates[0]]);
        if (destinationCoords?.coordinates) positionsToInclude.push([destinationCoords.coordinates[1], destinationCoords.coordinates[0]]);

        if (positionsToInclude.length > 0) {
          bounds = L.latLngBounds(positionsToInclude);
        } else if (route && route.length > 0) {
          bounds = L.latLngBounds(route);
        } else if (pickupCoords?.coordinates) {
          bounds = L.latLngBounds([[pickupCoords.coordinates[1], pickupCoords.coordinates[0]]]);
        } else if (destinationCoords?.coordinates) {
          bounds = L.latLngBounds([[destinationCoords.coordinates[1], destinationCoords.coordinates[0]]]);
        }
      } else if (route && route.length > 0) {
        bounds = L.latLngBounds(route);
      } else if (currentPosition) {
        bounds = L.latLngBounds([currentPosition]);
      } else if (pickupCoords?.coordinates) {
        bounds = L.latLngBounds([[pickupCoords.coordinates[1], pickupCoords.coordinates[0]]]);
      } else if (destinationCoords?.coordinates) {
        bounds = L.latLngBounds([[destinationCoords.coordinates[1], destinationCoords.coordinates[0]]]);
      }

      if (bounds && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      } else if (currentPosition) {
        map.setView(currentPosition, 13);
      } else if (defaultCenter) {
        map.setView([defaultCenter.lat, defaultCenter.lng], 13);
      }
    }
  }, [mapRef.current, route, currentPosition, captainPosition, pickupCoords, destinationCoords, isCaptain]);

  useEffect(() => {
    if (!isCaptain && captainPosition) {
      mapRef.current?.setView(captainPosition, mapRef.current.getZoom(), { animate: true, duration: 1 });
    }
  }, [isCaptain, captainPosition, mapRef.current]);

  if (error) {
    return <div className="h-full w-full flex items-center justify-center text-red-500">Error: {error}</div>;
  }

  const initialCenter = (isCaptain ? currentPosition : (captainPosition || currentPosition)) || [defaultCenter.lat, defaultCenter.lng];
  const initialZoom = 13;

  return (
    <MapContainer 
      center={initialCenter} 
      zoom={initialZoom} 
      className="h-full w-full" 
      ref={mapRef} 
      zoomControl={false}
      dragging={true}
      scrollWheelZoom={true}
      doubleClickZoom={true}
      touchZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="bottomright" />

      {!isCaptain && currentPosition && (
        <Marker position={currentPosition} icon={currentLocationIcon}>
          <Popup>Your Location</Popup>
        </Marker>
      )}

      {!isCaptain && captainPosition && (
        <Marker position={captainPosition} icon={captainIcon}>
          <Popup>Captain's Location</Popup>
        </Marker>
      )}

      {isCaptain && currentPosition && (
        <Marker position={currentPosition} icon={captainIcon}>
          <Popup>Your Location</Popup>
        </Marker>
      )}

      {pickupCoords?.coordinates && (
        <Marker position={[pickupCoords.coordinates[1], pickupCoords.coordinates[0]]} icon={currentLocationIcon}>
          <Popup>Pickup Location</Popup>
        </Marker>
      )}

      {destinationCoords?.coordinates && (
        <Marker position={[destinationCoords.coordinates[1], destinationCoords.coordinates[0]]} icon={currentLocationIcon}>
          <Popup>Destination Location</Popup>
        </Marker>
      )}

      {route && <Polyline positions={route} color="blue" />}
    </MapContainer>
  );
};

export default LiveTracking;