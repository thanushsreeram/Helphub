import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Star, ArrowLeft, Send, CheckCircle, Camera, X } from "lucide-react";
import { API_URL } from "../../services/api";
import LanguageSelector from "../../components/common/LanguageSelector";
import { handleLogoClick } from "../../utils/navigation";
import "./ClientReview.css";

function ClientReview() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [existingReview, setExistingReview] = useState(null);

  const [rating, setRating] = useState(0);
  const [behaviourRating, setBehaviourRating] = useState(0);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("helphub_token");

  useEffect(() => {
    fetchBookingAndReview();
  }, [bookingId]);

  const fetchBookingAndReview = async () => {
    try {
      setLoading(true);
      setError("");

      if (!token) {
        navigate("/login");
        return;
      }

      const bookingResponse = await fetch(
        `${API_URL}/api/bookings/${bookingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const bookingData = await bookingResponse.json();

      if (!bookingResponse.ok || !bookingData.success) {
        throw new Error(
          bookingData.message || "Failed to load booking"
        );
      }

      setBooking(bookingData.booking);

      if (bookingData.booking.status !== "completed") {
        setError("You can review a worker only after the job is completed.");
        setLoading(false);
        return;
      }

      const reviewResponse = await fetch(
        `${API_URL}/api/reviews/booking/${bookingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (reviewResponse.ok) {
        const reviewData = await reviewResponse.json();

        if (reviewData.success && (reviewData.client_review || reviewData.review)) {
          setExistingReview(reviewData.client_review || reviewData.review);
        }
      }
    } catch (err) {
      console.error("Review page error:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (photos.length + files.length > 5) {
      setError("You can upload a maximum of 5 photos per review.");
      return;
    }

    files.forEach((file) => {
      if (file.size > 3 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds 3MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const handleRemovePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (rating === 0) {
      setError("Please select an overall rating.");
      return;
    }

    if (behaviourRating === 0) {
      setError("Please rate the worker's behaviour.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`${API_URL}/api/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          booking_id: Number(bookingId),
          rating,
          behaviour_rating: behaviourRating,
          comment: comment.trim(),
          photos,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to submit review"
        );
      }

      setExistingReview(data.review);
    } catch (err) {
      console.error("Submit review error:", err);
      setError(err.message || "Unable to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (value, setValue, disabled = false) => {
    return (
      <div className="review-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star-button ${
              star <= value ? "selected" : ""
            }`}
            onClick={() => !disabled && setValue(star)}
            disabled={disabled}
            aria-label={`${star} star`}
          >
            <Star
              size={30}
              fill={star <= value ? "currentColor" : "none"}
            />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="review-page">
        <div className="review-loading">
          Loading review...
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="review-page">
        <div className="review-container">
          <button
            className="back-button"
            onClick={() => navigate("/client/bookings")}
          >
            <ArrowLeft size={18} />
            Back to Bookings
          </button>

          <div className="review-error">
            {error || "Booking not found."}
          </div>
        </div>
      </div>
    );
  }

  if (existingReview) {
    const existingPhotos = Array.isArray(existingReview.photos)
      ? existingReview.photos
      : typeof existingReview.photos === "string"
      ? JSON.parse(existingReview.photos || "[]")
      : [];

    return (
      <div className="review-page">
        <div className="review-container">
          <button
            className="back-button"
            onClick={() =>
              navigate(`/client/bookings/${bookingId}`)
            }
          >
            <ArrowLeft size={18} />
            Back to Booking
          </button>

          <div className="review-card submitted-review">
            <div className="success-icon">
              <CheckCircle size={48} />
            </div>

            <h1>Review Submitted</h1>

            <p className="review-subtitle">
              Thank you for reviewing the worker.
            </p>

            <div className="worker-summary">
              <h2>{booking.worker_name}</h2>
              <p>{booking.service_name}</p>
            </div>

            <div className="rating-section">
              <h3>Overall Rating</h3>
              {renderStars(existingReview.rating, () => {}, true)}
            </div>

            <div className="rating-section">
              <h3>Behaviour Rating</h3>
              {renderStars(
                existingReview.behaviour_rating || 0,
                () => {},
                true
              )}
            </div>

            {existingReview.comment && (
              <div className="submitted-comment">
                <h3>Your Comment</h3>
                <p>{existingReview.comment}</p>
              </div>
            )}

            {existingPhotos.length > 0 && (
              <div className="submitted-photos-section">
                <h3>Work Photos ({existingPhotos.length})</h3>
                <div className="photo-grid">
                  {existingPhotos.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Work photo ${idx + 1}`}
                      className="review-photo-item"
                    />
                  ))}
                </div>
              </div>
            )}

            <button
              className="back-booking-button"
              onClick={() =>
                navigate(`/client/bookings/${bookingId}`)
              }
            >
              Back to Booking
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="review-page">
      <div className="review-container">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <img src="/helphub-logo-transparent.png" alt="HelpHub" style={{ height: "38px", objectFit: "contain", cursor: "pointer" }} onClick={() => handleLogoClick(navigate)} title="Go Back" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              className="back-button"
              onClick={() => navigate(`/client/bookings/${bookingId}`)}
            >
              <ArrowLeft size={18} />
              Back to Booking
            </button>
            <LanguageSelector />
          </div>
        </header>

        <div className="review-card">
          <div className="review-header">
            <div className="review-icon">
              <Star size={32} />
            </div>

            <h1>Rate Your Experience</h1>

            <p>
              How was your experience with the worker?
            </p>
          </div>

          <div className="worker-summary">
            <h2>{booking.worker_name}</h2>
            <p>{booking.service_name}</p>
          </div>

          {error && (
            <div className="review-error">
              {error}
            </div>
          )}

          {booking.status === "completed" && (
            <form onSubmit={handleSubmit}>
              <div className="rating-section">
                <h3>Overall Rating</h3>
                <p className="rating-description">
                  How would you rate the quality of the service?
                </p>
                {renderStars(rating, setRating)}
              </div>

              <div className="rating-section">
                <h3>Worker Behaviour</h3>
                <p className="rating-description">
                  How professional and respectful was the worker?
                </p>
                {renderStars(behaviourRating, setBehaviourRating)}
              </div>

              <div className="comment-section">
                <label htmlFor="comment">
                  Comment <span>(Optional)</span>
                </label>

                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience with this worker..."
                  rows="4"
                  maxLength="1000"
                />

                <div className="character-count">
                  {comment.length}/1000
                </div>
              </div>

              {/* PHOTO UPLOAD SECTION */}
              <div className="photo-upload-section">
                <label className="photo-upload-label">
                  Attach Work Photos <span>(Optional, max 5)</span>
                </label>

                <div className="photo-upload-grid">
                  {photos.map((photo, index) => (
                    <div key={index} className="photo-preview-item">
                      <img src={photo} alt={`Preview ${index + 1}`} />
                      <button
                        type="button"
                        className="remove-photo-badge"
                        onClick={() => handleRemovePhoto(index)}
                        title="Remove photo"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  {photos.length < 5 && (
                    <label className="add-photo-button">
                      <Camera size={24} />
                      <span>Add Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="submit-review-button"
                disabled={submitting}
              >
                <Send size={18} />
                {submitting ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClientReview;
