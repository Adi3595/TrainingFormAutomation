// AuthError.js - Standalone error page for domain restrictions
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function AuthError() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const errorType = params.get("error");
    const errorMessage = params.get("message");

    console.log("AuthError page loaded:", { errorType, errorMessage });

    let errorTitle = "Authentication Error";
    let errorDesc = errorMessage || "Something went wrong during authentication.";

    switch (errorType) {
      case "domain_not_allowed":
        errorTitle = "Access Restricted";
        errorDesc = errorMessage || "Your email domain is not authorized to access this system.";
        break;
      case "google_auth_failed":
        errorTitle = "Google Authentication Failed";
        errorDesc = errorMessage || "Unable to authenticate with Google. Please try again.";
        break;
      case "microsoft_auth_failed":
        errorTitle = "Microsoft Authentication Failed";
        errorDesc = errorMessage || "Unable to authenticate with Microsoft. Please try again.";
        break;
      case "no_email":
        errorTitle = "Email Not Found";
        errorDesc = "Could not retrieve your email from the authentication provider.";
        break;
      default:
        errorTitle = "Authentication Error";
        errorDesc = errorMessage || "Something went wrong during authentication.";
    }

    setError(errorTitle);
    setErrorDetails(errorDesc);

    // Countdown timer for redirect
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/login", { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [location, navigate]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0a0a0f 0%, #030308 100%)",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "20px"
    }}>
      <div style={{
        maxWidth: "500px",
        width: "100%",
        background: "rgba(15, 15, 25, 0.8)",
        backdropFilter: "blur(20px)",
        borderRadius: "24px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        padding: "40px",
        textAlign: "center",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
      }}>
        <div style={{
          fontSize: "64px",
          marginBottom: "20px"
        }}>
          {error === "Access Restricted" ? "🔒" : "⚠️"}
        </div>
        
        <h1 style={{
          fontSize: "28px",
          fontWeight: "600",
          color: "#e0e0e8",
          marginBottom: "12px"
        }}>
          {error}
        </h1>
        
        <p style={{
          fontSize: "16px",
          color: "#a0a0b0",
          marginBottom: "24px",
          lineHeight: "1.5"
        }}>
          {errorDetails}
        </p>
        
        {error === "Access Restricted" && (
          <div style={{
            background: "rgba(102, 126, 234, 0.1)",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "24px",
            textAlign: "left"
          }}>
            <p style={{
              fontSize: "14px",
              color: "#a0a0b0",
              margin: 0
            }}>
              💡 Please use an email address from an authorized domain to access this system.
            </p>
            <p style={{
              fontSize: "13px",
              color: "#6b7280",
              margin: "12px 0 0 0"
            }}>
              Contact your system administrator for more information.
            </p>
          </div>
        )}
        
        <button
          onClick={() => navigate("/login", { replace: true })}
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            border: "none",
            borderRadius: "12px",
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "500",
            color: "white",
            cursor: "pointer",
            transition: "transform 0.2s ease, opacity 0.2s ease"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
        >
          Return to Login
        </button>
        
        <p style={{
          fontSize: "12px",
          color: "#6b7280",
          marginTop: "24px"
        }}>
          Redirecting in {countdown} seconds...
        </p>
      </div>
    </div>
  );
}

export default AuthError;