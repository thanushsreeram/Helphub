import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  User,
  Briefcase,
  IndianRupee,
  Clock,
  CheckCircle,
  CreditCard,
  XCircle,
} from "lucide-react";
import { API_URL } from "../../services/api";

import LanguageSelector from "../../components/common/LanguageSelector";
import { handleLogoClick } from "../../utils/navigation";
import "./ClientBookingDetails.css";

function ClientBookingDetails() {
  const navigate = useNavigate();
  const { bookingId } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancellationDetails, setCancellationDetails] = useState("");

  const token = localStorage.getItem("helphub_token");

  useEffect(() => {
    const fetchBooking = async () => {
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/bookings/${bookingId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Failed to load booking"
          );
        }

        setBooking(data.booking);
      } catch (error) {
        console.error("Booking details error:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, token, navigate]);

  const handleCancel = () => {
    setError("");
    setCancellationReason("");
    setCancellationDetails("");
    setShowCancelModal(true);
  };

  const confirmCancellation = async () => {
    if (!cancellationReason) {
      setError("Please select a cancellation reason.");
      return;
    }

    try {
      setCancelling(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/bookings/${bookingId}/cancel`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cancellation_reason: cancellationReason,
            additional_details: cancellationDetails.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to cancel booking"
        );
      }

      setBooking(data.booking);
      setShowCancelModal(false);
      setCancellationReason("");
      setCancellationDetails("");

    } catch (error) {
      console.error("Cancel booking error:", error);
      setError(error.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleRateWorker = () => {
    navigate(`/client/bookings/${booking.id}/review`);
  };

  const formatDate = (date) => {
    if (!date) return "Not specified";

    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatStatus = (status) => {
    if (!status) return "Unknown";

    return status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  const getStatusIcon = (status) => {
    if (status === "completed") {
      return <CheckCircle size={19} />;
    }

    if (status === "cancelled" || status === "rejected") {
      return <XCircle size={19} />;
    }

    if (
      status === "committed" ||
      status === "in_progress"
    ) {
      return <Clock size={19} />;
    }

    return <CalendarDays size={19} />;
  };

  const canCancel =
    booking &&
    (booking.status === "pending" ||
      booking.status === "committed");

  const canPay =
    booking &&
    [
      "accepted",
      "committed",
      "in_progress",
      "completed",
    ].includes(booking.status);

  if (loading) {
    return (
      <div className="booking-details-page">
        <div className="booking-details-loading">
          <div className="booking-details-spinner"></div>
          <p>Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="booking-details-page">
        <div className="booking-details-error">
          <XCircle size={45} />
          <h2>Unable to load booking</h2>
          <p>{error}</p>
          <button onClick={() => navigate("/client/bookings")}>
            <ArrowLeft size={18} />
            Back to My Bookings
          </button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  return (
    <div className="booking-details-page">
      {/* Header */}
      <header className="booking-details-header">
        <div className="booking-details-brand" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 onClick={() => handleLogoClick(navigate)} style={{ cursor: "pointer" }} title="Go Back">
            <img src="/helphub-logo-transparent.png" alt="HelpHub" style={{ height: "40px", objectFit: "contain" }} />
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            className="booking-details-back"
            onClick={() => navigate("/client/bookings")}
          >
            <ArrowLeft size={18} />
            My Bookings
          </button>
          <LanguageSelector />
        </div>
      </header>

      <main className="booking-details-container">
        {/* Page Heading */}
        <div className="booking-details-heading">
          <div>
            <span className="booking-label">
              BOOKING #{booking.id}
            </span>

            <h2>
              {booking.service_name || "Service Booking"}
            </h2>

            <p>
              Review your service booking information and payment details.
            </p>
          </div>

          <div className={`booking-status ${booking.status}`}>
            {getStatusIcon(booking.status)}
            {formatStatus(booking.status)}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="booking-details-alert">
            <XCircle size={19} />
            {error}
          </div>
        )}

        <div className="booking-details-grid">
          {/* Main Information */}
          <section className="booking-main-card">
            <div className="details-section">
              <div className="section-title">
                <CalendarDays size={21} />
                <h3>Booking Information</h3>
              </div>

              <div className="details-info-grid">
                <div className="detail-item">
                  <span>Date & Time</span>
                  <strong>{formatDate(booking.booking_date)}</strong>
                </div>

                <div className="detail-item">
                  <span>Location</span>
                  <strong>{booking.location || "Not provided"}</strong>
                </div>

                <div className="detail-item">
                  <span>Service</span>
                  <strong>{booking.service_name || "Not provided"}</strong>
                </div>

                <div className="detail-item">
                  <span>Booking ID</span>
                  <strong>#{booking.id}</strong>
                </div>

                <div className="detail-item">
                  <span>Workers Required</span>
                  <strong>
                    {booking.workers_required || 1} Worker
                    {(booking.workers_required || 1) !== 1 ? "s" : ""}
                  </strong>
                </div>

                <div className="detail-item">
                  <span>Materials</span>
                  <strong>
                    {booking.materials_provided_by === "worker"
                      ? "Worker provides"
                      : booking.materials_provided_by === "shared"
                      ? "Shared responsibility"
                      : "Client provides"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Worker */}
            <div className="details-section">
              <div className="section-title">
                <User size={21} />
                <h3>Worker</h3>
              </div>

              <div className="worker-detail-box">
                <div className="worker-detail-avatar">
                  {booking.worker_avatar_url ? (
                    <img src={booking.worker_avatar_url} alt={booking.worker_name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <User size={27} />
                  )}
                </div>

                <div>
                  <strong>{booking.worker_name || "Worker"}</strong>
                  <span>Assigned HelpHub Worker</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="details-section">
              <div className="section-title">
                <Briefcase size={21} />
                <h3>Service Description</h3>
              </div>

              <div className="description-box">
                {booking.description || "No description provided for this booking."}
              </div>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="booking-summary-sidebar">
            <div className="summary-card">
              <h3>Payment Summary</h3>

              <div className="summary-row">
                <span>Labour Rate</span>
                <span>₹{booking.hourly_rate || 0} / hr</span>
              </div>

              <div className="summary-row">
                <span>Total Amount</span>
                <strong className="total-price">₹{booking.total_price || 0}</strong>
              </div>

              {canPay && (
                <button
                  className="pay-now-button"
                  onClick={() => navigate(`/client/payment/${booking.id}`)}
                >
                  <CreditCard size={18} />
                  Pay Now
                </button>
              )}

              {canCancel && (
                <button
                  className="cancel-booking-button"
                  onClick={handleCancel}
                >
                  Cancel Booking
                </button>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="modal-overlay">
          <div className="cancel-modal">
            <h3>Cancel Booking</h3>
            <p>Are you sure you want to cancel this booking?</p>

            <select
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="reason-select"
            >
              <option value="">Select a reason</option>
              <option value="Schedule Conflict">Schedule Conflict</option>
              <option value="Found Alternative">Found Alternative</option>
              <option value="Worker Delayed">Worker Delayed</option>
              <option value="Other">Other</option>
            </select>

            <textarea
              placeholder="Additional details (optional)"
              value={cancellationDetails}
              onChange={(e) => setCancellationDetails(e.target.value)}
              className="reason-textarea"
            />

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
              >
                Keep Booking
              </button>
              <button
                className="confirm-btn"
                onClick={confirmCancellation}
                disabled={cancelling}
              >
                {cancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientBookingDetails;
