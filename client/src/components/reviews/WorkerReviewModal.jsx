import { useState } from "react";
import { Star, Upload, X, AlertCircle, CheckCircle, Image as ImageIcon } from "lucide-react";
import { API_URL } from "../../services/api";
import "./WorkerReviewModal.css";

function WorkerReviewModal({ isOpen, onClose, booking, onReviewSubmitted }) {
  const [rating, setRating] = useState(5);
  const [behaviourRating, setBehaviourRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [hoverBehaviour, setHoverBehaviour] = useState(0);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen || !booking) return null;

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (photos.length + files.length > 5) {
      setError("You can attach up to 5 photos only.");
      return;
    }

    setError("");

    files.forEach((file) => {
      if (file.size > 3 * 1024 * 1024) {
        setError(`File ${file.name} is too large. Max 3MB allowed.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos((prev) => {
          if (prev.length >= 5) return prev;
          return [...prev, reader.result];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!rating || rating < 1 || rating > 5) {
      setError("Please select a valid rating between 1 and 5.");
      return;
    }

    const token = localStorage.getItem("helphub_token");
    if (!token) {
      setError("You must be logged in to submit a review.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`${API_URL}/api/reviews/client`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          booking_id: booking.id,
          rating,
          behaviour_rating: behaviourRating,
          comment,
          photos,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to submit review");
      }

      setSuccessMsg("Review submitted successfully!");
      setTimeout(() => {
        if (onReviewSubmitted) onReviewSubmitted(data.review);
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Submit client review error:", err);
      setError(err.message || "Error submitting review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="worker-review-overlay" onClick={onClose}>
      <div
        className="worker-review-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="worker-review-header">
          <div className="header-title">
            <Star className="header-icon" size={24} />
            <div>
              <h2>Rate & Review Client</h2>
              <p>Booking #{booking.id} &bull; {booking.client_name || "Client"}</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        {successMsg ? (
          <div className="review-success-state">
            <CheckCircle size={48} className="success-icon" />
            <h3>Thank You!</h3>
            <p>{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="worker-review-form">
            {error && (
              <div className="review-error-banner">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* OVERALL RATING */}
            <div className="rating-field">
              <label>Overall Client Experience *</label>
              <div className="stars-picker">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    className={`star-btn ${
                      (hoverRating || rating) >= star ? "filled" : ""
                    }`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    <Star size={28} />
                  </button>
                ))}
                <span className="rating-score-badge">{rating} / 5</span>
              </div>
            </div>

            {/* BEHAVIOUR RATING */}
            <div className="rating-field">
              <label>Client Communication & Behavior</label>
              <div className="stars-picker compact">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    className={`star-btn ${
                      (hoverBehaviour || behaviourRating) >= star ? "filled" : ""
                    }`}
                    onClick={() => setBehaviourRating(star)}
                    onMouseEnter={() => setHoverBehaviour(star)}
                    onMouseLeave={() => setHoverBehaviour(0)}
                  >
                    <Star size={22} />
                  </button>
                ))}
                <span className="rating-score-badge small">{behaviourRating} / 5</span>
              </div>
            </div>

            {/* COMMENT */}
            <div className="form-group">
              <label htmlFor="client-review-comment">Review Comments (Optional)</label>
              <textarea
                id="client-review-comment"
                rows="4"
                placeholder="How was working with this client? (Prompt payment, clear instructions, clean workspace, etc.)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            {/* PHOTO ATTACHMENT */}
            <div className="form-group">
              <label>Attach Work Photos (Optional, max 5)</label>
              <div className="photo-upload-zone">
                <label className="upload-trigger">
                  <Upload size={20} />
                  <span>Choose Photos</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    disabled={photos.length >= 5}
                  />
                </label>
                <span className="upload-hint">{photos.length}/5 uploaded</span>
              </div>

              {photos.length > 0 && (
                <div className="photo-preview-grid">
                  {photos.map((imgSrc, idx) => (
                    <div key={idx} className="photo-thumb-container">
                      <img src={imgSrc} alt={`Work preview ${idx + 1}`} />
                      <button
                        type="button"
                        className="remove-photo-btn"
                        onClick={() => removePhoto(idx)}
                        title="Remove photo"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <footer className="worker-review-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Client Review"}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}

export default WorkerReviewModal;
