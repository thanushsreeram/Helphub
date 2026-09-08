import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  ArrowRight,
  LogIn,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { API_URL } from "../../services/api";
import LanguageSelector from "../../components/common/LanguageSelector";
import { handleLogoClick } from "../../utils/navigation";

import "../../App.css";

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: localStorage.getItem("helphub_registered_email") || "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const regEmail = localStorage.getItem("helphub_registered_email");
    if (regEmail) {
      setSuccessMsg(
        `Account created for ${regEmail}. Please enter your password to login.`,
      );
    }
  }, []);

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
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
          "Unable to connect to HelpHub server. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            marginBottom: "15px",
          }}
        >
          <div
            onClick={() => handleLogoClick(navigate)}
            className="auth-logo"
            style={{ margin: 0, cursor: "pointer" }}
            title="Go Back"
          >
            <img
              src="/helphub-logo-transparent.png"
              alt="HelpHub Logo"
              style={{ height: "48px", objectFit: "contain" }}
            />
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

          <p>Login to manage your bookings, jobs and HelpHub account.</p>
        </div>

        {successMsg && (
          <div
            className="email-verify-badge"
            style={{
              display: "flex",
              width: "100%",
              justifyContent: "center",
              marginBottom: "15px",
              padding: "10px",
            }}
          >
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

              <Link to="/forgot-password">Forgot password?</Link>
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

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}

            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/choose-role">Create one</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
