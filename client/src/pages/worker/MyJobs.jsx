import { useEffect, useState } from "react";
import {
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Play,
  Check,
  ShieldAlert,
  RefreshCw,
  Star,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../services/api";
import WorkerReviewModal from "../../components/reviews/WorkerReviewModal";
import LanguageSelector from "../../components/common/LanguageSelector";
import { handleLogoClick } from "../../utils/navigation";
import "./MyJobs.css";

function MyJobs() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);

  const token = localStorage.getItem("helphub_token");

  const fetchJobs = async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load jobs");
      }

      setBookings(data.bookings || []);
    } catch (err) {
      console.error("Failed to load jobs:", err);
      setError(err.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleAction = async (bookingId, action) => {
    try {
      setActionLoading(`${action}-${bookingId}`);
      setError("");

      if (action === "emergency-cancel") {
        const reason = window.prompt(
          "Please enter the reason for emergency cancellation:"
        );

        if (!reason || !reason.trim()) {
          setActionLoading(null);
          return;
        }

        const response = await fetch(
          `${API_URL}/api/bookings/${bookingId}/emergency-cancel`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              reason: reason.trim(),
            }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Emergency cancellation failed");
        }

        alert("Emergency cancellation submitted.");
        await fetchJobs();
        return;
      }

      const response = await fetch(`${API_URL}/api/bookings/${bookingId}/${action}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || `Failed to ${action} booking`);
      }

      await fetchJobs();
    } catch (err) {
      console.error(`Booking ${action} error:`, err);
      alert(err.message || `Failed to ${action} booking`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle size={18} />;
      case "cancelled":
      case "rejected":
        return <XCircle size={18} />;
      case "pending":
        return <AlertCircle size={18} />;
      case "committed":
        return <CheckCircle size={18} />;
      case "in_progress":
        return <Play size={18} />;
      default:
        return <Clock size={18} />;
    }
  };

  const getStatusClass = (status) => {
    return `job-status status-${status}`;
  };

  const formatDate = (date) => {
    if (!date) return "Not provided";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="jobs-page">
        <div className="jobs-container">
          <div className="jobs-loading">
            <Briefcase size={40} />
            <h2>Loading your jobs...</h2>
            <p>Please wait.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && bookings.length === 0) {
    return (
      <div className="jobs-page">
        <div className="jobs-container">
          <div className="jobs-error">
            <XCircle size={45} />
            <h2>Unable to load jobs</h2>
            <p>{error}</p>
            <button onClick={fetchJobs} className="back-button">
              <RefreshCw size={18} />
              Try Again
            </button>
            <button
              onClick={() => navigate("/worker/dashboard")}
              className="back-button"
            >
              <ArrowLeft size={18} />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="jobs-page">
      <header className="jobs-header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 onClick={() => handleLogoClick(navigate)} style={{ cursor: "pointer" }} title="Go Back">
            <img
              src="/helphub-logo-transparent.png"
              alt="HelpHub"
              style={{ height: "40px", objectFit: "contain" }}
            />
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            className="back-button"
            onClick={() => navigate("/worker/dashboard")}
          >
            <ArrowLeft size={18} />
            Dashboard
          </button>
          <LanguageSelector />
        </div>
      </header>

      <main className="jobs-container">
        <section className="jobs-intro">
          <div>
            <p className="eyebrow">WORK MANAGEMENT</p>
            <h2>
              <Briefcase size={28} />
              My Jobs
            </h2>
            <p>View and manage all your HelpHub bookings.</p>
          </div>

          <div className="jobs-count">
            <strong>{bookings.length}</strong>
            <span>Total Jobs</span>
          </div>
        </section>

        <div className="jobs-toolbar">
          <button
            className="refresh-button"
            onClick={fetchJobs}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh Jobs
          </button>
        </div>

        {bookings.length === 0 ? (
          <div className="empty-jobs">
            <Briefcase size={55} />
            <h3>No jobs yet</h3>
            <p>When clients book your services, your jobs will appear here.</p>
          </div>
        ) : (
          <section className="jobs-list">
            {bookings.map((booking) => (
              <article className="job-card" key={booking.id}>
                <div className="job-card-top">
                  <div className="job-title">
                    <div className="job-icon">
                      <Briefcase size={22} />
                    </div>
                    <div>
                      <h3>{booking.service_name || "Service"}</h3>
                      <p>Booking #{booking.id}</p>
                    </div>
                  </div>

                  <span className={getStatusClass(booking.status)}>
                    {getStatusIcon(booking.status)}
                    {booking.status.replace("_", " ").toUpperCase()}
                  </span>
                </div>

                <div className="job-details">
                  <div className="job-detail">
                    <span className="detail-icon">
                      <MapPin size={18} />
                    </span>
                    <div>
                      <small>Location</small>
                      <strong>{booking.location || "Not provided"}</strong>
                    </div>
                  </div>

                  <div className="job-detail">
                    <span className="detail-icon">
                      <Calendar size={18} />
                    </span>
                    <div>
                      <small>Date</small>
                      <strong>{formatDate(booking.booking_date)}</strong>
                    </div>
                  </div>

                  <div className="job-detail">
                    <span className="detail-icon">
                      <Clock size={18} />
                    </span>
                    <div>
                      <small>Time</small>
                      <strong>{formatTime(booking.booking_date)}</strong>
                    </div>
                  </div>

                  <div className="job-detail">
                    <span className="detail-icon">👤</span>
                    <div>
                      <small>Client</small>
                      <strong>{booking.client_name || "Client"}</strong>
                    </div>
                  </div>
                </div>

                {booking.description && (
                  <div className="job-description">
                    <small>Job Description</small>
                    <p>{booking.description}</p>
                  </div>
                )}

                <div className="job-amount">
                  <span>Estimated Job Amount</span>
                  <strong>₹{Number(booking.total_cost || 0).toFixed(2)}</strong>
                </div>

                <div className="job-actions">
                  {booking.status === "pending" && (
                    <>
                      <button
                        className="accept-job-button"
                        disabled={actionLoading === `accept-${booking.id}`}
                        onClick={() => handleAction(booking.id, "accept")}
                      >
                        <Check size={17} />
                        {actionLoading === `accept-${booking.id}`
                          ? "Accepting..."
                          : "Accept Job"}
                      </button>

                      <button
                        className="reject-job-button"
                        disabled={actionLoading === `reject-${booking.id}`}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to reject this booking?"
                            )
                          ) {
                            handleAction(booking.id, "reject");
                          }
                        }}
                      >
                        <XCircle size={17} />
                        {actionLoading === `reject-${booking.id}`
                          ? "Rejecting..."
                          : "Reject"}
                      </button>
                    </>
                  )}

                  {booking.status === "committed" && (
                    <button
                      className="start-job-button"
                      disabled={actionLoading === `start-${booking.id}`}
                      onClick={() => handleAction(booking.id, "start")}
                    >
                      <Play size={17} />
                      {actionLoading === `start-${booking.id}`
                        ? "Starting..."
                        : "Start Job"}
                    </button>
                  )}

                  {booking.status === "in_progress" && (
                    <button
                      className="complete-job-button"
                      disabled={actionLoading === `complete-${booking.id}`}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Are you sure you have completed this job?"
                          )
                        ) {
                          handleAction(booking.id, "complete");
                        }
                      }}
                    >
                      <CheckCircle size={17} />
                      {actionLoading === `complete-${booking.id}`
                        ? "Completing..."
                        : "Complete Job"}
                    </button>
                  )}

                  {(booking.status === "committed" ||
                    booking.status === "in_progress") && (
                    <button
                      className="emergency-job-button"
                      disabled={
                        actionLoading === `emergency-cancel-${booking.id}`
                      }
                      onClick={() =>
                        handleAction(booking.id, "emergency-cancel")
                      }
                    >
                      <ShieldAlert size={17} />
                      Emergency Cancel
                    </button>
                  )}

                  {booking.status === "completed" && !booking.has_worker_review && (
                    <button
                      className="rate-client-button"
                      onClick={() => setSelectedBookingForReview(booking)}
                    >
                      <Star size={17} />
                      Rate Client
                    </button>
                  )}

                  <button
                    className="view-job-button"
                    onClick={() => navigate(`/worker/jobs/${booking.id}`)}
                  >
                    View Details
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>

      <WorkerReviewModal
        isOpen={!!selectedBookingForReview}
        onClose={() => setSelectedBookingForReview(null)}
        booking={selectedBookingForReview}
        onReviewSubmitted={() => fetchJobs()}
      />
    </div>
  );
}

export default MyJobs;
