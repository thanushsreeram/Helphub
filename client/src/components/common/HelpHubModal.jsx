import { AlertTriangle, CheckCircle, X, HelpCircle } from "lucide-react";
import "./HelpHubModal.css";

function HelpHubModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary", // "primary", "danger", "warning", "success"
  loading = false,
  requireReason = false,
  reasonValue = "",
  onReasonChange = () => {},
  reasonPlaceholder = "Please enter the reason...",
  error = "",
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case "danger":
      case "warning":
        return <AlertTriangle size={24} className="modal-icon-warning" />;
      case "success":
        return <CheckCircle size={24} className="modal-icon-success" />;
      default:
        return <HelpCircle size={24} className="modal-icon-primary" />;
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onConfirm();
  };

  return (
    <div className="helphub-modal-backdrop" onClick={onClose}>
      <div
        className={`helphub-modal-card modal-variant-${variant}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close-button" onClick={onClose} disabled={loading}>
          <X size={18} />
        </button>

        <div className="modal-header-section">
          <div className="modal-icon-wrapper">{getIcon()}</div>
          <h3>{title}</h3>
        </div>

        <form onSubmit={handleFormSubmit}>
          <div className="modal-body-section">
            {message && <p className="modal-message-text">{message}</p>}

            {requireReason && (
              <div className="modal-reason-container">
                <label className="modal-reason-label">
                  Cancellation Reason <span className="required-star">*</span>
                </label>
                <textarea
                  className="modal-reason-textarea"
                  rows={3}
                  maxLength={500}
                  placeholder={reasonPlaceholder}
                  value={reasonValue}
                  onChange={(e) => onReasonChange(e.target.value)}
                  disabled={loading}
                  required
                />
                <div className="modal-char-count">
                  {reasonValue.length} / 500 characters
                </div>
              </div>
            )}

            {error && <div className="modal-error-alert">{error}</div>}
          </div>

          <div className="modal-footer-actions">
            <button
              type="button"
              className="modal-button-cancel"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </button>

            <button
              type="submit"
              className={`modal-button-confirm confirm-${variant}`}
              disabled={loading || (requireReason && !reasonValue.trim())}
            >
              {loading ? "Processing..." : confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HelpHubModal;
