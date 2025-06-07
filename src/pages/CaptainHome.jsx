import React, { useRef, useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import CaptainDetails from "../components/CaptainDetails";
import RidePopUp from "../components/RidePopUp";
import ConfirmRidePopUp from "../components/ConfirmRidePopUp";
import { SocketContext } from "../context/SocketContext";
import { CaptainContext } from "../context/CaptainContext";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import api from "../utils/api";
import { toast } from "react-hot-toast";

const CaptainHome = () => {
  const [ridePopupPanel, setRidePopupPanel] = useState(false);
  const [confirmRidePopupPanel, setConfirmRidePopupPanel] = useState(false);
  const [ride, setRide] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);

  const ridePopupPanelRef = useRef(null);
  const confirmRidePopupPanelRef = useRef(null);

  const { socket, isConnected } = useContext(SocketContext);
  const { captain, logout } = useContext(CaptainContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket || !captain) return;

    // Join captain's personal room
    socket.emit("join:ride", {
      userId: captain._id,
      userType: "Captain"
    });

    // Update captain availability
    socket.emit("update:availability", { isAvailable: true });

    // Listen for new ride requests
    const handleNewRide = (data) => {
      console.log("New ride request received:", data);
      console.log("Data received in handleNewRide:", data);
      setRide(data);
      setRidePopupPanel(true);
      toast("New ride request received!");
    };

    // Listen for ride status updates
    const handleRideStatusUpdate = ({ status, data }) => {
      console.log("Ride status updated:", status, data);
      if (ride && ride._id === data.rideId) {
        setRide(prev => ({ ...prev, status }));
        switch (status) {
          case 'accepted':
            setRidePopupPanel(false);
            setConfirmRidePopupPanel(true);
            toast.success('Ride accepted successfully!');
            break;
          case 'on-the-way':
            setConfirmRidePopupPanel(false);
            toast('You are on your way to pick up the passenger');
            break;
          case 'in-progress':
            setConfirmRidePopupPanel(false);
            navigate('/captain-riding', { state: { ride: { ...ride, status } } });
            toast.success('Ride started successfully!');
            break;
          case 'completed':
            navigate('/captain/home');
            setRide(null);
            setIsAvailable(true);
            toast.success('Ride completed successfully!');
            break;
          case 'cancelled':
            setRidePopupPanel(false);
            setConfirmRidePopupPanel(false);
            setRide(null);
            setIsAvailable(true);
            toast.error(data.reason || 'Ride was cancelled');
            break;
        }
      }
    };

    socket.on("new-ride", handleNewRide);
    socket.on("ride:status:updated", handleRideStatusUpdate);

    return () => {
      socket.off("new-ride", handleNewRide);
      socket.off("ride:status:updated", handleRideStatusUpdate);
    };
  }, [socket, captain]);

  useEffect(() => {
    if (socket && isConnected && isAvailable) {
      const intervalId = setInterval(() => {
        socket.emit('update:lastSeen');
      }, 5000);

      return () => clearInterval(intervalId);
    }
  }, [socket, isConnected, isAvailable]);

  useEffect(() => {
    if (socket && isConnected) {
      console.log("Captain socket ID:", socket.id);
    }
  }, [socket, isConnected]);

  useEffect(() => {
    if (!socket) return;
    socket.onAny((event, ...args) => {
      console.log("Socket event received:", event, args);
    });
    return () => socket.offAny();
  }, [socket]);

  async function confirmRide() {
    if (!ride || !captain) return;
    
    setIsLoading(true);
    try {
        console.log("Confirming ride with payload:", { rideId: ride.rideId });
        const response = await api.post("/api/ride/confirm", {
            rideId: ride.rideId
        });

        if (response.data.success) {
            // Emit ride:accept event
            console.log("Confirming ride with ID:", ride.rideId); 

            socket.emit('ride:accept', { rideId: ride.rideId });
            
            setRidePopupPanel(false);
            setConfirmRidePopupPanel(true);
            setRide(response.data.data);
            setIsAvailable(false);
            toast.success("Ride confirmed successfully!");
        } else {
            throw new Error(response.data.message || 'Failed to confirm ride');
        }
    } catch (error) {
        console.error("Error confirming ride:", error);
        toast.error(error.response?.data?.message || 'Failed to confirm ride. Please try again.');
    } finally {
        setIsLoading(false);
    }
  }

  useGSAP(() => {
    if (ridePopupPanel && ridePopupPanelRef.current) {
      gsap.to(ridePopupPanelRef.current, {
        transform: "translateY(0)",
      });
    } else if (ridePopupPanelRef.current) {
      gsap.to(ridePopupPanelRef.current, {
        transform: "translateY(100%)",
      });
    }
  }, [ridePopupPanel]);

  useGSAP(() => {
    if (confirmRidePopupPanel && confirmRidePopupPanelRef.current) {
      gsap.to(confirmRidePopupPanelRef.current, {
        transform: "translateY(0)",
      });
    } else if (confirmRidePopupPanelRef.current) {
      gsap.to(confirmRidePopupPanelRef.current, {
        transform: "translateY(100%)",
      });
    }
  }, [confirmRidePopupPanel]);

  if (!socket) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 font-bold text-xl mb-2">
            Socket not connected!
          </div>
          <p className="text-gray-600">
            Please check your internet connection and try again.
          </p>
        </div>
      </div>
    );
  }

  if (!captain) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 font-bold text-xl mb-2">
            Captain context not loaded!
          </div>
          <p className="text-gray-600">
            Please check your login and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10 shadow-sm bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <img
              className="h-6 w-auto"
              src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png"
              alt="Uber Logo"
            />
            <button
              onClick={logout}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-black text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-300 hover:scale-110 cursor-pointer"
            >
              <i className="ri-logout-box-r-line text-lg"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-16 flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
        {/* Map Section */}
        <div className="lg:w-1/2 h-64 lg:h-full bg-gray-200">
          <img
            className="h-full w-full object-cover"
            src="https://miro.medium.com/v2/resize:fit:1400/0*gwMx05pqII5hbfmX.gif"
            alt="Map Background"
          />
        </div>

        {/* Captain Details Section */}
        <div className="lg:w-1/2 p-4 overflow-y-auto">
          <CaptainDetails />
        </div>
      </div>

      {/* Ride Popup */}
      <div
        ref={ridePopupPanelRef}
        className="fixed bottom-0 w-full max-w-screen-sm mx-auto left-0 right-0 translate-y-full z-20 bg-white px-4 py-6 rounded-t-2xl shadow-lg"
      >
        <RidePopUp
          ride={ride}
          setRidePopupPanel={setRidePopupPanel}
          setConfirmRidePopupPanel={setConfirmRidePopupPanel}
          confirmRide={confirmRide}
        />
      </div>

      {/* Confirm Ride Popup */}
      <div
        ref={confirmRidePopupPanelRef}
        className="fixed bottom-0 w-full h-screen max-w-screen-sm mx-auto left-0 right-0 translate-y-full z-30 bg-white px-4 py-6 rounded-t-2xl shadow-lg overflow-y-auto"
      >
        <ConfirmRidePopUp
          ride={ride}
          setConfirmRidePopupPanel={setConfirmRidePopupPanel}
          setRidePopupPanel={setRidePopupPanel}
        />
      </div>
    </div>
  );
};

export default CaptainHome;

