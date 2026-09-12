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
  MapPin,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../services/api";
import HelpHubModal from "../../components/common/HelpHubModal";
import LanguageSelector from "../../components/common/LanguageSelector";
import { useLanguage } from "../../context/LanguageContext";
import { handleLogoClick } from "../../utils/navigation";
import { openGoogleMaps } from "../../utils/maps";
import "./WorkerDashboard.css";

function WorkerDashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [bookings, setBookings] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [apptActionLoading, setApptActionLoading] = useState(null);
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

  // WORK AGREEMENT MODAL STATE (Post-Appointment Work Decision)
  const [agreementModal, setAgreementModal] = useState({
    isOpen: false,
    appointment: null,
    agreedAmount: "",
    agreedNotes: "",
    submitting: false,
    error: "",
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

  const fetchAppointments = async () => {
    try {
      setAppointmentsLoading(true);
      const response = await fetch(`${API_URL}/api/appointments/worker`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAppointments(data.appointments || []);
        }
      }
    } catch (err) {
      console.error("Fetch worker appointments error:", err);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const handleAcceptAppointment = async (apptId) => {
    try {
      setApptActionLoading(`accept-${apptId}`);
      setMessage("");
      setError("");

      const response = await fetch(
        `${API_URL}/api/appointments/${apptId}/accept`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to accept appointment");
      }

      setMessage("Appointment accepted successfully! The client will see the updated status.");
      await fetchAppointments();
    } catch (err) {
      console.error("Accept appointment error:", err);
      setError(err.message || "Failed to accept appointment");
    } finally {
      setApptActionLoading(null);
    }
  };

  const handleRejectAppointment = async (apptId) => {
    if (!window.confirm("Are you sure you want to reject this appointment request?")) {
      return;
    }

    try {
      setApptActionLoading(`reject-${apptId}`);
      setMessage("");
      setError("");

      const response = await fetch(
        `${API_URL}/api/appointments/${apptId}/reject`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to reject appointment");
      }

      setMessage("Appointment request rejected.");
      await fetchAppointments();
    } catch (err) {
      console.error("Reject appointment error:", err);
      setError(err.message || "Failed to reject appointment");
    } finally {
      setApptActionLoading(null);
    }
  };

  // POST-APPOINTMENT WORK DECISION: REFUSE WORK
  const handleRefuseWork = async (apptId) => {
    if (
      !window.confirm(
        "Are you sure you want to refuse this work? This decision means the project will NOT start and the client will be informed.",
      )
    ) {
      return;
    }

    try {
      setApptActionLoading(`refuse-${apptId}`);
      setMessage("");
      setError("");

      const response = await fetch(
        `${API_URL}/api/appointments/${apptId}/work-decision`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ decision: "refused" }),
        },
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to submit work refusal");
      }

      setMessage("Work decision recorded: Work Refused. Client has been notified.");
      await fetchAppointments();
    } catch (err) {
      console.error("Refuse work error:", err);
      setError(err.message || "Failed to refuse work");
    } finally {
      setApptActionLoading(null);
    }
  };

  // POST-APPOINTMENT WORK DECISION: OPEN ACCEPT WORK MODAL
  const openAcceptWorkModal = (appt) => {
    setAgreementModal({
      isOpen: true,
      appointment: appt,
      agreedAmount: "",
      agreedNotes: appt.description ? `Based on consultation: ${appt.description}` : "",
      submitting: false,
      error: "",
    });
  };

  // POST-APPOINTMENT WORK DECISION: SUBMIT ACCEPT WORK AGREEMENT
  const submitAcceptWork = async (e) => {
    e.preventDefault();
    const appt = agreementModal.appointment;
    if (!appt) return;

    const amount = Number(agreementModal.agreedAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setAgreementModal((prev) => ({
        ...prev,
        error: "Please enter a valid positive agreed amount (₹)",
      }));
      return;
    }

    try {
      setAgreementModal((prev) => ({ ...prev, submitting: true, error: "" }));

      const response = await fetch(
        `${API_URL}/api/appointments/${appt.id}/work-decision`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            decision: "accepted",
            agreed_amount: amount,
            agreed_notes: agreementModal.agreedNotes,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to submit work agreement");
      }

      setMessage(
        `Work agreement created for ₹${amount}! The client must now pay the agreed amount to activate the project.`,
      );
      setAgreementModal({
        isOpen: false,
        appointment: null,
        agreedAmount: "",
        agreedNotes: "",
        submitting: false,
        error: "",
      });
      await fetchAppointments();
    } catch (err) {
      console.error("Accept work error:", err);
      setAgreementModal((prev) => ({
        ...prev,
        submitting: false,
        error: err.message || "Failed to submit work agreement",
      }));
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    fetchBookings();
    fetchAppointments();
  }, [token, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("helphub_token");
    localStorage.removeItem("helphub_user");
    localStorage.removeItem("helphub_roles");
    localStorage.removeItem("helphub_has_both_accounts");
    localStorage.removeItem("helphub_registered_email");

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

        {/* APPOINTMENT REQUESTS SECTION */}
        <section className="appointments-section">
          <div className="section-header">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <CalendarDays size={22} color="#2563eb" />
              <h2 style={{ margin: 0 }}>Appointment Requests</h2>
            </div>
            <span>{appointments.length} total requests</span>
          </div>

          {appointmentsLoading ? (
            <p className="loading-text">Loading appointment requests...</p>
          ) : appointments.length === 0 ? (
            <div className="empty-state" style={{ padding: "30px 20px" }}>
              <CalendarDays size={36} />
              <h3>No appointment requests</h3>
              <p>When clients request an initial consultation/meeting, it will appear here.</p>
            </div>
          ) : (
            <div className="worker-appointment-list">
              {appointments.map((appt) => (
                <div className="worker-appointment-card" key={appt.id}>
                  <div className="appt-card-top">
                    <div className="appt-client-info">
                      <div className="appt-client-avatar">
                        {appt.client_avatar_url ? (
                          <img src={appt.client_avatar_url} alt={appt.client_name} />
                        ) : (
                          <User size={18} />
                        )}
                      </div>
                      <div>
                        <h3>{appt.client_name}</h3>
                        {appt.service_name && <p className="appt-service">{appt.service_name}</p>}
                      </div>
                    </div>

                    <span className={`status status-${appt.status}`}>
                      {appt.status === "pending"
                        ? "Pending Response"
                        : appt.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="appt-details">
                    <p>
                      <CalendarDays size={14} />
                      <span>
                        <strong>Date:</strong>{" "}
                        {new Date(appt.appointment_date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </p>

                    <p>
                      <Clock size={14} />
                      <span>
                        <strong>Preferred Time:</strong> {appt.appointment_time?.slice(0, 5)}
                      </span>
                    </p>

                    <p className="booking-location-row">
                      <MapPin size={14} className="location-icon" />
                      <span className="booking-location-text">
                        <strong>Meeting Location:</strong> {appt.location}
                      </span>
                      {appt.location && (
                        <button
                          type="button"
                          className="view-location-link-btn"
                          onClick={(e) => openGoogleMaps(appt.location, e)}
                          title="Open in Google Maps"
                        >
                          <ExternalLink size={12} />
                          View on Map
                        </button>
                      )}
                    </p>

                    {appt.client_phone && (
                      <p>
                        <User size={14} />
                        <span>
                          <strong>Client Phone:</strong> {appt.client_phone}
                        </span>
                      </p>
                    )}
                  </div>

                  {appt.description && (
                    <div className="booking-description">
                      <strong>Client Note:</strong> {appt.description}
                    </div>
                  )}

                  <div className="appt-card-actions">
                    {appt.status === "pending" && (
                      <div className="booking-actions" style={{ width: "100%" }}>
                        <button
                          className="accept-booking-button"
                          onClick={() => handleAcceptAppointment(appt.id)}
                          disabled={apptActionLoading === `accept-${appt.id}`}
                        >
                          <Check size={16} />
                          {apptActionLoading === `accept-${appt.id}`
                            ? "Accepting..."
                            : "Accept Appointment"}
                        </button>

                        <button
                          className="reject-booking-button"
                          onClick={() => handleRejectAppointment(appt.id)}
                          disabled={apptActionLoading === `reject-${appt.id}`}
                        >
                          <X size={16} />
                          {apptActionLoading === `reject-${appt.id}`
                            ? "Rejecting..."
                            : "Reject"}
                        </button>
                      </div>
                    )}

                    {/* STATUS: APPOINTMENT ACCEPTED (Meeting Confirmed - Worker must decide on actual work) */}
                    {appt.status === "accepted" && (
                      <div className="work-decision-box" style={{ width: "100%" }}>
                        <div className="work-decision-header">
                          <CheckCircle size={15} color="#16a34a" />
                          <span>Appointment Accepted (Meeting Set)</span>
                        </div>
                        <p className="work-decision-instruction">
                          <strong>After Meeting — Work Decision:</strong><br />
                          Did you and the client agree to proceed with the actual work?
                        </p>
                        <div className="work-decision-buttons">
                          <button
                            type="button"
                            className="accept-work-btn"
                            onClick={() => openAcceptWorkModal(appt)}
                            disabled={apptActionLoading === `refuse-${appt.id}`}
                          >
                            <Check size={16} />
                            Accept Work
                          </button>

                          <button
                            type="button"
                            className="refuse-work-btn"
                            onClick={() => handleRefuseWork(appt.id)}
                            disabled={apptActionLoading === `refuse-${appt.id}`}
                          >
                            <X size={16} />
                            {apptActionLoading === `refuse-${appt.id}` ? "Refusing..." : "Refuse Work"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STATUS: PAYMENT PENDING (Worker accepted work, waiting for client initial payment) */}
                    {appt.status === "payment_pending" && (
                      <div className="work-agreement-pending-box" style={{ width: "100%" }}>
                        <div className="agreement-badge-row">
                          <Clock size={16} color="#d97706" />
                          <strong>Agreement Set — Payment Pending</strong>
                        </div>
                        <div className="agreement-details-snippet">
                          <span>Agreed Amount: <strong>₹{appt.agreed_amount}</strong></span>
                          {appt.agreed_notes && <small>Notes: {appt.agreed_notes}</small>}
                        </div>
                        <p className="waiting-payment-text">
                          Waiting for client to pay the agreed amount. Project will become ACTIVE once payment is complete.
                        </p>
                      </div>
                    )}

                    {/* STATUS: WORK REFUSED */}
                    {appt.status === "work_refused" && (
                      <div className="work-refused-label" style={{ width: "100%" }}>
                        <X size={16} />
                        Work Refused (No project created)
                      </div>
                    )}

                    {/* STATUS: PROJECT ACTIVE */}
                    {appt.status === "project_active" && (
                      <div className="project-active-box" style={{ width: "100%" }}>
                        <div className="project-active-badge">
                          <CheckCircle size={16} />
                          Project ACTIVE
                        </div>
                        <span className="project-agreed-amount">Agreed: ₹{appt.agreed_amount}</span>
                        {appt.booking_id && (
                          <button
                            type="button"
                            className="view-active-job-btn"
                            onClick={() => navigate(`/worker/jobs/${appt.booking_id}`)}
                          >
                            View Job Details
                          </button>
                        )}
                      </div>
                    )}

                    {appt.status === "rejected" && (
                      <div className="status status-rejected" style={{ width: "100%", textAlign: "center", padding: "8px" }}>
                        Appointment Rejected
                      </div>
                    )}

                    {appt.status === "cancelled" && (
                      <div className="status status-cancelled" style={{ width: "100%", textAlign: "center", padding: "8px" }}>
                        Cancelled by Client
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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

    <p className="booking-location-row">
      <MapPin size={14} className="location-icon" />
      <span className="booking-location-text">
        <strong>Job Location:</strong> {booking.location || "Not provided"}
      </span>
      {booking.location && (
        <button
          type="button"
          className="view-location-link-btn"
          onClick={(e) => openGoogleMaps(booking.location, e)}
          title="Open in Google Maps"
        >
          <ExternalLink size={12} />
          View on Map
        </button>
      )}
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

        <button
          type="button"
          className="view-job-button"
          style={{ padding: "8px 12px", fontSize: "13px" }}
          onClick={() => navigate(`/worker/jobs/${booking.id}`)}
        >
          Manage Job
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

        <button
          type="button"
          className="view-job-button"
          style={{ padding: "8px 12px", fontSize: "13px" }}
          onClick={() => navigate(`/worker/jobs/${booking.id}`)}
        >
          Manage Job
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

      {/* WORK AGREEMENT MODAL (Post-Appointment Work Decision: Accept Work) */}
      {agreementModal.isOpen && agreementModal.appointment && (
        <div className="agreement-modal-backdrop" onClick={() => !agreementModal.submitting && setAgreementModal((prev) => ({ ...prev, isOpen: false }))}>
          <div className="agreement-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="agreement-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <CheckCircle size={22} color="#16a34a" />
                <h3>Work Agreement & Pricing</h3>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => !agreementModal.submitting && setAgreementModal((prev) => ({ ...prev, isOpen: false }))}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitAcceptWork}>
              <div className="agreement-modal-body">
                <p className="agreement-notice">
                  You are agreeing to take this job for <strong>{agreementModal.appointment.client_name}</strong>.
                  Please establish the actual agreed project price and work details discussed during your meeting.
                </p>

                {agreementModal.error && (
                  <div className="agreement-modal-error">
                    <AlertTriangle size={16} />
                    <span>{agreementModal.error}</span>
                  </div>
                )}

                <div className="agreement-prefill-grid">
                  <div>
                    <label>Client</label>
                    <p>{agreementModal.appointment.client_name}</p>
                  </div>
                  <div>
                    <label>Service</label>
                    <p>{agreementModal.appointment.service_name || "General Service"}</p>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <label>Location</label>
                    <p>{agreementModal.appointment.location}</p>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: "16px" }}>
                  <label htmlFor="agreed-amount-input">
                    Agreed Project Amount (₹) <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div className="amount-input-wrapper">
                    <span className="currency-prefix">₹</span>
                    <input
                      id="agreed-amount-input"
                      type="number"
                      min="1"
                      step="any"
                      placeholder="e.g. 1500"
                      value={agreementModal.agreedAmount}
                      onChange={(e) =>
                        setAgreementModal((prev) => ({
                          ...prev,
                          agreedAmount: e.target.value,
                          error: "",
                        }))
                      }
                      required
                      autoFocus
                    />
                  </div>
                  <small style={{ color: "#64748b", marginTop: "4px", display: "block" }}>
                    The client will pay this exact amount to activate the project.
                  </small>
                </div>

                <div className="form-group" style={{ marginTop: "16px" }}>
                  <label htmlFor="agreed-notes-input">
                    Agreed Work Details / Materials Scope
                  </label>
                  <textarea
                    id="agreed-notes-input"
                    rows={3}
                    placeholder="Specify agreed tasks, materials provided by client/worker, completion timeline..."
                    value={agreementModal.agreedNotes}
                    onChange={(e) =>
                      setAgreementModal((prev) => ({
                        ...prev,
                        agreedNotes: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="agreement-modal-footer">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setAgreementModal((prev) => ({ ...prev, isOpen: false }))}
                  disabled={agreementModal.submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="confirm-agreement-btn"
                  disabled={agreementModal.submitting}
                >
                  <Check size={16} />
                  {agreementModal.submitting ? "Submitting Agreement..." : "Submit Agreement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkerDashboard;
