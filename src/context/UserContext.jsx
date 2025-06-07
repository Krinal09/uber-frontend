import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

export const UserContext = createContext();

// Export the hook
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

// Export the provider component
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("userToken"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set up axios interceptor for token
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      (config) => {
        const userToken = localStorage.getItem("userToken");
        if (userToken) {
          config.headers.Authorization = `Bearer ${userToken}`;
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

  // On mount, rehydrate user from localStorage if present
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('userToken');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      setToken(token);
      setLoading(false);
      return;
    }
    // fallback to fetching from backend if not in localStorage
    const fetchUserData = async () => {
      setLoading(true);
      try {
        if (!token) {
          setLoading(false);
          return;
        }
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/user/profile`
        );
        if (response.data && response.data.data) {
          setUser(response.data.data);
          localStorage.setItem('user', JSON.stringify(response.data.data));
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('userToken');
          localStorage.removeItem('user');
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  // Update localStorage on user change
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/user/login`,
        { email, password }
      );
      if (response.data && response.data.data) {
        const { token, user } = response.data.data;
        localStorage.setItem('userToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        setToken(token);
        return { success: true };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed. Please try again.' 
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/user/register`,
        userData
      );
      if (response.data && response.data.data) {
        const { token: newToken, user: newUser } = response.data.data;
        localStorage.setItem('userToken', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
        return newUser;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = err.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const userToken = localStorage.getItem('userToken');
      if (userToken) {
        await axios.get(`${import.meta.env.VITE_API_URL}/api/user/logout`);
      }
      localStorage.removeItem('userToken');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      const errorMessage = err.response?.data?.message || 'Logout failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateProfile = async (updateData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/user/${user._id}`,
        updateData
      );
      
      if (response.data && response.data.data) {
        setUser(response.data.data.user);
        return response.data.data.user;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error("Profile update error:", err);
      const errorMessage = err.response?.data?.message || "Failed to update profile";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    setUser,
    token,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default UserContext;
