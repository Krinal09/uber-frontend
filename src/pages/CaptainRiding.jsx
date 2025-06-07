import React, { useRef, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import FinishRide from '../components/FinishRide';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import LiveTracking from '../components/LiveTracking';
import ChatWindow from '../components/ChatWindow';
import { useContext } from 'react';
import { SocketContext } from '../context/SocketContext';
import { CaptainContext } from '../context/CaptainContext';
import { toast } from 'react-hot-toast';

const CaptainRiding = () => {
  const [finishRidePanel, setFinishRidePanel] = useState(false);
  const finishRidePanelRef = useRef(null);
  const location = useLocation();
  const rideData = location.state?.ride;
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasChatInitiated, setHasChatInitiated] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0); // Track unread messages
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { socket } = useContext(SocketContext);
  const { captain } = useContext(CaptainContext);
  const navigate = useNavigate();

  useEffect(() => {
    // Debug logs to check data availability
    console.log("CaptainRiding.jsx: rideData:", rideData);
    console.log("CaptainRiding.jsx: captain data:", captain);
    console.log("CaptainRiding.jsx: socket:", socket);

    if (rideData && rideData._id && socket) {
      socket.emit('join-ride-chat', rideData._id);
      console.log(`Captain ${captain?._id} attempting to join chat room for ride ${rideData._id}`);

      const handleMessageHistory = (history) => {
        console.log('CaptainRiding.jsx: Received message history', history);
        if (history && history.length > 0) {
          setHasChatInitiated(true);
        }
      };

      const handleReceiveMessage = (message) => {
        console.log('CaptainRiding.jsx: Received message:', message);
        // Increment unread message count only if chat window is closed
        if (!isChatOpen) {
          setUnreadMessages((prev) => prev + 1);
        }
      };

      socket.on('message-history', handleMessageHistory);
      socket.on('receive-message', handleReceiveMessage);

      return () => {
        socket.off('message-history', handleMessageHistory);
        socket.off('receive-message', handleReceiveMessage);
      };
    }
  }, [rideData, socket, captain, isChatOpen]);

  useGSAP(() => {
    if (finishRidePanel) {
      gsap.to(finishRidePanelRef.current, {
        transform: 'translateY(0)',
      });
    } else {
      gsap.to(finishRidePanelRef.current, {
        transform: 'translateY(100%)',
      });
    }
  }, [finishRidePanel]);

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

  const toggleChat = () => {
    if (!rideData?._id) {
      toast.error('Ride data not available for chat.');
      return;
    }

    if (!hasChatInitiated) {
      if (socket) {
        socket.emit('captain-initiate-chat', { rideId: rideData._id });
        setHasChatInitiated(true);
        toast.success('Chat initiated!');
      }
    }

    setIsChatOpen((prev) => !prev);
    setUnreadMessages(0); // Reset unread messages when chat is opened
  };

  const toggleDetails = () => {
    setIsDetailsOpen((prev) => !prev);
  };

  // Callback to handle ride completion
  const handleRideCompleted = () => {
    if (socket && rideData?._id) {
      // Emit the ride status update event
      socket.emit('ride:status:updated', {
        status: 'completed',
        data: { ...rideData, status: 'completed' },
      });
      console.log('CaptainRiding.jsx: Emitted ride:status:updated with status "completed"');
      
      // Show success toast and navigate to captain's home page
      toast.success('Ride completed successfully!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      setTimeout(() => {
        navigate("/captain-home");
      }, 3000); // Delay navigation to show the toast
    } else {
      toast.error('Failed to complete ride: Missing socket or ride data.');
    }
  };

  return (
    <div className="h-screen relative flex flex-col justify-end">
      {/* Header */}
      <div className="fixed p-6 top-0 flex items-center justify-between w-screen z-50">
        <img
          className="w-16"
          src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png"
          alt="Uber Logo"
        />
        <Link
          to="/captain/home"
          className="h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md hover:bg-gray-100 transition"
        >
          <i className="text-lg font-medium ri-logout-box-r-line text-gray-600"></i>
        </Link>
      </div>

      {/* Full-Screen Map */}
      <div className="h-screen fixed w-screen top-0 z-[-1]">
        <LiveTracking
          rideId={rideData?._id}
          pickupCoords={rideData?.pickup?.coordinates}
          destinationCoords={rideData?.destination?.coordinates}
          isCaptain={true}
        />
      </div>

      {/* Floating Chat Window for Captain */}
      {rideData?._id && captain?._id && (
        <div
          id="floating-chat-window"
          className="fixed bottom-24 right-6 w-80 bg-white rounded-lg shadow-lg z-50 overflow-hidden transform scale-90 opacity-0"
          style={{ maxHeight: '400px' }}
        >
          <div className="bg-gray-100 p-3 flex justify-between items-center">
            <h3 className="text-md font-medium text-gray-800">Chat with User</h3>
            <button onClick={toggleChat} className="text-gray-600 hover:text-gray-800">
              <i className="ri-close-line text-lg"></i>
            </button>
          </div>
          <div className="h-64 overflow-y-auto">
            <ChatWindow
              rideId={rideData._id}
              socket={socket}
              userId={captain._id}
              userType="captain"
            />
          </div>
        </div>
      )}

      {/* Yellow Info Bar */}
      <div className="relative bg-yellow-400 pt-10">
        <h5
          className="p-1 text-center w-[90%] absolute top-0"
          onClick={toggleDetails}
        >
          <i
            className={`text-3xl text-gray-800 ${
              isDetailsOpen ? 'ri-arrow-down-wide-line' : 'ri-arrow-up-wide-line'
            }`}
          ></i>
        </h5>

        {/* Collapsible Ride Details */}
        <div id="ride-details" className="overflow-hidden opacity-0 h-0">
          <div className="p-6 flex flex-col">
            {/* User Details */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-left">
                <h2 className="text-lg font-medium capitalize text-gray-800">
                  {rideData?.user?.fullname?.firstname} {rideData?.user?.fullname?.lastname}
                </h2>
                <p className="text-sm text-gray-800">Passenger</p>
              </div>
            </div>

            {/* Ride Details */}
            <div className="flex gap-2 justify-between flex-col items-center mb-4">
              <div className="w-full">
                <div className="flex items-center gap-5 p-3 border-b-2 border-gray-600">
                  <i className="text-lg ri-map-pin-2-fill text-indigo-500"></i>
                  <div>
                    <h3 className="text-lg font-medium text-gray-800">Destination:</h3>
                    <p className="text-sm -mt-1 text-gray-800">{rideData?.destination?.address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-5 p-3">
                  <i className="ri-currency-line text-green-600"></i>
                  <div>
                    <h3 className="text-lg font-medium text-gray-800">Fare:</h3>
                    <p className="text-sm -mt-1 text-gray-800">
                      ₹{rideData?.fare?.amount || '138'} ({rideData?.fare?.currency || 'USD'})
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="h-1/5 p-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h4 className="text-xl font-semibold text-gray-800">4 KM away</h4>
          </div>
          <div className="flex items-center space-x-4">
            {rideData?._id && captain?._id ? (
              <div className="relative">
                <button
                  className={`h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md ${
                    isChatOpen ? 'text-blue-600' : unreadMessages > 0 ? 'text-blue-600' : 'text-gray-600'
                  }`}
                  onClick={toggleChat}
                  title="Toggle Chat"
                >
                  <i className="ri-message-3-line text-lg"></i>
                </button>
                {unreadMessages > 0 && (
                  <span className="absolute top-0 right-0 flex items-center justify-center h-5 w-5 rounded-full ring-2 ring-white bg-blue-600 text-white text-xs font-semibold">
                    {unreadMessages}
                  </span>
                )}
              </div>
            ) : (
              <div className="text-red-600 font-semibold">Chat unavailable: Missing ride or captain data</div>
            )}
            <button
              className="bg-green-600 text-white font-semibold p-3 px-10 rounded-lg shadow-md hover:bg-green-700 transition"
              onClick={() => setFinishRidePanel(true)}
            >
              Complete Ride
            </button>
          </div>
        </div>
      </div>

      <div ref={finishRidePanelRef} className="fixed w-full z-[500] bottom-0 translate-y-full bg-white px-3 py-10 pt-12">
        <FinishRide 
          ride={rideData} 
          setFinishRidePanel={setFinishRidePanel} 
          socket={socket} 
          onRideCompleted={handleRideCompleted} 
        />
      </div>
    </div>
  );
};

export default CaptainRiding;