import React, { useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const CaptainLogout = () => {
  const token = localStorage.getItem("captainToken");
  const navigate = useNavigate();

  useEffect(() => {
    const logout = async () => {
      try {
        await axios.get(`${import.meta.env.VITE_BASE_URL}/captains/logout`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        localStorage.removeItem("captainToken");
        navigate("/captain-login");
      } catch (error) {
        console.error("Logout error:", error);
        // Still remove token and redirect on error
        localStorage.removeItem("captainToken");
        navigate("/captain-login");
      }
    };

    logout();
  }, [token, navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p>Logging out...</p>
    </div>
  );
};

export default CaptainLogout;
