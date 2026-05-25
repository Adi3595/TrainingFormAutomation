// LoginPage.js - Futuristic Dark Theme with Working Microsoft Login
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

function LoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    password: "",
    confirmPassword: ""
  });
  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [triangles, setTriangles] = useState([]);

  const features = [
    { icon: "🎯", title: "Smart Training Management", desc: "Automated batch creation and employee assignment" },
    { icon: "📊", title: "Real-time Analytics", desc: "Live tracking of training progress and feedback" },
    { icon: "🔐", title: "Enterprise Security", desc: "Bank-grade encryption and secure authentication" },
    { icon: "🤖", title: "AI-Powered Insights", desc: "Intelligent recommendations for training optimization" },
    { icon: "📱", title: "Mobile Ready", desc: "Access your dashboard from anywhere, anytime" },
    { icon: "⚡", title: "Lightning Fast", desc: "Optimized performance for seamless experience" }
  ];

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  // Create triangles on mount
  useEffect(() => {
    const triangleCount = 20;
    const newTriangles = [];
    for (let i = 0; i < triangleCount; i++) {
      newTriangles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 20 + Math.random() * 40,
        delay: Math.random() * 10,
        duration: 15 + Math.random() * 20,
        rotation: Math.random() * 360,
        opacity: 0.05 + Math.random() * 0.15
      });
    }
    setTriangles(newTriangles);
  }, []);

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [features.length]);

  // Mouse parallax effect for left side
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
  
  const handleMicrosoftLogin = () => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (token && user) {
      navigate("/dashboard", { replace: true });
      return;
    }

    setIsLoading(true);
    // Redirect to Microsoft OAuth endpoint
    window.location.href = "https://trainingformautomation.onrender.com/api/auth/microsoft";
  };

  const handleGoogleLogin = () => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (token && user) {
      navigate("/dashboard", { replace: true });
      return;
    }

    setIsLoading(true);
    window.location.href = "https://trainingformautomation.onrender.com/api/auth/google";
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (isSignUp) {
      if (!formData.name.trim()) {
        errors.name = "Full name is required";
      } else if (formData.name.length < 2) {
        errors.name = "Name must be at least 2 characters";
      }

      if (!formData.email) {
        errors.email = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        errors.email = "Email is invalid";
      }

      if (!formData.company) {
        errors.company = "Company name is required";
      }

      if (!formData.password) {
        errors.password = "Password is required";
      } else if (formData.password.length < 8) {
        errors.password = "Password must be at least 8 characters";
      }

      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }
    } else {
      if (!formData.email) {
        errors.email = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        errors.email = "Email is invalid";
      }

      if (!formData.password) {
        errors.password = "Password is required";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isSignUp
        ? "https://trainingformautomation.onrender.com/api/auth/signup"
        : "https://trainingformautomation.onrender.com/api/auth/login";

      const payload = isSignUp
        ? {
            name: formData.name,
            email: formData.email,
            company: formData.company,
            password: formData.password
          }
        : {
            email: formData.email,
            password: formData.password
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error("Authentication error:", error);
      setFormErrors({ submit: error.message || "Authentication failed" });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsSignUp(!isSignUp);
      setFormErrors({});
      setFormData({
        name: "",
        email: "",
        company: "",
        password: "",
        confirmPassword: ""
      });
      setTimeout(() => setIsAnimating(false), 300);
    }, 300);
  };

  return (
    <div className="modern-login-page">
      {/* Animated Triangles Background */}
      <div className="triangles-container">
        {triangles.map((triangle) => (
          <div
            key={triangle.id}
            className="moving-triangle"
            style={{
              left: `${triangle.x}%`,
              top: `${triangle.y}%`,
              width: `${triangle.size}px`,
              height: `${triangle.size}px`,
              animationDelay: `${triangle.delay}s`,
              animationDuration: `${triangle.duration}s`,
              opacity: triangle.opacity,
              transform: `rotate(${triangle.rotation}deg)`
            }}
          >
            <svg viewBox="0 0 100 100" className="triangle-svg">
              <polygon points="50,10 90,90 10,90" fill="currentColor" />
            </svg>
          </div>
        ))}
      </div>

      {/* Grid Background */}
      <div className="grid-background">
        <div className="grid-lines"></div>
      </div>

      {/* Content Container */}
      <div className="split-container">
        {/* Left Side - Brand & Features */}
        <div className="brand-section" style={{
          transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`
        }}>
          <div className="brand-content">
            <div className="logo-section">
              <div className="logo-icon-wrapper">
                <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h1 className="brand-title">
                HR Training
                <span className="gradient-text"> Hub</span>
              </h1>
              <p className="brand-tagline">Revolutionize your workforce training experience</p>
            </div>

            <div className="feature-showcase">
              <div className="feature-carousel">
                {features.map((feature, index) => (
                  <div 
                    key={index}
                    className={`feature-slide ${activeFeature === index ? 'active' : ''}`}
                    style={{ transform: `translateX(-${activeFeature * 100}%)` }}
                  >
                    <div className="feature-icon">{feature.icon}</div>
                    <h3>{feature.title}</h3>
                    <p>{feature.desc}</p>
                  </div>
                ))}
              </div>
              <div className="feature-dots">
                {features.map((_, index) => (
                  <button
                    key={index}
                    className={`dot ${activeFeature === index ? 'active' : ''}`}
                    onClick={() => setActiveFeature(index)}
                  />
                ))}
              </div>
            </div>

            <div className="stats-section">
              <div className="stat-item">
                <span className="stat-number">10k+</span>
                <span className="stat-label">Active Users</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-number">500+</span>
                <span className="stat-label">Companies</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-number">99.9%</span>
                <span className="stat-label">Uptime</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login/Signup Form */}
        <div className="login-section">
          <div className="login-wrapper">
            <div className={`login-form-container ${isAnimating ? 'fade-out' : 'fade-in'}`}>
              <div className="form-header">
                <div className="welcome-badge">
                  <span className="badge-text">{isSignUp ? "Join us today" : "Welcome back"}</span>
                </div>

                <h2 className="form-title">{isSignUp ? "Create an account" : "Sign in to your account"}</h2>
                <p className="form-subtitle">
                  {isSignUp 
                    ? "Start your journey with HR Training Hub" 
                    : "Access your training dashboard and manage your workforce"}
                </p>
              </div>

              <form onSubmit={handleSubmit} className={`auth-form ${isAnimating ? 'animate-out' : 'animate-in'}`}>
                {isSignUp && (
                  <>
                    <div className="input-group">
                      <label>Full Name</label>
                      <div className="input-wrapper">
                        <input
                          type="text"
                          name="name"
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={handleInputChange}
                          className={formErrors.name ? "error" : ""}
                        />
                      </div>
                      {formErrors.name && <span className="error-message">{formErrors.name}</span>}
                    </div>

                    <div className="input-group">
                      <label>Company Name</label>
                      <div className="input-wrapper">
                        <input
                          type="text"
                          name="company"
                          placeholder="Your Company Name"
                          value={formData.company}
                          onChange={handleInputChange}
                          className={formErrors.company ? "error" : ""}
                        />
                      </div>
                      {formErrors.company && <span className="error-message">{formErrors.company}</span>}
                    </div>
                  </>
                )}

                <div className="input-group">
                  <label>Email Address</label>
                  <div className="input-wrapper">
                    <input
                      type="email"
                      name="email"
                      placeholder="you@company.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={formErrors.email ? "error" : ""}
                    />
                  </div>
                  {formErrors.email && <span className="error-message">{formErrors.email}</span>}
                </div>

                <div className="input-group">
                  <label>Password</label>
                  <div className="input-wrapper password-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={formErrors.password ? "error" : ""}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                          <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {formErrors.password && <span className="error-message">{formErrors.password}</span>}
                  {formData.password && !formErrors.password && formData.password.length < 8 && (
                    <span className="password-strength weak">Password must be at least 8 characters</span>
                  )}
                </div>

                {isSignUp && (
                  <div className="input-group">
                    <label>Confirm Password</label>
                    <div className="input-wrapper password-wrapper">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className={formErrors.confirmPassword ? "error" : ""}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                            <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {formErrors.confirmPassword && <span className="error-message">{formErrors.confirmPassword}</span>}
                  </div>
                )}

                {formErrors.submit && (
                  <div className="error-message submit-error">{formErrors.submit}</div>
                )}

                <button 
                  type="submit"
                  className={`auth-submit-btn ${isLoading ? 'loading' : ''}`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="btn-spinner"></div>
                      <span>{isSignUp ? "Creating account..." : "Signing in..."}</span>
                    </>
                  ) : (
                    <>
                      <span>{isSignUp ? "Create Account" : "Sign In"}</span>
                      <svg className="arrow-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <div className="divider">
                <span className="divider-line"></span>
                <span className="divider-text">Or continue with</span>
                <span className="divider-line"></span>
              </div>

              <button 
                className={`google-auth-btn ${isLoading ? 'loading' : ''}`} 
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <svg className="google-icon" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Microsoft Login Button - Fixed with proper Microsoft logo */}
              <button 
                className={`microsoft-auth-btn ${isLoading ? 'loading' : ''}`} 
                onClick={handleMicrosoftLogin}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: 'rgba(5, 5, 10, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '500',
                  color: '#e0e0e8',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  marginTop: '12px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.background = 'rgba(10, 10, 18, 0.9)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = 'rgba(5, 5, 10, 0.8)';
                }}
              >
                <svg className="microsoft-icon" viewBox="0 0 24 24" width="20" height="20">
                  <rect x="2" y="2" width="9" height="9" fill="#F25022"/>
                  <rect x="13" y="2" width="9" height="9" fill="#7FBA00"/>
                  <rect x="2" y="13" width="9" height="9" fill="#00A4EF"/>
                  <rect x="13" y="13" width="9" height="9" fill="#FFB900"/>
                </svg>
                <span>Continue with Microsoft</span>
              </button>

              <div className="auth-toggle">
                <p>
                  {isSignUp ? "Already have an account?" : "Don't have an account?"}
                  <button 
                    type="button"
                    className="toggle-btn"
                    onClick={toggleMode}
                  >
                    {isSignUp ? "Sign In" : "Sign Up"}
                  </button>
                </p>
              </div>

              <div className="security-badges">
                <div className="security-item">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M2.166 4.999a11.954 11.954 0 004.626-1.492 1.5 1.5 0 011.416 0 11.957 11.957 0 004.626 1.492 1.5 1.5 0 011.416 0c.51.256 1.024.495 1.543.72a1.5 1.5 0 01.707 1.999 10.14 10.14 0 00-2.5 5.224 8.926 8.926 0 01-6.076 3.322 1.5 1.5 0 01-.832 0 8.926 8.926 0 01-6.076-3.322 10.14 10.14 0 00-2.5-5.224 1.5 1.5 0 01.707-2 20.13 20.13 0 001.543-.72 1.5 1.5 0 011.416 0z" clipRule="evenodd" />
                  </svg>
                  <span>Enterprise Grade Security</span>
                </div>
                <div className="security-item">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>GDPR Compliant</span>
                </div>
                <div className="security-item">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                  <span>Lightning Fast Performance</span>
                </div>
              </div>

              <div className="testimonial">
                <div className="testimonial-quote">"</div>
                <p>Trusted by HR teams worldwide for seamless training management and employee development</p>
                <div className="testimonial-author">
                  <div className="author-avatar"></div>
                  <div className="author-info">
                    <strong>Sarah Johnson</strong>
                    <span>HR Director, TechCorp</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;