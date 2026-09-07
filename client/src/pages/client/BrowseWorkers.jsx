import { useEffect, useState } from "react";
import {
  Search,
  MapPin,
  Briefcase,
  Star,
  ArrowLeft,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../services/api";
import LanguageSelector from "../../components/common/LanguageSelector";
import { useLanguage } from "../../context/LanguageContext";
import { handleLogoClick } from "../../utils/navigation";
import "./BrowseWorkers.css";

function BrowseWorkers() {
  const navigate = useNavigate();
  const { t, tCategory } = useLanguage();

  const [workers, setWorkers] = useState([]);
  const [services, setServices] = useState([]);

  const [service, setService] = useState("");
  const [location, setLocation] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("helphub_token");

  // Load services
  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/services`
        );

        const data = await response.json();

        if (data.success) {
          setServices(data.services);
        }
      } catch (error) {
        console.error("Failed to load services:", error);
      }
    };

    loadServices();
  }, []);

  // Load workers
  const searchWorkers = async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (service) {
        params.append("service", service);
      }

      if (location.trim()) {
        params.append("location", location.trim());
      }

      const response = await fetch(
        `${API_URL}/api/workers?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load workers");
      }

      setWorkers(data.workers || []);
    } catch (error) {
      console.error("Search workers error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchWorkers();
  }, []);

  return (
    <div className="browse-workers-page">

      {/* HEADER */}
      <header className="browse-header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 onClick={() => handleLogoClick(navigate)} style={{ cursor: "pointer" }} title="Go Back">
            <img src="/helphub-logo-transparent.png" alt="HelpHub" style={{ height: "40px", objectFit: "contain" }} />
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            className="back-button"
            onClick={() => navigate("/client/dashboard")}
          >
            <ArrowLeft size={17} />
            {t("nav_dashboard")}
          </button>
          <LanguageSelector />
        </div>
      </header>

      <main className="browse-content">

        {/* TITLE */}
        <section className="browse-title">
          <div>
            <h2>{t("nav_browse_workers")}</h2>
            <p>
              {t("find_expert_workers")}
            </p>
          </div>
        </section>

        {/* SEARCH */}
        <section className="worker-search-card">

          <div className="search-field">
            <label>Service</label>

            <div className="input-wrapper">
              <Briefcase size={17} />

              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
              >
                <option value="">
                  {t("all_categories")}
                </option>

                {services.map((item) => (
                  <option
                    key={item.id}
                    value={item.name}
                  >
                    {tCategory(item.name)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="search-field">
            <label>Location</label>

            <div className="input-wrapper">
              <MapPin size={17} />

              <input
                type="text"
                placeholder={t("filter_by_city")}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <button
            className="search-button"
            onClick={searchWorkers}
            disabled={loading}
          >
            <Search size={18} />

            {loading ? t("btn_search") + "..." : t("btn_search")}
          </button>
        </section>

        {/* RESULTS */}
        <section className="workers-section">

          <div className="results-header">
            <div>
              <h2>{t("top_workers")}</h2>

              <p>
                {loading
                  ? t("btn_search") + "..."
                  : `${workers.length} worker${
                      workers.length !== 1 ? "s" : ""
                    } found`}
              </p>
            </div>
          </div>

          {error && (
            <div className="worker-error">
              <strong>Unable to load workers</strong>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && workers.length === 0 && (
            <div className="no-workers">
              <Search size={40} />

              <h3>{t("no_workers_found")}</h3>

              <p>
                Try another service or location.
              </p>
            </div>
          )}

          {!loading && workers.length > 0 && (
            <div className="workers-grid">

              {workers.map((worker) => (
                <div
                  className="worker-card"
                  key={worker.worker_id}
                >

                  {/* AVATAR */}
                  <div className="worker-card-top">

                    <div className="worker-avatar">
                      {worker.avatar_url ? (
                        <img
                          src={worker.avatar_url}
                          alt={worker.name}
                          className="worker-avatar-img"
                        />
                      ) : (
                        <User size={32} />
                      )}
                    </div>

                    <div className="worker-main-info">

                      <h3>{worker.name}</h3>

                      <div className="worker-rating">

                        <Star
                          size={15}
                          fill="currentColor"
                        />

                        <span>
                          {worker.rating || "New"}
                        </span>

                        {worker.total_reviews > 0 && (
                          <span>
                            ({worker.total_reviews})
                          </span>
                        )}

                      </div>

                    </div>

                    {worker.is_available && (
                      <span className="available-badge">
                        {t("status_available")}
                      </span>
                    )}

                  </div>

                  {/* DETAILS */}
                  <div className="worker-details">

                    <div>
                      <MapPin size={15} />
                      <span>
                        {worker.location || "Location not provided"}
                      </span>
                    </div>

                    <div>
                      <Briefcase size={15} />
                      <span>
                        {worker.experience_years || 0} years experience
                      </span>
                    </div>

                  </div>

                  {/* BIO */}
                  {worker.bio && (
                    <p className="worker-bio">
                      {worker.bio}
                    </p>
                  )}

                  {/* SERVICES */}
                  {worker.services?.length > 0 && (
                    <div className="worker-services">

                      {worker.services.map((item) => (
                        <span key={item.id}>
                          {tCategory(item.name)}
                        </span>
                      ))}

                    </div>
                  )}

                  {/* FOOTER */}
                  <div className="worker-card-footer">

                    <div className="worker-rate">
                      <small>Starting from</small>

                      <strong>
                        ₹{worker.hourly_rate || 0}
                      </strong>

                      <span>/ hour</span>
                    </div>

                    <button
                      onClick={() =>
                        navigate(
                          `/client/worker/${worker.worker_id}`
                        )
                      }
                    >
                      {t("btn_view_details")}
                    </button>

                  </div>

                </div>
              ))}

            </div>
          )}

        </section>
      </main>
    </div>
  );
}

export default BrowseWorkers;
