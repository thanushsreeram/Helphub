import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  MapPin,
  FileText,
  User,
  ArrowLeft,
  Send,
  Navigation,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Briefcase,
} from "lucide-react";
import { API_URL } from "../../services/api";
import LanguageSelector from "../../components/common/LanguageSelector";
import { handleLogoClick } from "../../utils/navigation";
import "./AppointmentForm.css";

function AppointmentForm() {
  const { workerId } = useParams();
  const navigate = useNavigate();

  const [worker, setWorker] = useState(null);
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Live Location states
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");
  const [locationSuccess, setLocationSuccess] = useState(false);

  const token = localStorage.getItem("helphub_token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchWorkerData = async () => {
      try {
        setLoading(true);
        setError("");

        const [workerRes, servicesRes] = await Promise.all([
          fetch(`${API_URL}/api/workers?worker_id=${workerId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/services`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const workerData = await workerRes.json();
        const servicesData = await servicesRes.json();

        if (!workerRes.ok || !workerData.success) {
          throw new Error(workerData.message || "Failed to load worker");
        }

        const foundWorker = workerData.workers?.find(
          (w) => Number(w.worker_id) === Number(workerId),
        );

        if (!foundWorker) {
          throw new Error("Worker profile not found");
        }

        setWorker(foundWorker);
        setServices(foundWorker.services || servicesData.services || []);
      } catch (err) {
        console.error("Appointment form load error:", err);
        setError(err.message || "Unable to load worker information");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkerData();
  }, [workerId, token, navigate]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not supported by your browser");
      setLocationSuccess(false);
      return;
    }

    setDetectingLocation(true);
    setLocationStatus("Getting GPS coordinates...");
    setLocationSuccess(false);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocationStatus("Resolving address details...");

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            { headers: { "Accept-Language": "en" } },
          );

          if (res.ok) {
            const data = await res.json();
            const formatted =
              data.display_name ||
              [
                data.address?.road,
                data.address?.suburb,
                data.address?.city || data.address?.town,
                data.address?.state,
                data.address?.postcode,
              ]
                .filter(Boolean)
                .join(", ");

            if (formatted) {
              setLocation(formatted);
              setLocationStatus("Current address detected accurately!");
              setLocationSuccess(true);
              return;
            }
          }

          setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          setLocationStatus("GPS coordinates captured!");
          setLocationSuccess(true);
        } catch (err) {
          console.warn("Reverse geocode failed:", err);
          setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          setLocationStatus("GPS coordinates captured!");
          setLocationSuccess(true);
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        setDetectingLocation(false);
        setLocationSuccess(false);
        if (err.code === 1) {
          setLocationStatus("Permission denied. Please allow location access.");
        } else {
          setLocationStatus("Could not detect location. Please type manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!appointmentDate) {
      setError("Please select a preferred date for the appointment.");
      return;
    }
    if (!appointmentTime) {
      setError("Please select a preferred time for the appointment.");
      return;
    }
    if (!location.trim()) {
      setError("Please specify the job location where you want to meet.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          worker_id: Number(workerId),
          service_id: serviceId ? Number(serviceId) : null,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          location: location.trim(),
          description: description.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to send appointment request");
      }

      // Success -> navigate to My Appointments
      navigate("/client/appointments", {
        state: { message: "Appointment request sent successfully!" },
      });
    } catch (err) {
      console.error("Submit appointment error:", err);
      setError(err.message || "Something went wrong while sending request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="appointment-page">
        <div className="appointment-loading">
          <Clock size={40} className="spin-icon" />
          <h2>Loading Appointment Form...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="appointment-page">
      {/* HEADER */}
      <header className="appointment-header">
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
            type="button"
            className="appointment-back-btn"
            onClick={() => navigate(`/client/worker/${workerId}`)}
          >
            <ArrowLeft size={17} />
            Back to Worker Profile
          </button>
          <LanguageSelector />
        </div>
      </header>

      <main className="appointment-container">
        {/* TITLE */}
        <section className="appointment-title-card">
          <div className="appointment-title-icon">
            <CalendarDays size={28} />
          </div>
          <div>
            <h2>Request an Appointment</h2>
            <p>
              Request a meeting with <strong>{worker?.name}</strong> to inspect the
              work, discuss requirements, and get an accurate estimate in person.
            </p>
          </div>
        </section>

        {/* WORKER SUMMARY */}
        <section className="worker-summary-card">
          <div className="worker-avatar-box">
            {worker?.avatar_url ? (
              <img src={worker.avatar_url} alt={worker.name} />
            ) : (
              <User size={30} />
            )}
          </div>
          <div className="worker-summary-info">
            <h3>{worker?.name}</h3>
            <p>{worker?.category || "Professional Worker"}</p>
            <div className="worker-pills">
              <span>📍 {worker?.location || "Local Area"}</span>
              <span>⭐ {worker?.rating ? Number(worker.rating).toFixed(1) : "New"} ({worker?.total_reviews || 0} reviews)</span>
            </div>
          </div>
        </section>

        {/* NOTICE BOX */}
        <div className="appointment-notice">
          <AlertCircle size={20} />
          <div>
            <strong>Appointment Notice:</strong>
            <p>
              This is an <strong>appointment request</strong> to meet and discuss the job.
              It does not require payment now or confirm final hiring until you and the worker agree.
            </p>
          </div>
        </div>

        {error && <div className="appointment-error-banner">{error}</div>}

        {/* FORM */}
        <form className="appointment-form" onSubmit={handleSubmit}>
          {/* SERVICE SELECTION */}
          <div className="form-card">
            <div className="form-card-header">
              <Briefcase size={20} />
              <h3>Service Required</h3>
            </div>
            <div className="form-field">
              <label>Select Service (Optional)</label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                <option value="">-- Select a service or leave blank --</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <small className="field-hint">
                Choose the service category you want to consult with this worker about.
              </small>
            </div>
          </div>

          {/* DATE & TIME */}
          <div className="form-card">
            <div className="form-card-header">
              <Clock size={20} />
              <h3>Preferred Schedule</h3>
            </div>
            <div className="schedule-row">
              <div className="form-field">
                <label>
                  Preferred Date <span>*</span>
                </label>
                <input
                  type="date"
                  value={appointmentDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label>
                  Preferred Time <span>*</span>
                </label>
                <input
                  type="time"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* LOCATION */}
          <div className="form-card">
            <div className="form-card-header">
              <MapPin size={20} />
              <h3>Meeting / Job Location</h3>
            </div>
            <div className="form-field">
              <div className="location-label-row">
                <label>
                  Where should the worker visit? <span>*</span>
                </label>
                <button
                  type="button"
                  className="use-live-location-btn"
                  onClick={handleUseCurrentLocation}
                  disabled={detectingLocation}
                  title="Detect and fill your current GPS location"
                >
                  {detectingLocation ? (
                    <>
                      <Loader2 size={14} className="location-spin" />
                      <span>Detecting location...</span>
                    </>
                  ) : (
                    <>
                      <Navigation size={14} />
                      <span>Use My Live Location</span>
                    </>
                  )}
                </button>
              </div>

              <textarea
                rows="3"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  if (locationStatus) setLocationStatus("");
                }}
                placeholder="Enter complete house address, apartment number, landmark, street, city..."
                required
              />

              {locationStatus && (
                <div
                  className={`location-feedback ${
                    locationSuccess
                      ? "location-feedback-success"
                      : "location-feedback-warning"
                  }`}
                >
                  {locationSuccess ? (
                    <CheckCircle2 size={15} />
                  ) : (
                    <MapPin size={15} />
                  )}
                  <span>{locationStatus}</span>
                </div>
              )}
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="form-card">
            <div className="form-card-header">
              <FileText size={20} />
              <h3>Work Description & Consultation Notes</h3>
            </div>
            <div className="form-field">
              <label>Explain what you need done</label>
              <textarea
                rows="4"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue, work scope, materials you might have, or questions you want to discuss with the worker..."
              />
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate(`/client/worker/${workerId}`)}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-submit-appointment"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="location-spin" />
                  <span>Sending Request...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Send Appointment Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default AppointmentForm;
