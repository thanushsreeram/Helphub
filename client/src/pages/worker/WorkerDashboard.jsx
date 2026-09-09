import { useEffect, useState } from "react";
import {
  LogOut,
  Briefcase,
  Clock,
  CheckCircle,
  CalendarDays,
  Wrench,
  User,
  Check,
  X,
  Play,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../services/api";
import HelpHubModal from "../../components/common/HelpHubModal";
import LanguageSelector from "../../components/common/LanguageSelector";
import { useLanguage } from "../../context/LanguageContext";
import { handleLogoClick } from "../../utils/navigation";
import "./WorkerDashboard.css";

function WorkerDashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // MODAL STATE
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    variant: "primary",
    bookingId: null,
    action: "",
  });

  const token = localStorage.getItem("helphub_token");

  const fetchBookings = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Server error (${response.status})`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to load bookings");
      }

      setBookings(data.bookings || []);
    } catch (error) {
      console.error("Failed to load bookings:", error);
      if (retryCount < 1) {
        setTimeout(() => fetchBookings(retryCount + 1), 1000);
        return;
      }
      setError(error.message || "Unable to connect to HelpHub server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    fetchBookings();
  }, [token, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("helphub_token");
    localStorage.removeItem("helphub_user");

    navigate("/login");
  };

  const openActionModal = (
    bookingId,
    action,
    title,
    message,
    confirmText,
    variant,
  ) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      confirmText,
      variant,
      bookingId,
      action,
    });
  };

  const closeModal = () => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  };

  const handleModalConfirm = async () => {
    const { bookingId, action } = modalConfig;

    try {
      setActionLoading(bookingId);
      setMessage("");
      setError("");

      const response = await fetch(
        `${API_URL}/api/bookings/${bookingId}/${action}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || `Unable to ${action} booking`);
      }

      setMessage(
        `Booking #${bookingId} ${action === "reject" ? "rejected" : action + "ed"} successfully.`,
      );
      closeModal();
      await fetchBookings();
    } catch (error) {
      console.error(`Booking ${action} error:`, error);
      setError(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // ACCEPT BOOKING (direct action, or prompt modal)
  const handleAccept = async (bookingId) => {
    try {
      setActionLoading(bookingId);
      setMessage("");
      setError("");

      const response = await fetch(
        `${API_URL}/api/bookings/${bookingId}/accept`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to accept booking");
      }

      setMessage(`Booking #${bookingId} accepted successfully.`);

      await fetchBookings();
    } catch (error) {
      console.error("Accept booking error:", error);
      setError(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const activeJobs = bookings.filter((booking) =>
    ["accepted", "committed", "in_progress"].includes(booking.status),
  );

  const completedJobs = bookings.filter(
    (booking) => booking.status === "completed",
  );

  const pendingJobs = bookings.filter(
    (booking) => booking.status === "pending",
  );

  const hasBothAccounts = JSON.parse(
    localStorage.getItem("helphub_has_both_accounts") || "false",
  );

  const handleSwitchToClient = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/auth/switch-role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ target_role: "client" }),
      });

      const data = await response.json();
      if (data.success) {
        localStorage.setItem("helphub_token", data.token);
        localStorage.setItem("helphub_user", JSON.stringify(data.user));
        localStorage.setItem(
          "helphub_roles",
          JSON.stringify(data.roles || []),
        );
        localStorage.setItem(
          "helphub_has_both_accounts",
          JSON.stringify(data.hasBothAccounts || false),
        );
        navigate("/client/dashboard");
      }
    } catch (err) {
      console.error("Role switch error", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-page">
      {/* MODAL */}
      <HelpHubModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        onConfirm={handleModalConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        variant={modalConfig.variant}
        loading={actionLoading === modalConfig.bookingId}
      />

      {/* HEADER */}
      <header className="dashboard-header">
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

        <div className="dashboard-actions">
          {hasBothAccounts && (
            <button
              onClick={handleSwitchToClient}
              className="dashboard-action-button"
              style={{
                background: "#eef2ff",
                color: "#4f46e5",
                borderColor: "#c7d2fe",
              }}
              title="Switch to Client Portal"
            >
              <User size={17} />
              Client Portal
            </button>
          )}

          <button
            onClick={() => navigate("/worker/profile")}
            className="dashboard-action-button"
          >
            {JSON.parse(localStorage.getItem("helphub_user") || "{}")
              ?.avatar_url ? (
              <img
                src={
                  JSON.parse(localStorage.getItem("helphub_user") || "{}")
                    .avatar_url
                }
                alt="Profile"
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <User size={17} />
            )}
            Profile
          </button>

          <button
            onClick={() => navigate("/worker/specialization")}
            className="dashboard-action-button"
          >
            <Wrench size={17} />
            Services
          </button>

          <button
            onClick={() => navigate("/worker/availability")}
            className="dashboard-action-button"
          >
            <CalendarDays size={17} />
            {t("nav_availability")}
          </button>

          <button
            onClick={() => navigate("/worker/jobs")}
            className="dashboard-action-button"
          >
            <Briefcase size={17} />
            {t("nav_my_jobs")}
          </button>

          <button onClick={handleLogout} className="logout-button">
            <LogOut size={18} />
            {t("nav_logout")}
          </button>

          <LanguageSelector />
        </div>
      </header>

      <main className="dashboard-content">
        {/* WELCOME */}
        <section className="dashboard-welcome">
          <h2>Welcome back, Worker 👋</h2>

          <p>Manage your jobs and bookings from here.</p>
        </section>

        {/* SUCCESS MESSAGE */}
        {message && (
          <div className="booking-success-message">
            <CheckCircle size={19} />
            {message}
          </div>
        )}

        {/* ERROR MESSAGE */}
        {error && (
          <div className="dashboard-error-banner">
            <div className="error-banner-content">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
            <button
              className="error-retry-btn"
              onClick={() => fetchBookings(0)}
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? "spin-icon" : ""} />
              {loading ? "Retrying..." : "Retry"}
            </button>
          </div>
        )}

        {/* STATS */}
        <section className="dashboard-stats">
          <div className="stat-card">
            <Briefcase size={24} />

            <div>
              <span>Active Jobs</span>
              <strong>{activeJobs.length} / 3</strong>
            </div>
          </div>

          <div className="stat-card">
            <Clock size={24} />

            <div>
              <span>Pending</span>
              <strong>{pendingJobs.length}</strong>
            </div>
          </div>

          <div className="stat-card">
            <CheckCircle size={24} />

            <div>
              <span>Completed</span>
              <strong>{completedJobs.length}</strong>
            </div>
          </div>
        </section>

        {/* BOOKINGS */}
        <section className="bookings-section">
          <div className="section-header">
            <h2>My Bookings</h2>

            <span>{bookings.length} total</span>
          </div>

          {loading ? (
            <p>Loading bookings...</p>
          ) : bookings.length === 0 ? (
            <div className="empty-state">
              <Briefcase size={40} />

              <h3>No bookings yet</h3>

              <p>Your assigned bookings will appear here.</p>
            </div>
          ) : (
            <div className="booking-list">
              {bookings.map((booking) => (
              <div className="booking-card" key={booking.id}>
  {/* BOOKING INFORMATION */}
  <div className="booking-info">
    <div className="booking-title-row">
      <h3>{booking.service_name}</h3>

      <span className={`status status-${booking.status}`}>
        {booking.status.replace("_", " ")}
      </span>
    </div>

    <p>
      <User size={14} />
      <span>
        <strong>Client:</strong> {booking.client_name}
      </span>
    </p>

    <p>
      <Wrench size={14} />
      <span>
        <strong>Location:</strong> {booking.location}
      </span>
    </p>

    <p>
      <CalendarDays size={14} />
      <span>
        <strong>Date:</strong>{" "}
        {new Date(booking.booking_date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </span>
    </p>

    <p>
      <Clock size={14} />
      <span>
        <strong>Time:</strong>{" "}
        {new Date(booking.booking_date).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </p>

    {booking.description && (
      <p className="booking-description">
        {booking.description}
      </p>
    )}
  </div>

  {/* BOOKING ACTIONS / PRICE */}
  <div className="booking-right">
    <strong className="booking-price">
      ₹{Number(booking.total_cost || 0).toFixed(2)}
    </strong>

    {/* PENDING */}
    {booking.status === "pending" && (
      <>
        <div className="booking-status-label pending-label">
          <Clock size={15} />
          Waiting for Action
        </div>

        <div className="booking-actions">
          <button
            className="accept-booking-button"
            onClick={() => handleAccept(booking.id)}
            disabled={actionLoading === booking.id}
          >
            <Check size={17} />

            {actionLoading === booking.id
              ? "Processing..."
              : "Accept"}
          </button>

          <button
            className="reject-booking-button"
            onClick={() =>
              openActionModal(
                booking.id,
                "reject",
                "Reject Booking",
                "Are you sure you want to reject this booking?",
                "Reject",
                "danger",
              )
            }
            disabled={actionLoading === booking.id}
          >
            <X size={17} />
            Reject
          </button>
        </div>
      </>
    )}

    {/* ACCEPTED */}
    {booking.status === "accepted" && (
      <div className="booking-actions">
        <div className="booking-accepted-label">
          <CheckCircle size={17} />
          Booking Accepted
        </div>

        <button
          type="button"
          className="commit-button"
          onClick={() =>
            openActionModal(
              booking.id,
              "commit",
              "Commit to Job",
              "Are you ready to commit to this job?",
              "Commit to Job",
              "primary",
            )
          }
          disabled={actionLoading === booking.id}
        >
          <CheckCircle size={17} />

          {actionLoading === booking.id
            ? "Committing..."
            : "Commit to Job"}
        </button>
      </div>
    )}

    {/* COMMITTED */}
    {booking.status === "committed" && (
      <div className="booking-actions">
        <div className="booking-accepted-label">
          <CheckCircle size={17} />
          Booking Committed
        </div>

        <button
          type="button"
          className="start-job-button"
          onClick={() =>
            openActionModal(
              booking.id,
              "start",
              "Start Job",
              "Are you ready to start this job?",
              "Start Job",
              "primary",
            )
          }
          disabled={actionLoading === booking.id}
        >
          <Play size={17} />

          {actionLoading === booking.id
            ? "Starting..."
            : "Start Job"}
        </button>
      </div>
    )}

    {/* IN PROGRESS */}
    {booking.status === "in_progress" && (
      <div className="booking-actions">
        <div className="job-progress-label">
          <Clock size={17} />
          Job In Progress
        </div>

        <button
          className="complete-job-button"
          onClick={() =>
            openActionModal(
              booking.id,
              "complete",
              "Complete Job",
              "Are you sure you want to mark this job as completed?",
              "Complete Job",
              "success",
            )
          }
          disabled={actionLoading === booking.id}
        >
          <CheckCircle size={17} />

          {actionLoading === booking.id
            ? "Completing..."
            : "Complete Job"}
        </button>
      </div>
    )}

    {/* COMPLETED */}
    {booking.status === "completed" && (
      <div className="job-completed-label">
        <CheckCircle size={17} />
        Job Completed
      </div>
    )}
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

export default WorkerDashboard;
