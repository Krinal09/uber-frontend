import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCaptain } from "../context/CaptainContext";
import api from "../utils/api";
import { toast } from "react-toastify";

const CaptainProtectWrapper = ({ children }) => {
  const { captain, setCaptain, loading } = useCaptain();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  console.log('CaptainProtectWrapper rendering. isLoading:', isLoading, 'captain:', captain);

  useEffect(() => {
    const token = localStorage.getItem("captainToken");

    if (!token) {
      setIsLoading(false);
      navigate("/captain-login");
      return;
    }

    if (captain) {
      setIsLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const response = await api.get('/api/captain/profile');

        if (response.status === 200 && response.data?.data?.captain) {
          setCaptain(response.data.data.captain);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem("captainToken");
        toast.error('Session expired. Please login again.');
        navigate("/captain-login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [captain, navigate, setCaptain]);

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!captain) {
    return null;
  }

  return children;
};

export default CaptainProtectWrapper;
