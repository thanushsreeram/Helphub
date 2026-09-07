import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, ArrowLeft, Save, CheckCircle, AlertCircle, Star } from "lucide-react";
import { API_URL } from "../../services/api";
import AvatarUpload from "../../components/common/AvatarUpload";
import LanguageSelector from "../../components/common/LanguageSelector";
import { handleLogoClick } from "../../utils/navigation";
import "./ClientProfile.css";

function ClientProfile() {
  const navigate = useNavigate();

  const [user, setUser] = useState({
    name: "",
    email: "",
    phone: "",
    avatar_url: "",
    role: "client",
    client_rating: null,
    client_total_reviews: 0,
  });

  const [clientReviews, setClientReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = localStorage.getItem("helphub_token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/api/users/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to load profile");
        }

        setUser(data.user);

        if (data.user && data.user.id) {
          const revRes = await fetch(`${API_URL}/api/reviews/client/${data.user.id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const revData = await revRes.json();
          if (revRes.ok && revData.success) {
            setClientReviews(revData.reviews || []);
          }
        }
      } catch (err) {
        console.error("Fetch profile error:", err);
        setError(err.message || "Unable to load user profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!user.name || !user.name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`${API_URL}/api/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: user.name.trim(),
          phone: user.phone ? user.phone.trim() : null,
          avatar_url: user.avatar_url || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update profile");
      }

      setUser(data.user);
      localStorage.setItem("helphub_user", JSON.stringify(data.user));
      setMessage("Profile and photo updated successfully!");
    } catch (err) {
      console.error("Update profile error:", err);
      setError(err.message || "Unable to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="client-profile-page">
        <div className="profile-container" style={{ textAlign: "center", paddingTop: "100px" }}>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="client-profile-page">
      {/* Header */}
      <header className="profile-header">
        <div className="profile-brand" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 onClick={() => handleLogoClick(navigate)} style={{ cursor: "pointer" }} title="Go Back">
            <img src="/helphub-logo-transparent.png" alt="HelpHub" style={{ height: "40px", objectFit: "contain" }} />
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            className="profile-back-button"
            onClick={() => navigate("/client/dashboard")}
          >
            <ArrowLeft size={18} />
            Dashboard
          </button>
          <LanguageSelector />
        </div>
      </header>

      <main className="profile-container">
        {/* Hero Card */}
        <section className="profile-hero">
          <AvatarUpload
            value={user.avatar_url}
            onChange={(newUrl) => setUser({ ...user, avatar_url: newUrl })}
            size={110}
          />

          <div className="profile-hero-info">
            <h2>{user.name || "Client"}</h2>
            <p>{user.email}</p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span className="role-badge">{user.role || "Client"}</span>
              {user.client_rating && (
                <div className="client-rating-badge">
                  <Star size={15} fill="currentColor" />
                  <span>{Number(user.client_rating).toFixed(1)} / 5</span>
                  <small style={{ opacity: 0.85 }}>({user.client_total_reviews} worker reviews)</small>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Profile Edit Card */}
        <section className="profile-card">
          <div className="card-title-row">
            <h3>Personal Information</h3>
          </div>

          {message && (
            <div className="profile-alert alert-success" style={{ marginBottom: "20px" }}>
              <CheckCircle size={18} />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="profile-alert alert-error" style={{ marginBottom: "20px" }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="profile-form">
            <div className="profile-form-group">
              <label>Full Name</label>
              <div className="profile-input-wrapper">
                <User size={18} />
                <input
                  type="text"
                  value={user.name || ""}
                  onChange={(e) => setUser({ ...user, name: e.target.value })}
                  placeholder="Enter your full name"
                  required
                  disabled={saving}
                />
              </div>
            </div>

            <div className="profile-form-group">
              <label>Email Address (read-only)</label>
              <div className="profile-input-wrapper">
                <Mail size={18} />
                <input
                  type="email"
                  value={user.email || ""}
                  disabled
                />
              </div>
            </div>

            <div className="profile-form-group">
              <label>Phone Number</label>
              <div className="profile-input-wrapper">
                <Phone size={18} />
                <input
                  type="tel"
                  value={user.phone || ""}
                  onChange={(e) => setUser({ ...user, phone: e.target.value })}
                  placeholder="Enter your phone number"
                  disabled={saving}
                />
              </div>
            </div>

            <button
              type="submit"
              className="profile-submit-btn"
              disabled={saving}
            >
              <Save size={18} />
              {saving ? "Saving Changes..." : "Save Changes"}
            </button>
          </form>
        </section>

        {/* WORKER REVIEWS & FEEDBACK */}
        <section className="worker-feedback-section">
          <h3>Worker Feedback ({clientReviews.length})</h3>
          <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "4px" }}>
            Reviews & ratings left by service workers who completed jobs for you.
          </p>

          {clientReviews.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
              <Star size={36} style={{ marginBottom: "8px", opacity: 0.5 }} />
              <p>No worker feedback received yet.</p>
            </div>
          ) : (
            <div className="feedback-list">
              {clientReviews.map((rev) => (
                <div key={rev.id} className="feedback-card">
                  <div className="feedback-header">
                    <div className="feedback-worker">
                      {rev.worker_avatar_url ? (
                        <img
                          src={rev.worker_avatar_url}
                          alt={rev.worker_name}
                          className="worker-avatar-circle"
                        />
                      ) : (
                        <div className="worker-avatar-circle" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <User size={18} />
                        </div>
                      )}
                      <div>
                        <strong>{rev.worker_name || "Worker"}</strong>
                        <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                          {new Date(rev.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="feedback-stars">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={16}
                          fill={s <= Number(rev.rating) ? "currentColor" : "none"}
                        />
                      ))}
                    </div>
                  </div>

                  {rev.comment && (
                    <p style={{ fontSize: "0.95rem", color: "#334155", margin: "8px 0" }}>
                      "{rev.comment}"
                    </p>
                  )}

                  {rev.behaviour_rating && (
                    <div style={{ fontSize: "0.85rem", color: "#64748b", display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                      <span>Behavior Rating:</span>
                      <strong style={{ color: "#f59e0b" }}>{rev.behaviour_rating} / 5</strong>
                    </div>
                  )}

                  {rev.photos && Array.isArray(rev.photos) && rev.photos.length > 0 && (
                    <div className="feedback-photos">
                      {rev.photos.map((pUrl, pIdx) => (
                        <img key={pIdx} src={pUrl} alt="Review attachment" className="feedback-photo-thumb" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default ClientProfile;
