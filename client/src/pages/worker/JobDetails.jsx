import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  User,
  IndianRupee,
  Play,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Star,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { API_URL } from "../../services/api";
import HelpHubModal from "../../components/common/HelpHubModal";
import WorkerReviewModal from "../../components/reviews/WorkerReviewModal";
import LanguageSelector from "../../components/common/LanguageSelector";
import { handleLogoClick } from "../../utils/navigation";
import "./JobDetails.css";

function JobDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  // MODAL STATE
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    variant: "primary",
    action: "",
    body: null,
    requireReason: false,
  });
  const [reasonText, setReasonText] = useState("");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const token = localStorage.getItem("helphub_token");

  const fetchBooking = async () => {
    try {
      setError("");

      const response = await fetch(
        `${API_URL}/api/bookings/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load job");
      }

      setBooking(data.booking);
    } catch (error) {
      console.error("Failed to load job:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    fetchBooking();
  }, [id]);

  const openActionModal = (
    action,
    title,
    message,
    confirmText = "Confirm",
    variant = "primary",
    requireReason = false,
    body = null
  ) => {
    setReasonText("");
    setModalConfig({
      isOpen: true,
      title,
      message,
      confirmText,
      variant,
      action,
      body,
      requireReason,
    });
  };

  const closeModal = () => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
    setReasonText("");
  };

  const handleModalConfirm = async () => {
    const { action, body, requireReason } = modalConfig;

    let payload = body;
    if (requireReason) {
      if (!reasonText.trim()) {
        return;
      }
      payload = { reason: reasonText.trim() };
    }

    setActionLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/bookings/${id}/${action}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          ...(payload && {
            body: JSON.stringify(payload),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Action failed");
      }

      setBooking(data.booking);
      closeModal();
    } catch (error) {
      console.error(`Job ${action} error:`, error);
      setError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDateTime = (dateValue) => {
    if (!dateValue) {
      return "Not available";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }

    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatStatus = (status) => {
    if (!status) return "Unknown";

    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  if (loading) {
    return (
      <div className="job-details-page">
        <div className="job-details-loading">
          <Clock size={42} />
          <h2>Loading job...</h2>
          <p>Please wait while we load the booking details.</p>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="job-details-page">
        <div className="job-details-error">
          <AlertTriangle size={45} />

          <h2>Unable to load job</h2>

          <p>{error}</p>

          <button
            className="back-button"
            onClick={() => navigate("/worker/jobs")}
          >
            <ArrowLeft size={18} />
            Back to My Jobs
          </button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  return (
    <div className="job-details-page">
      {/* MODAL */}
      <HelpHubModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        onConfirm={handleModalConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        variant={modalConfig.variant}
        loading={actionLoading}
        requireReason={modalConfig.requireReason}
        reasonValue={reasonText}
        onReasonChange={setReasonText}
        reasonPlaceholder="Specify details for emergency cancellation..."
      />

      {/* HEADER */}
      <header className="job-details-header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 onClick={() => handleLogoClick(navigate)} style={{ cursor: "pointer" }} title="Go Back">
            <img src="/helphub-logo-transparent.png" alt="HelpHub" style={{ height: "40px", objectFit: "contain" }} />
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            className="back-button"
            onClick={() => navigate("/worker/jobs")}
          >
            <ArrowLeft size={18} />
            My Jobs
          </button>
          <LanguageSelector />
        </div>
      </header>

      <main className="job-details-container">
        {/* TOP SECTION */}
        <section className="job-details-top">
          <div>
            <p className="job-eyebrow">
              BOOKING #{booking.id}
            </p>

            <h2>{booking.service_name}</h2>

            <p className="job-subtitle">
              Review the booking information and manage this job.
            </p>
          </div>

          <span
            className={`large-status status-${booking.status}`}
          >
            {formatStatus(booking.status)}
          </span>
        </section>

        {/* ERROR */}
        {error && (
          <div className="action-error">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* MAIN GRID */}
        <div className="job-details-grid">
          {/* JOB INFORMATION */}
          <section className="details-card">
            <div className="card-title">
              <Briefcase size={20} />
              <h3>Job Information</h3>
            </div>

            <div className="details-list">
              {/* CLIENT */}
              <div className="detail-row">
                <div className="detail-icon">
                  <User size={19} />
                </div>

                <div>
                  <small>Client</small>

                  <strong>
                    {booking.client_name || "Not available"}
                  </strong>
                </div>
              </div>

              {/* LOCATION */}
              <div className="detail-row">
                <div className="detail-icon">
                  <MapPin size={19} />
                </div>

                <div>
                  <small>Location</small>

                  <strong>
                    {booking.location || "Not provided"}
                  </strong>
                </div>
              </div>

              {/* BOOKING DATE */}
              <div className="detail-row">
                <div className="detail-icon">
                  <Calendar size={19} />
                </div>

                <div>
                  <small>Booking Date & Time</small>

                  <strong>
                    {formatDateTime(booking.booking_date)}
                  </strong>
                </div>
              </div>

              {/* CREATED DATE */}
              {booking.created_at && (
                <div className="detail-row">
                  <div className="detail-icon">
                    <Clock size={19} />
                  </div>

                  <div>
                    <small>Booking Created</small>

                    <strong>
                      {formatDateTime(booking.created_at)}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* PAYMENT */}
          <section className="details-card">
            <div className="card-title">
              <IndianRupee size={20} />
              <h3>Payment Details</h3>
            </div>

            <div className="payment-list">
              <div>
                <span>Labour Cost</span>

                <strong>
                  ₹
                  {Number(
                    booking.labour_cost || 0
                  ).toFixed(2)}
                </strong>
              </div>

              <div>
                <span>Material Cost</span>

                <strong>
                  ₹
                  {Number(
                    booking.material_cost || 0
                  ).toFixed(2)}
                </strong>
              </div>

              <div>
                <span>Travel Charge</span>

                <strong>
                  ₹
                  {Number(
                    booking.travel_charge || 0
                  ).toFixed(2)}
                </strong>
              </div>

              <div className="total-row">
                <span>Total</span>

                <strong>
                  ₹
                  {Number(
                    booking.total_cost || 0
                  ).toFixed(2)}
                </strong>
              </div>
            </div>
          </section>
        </div>

        {/* DESCRIPTION */}
        <section className="details-card description-card">
          <div className="card-title">
            <Briefcase size={20} />
            <h3>Job Description</h3>
          </div>

          <p>
            {booking.description ||
              "No additional description was provided by the client."}
          </p>
        </section>

        {/* JOB ACTIONS */}
        <section className="job-actions">
          <div className="actions-heading">
            <div>
              <h3>Job Actions</h3>

              <p>
                Manage this booking according to its current status.
              </p>
            </div>

            <button
              className="refresh-button"
              disabled={actionLoading}
              onClick={fetchBooking}
            >
              <RefreshCw size={17} />
              Refresh
            </button>
          </div>

          <div className="action-buttons">
            {/* PENDING */}
            {booking.status === "pending" && (
              <>
                <button
                  className="accept-button"
                  disabled={actionLoading}
                  onClick={() =>
                    openActionModal(
                      "accept",
                      "Accept Booking",
                      "Accept this job?\n\nOnce accepted, you are committed to completing the booking unless a legitimate emergency cancellation is required.",
                      "Accept Job",
                      "success"
                    )
                  }
                >
                  <CheckCircle size={19} />
                  {actionLoading ? "Processing..." : "Accept Job"}
                </button>

                <button
                  className="reject-button"
                  disabled={actionLoading}
                  onClick={() =>
                    openActionModal(
                      "reject",
                      "Reject Job",
                      "Are you sure you want to reject this booking request?",
                      "Reject Job",
                      "danger"
                    )
                  }
                >
                  <XCircle size={19} />
                  Reject Job
                </button>
              </>
            )}

            {/* ACCEPTED - LEGACY SUPPORT */}
            {booking.status === "accepted" && (
              <button
                className="commit-button"
                disabled={actionLoading}
                onClick={() =>
                  openActionModal(
                    "commit",
                    "Commit to Job",
                    "Commit to starting this job?",
                    "Commit",
                    "primary"
                  )
                }
              >
                <CheckCircle size={19} />
                {actionLoading ? "Processing..." : "Commit to Job"}
              </button>
            )}

            {/* COMMITTED */}
            {booking.status === "committed" && (
              <>
                <button
                  className="start-button"
                  disabled={actionLoading}
                  onClick={() =>
                    openActionModal(
                      "start",
                      "Start Job",
                      "Are you ready to start work on this booking now?",
                      "Start Job",
                      "primary"
                    )
                  }
                >
                  <Play size={19} />
                  {actionLoading ? "Starting..." : "Start Job"}
                </button>

                <button
                  className="emergency-button"
                  disabled={actionLoading}
                  onClick={() =>
                    openActionModal(
                      "emergency-cancel",
                      "Emergency Cancellation",
                      "Emergency cancellation should only be used for unexpected emergencies. Please state the reason below:",
                      "Request Emergency Cancel",
                      "danger",
                      true
                    )
                  }
                >
                  <AlertTriangle size={19} />
                  Emergency Cancel
                </button>
              </>
            )}

            {/* IN PROGRESS */}
            {booking.status === "in_progress" && (
              <>
                <button
                  className="complete-button"
                  disabled={actionLoading}
                  onClick={() =>
                    openActionModal(
                      "complete",
                      "Complete Job",
                      "Mark this job as completed?\n\nEnsure all service tasks have been completed to satisfaction before proceeding.",
                      "Mark Completed",
                      "success"
                    )
                  }
                >
                  <CheckCircle size={19} />
                  {actionLoading ? "Completing..." : "Complete Job"}
                </button>

                <button
                  className="emergency-button"
                  disabled={actionLoading}
                  onClick={() =>
                    openActionModal(
                      "emergency-cancel",
                      "Emergency Cancellation",
                      "Emergency cancellation should only be used for unexpected emergencies. Please state the reason below:",
                      "Request Emergency Cancel",
                      "danger",
                      true
                    )
                  }
                >
                  <AlertTriangle size={19} />
                  Emergency Cancel
                </button>
              </>
            )}

            {/* COMPLETED */}
            {booking.status === "completed" && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <div className="completed-message">
                  <CheckCircle size={21} />

                  <div>
                    <strong>Job Completed</strong>
                    <span>This job has been completed successfully.</span>
                  </div>
                </div>

                {!booking.has_worker_review ? (
                  <button
                    className="rate-client-button"
                    onClick={() => setIsReviewModalOpen(true)}
                  >
                    <Star size={19} />
                    Rate & Review Client
                  </button>
                ) : (
                  <div className="client-reviewed-badge">
                    <CheckCircle size={18} />
                    <span>Client Reviewed</span>
                  </div>
                )}
              </div>
            )}

            {/* CANCELLED */}
            {booking.status === "cancelled" && (
              <div className="cancelled-message">
                <XCircle size={21} />

                <div>
                  <strong>Booking Cancelled</strong>
                  <span>This booking has been cancelled.</span>
                </div>
              </div>
            )}

            {/* REJECTED */}
            {booking.status === "rejected" && (
              <div className="cancelled-message">
                <XCircle size={21} />

                <div>
                  <strong>Job Rejected</strong>
                  <span>This booking was rejected.</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* WORKFLOW */}
        <section className="details-card workflow-card">
          <div className="card-title">
            <CheckCircle size={20} />
            <h3>Job Workflow</h3>
          </div>

          <div className="workflow-steps">
            <div
              className={`workflow-step ${
                [
                  "pending",
                  "committed",
                  "in_progress",
                  "completed",
                ].includes(booking.status)
                  ? "active"
                  : ""
              }`}
            >
              <span>1</span>

              <div>
                <strong>Pending</strong>
                <small>Client creates booking</small>
              </div>
            </div>

            <div
              className={`workflow-step ${
                [
                  "committed",
                  "in_progress",
                  "completed",
                ].includes(booking.status)
                  ? "active"
                  : ""
              }`}
            >
              <span>2</span>

              <div>
                <strong>Committed</strong>
                <small>Worker accepts the job</small>
              </div>
            </div>

            <div
              className={`workflow-step ${
                ["in_progress", "completed"].includes(
                  booking.status
                )
                  ? "active"
                  : ""
              }`}
            >
              <span>3</span>

              <div>
                <strong>In Progress</strong>
                <small>Worker starts the job</small>
              </div>
            </div>

            <div
              className={`workflow-step ${
                booking.status === "completed"
                  ? "active"
                  : ""
              }`}
            >
              <span>4</span>

              <div>
                <strong>Completed</strong>
                <small>Worker finishes the job</small>
              </div>
            </div>
          </div>
        </section>
      </main>

      <WorkerReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        booking={booking}
        onReviewSubmitted={() => {
          fetchBooking();
        }}
      />
    </div>
  );
}

export default JobDetails;
