import { Link, useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, KeyRound } from "lucide-react";
import { useState } from "react";
import LanguageSelector from "../../components/common/LanguageSelector";
import { handleLogoClick } from "../../utils/navigation";

import "../../App.css";

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!email) {
      setMessage("Please enter your email address.");
      return;
    }

    setMessage(
      "If an account exists with this email, a reset link will be sent."
    );
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
            <KeyRound size={25} />
          </div>

          <span>PASSWORD RESET</span>

          <h1>
            Forgot your
            <br />
            password?
          </h1>

          <p>
            Enter your email and we'll help you get back into your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">

          <div className="form-group">
            <label>Email address</label>

            <div className="input-wrapper">
              <Mail size={18} />

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setMessage("");
                }}
              />
            </div>
          </div>

          {message && (
            <div className="form-error">
              {message}
            </div>
          )}

          <button type="submit" className="auth-submit">
            Send Reset Link
          </button>

        </form>

        <div className="auth-footer">
          <Link to="/login">
            <ArrowLeft size={14} />
            {" "}Back to Login
          </Link>
        </div>

      </div>
    </div>
  );
}

export default ForgotPassword;