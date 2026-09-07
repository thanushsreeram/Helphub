import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, LogIn, Eye, EyeOff, CheckCircle2, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { API_URL } from "../../services/api";
import LanguageSelector from "../../components/common/LanguageSelector";
import { useLanguage } from "../../context/LanguageContext";
import { handleLogoClick } from "../../utils/navigation";

import "../../App.css";

function Login() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    email: localStorage.getItem("helphub_registered_email") || "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Active session state
  const [activeUser, setActiveUser] = useState(null);
  const [showSessionPrompt, setShowSessionPrompt] = useState(false);

  // Email verification modal state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  useEffect(() => {
    const regEmail = localStorage.getItem("helphub_registered_email");
    if (regEmail) {
      setSuccessMsg(`Account created for ${regEmail}. Please enter your password to login.`);
    }

    const token = localStorage.getItem("helphub_token");
    const storedUser = localStorage.getItem("helphub_user");
    if (token && storedUser) {
      try {
        const userObj = JSON.parse(storedUser);
        setActiveUser(userObj);
        setShowSessionPrompt(true);
      } catch (e) {
        console.error("Session parse error", e);
      }
    }
  }, []);

  const handleRoleSwitch = async (targetRole) => {
    const token = localStorage.getItem("helphub_token");
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/auth/switch-role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ target_role: targetRole }),
      });

      const data = await response.json();
      if (data.success) {
        localStorage.setItem("helphub_token", data.token);
        localStorage.setItem("helphub_user", JSON.stringify(data.user));
        if (targetRole === "worker") {
          navigate("/worker/dashboard");
        } else {
          navigate("/client/dashboard");
        }
      } else {
        setError(data.message || "Failed to switch role");
      }
    } catch (err) {
      console.error("Switch role error", err);
      setError("Failed to switch portal role");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutFresh = () => {
    localStorage.removeItem("helphub_token");
    localStorage.removeItem("helphub_user");
    setActiveUser(null);
    setShowSessionPrompt(false);
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });

    setError("");
  };

  const handleVerifyEmail = (e) => {
    e.preventDefault();
    if (verificationCode === "123456" || verificationCode.length === 6) {
      setIsEmailVerified(true);
      setShowVerifyModal(false);
      setSuccessMsg("Email verified successfully! You can now log in.");
    } else {
      setError("Invalid verification code. Please enter 123456.");
    }
  };

  const [unverifiedToken, setUnverifiedToken] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setUnverifiedToken(null);

    if (!formData.email || !formData.password) {
      setError("Please enter your email and password.");
      return;
    }

    if (!isValidEmail(formData.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.is_unverified && data.verification_token) {
          setUnverifiedToken(data.verification_token);
        }
        throw new Error(data.message || "Login failed.");
      }

      // Save authentication information
      localStorage.setItem("helphub_token", data.token);
      localStorage.setItem("helphub_user", JSON.stringify(data.user));
      localStorage.removeItem("helphub_registered_email");

      console.log("Login successful:", data.user);

      // Navigate according to account role
      if (data.user.role === "worker") {
        navigate("/worker/dashboard", { replace: true });
      } else if (data.user.role === "client") {
        navigate("/client/dashboard", { replace: true });
      } else {
        setError("Unknown account role.");
      }
    } catch (error) {
      console.error("Login error:", error);

      setError(
        error.message ||
          "Unable to connect to HelpHub server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "15px" }}>
          <div onClick={() => handleLogoClick(navigate)} className="auth-logo" style={{ margin: 0, cursor: "pointer" }} title="Go Back">
            <img src="/helphub-logo-transparent.png" alt="HelpHub Logo" style={{ height: "48px", objectFit: "contain" }} />
          </div>
          <LanguageSelector />
        </div>

        <div className="auth-heading">
          <div className="auth-role-icon">
            <LogIn size={25} />
          </div>

          <span>WELCOME BACK</span>

          <h1>
            Login to
            <br />
            HelpHub
          </h1>

          <p>
            Login to manage your bookings, jobs and HelpHub account.
          </p>
        </div>

        {showSessionPrompt && activeUser && (
          <div className="session-prompt-card" style={{ background: "#f8fafc", border: "1.5px solid #6366f1", borderRadius: "14px", padding: "18px", marginBottom: "20px", textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4f46e5", fontWeight: "700", fontSize: "14px", marginBottom: "6px" }}>
              <ShieldCheck size={18} />
              <span>Active Session Detected</span>
            </div>
            <p style={{ margin: "0 0 14px", fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>
              You are currently logged in as <strong>{activeUser.name}</strong> ({activeUser.email}) in the <strong>{activeUser.role?.toUpperCase()}</strong> portal.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
              <button
                type="button"
                className="auth-submit"
                onClick={() => navigate(activeUser.role === "worker" ? "/worker/dashboard" : "/client/dashboard")}
                style={{ width: "100%", margin: 0, padding: "10px 14px" }}
              >
                🚀 Continue as {activeUser.role === "worker" ? "Worker" : "Client"} <ArrowRight size={16} />
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => handleRoleSwitch(activeUser.role === "worker" ? "client" : "worker")}
                disabled={loading}
                style={{ width: "100%", padding: "10px 14px", fontSize: "13px", justifyContent: "center" }}
              >
                🔄 Switch to {activeUser.role === "worker" ? "Client Portal" : "Worker Portal"} (Keep All Data)
              </button>
              <button
                type="button"
                onClick={handleLogoutFresh}
                style={{ background: "none", border: "none", color: "#64748b", fontSize: "12px", cursor: "pointer", textDecoration: "underline", marginTop: "4px" }}
              >
                Log out & log in with a different account
              </button>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="email-verify-badge" style={{ display: "flex", width: "100%", justifyContent: "center", marginBottom: "15px", padding: "10px" }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">

          <div className="form-group">
            <div className="password-label">
              <label>Email address</label>
              {isValidEmail(formData.email) && (
                <span className="email-verify-badge">
                  <CheckCircle2 size={13} />
                  Format Verified
                </span>
              )}
            </div>

            <div className="input-wrapper">
              <Mail size={18} />

              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <div className="password-label">
              <label>Password</label>

              <Link to="/forgot-password">
                Forgot password?
              </Link>
            </div>

            <div className="input-wrapper">
              <Lock size={18} />

              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
              />

              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          {unverifiedToken && (
            <button
              type="button"
              className="auth-submit"
              style={{ background: "#16a34a", marginTop: "5px", marginBottom: "5px" }}
              onClick={() => navigate(`/verify-email?token=${unverifiedToken}`)}
            >
              ✉️ Click Here to Verify Email & Access Account <ArrowRight size={18} />
            </button>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}

            {!loading && <ArrowRight size={18} />}
          </button>

          <button
            type="button"
            className="change-role"
            onClick={() => setShowVerifyModal(true)}
            style={{ marginTop: "10px" }}
          >
            📧 Verify Email Verification Code
          </button>

        </form>

        <div className="auth-footer">
          Don't have an account?{" "}
          <Link to="/choose-role">Create one</Link>
        </div>

      </div>

      {/* EMAIL VERIFICATION MODAL */}
      {showVerifyModal && (
        <div className="verification-modal-overlay">
          <div className="verification-modal">
            <div className="verification-modal-icon">
              <ShieldCheck size={32} />
            </div>

            <h3>Verify Email Code</h3>
            <p>
              Enter the 6-digit verification code sent to{" "}
              <strong>{formData.email || "your email"}</strong> to verify your account.
            </p>

            <form onSubmit={handleVerifyEmail}>
              <input
                type="text"
                className="verification-code-input"
                placeholder="123456"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                autoFocus
              />

              <div className="verification-actions">
                <button type="submit" className="verify-btn">
                  Verify & Continue
                </button>
                <button
                  type="button"
                  className="resend-code-btn"
                  onClick={() => setShowVerifyModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Login;
