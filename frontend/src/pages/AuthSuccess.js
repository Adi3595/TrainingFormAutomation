// AuthSuccess.js - Full Screen Dark Futuristic Theme with Floating Animations
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function AuthSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [floatingElements, setFloatingElements] = useState([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Create floating squares/particles on mount
  useEffect(() => {
    const elements = [];
    const shapes = ["square", "circle", "triangle", "diamond"];
    const colors = ["#667eea", "#764ba2", "#4facfe", "#00f2fe", "#30cfd0", "#a8edea", "#f093fb", "#fa709a"];
    
    for (let i = 0; i < 80; i++) {
      elements.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 10 + Math.random() * 60,
        delay: Math.random() * 20,
        duration: 8 + Math.random() * 25,
        rotation: Math.random() * 360,
        opacity: 0.02 + Math.random() * 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        speed: 0.3 + Math.random() * 1.5
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
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
          
          setTimeout(() => {
            console.log("Redirecting to dashboard...");
            navigate("/dashboard", { replace: true });
          }, 500);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to fetch user data:", response.status, errorData);
          
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

  // Get shape SVG
  const getShapeSVG = (shape, color) => {
    switch(shape) {
      case "square":
        return <rect x="0" y="0" width="100" height="100" fill="none" stroke={color} strokeWidth="1" opacity="0.25"/>;
      case "circle":
        return <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="1" opacity="0.25"/>;
      case "triangle":
        return <polygon points="50,5 95,90 5,90" fill="none" stroke={color} strokeWidth="1" opacity="0.25"/>;
      case "diamond":
        return <polygon points="50,5 95,50 50,95 5,50" fill="none" stroke={color} strokeWidth="1" opacity="0.25"/>;
      default:
        return <rect x="0" y="0" width="100" height="100" fill="none" stroke={color} strokeWidth="1" opacity="0.25"/>;
    }
  };

  if (error) {
    return (
      <div style={{
        minHeight: "100vh",
        width: "100%",
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
          background: "radial-gradient(circle, rgba(220, 53, 69, 0.12) 0%, transparent 70%)",
          animation: "pulse 8s ease-in-out infinite",
          pointerEvents: "none"
        }} />
        <div style={{
          position: "absolute",
          bottom: "10%",
          right: "10%",
          width: "40%",
          height: "40%",
          background: "radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%)",
          animation: "pulse 6s ease-in-out infinite reverse",
          pointerEvents: "none"
        }} />

        {/* Floating Shapes */}
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
          opacity: 0.04,
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
          background: "linear-gradient(90deg, transparent, #dc3545, #c82333, #dc3545, transparent)",
          animation: "scan 4s linear infinite",
          opacity: 0.5,
          pointerEvents: "none"
        }} />

        {/* Main Card */}
        <div style={{
          maxWidth: "500px",
          width: "100%",
          background: "rgba(10, 10, 18, 0.85)",
          backdropFilter: "blur(20px)",
          borderRadius: "32px",
          border: "1px solid rgba(220, 53, 69, 0.25)",
          padding: "48px 40px",
          textAlign: "center",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(220, 53, 69, 0.1), 0 0 30px rgba(220, 53, 69, 0.1)",
          position: "relative",
          zIndex: 10,
          animation: "fadeInUp 0.6s ease-out",
          transform: `translate(${mousePosition.x * 0.1}px, ${mousePosition.y * 0.1}px)`
        }}>
          <div style={{
            position: "absolute",
            top: -1,
            left: -1,
            right: -1,
            bottom: -1,
            background: "linear-gradient(135deg, rgba(220, 53, 69, 0.1), rgba(118, 75, 162, 0.05))",
            borderRadius: "32px",
            zIndex: -1,
            filter: "blur(10px)"
          }} />

          <div style={{
            fontSize: "80px",
            marginBottom: "24px",
            animation: "shake 0.5s ease-in-out",
            filter: "drop-shadow(0 0 20px rgba(220, 53, 69, 0.4))"
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
              background: "rgba(220, 53, 69, 0.08)",
              borderRadius: "16px",
              padding: "20px",
              marginBottom: "28px",
              textAlign: "left",
              border: "1px solid rgba(220, 53, 69, 0.15)"
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
          
          {/* Progress Bar for redirect */}
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
                width: "100%",
                height: "100%",
                background: "linear-gradient(90deg, #dc3545, #c82333)",
                borderRadius: "2px",
                animation: "progressShrink 5s linear forwards"
              }} />
            </div>
          </div>
          
          <button
            onClick={() => navigate("/login", { replace: true })}
            style={{
              background: "linear-gradient(135deg, #dc3545, #c82333)",
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
              e.currentTarget.style.boxShadow = "0 10px 25px -5px rgba(220, 53, 69, 0.4)";
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
          
          <p style={{
            fontSize: "12px",
            color: "#4a4a5a",
            marginTop: "24px",
            letterSpacing: "0.3px"
          }}>
            HR Training Management System • Secure Authentication
          </p>
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-30px) rotate(10deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.1); }
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
          }
          @keyframes scan {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          @keyframes progressShrink {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>
      </div>
    );
  }

  // Success state - loading animation
  return (
    <div style={{
      minHeight: "100vh",
      width: "100%",
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
        top: "20%",
        left: "15%",
        width: "45%",
        height: "45%",
        background: "radial-gradient(circle, rgba(102, 126, 234, 0.15) 0%, transparent 70%)",
        animation: "pulse 6s ease-in-out infinite",
        pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute",
        bottom: "20%",
        right: "15%",
        width: "40%",
        height: "40%",
        background: "radial-gradient(circle, rgba(118, 75, 162, 0.15) 0%, transparent 70%)",
        animation: "pulse 8s ease-in-out infinite reverse",
        pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: "60%",
        height: "60%",
        transform: "translate(-50%, -50%)",
        background: "radial-gradient(circle, rgba(0, 255, 255, 0.05) 0%, transparent 70%)",
        animation: "pulse 10s ease-in-out infinite",
        pointerEvents: "none"
      }} />

      {/* Floating Shapes */}
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
        opacity: 0.05,
        pointerEvents: "none",
        zIndex: 0
      }}>
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="white" strokeWidth="0.5"/>
            <circle cx="0" cy="0" r="1.5" fill="rgba(255,255,255,0.4)"/>
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
        animation: "scan 3s linear infinite",
        opacity: 0.6,
        pointerEvents: "none"
      }} />

      {/* Main Card */}
      <div style={{
        maxWidth: "480px",
        width: "100%",
        background: "rgba(10, 10, 18, 0.85)",
        backdropFilter: "blur(20px)",
        borderRadius: "32px",
        border: "1px solid rgba(102, 126, 234, 0.25)",
        padding: "56px 48px",
        textAlign: "center",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(102, 126, 234, 0.1), 0 0 30px rgba(102, 126, 234, 0.1)",
        position: "relative",
        zIndex: 10,
        animation: "fadeInUp 0.6s ease-out",
        transform: `translate(${mousePosition.x * 0.1}px, ${mousePosition.y * 0.1}px)`
      }}>
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

        {/* Animated Spinner */}
        <div style={{
          width: "70px",
          height: "70px",
          margin: "0 auto 28px",
          position: "relative"
        }}>
          {/* Outer ring */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: "3px solid rgba(102, 126, 234, 0.15)",
            borderRadius: "50%",
            borderTopColor: "#667eea",
            animation: "spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite"
          }} />
          {/* Middle ring */}
          <div style={{
            position: "absolute",
            top: 10,
            left: 10,
            right: 10,
            bottom: 10,
            border: "2px solid rgba(118, 75, 162, 0.15)",
            borderRadius: "50%",
            borderTopColor: "#764ba2",
            animation: "spin 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite reverse"
          }} />
          {/* Inner ring */}
          <div style={{
            position: "absolute",
            top: 20,
            left: 20,
            right: 20,
            bottom: 20,
            border: "2px solid rgba(79, 172, 254, 0.15)",
            borderRadius: "50%",
            borderTopColor: "#4facfe",
            animation: "spin 2s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite"
          }} />
          {/* Center pulse */}
          <div style={{
            position: "absolute",
            top: 28,
            left: 28,
            right: 28,
            bottom: 28,
            background: "radial-gradient(circle, #667eea, #764ba2)",
            borderRadius: "50%",
            animation: "pulseGlow 1.5s ease-in-out infinite"
          }} />
        </div>
        
        <h2 style={{
          fontSize: "28px",
          fontWeight: "700",
          background: "linear-gradient(135deg, #fff, #a0a0b0)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          marginBottom: "12px",
          letterSpacing: "-0.5px"
        }}>
          Signing you in...
        </h2>
        
        <p style={{
          fontSize: "15px",
          color: "#a0a0b0",
          lineHeight: "1.6",
          marginBottom: "24px"
        }}>
          Please wait while we redirect you to your dashboard
        </p>

        {/* Loading dots animation */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "10px"
        }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#667eea",
                animation: `bounce 1.4s ease-in-out infinite ${i * 0.2}s`
              }}
            />
          ))}
        </div>

        {/* Footer text */}
        <p style={{
          fontSize: "11px",
          color: "#4a4a5a",
          marginTop: "32px",
          letterSpacing: "0.3px"
        }}>
          HR Training Management System
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(10deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default AuthSuccess;