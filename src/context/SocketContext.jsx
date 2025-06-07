import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';

export const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const initializeSocket = () => {
    // const token = localStorage.getItem('userToken') || localStorage.getItem('captainToken');
      const token = localStorage.getItem('captainToken') || localStorage.getItem('userToken');
      
      if (!token) {
        console.log('Socket connection skipped: No token available');
        return;
      }

      console.log('Initializing socket connection with token');
      setIsConnecting(true);

      const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      newSocket.on('connect', () => {
        console.log('Socket connected successfully');
        setIsConnected(true);
        setIsConnecting(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
        setIsConnecting(false);
        
        if (error.message.includes('Token expired') || error.message.includes('Invalid token')) {
          localStorage.removeItem('userToken');
          localStorage.removeItem('captainToken');
          toast.error('Session expired. Please login again.');
          window.location.href = '/login';
        } else {
          toast.error('Connection error. Please check your internet connection.');
        }
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      setSocket(newSocket);

      return () => {
        console.log('Cleaning up socket connection');
        if (newSocket) {
          newSocket.disconnect();
        }
      };
    };

    const cleanup = initializeSocket();

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const value = {
    socket,
    isConnected,
    isConnecting
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;