import React, { useEffect, useContext, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { SocketContext } from "../context/SocketContext";
import { UserContext } from "../context/UserContext";
import LiveTracking from "../components/LiveTracking";
import ChatWindow from "../components/ChatWindow";
import { toast } from 'react-hot-toast';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

const Riding = () => {
  const location = useLocation();
  const { socket } = useContext(SocketContext);
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [ride, setRide] = useState(location.state?.ride || null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showChatNotification, setShowChatNotification] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    console.log("Riding.jsx: ride data:", ride);
    console.log("Riding.jsx: user data:", user);
    console.log("Riding.jsx: socket:", socket);

    if (!socket) {
      console.log("Riding.jsx: Socket is not available.");
      return;
    }

    if (ride?._id) {
      console.log(`Riding.jsx: Joining ride chat room with ride ID ${ride._id}`);
      socket.emit('join-ride-chat', ride._id);
      console.log(`User ${user?._id} joined chat room for ride ${ride._id}`);
    } else {
      console.log("Riding.jsx: Ride ID is not available for joining chat room.");
    }

    const handleRideStatusUpdate = ({ status, data }) => {
      console.log('Riding.jsx: Received ride:status:updated event', { status, data });
      if (data && data._id) {
        console.log(`Riding.jsx: Updating ride data with ID ${data._id}`);
        setRide(data);
      }
      if (status === 'cancelled') {
        console.log("Riding.jsx: Ride status is 'cancelled'. Navigating to /home");
        toast.error('Ride has been cancelled.', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        setTimeout(() => {
          navigate("/home");
        }, 3000);
      } else if (status !== 'completed') {
        console.log(`Riding.jsx: Ride status is '${status}'. No navigation triggered.`);
      }
    };

    const handleChatInitiated = ({ rideId }) => {
      console.log('Riding.jsx: Chat initiated event received for ride:', rideId);
      if (ride && ride._id === rideId && user?._id) {
        console.log('Riding.jsx: Showing chat notification.');
        setShowChatNotification(true);
        toast('Captain has started the chat!', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          onClick: () => {
            setIsChatOpen(true);
            setShowChatNotification(false);
            setUnreadMessages(0);
          },
        });
      } else {
        console.log("Riding.jsx: Chat initiated event ignored. Ride ID mismatch or user ID missing.");
      }
    };

    const handleReceiveMessage = (message) => {
      console.log('Riding.jsx: Received message:', message);
      if (!isChatOpen) {
        setUnreadMessages((prev) => prev + 1);
      }
    };

    const handleRideCompleted = (completedRide) => {
      console.log('Riding.jsx: Received ride:completed event', completedRide);
      toast.success('Ride completed by the captain!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      setTimeout(() => {
        navigate("/home");
      }, 3000);
    };

    socket.on("ride:status:updated", handleRideStatusUpdate);
    socket.on("chat-initiated", handleChatInitiated);
    socket.on("receive-message", handleReceiveMessage);
    socket.on("ride:completed", handleRideCompleted);

    return () => {
      socket.off("ride:status:updated", handleRideStatusUpdate);
      socket.off("chat-initiated", handleChatInitiated);
      socket.off("receive-message", handleReceiveMessage);
      socket.off("ride:completed", handleRideCompleted);
    };
  }, [socket, navigate, ride, user, isChatOpen]);

  const isRideActive = ride && (ride.status === 'confirmed' || ride.status === 'started' || ride.status === 'in-progress' || ride.status === 'on-the-way');

  const toggleChat = () => {
    setIsChatOpen((prev) => !prev);
    setShowChatNotification(false);
    setUnreadMessages(0);
  };

  const toggleDetails = () => {
    setIsDetailsOpen((prev) => !prev);
  };

  const handleStartTracking = () => {
    toast('Start tracking functionality not yet implemented');
  };

  const handleCancelRide = () => {
    toast('Cancel ride functionality not yet implemented');
  };

  useGSAP(() => {
    const detailsElement = document.querySelector('#ride-details');
    if (detailsElement) {
      if (isDetailsOpen) {
        gsap.to(detailsElement, {
          height: 'auto',
          opacity: 1,
          duration: 0.3,
          ease: 'power2.out',
        });
      } else {
        gsap.to(detailsElement, {
          height: 0,
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
        });
      }
    }
  }, [isDetailsOpen]);

  useGSAP(() => {
    const chatElement = document.querySelector('#floating-chat-window');
    if (chatElement) {
      if (isChatOpen) {
        gsap.to(chatElement, {
          scale: 1,
          opacity: 1,
          duration: 0.3,
          ease: 'power2.out',
        });
      } else {
        gsap.to(chatElement, {
          scale: 0.8,
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
        });
      }
    }
  }, [isChatOpen]);

  if (!ride) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mb-4 mx-auto"></div>
          <div className="text-gray-700">Loading ride details or waiting for captain to start the ride...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen relative flex flex-col justify-end">
      <div className="fixed p-6 top-0 flex items-center justify-between w-screen z-50">
        <img
          className="w-16"
          src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png"
          alt="Uber Logo"
        />
        <div className="flex space-x-3">
          <Link
            to="/home"
            className="h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md hover:bg-gray-100 transition"
            title="Back to Home"
          >
            <i className="text-lg font-medium ri-home-5-line text-gray-600"></i>
          </Link>
          <button
            className="h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md hover:bg-gray-100 transition"
            onClick={handleStartTracking}
            title="Start Tracking"
          >
            <i className="text-lg font-medium ri-map-pin-line text-gray-600"></i>
          </button>
        </div>
      </div>

      <div className="h-screen w-screen fixed top-0 z-[-1]">
        <LiveTracking
          rideId={ride._id}
          pickupCoords={ride.pickup?.coordinates}
          destinationCoords={ride.destination?.coordinates}
          isCaptain={false}
        />
      </div>

      {ride?._id && user?._id && (
        <div
          id="floating-chat-window"
          className="fixed bottom-24 right-6 w-80 bg-white rounded-lg shadow-lg z-50 overflow-hidden transform scale-90 opacity-0"
          style={{ maxHeight: '400px' }}
        >
          <div className="bg-gray-100 p-3 flex justify-between items-center">
            <h3 className="text-md font-medium text-gray-800">Chat with Captain</h3>
            <button onClick={toggleChat} className="text-gray-600 hover:text-gray-800">
              <i className="ri-close-line text-lg"></i>
            </button>
          </div>
          <div className="h-64 overflow-y-auto">
            <ChatWindow rideId={ride._id} socket={socket} userId={user._id} userType="user" />
          </div>
        </div>
      )}

      <div className="relative bg-yellow-400 pt-10">
        <h5 className="p-1 text-center w-[90%] absolute top-0" onClick={toggleDetails}>
          <i className={`text-3xl text-gray-800 ${isDetailsOpen ? 'ri-arrow-down-wide-line' : 'ri-arrow-up-wide-line'}`}></i>
        </h5>

        <div id="ride-details" className="overflow-hidden opacity-0 h-0">
          <div className="p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <img
                className="h-12 w-12 rounded-full object-cover"
                src="https://swyft.pl/wp-content/uploads/2023/05/how-many-people-can-a-uberx-take.jpg"
                alt="Captain"
              />
              <div className="text-right">
                <h2 className="text-lg font-medium capitalize text-gray-800">
                  {ride?.captain?.fullname?.firstname} {ride?.captain?.fullname?.lastname}
                </h2>
                <h4 className="text-xl font-semibold -mt-1 -mb-1 text-gray-800">
                  {ride?.captain?.vehicle?.plate}
                </h4>
                <p className="text-sm text-gray-800">{ride?.captain?.vehicle?.model || 'Vehicle Model'}</p>
              </div>
            </div>

            <div className="flex gap-2 justify-between flex-col items-center mb-4">
              <div className="w-full">
                <div className="flex items-center gap-5 p-3 border-b-2 border-gray-600">
                  <i className="text-lg ri-map-pin-2-fill text-indigo-500"></i>
                  <div>
                    <h3 className="text-lg font-medium text-gray-800">Destination:</h3>
                    <p className="text-sm -mt-1 text-gray-800">{ride?.destination?.address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-5 p-3">
                  <i className="ri-currency-line text-green-600"></i>
                  <div>
                    <h3 className="text-lg font-medium text-gray-800">Fare:</h3>
                    <p className="text-sm -mt-1 text-gray-800">
                      ₹{ride?.fare?.amount || '138'} ({ride?.fare?.currency || 'USD'})
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="h-1/5 p-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h4 className="text-xl font-semibold text-gray-800">4 KM away</h4>
              <p className="text-sm text-gray-800">
                Fare: ₹{ride?.fare?.amount || '138'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {ride?._id && user?._id ? (
              <div className="relative">
                <button
                  className={`h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md ${
                    isChatOpen ? 'text-blue-600' : showChatNotification || unreadMessages > 0 ? 'text-blue-600' : 'text-gray-600'
                  }`}
                  onClick={toggleChat}
                  title="Toggle Chat"
                >
                  <i className="ri-message-3-line text-lg"></i>
                </button>
                {(showChatNotification || unreadMessages > 0) && (
                  <span className="absolute top-0 right-0 flex items-center justify-center h-5 w-5 rounded-full ring-2 ring-white bg-blue-600 text-white text-xs font-semibold">
                    {unreadMessages > 0 ? unreadMessages : ''}
                  </span>
                )}
              </div>
            ) : (
              <div className="text-red-600 font-semibold">Chat unavailable: Missing ride or user data</div>
            )}
            {isRideActive && (
              <button
                className="bg-red-600 text-white font-semibold p-3 px-6 rounded-lg shadow-md hover:bg-red-700 transition"
                onClick={handleCancelRide}
              >
                Cancel Ride
              </button>
            )}
            {ride?.status === 'completed' && (
              <button className="bg-green-600 text-white font-semibold p-3 px-6 rounded-lg shadow-md hover:bg-green-700 transition">
                Make a Payment
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Riding;