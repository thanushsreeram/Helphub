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
  ExternalLink,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { API_URL } from "../../services/api";
import HelpHubModal from "../../components/common/HelpHubModal";
import WorkerReviewModal from "../../components/reviews/WorkerReviewModal";
import LanguageSelector from "../../components/common/LanguageSelector";
import { handleLogoClick } from "../../utils/navigation";
import { openGoogleMaps } from "../../utils/maps";
import "./JobDetails.css";

function JobDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ADDITIONAL MONEY REQUEST STATE
  const [additionalMoneyRequests, setAdditionalMoneyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [isAddMoneyModalOpen, setIsAddMoneyModalOpen] = useState(false);
  const [addMoneyAmount, setAddMoneyAmount] = useState("");
  const [addMoneyReason, setAddMoneyReason] = useState("");
  const [addMoneySubmitting, setAddMoneySubmitting] = useState(false);
  const [addMoneyError, setAddMoneyError] = useState("");

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

  const fetchAdditionalMoneyRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await fetch(`${API_URL}/api/additional-money/booking/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAdditionalMoneyRequests(data.requests || []);
        }
      }
    } catch (err) {
      console.error("Fetch additional money requests error:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchBooking = async () => {
    try {
      setError("");

      const response = await fetch(`${API_URL}/api/bookings/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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
    fetchAdditionalMoneyRequests();
  }, [id]);

  const handleOpenAddMoneyModal = () => {
    setAddMoneyAmount("");
    setAddMoneyReason("");
    setAddMoneyError("");
    setIsAddMoneyModalOpen(true);
  };

  const handleSubmitAddMoneyRequest = async (e) => {
    e.preventDefault();
    setAddMoneyError("");

    const numAmount = Number(addMoneyAmount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      setAddMoneyError("Please enter a valid positive additional amount (₹)");
      return;
    }

    if (!addMoneyReason.trim()) {
      setAddMoneyError("Please provide a reason for the additional money request");
      return;
    }

    try {
      setAddMoneySubmitting(true);
      const res = await fetch(`${API_URL}/api/additional-money/request/${id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requested_amount: numAmount,
          reason: addMoneyReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to submit request");
      }

      setIsAddMoneyModalOpen(false);
      setSuccessMessage(`Additional money request for ₹${numAmount.toLocaleString("en-IN")} submitted! Waiting for client review.`);
      await fetchAdditionalMoneyRequests();
      await fetchBooking();
    } catch (err) {
      console.error("Submit add money request error:", err);
      setAddMoneyError(err.message || "Failed to submit request");
    } finally {
      setAddMoneySubmitting(false);
    }
  };

  const openActionModal = (
    action,
    title,
    message,
    confirmText = "Confirm",
    variant = "primary",
    requireReason = false,
    body = null,
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
      const response = await fetch(`${API_URL}/api/bookings/${id}/${action}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(payload && {
          body: JSON.stringify(payload),
        }),
      });

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
            <p className="job-eyebrow">BOOKING #{booking.id}</p>

            <h2>{booking.service_name}</h2>

            <p className="job-subtitle">
              Review the booking information and manage this job.
            </p>
          </div>

          <span className={`large-status status-${booking.status}`}>
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

        {/* SUCCESS */}
        {successMessage && (
          <div className="action-success" style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "#ecfdf5",
            color: "#047857",
            border: "1px solid #a7f3d0",
            borderRadius: "10px",
            padding: "13px 16px",
            marginBottom: "20px",
            fontSize: "14px",
            fontWeight: "600",
          }}>
            <CheckCircle size={18} />
            <span>{successMessage}</span>
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

                  <strong>{booking.client_name || "Not available"}</strong>
                </div>
              </div>

              {/* LOCATION */}
              <div className="detail-row detail-row-location">
                <div className="detail-icon">
                  <MapPin size={19} />
                </div>

                <div className="detail-content-location">
                  <small>Job Location (Client Address)</small>
                  <strong>{booking.location || "Not provided"}</strong>
                  {booking.location && (
                    <button
                      type="button"
                      className="job-navigate-btn"
                      onClick={(e) => openGoogleMaps(booking.location, e)}
                      title="Open in Google Maps for navigation"
                    >
                      <MapPin size={15} />
                      <span>View on Google Maps</span>
                      <ExternalLink size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* BOOKING DATE */}
              <div className="detail-row">
                <div className="detail-icon">
                  <Calendar size={19} />
                </div>

                <div>
                  <small>Booking Date & Time</small>

                  <strong>{formatDateTime(booking.booking_date)}</strong>
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

                    <strong>{formatDateTime(booking.created_at)}</strong>
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

                <strong>₹{Number(booking.labour_cost || 0).toFixed(2)}</strong>
              </div>

              <div>
                <span>Material Cost</span>

                <strong>
                  ₹{Number(booking.material_cost || 0).toFixed(2)}
                </strong>
              </div>

              <div>
                <span>Travel Charge</span>

                <strong>
                  ₹{Number(booking.travel_charge || 0).toFixed(2)}
                </strong>
              </div>

              <div className="total-row">
                <span>Total</span>

                <strong>₹{Number(booking.total_cost || 0).toFixed(2)}</strong>
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

              <p>Manage this booking according to its current status.</p>
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
                      "success",
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
                      "danger",
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
                    "primary",
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
                  type="button"
                  className="start-button"
                  disabled={loading}
                  onClick={() =>
                    openAction(
                      "start",
                      "Start Job",
                      "Are you ready to start work on this booking now?",
                      "Start Job",
                      "primary",
                    )
                  }
                >
                  <Play size={19} />
                  {actionLoading ? "Starting..." : "Start Job"}
                </button>

                <button
                  type="button"
                  className="request-add-money-button"
                  onClick={handleOpenAddMoneyModal}
                  disabled={actionLoading}
                >
                  <IndianRupee size={18} />
                  Request Additional Money
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
                      true,
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
                      "success",
                    )
                  }
                >
                  <CheckCircle size={19} />
                  {actionLoading ? "Completing..." : "Complete Job"}
                </button>

                <button
                  type="button"
                  className="request-add-money-button"
                  onClick={handleOpenAddMoneyModal}
                  disabled={actionLoading}
                >
                  <IndianRupee size={18} />
                  Request Additional Money
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
                      true,
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
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

        {/* ADDITIONAL MONEY REQUESTS HISTORY */}
        <section className="details-card additional-money-history-card">
          <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <IndianRupee size={20} color="#2563eb" />
              <h3>Additional Money Requests</h3>
            </div>
            {["committed", "in_progress"].includes(booking.status) && (
              <button
                type="button"
                className="add-money-trigger-btn"
                onClick={handleOpenAddMoneyModal}
              >
                + Request Additional Money
              </button>
            )}
          </div>

          {loadingRequests ? (
            <p className="loading-requests-text">Loading request history...</p>
          ) : additionalMoneyRequests.length === 0 ? (
            <div className="empty-requests-state">
              <IndianRupee size={32} color="#94a3b8" />
              <p>No additional money requests made for this job.</p>
              {["committed", "in_progress"].includes(booking.status) && (
                <small>If extra work or materials are required, you can send a formal request to the client.</small>
              )}
            </div>
          ) : (
            <div className="requests-history-list">
              {additionalMoneyRequests.map((req, idx) => (
                <div className={`request-history-card status-${req.status}`} key={req.id}>
                  <div className="request-card-header">
                    <div className="request-amount-badge">
                      <span>Request #{idx + 1}:</span>
                      <strong>+ ₹{Number(req.requested_amount).toLocaleString("en-IN")}</strong>
                    </div>

                    <span className={`request-status-pill pill-${req.status}`}>
                      {req.status === "pending" && "Waiting for Client"}
                      {req.status === "payment_pending" && "Payment Pending"}
                      {req.status === "paid" && "Paid & Approved"}
                      {req.status === "rejected" && "Rejected"}
                      {req.status === "cancelled" && "Cancelled"}
                    </span>
                  </div>

                  <div className="request-card-reason">
                    <small>Reason:</small>
                    <p>{req.reason}</p>
                  </div>

                  <div className="request-card-footer">
                    <span className="request-date">
                      Requested on {new Date(req.created_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                    {req.status === "paid" && req.paid_at && (
                      <span className="request-paid-date">
                        Paid on {new Date(req.paid_at).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
                ["pending", "committed", "in_progress", "completed"].includes(
                  booking.status,
                )
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
                ["committed", "in_progress", "completed"].includes(
                  booking.status,
                )
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
                ["in_progress", "completed"].includes(booking.status)
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
                booking.status === "completed" ? "active" : ""
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

      {/* REQUEST ADDITIONAL MONEY MODAL */}
      {isAddMoneyModalOpen && (
        <div
          className="add-money-modal-backdrop"
          onClick={() => !addMoneySubmitting && setIsAddMoneyModalOpen(false)}
        >
          <div
            className="add-money-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="add-money-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <IndianRupee size={22} color="#2563eb" />
                <h3>Request Additional Money</h3>
              </div>
              <button
                type="button"
                className="close-add-money-btn"
                onClick={() => !addMoneySubmitting && setIsAddMoneyModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAddMoneyRequest}>
              <div className="add-money-modal-body">
                <p className="add-money-notice">
                  You are requesting extra funds for project #{booking.id}. 
                  The client must review and approve this request. Money will only be added after the client pays.
                </p>

                {addMoneyError && (
                  <div className="add-money-error-banner">
                    <AlertTriangle size={16} />
                    <span>{addMoneyError}</span>
                  </div>
                )}

                <div className="current-amount-banner">
                  <span>Current Project Amount:</span>
                  <strong>₹{Number(booking.total_cost || 0).toLocaleString("en-IN")}</strong>
                </div>

                <div className="form-group" style={{ marginTop: "16px" }}>
                  <label htmlFor="additional-amount-input">
                    Additional Amount (₹) <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    id="additional-amount-input"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 3000"
                    value={addMoneyAmount}
                    onChange={(e) => setAddMoneyAmount(e.target.value)}
                    required
                    disabled={addMoneySubmitting}
                  />
                  <small style={{ color: "#64748b", marginTop: "4px", display: "block" }}>
                    Must be greater than ₹0.
                  </small>
                </div>

                <div className="form-group" style={{ marginTop: "16px" }}>
                  <label htmlFor="additional-reason-input">
                    Reason for Additional Amount <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <textarea
                    id="additional-reason-input"
                    rows="3"
                    placeholder="e.g. Additional electrical work was requested by the client / Extra materials needed for wall finishing."
                    value={addMoneyReason}
                    onChange={(e) => setAddMoneyReason(e.target.value)}
                    required
                    disabled={addMoneySubmitting}
                  />
                </div>
              </div>

              <div className="add-money-modal-footer">
                <button
                  type="button"
                  className="cancel-add-money-btn"
                  onClick={() => setIsAddMoneyModalOpen(false)}
                  disabled={addMoneySubmitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submit-add-money-btn"
                  disabled={addMoneySubmitting}
                >
                  {addMoneySubmitting ? "Submitting..." : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
