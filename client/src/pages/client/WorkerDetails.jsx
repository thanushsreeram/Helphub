import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_URL } from "../../services/api";
import {
  ArrowLeft,
  User,
  MapPin,
  Briefcase,
  Star,
  IndianRupee,
  CalendarDays,
  CheckCircle,
  MessageSquare,
  Clock,
  X,
} from "lucide-react";

import LanguageSelector from "../../components/common/LanguageSelector";
import { handleLogoClick } from "../../utils/navigation";
import "./WorkerDetails.css";

function WorkerDetails() {
  const navigate = useNavigate();
  const { workerId } = useParams();

  const [worker, setWorker] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [scheduleScope, setScheduleScope] = useState(null);
  const [selectedLightBoxImage, setSelectedLightBoxImage] = useState(null);

  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("helphub_token");

  useEffect(() => {
    const fetchWorker = async () => {
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/workers?worker_id=${workerId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Failed to load worker"
          );
        }

        const foundWorker = data.workers?.find(
          (item) =>
            Number(item.worker_id) === Number(workerId)
        );

        if (!foundWorker) {
          throw new Error("Worker not found");
        }

        setWorker(foundWorker);
      } catch (error) {
        console.error("Worker details error:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWorker();
  }, [workerId, token, navigate]);

  // Fetch worker reviews
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setReviewsLoading(true);

        const response = await fetch(
          `${API_URL}/api/reviews/worker/${workerId}`
        );

        const data = await response.json();

        if (response.ok && data.success) {
          setReviews(data.reviews || []);
        } else {
          setReviews([]);
        }
      } catch (error) {
        console.error("Worker reviews error:", error);
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [workerId]);

  // Fetch worker availability
  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        setAvailabilityLoading(true);

        const response = await fetch(
          `${API_URL}/api/workers/${workerId}/availability`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (response.ok && data.success) {
          setAvailability(data.availability || []);
          setScheduleScope({
            schedule_type: data.schedule_type || "permanent",
            valid_month: data.valid_month,
            start_date: data.start_date,
            end_date: data.end_date,
          });
        } else {
          setAvailability([]);
          setScheduleScope(null);
        }
      } catch (error) {
        console.error(
          "Worker availability error:",
          error
        );
        setAvailability([]);
        setScheduleScope(null);
      } finally {
        setAvailabilityLoading(false);
      }
    };

    fetchAvailability();
  }, [workerId, token]);

  const renderStars = (rating) => {
    return (
      <div className="review-display-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={17}
            fill={star <= rating ? "currentColor" : "none"}
          />
        ))}
      </div>
    );
  };

  const formatReviewDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const renderScopeBadge = () => {
    if (!scheduleScope) return null;

    if (scheduleScope.schedule_type === "month" && scheduleScope.valid_month) {
      const monthName = new Date(scheduleScope.valid_month + "-01").toLocaleString("default", { month: "long", year: "numeric" });
      return <span className="scope-badge month-badge">🗓️ Active for {monthName}</span>;
    }
    if (scheduleScope.schedule_type === "custom" && (scheduleScope.start_date || scheduleScope.end_date)) {
      const start = scheduleScope.start_date ? new Date(scheduleScope.start_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "";
      const end = scheduleScope.end_date ? new Date(scheduleScope.end_date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "";
      return <span className="scope-badge custom-badge">📅 Valid: {start} - {end}</span>;
    }
    return <span className="scope-badge perm-badge">🔁 Recurring Weekly</span>;
  };

  if (loading) {
    return (
      <div className="worker-details-page">
        <div className="details-loading">
          <div className="loading-spinner"></div>
          <p>Loading worker profile...</p>
        </div>
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div className="worker-details-page">
        <div className="details-error">
          <h2>Unable to load worker</h2>

          <p>{error || "Worker not found"}</p>

          <button
            onClick={() => navigate("/client/workers")}
          >
            <ArrowLeft size={18} />
            Back to Workers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="worker-details-page">

      {/* HEADER */}
      <header className="details-header">

        <div className="details-brand" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 onClick={() => handleLogoClick(navigate)} style={{ cursor: "pointer" }} title="Go Back">
            <img src="/helphub-logo-transparent.png" alt="HelpHub" style={{ height: "40px", objectFit: "contain" }} />
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            className="details-back-button"
            onClick={() => navigate("/client/workers")}
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <LanguageSelector />
        </div>

      </header>

      <main className="worker-details-content">

        {/* PROFILE HERO */}
        <section className="worker-profile-hero">

          <div className="large-worker-avatar">
            {worker.avatar_url ? (
              <img
                src={worker.avatar_url}
                alt={worker.name}
                className="large-worker-avatar-img"
              />
            ) : (
              <User size={55} />
            )}
          </div>

          <div className="hero-worker-info">

            <div className="hero-name-row">

              <h2>{worker.name}</h2>

              {worker.is_available && (
                <span className="hero-available">
                  Available for Hire
                </span>
              )}

            </div>

            <p className="hero-category">
              <Briefcase size={16} />
              {worker.primary_service_name ||
                worker.category ||
                "Service Professional"}
            </p>

            <div className="hero-stats-row">

              <div className="hero-stat-pill">
                <Star size={16} fill="currentColor" />
                <span>
                  {worker.rating
                    ? Number(worker.rating).toFixed(1)
                    : "New"}
                </span>
                <small>({worker.total_reviews || 0})</small>
              </div>

              <div className="hero-stat-pill">
                <MapPin size={16} />
                <span>{worker.city || "Local"}</span>
              </div>

              <div className="hero-stat-pill price-pill">
                <IndianRupee size={16} />
                <span>
                  ₹{worker.hourly_rate || 0}/hr
                </span>
              </div>

            </div>

          </div>

          <div className="hero-action-box">
            <button
              className="book-now-button"
              onClick={() =>
                navigate(`/client/book/${worker.worker_id}`)
              }
            >
              <CheckCircle size={18} />
              Book Worker
            </button>
          </div>

        </section>

        {/* AVAILABILITY SECTION */}
        <section className="worker-availability-section">

          <div className="availability-section-header">
            <div>
              <div className="availability-title">
                <CalendarDays size={22} />
                <h3>Working Availability</h3>
                {renderScopeBadge()}
              </div>

              <p>
                Check when {worker.name} is available for work.
              </p>
            </div>
          </div>

          {availabilityLoading ? (
            <div className="availability-loading">
              Loading availability...
            </div>
          ) : availability.length === 0 ? (
            <div className="no-availability">
              <CalendarDays size={35} />

              <h4>No availability set</h4>

              <p>
                This worker has not added their working schedule yet.
              </p>
            </div>
          ) : (
            <div className="availability-list">

              {availability.map((item) => (
                <div
                  className="availability-item"
                  key={item.day_of_week}
                >
                  <div className="availability-day">
                    <CalendarDays size={18} />
                    <strong>{item.day_of_week}</strong>
                  </div>

                  <div className="availability-time">
                    <Clock size={17} />

                    <span>
                      {item.start_time?.slice(0, 5)}
                      {" - "}
                      {item.end_time?.slice(0, 5)}
                    </span>
                  </div>

                  <span className="availability-status">
                    Available
                  </span>
                </div>
              ))}

            </div>
          )}

        </section>

        {/* REVIEWS SECTION */}
        <section className="worker-reviews-section">

          <div className="reviews-section-header">

            <div>
              <div className="reviews-title">
                <MessageSquare size={22} />
                <h3>Worker Reviews</h3>
              </div>

              <p>
                See what previous clients say about{" "}
                {worker.name}.
              </p>
            </div>

            <div className="reviews-summary">

              <Star
                size={22}
                fill="currentColor"
              />

              <strong>
                {worker.rating
                  ? Number(worker.rating).toFixed(1)
                  : "New"}
              </strong>

              <span>
                {worker.total_reviews || 0} reviews
              </span>

            </div>

          </div>

          {reviewsLoading ? (
            <div className="reviews-loading">
              Loading reviews...
            </div>
          ) : reviews.length === 0 ? (
            <div className="no-reviews">

              <MessageSquare size={35} />

              <h4>No reviews yet</h4>

              <p>
                This worker hasn't received any
                reviews yet.
              </p>

            </div>
          ) : (
            <div className="reviews-list">

              {reviews.map((review) => (
                <div
                  className="review-item"
                  key={review.id}
                >

                  <div className="review-item-header">

                    <div className="review-client">

                      <div className="review-client-avatar">
                        {review.client_avatar_url || review.avatar_url ? (
                          <img
                            src={review.client_avatar_url || review.avatar_url}
                            alt={review.client_name || "Client"}
                            className="review-client-avatar-img"
                          />
                        ) : (
                          <User size={20} />
                        )}
                      </div>

                      <div>
                        <strong>
                          {review.client_name ||
                            "Client"}
                        </strong>

                        <span>
                          {formatReviewDate(
                            review.created_at
                          )}
                        </span>
                      </div>

                    </div>

                    {renderStars(
                      Number(review.rating)
                    )}

                  </div>

                  {review.comment && (
                    <p className="review-comment">
                      "{review.comment}"
                    </p>
                  )}

                  {review.behaviour_rating && (
                    <div className="behaviour-rating">
                      <span>Behaviour</span>
                      <div>
                        {renderStars(Number(review.behaviour_rating))}
                      </div>
                    </div>
                  )}

                  {review.photos && Array.isArray(review.photos) && review.photos.length > 0 && (
                    <div className="review-photos-grid">
                      {review.photos.map((photoUrl, pIdx) => (
                        <img
                          key={pIdx}
                          src={photoUrl}
                          alt={`Work outcome ${pIdx + 1}`}
                          className="review-photo-thumb"
                          onClick={() => setSelectedLightBoxImage(photoUrl)}
                        />
                      ))}
                    </div>
                  )}

                </div>
              ))}

            </div>
          )}

        </section>

      </main>

      {selectedLightBoxImage && (
        <div
          className="lightbox-overlay"
          onClick={() => setSelectedLightBoxImage(null)}
        >
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={selectedLightBoxImage} alt="Work preview zoomed" />
            <button
              className="lightbox-close"
              onClick={() => setSelectedLightBoxImage(null)}
            >
              <X size={22} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkerDetails;
