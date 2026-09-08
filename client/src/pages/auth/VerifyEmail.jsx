import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { API_URL } from "../../services/api";
import LanguageSelector from "../../components/common/LanguageSelector";
import { handleLogoClick } from "../../utils/navigation";

import "../../App.css";
import "./VerifyEmail.css";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const doVerify = async () => {
      if (!token) {
        setLoading(false);
        setError(
          "Missing verification token. Please check your email verification link.",
        );
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/auth/verify-email?token=${token}`,
        );
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to verify email.");
        }

        // Save token and user details to log user in automatically
        localStorage.setItem("helphub_token", data.token);
        localStorage.setItem("helphub_user", JSON.stringify(data.user));
        setUser(data.user);
        setSuccess(true);
      } catch (err) {
        console.error("Email verification error:", err);
        setError(err.message || "Verification failed");
      } finally {
        setLoading(false);
      }
    };

    doVerify();
  }, [token]);

  const handleEnterApp = () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (user.role === "worker") {
      navigate("/worker/dashboard", { replace: true });
    } else {
      navigate("/client/dashboard", { replace: true });
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card verify-email-card">
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

        {loading ? (
          <div className="verify-state-box">
            <div className="loading-spinner"></div>
            <h2>Verifying your email address...</h2>
            <p>
              Please wait while we confirm your email and set up your account.
            </p>
          </div>
        ) : success ? (
          <div className="verify-state-box success-state">
            <div className="verify-icon success-icon">
              <CheckCircle size={45} />
            </div>

            <h2>Email Verified Successfully! 🎉</h2>
            <p>
              Welcome to HelpHub, <strong>{user?.name}</strong>! Your email
              address has been verified. You now have full access to your
              account.
            </p>

            <button
              className="auth-submit enter-app-btn"
              onClick={handleEnterApp}
            >
              Enter HelpHub Dashboard <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <div className="verify-state-box error-state">
            <div className="verify-icon error-icon">
              <XCircle size={45} />
            </div>

            <h2>Verification Failed</h2>
            <p>{error}</p>

            <button className="auth-submit" onClick={() => navigate("/login")}>
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;
