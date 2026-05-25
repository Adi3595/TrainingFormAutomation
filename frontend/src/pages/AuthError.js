// AuthError.js - Full Screen Dark Monochrome Theme with Grid Background
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
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0a0a0a",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      padding: "20px",
      overflow: "auto"
    }}>
      
      {/* Black Squared Tiles Background */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        backgroundImage: `
          linear-gradient(to right, #1a1a1a 1px, transparent 1px),
          linear-gradient(to bottom, #1a1a1a 1px, transparent 1px)
        `,
        backgroundSize: "50px 50px",
        zIndex: 0
      }} />

      {/* Dark Gradient Overlay */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%)",
        zIndex: 1
      }} />

      {/* Main Card - Full Width Content */}
      <div style={{
        maxWidth: "600px",
        width: "90%",
        background: "rgba(5, 5, 5, 0.95)",
        borderRadius: "0px",
        border: "1px solid #2a2a2a",
        padding: "60px 48px",
        textAlign: "center",
        position: "relative",
        zIndex: 2,
        animation: "fadeInUp 0.6s ease-out"
      }}>
        
        {/* Icon */}
        <div style={{
          fontSize: "80px",
          marginBottom: "24px",
          display: "inline-block",
          opacity: 0.9
        }}>
          {error === "Access Restricted" ? "🔒" : "⚠️"}
        </div>
        
        <h1 style={{
          fontSize: "32px",
          fontWeight: "700",
          color: "#e0e0e0",
          marginBottom: "16px",
          letterSpacing: "-0.5px"
        }}>
          {error}
        </h1>
        
        <p style={{
          fontSize: "16px",
          color: "#a0a0a0",
          marginBottom: "28px",
          lineHeight: "1.6"
        }}>
          {errorDetails}
        </p>
        
        {error === "Access Restricted" && (
          <div style={{
            background: "rgba(30, 30, 30, 0.5)",
            padding: "20px",
            marginBottom: "28px",
            textAlign: "left",
            border: "1px solid #2a2a2a"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <span style={{ fontSize: "20px" }}>📌</span>
              <p style={{ fontSize: "14px", color: "#c0c0c0", margin: 0, fontWeight: "500" }}>
                Access Information
              </p>
            </div>
            <p style={{
              fontSize: "14px",
              color: "#888888",
              margin: "0 0 12px 32px",
              lineHeight: "1.5"
            }}>
              This system is restricted to specific email domains only. 
              Your email domain is not on the approved list.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <span style={{ fontSize: "20px" }}>⚙️</span>
              <p style={{ fontSize: "14px", color: "#c0c0c0", margin: 0, fontWeight: "500" }}>
                Next Steps
              </p>
            </div>
            <p style={{
              fontSize: "14px",
              color: "#888888",
              margin: "0 0 0 32px",
              lineHeight: "1.5"
            }}>
              Contact your system administrator to request access or use an approved email address.
            </p>
          </div>
        )}

        {/* Countdown Progress Bar */}
        <div style={{
          marginBottom: "32px",
          position: "relative"
        }}>
          <div style={{
            height: "3px",
            background: "#1a1a1a",
            overflow: "hidden"
          }}>
            <div style={{
              width: `${(countdown / 5) * 100}%`,
              height: "100%",
              background: "#666666",
              transition: "width 0.5s linear"
            }} />
          </div>
          <p style={{
            fontSize: "13px",
            color: "#666666",
            marginTop: "12px"
          }}>
            Redirecting to login page in <span style={{ color: "#aaaaaa", fontWeight: "600" }}>{countdown}</span> seconds...
          </p>
        </div>
        
        <button
          onClick={() => navigate("/login", { replace: true })}
          style={{
            background: "#1a1a1a",
            border: "1px solid #333333",
            borderRadius: "0px",
            padding: "14px 28px",
            fontSize: "16px",
            fontWeight: "600",
            color: "#e0e0e0",
            cursor: "pointer",
            transition: "all 0.3s ease",
            width: "100%"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#222222";
            e.currentTarget.style.borderColor = "#555555";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#1a1a1a";
            e.currentTarget.style.borderColor = "#333333";
          }}
        >
          Return to Login
        </button>

        {/* Footer Text */}
        <p style={{
          fontSize: "11px",
          color: "#444444",
          marginTop: "24px",
          letterSpacing: "0.3px"
        }}>
          HR TRAINING MANAGEMENT SYSTEM
        </p>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default AuthError;