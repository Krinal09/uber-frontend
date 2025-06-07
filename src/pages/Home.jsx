import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import axios from 'axios';
import 'remixicon/fonts/remixicon.css';
import LocationSearchPanel from '../components/LocationSearchPanel';
import VehiclePanel from '../components/VehiclePanel';
import ConfirmRide from '../components/ConfirmRide';
import LookingForDriver from '../components/LookingForDriver';
import WaitingForDriver from '../components/WaitingForDriver';
import { SocketContext } from '../context/SocketContext';
import { UserContext } from '../context/UserContext';
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { MapContainer, TileLayer, Marker, Polyline, ZoomControl, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

const Home = () => {
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [vehiclePanel, setVehiclePanel] = useState(false);
  const [confirmRidePanel, setConfirmRidePanel] = useState(false);
  const [vehicleFound, setVehicleFound] = useState(false);
  const [waitingForDriver, setWaitingForDriver] = useState(false);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [activeField, setActiveField] = useState(null);
  const [fare, setFare] = useState({});
  const [vehicleType, setVehicleType] = useState(null);
  const [ride, setRide] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingFare, setLoadingFare] = useState(false);
  const [loadingCoords, setLoadingCoords] = useState(false);
  const [map, setMap] = useState(null);
  const [route, setRoute] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const vehiclePanelRef = useRef(null);
  const confirmRidePanelRef = useRef(null);
  const vehicleFoundRef = useRef(null);
  const waitingForDriverRef = useRef(null);
  const panelRef = useRef(null);
  const panelCloseRef = useRef(null);
  const mapRef = useRef(null);

  const navigate = useNavigate();
  const { socket, isConnected, isConnecting } = useContext(SocketContext);
  const { user, loading: userLoading } = useContext(UserContext);

  // Debug logs
  // console.log('Home.jsx user:', user);
  // console.log('Home.jsx socket:', socket);
  // console.log('Home.jsx isConnected:', isConnected);
  // console.log('Home.jsx userLoading:', userLoading);

  // Handle loading state while user data is being fetched
  if (userLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mb-4"></div>
      </div>
    );
  }

  // If not loading and no user, redirect to login (this is handled by UserProtectWrapper as well, but good to have a local check)
  if (!user && !userLoading) {
    // This case should ideally be fully handled by UserProtectWrapper, but we keep this for clarity
    // The UserProtectWrapper will handle the actual navigation
    return (
      <div className="h-screen flex items-center justify-center">
        <div>
          <div className="text-red-600 font-bold">User not authenticated. Redirecting...</div>
        </div>
      </div>
    );
  }

  // Handle socket connection state
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      console.error('No authentication token found');
      toast.error('Please login again');
      navigate('/login');
      return;
    }

    if (!socket || !isConnected || !user) {
      console.log('Socket connection not ready:', { socket: !!socket, isConnected, user: !!user });
      return;
    }

    console.log('Attempting to join socket room with user:', user._id);
    socket.emit('join', { 
      userType: 'User', 
      userId: user._id
    }, (response) => {
      if (response && response.error) {
        console.error('Socket join error:', response.error);
        toast.error('Connection error. Please try logging in again.');
        navigate('/login');
      } else {
        console.log('Successfully joined socket room');
      }
    });
  }, [user, socket, isConnected, navigate]);

  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    const handleRideStatusUpdate = ({ status, data }) => {
      console.log('Ride status updated:', status, data);
      console.log('Current states before update:', { vehicleFound, waitingForDriver, ride });

      switch (status) {
        case 'accepted':
          console.log('Handling accepted status');
          setVehicleFound(false);
          setWaitingForDriver(true);
          setRide(data);
          toast.success('Driver accepted your ride!');
          console.log('States after accepted update:', { vehicleFound: false, waitingForDriver: true, ride: data });
          break;

        case 'on-the-way':
          setWaitingForDriver(true);
          toast('Driver is on the way!');
          break;

        case 'in-progress':
          setWaitingForDriver(false);
          navigate('/riding', { state: { ride: data } });
          toast.success('Your ride has started!');
          break;

        case 'completed':
          setWaitingForDriver(false);
          setRide(null);
          toast.success('Ride completed successfully!');
          navigate('/user/home');
          break;

        case 'cancelled':
          setVehicleFound(false);
          setWaitingForDriver(false);
          setRide(null);
          toast.error(data.reason || 'Ride was cancelled');
          break;
      }
    };

    const handleCaptainLocation = (data) => {
      if (ride && ride._id === data.rideId) {
        // Update captain's location on the map
        if (map) {
          const captainMarker = L.marker([data.lat, data.lng], {
            icon: L.divIcon({
              className: 'captain-marker',
              html: '<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>',
              iconSize: [16, 16]
            })
          }).addTo(map);
          
          // Remove previous marker if exists
          if (window.captainMarker) {
            map.removeLayer(window.captainMarker);
          }
          window.captainMarker = captainMarker;

          // Center map on captain's location
          map.setView([data.lat, data.lng], map.getZoom());
        }
      }
    };

    const handleSocketError = (error) => {
      console.error('Socket error:', error);
      if (error.message === 'User not found') {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      } else {
        toast.error('Connection error. Please check your internet connection.');
      }
    };

    socket.on('ride:status:updated', handleRideStatusUpdate);
    socket.on('captain-location', handleCaptainLocation);
    socket.on('error', handleSocketError);
    socket.on('connect_error', handleSocketError);

    return () => {
      socket.off('ride:status:updated', handleRideStatusUpdate);
      socket.off('captain-location', handleCaptainLocation);
      socket.off('error', handleSocketError);
      socket.off('connect_error', handleSocketError);
    };
  }, [socket, isConnected, user, navigate, ride, map]);

  const fetchCoordinates = async (address, setCoords) => {
    if (!address || address.length < 3) return;
    
    setLoadingCoords(true);
    try {
      const response = await api.get('/api/maps/get-coordinates', {
        params: { address }
      });
      
      if (response.data && response.data.lat && response.data.lng) {
        setCoords({
          lat: response.data.lat,
          lng: response.data.lng
        });
      } else {
        console.warn('Invalid coordinates received:', response.data);
        toast.error('Could not find exact location. Please try a more specific address.');
      }
    } catch (error) {
      console.warn('Error fetching coordinates:', error);
      toast.error('Failed to fetch coordinates. Please try again.');
    } finally {
      setLoadingCoords(false);
    }
  };

  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  const fetchSuggestions = async (query, setSuggestions) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const response = await api.get('/api/maps/get-suggestions', { 
        params: { 
          input: query,
          limit: 5,
          type: 'all'
        }
      });

      if (response.data && Array.isArray(response.data)) {
        setSuggestions(response.data);
      } else if (response.data && response.data.suggestions) {
        setSuggestions(response.data.suggestions);
      } else {
        console.warn('Invalid response format for suggestions:', response.data);
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
      toast.error('Failed to fetch location suggestions. Please try again.');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const debouncedFetchSuggestions = useCallback(debounce(fetchSuggestions, 300), []);

  const handlePickupChange = async (e) => {
    const value = e.target.value;
    setPickup(value);
    setActiveField('pickup');
    if (value.length > 2) {
      debouncedFetchSuggestions(value, setPickupSuggestions);
    } else {
      setPickupSuggestions([]);
    }
  };

  const handleDestinationChange = async (e) => {
    const value = e.target.value;
    setDestination(value);
    setActiveField('destination');
    if (value.length > 2) {
      debouncedFetchSuggestions(value, setDestinationSuggestions);
    } else {
      setDestinationSuggestions([]);
    }
  };

  useEffect(() => {
    if (pickup) {
      fetchCoordinates(pickup, setPickupCoords);
    }
  }, [pickup]);

  useEffect(() => {
    if (destination) {
      fetchCoordinates(destination, setDestinationCoords);
    }
  }, [destination]);

  const submitHandler = (e) => {
    e.preventDefault();
  };

  const findTrip = async () => {
    try {
        if (!pickup || !destination) {
            toast.error('Please select pickup and destination locations');
            return;
        }

        // Validate coordinates
        if (!pickupCoords || !destinationCoords || !pickupCoords.lng || !pickupCoords.lat || !destinationCoords.lng || !destinationCoords.lat) {
            toast.error('Invalid or incomplete pickup or destination coordinates. Please select again.');
            console.error('Invalid coordinates for fare calculation:', { pickupCoords, destinationCoords });
            return;
        }

        setLoadingFare(true);

        const pickupObj = {
            address: pickup,
            coordinates: {
                type: 'Point',
                coordinates: [pickupCoords.lng, pickupCoords.lat]
            }
        };

        const destinationObj = {
            address: destination,
            coordinates: {
                type: 'Point',
                coordinates: [destinationCoords.lng, destinationCoords.lat]
            }
        };

        const response = await api.get('/api/ride/get-fare', {
            params: {
                pickup: JSON.stringify(pickupObj),
                destination: JSON.stringify(destinationObj)
            }
        });

        if (!response.data || !response.data.data) {
            throw new Error('Invalid response from server');
        }

        const { data: fare, distance, duration } = response.data;

        if (!fare || typeof fare !== 'object') {
            throw new Error('Invalid fare calculation data');
        }

        setFare(fare);
        
        // Show vehicle panel after successful fare calculation
        setVehiclePanel(true);
        toast.success('Fare calculated successfully');

    } catch (error) {
        console.error('Error calculating fare:', error);
        let errorMessage = 'Failed to calculate fare';
        
        if (error.response) {
            errorMessage = error.response.data?.message || error.response.data?.error || 'Server error occurred';
            console.error('Server error details:', error.response.data);
        } else if (error.request) {
            errorMessage = 'No response from server. Please check your internet connection.';
            console.error('Network error:', error.request);
        } else {
            errorMessage = error.message || 'Error occurred while calculating fare';
            console.error('Request error:', error.message);
        }
        
        toast.error(errorMessage);
    } finally {
        setLoadingFare(false);
    }
};

const createRide = async () => {
  try {
    if (!pickupCoords || !destinationCoords) {
      throw new Error('Pickup and destination coordinates are required');
    }

    if (!socket || !isConnected) {
      throw new Error('Not connected to server. Please try again.');
    }

    if (!user) {
      throw new Error('User not authenticated');
    }

    if (!vehicleType) {
      throw new Error('Vehicle type is required');
    }

    if (!fare || !fare[vehicleType]) {
      throw new Error(`Fare for ${vehicleType} is not available`);
    }

    // Ensure coordinates are valid numbers
    const pickupLng = parseFloat(pickupCoords.lng);
    const pickupLat = parseFloat(pickupCoords.lat);
    const destLng = parseFloat(destinationCoords.lng);
    const destLat = parseFloat(destinationCoords.lat);

    if (isNaN(pickupLng) || isNaN(pickupLat) || isNaN(destLng) || isNaN(destLat)) {
      throw new Error('Invalid coordinates format');
    }

    const pickupObj = {
      address: pickup,
      coordinates: {
        type: 'Point',
        coordinates: [pickupLng, pickupLat]
      }
    };

    const destinationObj = {
      address: destination,
      coordinates: {
        type: 'Point',
        coordinates: [destLng, destLat]
      }
    };

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const rideData = {
      pickup: pickupObj,
      destination: destinationObj,
      vehicleType,
      userId: user._id,
      fare: {
        amount: parseFloat(fare[vehicleType]),
        currency: 'INR'
      },
      otp: otp,
      status: 'requested'
    };

    console.log('Sending ride creation request with data:', JSON.stringify(rideData, null, 2));

    const response = await api.post('/api/ride/create', rideData);

    console.log('Ride creation response:', response.data);

    if (response.data && response.data.success) {
      console.log('Ride created successfully:', response.data.data);
      const newRide = response.data.data;
      setRide(newRide);
      
      socket.emit('join:ride', { rideId: newRide._id });
      
      setVehicleFound(true);
      setConfirmRidePanel(false);
      toast.success('Looking for drivers...');
      
      return newRide;
    } else {
      throw new Error(response.data.message || 'Failed to create ride');
    }
  } catch (error) {
    console.error('Error creating ride:', error);
    if (error.response) {
      console.error('Server response data:', error.response.data);
      toast.error(error.response.data?.message || 'Failed to create ride');
    } else if (error.request) {
      console.error('Network error:', error.request);
      toast.error('No response from server. Please check your internet connection.');
    } else {
      console.error('Request error:', error.message);
      toast.error(error.message || 'Error occurred while creating ride');
    }
    throw error;
  }
};

  // GSAP Animations
  useGSAP(() => {
    const tl = gsap.timeline();

    if (panelOpen) {
      tl.to(panelRef.current, { height: '60%', duration: 0.3 });
      tl.to(panelCloseRef.current, { opacity: 1, duration: 0.3 });
    } else {
      tl.to(panelCloseRef.current, { opacity: 0, duration: 0.3 });
      tl.to(panelRef.current, { height: 0, duration: 0.3 });
    }
  }, [panelOpen]);

  useGSAP(() => {
    const tl = gsap.timeline();
    if (vehiclePanel) {
      tl.to(vehiclePanelRef.current, { translateY: '0%', duration: 0.5 });
    } else {
      tl.to(vehiclePanelRef.current, { translateY: '100%', duration: 0.5 });
    }
  }, [vehiclePanel]);

  useGSAP(() => {
    const tl = gsap.timeline();
    if (confirmRidePanel) {
      tl.to(confirmRidePanelRef.current, { translateY: '0%', duration: 0.5 });
    } else {
      tl.to(confirmRidePanelRef.current, { translateY: '100%', duration: 0.5 });
    }
  }, [confirmRidePanel]);

  useGSAP(() => {
    const tl = gsap.timeline();
    if (vehicleFound) {
      tl.to(vehicleFoundRef.current, { translateY: '0%', duration: 0.5 });
    } else {
      tl.to(vehicleFoundRef.current, { translateY: '100%', duration: 0.5 });
    }
  }, [vehicleFound]);

  // New GSAP animation for waitingForDriver state
  useGSAP(() => {
    const tl = gsap.timeline();
    if (waitingForDriver) {
      // Hide LookingForDriver panel and show WaitingForDriver panel
      tl.to(vehicleFoundRef.current, { translateY: '100%', duration: 0.5 });
      tl.to(waitingForDriverRef.current, { translateY: '0%', duration: 0.5 }, '>'); // Add '>' for sequential animation
    } else {
      // Hide WaitingForDriver panel
      tl.to(waitingForDriverRef.current, { translateY: '100%', duration: 0.5 });
    }
  }, [waitingForDriver]);

  const defaultCenter = {
    lat: 20.5937,
    lng: 78.9629
  };

  const pickupIcon = L.divIcon({
    className: 'route-marker',
    html: '<div class="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>',
    iconSize: [16, 16]
  });
  const destinationIcon = L.divIcon({
    className: 'route-marker',
    html: '<div class="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>',
    iconSize: [16, 16]
  });

  const drawRoute = async (start, end) => {
    if (!map) return;

    if (route) {
      map.removeLayer(route);
    }

    try {
      const response = await api.get('/api/maps/get-route', {
        params: {
          start: `${start[0]},${start[1]}`,
          end: `${end[0]},${end[1]}`
        }
      });

      if (response.data && response.data.coordinates) {
        const coordinates = response.data.coordinates.map(coord => [coord[1], coord[0]]);
        const routeLine = L.polyline(coordinates, {
          color: '#0066ff',
          weight: 5,
          opacity: 0.8,
          smoothFactor: 1,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(map);

        const pickupMarker = L.marker(start, {
          icon: L.divIcon({
            className: 'route-marker',
            html: '<div class="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>',
            iconSize: [16, 16]
          })
        }).addTo(map).bindPopup('Pickup Location');

        const destinationMarker = L.marker(end, {
          icon: L.divIcon({
            className: 'route-marker',
            html: '<div class="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>',
            iconSize: [16, 16]
          })
        }).addTo(map).bindPopup('Destination');

        if (response.data.steps && response.data.steps.length > 0) {
          response.data.steps.forEach((step, index) => {
            if (step.maneuver && step.maneuver.location) {
              const [lng, lat] = step.maneuver.location;
              L.marker([lat, lng], {
                icon: L.divIcon({
                  className: 'route-step',
                  html: `<div class="w-3 h-3 bg-blue-500 rounded-full border border-white"></div>`,
                  iconSize: [12, 12]
                })
              }).addTo(map).bindPopup(`Step ${index + 1}: ${step.maneuver.type}`);
            }
          });
        }

        setRoute(routeLine);
        setRouteCoordinates(coordinates);

        const bounds = L.latLngBounds(coordinates);
        map.fitBounds(bounds, { 
          padding: [50, 50],
          maxZoom: 15,
          animate: true,
          duration: 1
        });

        const distance = (response.data.distance / 1000).toFixed(1);
        const duration = Math.round(response.data.duration / 60);
        
        L.popup()
          .setLatLng(bounds.getCenter())
          .setContent(`Distance: ${distance} km<br>Duration: ${duration} mins`)
          .addTo(map)
          .openOn(map);
      } else {
        throw new Error('Invalid route data received');
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      const routeLine = L.polyline([start, end], {
        color: '#ff0000',
        weight: 3,
        opacity: 0.6,
        dashArray: '5, 10'
      }).addTo(map);

      setRoute(routeLine);
      setRouteCoordinates([start, end]);

      const bounds = L.latLngBounds([start, end]);
      map.fitBounds(bounds, { padding: [50, 50] });

      L.popup()
        .setLatLng(bounds.getCenter())
        .setContent('Unable to calculate route. Showing straight line instead.')
        .addTo(map)
        .openOn(map);
    }
  };

  useEffect(() => {
    if (pickupCoords && destinationCoords) {
      drawRoute(pickupCoords, destinationCoords);
    }
  }, [pickupCoords, destinationCoords, map]);

  useEffect(() => {
    if (ride && ride.status === 'ongoing' && map && routeCoordinates) {
      if (route) {
        map.removeLayer(route);
      }

      const routeLine = L.polyline(routeCoordinates, {
        color: '#0066ff',
        weight: 5,
        opacity: 0.8,
        smoothFactor: 1,
        lineJoin: 'round',
        lineCap: 'round'
      }).addTo(map);

      setRoute(routeLine);

      if (ride.captain && ride.captain.location) {
        const liveMarker = L.marker([ride.captain.location.lat, ride.captain.location.lng], {
          icon: L.divIcon({
            className: 'live-marker',
            html: '<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white animate-pulse"></div>',
            iconSize: [16, 16]
          })
        }).addTo(map);

        const updateMarker = () => {
          if (ride.captain && ride.captain.location) {
            const newPos = [ride.captain.location.lat, ride.captain.location.lng];
            liveMarker.setLatLng(newPos);
            map.panTo(newPos, {
              animate: true,
              duration: 1
            });
          }
        };

        const interval = setInterval(updateMarker, 1000);

        socket.on('captain-location', (data) => {
          if (data.lat && data.lng) {
            ride.captain.location = { lat: data.lat, lng: data.lng };
            updateMarker();
          }
        });

        return () => {
          clearInterval(interval);
          map.removeLayer(liveMarker);
          socket.off('captain-location');
        };
      }
    }
  }, [ride, map, routeCoordinates, socket]);

  useEffect(() => {
    if (socket) {
      const handleRideStarted = (ride) => {
        navigate('/riding', { state: { ride } });
      };

      const handleRideEnded = (ride) => {
        setRide(null);
        setVehicleFound(false);
        setWaitingForDriver(false);
        navigate('/user/home');
      };

      const handleError = (error) => {
        console.error('Socket error:', error);
        alert('Connection error. Please check your internet connection.');
      };

      socket.on('ride:started', handleRideStarted);
      socket.on('ride-ended', handleRideEnded);
      socket.on('error', handleError);
      socket.on('connect_error', handleError);

      return () => {
        socket.off('ride:started', handleRideStarted);
        socket.off('ride-ended', handleRideEnded);
        socket.off('error', handleError);
        socket.off('connect_error', handleError);
      };
    }
  }, [socket, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  useEffect(() => {
    if (vehicleType) {
      console.log('Vehicle type selected, opening confirm ride panel');
      setConfirmRidePanel(true);
    }
  }, [vehicleType, setConfirmRidePanel]);

  const handleCancelRide = async () => {
    try {
        if (!ride) return;
        
        const response = await axios.post('/api/ride/cancel', {
            rideId: ride._id,
            reason: 'Cancelled by user'
        });

        if (response.data.success) {
            setRide(null);
            setWaitingForDriver(false);
            toast.success('Ride cancelled successfully');
        }
    } catch (error) {
        console.error('Error cancelling ride:', error);
        toast.error('Failed to cancel ride');
    }
};

  return (
    <div className='h-screen relative overflow-hidden'>
      <div className="absolute top-3 sm:top-5 right-3 sm:right-5 z-20 flex items-center gap-3">
        <button
          onClick={handleLogout}
          className="bg-black text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base hover:bg-gray-800 transition-colors"
        >
          Logout
        </button>
      </div>
      <img 
        className='w-12 sm:w-16 absolute left-3 sm:left-5 top-3 sm:top-5 z-20' 
        src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png" 
        alt="Uber Logo" 
      />
      <MapContainer
        center={pickupCoords || defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        dragging={true}
        doubleClickZoom={true}
        touchZoom={true}
        keyboard={true}
        zoomControl={true}
        style={{ width: '100vw', height: '100vh', position: 'absolute', inset: 0, zIndex: 0 }}
        minZoom={3}
        maxZoom={18}
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          eventHandlers={{
            error: (e) => {
              console.error('Map tile loading error:', e);
              toast.error('Unable to load map. Please check your internet connection.');
            }
          }}
        />
        {pickupCoords && pickupCoords.lat && pickupCoords.lng && (
          <Marker position={pickupCoords} icon={pickupIcon}>
            <Popup>Pickup Location</Popup>
          </Marker>
        )}
        {destinationCoords && destinationCoords.lat && destinationCoords.lng && (
          <Marker position={destinationCoords} icon={destinationIcon}>
            <Popup>Destination</Popup>
          </Marker>
        )}
        {routeCoordinates && routeCoordinates.length > 1 && (
          <Polyline
            positions={routeCoordinates}
            color="#0066ff"
            weight={5}
            opacity={0.8}
            smoothFactor={1}
            lineJoin="round"
            lineCap="round"
          />
        )}
      </MapContainer>
      <div className="flex flex-col justify-end min-h-screen absolute top-0 w-full z-10 pointer-events-none">
        <div className="h-[38%] sm:h-[30%] p-3 sm:p-6 bg-white relative pointer-events-auto rounded-t-2xl shadow-lg max-w-lg mx-auto w-full">
          <h5
            ref={panelCloseRef}
            onClick={() => {
              setPanelOpen(false);
            }}
            className="absolute opacity-0 right-3 sm:right-6 top-3 sm:top-6 text-xl sm:text-2xl cursor-pointer"
          >
            <i className="ri-arrow-down-wide-line"></i>
          </h5>
          <h4 className="text-lg sm:text-2xl font-semibold mb-2 sm:mb-4">Find a trip</h4>
          <form className="relative py-2 sm:py-3" onSubmit={submitHandler}>
            <div className="line absolute h-12 sm:h-16 w-1 top-[50%] -translate-y-1/2 left-2 sm:left-5 bg-gray-700 rounded-full"></div>
            <input
              onClick={() => {
                setPanelOpen(true);
                setActiveField('pickup');
              }}
              value={pickup}
              onChange={handlePickupChange}
              className="bg-[#eee] px-4 sm:px-12 py-2 text-sm sm:text-lg rounded-lg w-full mb-2"
              type="text"
              placeholder="Add a pick-up location"
            />
            <input
              onClick={() => {
                setPanelOpen(true);
                setActiveField('destination');
              }}
              value={destination}
              onChange={handleDestinationChange}
              className="bg-[#eee] px-4 sm:px-12 py-2 text-sm sm:text-lg rounded-lg w-full mt-2"
              type="text"
              placeholder="Enter your destination"
            />
          </form>
          <button
            onClick={findTrip}
            disabled={loadingFare}
            className="bg-black text-white px-3 sm:px-4 py-2 rounded-lg mt-2 sm:mt-3 w-full disabled:opacity-50 text-sm sm:text-lg cursor-pointer hover:bg-gray-800 transition-colors"
          >
            {loadingFare ? 'Loading...' : 'Find Trip'}
          </button>
        </div>
        <div ref={panelRef} className="bg-white h-0 pointer-events-auto max-w-lg mx-auto w-full">
          {loadingSuggestions ? (
            <div className="p-2 sm:p-3 text-sm sm:text-base">Loading suggestions...</div>
          ) : (
            <LocationSearchPanel
              suggestions={activeField === 'pickup' ? pickupSuggestions : destinationSuggestions}
              setPanelOpen={setPanelOpen}
              setVehiclePanel={setVehiclePanel}
              setPickup={setPickup}
              setDestination={setDestination}
              setPickupCoords={setPickupCoords}
              setDestinationCoords={setDestinationCoords}
              activeField={activeField}
            />
          )}
        </div>
      </div>
      <div ref={vehiclePanelRef} className="fixed w-full z-10 bottom-0 translate-y-full bg-white px-2 sm:px-3 py-4 sm:py-8 pt-8 sm:pt-10 max-w-lg mx-auto pointer-events-auto rounded-t-2xl shadow-lg">
        <VehiclePanel
          selectVehicle={setVehicleType}
          fare={fare}
          setConfirmRidePanel={setConfirmRidePanel}
          setVehiclePanel={setVehiclePanel}
        />
      </div>
      <div ref={confirmRidePanelRef} className="fixed w-full z-10 bottom-0 translate-y-full bg-white px-2 sm:px-3 py-3 sm:py-6 pt-8 sm:pt-10 max-w-lg mx-auto pointer-events-auto rounded-t-2xl shadow-lg">
        <ConfirmRide
          createRide={createRide}
          pickup={pickup}
          destination={destination}
          fare={fare}
          vehicleType={vehicleType}
          setConfirmRidePanel={setConfirmRidePanel}
          setVehicleFound={setVehicleFound}
          isConnected={isConnected}
        />
      </div>
      <div ref={vehicleFoundRef} className="fixed w-full z-10 bottom-0 translate-y-full bg-white px-2 sm:px-3 py-3 sm:py-6 pt-8 sm:pt-10 max-w-lg mx-auto pointer-events-auto rounded-t-2xl shadow-lg">
        <LookingForDriver
          createRide={createRide}
          pickup={pickup}
          destination={destination}
          fare={fare}
          vehicleType={vehicleType}
          setVehicleFound={setVehicleFound}
        />
      </div>
      {waitingForDriver && (
        <div ref={waitingForDriverRef} className="fixed bottom-0 left-0 right-0 z-20">
          <WaitingForDriver
              ride={ride}
              onCancel={handleCancelRide}
          />
        </div>
      )}
    </div>
  );
};

export default Home;