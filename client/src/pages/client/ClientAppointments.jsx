import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  MapPin,
  FileText,
  User,
  ArrowLeft,
  XCircle,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Phone,
  CreditCard,
  IndianRupee,
  ShieldCheck,
  Banknote,
  ArrowRight,
} from "lucide-react";
import { API_URL } from "../../services/api";
import LanguageSelector from "../../components/common/LanguageSelector";
import { handleLogoClick } from "../../utils/navigation";
import "./ClientAppointments.css";

function ClientAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // PAYMENT MODAL STATE
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    appointment: null,
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

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError("");

      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(`${API_URL}/api/appointments/client`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load appointments");
      }

      setAppointments(data.appointments || []);
    } catch (err) {
      console.error("Fetch client appointments error:", err);
      setError(err.message || "Unable to load appointments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // OPEN PAYMENT MODAL
  const openPaymentModal = (appt) => {
    setPaymentModal({
      isOpen: true,
      appointment: appt,
      method: "online",
      processing: false,
      error: "",
    });
  };

  // EXECUTE PAYMENT
  const handleExecutePayment = async () => {
    const appt = paymentModal.appointment;
    if (!appt) return;

    try {
      setPaymentModal((prev) => ({ ...prev, processing: true, error: "" }));

      // SCENARIO 1: CASH PAYMENT
      if (paymentModal.method === "cash") {
        const res = await fetch(`${API_URL}/api/appointments/${appt.id}/pay/cash`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Cash payment processing failed");
        }

        setSuccessMsg(`Cash payment confirmed! Project with ${appt.worker_name} is now ACTIVE.`);
        setPaymentModal({
          isOpen: false,
          appointment: null,
          method: "online",
          processing: false,
          error: "",
        });
        await fetchAppointments();
        return;
      }

      // SCENARIO 2: ONLINE PAYMENT VIA RAZORPAY
      const orderRes = await fetch(`${API_URL}/api/appointments/${appt.id}/pay/order`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.message || "Unable to create payment order");
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
        description: `Project Initial Payment: ₹${appt.agreed_amount}`,
        order_id: orderData.order.id,

        handler: async function (response) {
          try {
            const verifyRes = await fetch(`${API_URL}/api/appointments/${appt.id}/pay/verify`, {
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

            setSuccessMsg(`Payment completed successfully! 🎉 Project with ${appt.worker_name} is now ACTIVE.`);
            setPaymentModal({
              isOpen: false,
              appointment: null,
              method: "online",
              processing: false,
              error: "",
            });
            await fetchAppointments();
          } catch (vErr) {
            console.error("Payment verify error:", vErr);
            setPaymentModal((prev) => ({
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
            setPaymentModal((prev) => ({ ...prev, processing: false }));
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on("payment.failed", function (response) {
        console.error("Payment failed:", response.error);
        setPaymentModal((prev) => ({
          ...prev,
          processing: false,
          error: response.error?.description || "Payment failed",
        }));
      });

      razorpayInstance.open();
    } catch (err) {
      console.error("Payment order error:", err);
      setPaymentModal((prev) => ({
        ...prev,
        processing: false,
        error: err.message || "Payment initialization failed",
      }));
    }
  };

  const handleCancel = async (appointmentId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment request?")) {
      return;
    }

    try {
      setCancellingId(appointmentId);
      setError("");
      setSuccessMsg("");

      const res = await fetch(`${API_URL}/api/appointments/${appointmentId}/cancel`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to cancel appointment");
      }

      setSuccessMsg("Appointment request cancelled successfully.");
      await fetchAppointments();
    } catch (err) {
      console.error("Cancel appointment error:", err);
      setError(err.message || "Unable to cancel appointment");
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "accepted":
        return <span className="status-badge status-accepted">Appointment Accepted</span>;
      case "payment_pending":
        return <span className="status-badge status-payment-pending">Payment Pending</span>;
      case "project_active":
        return <span className="status-badge status-project-active">Project Active</span>;
      case "work_refused":
        return <span className="status-badge status-work-refused">Work Refused</span>;
      case "rejected":
        return <span className="status-badge status-rejected">Appointment Rejected</span>;
      case "cancelled":
        return <span className="status-badge status-cancelled">Cancelled</span>;
      case "pending":
      default:
        return <span className="status-badge status-pending">Pending Worker Review</span>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Not specified";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    return timeStr.slice(0, 5);
  };

  return (
    <div className="client-appointments-page">
      <header className="appointments-header">
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
            className="back-btn"
            onClick={() => navigate("/client/dashboard")}
          >
            <ArrowLeft size={17} />
            Dashboard
          </button>
          <LanguageSelector />
        </div>
      </header>

      <main className="appointments-main">
        <section className="appointments-intro">
          <div>
            <div className="intro-title-row">
              <CalendarDays size={26} color="#2563eb" />
              <h2>My Appointments</h2>
            </div>
            <p>
              Track your meeting and consultation requests with professionals before hiring.
            </p>
          </div>

          <button
            className="refresh-btn"
            onClick={fetchAppointments}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "spin-icon" : ""} />
            Refresh
          </button>
        </section>

        {successMsg && (
          <div className="alert-success">
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="loading-box">
            <Clock size={36} className="spin-icon" />
            <p>Loading your appointments...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="empty-box">
            <CalendarDays size={48} />
            <h3>No Appointments Requested Yet</h3>
            <p>
              When you view a worker's profile and click "Request Appointment", your meeting requests will appear here.
            </p>
            <button
              className="browse-workers-btn"
              onClick={() => navigate("/client/workers")}
            >
              Find Workers to Consult
            </button>
          </div>
        ) : (
          <div className="appointments-grid">
            {appointments.map((appt) => (
              <article className="appointment-card" key={appt.id}>
                <div className="card-top">
                  <div className="worker-info-group">
                    <div className="avatar-circle">
                      {appt.worker_avatar_url ? (
                        <img src={appt.worker_avatar_url} alt={appt.worker_name} />
                      ) : (
                        <User size={22} />
                      )}
                    </div>
                    <div>
                      <h3>{appt.worker_name}</h3>
                      <p>{appt.worker_city ? `📍 ${appt.worker_city}` : "Service Professional"}</p>
                    </div>
                  </div>

                  {getStatusBadge(appt.status)}
                </div>

                <div className="card-details">
                  <div className="detail-item">
                    <CalendarDays size={16} />
                    <div>
                      <small>Requested Date & Time</small>
                      <strong>
                        {formatDate(appt.appointment_date)} at {formatTime(appt.appointment_time)}
                      </strong>
                    </div>
                  </div>

                  <div className="detail-item">
                    <MapPin size={16} />
                    <div>
                      <small>Meeting Location</small>
                      <strong title={appt.location}>{appt.location}</strong>
                    </div>
                  </div>

                  {appt.service_name && (
                    <div className="detail-item">
                      <Clock size={16} />
                      <div>
                        <small>Service</small>
                        <strong>{appt.service_name}</strong>
                      </div>
                    </div>
                  )}

                  {appt.status === "accepted" && appt.worker_phone && (
                    <div className="detail-item worker-phone-item">
                      <Phone size={16} color="#16a34a" />
                      <div>
                        <small>Worker Phone</small>
                        <strong>{appt.worker_phone}</strong>
                      </div>
                    </div>
                  )}
                </div>

                {appt.description && (
                  <div className="card-desc">
                    <small>Consultation Details</small>
                    <p>{appt.description}</p>
                  </div>
                )}

                {/* WORK STAGE BANNERS & WORK DECISION CALLOUTS */}
                
                {/* 1. APPOINTMENT ACCEPTED (Meeting stage, decision pending) */}
                {appt.status === "accepted" && (
                  <div className="appt-stage-box stage-meeting-accepted">
                    <div className="stage-title">
                      <CheckCircle size={16} color="#16a34a" />
                      <strong>Appointment Accepted — Meeting Scheduled</strong>
                    </div>
                    <p>
                      The worker has accepted your appointment request to meet and discuss the work. 
                      Please note: <em>Accepting an appointment does not mean accepting the actual work.</em> 
                      After meeting, the worker will decide whether to take on the project and propose the agreed amount.
                    </p>
                  </div>
                )}

                {/* 2. WORK REFUSED */}
                {appt.status === "work_refused" && (
                  <div className="appt-stage-box stage-work-refused">
                    <div className="stage-title">
                      <XCircle size={16} color="#dc2626" />
                      <strong>Work Refused After Meeting</strong>
                    </div>
                    <p>
                      Following your consultation, the worker decided not to take on this project. 
                      No payment was charged, and no project was created. You are free to consult another professional.
                    </p>
                    <button
                      type="button"
                      className="re-browse-btn"
                      onClick={() => navigate("/client/workers")}
                    >
                      Find Another Worker
                    </button>
                  </div>
                )}

                {/* 3. PAYMENT PENDING (Worker accepted work & set agreed amount) */}
                {appt.status === "payment_pending" && (
                  <div className="appt-stage-box stage-payment-pending">
                    <div className="stage-title">
                      <Clock size={16} color="#d97706" />
                      <strong>Work Agreed — Payment Required</strong>
                    </div>
                    
                    <div className="agreed-details-panel">
                      <div className="agreed-amount-highlight">
                        <span>Agreed Project Amount:</span>
                        <strong>₹{Number(appt.agreed_amount || 0).toLocaleString("en-IN")}</strong>
                      </div>
                      {appt.agreed_notes && (
                        <div className="agreed-scope-notes">
                          <small>Agreed Work Details / Materials Scope:</small>
                          <p>{appt.agreed_notes}</p>
                        </div>
                      )}
                    </div>

                    <p className="pay-prompt-text">
                      Please pay the agreed amount to activate this project and secure the worker.
                    </p>

                    <button
                      type="button"
                      className="pay-agreed-amount-btn"
                      onClick={() => openPaymentModal(appt)}
                    >
                      <CreditCard size={17} />
                      Pay Agreed Amount (₹{Number(appt.agreed_amount || 0).toLocaleString("en-IN")})
                    </button>
                  </div>
                )}

                {/* 4. PROJECT ACTIVE */}
                {appt.status === "project_active" && (
                  <div className="appt-stage-box stage-project-active">
                    <div className="stage-title">
                      <CheckCircle size={16} color="#16a34a" />
                      <strong>Project ACTIVE & Committed 🎉</strong>
                    </div>
                    <p>
                      Payment is complete and the worker is committed to this project!
                      Agreed amount: <strong>₹{Number(appt.agreed_amount || 0).toLocaleString("en-IN")}</strong>
                    </p>
                    {appt.booking_id && (
                      <button
                        type="button"
                        className="view-project-btn"
                        onClick={() => navigate(`/client/bookings/${appt.booking_id}`)}
                      >
                        View Active Project Details
                        <ArrowRight size={15} />
                      </button>
                    )}
                  </div>
                )}

                <div className="card-footer">
                  <span className="card-requested-time">
                    Requested on {formatDate(appt.created_at)}
                  </span>

                  {appt.status === "pending" && (
                    <button
                      className="cancel-appt-btn"
                      onClick={() => handleCancel(appt.id)}
                      disabled={cancellingId === appt.id}
                    >
                      <XCircle size={15} />
                      {cancellingId === appt.id ? "Cancelling..." : "Cancel Request"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* CLIENT PAYMENT MODAL */}
      {paymentModal.isOpen && paymentModal.appointment && (
        <div
          className="client-payment-modal-backdrop"
          onClick={() => !paymentModal.processing && setPaymentModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div className="client-payment-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="payment-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <CreditCard size={22} color="#2563eb" />
                <h3>Pay Agreed Amount</h3>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => !paymentModal.processing && setPaymentModal((prev) => ({ ...prev, isOpen: false }))}
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="payment-modal-body">
              {paymentModal.error && (
                <div className="payment-modal-error">
                  <AlertCircle size={16} />
                  <span>{paymentModal.error}</span>
                </div>
              )}

              <div className="payment-summary-card">
                <div className="summary-row">
                  <span>Worker</span>
                  <strong>{paymentModal.appointment.worker_name}</strong>
                </div>
                <div className="summary-row">
                  <span>Service</span>
                  <strong>{paymentModal.appointment.service_name || "Service Project"}</strong>
                </div>
                <div className="summary-row">
                  <span>Job Location</span>
                  <strong>{paymentModal.appointment.location}</strong>
                </div>
                {paymentModal.appointment.agreed_notes && (
                  <div className="summary-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                    <span>Work Scope</span>
                    <p style={{ margin: 0, fontSize: "13px", color: "#334155" }}>
                      {paymentModal.appointment.agreed_notes}
                    </p>
                  </div>
                )}
                <div className="total-divider"></div>
                <div className="total-amount-row">
                  <span>Agreed Amount to Pay</span>
                  <strong>₹{Number(paymentModal.appointment.agreed_amount || 0).toLocaleString("en-IN")}</strong>
                </div>
              </div>

              <div className="payment-method-selection">
                <label>Select Payment Method:</label>

                <div className="method-options">
                  <div
                    className={`method-tile ${paymentModal.method === "online" ? "selected" : ""}`}
                    onClick={() => setPaymentModal((prev) => ({ ...prev, method: "online" }))}
                  >
                    <CreditCard size={20} color="#2563eb" />
                    <div>
                      <strong>Pay Online (Razorpay)</strong>
                      <small>Cards, UPI, Netbanking, Wallets</small>
                    </div>
                  </div>

                  <div
                    className={`method-tile ${paymentModal.method === "cash" ? "selected" : ""}`}
                    onClick={() => setPaymentModal((prev) => ({ ...prev, method: "cash" }))}
                  >
                    <Banknote size={20} color="#16a34a" />
                    <div>
                      <strong>Cash Payment</strong>
                      <small>Pay the worker in cash at the work site</small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="security-guarantee-note">
                <ShieldCheck size={18} color="#16a34a" />
                <span>Protected by HelpHub Project Safety Policy. Work will become active immediately.</span>
              </div>
            </div>

            <div className="payment-modal-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setPaymentModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={paymentModal.processing}
              >
                Cancel
              </button>

              <button
                type="button"
                className="confirm-pay-btn"
                onClick={handleExecutePayment}
                disabled={paymentModal.processing}
              >
                <CheckCircle size={16} />
                {paymentModal.processing
                  ? "Processing Payment..."
                  : `Pay ₹${Number(paymentModal.appointment.agreed_amount || 0).toLocaleString("en-IN")}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientAppointments;
