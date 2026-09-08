import { useEffect, useState } from "react";
import {
  Search,
  CalendarDays,
  CheckCircle,
  Clock,
  LogOut,
  User,
  Briefcase,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../services/api";
import LanguageSelector from "../../components/common/LanguageSelector";
import { useLanguage } from "../../context/LanguageContext";
import { handleLogoClick } from "../../utils/navigation";
import "./ClientDashboard.css";

function ClientDashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [bookings, setBookings] = useState([]);
  const token = localStorage.getItem("helphub_token");
  const user = JSON.parse(localStorage.getItem("helphub_user") || "{}");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchBookings = async () => {
      try {
        const response = await fetch(`${API_URL}/api/bookings`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (data.success) {
          setBookings(data.bookings || []);
        }
      } catch (error) {
        console.error("Failed to load bookings:", error);
      } finally {
      }
    };

    fetchBookings();
  }, [token, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("helphub_token");
    localStorage.removeItem("helphub_user");
    navigate("/login");
  };

  const handleSwitchToWorker = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/switch-role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ target_role: "worker" }),
      });

      const data = await response.json();
      if (data.success) {
        localStorage.setItem("helphub_token", data.token);
        localStorage.setItem("helphub_user", JSON.stringify(data.user));
        navigate("/worker/dashboard");
      }
    } catch (err) {
      console.error("Role switch error", err);
    } finally {
    }
  };

  const activeBookings = bookings.filter((booking) =>
    ["pending", "committed", "in_progress"].includes(booking.status),
  );

  const completedBookings = bookings.filter(
    (booking) => booking.status === "completed",
  );

  return (
    <div className="client-dashboard-page">
      {/* HEADER */}
      <header className="client-header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h1
            onClick={() => handleLogoClick(navigate)}
            style={{ cursor: "pointer" }}
            title="Go Back"
          >
            <img
              src="/helphub-logo-transparent.png"
              alt="HelpHub"
              style={{ height: "40px", objectFit: "contain" }}
            />
          </h1>
        </div>

        <div
          className="client-header-actions"
          style={{ display: "flex", alignItems: "center", gap: "10px" }}
        >
          <button
            className="profile-button"
            onClick={handleSwitchToWorker}
            style={{
              background: "#eef2ff",
              color: "#4f46e5",
              borderColor: "#c7d2fe",
            }}
            title="Switch to Worker Portal"
          >
            <Briefcase size={17} />
            Worker Portal
          </button>

          <button
            className="profile-button"
            onClick={() => navigate("/client/profile")}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Profile"
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <User size={18} />
            )}
            {t("nav_profile")}
          </button>

          <button className="client-logout-button" onClick={handleLogout}>
            <LogOut size={18} />
            {t("nav_logout")}
          </button>
          <LanguageSelector />
        </div>
      </header>

      {/* MAIN */}
      <main className="client-dashboard-content">
        {/* WELCOME */}
        <section className="client-welcome">
          <div>
            <p className="welcome-label">WELCOME BACK</p>

            <h2>Hello, {user.name || "Client"} 👋</h2>

            <p>Find trusted workers and manage your service bookings.</p>
          </div>

          <button
            className="find-worker-button"
            onClick={() => navigate("/client/workers")}
          >
            <Search size={18} />
            {t("nav_browse_workers")}
          </button>
        </section>

        {/* STATS */}
        <section className="client-stats">
          <div className="client-stat-card">
            <div className="client-stat-icon">
              <CalendarDays size={22} />
            </div>

            <div>
              <span>Total Bookings</span>
              <strong>{bookings.length}</strong>
            </div>
          </div>

          <div className="client-stat-card">
            <div className="client-stat-icon">
              <Clock size={22} />
            </div>

            <div>
              <span>Active Bookings</span>
              <strong>{activeBookings.length}</strong>
            </div>
          </div>

          <div className="client-stat-card">
            <div className="client-stat-icon">
              <CheckCircle size={22} />
            </div>

            <div>
              <span>Completed</span>
              <strong>{completedBookings.length}</strong>
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section className="quick-actions">
          <div className="quick-action-card">
            <div>
              <h3>Need a service?</h3>
              <p>Search for skilled workers near your location.</p>
            </div>

            <button onClick={() => navigate("/client/workers")}>
              {t("nav_browse_workers")}
            </button>
          </div>

          <div className="quick-action-card">
            <div>
              <h3>My Bookings</h3>
              <p>View status and details of your booked services.</p>
            </div>

            <button onClick={() => navigate("/client/bookings")}>
              {t("nav_my_bookings")}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ClientDashboard;
