import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../services/api";
import LanguageSelector from "../../components/common/LanguageSelector";
import { handleLogoClick } from "../../utils/navigation";
import "./ClientBookings.css";

function ClientBookings() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("helphub_token");

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError("");

      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/bookings`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load bookings"
        );
      }

      setBookings(data.bookings || []);
    } catch (err) {
      console.error("Bookings error:", err);
      setError(err.message || "Unable to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const getStatusClass = (status) => {
    switch (status) {
      case "pending":
        return "status-pending";

      case "accepted":
        return "status-accepted";

      case "committed":
        return "status-committed";

      case "in_progress":
        return "status-progress";

      case "completed":
        return "status-completed";

      case "rejected":
        return "status-rejected";

      case "cancelled":
        return "status-cancelled";

      default:
        return "status-default";
    }
  };

  const formatStatus = (status) => {
    if (!status) return "Unknown";

    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const formatDate = (date) => {
    if (!date) return "Not specified";

    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getMaterialsText = (value) => {
    switch (value) {
      case "client":
        return "Client provides";

      case "worker":
        return "Worker provides";

      case "shared":
        return "Shared";

      default:
        return "Client provides";
    }
  };

  if (loading) {
    return (
      <div className="client-bookings-page">
        <div className="bookings-loading">
          <div className="bookings-loader"></div>
          <h2>Loading your bookings...</h2>
          <p>Please wait.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="client-bookings-page">
      <div className="client-bookings-container">

        {/* Header */}
        <div className="bookings-header">
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <img src="/helphub-logo-transparent.png" alt="HelpHub" style={{ height: "38px", objectFit: "contain", cursor: "pointer" }} onClick={() => handleLogoClick(navigate)} title="Go Back" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                className="bookings-back-button"
                onClick={() => navigate("/client/workers")}
              >
                ← Find Workers
              </button>
              <LanguageSelector />
            </div>
          </header>

          <div className="bookings-heading">
            <span className="bookings-icon">📋</span>

            <div>
              <h1>My Bookings</h1>
              <p>
                Track your service requests and bookings.
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bookings-error">
            <span>⚠️</span>

            <div>
              <strong>Something went wrong</strong>
              <p>{error}</p>
            </div>

            <button onClick={fetchBookings}>
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!error && bookings.length === 0 && (
          <div className="empty-bookings">
            <div className="empty-icon">📭</div>

            <h2>No bookings yet</h2>

            <p>
              You haven't booked a worker yet.
              Find a professional and create your first booking.
            </p>

            <button
              onClick={() => navigate("/client/workers")}
            >
              Find a Worker
            </button>
          </div>
        )}

        {/* Booking Count */}
        {bookings.length > 0 && (
          <div className="booking-count">
            <span>
              {bookings.length}{" "}
              {bookings.length === 1 ? "Booking" : "Bookings"}
            </span>

            <button onClick={fetchBookings}>
              ↻ Refresh
            </button>
          </div>
        )}

        {/* Booking List */}
        {bookings.length > 0 && (
          <div className="bookings-list">
            {bookings.map((booking) => (
              <div
                className="client-booking-card"
                key={booking.id}
              >

                {/* Card Header */}
                <div className="booking-card-top">
                  <div>
                    <span className="booking-number">
                      Booking #{booking.id}
                    </span>

                    <h2>
                      {booking.service_name || "Service Booking"}
                    </h2>
                  </div>

                  <span
                    className={`booking-status ${getStatusClass(
                      booking.status
                    )}`}
                  >
                    {formatStatus(booking.status)}
                  </span>
                </div>

                {/* Worker */}
                <div className="booking-worker">
                  <div className="booking-worker-avatar">
                    {booking.worker_name
                      ?.charAt(0)
                      ?.toUpperCase() || "W"}
                  </div>

                  <div>
                    <span>Worker</span>

                    <strong>
                      {booking.worker_name || "Worker"}
                    </strong>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="booking-details-grid">

                  <div className="booking-detail">
                    <span className="detail-icon">
                      📅
                    </span>

                    <div>
                      <small>Date & Time</small>

                      <strong>
                        {formatDate(booking.booking_date)}
                      </strong>
                    </div>
                  </div>

                  <div className="booking-detail">
                    <span className="detail-icon">
                      📍
                    </span>

                    <div>
                      <small>Location</small>

                      <strong>
                        {booking.location || "Not specified"}
                      </strong>
                    </div>
                  </div>

                  <div className="booking-detail">
                    <span className="detail-icon">
                      👷
                    </span>

                    <div>
                      <small>Workers Required</small>

                      <strong>
                        {booking.workers_required || 1}{" "}
                        {(booking.workers_required || 1) === 1
                          ? "Worker"
                          : "Workers"}
                      </strong>
                    </div>
                  </div>

                  <div className="booking-detail">
                    <span className="detail-icon">
                      🧰
                    </span>

                    <div>
                      <small>Materials</small>

                      <strong>
                        {getMaterialsText(
                          booking.materials_provided_by
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="booking-detail">
                    <span className="detail-icon">
                      💰
                    </span>

                    <div>
                      <small>Total Cost</small>

                      <strong>
                        ₹
                        {Number(
                          booking.total_cost || 0
                        ).toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  <div className="booking-detail">
                    <span className="detail-icon">
                      🆔
                    </span>

                    <div>
                      <small>Booking ID</small>

                      <strong>
                        #{booking.id}
                      </strong>
                    </div>
                  </div>

                </div>

                {/* Description */}
                {booking.description && (
                  <div className="booking-description">
                    <small>Job Description</small>

                    <p>
                      {booking.description}
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div className="booking-card-footer">
                  <span>
                    Created{" "}
                    {formatDate(booking.created_at)}
                  </span>

                  <div className="booking-card-actions">
                    <button
                      className="view-booking-button"
                      onClick={() =>
                        navigate(
                          `/client/bookings/${booking.id}`
                        )
                      }
                    >
                      View Details →
                    </button>

                    {booking.status === "completed" && (
                      booking.has_review ? (
                        <span className="reviewed-tag">
                          ⭐ Review Submitted
                        </span>
                      ) : (
                        <button
                          className="rate-worker-button"
                          onClick={() =>
                            navigate(
                              `/client/bookings/${booking.id}/review`
                            )
                          }
                        >
                          ⭐ Rate Worker
                        </button>
                      )
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

export default ClientBookings;
