// To use BPMN visualization, run: npm install bpmn-js
import React, { useState, useRef, useEffect } from "react";
import BpmnJS from "bpmn-js";


function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState("user");
  const [authToken, setAuthToken] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showAccessRequest, setShowAccessRequest] = useState(false);
  const [accessRequestError, setAccessRequestError] = useState("");
  const [accessRequestSuccess, setAccessRequestSuccess] = useState("");
  const [accessRequestLoading, setAccessRequestLoading] = useState(false);
  const [showAdminPopup, setShowAdminPopup] = useState(false);
  
  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState("");
  const [status, setStatus] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [s3Files, setS3Files] = useState([]);
  const [fetchingFiles, setFetchingFiles] = useState(false);
  const [jobOutputs, setJobOutputs] = useState({});
  const [shownOutputs, setShownOutputs] = useState({});
  const [resultsStructure, setResultsStructure] = useState({});
  const [allInputFiles, setAllInputFiles] = useState([]);
  const [selectedResultFile, setSelectedResultFile] = useState("");
  const [previewModal, setPreviewModal] = useState({ open: false, content: "", filename: "", loading: false });
  const [bpmnModal, setBpmnModal] = useState({ open: false, xml: "", filename: "", loading: false, applyingLayout: false });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const bpmnViewerRef = useRef(null);
  const chatEndRef = useRef(null);
  const modalClosingRef = useRef(false);
  const exitingFullscreenRef = useRef(false);
  const [bpmnViewer, setBpmnViewer] = useState(null);
  const [refreshResults, setRefreshResults] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [reprocessableFiles, setReprocessableFiles] = useState([]);
  const [reprocessingJobs, setReprocessingJobs] = useState({});
  const [showReprocessSection, setShowReprocessSection] = useState(false);
  const [fileTimestamps, setFileTimestamps] = useState({});
  const [inputFileTimestamps, setInputFileTimestamps] = useState({});

  // Professional color palette
  const colors = {
    background: "#f8fafc",
    chatBg: "#ffffff",
    border: "#e2e8f0",
    user: "#1e40af",
    userText: "#ffffff",
    assistant: "#ffffff",
    assistantText: "#1f2937",
    system: "#f1f5f9",
    systemText: "#64748b",
    inputBg: "#ffffff",
    inputFocus: "#1e40af",
    send: "#1e40af",
    sendHover: "#1d4ed8"
  };

  // Authentication functions
  const handleLogin = async (ads_id, password) => {
    setLoginLoading(true);
    setLoginError("");
    
    try {
      const response = await fetch("http://localhost:8000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ads_id, password }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setAuthToken(data.token);
        setCurrentUser(data.ads_id);
        setUserRole(data.role || "user");
        setIsAuthenticated(true);
        setShowLogin(false);
        
        // Store token in localStorage for persistence
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("currentUser", data.ads_id);
        localStorage.setItem("userRole", data.role || "user");
      } else {
        const errorData = await response.json();
        setLoginError(errorData.detail || "Login failed");
      }
    } catch (error) {
      setLoginError("Network error. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUserRole("user");
    setAuthToken(null);
    setShowLogin(true);
    
    // Clear localStorage
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("userRole");
  };

  // Access request function
  const handleAccessRequest = async (ads_id, password) => {
    setAccessRequestLoading(true);
    setAccessRequestError("");
    setAccessRequestSuccess("");
    
    try {
      const response = await fetch("http://localhost:8000/auth/request-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ads_id, password }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setAccessRequestSuccess(data.message);
        setShowAccessRequest(false);
        setShowLogin(true);
      } else {
        const errorData = await response.json();
        setAccessRequestError(errorData.detail || "Failed to submit access request");
      }
    } catch (error) {
      setAccessRequestError("Network error. Please try again.");
    } finally {
      setAccessRequestLoading(false);
    }
  };

  // Check authentication status on mount
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const user = localStorage.getItem("currentUser");
    const role = localStorage.getItem("userRole");
    
    if (token && user) {
      // Verify token is still valid
      fetch("http://localhost:8000/auth/status", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error("Invalid token");
        }
      })
      .then(data => {
        setIsAuthenticated(true);
        setCurrentUser(data.ads_id);
        setUserRole(data.role || role || "user");
        setAuthToken(token);
        setShowLogin(false);
      })
      .catch(() => {
        // Token is invalid, clear storage
        localStorage.removeItem("authToken");
        localStorage.removeItem("currentUser");
        localStorage.removeItem("userRole");
      });
    }
  }, []);

  // Helper function to add auth headers to requests
  const getAuthHeaders = () => {
    return {
      "Authorization": `Bearer ${authToken}`,
    };
  };

  // Login Component
  const LoginForm = () => {
    const [ads_id, setAdsId] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e) => {
      e.preventDefault();
      handleLogin(ads_id, password);
    };

    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}>
        <div style={{
          background: "white",
          padding: "40px",
          borderRadius: "16px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
          width: "100%",
          maxWidth: "400px",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: "32px",
            fontWeight: "700",
            color: "#1f2937",
            marginBottom: "8px"
          }}>
            🔐 BPMN Generator
          </div>
          <div style={{
            fontSize: "16px",
            color: "#6b7280",
            marginBottom: "32px"
          }}>
            Secure Access Required
          </div>
          
          <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "8px"
              }}>
                ADS ID
              </label>
              <input
                type="text"
                value={ads_id}
                onChange={(e) => setAdsId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "16px",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                required
              />
            </div>
            
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "8px"
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "16px",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                required
              />
            </div>
            
            {loginError && (
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "14px",
                marginBottom: "20px"
              }}>
                {loginError}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loginLoading}
              style={{
                width: "100%",
                padding: "14px",
                background: loginLoading ? "#9ca3af" : "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: loginLoading ? "not-allowed" : "pointer",
                transition: "background-color 0.2s"
              }}
              onMouseEnter={(e) => !loginLoading && (e.target.style.background = "#2563eb")}
              onMouseLeave={(e) => !loginLoading && (e.target.style.background = "#3b82f6")}
            >
              {loginLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          
          <div style={{
            marginTop: "24px",
            fontSize: "14px",
            color: "#6b7280"
          }}>
            <div style={{ marginBottom: "8px" }}>Enter your ADS ID and password to access the system.</div>
            <div style={{ 
              marginTop: "16px", 
              paddingTop: "16px", 
              borderTop: "1px solid #e5e7eb",
              textAlign: "center"
            }}>
              <button
                type="button"
                onClick={() => setShowAccessRequest(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#3b82f6",
                  fontSize: "14px",
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontWeight: "500"
                }}
                onMouseEnter={(e) => e.target.style.color = "#2563eb"}
                onMouseLeave={(e) => e.target.style.color = "#3b82f6"}
              >
                Don't have access? Request it here
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Access Request Form Component
  const AccessRequestForm = () => {
    const [ads_id, setAdsId] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e) => {
      e.preventDefault();
      handleAccessRequest(ads_id, password);
    };

    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}>
        <div style={{
          background: "white",
          padding: "40px",
          borderRadius: "16px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
          width: "100%",
          maxWidth: "400px",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: "32px",
            fontWeight: "700",
            color: "#1f2937",
            marginBottom: "8px"
          }}>
            📝 Access Request
          </div>
          <div style={{
            fontSize: "16px",
            color: "#6b7280",
            marginBottom: "32px"
          }}>
            Request access to BPMN Generator
          </div>
          
          <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "8px"
              }}>
                ADS ID
              </label>
              <input
                type="text"
                value={ads_id}
                onChange={(e) => setAdsId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "16px",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                required
              />
            </div>
            
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "8px"
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "16px",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                required
              />
            </div>
            
            {accessRequestError && (
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "14px",
                marginBottom: "20px"
              }}>
                {accessRequestError}
              </div>
            )}
            
            {accessRequestSuccess && (
              <div style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#16a34a",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "14px",
                marginBottom: "20px"
              }}>
                {accessRequestSuccess}
              </div>
            )}
            
            <button
              type="submit"
              disabled={accessRequestLoading}
              style={{
                width: "100%",
                padding: "14px",
                background: accessRequestLoading ? "#9ca3af" : "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: accessRequestLoading ? "not-allowed" : "pointer",
                transition: "background-color 0.2s"
              }}
              onMouseEnter={(e) => !accessRequestLoading && (e.target.style.background = "#2563eb")}
              onMouseLeave={(e) => !accessRequestLoading && (e.target.style.background = "#3b82f6")}
            >
              {accessRequestLoading ? "Submitting..." : "Submit Request"}
            </button>
          </form>
          
          <div style={{
            marginTop: "24px",
            fontSize: "14px",
            color: "#6b7280"
          }}>
            <div style={{ marginBottom: "8px" }}>Your request will be reviewed by an administrator.</div>
            <div style={{ 
              marginTop: "16px", 
              paddingTop: "16px", 
              borderTop: "1px solid #e5e7eb",
              textAlign: "center"
            }}>
              <button
                type="button"
                onClick={() => setShowAccessRequest(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#3b82f6",
                  fontSize: "14px",
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontWeight: "500"
                }}
                onMouseEnter={(e) => e.target.style.color = "#2563eb"}
                onMouseLeave={(e) => e.target.style.color = "#3b82f6"}
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Admin popup component
  const AdminPopup = () => {
    if (!showAdminPopup) return null;

    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}>
        <div style={{
          background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
          color: "white",
          padding: "30px",
          borderRadius: "12px",
          maxWidth: "400px",
          width: "90%",
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(220, 38, 38, 0.4)",
          border: "2px solid rgba(255, 255, 255, 0.3)"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>🚫</div>
          <h2 style={{ margin: "0 0 15px 0", fontSize: "24px", fontWeight: "700" }}>
            Administrator Access Required
          </h2>
          <p style={{ 
            margin: "0 0 25px 0", 
            fontSize: "16px", 
            lineHeight: "1.5",
            opacity: 0.9
          }}>
            You are not an administrator. This action requires administrator privileges.
          </p>
          <button
            onClick={() => setShowAdminPopup(false)}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.4)",
              padding: "12px 24px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "600",
              transition: "all 0.2s ease"
            }}
            onMouseOver={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.3)";
            }}
            onMouseOut={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.2)";
            }}
          >
            OK
          </button>
        </div>
      </div>
    );
  };

  // Toggle expand/collapse for a file row (only one can be expanded at a time)
  const toggleRow = (inputKey) => {
    setExpandedRow(prev => prev === inputKey ? null : inputKey);
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  // Comprehensive security prevention - applies to entire application
  useEffect(() => {
    // Override browser screenshot functionality at the earliest point
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    window.originalAddEventListener = originalAddEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (type === 'keydown' || type === 'keyup' || type === 'keypress') {
        const wrappedListener = (event) => {
          // Allow ESC key to pass through for modal functionality
          if (event.key === 'Escape') {
            return listener.call(this, event);
          }
          
          // Check for screenshot shortcuts before any other handlers
          if (event.metaKey && event.shiftKey && ['3', '4', '5'].includes(event.key)) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            event.returnValue = false;
            // We'll call showSecurityAlert after it's defined
            setTimeout(() => {
              if (window.showSecurityAlert) {
                window.showSecurityAlert("Screenshots are not allowed for security reasons.");
              }
            }, 0);
            return false;
          }
          return listener.call(this, event);
        };
        return originalAddEventListener.call(this, type, wrappedListener, options);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };

    // Global alert state to prevent multiple alerts
    if (!window.securityAlertShown) {
      window.securityAlertShown = false;
    }
    
    const showSecurityAlert = (message) => {
      // Prevent multiple alerts from showing globally
      if (window.securityAlertShown) return;
      window.securityAlertShown = true;
      
      // Make function available globally for the EventTarget override
      window.showSecurityAlert = showSecurityAlert;
      
      // Remove any existing alerts first
      const existingAlerts = document.querySelectorAll('[data-security-alert]');
      existingAlerts.forEach(alert => alert.remove());
      
      // Create a custom centered alert instead of system alert
      const alertDiv = document.createElement('div');
      alertDiv.setAttribute('data-security-alert', 'true');
      alertDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
        color: white;
        padding: 20px 30px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 16px;
        font-weight: 600;
        text-align: center;
        z-index: 100000;
        box-shadow: 0 20px 40px rgba(220, 38, 38, 0.4);
        border: 2px solid rgba(255, 255, 255, 0.3);
        min-width: 300px;
        max-width: 500px;
        animation: pulse 0.5s ease-in-out;
      `;
      alertDiv.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 10px;">🚫</div>
        <div style="margin-bottom: 15px; font-size: 18px; font-weight: 700;">Security Violation</div>
        <div style="line-height: 1.5; margin-bottom: 20px;">${message}</div>
        <button style="
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.4);
          padding: 8px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        ">OK</button>
      `;
      document.body.appendChild(alertDiv);
      
      // Handle manual close
      const closeButton = alertDiv.querySelector('button');
      const closeAlert = () => {
        alertDiv.remove();
        window.securityAlertShown = false;
      };
      closeButton.onclick = closeAlert;
      
      // Auto-remove after 5 seconds and reset flag
              setTimeout(() => {
          if (alertDiv.parentElement) {
            alertDiv.remove();
          }
          window.securityAlertShown = false;
        }, 8000); // Increased timeout to 8 seconds
    };

    const preventSecurityViolations = (e) => {
      // Comprehensive security prevention in a single handler
      
      // Handle Escape key for modals (allow this)
      if (e.key === 'Escape') {
        if (previewModal.open) {
          setPreviewModal({ open: false, content: "", filename: "", loading: false, inputKey: "" });
          return;
        }
        if (bpmnModal.open) {
          if (isFullscreen) {
            // Exit fullscreen mode first, don't close the modal
            setIsFullscreen(false);
            e.preventDefault();
            e.stopPropagation();
            return;
          } else {
            // Close the modal only when not in fullscreen
            setBpmnModal({ open: false, xml: "", filename: "", loading: false, inputKey: "" });
            return;
          }
        }
      }
      
      // Screenshot prevention - more comprehensive
      const isScreenshotShortcut = (
        (e.key === 'PrintScreen') ||
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.key === 'P') ||
        (e.metaKey && e.key === 'P') ||
        // Additional screenshot shortcuts
        (e.metaKey && e.shiftKey && e.key === '4') ||
        (e.metaKey && e.shiftKey && e.key === '5') ||
        (e.ctrlKey && e.shiftKey && e.key === 'P') ||
        (e.metaKey && e.shiftKey && e.key === 'P')
      );
      
      // Copy prevention
      const isCopyShortcut = (
        (e.ctrlKey && e.key === 'C') ||
        (e.metaKey && e.key === 'C') ||
        (e.ctrlKey && e.key === 'A') ||
        (e.metaKey && e.key === 'A') ||
        (e.ctrlKey && e.key === 'X') ||
        (e.metaKey && e.key === 'X')
      );
      
      // Command/Control prevention - more aggressive
      const isCommandControl = (e.metaKey || e.ctrlKey) && !['Escape', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Space'].includes(e.key);
      
      // Any security violation
      if (isScreenshotShortcut || isCopyShortcut || isCommandControl) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.returnValue = false;
        
        let message = "This action is not allowed for security reasons.";
        if (isScreenshotShortcut) {
          message = "Screenshots are not allowed for security reasons.";
        } else if (isCopyShortcut) {
          message = "Copying content is not allowed for security reasons.";
        }
        
        showSecurityAlert(message);
        return false;
      }
    };

    const preventRightClick = (e) => {
      e.preventDefault();
      showSecurityAlert("Right-click is disabled for security reasons.");
      return false;
    };

    const preventTextSelection = (e) => {
      // Prevent text selection
      e.preventDefault();
      return false;
    };

    const preventDrag = (e) => {
      // Prevent dragging of elements
      e.preventDefault();
      return false;
    };

    // Multiple event listeners to catch all possible screenshot and security violations
    document.addEventListener('keydown', preventSecurityViolations, true);
    document.addEventListener('keyup', preventSecurityViolations, true);
    document.addEventListener('keypress', preventSecurityViolations, true);
    document.addEventListener('contextmenu', preventRightClick, true);
    document.addEventListener('selectstart', preventTextSelection, true);
    document.addEventListener('dragstart', preventDrag, true);
    document.addEventListener('copy', (e) => {
      e.preventDefault();
      showSecurityAlert("Copying content is not allowed for security reasons.");
      return false;
    }, true);

    // Apply CSS to prevent text selection
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.mozUserSelect = 'none';
    document.body.style.msUserSelect = 'none';
    
    // Additional security measures
    if (window.screen && window.screen.captureVisibleTab) {
      // Disable screen capture if available
      window.screen.captureVisibleTab = () => {
        showSecurityAlert("Screen capture is not allowed for security reasons.");
        return Promise.reject(new Error("Screen capture disabled"));
      };
    }

    return () => {
      // Restore original EventTarget.addEventListener
      if (window.originalAddEventListener) {
        EventTarget.prototype.addEventListener = window.originalAddEventListener;
      }
      
      document.removeEventListener('keydown', preventSecurityViolations, true);
      document.removeEventListener('keyup', preventSecurityViolations, true);
      document.removeEventListener('keypress', preventSecurityViolations, true);
      document.removeEventListener('contextmenu', preventRightClick, true);
      document.removeEventListener('selectstart', preventTextSelection, true);
      document.removeEventListener('dragstart', preventDrag, true);
      document.removeEventListener('copy', (e) => {
        e.preventDefault();
        showSecurityAlert("Copying content is not allowed for security reasons.");
        return false;
      }, true);
      
      // Restore text selection
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.mozUserSelect = '';
      document.body.style.msUserSelect = '';
      
      // Clean up global references
      delete window.showSecurityAlert;
      delete window.securityAlertShown;
    };
  }, []);

  useEffect(() => {
    // Fetch S3 file list when authenticated
    if (!authToken) return;
    
    const fetchFiles = async () => {
      setFetchingFiles(true);
      try {
        const res = await fetch("http://localhost:8000/files", {
          headers: getAuthHeaders()
        });
        const data = await res.json();
        setS3Files(data.files || []);
      } catch (e) {
        setS3Files([]);
      }
      setFetchingFiles(false);
    };
    fetchFiles();
  }, [authToken]);

  // Required outputs for a file to be considered fully processed
  const requiredOutputs = [
    "extracted_text.txt",
    "summary.txt",
    "bpmn_template.json",
    "refined_bpmn_template.json",
    "bpmn_xml.xml",
    "final_bpmn_xml.bpmn",
    "result.bpmn.xml"
  ];

  // Fetch results structure when authenticated and when needed
  useEffect(() => {
    if (!authToken) return;
    
    const fetchResultsStructure = async () => {
      try {
        const res = await fetch("http://localhost:8000/results_structure", {
          headers: getAuthHeaders()
        });
        const data = await res.json();
        setResultsStructure(data.results || {});
        setAllInputFiles(data.input_files || []);
        setFileTimestamps(data.timestamps || {});
        setInputFileTimestamps(data.input_file_timestamps || {});
      } catch (e) {
        setResultsStructure({});
        setAllInputFiles([]);
        setFileTimestamps({});
        setInputFileTimestamps({});
      }
    };
    fetchResultsStructure();
  }, [authToken, refreshResults]);

  // Fetch reprocessable files when authenticated
  useEffect(() => {
    if (!authToken) return;
    
    const fetchReprocessableFiles = async () => {
      try {
        const res = await fetch("http://localhost:8000/reprocessable_files", {
          headers: getAuthHeaders()
        });
        const data = await res.json();
        setReprocessableFiles(data.reprocessable_files || []);
      } catch (e) {
        setReprocessableFiles([]);
      }
    };
    fetchReprocessableFiles();
  }, [authToken, refreshResults]);

  // Poll for job outputs and update chat live
  useEffect(() => {
    if (!jobId) return;
    let interval;
    const fetchOutputs = async () => {
      try {
        const res = await fetch(`http://localhost:8000/job_outputs/${jobId}`, {
          headers: getAuthHeaders()
        });
        const data = await res.json();
        setJobOutputs(data.outputs || {});
        // Live update chat as outputs become available
        const outputOrder = [
          { key: "extracted_text_path", label: "Extracted Text", type: "text" },
          { key: "summary_path", label: "Summary", type: "text" },
          { key: "bpmn_template_path", label: "BPMN Template (JSON)", type: "file" },
          { key: "refined_bpmn_template_path", label: "Refined BPMN Template (JSON)", type: "file" },
          { key: "bpmn_xml_path", label: "BPMN XML (raw)", type: "file" },
          { key: "final_bpmn_xml_path", label: "Final BPMN XML (.bpmn)", type: "file" },
          { key: "result_path", label: "Download Final BPMN", type: "file" },
        ];
        let newShown = { ...shownOutputs };
        let newHistory = [...chatHistory];
        for (const { key, label, type } of outputOrder) {
          if (data.outputs && data.outputs[key] && !shownOutputs[key]) {
            if (type === "text") {
              // Fetch and show text content
              const textRes = await fetch(`http://localhost:8000/download/${jobId}/${key.replace("_path", "")}`);
              const text = await textRes.text();
              newHistory.push({ role: "system", content: `${label} available:` });
              newHistory.push({ role: "system", content: text });
            } else {
              // Show download link
              newHistory.push({
                role: "system",
                content: (
                  <a
                    href={`http://localhost:8000/download/${jobId}/${key.replace("_path", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#10a37f", textDecoration: "underline", fontWeight: 500 }}
                  >
                    {label} is ready for download
                  </a>
                )
              });
            }
            newShown[key] = true;
          }
        }
        if (JSON.stringify(newShown) !== JSON.stringify(shownOutputs)) {
          setShownOutputs(newShown);
          setChatHistory(newHistory);
        }
      } catch (e) {
        setJobOutputs({});
      }
    };
    fetchOutputs();
    interval = setInterval(fetchOutputs, 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [jobId, shownOutputs, chatHistory]);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setChatHistory([]);
    const formData = new FormData();
    formData.append("file", file);
    setChatHistory([{ role: "system", content: "Uploading file to S3..." }]);
    const res = await fetch("http://localhost:8000/upload", {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    });
    const data = await res.json();
    setJobId(data.job_id);
    setStatus("processing");
    setChatHistory((h) => [
      ...h,
      { role: "system", content: "File uploaded. Running AWS Textract for text extraction..." },
    ]);
    pollStatus(data.job_id);
  };

  const handleProcessExisting = async (s3Key) => {
    setLoading(true);
    setChatHistory([{ role: "system", content: `Processing existing file: ${s3Key}` }]);
    setShowChat(false);
    setStatus("processing");
    const res = await fetch("http://localhost:8000/process_existing", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ s3_key: s3Key }),
    });
    const data = await res.json();
    if (data.job_id) {
      setJobId(data.job_id);
      if (data.reused) {
        setStatus("completed");
        setShowChat(true);
        setLoading(false);
        // Show all available outputs immediately
        // await fetchAndShowOutputs(data.job_id, true); // This line is removed
      } else {
        pollStatus(data.job_id);
      }
    } else {
      setLoading(false);
      setChatHistory([{ role: "system", content: data.error || "Failed to process file." }]);
    }
  };

  // Helper to fetch and show outputs in chat
  // const fetchAndShowOutputs = async (jobId, showAll = false) => {
  //   try {
  //     const res = await fetch(`http://localhost:8000/job_outputs/${jobId}`);
  //     const data = await res.json();
  //     let newHistory = [];
  //     if (data.outputs && data.outputs.extracted_text_path) {
  //       const textRes = await fetch(`http://localhost:8000/download/${jobId}/extracted_text`);
  //       const text = await textRes.text();
  //       newHistory.push({ role: "system", content: "Text extraction complete. Here is the extracted text:" });
  //       newHistory.push({ role: "system", content: text });
  //     }
  //     if (data.outputs && data.outputs.summary_path) {
  //       const summaryRes = await fetch(`http://localhost:8000/download/${jobId}/summary`);
  //       const summary = await summaryRes.text();
  //       newHistory.push({ role: "system", content: "Summary of the SOP:" });
  //       newHistory.push({ role: "system", content: summary });
  //     }
  //     setChatHistory(newHistory);
  //   } catch (e) {
  //     setChatHistory([{ role: "system", content: "Error fetching outputs." }]);
  //   }
  //   setLoading(false);
  // };

  const pollStatus = (jobId) => {
    const interval = setInterval(async () => {
      const res = await fetch(`http://localhost:8000/status/${jobId}`);
      const data = await res.json();
      console.log("Status response:", data); // Debug log
      setStatus(data.status);
      if (data.status === "completed") {
        clearInterval(interval);
        setLoading(false);
        // await fetchAndShowOutputs(jobId, true); // This line is removed
        setShowChat(true);
      }
      if (data.status === "failed") {
        clearInterval(interval);
        setShowChat(false);
        setLoading(false);
        setChatHistory([{ role: "system", content: "Processing failed. Please try another file." }]);
      }
    }, 2000);
  };

  // Handle single file reprocessing
  const handleReprocess = async (s3Key) => {
    // Check if user is admin
    if (userRole !== "admin") {
      setShowAdminPopup(true);
      return;
    }

    try {
          const res = await fetch("http://localhost:8000/reprocess", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ s3_key: s3Key }),
    });
      const data = await res.json();
      if (data.job_id) {
        setReprocessingJobs(prev => ({ ...prev, [s3Key]: data.job_id }));
        // Poll for reprocessing status
        pollReprocessingStatus(data.job_id, s3Key);
      }
    } catch (error) {
      console.error("Reprocessing failed:", error);
    }
  };

  // Handle batch reprocessing
  const handleBatchReprocess = async () => {
    // Check if user is admin
    if (userRole !== "admin") {
      setShowAdminPopup(true);
      return;
    }

    const completeFiles = reprocessableFiles
      .filter(f => f.has_all_outputs)
      .map(f => f.s3_key);
    
    if (completeFiles.length === 0) return;

    try {
      const res = await fetch("http://localhost:8000/reprocess_batch", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({ s3_keys: completeFiles }),
      });
      const data = await res.json();
      if (data.jobs) {
        const newJobs = {};
        data.jobs.forEach(job => {
          newJobs[job.s3_key] = job.job_id;
        });
        setReprocessingJobs(prev => ({ ...prev, ...newJobs }));
        // Poll for all reprocessing statuses
        data.jobs.forEach(job => {
          pollReprocessingStatus(job.job_id, job.s3_key);
        });
      }
    } catch (error) {
      console.error("Batch reprocessing failed:", error);
    }
  };

  // Poll for reprocessing status
  const pollReprocessingStatus = (jobId, s3Key) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8000/status/${jobId}`, {
          headers: getAuthHeaders()
        });
        const data = await res.json();
        
        if (data.status === "completed" || data.status === "failed") {
          clearInterval(interval);
          // Remove from reprocessing jobs
          setReprocessingJobs(prev => {
            const newJobs = { ...prev };
            delete newJobs[s3Key];
            return newJobs;
          });
          // Refresh results to show updated outputs
          setRefreshResults(r => !r);
        }
      } catch (error) {
        console.error("Error polling reprocessing status:", error);
        clearInterval(interval);
      }
    }, 2000);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    setChatHistory((h) => [...h, { role: "user", content: input }]);
    setLoading(true);
    const res = await fetch("http://localhost:8000/chat", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ job_id: jobId, prompt: input }),
    });
    const data = await res.json();
    setChatHistory((h) => [...h, { role: "assistant", content: data.response }]);
    setInput("");
    setLoading(false);
  };

  const Spinner = () => (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 40 }}>
      <div style={{
        border: "4px solid #f3f3f3",
        borderTop: "4px solid #3498db",
        borderRadius: "50%",
        width: 28,
        height: 28,
        animation: "spin 1s linear infinite",
      }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );



  // Add download links for intermediate outputs in chat UI
  const outputLinks = [
    { key: "extracted_text_path", label: "Extracted Text" },
    { key: "summary_path", label: "Summary" },
    { key: "bpmn_template_path", label: "BPMN Template (JSON)" },
    { key: "refined_bpmn_template_path", label: "Refined BPMN Template (JSON)" },
    { key: "bpmn_xml_path", label: "BPMN XML (raw)" },
    { key: "final_bpmn_xml_path", label: "Final BPMN XML (.bpmn)" },
    { key: "result_path", label: "Download Final BPMN" },
  ];

  // Helper to detect file type for preview
  const isPreviewable = (filename) => {
    return (
      filename.endsWith(".txt") ||
      filename.endsWith(".json") ||
      filename.endsWith(".xml")
    );
  };
  const isBpmnFile = (filename) => filename.endsWith(".bpmn");

  // Helper to fetch and show preview
  const handlePreview = async (inputKey, output) => {
    setPreviewModal({ open: true, content: "", filename: output, loading: true, inputKey });
    try {
      const url = `http://localhost:8000/results/${inputKey}/${output}`;
      const res = await fetch(url);
      const text = await res.text();
      setPreviewModal({ open: true, content: text, filename: output, loading: false, inputKey });
    } catch (e) {
      setPreviewModal({ open: true, content: "Failed to load file.", filename: output, loading: false, inputKey });
    }
  };

  // Helper to download preview file
  const handleDownloadPreview = (inputKey, filename) => {
    // Check if user is admin
    if (userRole !== "admin") {
      setShowAdminPopup(true);
      return;
    }

    const url = `http://localhost:8000/results/${inputKey}/${filename}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to fetch and show BPMN modal
  const handleBpmnView = async (inputKey, output) => {
    setBpmnModal({ open: true, xml: "", filename: output, loading: true, inputKey });
    try {
      const url = `http://localhost:8000/results/${inputKey}/${output}`;
      const res = await fetch(url);
      const xml = await res.text();
      setBpmnModal({ open: true, xml, filename: output, loading: false, inputKey });
    } catch (e) {
      setBpmnModal({ open: true, xml: "Failed to load BPMN file.", filename: output, loading: false, inputKey });
    }
  };

  // Helper to download BPMN file
  const handleDownloadBpmn = (inputKey, filename) => {
    // Check if user is admin
    if (userRole !== "admin") {
      setShowAdminPopup(true);
      return;
    }

    const url = `http://localhost:8000/results/${inputKey}/${filename}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle escape key to close modals
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        if (previewModal.open) {
          setPreviewModal({ open: false, content: "", filename: "", loading: false, inputKey: "" });
          return;
        }
        if (bpmnModal.open) {
          if (isFullscreen) {
            // Exit fullscreen mode first, don't close the modal
            exitingFullscreenRef.current = true; // Mark that we're exiting fullscreen
            setIsFullscreen(false);
            e.preventDefault();
            e.stopPropagation();
            return;
          } else {
            // Close the modal only when not in fullscreen
            modalClosingRef.current = true;
            setBpmnModal({ open: false, xml: "", filename: "", loading: false, inputKey: "" });
            return;
          }
        }
      }
    };

    // Add event listener when modals are open
    if (previewModal.open || bpmnModal.open) {
      document.addEventListener('keydown', handleEscapeKey, true);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey, true);
    };
  }, [previewModal.open, bpmnModal.open, isFullscreen]);

  // Reset modal closing flag when modal opens
  useEffect(() => {
    if (bpmnModal.open) {
      modalClosingRef.current = false;
    }
  }, [bpmnModal.open]);

  // Handle fullscreen state changes
  useEffect(() => {
    if (exitingFullscreenRef.current && !isFullscreen) {
      // We're exiting fullscreen (not closing modal)
      // Reset the exiting fullscreen flag after a delay
      setTimeout(() => {
        exitingFullscreenRef.current = false;
      }, 300); // Increased delay to ensure modal transition completes and viewer stabilizes
    } else if (!isFullscreen && bpmnViewer && modalClosingRef.current) {
      // We're exiting fullscreen and the modal is being closed
      // Destroy the viewer immediately to prevent internal operations
      try {
        bpmnViewer.destroy && bpmnViewer.destroy();
        setBpmnViewer(null);
      } catch (error) {
        console.log('Error destroying viewer on fullscreen exit:', error);
      }
    }
  }, [isFullscreen, bpmnViewer]);

  // Render BPMN diagram when modal is open and xml is loaded
  useEffect(() => {
    if (bpmnModal.open && bpmnModal.xml && !bpmnModal.loading && !bpmnModal.applyingLayout && bpmnViewerRef.current && !modalClosingRef.current && !exitingFullscreenRef.current) {
      // Clean up any existing viewer first
      if (bpmnViewer) {
        bpmnViewer.destroy && bpmnViewer.destroy();
        setBpmnViewer(null);
      }
      
      const viewer = new BpmnJS({ 
        container: bpmnViewerRef.current,
        // Enable keyboard shortcuts
        keyboard: {
          bindTo: window
        }
      });
      
      // Enable dragging after viewer is created
      setTimeout(() => {
        if (viewer && viewer.get && !modalClosingRef.current) {
          const canvas = viewer.get('canvas');
          if (canvas) {
            // Enable mouse interactions for dragging
            const container = bpmnViewerRef.current;
            if (container) {
              let isDragging = false;
              let startX, startY, startScrollX, startScrollY;
              
              container.addEventListener('mousedown', (e) => {
                if (e.button === 0 && !modalClosingRef.current && !exitingFullscreenRef.current) { // Left mouse button
                  isDragging = true;
                  startX = e.clientX;
                  startY = e.clientY;
                  startScrollX = canvas.viewbox().x;
                  startScrollY = canvas.viewbox().y;
                  container.style.cursor = 'grabbing';
                  e.preventDefault();
                }
              });
              
              container.addEventListener('mousemove', (e) => {
                if (isDragging && !modalClosingRef.current && !exitingFullscreenRef.current) {
                  const deltaX = e.clientX - startX;
                  const deltaY = e.clientY - startY;
                  const viewbox = canvas.viewbox();
                  canvas.viewbox({
                    x: startScrollX - deltaX,
                    y: startScrollY - deltaY,
                    width: viewbox.width,
                    height: viewbox.height
                  });
                  e.preventDefault();
                }
              });
              
              container.addEventListener('mouseup', () => {
                isDragging = false;
                container.style.cursor = 'grab';
              });
              
              container.addEventListener('mouseleave', () => {
                isDragging = false;
                container.style.cursor = 'grab';
              });
            }
          }
        }
      }, 100);
      
      // Import the cleaned BPMN XML
      const importBpmnXml = async () => {
        if (modalClosingRef.current) return; // Don't import if modal is closing
        
        try {
          console.log('Importing BPMN diagram...');
          setBpmnModal(prev => ({ ...prev, applyingLayout: true }));
          
          // Clean the XML first - remove any explanatory text
          const cleanXml = cleanBpmnXml(bpmnModal.xml);
          
          console.log('Cleaned XML, importing...');
          
          // Import the cleaned XML
          await viewer.importXML(cleanXml);
          if (!modalClosingRef.current) { // Check again before zooming
            safeCanvasOperation((canvas) => {
              if (canvas.zoom) {
                canvas.zoom('fit-viewport');
                return true;
              }
              return false;
            });
          }
          

          
          console.log('BPMN diagram imported successfully');
          if (!modalClosingRef.current) {
            setBpmnModal(prev => ({ ...prev, applyingLayout: false }));
          }
        } catch (error) {
          console.log('Import failed, trying with original XML:', error);
          if (!modalClosingRef.current) {
            try {
              // Fallback to original XML
              await viewer.importXML(bpmnModal.xml);
              if (!modalClosingRef.current) {
                safeCanvasOperation((canvas) => {
                  if (canvas.zoom) {
                    canvas.zoom('fit-viewport');
                    return true;
                  }
                  return false;
                });
              }
              console.log('Successfully imported original XML');
            } catch (fallbackError) {
              console.log('Even original XML failed:', fallbackError);
            }
            if (!modalClosingRef.current) {
              setBpmnModal(prev => ({ ...prev, applyingLayout: false }));
            }
          }
        }
      };
      
              importBpmnXml();
      setBpmnViewer(viewer);
      return () => { 
        try {
          if (viewer && viewer.destroy) {
            viewer.destroy(); 
          }
        } catch (error) {
          console.log('Error destroying BPMN viewer:', error);
        }
        setBpmnViewer(null); 
      };
    }
  }, [bpmnModal.open, bpmnModal.xml, bpmnModal.loading]);

  // Safe canvas operation wrapper
  const safeCanvasOperation = (operation) => {
    if (!bpmnViewer || !bpmnViewerRef.current || modalClosingRef.current || exitingFullscreenRef.current) {
      return false;
    }
    
    try {
      const canvas = bpmnViewer.get('canvas');
      if (!canvas) return false;
      
      return operation(canvas);
    } catch (error) {
      console.log('Canvas operation error:', error);
      return false;
    }
  };

  // Zoom controls
  const handleZoom = (factor) => {
    safeCanvasOperation((canvas) => {
      if (!canvas.zoom) return false;
      
      const currentZoom = canvas.zoom();
      const newZoom = Math.max(0.1, Math.min(5, currentZoom * factor)); // Limit zoom between 10% and 500%
      canvas.zoom(newZoom);
      
      // Show zoom level feedback
      console.log(`Zoom: ${Math.round(newZoom * 100)}%`);
      return true;
    });
  };
  
  const handleFit = () => {
    safeCanvasOperation((canvas) => {
      if (!canvas.zoom) return false;
      
      canvas.zoom('fit-viewport');
      console.log('Fitted to viewport');
      
      // In fullscreen mode, ensure the diagram is properly centered and fits the viewport
      if (isFullscreen) {
        setTimeout(() => {
          safeCanvasOperation((canvas) => {
            if (!canvas.zoom) return false;
            
            canvas.zoom('fit-viewport');
            // Center the diagram in the viewport
            const viewbox = canvas.viewbox();
            const container = bpmnViewerRef.current;
            if (container && container.clientWidth && container.clientHeight) {
              const containerWidth = container.clientWidth;
              const containerHeight = container.clientHeight;
              const scale = Math.min(containerWidth / viewbox.width, containerHeight / viewbox.height);
              const newWidth = viewbox.width * scale;
              const newHeight = viewbox.height * scale;
              const x = (containerWidth - newWidth) / 2;
              const y = (containerHeight - newHeight) / 2;
              
              canvas.viewbox({
                x: x,
                y: y,
                width: newWidth,
                height: newHeight
              });
            }
            return true;
          });
        }, 100);
      }
      return true;
    });
  };
  
  const handleReset = () => {
    safeCanvasOperation((canvas) => {
      if (!canvas.zoom) return false;
      
      canvas.zoom(1, 'auto');
      canvas.scroll({ x: 0, y: 0 });
      console.log('Reset view');
      return true;
    });
  };

  const toggleFullscreen = () => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    
    // Re-fit the diagram after a short delay to ensure the new dimensions are applied
    setTimeout(() => {
      safeCanvasOperation((canvas) => {
        if (!canvas.zoom) return false;
        
        canvas.zoom('fit-viewport');
        
        // Ensure proper centering in fullscreen mode
        if (newFullscreenState) { // We're entering fullscreen mode
          setTimeout(() => {
            safeCanvasOperation((canvas) => {
              const viewbox = canvas.viewbox();
              if (!viewbox) return false;
              
              const container = bpmnViewerRef.current;
              if (container && container.clientWidth && container.clientHeight) {
                const containerWidth = container.clientWidth;
                const containerHeight = container.clientHeight;
                const scale = Math.min(containerWidth / viewbox.width, containerHeight / viewbox.height);
                const newWidth = viewbox.width * scale;
                const newHeight = viewbox.height * scale;
                const x = (containerWidth - newWidth) / 2;
                const y = (containerHeight - newHeight) / 2;
                
                canvas.viewbox({
                  x: x,
                  y: y,
                  width: newWidth,
                  height: newHeight
                });
              }
              return true;
            });
          }, 50);
        }
        return true;
      });
    }, 100);
  };

  // Syntax highlighting for JSON/XML
  const renderPreviewContent = () => {
    if (previewModal.filename.endsWith(".json")) {
      try {
        return (
          <pre style={{ whiteSpace: "pre-wrap", textAlign: "left", background: "#f6f8fa", padding: 16, borderRadius: 8, fontSize: 14 }}>
            {JSON.stringify(JSON.parse(previewModal.content), null, 2)}
          </pre>
        );
      } catch {
        return <pre>{previewModal.content}</pre>;
      }
    }
    if (previewModal.filename.endsWith(".xml")) {
      return (
        <pre style={{ whiteSpace: "pre-wrap", textAlign: "left", background: "#f6f8fa", padding: 16, borderRadius: 8, fontSize: 14 }}>
          {previewModal.content}
        </pre>
      );
    }
    return (
      <pre style={{ whiteSpace: "pre-wrap", textAlign: "left", background: "#f6f8fa", padding: 16, borderRadius: 8, fontSize: 14 }}>
        {previewModal.content}
      </pre>
    );
  };

  // Helper to truncate file names (remove leading UUID/ID and show tooltip)
  const truncateFileName = (name) => {
    // Remove leading UUID/ID and underscore, e.g. 78639dff-b994-43ba-9ef1-6db61f8fd9a5_loanapplication.pdf => loanapplication.pdf
    const match = name.match(/^[a-f0-9\-]+_(.+)$/i);
    return match ? match[1] : name;
  };

  // Helper to get user-friendly output file names
  const getFriendlyOutputName = (output) => {
    const nameMappings = {
      'extracted_text.txt': 'Extracted Text Content',
      'summary.txt': 'Process Summary',
      'bpmn_template.json': 'Initial BPMN Template',
      'refined_bpmn_template.json': 'Refined BPMN Template',
      'bpmn_xml.xml': 'Raw BPMN XML',
      'final_bpmn_xml.bpmn': 'Final BPMN Diagram',
      'result.bpmn.xml': 'Downloadable BPMN File'
    };
    
    // Try exact match first
    if (nameMappings[output]) {
      return nameMappings[output];
    }
    
    // Try partial matches for variations
    if (output.includes('extracted_text')) {
      return 'Extracted Text Content';
    } else if (output.includes('summary')) {
      return 'Process Summary';
    } else if (output.includes('bpmn_template') && output.includes('refined')) {
      return 'Refined BPMN Template';
    } else if (output.includes('bpmn_template')) {
      return 'Initial BPMN Template';
    } else if (output.includes('bpmn_xml') && !output.includes('final')) {
      return 'Raw BPMN XML';
    } else if (output.includes('final_bpmn_xml') || output.includes('result.bpmn')) {
      return 'Final BPMN Diagram';
    } else if (output.endsWith('.bpmn')) {
      return 'BPMN Diagram File';
    } else if (output.endsWith('.xml')) {
      return 'XML Configuration';
    } else if (output.endsWith('.json')) {
      return 'JSON Template';
    } else if (output.endsWith('.txt')) {
      return 'Text Document';
    }
    
    // Fallback: clean up the technical name
    return output.replace('.txt', '').replace('.json', '').replace('.xml', '').replace('.bpmn', '');
  };

  // Helper to clean BPMN XML content
  const cleanBpmnXml = (xmlContent) => {
    if (!xmlContent) return xmlContent;
    
    // Remove explanatory text that might be mixed with XML
    if (xmlContent.includes('Certainly!') || 
        xmlContent.includes('FULL BPMNDI PLEASE') || 
        xmlContent.includes('This structure is 100% valid') ||
        xmlContent.includes('Double-check for misspellings') ||
        xmlContent.includes('unparsable content')) {
      
      // Try to extract only the XML part
      const patterns = [
        /<\?xml[\s\S]*<\/bpmn:definitions>/i,  // Full XML with BPMN definitions
        /<bpmn:definitions[\s\S]*<\/bpmn:definitions>/i,  // BPMN definitions only
        /<definitions[\s\S]*<\/definitions>/i,  // Definitions without namespace
        /<\?xml[\s\S]*<\/definitions>/i  // XML with definitions without namespace
      ];
      
      for (const pattern of patterns) {
        const match = xmlContent.match(pattern);
        if (match) {
          console.log('Extracted clean XML using pattern');
          return match[0];
        }
      }
      
      // If no pattern matches, try to find the first XML-like content
      const xmlStart = xmlContent.indexOf('<?xml');
      const bpmnStart = xmlContent.indexOf('<bpmn:definitions');
      const defStart = xmlContent.indexOf('<definitions');
      
      let startIndex = -1;
      if (xmlStart !== -1) startIndex = xmlStart;
      else if (bpmnStart !== -1) startIndex = bpmnStart;
      else if (defStart !== -1) startIndex = defStart;
      
      if (startIndex !== -1) {
        const xmlPart = xmlContent.substring(startIndex);
        // Find the end of the XML
        const endMatch = xmlPart.match(/<\/bpmn:definitions>|<\/definitions>/i);
        if (endMatch) {
          const endIndex = xmlPart.indexOf(endMatch[0]) + endMatch[0].length;
          console.log('Extracted XML by finding start/end markers');
          return xmlPart.substring(0, endIndex);
        }
      }
    }
    
    return xmlContent;
  };



  // Helper to get detailed description for output files
  const getOutputDescription = (output) => {
    const descriptions = {
      'extracted_text.txt': 'Raw text extracted from the uploaded document',
      'summary.txt': 'Summary of the processing steps and key findings',
      'bpmn_template.json': 'Initial BPMN structure generated from the document',
      'refined_bpmn_template.json': 'Enhanced BPMN template with improved structure',
      'bpmn_xml.xml': 'Raw BPMN 2.0 XML format (technical)',
      'final_bpmn_xml.bpmn': 'Final BPMN diagram ready for import into modeling tools',
      'result.bpmn.xml': 'Downloadable BPMN file with watermark'
    };
    
    // Try exact match first
    if (descriptions[output]) {
      return descriptions[output];
    }
    
    // Try partial matches
    if (output.includes('extracted_text')) {
      return 'Raw text extracted from the uploaded document';
    } else if (output.includes('summary')) {
      return 'Summary of the processing steps and key findings';
    } else if (output.includes('bpmn_template') && output.includes('refined')) {
      return 'Enhanced BPMN template with improved structure';
    } else if (output.includes('bpmn_template')) {
      return 'Initial BPMN structure generated from the document';
    } else if (output.includes('bpmn_xml') && !output.includes('final')) {
      return 'Raw BPMN 2.0 XML format (technical)';
    } else if (output.includes('final_bpmn_xml') || output.includes('result.bpmn')) {
      return 'Final BPMN diagram ready for import into modeling tools';
    } else if (output.endsWith('.bpmn')) {
      return 'BPMN diagram file for workflow modeling';
    } else if (output.endsWith('.xml')) {
      return 'XML configuration file';
    } else if (output.endsWith('.json')) {
      return 'JSON template file';
    } else if (output.endsWith('.txt')) {
      return 'Text document';
    }
    
    return 'Generated output file';
  };

  // Get last updated time for a file
  const getLastUpdatedTime = (inputKey) => {
    const outputs = resultsStructure[inputKey] || [];
    if (outputs.length === 0) return null;
    
    // Get the actual timestamp from S3 metadata
    const timestampInfo = fileTimestamps[inputKey];
    if (timestampInfo && timestampInfo.last_modified) {
      const date = new Date(timestampInfo.last_modified);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    
    // Fallback: if no timestamp available, show "Recently processed"
    return "Recently processed";
  };

  // Get original file upload time
  const getOriginalFileTime = (inputKey) => {
    const inputTimestampInfo = inputFileTimestamps[inputKey];
    if (inputTimestampInfo && inputTimestampInfo.last_modified) {
      const date = new Date(inputTimestampInfo.last_modified);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    return null;
  };

  // Directory table UI for results (polished table view with collapse/expand)
  const renderResultsTable = () => {
    // Merge all input files with results structure
    const allFiles = Array.from(new Set([
      ...allInputFiles,
      ...Object.keys(resultsStructure)
    ]));
    return (
      <div style={{ margin: "32px 0 0 0", color: "#64748b", width: '100%', maxWidth: 1200, marginLeft: 'auto', marginRight: 'auto' }}>
        <div style={{ fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, fontSize: 18, color: "#1f2937" }}>
          <span style={{ fontSize: 20 }}>📁</span> Processed Files & Results
          <button onClick={() => setRefreshResults(r => !r)} style={{ background: "#1e40af", color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", fontWeight: 500, cursor: "pointer", fontSize: 14 }}>Refresh</button>
        </div>
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', fontSize: 15, minWidth: 700 }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#374151', fontWeight: 600 }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 13 }}>
                  <span>Expand</span>
                </th>
                <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 13 }}>
                  <span>File Name</span>
                </th>
                <th style={{ textAlign: 'center', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 13 }}>
                  <span>Status</span>
                </th>
                <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 13 }}>
                  <span>Generated Outputs</span>
                </th>
                <th style={{ textAlign: 'center', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 13 }}>
                  <span>Last Updated</span>
                </th>
                <th style={{ textAlign: 'center', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 13 }}>
                  <span>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {allFiles.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 18 }}>No input files found.</td></tr>
              ) : (
                allFiles.map((inputKey) => {
                  const outputs = resultsStructure[inputKey] || [];
                  const isFullyProcessed = requiredOutputs.every(req => outputs.includes(req));
                  const isUnprocessed = outputs.length === 0;
                  const expanded = expandedRow === inputKey;
                  return (
                                          <React.Fragment key={inputKey}>
                        <tr style={{ borderBottom: '1px solid #f1f5f9', background: expanded ? '#f8fafc' : '#fff', transition: 'background 0.2s' }}>
                        <td style={{ textAlign: 'center', padding: '12px', width: 32 }}>
                          {outputs.length > 0 ? (
                            <span
                              style={{ cursor: 'pointer', fontSize: 16, color: '#1e40af', display: 'inline-block', transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                              onClick={() => toggleRow(inputKey)}
                              title={expanded ? 'Collapse' : 'Expand'}
                            >
                              ▶
                            </span>
                          ) : null}
                        </td>
                        <td style={{ padding: '12px 16px', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={inputKey}>
                          <span style={{ color: '#1e40af', fontWeight: 500 }}>
                            {truncateFileName(inputKey)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px 16px' }}>
                          <span style={{
                            background: isFullyProcessed ? '#10b981' : '#f59e0b',
                            color: '#fff',
                            borderRadius: 6,
                            padding: '4px 12px',
                            fontSize: 12,
                            fontWeight: 600
                          }}>
                            {isFullyProcessed ? 'Processed' : 'Unprocessed'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 8px' }}>
                          {outputs.length > 0 ? (
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              background: '#f8fafc',
                              borderRadius: 8,
                              border: '1px solid #e2e8f0',
                              fontSize: 14,
                              color: '#475569'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 16 }}>📁</span>
                                <span>{outputs.length} output{outputs.length !== 1 ? 's' : ''}</span>
                              </div>
                              <button
                                onClick={() => toggleRow(inputKey)}
                                style={{
                                  background: '#ffffff',
                                  color: '#3b82f6',
                                  border: '1px solid #3b82f6',
                                  borderRadius: 6,
                                  padding: '4px 12px',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#3b82f6';
                                  e.currentTarget.style.color = '#ffffff';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#ffffff';
                                  e.currentTarget.style.color = '#3b82f6';
                                }}
                              >
                                View
                              </button>
                            </div>
                          ) : (
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 8,
                              padding: '8px 12px',
                              background: '#fef2f2',
                              borderRadius: 8,
                              border: '1px solid #fecaca',
                              fontSize: 14,
                              color: '#dc2626'
                            }}>
                              <span style={{ fontSize: 16 }}>⚠️</span>
                              <span>No outputs available</span>
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px 16px' }}>
                          {outputs.length > 0 ? (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                padding: '4px 8px',
                                background: '#f0f9ff',
                                borderRadius: 6,
                                border: '1px solid #bae6fd',
                                fontSize: 11,
                                color: '#0369a1'
                              }}>
                                <span style={{ fontSize: 10 }}>🔄</span>
                                <span>Last Processed</span>
                              </div>
                              <div style={{
                                fontSize: 11,
                                color: '#64748b',
                                fontWeight: 500
                              }}>
                                {getLastUpdatedTime(inputKey)}
                              </div>
                              {getOriginalFileTime(inputKey) && (
                                <div style={{
                                  fontSize: 10,
                                  color: '#94a3b8',
                                  fontStyle: 'italic'
                                }}>
                                  Uploaded: {getOriginalFileTime(inputKey)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                padding: '4px 8px',
                                background: '#fef2f2',
                                borderRadius: 6,
                                border: '1px solid #fecaca',
                                fontSize: 11,
                                color: '#dc2626'
                              }}>
                                <span style={{ fontSize: 10 }}>⏳</span>
                                <span>Not processed</span>
                              </div>
                              {getOriginalFileTime(inputKey) && (
                                <div style={{
                                  fontSize: 10,
                                  color: '#94a3b8',
                                  fontStyle: 'italic'
                                }}>
                                  Uploaded: {getOriginalFileTime(inputKey)}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            {!isFullyProcessed && (
                              <button
                                onClick={() => handleProcessExisting(inputKey)}
                                style={{ 
                                  background: "#1e40af", 
                                  color: "#fff", 
                                  border: "none", 
                                  borderRadius: 6, 
                                  padding: "6px 16px", 
                                  fontWeight: 500, 
                                  cursor: "pointer", 
                                  fontSize: 13,
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#1d4ed8';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#1e40af';
                                }}
                              >
                                Process
                              </button>
                            )}
                            {isFullyProcessed && !reprocessingJobs[inputKey] && (
                              <button
                                onClick={() => handleReprocess(inputKey)}
                                style={{ 
                                  background: "#dc2626", 
                                  color: "#fff", 
                                  border: "none", 
                                  borderRadius: 6, 
                                  padding: "6px 16px", 
                                  fontWeight: 500, 
                                  cursor: "pointer", 
                                  fontSize: 13,
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#b91c1c';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#dc2626';
                                }}
                              >
                                Reprocess
                              </button>
                            )}
                            {reprocessingJobs[inputKey] && (
                              <div style={{ 
                                background: '#f59e0b', 
                                color: '#fff', 
                                borderRadius: 6, 
                                padding: '6px 16px', 
                                fontSize: 13,
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}>
                                <span style={{ animation: 'spin 1s linear infinite' }}>⚡</span>
                                <span>Processing...</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Expanded row for outputs */}
                      {expanded && outputs.length > 0 && (
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <td colSpan={6} style={{ padding: '16px', borderTop: '1px solid #e2e8f0' }}>
                            <div style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: 8,
                              maxWidth: '100%'
                            }}>
                              <div style={{ 
                                fontSize: 14, 
                                fontWeight: 600, 
                                color: '#374151', 
                                marginBottom: 8,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                              }}>
                                <span style={{ fontSize: 16 }}>📁</span>
                                Generated Outputs ({outputs.length})
                              </div>
                              <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                                gap: 12 
                              }}>
                                {outputs.map((output) => {
                                  const isPreview = isPreviewable(output);
                                  const isBpmn = isBpmnFile(output);
                                  const isDownload = !isPreview && !isBpmn;
                                  
                                  // Get modern icon and color based on file type
                                  let icon, color, actionText;
                                  if (output.includes('extracted_text')) {
                                    icon = '📄'; color = '#3b82f6'; actionText = 'View';
                                  } else if (output.includes('summary')) {
                                    icon = '📝'; color = '#10b981'; actionText = 'View';
                                  } else if (output.includes('bpmn_template') || output.includes('refined_bpmn_template')) {
                                    icon = '⚙️'; color = '#8b5cf6'; actionText = 'View';
                                  } else if (output.includes('bpmn_xml')) {
                                    icon = '🔧'; color = '#ef4444'; actionText = 'View';
                                  } else if (output.includes('final_bpmn_xml') || output.includes('result.bpmn')) {
                                    icon = '🎯'; color = '#f97316'; actionText = 'Open';
                                  } else {
                                    icon = '📁'; color = '#6b7280'; actionText = 'Get';
                                  }
                                  
                                  return (
                                    <div key={output} style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 12,
                                      padding: '12px 16px',
                                      background: '#ffffff',
                                      borderRadius: 8,
                                      border: '1px solid #e5e7eb',
                                      transition: 'all 0.15s ease',
                                      cursor: 'pointer',
                                      fontSize: 14,
                                      position: 'relative',
                                      overflow: 'hidden',
                                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.borderColor = color;
                                      e.currentTarget.style.background = '#fafafa';
                                      e.currentTarget.style.transform = 'translateY(-1px)';
                                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.borderColor = '#e5e7eb';
                                      e.currentTarget.style.background = '#ffffff';
                                      e.currentTarget.style.transform = 'translateY(0)';
                                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                                    }}
                                    onClick={() => {
                                      if (isPreview) {
                                        handlePreview(inputKey, output);
                                      } else if (isBpmn) {
                                        handleBpmnView(inputKey, output);
                                      } else if (isDownload) {
                                        window.open(`http://localhost:8000/results/${inputKey}/${output}`, '_blank');
                                      }
                                    }}
                                    >
                                      {/* Subtle accent line */}
                                      <div style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: 3,
                                        background: color,
                                        borderRadius: '0 2px 2px 0'
                                      }} />
                                      
                                      <span style={{ 
                                        fontSize: 18, 
                                        color: color,
                                        marginLeft: 8
                                      }}>
                                        {icon}
                                      </span>
                                      
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ 
                                          fontWeight: 500, 
                                          color: '#1f2937',
                                          fontSize: 14,
                                          marginBottom: 4
                                        }}
                                        title={`Original filename: ${output}`}
                                        >
                                          {getFriendlyOutputName(output)}
                                        </div>
                                        <div style={{ 
                                          fontSize: 11, 
                                          color: '#94a3b8',
                                          textTransform: 'uppercase',
                                          letterSpacing: '0.5px',
                                          fontWeight: 500
                                        }}>
                                          {output.split('.').pop().toUpperCase()} • {actionText}
                                        </div>
                                      </div>
                                      
                                      <div style={{
                                        color: color,
                                        fontSize: 14,
                                        fontWeight: 600,
                                        opacity: 0.8
                                      }}>
                                        →
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Preview Modal */}
        {previewModal.open && (
          <div style={{
            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.25)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}
            onClick={() => setPreviewModal({ open: false, content: "", filename: "", loading: false, inputKey: "" })}
          >
            <div style={{ background: "#fff", borderRadius: 10, padding: 24, minWidth: 320, maxWidth: 700, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 2px 16px #0002" }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ fontWeight: 600, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span>{getFriendlyOutputName(previewModal.filename)}</span>
                  <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 400 }}>Press Esc to close</span>
                </div>
                <button 
                  onClick={() => handleDownloadPreview(previewModal.inputKey, previewModal.filename)} 
                  style={{ 
                    background: "transparent", 
                    color: "#6b7280", 
                    border: "none", 
                    borderRadius: 0, 
                    padding: "8px 12px", 
                    fontWeight: 500, 
                    cursor: "pointer",
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 13,
                    transition: "all 0.2s ease",
                    textDecoration: "underline"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = "#374151";
                    e.target.style.textDecoration = "none";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = "#6b7280";
                    e.target.style.textDecoration = "underline";
                  }}
                  title="Download file directly to your device"
                >
                  <span style={{ fontSize: 14 }}>⬇️</span>
                  Download to Device
                </button>
              </div>
              {previewModal.loading ? <div>Loading...</div> : renderPreviewContent()}
              <div style={{ marginTop: 18, textAlign: "right" }}>
                <button 
                  onClick={() => setPreviewModal({ open: false, content: "", filename: "", loading: false, inputKey: "" })} 
                  style={{ 
                    background: "#10a37f", 
                    color: "#fff", 
                    border: "none", 
                    borderRadius: 6, 
                    padding: "8px 18px", 
                    fontWeight: 500, 
                    cursor: "pointer" 
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        {/* BPMN Modal */}
        {bpmnModal.open && (
          <div style={{
            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: isFullscreen ? "#000" : "rgba(0,0,0,0.25)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}
            onClick={() => !isFullscreen && setBpmnModal({ open: false, xml: "", filename: "", loading: false, inputKey: "" })}
          >
            <div style={{ 
              background: "#fff", 
              borderRadius: isFullscreen ? 0 : 10, 
              padding: isFullscreen ? 0 : 24, 
              minWidth: isFullscreen ? "100vw" : 320, 
              maxWidth: isFullscreen ? "100vw" : 900, 
              maxHeight: isFullscreen ? "100vh" : "90vh", 
              height: isFullscreen ? "100vh" : "auto",
              overflowY: isFullscreen ? "hidden" : "auto", 
              boxShadow: isFullscreen ? "none" : "0 2px 16px #0002",
              position: isFullscreen ? "relative" : "static"
            }}
              onClick={e => e.stopPropagation()}
            >
              {!isFullscreen && (
                <div style={{ fontWeight: 600, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span>{getFriendlyOutputName(bpmnModal.filename)}</span>
                    <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 400 }}>Press Esc to close</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button 
                      onClick={toggleFullscreen}
                      style={{ 
                        background: "transparent", 
                        color: "#6b7280", 
                        border: "none", 
                        borderRadius: 4, 
                        padding: "8px 12px", 
                        fontWeight: 500, 
                        cursor: "pointer",
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 13,
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.color = "#374151";
                        e.target.style.background = "#f3f4f6";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = "#6b7280";
                        e.target.style.background = "transparent";
                      }}
                      title="Toggle fullscreen mode"
                    >
                      <span style={{ fontSize: 14 }}>⛶</span>
                      Fullscreen
                    </button>
                    <button 
                      onClick={() => handleDownloadBpmn(bpmnModal.inputKey, bpmnModal.filename)} 
                      style={{ 
                        background: "transparent", 
                        color: "#6b7280", 
                        border: "none", 
                        borderRadius: 0, 
                        padding: "8px 12px", 
                        fontWeight: 500, 
                        cursor: "pointer",
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 13,
                        transition: "all 0.2s ease",
                        textDecoration: "underline"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.color = "#374151";
                        e.target.style.textDecoration = "none";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = "#6b7280";
                        e.target.style.textDecoration = "underline";
                      }}
                      title="Download file directly to your device"
                    >
                      <span style={{ fontSize: 14 }}>⬇️</span>
                      Download to Device
                    </button>
                  </div>
                </div>
              )}
              {bpmnModal.loading ? (
                <div>Loading...</div>
              ) : bpmnModal.applyingLayout ? (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: 500, 
                  background: "#f6f8fa", 
                  borderRadius: 8,
                  gap: 12
                }}>
                  <div style={{ 
                    width: 20, 
                    height: 20, 
                    border: '2px solid #10a37f', 
                    borderTop: '2px solid transparent', 
                    borderRadius: '50%', 
                    animation: 'spin 1s linear infinite' 
                  }}></div>
                  <span style={{ color: '#10a37f', fontWeight: 500 }}>Loading BPMN Diagram...</span>
                </div>
              ) : (
                <>

                  <div style={{ 
                    position: 'relative', 
                    height: isFullscreen ? '100vh' : 'auto',
                    display: isFullscreen ? 'flex' : 'block',
                    alignItems: isFullscreen ? 'center' : 'stretch',
                    justifyContent: isFullscreen ? 'center' : 'flex-start'
                  }}>
                  <div 
                    ref={bpmnViewerRef} 
                    style={{ 
                      width: isFullscreen ? '100vw' : 800, 
                      height: isFullscreen ? '100vh' : 500, 
                      background: "#f6f8fa", 
                      borderRadius: isFullscreen ? 0 : 8,
                      cursor: 'grab',
                      userSelect: 'none',
                      display: isFullscreen ? 'flex' : 'block',
                      alignItems: isFullscreen ? 'center' : 'stretch',
                      justifyContent: isFullscreen ? 'center' : 'flex-start',
                      position: 'relative'
                    }} 
                  >
                    {/* Watermark positioned relative to BPMN viewer */}
                    <div style={{ 
                      position: 'absolute', 
                      top: '25%', 
                      left: '50%', 
                      transform: 'translate(-50%, -50%)', 
                      fontSize: isFullscreen ? '32px' : '24px', 
                      color: 'rgba(0, 0, 0, 0.18)',
                      fontWeight: 'bold',
                      pointerEvents: 'none',
                      zIndex: 999,
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      userSelect: 'none'
                    }}>
                      © 2025 Abhishek Arora - All Rights Reserved
                    </div>
                    <div style={{ 
                      position: 'absolute', 
                      top: '50%', 
                      left: '50%', 
                      transform: 'translate(-50%, -50%)', 
                      fontSize: isFullscreen ? '32px' : '24px', 
                      color: 'rgba(0, 0, 0, 0.18)',
                      fontWeight: 'bold',
                      pointerEvents: 'none',
                      zIndex: 999,
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      userSelect: 'none'
                    }}>
                      © 2025 Abhishek Arora - Cannot Redistribute
                    </div>
                    <div style={{ 
                      position: 'absolute', 
                      top: '75%', 
                      left: '50%', 
                      transform: 'translate(-50%, -50%)', 
                      fontSize: isFullscreen ? '32px' : '24px', 
                      color: 'rgba(0, 0, 0, 0.18)',
                      fontWeight: 'bold',
                      pointerEvents: 'none',
                      zIndex: 999,
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      userSelect: 'none'
                    }}>
                      © 2025 Abhishek Arora - All Rights Reserved
                    </div>
                  </div>
                  

                  
                  {/* Zoom Controls */}
                  <div style={{ 
                    position: 'absolute', 
                    top: isFullscreen ? 80 : 12, 
                    right: 12, 
                    background: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid rgba(0, 0, 0, 0.08)', 
                    borderRadius: '8px', 
                    padding: '6px',
                    zIndex: 1000,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    backdropFilter: 'blur(8px)'
                  }}>
                    <button 
                      onClick={() => handleZoom(1.2)}
                      style={{ 
                        border: 'none', 
                        background: 'linear-gradient(135deg, #10a37f 0%, #0d8a6b 100%)', 
                        color: 'white', 
                        padding: '8px 12px', 
                        borderRadius: '6px', 
                        margin: '1px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        minWidth: '36px',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 4px rgba(16, 163, 127, 0.2)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 4px 8px rgba(16, 163, 127, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 2px 4px rgba(16, 163, 127, 0.2)';
                      }}
                      title="Zoom In"
                    >
                      +
                    </button>
                    <button 
                      onClick={() => handleZoom(0.8)}
                      style={{ 
                        border: 'none', 
                        background: 'linear-gradient(135deg, #10a37f 0%, #0d8a6b 100%)', 
                        color: 'white', 
                        padding: '8px 12px', 
                        borderRadius: '6px', 
                        margin: '1px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        minWidth: '36px',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 4px rgba(16, 163, 127, 0.2)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 4px 8px rgba(16, 163, 127, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 2px 4px rgba(16, 163, 127, 0.2)';
                      }}
                      title="Zoom Out"
                    >
                      −
                    </button>
                    <button 
                      onClick={handleFit}
                      style={{ 
                        border: 'none', 
                        background: 'linear-gradient(135deg, #10a37f 0%, #0d8a6b 100%)', 
                        color: 'white', 
                        padding: '8px 12px', 
                        borderRadius: '6px', 
                        margin: '1px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        minWidth: '36px',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 4px rgba(16, 163, 127, 0.2)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 4px 8px rgba(16, 163, 127, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 2px 4px rgba(16, 163, 127, 0.2)';
                      }}
                      title="Fit to View"
                    >
                      Fit
                    </button>
                  </div>
                  

                </div>
                </>
              )}
              {!isFullscreen && (
                <div style={{ marginTop: 18, textAlign: "right" }}>
                  <button 
                    onClick={() => setBpmnModal({ open: false, xml: "", filename: "", loading: false, inputKey: "" })} 
                    style={{ 
                      background: "#10a37f", 
                      color: "#fff", 
                      border: "none", 
                      borderRadius: 6, 
                      padding: "8px 18px", 
                      fontWeight: 500, 
                      cursor: "pointer" 
                    }}
                  >
                    Close
                  </button>
                </div>
              )}
              {isFullscreen && (
                <div style={{ 
                  position: 'absolute', 
                  top: 20, 
                  right: 20, 
                  zIndex: 1001,
                  display: 'flex',
                  gap: 8
                }}>
                  <button 
                    onClick={toggleFullscreen}
                    style={{ 
                      background: "rgba(255, 255, 255, 0.9)", 
                      color: "#374151", 
                      border: "none", 
                      borderRadius: 6, 
                      padding: "8px 12px", 
                      fontWeight: 500, 
                      cursor: "pointer",
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 13,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}
                    title="Exit fullscreen"
                  >
                    <span style={{ fontSize: 14 }}>⛶</span>
                    Exit Fullscreen
                  </button>
                  <button 
                    onClick={() => setBpmnModal({ open: false, xml: "", filename: "", loading: false, inputKey: "" })} 
                    style={{ 
                      background: "rgba(255, 255, 255, 0.9)", 
                      color: "#374151", 
                      border: "none", 
                      borderRadius: 6, 
                      padding: "8px 12px", 
                      fontWeight: 500, 
                      cursor: "pointer",
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 13,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}
                    title="Close modal"
                  >
                    <span style={{ fontSize: 14 }}>✕</span>
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Show appropriate form based on authentication state
  if (showLogin || !isAuthenticated) {
    if (showAccessRequest) {
      return <AccessRequestForm />;
    }
    return <LoginForm />;
  }

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.02); }
            100% { transform: scale(1); }
          }
          
          /* Global security styles */
          * {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
            -webkit-touch-callout: none !important;
            -webkit-tap-highlight-color: transparent !important;
          }
          
          /* Prevent text selection on all elements */
          body, div, span, p, h1, h2, h3, h4, h5, h6, a, button, input, textarea {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
          }
          
          /* Allow text selection only in specific input fields */
          input[type="text"], input[type="email"], input[type="password"], textarea {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
          }
        `}
      </style>
      <div style={{
        minHeight: "100vh",
        minWidth: 0,
        background: colors.background,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        margin: 0,
        padding: 0,
        paddingBottom: '80px',
        display: "flex",
        flexDirection: "column"
      }}>
      {/* Header */}
      <div style={{
        width: "100%",
        maxWidth: 1200,
        margin: "0 auto",
        background: colors.background,
        color: "#1f2937",
        padding: "20px 0 16px 0",
        fontSize: 24,
        fontWeight: 600,
        letterSpacing: "-0.025em",
        textAlign: "center",
        borderBottom: `1px solid ${colors.border}`,
        position: "sticky",
        top: 0,
        zIndex: 2,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingLeft: "20px",
        paddingRight: "20px"
      }}>
        <div style={{ flex: 1 }}></div>
        <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.025em" }}>
          SOP BPMN Generator
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: 14, color: "#6b7280" }}>
            ADS ID: {currentUser}
          </span>
          <span style={{ 
            fontSize: 12, 
            color: userRole === "admin" ? "#dc2626" : "#6b7280",
            fontWeight: userRole === "admin" ? "600" : "400",
            padding: "4px 8px",
            borderRadius: "4px",
            background: userRole === "admin" ? "rgba(220, 38, 38, 0.1)" : "transparent",
            border: userRole === "admin" ? "1px solid rgba(220, 38, 38, 0.3)" : "none"
          }}>
            {userRole === "admin" ? "ADMIN" : "USER"}
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              transition: "background-color 0.2s"
            }}
            onMouseEnter={(e) => e.target.style.background = "#b91c1c"}
            onMouseLeave={(e) => e.target.style.background = "#dc2626"}
          >
            Logout
          </button>
        </div>
      </div>
      {/* Main chat area */}
      <div style={{
        flex: 1,
        width: "100%",
        maxWidth: 1200,
        margin: '0 auto',
        display: "flex",
        justifyContent: "center",
        alignItems: "stretch",
        background: colors.background,
        minWidth: 0
      }}>
        <div style={{
          width: "100%",
          maxWidth: 1200,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          background: colors.chatBg,
          borderRadius: 0,
          boxShadow: "none",
          margin: 0,
          padding: 0,
          border: `1px solid ${colors.border}`,
          minHeight: "100vh",
          minWidth: 0
        }}>
          {/* Chat messages */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "32px 0 120px 0",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            minWidth: 0
          }}>
            <div style={{ width: "100%", maxWidth: 1000, margin: "0 auto", minWidth: 0 }}>
              {!showChat ? (
                <div style={{ color: "#bbb", textAlign: "center", marginTop: 80 }}>
                  <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 18 }}>Upload SOP File</div>
                  <input type="file" onChange={handleFileChange} style={{ marginBottom: 18 }} />
                  <br />
                  <button
                    onClick={handleUpload}
                    disabled={loading}
                    style={{
                      background: colors.send,
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 28px",
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: loading ? "not-allowed" : "pointer",
                      marginTop: 10,
                      transition: "background 0.2s"
                    }}
                    onMouseOver={e => e.currentTarget.style.background = colors.sendHover}
                    onMouseOut={e => e.currentTarget.style.background = colors.send}
                  >
                    {loading ? <Spinner /> : "Upload"}
                  </button>
                  {status && <div style={{ marginTop: 18, color: "#888" }}>Status: {status}</div>}
                  
                  {/* Loading state for data fetching */}
                  {fetchingFiles && (
                    <div style={{ marginTop: 18, color: "#888", textAlign: "center" }}>
                      <Spinner /> Loading existing data...
                    </div>
                  )}
                  
                  {/* Reprocessing Section */}
                  {reprocessableFiles.length > 0 && (
                    <div style={{ margin: "32px 0 0 0", color: "#888", width: '100%', maxWidth: 1200, marginLeft: 'auto', marginRight: 'auto' }}>
                      <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 20 }}>🔄</span> Reprocess Files:
                        <button 
                          onClick={() => setShowReprocessSection(r => !r)} 
                          style={{ 
                            background: "#f39c12", 
                            color: "#fff", 
                            border: "none", 
                            borderRadius: 6, 
                            padding: "4px 14px", 
                            fontWeight: 500, 
                            cursor: "pointer", 
                            fontSize: 14 
                          }}
                        >
                          {showReprocessSection ? 'Hide' : 'Show'} ({reprocessableFiles.filter(f => f.has_all_outputs).length})
                        </button>
                        {reprocessableFiles.filter(f => f.has_all_outputs).length > 0 && (
                          <button 
                            onClick={handleBatchReprocess}
                            style={{ 
                              background: "#e74c3c", 
                              color: "#fff", 
                              border: "none", 
                              borderRadius: 6, 
                              padding: "4px 14px", 
                              fontWeight: 500, 
                              cursor: "pointer", 
                              fontSize: 14 
                            }}
                          >
                            Batch Reprocess All
                          </button>
                        )}
                      </div>
                      
                      {showReprocessSection && (
                        <div style={{ 
                          background: '#fff', 
                          borderRadius: 8, 
                          boxShadow: '0 1px 4px #ececf1', 
                          padding: 16,
                          marginTop: 12
                        }}>
                          <div style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
                            Files that can be reprocessed to regenerate BPMN outputs:
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {reprocessableFiles.map((file) => (
                              <div key={file.s3_key} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                background: '#f8f9fa',
                                borderRadius: 6,
                                border: '1px solid #e9ecef'
                              }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 500, color: '#333' }}>
                                    {truncateFileName(file.s3_key)}
                                  </div>
                                  <div style={{ fontSize: 12, color: '#666' }}>
                                    {file.has_all_outputs ? 
                                      `✅ Complete (${file.outputs_count} outputs)` : 
                                      `⚠️ Incomplete (${file.outputs_count} outputs, missing: ${file.missing_outputs?.join(', ')})`
                                    }
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  {reprocessingJobs[file.s3_key] ? (
                                    <span style={{ 
                                      background: '#f39c12', 
                                      color: '#fff', 
                                      borderRadius: 4, 
                                      padding: '4px 8px', 
                                      fontSize: 12 
                                    }}>
                                      Reprocessing...
                                    </span>
                                  ) : file.has_all_outputs ? (
                                    <button
                                      onClick={() => handleReprocess(file.s3_key)}
                                      style={{ 
                                        background: "#e74c3c", 
                                        color: "#fff", 
                                        border: "none", 
                                        borderRadius: 4, 
                                        padding: "4px 12px", 
                                        fontWeight: 500, 
                                        cursor: "pointer", 
                                        fontSize: 12 
                                      }}
                                    >
                                      Reprocess
                                    </button>
                                  ) : (
                                    <span style={{ 
                                      background: '#6c757d', 
                                      color: '#fff', 
                                      borderRadius: 4, 
                                      padding: '4px 8px', 
                                      fontSize: 12 
                                    }}>
                                      Incomplete
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Only show the results tree here, not the old S3 file list */}
                  {renderResultsTable()}
                </div>
              ) : (
                <>
                  {chatHistory.length === 0 && (
                    <div style={{ color: "#bbb", textAlign: "center", marginTop: 80 }}>
                      Start chatting with your SOP context!
                    </div>
                  )}
                  {chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent:
                          msg.role === "user"
                            ? "flex-end"
                            : msg.role === "assistant"
                            ? "flex-start"
                            : "center",
                        marginBottom: 18,
                        width: "100%"
                      }}
                    >
                      {msg.role === "system" ? (
                        <div style={{
                          background: colors.system,
                          color: colors.systemText,
                          borderRadius: 6,
                          padding: "8px 18px",
                          fontSize: 15,
                          fontStyle: "italic",
                          textAlign: "center",
                          maxWidth: "80%",
                          margin: "0 auto"
                        }}>
                          {msg.content}
                        </div>
                      ) : (
                        <div style={{
                          background: msg.role === "user" ? colors.user : colors.assistant,
                          color: msg.role === "user" ? colors.userText : colors.assistantText,
                          borderRadius: msg.role === "user" ? "18px 18px 6px 18px" : "18px 18px 18px 6px",
                          padding: "16px 22px",
                          maxWidth: "80%",
                          fontSize: 16,
                          boxShadow: msg.role === "user" ? "0 2px 8px #d1fae5" : "0 1px 4px #eee",
                          marginLeft: msg.role === "user" ? "auto" : 0,
                          marginRight: msg.role === "assistant" ? "auto" : 0,
                          border: msg.role === "user" ? `1.5px solid #10a37f` : `1.5px solid #ececf1`
                        }}>
                          {msg.content}
                        </div>
                      )}
                    </div>
                  ))}
                  {loading && <Spinner />}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>
          </div>
          {/* Input bar */}
          {showChat && (
            <div style={{
              width: "100%",
              background: colors.chatBg,
              borderTop: `1px solid ${colors.border}`,
              padding: "18px 0 18px 0",
              display: "flex",
              alignItems: "center",
              position: "fixed",
              bottom: 0,
              left: 0,
              zIndex: 10,
              justifyContent: "center"
            }}>
              <div style={{
                width: "100%",
                maxWidth: 600,
                display: "flex",
                alignItems: "center",
                background: colors.inputBg,
                borderRadius: 24,
                boxShadow: "0 1px 4px #ececf1",
                border: `1.5px solid ${colors.border}`,
                padding: "0 12px"
              }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type your prompt..."
                  style={{
                    flex: 1,
                    border: "none",
                    borderRadius: 24,
                    padding: "16px 16px",
                    fontSize: 16,
                    outline: "none",
                    background: colors.inputBg
                  }}
                  onFocus={e => e.currentTarget.parentNode.style.border = `1.5px solid ${colors.inputFocus}`}
                  onBlur={e => e.currentTarget.parentNode.style.border = `1.5px solid ${colors.border}`}
                  disabled={loading}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  style={{
                    background: colors.send,
                    color: "#fff",
                    border: "none",
                    borderRadius: 20,
                    padding: "10px 28px",
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                    marginLeft: 8,
                    transition: "background 0.2s"
                  }}
                  onMouseOver={e => e.currentTarget.style.background = colors.sendHover}
                  onMouseOut={e => e.currentTarget.style.background = colors.send}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
              </div>
      </div>
      
      {/* Classy Copyright Footer */}
      <footer style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 0',
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        borderTop: '1px solid #475569',
        textAlign: 'center',
        zIndex: 100,
        boxShadow: '0 -4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 14,
            color: '#cbd5e1',
            fontWeight: 500
          }}>
            <span style={{ fontSize: 16, color: '#f1f5f9' }}>©</span>
            <span>2025 BPMN Generator</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>•</span>
            <span>All rights reserved</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 13,
            color: '#f1f5f9',
            fontWeight: 500,
            letterSpacing: '0.3px',
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.15)'
          }}>
            <span style={{ 
              fontSize: 10, 
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              fontWeight: 600
            }}>
              Designed & Maintained by
            </span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span style={{ 
                fontSize: 16,
                fontWeight: 700,
                color: '#f8fafc',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                letterSpacing: '0.5px'
              }}>
                Abhishek
              </span>
              <span style={{ 
                fontSize: 16,
                fontWeight: 700,
                color: '#8b5cf6',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                letterSpacing: '0.5px'
              }}>
                Arora
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Admin Popup */}
      <AdminPopup />

    </>
  );
}

export default App;
