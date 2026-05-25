// AuthError.js - Dark Futuristic Theme with Floating Animations
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function AuthError() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const [floatingElements, setFloatingElements] = useState([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [glowIntensity, setGlowIntensity] = useState(0);

  // Create floating squares/particles on mount
  useEffect(() => {
    const elements = [];
    const shapes = ["square", "circle", "triangle", "diamond"];
    const colors = ["#667eea", "#764ba2", "#f093fb", "#4facfe", "#00f2fe", "#fa709a", "#fee140", "#30cfd0", "#a8edea", "#fed6e3"];
    
    for (let i = 0; i < 60; i++) {
      elements.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 15 + Math.random() * 80,
        delay: Math.random() * 20,
        duration: 12 + Math.random() * 25,
        rotation: Math.random() * 360,
        opacity: 0.02 + Math.random() * 0.08,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        speed: 0.5 + Math.random() * 1.5
      });
    }
    setFloatingElements(elements);
  }, []);

  // Mouse parallax effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      });
      setGlowIntensity(Math.sqrt(
        Math.pow(e.clientX / window.innerWidth - 0.5, 2) + 
        Math.pow(e.clientY / window.innerHeight - 0.5, 2)
      ));
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Glow animation interval
  useEffect(() => {
    const interval = setInterval(() => {
      setGlowIntensity(prev => 0.3 + Math.sin(Date.now() / 1000) * 0.2);
    }, 100);
    return () => clearInterval(interval);
  }, []);

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

  // Get shape SVG
  const getShapeSVG = (shape, color) => {
    switch(shape) {
      case "square":
        return <rect x="0" y="0" width="100" height="100" fill="none" stroke={color} strokeWidth="1" opacity="0.3"/>;
      case "circle":
        return <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="1" opacity="0.3"/>;
      case "triangle":
        return <polygon points="50,5 95,90 5,90" fill="none" stroke={color} strokeWidth="1" opacity="0.3"/>;
      case "diamond":
        return <polygon points="50,5 95,50 50,95 5,50" fill="none" stroke={color} strokeWidth="1" opacity="0.3"/>;
      default:
        return <rect x="0" y="0" width="100" height="100" fill="none" stroke={color} strokeWidth="1" opacity="0.3"/>;
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(ellipse at 20% 30%, #0d0d1a 0%, #05050a 70%, #000000 100%)",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      padding: "20px",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Animated Gradient Orbs */}
      <div style={{
        position: "absolute",
        top: "10%",
        left: "10%",
        width: "50%",
        height: "50%",
        background: "radial-gradient(circle, rgba(102, 126, 234, 0.15) 0%, transparent 70%)",
        animation: "pulse 8s ease-in-out infinite",
        pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute",
        bottom: "10%",
        right: "10%",
        width: "40%",
        height: "40%",
        background: "radial-gradient(circle, rgba(118, 75, 162, 0.15) 0%, transparent 70%)",
        animation: "pulse 6s ease-in-out infinite reverse",
        pointerEvents: "none"
      }} />

      {/* Floating Shapes/Particles */}
      {floatingElements.map((el) => (
        <div
          key={el.id}
          style={{
            position: "absolute",
            left: `${el.x}%`,
            top: `${el.y}%`,
            width: `${el.size}px`,
            height: `${el.size}px`,
            animation: `float ${el.duration}s ease-in-out infinite`,
            animationDelay: `${el.delay}s`,
            transform: `rotate(${el.rotation}deg) translate(${mousePosition.x * el.speed}px, ${mousePosition.y * el.speed}px)`,
            pointerEvents: "none",
            zIndex: 0,
            opacity: el.opacity
          }}
        >
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            {getShapeSVG(el.shape, el.color)}
          </svg>
        </div>
      ))}

      {/* Grid Background */}
      <svg style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        opacity: 0.03,
        pointerEvents: "none",
        zIndex: 0
      }}>
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
            <circle cx="0" cy="0" r="1.5" fill="rgba(255,255,255,0.3)"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Scanning Line Effect */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "2px",
        background: "linear-gradient(90deg, transparent, #667eea, #764ba2, #667eea, transparent)",
        animation: "scan 4s linear infinite",
        opacity: 0.5,
        pointerEvents: "none"
      }} />

      {/* Main Card */}
      <div style={{
        maxWidth: "550px",
        width: "100%",
        background: "rgba(10, 10, 18, 0.85)",
        backdropFilter: "blur(20px)",
        borderRadius: "32px",
        border: "1px solid rgba(102, 126, 234, 0.2)",
        padding: "48px 40px",
        textAlign: "center",
        boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(102, 126, 234, 0.1), 0 0 30px rgba(102, 126, 234, ${0.05 + glowIntensity * 0.05})`,
        position: "relative",
        zIndex: 10,
        animation: "fadeInUp 0.6s ease-out",
        transform: `translate(${mousePosition.x * 0.1}px, ${mousePosition.y * 0.1}px)`
      }}>
        {/* Glow Effect on Card */}
        <div style={{
          position: "absolute",
          top: -1,
          left: -1,
          right: -1,
          bottom: -1,
          background: "linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.05))",
          borderRadius: "32px",
          zIndex: -1,
          filter: "blur(10px)"
        }} />

        {/* Icon with Pulse Animation */}
        <div style={{
          fontSize: "80px",
          marginBottom: "24px",
          display: "inline-block",
          animation: "bounce 1s ease-in-out infinite",
          filter: error === "Access Restricted" 
            ? "drop-shadow(0 0 20px rgba(220, 53, 69, 0.5))" 
            : "drop-shadow(0 0 20px rgba(102, 126, 234, 0.5))"
        }}>
          {error === "Access Restricted" ? "🔒" : "⚠️"}
        </div>
        
        <h1 style={{
          fontSize: "32px",
          fontWeight: "700",
          background: "linear-gradient(135deg, #fff, #a0a0b0)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          marginBottom: "16px",
          letterSpacing: "-0.5px"
        }}>
          {error}
        </h1>
        
        <p style={{
          fontSize: "16px",
          color: "#a0a0b0",
          marginBottom: "28px",
          lineHeight: "1.6"
        }}>
          {errorDetails}
        </p>
        
        {error === "Access Restricted" && (
          <div style={{
            background: "rgba(102, 126, 234, 0.08)",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "28px",
            textAlign: "left",
            border: "1px solid rgba(102, 126, 234, 0.15)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <span style={{ fontSize: "24px" }}>💡</span>
              <p style={{ fontSize: "14px", color: "#c0c0d0", margin: 0, fontWeight: "500" }}>
                What does this mean?
              </p>
            </div>
            <p style={{
              fontSize: "14px",
              color: "#a0a0b0",
              margin: "0 0 12px 36px",
              lineHeight: "1.5"
            }}>
              This system is restricted to specific email domains only. 
              Your email domain is not on the approved list.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <span style={{ fontSize: "24px" }}>🔧</span>
              <p style={{ fontSize: "14px", color: "#c0c0d0", margin: 0, fontWeight: "500" }}>
                What can you do?
              </p>
            </div>
            <p style={{
              fontSize: "14px",
              color: "#a0a0b0",
              margin: "0 0 0 36px",
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
            height: "4px",
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "2px",
            overflow: "hidden"
          }}>
            <div style={{
              width: `${(countdown / 5) * 100}%`,
              height: "100%",
              background: "linear-gradient(90deg, #667eea, #764ba2)",
              borderRadius: "2px",
              transition: "width 0.5s linear",
              animation: "pulseGlow 1s ease-in-out infinite"
            }} />
          </div>
          <p style={{
            fontSize: "13px",
            color: "#6b7280",
            marginTop: "12px"
          }}>
            Redirecting to login page in <span style={{ color: "#667eea", fontWeight: "600" }}>{countdown}</span> seconds...
          </p>
        </div>
        
        <button
          onClick={() => navigate("/login", { replace: true })}
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            border: "none",
            borderRadius: "14px",
            padding: "14px 28px",
            fontSize: "16px",
            fontWeight: "600",
            color: "white",
            cursor: "pointer",
            transition: "all 0.3s ease",
            width: "100%",
            position: "relative",
            overflow: "hidden"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 10px 25px -5px rgba(102, 126, 234, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <span style={{ position: "relative", zIndex: 1 }}>Return to Login</span>
          <div style={{
            position: "absolute",
            top: 0,
            left: "-100%",
            width: "100%",
            height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
            transition: "left 0.5s ease"
          }}
          onMouseEnter={(e) => e.currentTarget.style.left = "100%"}
          onMouseLeave={(e) => e.currentTarget.style.left = "-100%"} />
        </button>

        {/* Footer Text */}
        <p style={{
          fontSize: "12px",
          color: "#4a4a5a",
          marginTop: "24px",
          letterSpacing: "0.3px"
        }}>
          HR Training Management System • Secure Authentication
        </p>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-30px) rotate(10deg);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.1);
          }
        }
        
        @keyframes scan {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
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
        
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        @keyframes pulseGlow {
          0%, 100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default AuthError;