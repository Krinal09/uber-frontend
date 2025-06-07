import React from 'react';
import { UserProvider } from './context/UserContext';
import { CaptainProvider } from './context/CaptainContext';
import { SocketProvider } from './context/SocketContext';
import AppRoutes from './routes';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <UserProvider>
      <CaptainProvider>
        <SocketProvider>
          <Toaster position="top-center" />
          <AppRoutes />
        </SocketProvider>
      </CaptainProvider>
    </UserProvider>
  );
}

export default App;