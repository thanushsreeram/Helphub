import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  Banknote,
  CheckCircle,
  IndianRupee,
  ShieldCheck,
} from "lucide-react";
import { API_URL } from "../../services/api";

import LanguageSelector from "../../components/common/LanguageSelector";
import { handleLogoClick } from "../../utils/navigation";
import "./ClientPayment.css";

function ClientPayment() {
  const navigate = useNavigate();
  const { bookingId } = useParams();

  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const [paymentMethod, setPaymentMethod] = useState("online");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = localStorage.getItem("helphub_token");

  useEffect(() => {
    const loadPaymentData = async () => {
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");

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

        const paymentResponse = await fetch(
          `${API_URL}/api/payments/${bookingId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const paymentData = await paymentResponse.json();

        if (paymentResponse.ok && paymentData.success) {
          setPayment(paymentData.payment);
        }
      } catch (error) {
        console.error("Payment page error:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadPaymentData();
  }, [bookingId, token, navigate]);

  const handlePayment = async () => {
    if (!booking) return;

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      if (paymentMethod === "cash") {
        const response = await fetch(
          `${API_URL}/api/payments/${bookingId}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              payment_method: "cash",
            }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Cash payment failed");
        }

        setPayment(data.payment);
        setSuccess(data.message);
        return;
      }

      const orderResponse = await fetch(
        `${API_URL}/api/payments/${bookingId}/order`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const orderData = await orderResponse.json();

      if (!orderResponse.ok || !orderData.success) {
        throw new Error(
          orderData.message || "Unable to create payment order"
        );
      }

      if (!window.Razorpay) {
        throw new Error(
          "Razorpay Checkout is not loaded. Please refresh the page."
        );
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "HelpHub",
        description: `Payment for Booking #${bookingId}`,
        order_id: orderData.order.id,

        handler: async function (response) {
          try {
            const verifyResponse = await fetch(
              `${API_URL}/api/payments/verify`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  booking_id: Number(bookingId),
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              }
            );

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok || !verifyData.success) {
              throw new Error(
                verifyData.message || "Payment verification failed"
              );
            }

            setPayment(verifyData.payment);
            setSuccess("Payment completed successfully! 🎉");
          } catch (error) {
            console.error("Payment verification error:", error);
            setError(error.message);
          } finally {
            setProcessing(false);
          }
        },

        prefill: {
          name: booking.client_name || "",
          email: "",
        },

        notes: {
          booking_id: String(bookingId),
        },

        theme: {
          color: "#2563eb",
        },

        modal: {
          ondismiss: function () {
            setProcessing(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", function (response) {
        console.error("Razorpay payment failed:", response.error);
        setError(
          response.error?.description || "Payment failed"
        );
        setProcessing(false);
      });

      razorpay.open();
    } catch (error) {
      console.error("Payment error:", error);
      setError(error.message);
      setProcessing(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "Not specified";

    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  if (loading) {
    return (
      <div className="payment-page">
        <div className="payment-loading">
          <div className="payment-spinner"></div>
          <p>Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="payment-page">
        <div className="payment-error">
          <h2>Unable to load payment</h2>
          <p>{error}</p>
          <button onClick={() => navigate("/client/bookings")}>
            <ArrowLeft size={18} />
            Back to Bookings
          </button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  return (
    <div className="payment-page">
      {/* Header */}
      <header className="payment-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="payment-brand" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 onClick={() => handleLogoClick(navigate)} style={{ cursor: "pointer" }} title="Go Back">
            <img src="/helphub-logo-transparent.png" alt="HelpHub" style={{ height: "40px", objectFit: "contain" }} />
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            className="payment-back-button"
            onClick={() => navigate("/client/bookings")}
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <LanguageSelector />
        </div>
      </header>

      <main className="payment-container">
        {/* Page title */}
        <div className="payment-title">
          <div className="title-icon">
            <CreditCard size={25} />
          </div>

          <div>
            <h2>Complete Your Payment</h2>
            <p>
              Review your booking and choose a payment method.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="payment-alert error-alert">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="payment-alert success-alert">
            <CheckCircle size={20} />
            <span>{success}</span>
          </div>
        )}

        <div className="payment-grid">
          {/* Booking summary */}
          <section className="booking-summary payment-card">
            <div className="card-heading">
              <h3>Booking Summary</h3>
              <span className={`status ${booking.status}`}>
                {booking.status?.replace("_", " ")}
              </span>
            </div>

            <div className="summary-row">
              <span>Booking ID</span>
              <strong>#{booking.id}</strong>
            </div>

            <div className="summary-row">
              <span>Service</span>
              <strong>{booking.service_name || "Service"}</strong>
            </div>

            <div className="summary-row">
              <span>Worker</span>
              <strong>{booking.worker_name || "Worker"}</strong>
            </div>

            <div className="summary-row">
              <span>Date & Time</span>
              <strong>{formatDate(booking.booking_date)}</strong>
            </div>

            <div className="summary-row">
              <span>Location</span>
              <strong>{booking.location || "Not provided"}</strong>
            </div>

            <div className="cost-divider"></div>

            <div className="cost-row">
              <span>Labour</span>
              <span>₹{Number(booking.labour_cost || 0).toFixed(2)}</span>
            </div>

            <div className="cost-row">
              <span>Materials</span>
              <span>₹{Number(booking.material_cost || 0).toFixed(2)}</span>
            </div>

            <div className="cost-row">
              <span>Travel</span>
              <span>₹{Number(booking.travel_charge || 0).toFixed(2)}</span>
            </div>

            <div className="total-row">
              <span>Total</span>
              <strong>
                <IndianRupee size={20} />
                {Number(booking.total_cost || 0).toFixed(2)}
              </strong>
            </div>
          </section>

          {/* Payment section */}
          <section className="payment-method-card payment-card">
            {payment ? (
              <div className="already-paid">
                <div className="paid-icon">
                  <CheckCircle size={55} />
                </div>
                <h3>Payment Already Recorded</h3>
                <p>This booking already has a payment associated with it.</p>
                <div className="payment-info">
                  <div>
                    <span>Amount</span>
                    <strong>₹{Number(payment.amount).toFixed(2)}</strong>
                  </div>
                  <div>
                    <span>Method</span>
                    <strong>{payment.payment_method}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>{payment.payment_status}</strong>
                  </div>
                  {payment.transaction_id && (
                    <div>
                      <span>Transaction ID</span>
                      <strong>{payment.transaction_id}</strong>
                    </div>
                  )}
                </div>
                <button
                  className="back-bookings-button"
                  onClick={() => navigate("/client/bookings")}
                >
                  <ArrowLeft size={18} />
                  Back to My Bookings
                </button>
              </div>
            ) : (
              <>
                <div className="card-heading">
                  <h3>Choose Payment Method</h3>
                </div>

                <div className="payment-options">
                  <button
                    className={`payment-option ${
                      paymentMethod === "online" ? "selected" : ""
                    }`}
                    onClick={() => setPaymentMethod("online")}
                  >
                    <div className="option-icon">
                      <CreditCard size={25} />
                    </div>
                    <div>
                      <strong>Online Payment</strong>
                      <span>Pay securely online</span>
                    </div>
                    {paymentMethod === "online" && (
                      <CheckCircle className="option-check" size={20} />
                    )}
                  </button>

                  <button
                    className={`payment-option ${
                      paymentMethod === "cash" ? "selected" : ""
                    }`}
                    onClick={() => setPaymentMethod("cash")}
                  >
                    <div className="option-icon">
                      <Banknote size={25} />
                    </div>
                    <div>
                      <strong>Cash Payment</strong>
                      <span>Pay the worker in cash</span>
                    </div>
                    {paymentMethod === "cash" && (
                      <CheckCircle className="option-check" size={20} />
                    )}
                  </button>
                </div>

                <div className="secure-note">
                  <ShieldCheck size={20} />
                  <div>
                    <strong>Secure Payment</strong>
                    <p>The payment amount is taken directly from your booking total.</p>
                  </div>
                </div>

                <button
                  className="pay-button"
                  onClick={handlePayment}
                  disabled={processing}
                >
                  {processing ? (
                    "Processing..."
                  ) : (
                    <>
                      <CreditCard size={19} />
                      Pay ₹{Number(booking.total_cost || 0).toFixed(2)}
                    </>
                  )}
                </button>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default ClientPayment;
