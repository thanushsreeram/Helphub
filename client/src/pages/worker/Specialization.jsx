import { useEffect, useState } from "react";
import { Briefcase, Save, ArrowLeft, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../services/api";
import LanguageSelector from "../../components/common/LanguageSelector";
import { handleLogoClick } from "../../utils/navigation";
import "./Specialization.css";

function Specialization() {
  const navigate = useNavigate();

  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
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

    fetchServices();
    fetchWorkerServices();
  }, [token, navigate]);

  const fetchServices = async () => {
    try {
      const response = await fetch(`${API_URL}/api/services`);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load services.");
      }

      setServices(data.services || []);
    } catch (error) {
      console.error("Failed to load services:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkerServices = async () => {
    try {
      const response = await fetch(`${API_URL}/api/workers/services`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load worker services.");
      }

      setSelectedServices((data.services || []).map((service) => service.id));
    } catch (error) {
      console.error("Failed to load worker services:", error);
    }
  };

  const handleServiceToggle = (serviceId) => {
    setSelectedServices((current) => {
      if (current.includes(serviceId)) {
        return current.filter((id) => id !== serviceId);
      }

      return [...current, serviceId];
    });

    setMessage("");
    setError("");
  };

  const handleSave = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (selectedServices.length === 0) {
      setError("Please select at least one specialization.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`${API_URL}/api/workers/services`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          service_ids: selectedServices,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save specializations.");
      }

      setMessage("Your specializations have been saved successfully.");
    } catch (error) {
      console.error("Save specialization error:", error);

      setError(error.message || "Unable to save specializations.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="specialization-page">
      {/* Header */}
      <header className="specialization-header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h1
            onClick={() => handleLogoClick(navigate)}
            style={{ cursor: "pointer" }}
            title="Go Back"
          >
            <img
              src="/helphub-logo-transparent.png"
              alt="HelpHub"
              style={{ height: "38px", objectFit: "contain" }}
            />
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            className="back-dashboard"
            onClick={() => navigate("/worker/dashboard")}
          >
            <ArrowLeft size={17} />
            Dashboard
          </button>
          <LanguageSelector />
        </div>
      </header>

      {/* Main */}
      <main className="specialization-container">
        <section className="specialization-hero">
          <div className="hero-icon">
            <Briefcase size={30} />
          </div>

          <div>
            <p className="eyebrow">WORKER PROFILE</p>

            <h2>Choose your specializations</h2>

            <p className="hero-description">
              Select the services you provide. Clients will be able to find you
              based on your selected skills.
            </p>
          </div>
        </section>

        {/* Selection Card */}
        <section className="specialization-card">
          <div className="card-header">
            <div>
              <h3>Your Services</h3>
              <p>Select all services you are qualified to provide.</p>
            </div>

            <div className="selected-count">
              {selectedServices.length} selected
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading services...</p>
            </div>
          ) : error && services.length === 0 ? (
            <div className="error-state">
              <p>{error}</p>
              <button onClick={fetchServices}>Try Again</button>
            </div>
          ) : (
            <form onSubmit={handleSave}>
              <div className="services-grid">
                {services.map((service) => {
                  const selected = selectedServices.includes(service.id);

                  return (
                    <label
                      key={service.id}
                      className={`service-card ${selected ? "selected" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => handleServiceToggle(service.id)}
                      />

                      <div className="service-icon">
                        <Briefcase size={23} />
                      </div>

                      <div className="service-content">
                        <h4>{service.name}</h4>

                        <p>{service.description}</p>

                        <span>{service.category}</span>
                      </div>

                      <div className="check-circle">
                        {selected && <Check size={15} />}
                      </div>
                    </label>
                  );
                })}
              </div>

              {error && <div className="specialization-error">{error}</div>}

              {message && (
                <div className="specialization-success">
                  <Check size={18} />
                  {message}
                </div>
              )}

              <div className="save-area">
                <div>
                  <strong>
                    {selectedServices.length} service
                    {selectedServices.length !== 1 ? "s" : ""} selected
                  </strong>

                  <p>You can change these selections anytime.</p>
                </div>

                <button type="submit" className="save-button" disabled={saving}>
                  <Save size={18} />

                  {saving ? "Saving..." : "Save Specializations"}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

export default Specialization;
