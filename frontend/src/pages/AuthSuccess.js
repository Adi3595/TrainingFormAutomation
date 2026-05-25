// AuthSuccess.js
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function AuthSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("=== AuthSuccess Component Mounted ===");
    console.log("Current URL:", window.location.href);
    console.log("Location search:", location.search);
    
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    
    console.log("Token from URL:", token ? `Found (length: ${token.length})` : "NOT FOUND");
    console.log("First 20 chars of token:", token ? token.substring(0, 20) + "..." : "N/A");

    if (!token) {
      console.error("No token found in URL");
      setError("No authentication token received. Please try logging in again.");
      setTimeout(() => {
        navigate("/login");
      }, 3000);
      return;
    }

    // Store token
    localStorage.setItem("token", token);
    console.log("Token stored in localStorage");

    // Fetch user data
    const fetchUserData = async () => {
      try {
        console.log("Fetching user data from /api/auth/me");
        const response = await fetch('https://trainingformautomation.onrender.com/api/auth/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log("User data response status:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("User data received:", data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
          
          // Small delay to ensure storage is complete
          setTimeout(() => {
            console.log("Redirecting to dashboard...");
            navigate("/dashboard", { replace: true });
          }, 500);
        } else {
          const errorText = await response.text();
          console.error("Failed to fetch user data:", response.status, errorText);
          setError(`Failed to authenticate: ${response.status}`);
          localStorage.removeItem("token");
          setTimeout(() => {
            navigate("/login");
          }, 3000);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Network error. Please check your connection.");
        localStorage.removeItem("token");
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    };
    
    fetchUserData();
  }, [location, navigate]);

  if (error) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center",
        background: "linear-gradient(135deg, #0a0a0f 0%, #030308 100%)",
        color: "white",
        fontFamily: "system-ui, -apple-system, sans-serif",
        textAlign: "center",
        padding: "20px"
      }}>
        <div style={{
          fontSize: "48px",
          marginBottom: "20px"
        }}>⚠️</div>
        <h2>Authentication Error</h2>
        <p style={{ color: "#f87171", marginBottom: "20px" }}>{error}</p>
        <p>Redirecting to login page...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center",
      background: "linear-gradient(135deg, #0a0a0f 0%, #030308 100%)",
      color: "white",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <div style={{
        width: "50px",
        height: "50px",
        border: "3px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "50%",
        borderTopColor: "white",
        animation: "spin 1s linear infinite"
      }}></div>
      <h2 style={{ marginTop: "20px" }}>Signing you in...</h2>
      <p style={{ color: "rgba(255,255,255,0.7)" }}>Please wait while we redirect you to your dashboard</p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default AuthSuccess;