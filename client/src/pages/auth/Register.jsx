import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  UserRound,
  BriefcaseBusiness,
  Mail,
  Lock,
  Phone,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState } from "react";
import { API_URL } from "../../services/api";
import LanguageSelector from "../../components/common/LanguageSelector";
import { handleLogoClick } from "../../utils/navigation";

import "../../App.css";

function Register() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedRole = searchParams.get("role") || "client";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isWorker = selectedRole === "worker";

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });

    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Please fill in all fields.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: selectedRole,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to create your account.");
      }

      localStorage.setItem("helphub_registered_email", formData.email);
      setRegisteredInfo({
        email: formData.email,
        token: data.verification_token || null,
        link: data.verification_link || null,
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  };

  const [registeredInfo, setRegisteredInfo] = useState(null);

  if (registeredInfo) {
    return (
      <div className="auth-page">
        <div
          className="auth-card"
          style={{ textAlign: "center", maxWidth: "520px" }}
        >
          <Link to="/" className="auth-logo">
            <img
              src="/helphub-logo-transparent.png"
              alt="HelpHub Logo"
              style={{ height: "48px", objectFit: "contain" }}
            />
          </Link>

          <div
            style={{
              width: "70px",
              height: "70px",
              borderRadius: "50%",
              background: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <Mail size={36} />
          </div>

          <h2
            style={{
              fontSize: "24px",
              fontWeight: "800",
              margin: "0 0 10px",
              color: "#0f172a",
            }}
          >
            Verify your email address 📧
          </h2>

          <p
            style={{
              color: "#64748b",
              fontSize: "14px",
              lineHeight: "1.6",
              margin: "0 0 24px",
            }}
          >
            We've sent a verification email to{" "}
            <strong>{registeredInfo.email}</strong>. Please check your inbox and
            click the verification link to activate your account.
          </p>

          {registeredInfo.token && (
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "20px",
                marginBottom: "24px",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Simulated Inbox Email Link
              </span>

              <p
                style={{
                  fontSize: "13px",
                  color: "#334155",
                  margin: "8px 0 14px",
                  wordBreak: "break-all",
                }}
              >
                {registeredInfo.link}
              </p>

              <button
                className="auth-submit"
                onClick={() =>
                  navigate(`/verify-email?token=${registeredInfo.token}`)
                }
                style={{ width: "100%", margin: 0 }}
              >
                ✉️ Click Here to Verify Email & Enter HelpHub{" "}
                <ArrowRight size={18} />
              </button>
            </div>
          )}

          <div className="auth-footer" style={{ marginTop: 0 }}>
            Already verified? <Link to="/login">Go to Login</Link>
          </div>
        </div>
      </div>
    );
  }

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
            {isWorker ? (
              <BriefcaseBusiness size={25} />
            ) : (
              <UserRound size={25} />
            )}
          </div>

          <span>{isWorker ? "WORKER ACCOUNT" : "CLIENT ACCOUNT"}</span>

          <h1>
            Create your
            <br />
            HelpHub account
          </h1>

          <p>
            {isWorker
              ? "Create your worker account and start offering your services."
              : "Create your account and find trusted workers near you."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Full name</label>

            <div className="input-wrapper">
              <UserRound size={18} />

              <input
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email address</label>

            <div className="input-wrapper">
              <Mail size={18} />

              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Phone number</label>

            <div className="input-wrapper">
              <Phone size={18} />

              <input
                type="tel"
                name="phone"
                placeholder="+91 XXXXX XXXXX"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>

            <div className="input-wrapper">
              <Lock size={18} />

              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
              />

              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Confirm password</label>

            <div className="input-wrapper">
              <Lock size={18} />

              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />

              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading
              ? "Creating account..."
              : `Create ${isWorker ? "Worker" : "Client"} Account`}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </div>

        <button
          className="change-role"
          onClick={() => navigate("/choose-role")}
        >
          ← Change account type
        </button>
      </div>
    </div>
  );
}

export default Register;
