import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export const CaptainContext = createContext();

export const useCaptain = () => useContext(CaptainContext);

export const CaptainProvider = ({ children }) => {
  const [captain, setCaptain] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('captainToken'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      (config) => {
        const captainToken = localStorage.getItem('captainToken');
        if (captainToken) {
          config.headers.Authorization = `Bearer ${captainToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, []);

  useEffect(() => {
    const fetchCaptainData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('captainToken');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/captain/profile`);

        if (response.data?.success && response.data?.data) {
          setCaptain(response.data.data.captain);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Error fetching captain data:', error, error.response?.data);
        if (error.response?.status === 401) {
          localStorage.removeItem('captainToken');
          setCaptain(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCaptainData();
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/captain/login`,
        { email, password }
      );
      
      if (response.data?.success && response.data?.data) {
        const { token: newToken, captain: captainData } = response.data.data;
        localStorage.setItem('captainToken', newToken);
        setToken(newToken);
        setCaptain(captainData);
        return captainData;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Login error:', err, err.response?.data);
      const errorMessage = err.response?.data?.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const register = async (captainData) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!captainData.fullname?.firstname || !captainData.email || !captainData.password) {
        throw new Error('First name, email, and password are required');
      }
      if (!captainData.vehicle?.color || !captainData.vehicle?.plate || 
          !captainData.vehicle?.capacity || !captainData.vehicle?.vehicleType) {
        throw new Error('All vehicle details are required');
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/captain/register`,
        captainData
      );
      
      if (response.data?.success && response.data?.data) {
        const { token: newToken, captain: newCaptain } = response.data.data;
        localStorage.setItem('captainToken', newToken);
        setToken(newToken);
        setCaptain(newCaptain);
        return newCaptain;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Registration error:', err, err.response?.data);
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const captainToken = localStorage.getItem('captainToken');
      if (captainToken) {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/captain/logout`);
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('captainToken');
      setToken(null);
      setCaptain(null);
    }
  };

  const updateProfile = async (updateData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/captain/${captain._id}`,
        updateData
      );
      
      if (response.data?.success && response.data?.data) {
        setCaptain(response.data.data.captain);
        return response.data.data.captain;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Profile update error:', err, err.response?.data);
      const errorMessage = err.response?.data?.message || 'Failed to update profile';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    captain,
    setCaptain,
    token,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile
  };

  return (
    <CaptainContext.Provider value={value}>
      {children}
    </CaptainContext.Provider>
  );
};

export default CaptainContext;