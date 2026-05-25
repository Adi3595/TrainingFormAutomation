// Dashboard.js - Updated with Update Records tab
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CreateTrainingWithAssignment from "../components/CreateTrainingWithAssignment";
import TrainingReport from "../components/TrainingReport";
import AdminUpload from "../components/AdminUpload";
import UpdatePage from "../components/UpdatePage";
import API from "../services/api";
import "./Dashboard.css";

function Dashboard() {
  const [activeTab, setActiveTab] = useState("training");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState({
    name: "",
    role: "",
    email: "",
    avatar: null,
    isAuthenticated: false
  });
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await API.get("/api/auth/me");
        if (response.data && response.data.user) {
          setUser({
            name: response.data.user.name || "User",
            role: response.data.user.role || "HR Manager",
            email: response.data.user.email || "",
            avatar: response.data.user.avatar || null,
            isAuthenticated: true
          });
        } else {
          navigate("/login");
        }
      } catch (error) {
        console.error("Authentication check failed:", error);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  // Function to add notifications
  const addNotification = (message, type = "info") => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Logout function
  const handleLogout = async () => {
    try {
      await API.post("/api/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  };

  // Pass notification function to child components
  const componentsWithNotification = (Component, props = {}) => {
    return <Component {...props} onNotification={addNotification} />;
  };

  // Updated tabs with Update Records
  const tabs = [
    { id: "upload", label: "Upload Data", icon: "📂", component: AdminUpload, roles: ["admin", "hr_manager"], description: "Upload CSV files to populate your database" },
    { id: "training", label: "Training", icon: "📚", component: CreateTrainingWithAssignment, roles: ["admin", "hr_manager"], description: "Create training programs and assign employees directly" },
    { id: "update", label: "Update Records", icon: "✏️", component: UpdatePage, roles: ["admin", "hr_manager"], description: "Edit existing employees, managers, and training programs" },
    { id: "report", label: "Reports", icon: "📊", component: TrainingReport, roles: ["admin", "hr_manager", "viewer"], description: "View detailed training reports and analytics" }
  ];

  // Filter tabs based on user role
  const accessibleTabs = tabs.filter(tab => 
    !tab.roles || tab.roles.includes(user.role?.toLowerCase())
  );

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const ActiveComponent = accessibleTabs.find(tab => tab.id === activeTab)?.component;
  const currentTabDescription = accessibleTabs.find(tab => tab.id === activeTab)?.description || "";

  // If still loading, show loading spinner
  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // If not authenticated, don't render dashboard
  if (!user.isAuthenticated) {
    return null;
  }

  return (
    <div className={`dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {!sidebarCollapsed && <span>HR Training Hub</span>}
          </div>
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {accessibleTabs.map(tab => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="nav-icon">{tab.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{tab.label}</span>}
              {!sidebarCollapsed && activeTab === tab.id && (
                <span className="nav-indicator"></span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                <span>{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="user-details">
                <span className="user-name">{user.name}</span>
                <span className="user-role">{user.role}</span>
                <span className="user-email">{user.email}</span>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button className="logout-button" onClick={handleLogout}>
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              Logout
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Bar */}
        <header className="dashboard-header">
          <div className="header-left">
            <h1>{accessibleTabs.find(tab => tab.id === activeTab)?.label || "Dashboard"}</h1>
            <p className="header-description">{currentTabDescription}</p>
          </div>
          
          <div className="header-right">
            {/* Quick Actions */}
            <div className="quick-actions">
              <button className="action-btn" title="Refresh Data" onClick={() => window.location.reload()}>
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </button>
              <button className="action-btn" title="Help">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3 3 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="notifications-container">
            {notifications.map(notification => (
              <div key={notification.id} className={`notification notification-${notification.type}`}>
                <div className="notification-icon">
                  {notification.type === 'success' && '✓'}
                  {notification.type === 'error' && '✗'}
                  {notification.type === 'info' && 'ℹ'}
                </div>
                <div className="notification-message">{notification.message}</div>
                <button className="notification-close" onClick={() => removeNotification(notification.id)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div className="dashboard-content">
          {ActiveComponent && componentsWithNotification(ActiveComponent)}
        </div>

        {/* Footer */}
        <footer className="dashboard-footer">
          <div className="footer-content">
            <p>&copy; 2024 HR Training Management System. All rights reserved.</p>
            <div className="footer-links">
              <button onClick={() => alert("Coming soon")}>Privacy Policy</button>
              <button onClick={() => alert("Coming soon")}>Terms of Service</button>
              <button onClick={() => alert("Coming soon")}>Support</button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default Dashboard;