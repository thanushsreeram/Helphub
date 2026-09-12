import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  User,
  Briefcase,
  Clock,
  CheckCircle,
  CreditCard,
  XCircle,
  IndianRupee,
  AlertTriangle,
  Banknote,
  ShieldCheck,
  Check,
  X,
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
  const [successMsg, setSuccessMsg] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancellationDetails, setCancellationDetails] = useState("");

  // ADDITIONAL MONEY STATE
  const [additionalMoneyRequests, setAdditionalMoneyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [actionReqId, setActionReqId] = useState(null);

  // ACCEPT & PAY MODAL STATE
  const [payModal, setPayModal] = useState({
    isOpen: false,
    request: null,
    method: "online", // 'online' | 'cash'
    processing: false,
    error: "",
  });

  const token = localStorage.getItem("helphub_token");

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const fetchAdditionalMoneyRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await fetch(`${API_URL}/api/additional-money/booking/${bookingId}`, {
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
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/bookings/${bookingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load booking");
      }

      setBooking(data.booking);
    } catch (error) {
      console.error("Booking details error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
    fetchAdditionalMoneyRequests();
  }, [bookingId, token, navigate]);

  // REJECT ADDITIONAL MONEY REQUEST
  const handleRejectAddMoney = async (requestId) => {
    if (!window.confirm("Are you sure you want to reject this additional money request? The project amount will not change.")) {
      return;
    }

    try {
      setActionReqId(requestId);
      setError("");
      setSuccessMsg("");

      const res = await fetch(`${API_URL}/api/additional-money/request/${requestId}/reject`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to reject request");
      }

      setSuccessMsg("Additional money request was rejected. The project amount remains unchanged.");
      await fetchAdditionalMoneyRequests();
      await fetchBooking();
    } catch (err) {
      console.error("Reject additional money error:", err);
      setError(err.message || "Failed to reject request");
    } finally {
      setActionReqId(null);
    }
  };

  // OPEN ACCEPT & PAY MODAL
  const openAcceptAndPayModal = (req) => {
    setPayModal({
      isOpen: true,
      request: req,
      method: "online",
      processing: false,
      error: "",
    });
  };

  // EXECUTE PAYMENT FOR ADDITIONAL MONEY REQUEST
  const handleExecuteAddMoneyPayment = async () => {
    const reqItem = payModal.request;
    if (!reqItem) return;

    try {
      setPayModal((prev) => ({ ...prev, processing: true, error: "" }));

      // 1. CASH PAYMENT FLOW
      if (payModal.method === "cash") {
        const res = await fetch(`${API_URL}/api/additional-money/request/${reqItem.id}/pay/cash`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Cash payment recording failed");
        }

        setSuccessMsg(`Cash payment of ₹${Number(reqItem.requested_amount).toLocaleString("en-IN")} recorded! Project total has been updated.`);
        setPayModal({
          isOpen: false,
          request: null,
          method: "online",
          processing: false,
          error: "",
        });
        await fetchAdditionalMoneyRequests();
        await fetchBooking();
        return;
      }

      // 2. ONLINE PAYMENT VIA RAZORPAY
      const orderRes = await fetch(`${API_URL}/api/additional-money/request/${reqItem.id}/pay/order`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.message || "Failed to create payment order");
      }

      if (!window.Razorpay) {
        throw new Error("Razorpay Checkout failed to load. Please refresh the page.");
      }

      const clientUser = JSON.parse(localStorage.getItem("helphub_user") || "{}");

      const options = {
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "HelpHub",
        description: `Additional Project Work: ₹${reqItem.requested_amount}`,
        order_id: orderData.order.id,

        handler: async function (response) {
          try {
            const verifyRes = await fetch(`${API_URL}/api/additional-money/request/${reqItem.id}/pay/verify`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.message || "Payment verification failed");
            }

            setSuccessMsg(`Additional amount of ₹${Number(reqItem.requested_amount).toLocaleString("en-IN")} paid successfully! 🎉 Project total is updated.`);
            setPayModal({
              isOpen: false,
              request: null,
              method: "online",
              processing: false,
              error: "",
            });
            await fetchAdditionalMoneyRequests();
            await fetchBooking();
          } catch (vErr) {
            console.error("Payment verify error:", vErr);
            setPayModal((prev) => ({
              ...prev,
              processing: false,
              error: vErr.message || "Verification failed",
            }));
          }
        },

        prefill: {
          name: clientUser.name || "",
          email: clientUser.email || "",
        },

        theme: {
          color: "#2563eb",
        },

        modal: {
          ondismiss: function () {
            setPayModal((prev) => ({ ...prev, processing: false }));
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on("payment.failed", function (response) {
        console.error("Payment failed:", response.error);
        setPayModal((prev) => ({
          ...prev,
          processing: false,
          error: response.error?.description || "Payment failed",
        }));
      });

      razorpayInstance.open();
    } catch (err) {
      console.error("Payment order error:", err);
      setPayModal((prev) => ({
        ...prev,
        processing: false,
        error: err.message || "Payment initialization failed",
      }));
    }
  };

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
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to cancel booking");
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
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const getStatusIcon = (status) => {
    if (status === "completed") {
      return <CheckCircle size={19} />;
    }

    if (status === "cancelled" || status === "rejected") {
      return <XCircle size={19} />;
    }

    if (status === "committed" || status === "in_progress") {
      return <Clock size={19} />;
    }

    return <CalendarDays size={19} />;
  };

  const canCancel =
    booking && (booking.status === "pending" || booking.status === "committed");

  const canPay =
    booking &&
    ["accepted", "committed", "in_progress", "completed"].includes(
      booking.status,
    );

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
        <div
          className="booking-details-brand"
          style={{ display: "flex", alignItems: "center", gap: "16px" }}
        >
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
            <span className="booking-label">BOOKING #{booking.id}</span>

            <h2>{booking.service_name || "Service Booking"}</h2>

            <p>Review your service booking information and payment details.</p>
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

        {/* Success Alert */}
        {successMsg && (
          <div className="booking-details-alert" style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}>
            <CheckCircle size={19} color="#16a34a" />
            {successMsg}
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
                    <img
                      src={booking.worker_avatar_url}
                      alt={booking.worker_name}
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
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
                {booking.description ||
                  "No description provided for this booking."}
              </div>
            </div>

            {/* ADDITIONAL MONEY REQUESTS FOR CLIENT */}
            <div className="details-section client-add-money-section">
              <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <IndianRupee size={21} color="#2563eb" />
                  <h3>Additional Money Requests</h3>
                </div>
                {additionalMoneyRequests.length > 0 && (
                  <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>
                    {additionalMoneyRequests.length} request{additionalMoneyRequests.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {loadingRequests ? (
                <p style={{ color: "#64748b", fontSize: "14px" }}>Loading requests...</p>
              ) : additionalMoneyRequests.length === 0 ? (
                <div className="client-empty-add-money">
                  <p>No additional money requests for this project.</p>
                  <small>If extra work or unexpected materials arise, the worker will submit a request here for your review and approval.</small>
                </div>
              ) : (
                <div className="client-add-money-list">
                  {additionalMoneyRequests.map((reqItem) => {
                    const isPending = reqItem.status === "pending" || reqItem.status === "payment_pending";

                    return (
                      <div className={`client-req-card ${isPending ? "is-pending-card" : ""} status-${reqItem.status}`} key={reqItem.id}>
                        <div className="client-req-header">
                          <div className="client-req-title-group">
                            <span className="worker-badge">Worker: {booking.worker_name || "Assigned Worker"}</span>
                            <h4>Requested Additional Amount: <strong style={{ color: "#0f172a" }}>+ ₹{Number(reqItem.requested_amount).toLocaleString("en-IN")}</strong></h4>
                          </div>

                          <span className={`client-req-status-badge badge-${reqItem.status}`}>
                            {reqItem.status === "pending" && "Pending Your Review"}
                            {reqItem.status === "payment_pending" && "Payment Pending"}
                            {reqItem.status === "paid" && "Approved & Paid"}
                            {reqItem.status === "rejected" && "Rejected"}
                            {reqItem.status === "cancelled" && "Cancelled"}
                          </span>
                        </div>

                        <div className="client-req-reason-box">
                          <strong>Reason for Extra Work / Expense:</strong>
                          <p>{reqItem.reason}</p>
                        </div>

                        <div className="client-req-bottom">
                          <span className="client-req-date">
                            Submitted on {new Date(reqItem.created_at).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>

                          {/* ACTION BUTTONS FOR CLIENT */}
                          {isPending && (
                            <div className="client-req-actions">
                              <button
                                type="button"
                                className="accept-pay-req-btn"
                                onClick={() => openAcceptAndPayModal(reqItem)}
                                disabled={actionReqId === reqItem.id}
                              >
                                <Check size={16} />
                                Accept & Pay (₹{Number(reqItem.requested_amount).toLocaleString("en-IN")})
                              </button>

                              <button
                                type="button"
                                className="reject-req-btn"
                                onClick={() => handleRejectAddMoney(reqItem.id)}
                                disabled={actionReqId === reqItem.id}
                              >
                                <X size={16} />
                                {actionReqId === reqItem.id ? "Rejecting..." : "Reject"}
                              </button>
                            </div>
                          )}

                          {reqItem.status === "paid" && reqItem.paid_at && (
                            <div className="client-req-paid-tag">
                              <CheckCircle size={15} color="#16a34a" />
                              <span>Paid & added to total on {new Date(reqItem.paid_at).toLocaleDateString("en-IN")}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Sidebar */}
          <aside className="booking-summary-sidebar">
            <div className="summary-card">
              <h3>Payment Summary</h3>

              {/* ORIGINAL AGREED AMOUNT */}
              <div className="summary-row">
                <span>Original Agreed Amount</span>
                <span>₹{Number(booking.original_agreed_amount || booking.labour_cost || 0).toLocaleString("en-IN")}</span>
              </div>

              {/* ADDITIONAL APPROVED & PAID */}
              {additionalMoneyRequests.filter(r => r.status === "paid").length > 0 && (
                <div className="summary-row" style={{ color: "#16a34a" }}>
                  <span>Additional Approved</span>
                  <span>+ ₹{additionalMoneyRequests
                    .filter(r => r.status === "paid")
                    .reduce((sum, r) => sum + Number(r.requested_amount), 0)
                    .toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {/* CURRENT PROJECT TOTAL */}
              <div className="summary-row total-row" style={{ borderTop: "2px solid #e2e8f0", paddingTop: "12px", marginTop: "8px" }}>
                <span style={{ fontWeight: "700" }}>Current Project Total</span>
                <strong className="total-price" style={{ color: "#2563eb", fontSize: "20px" }}>
                  ₹{Number(booking.total_cost || 0).toLocaleString("en-IN")}
                </strong>
              </div>

              {canPay && (
                <button
                  className="pay-now-button"
                  onClick={() => navigate(`/client/payment/${booking.id}`)}
                >
                  <CreditCard size={18} />
                  Pay Initial Booking
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

      {/* CLIENT ACCEPT & PAY MODAL FOR ADDITIONAL MONEY */}
      {payModal.isOpen && payModal.request && (
        <div
          className="client-add-pay-modal-backdrop"
          onClick={() => !payModal.processing && setPayModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div className="client-add-pay-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="add-pay-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <CreditCard size={22} color="#2563eb" />
                <h3>Accept & Pay Additional Amount</h3>
              </div>
              <button
                type="button"
                className="close-add-pay-modal"
                onClick={() => !payModal.processing && setPayModal((prev) => ({ ...prev, isOpen: false }))}
              >
                ✕
              </button>
            </div>

            <div className="add-pay-modal-body">
              {payModal.error && (
                <div className="add-pay-modal-error">
                  <AlertTriangle size={16} />
                  <span>{payModal.error}</span>
                </div>
              )}

              <div className="add-pay-summary-box">
                <div className="add-pay-summary-row">
                  <span>Project</span>
                  <strong>#{booking.id} - {booking.service_name}</strong>
                </div>
                <div className="add-pay-summary-row">
                  <span>Worker</span>
                  <strong>{booking.worker_name || "Assigned Worker"}</strong>
                </div>
                <div className="add-pay-summary-row">
                  <span>Current Project Total</span>
                  <span>₹{Number(booking.total_cost || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="add-pay-summary-row" style={{ color: "#1e40af" }}>
                  <span>Approved Additional Amount</span>
                  <strong>+ ₹{Number(payModal.request.requested_amount).toLocaleString("en-IN")}</strong>
                </div>
                <div className="add-pay-summary-row new-total-highlight">
                  <span>New Project Total After Payment</span>
                  <strong>₹{(Number(booking.total_cost || 0) + Number(payModal.request.requested_amount)).toLocaleString("en-IN")}</strong>
                </div>
              </div>

              <div className="add-pay-reason-callout">
                <small>Worker's Reason for Request:</small>
                <p>{payModal.request.reason}</p>
              </div>

              <div className="payment-method-options-group">
                <label>Choose Payment Method:</label>

                <div className="method-grid">
                  <div
                    className={`method-tile ${payModal.method === "online" ? "selected" : ""}`}
                    onClick={() => setPayModal((prev) => ({ ...prev, method: "online" }))}
                  >
                    <CreditCard size={20} color="#2563eb" />
                    <div>
                      <strong>Pay Online (Razorpay)</strong>
                      <small>Cards, UPI, Netbanking</small>
                    </div>
                  </div>

                  <div
                    className={`method-tile ${payModal.method === "cash" ? "selected" : ""}`}
                    onClick={() => setPayModal((prev) => ({ ...prev, method: "cash" }))}
                  >
                    <Banknote size={20} color="#16a34a" />
                    <div>
                      <strong>Cash Payment</strong>
                      <small>Pay directly to worker on-site</small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="safety-guarantee">
                <ShieldCheck size={18} color="#16a34a" />
                <span>Protected by HelpHub Payment Policy. Amount is recorded in official history.</span>
              </div>
            </div>

            <div className="add-pay-modal-footer">
              <button
                type="button"
                className="cancel-add-pay-btn"
                onClick={() => setPayModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={payModal.processing}
              >
                Cancel
              </button>

              <button
                type="button"
                className="confirm-add-pay-btn"
                onClick={handleExecuteAddMoneyPayment}
                disabled={payModal.processing}
              >
                <CheckCircle size={16} />
                {payModal.processing
                  ? "Processing..."
                  : `Pay ₹${Number(payModal.request.requested_amount).toLocaleString("en-IN")}`}
              </button>
            </div>
          </div>
        </div>
      )}

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
