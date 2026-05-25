// AuthSuccess.js - Updated with domain restriction error handling
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function AuthSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);

  useEffect(() => {
    console.log("=== AuthSuccess Component Mounted ===");
    console.log("Current URL:", window.location.href);
    console.log("Location search:", location.search);
    
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const errorParam = params.get("error");
    const errorMessage = params.get("message");
    
    console.log("Token from URL:", token ? `Found (length: ${token.length})` : "NOT FOUND");
    console.log("Error param:", errorParam);
    console.log("Error message:", errorMessage);

    // Check for error in URL (from backend redirect)
    if (errorParam) {
      console.error("Auth error detected:", errorParam, errorMessage);
      
      let errorTitle = "Authentication Error";
      let errorDesc = errorMessage || "Something went wrong during authentication.";
      
      if (errorParam === "domain_not_allowed") {
        errorTitle = "Access Restricted";
        errorDesc = errorMessage || "Your email domain is not authorized to access this system.";
      } else if (errorParam === "google_auth_failed") {
        errorTitle = "Google Authentication Failed";
        errorDesc = errorMessage || "Unable to authenticate with Google. Please try again.";
      } else if (errorParam === "microsoft_auth_failed") {
        errorTitle = "Microsoft Authentication Failed";
        errorDesc = errorMessage || "Unable to authenticate with Microsoft. Please try again.";
      } else if (errorParam === "no_email") {
        errorTitle = "Email Not Found";
        errorDesc = "Could not retrieve your email from the authentication provider.";
      }
      
      setError(errorTitle);
      setErrorDetails(errorDesc);
      
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 5000);
      return;
    }

    if (!token) {
      console.error("No token found in URL");
      setError("No authentication token received");
      setErrorDetails("Please try logging in again.");
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
        const response = await fetch('/api/auth/me', {
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
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to fetch user data:", response.status, errorData);
          
          // Check if error is due to domain restriction
          if (response.status === 403 && errorData.message) {
            setError("Access Restricted");
            setErrorDetails(errorData.message);
          } else {
            setError(`Authentication Failed (${response.status})`);
            setErrorDetails(errorData.error || "Failed to fetch user data. Please try again.");
          }
          
          localStorage.removeItem("token");
          setTimeout(() => {
            navigate("/login");
          }, 5000);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Network Error");
        setErrorDetails("Please check your internet connection and try again.");
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
          fontSize: "64px",
          marginBottom: "20px"
        }}>
          {error === "Access Restricted" ? "🔒" : "⚠️"}
        </div>
        <h2 style={{
          fontSize: "28px",
          fontWeight: "600",
          marginBottom: "12px",
          color: error === "Access Restricted" ? "#f87171" : "#e0e0e8"
        }}>{error}</h2>
        <p style={{ color: "#a0a0b0", marginBottom: "20px", maxWidth: "400px" }}>
          {errorDetails}
        </p>
        
        {error === "Access Restricted" && (
          <div style={{
            background: "rgba(102, 126, 234, 0.1)",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "24px",
            maxWidth: "400px",
            textAlign: "left"
          }}>
            <p style={{
              fontSize: "14px",
              color: "#a0a0b0",
              margin: 0
            }}>
              💡 Please contact your system administrator if you believe you should have access.
            </p>
          </div>
        )}
        
        <p style={{ fontSize: "12px", color: "#6b7280" }}>
          Redirecting to login page...
        </p>
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
      <h2 style={{ marginTop: "20px", fontWeight: "500" }}>Signing you in...</h2>
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