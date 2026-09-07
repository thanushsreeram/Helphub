import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_URL } from "../../services/api";
import LanguageSelector from "../../components/common/LanguageSelector";
import "./BookingForm.css";

function BookingForm() {
  const { workerId } = useParams();
  const navigate = useNavigate();

  const [worker, setWorker] = useState(null);
  const [services, setServices] = useState([]);
  const [workersRequired, setWorkersRequired] = useState(1);
  const [materialsProvidedBy, setMaterialsProvidedBy] = useState("client");

  // Worker availability
  const [availability, setAvailability] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [isTimeAvailable, setIsTimeAvailable] = useState(null);

  const [serviceId, setServiceId] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const [labourCost, setLabourCost] = useState("");
  const [materialCost, setMaterialCost] = useState("");
  const [travelCharge, setTravelCharge] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("helphub_token");

  // Fetch worker + services + availability
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        setAvailabilityLoading(true);

        const [workerResponse, servicesResponse, availabilityResponse] =
          await Promise.all([
            fetch(`${API_URL}/api/workers?worker_id=${workerId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }),

            fetch(`${API_URL}/api/services`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }),

            fetch(`${API_URL}/api/workers/${workerId}/availability`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }),
          ]);

        const workerData = await workerResponse.json();
        const servicesData = await servicesResponse.json();
        const availabilityData = await availabilityResponse.json();

        // Worker validation
        if (!workerResponse.ok || !workerData.success) {
          throw new Error(workerData.message || "Failed to load worker");
        }

        // Services validation
        if (!servicesResponse.ok || !servicesData.success) {
          throw new Error(servicesData.message || "Failed to load services");
        }

        // Availability
        if (availabilityData.success) {
          setAvailability(availabilityData.availability || []);
        } else {
          setAvailability([]);
        }

        const workers = workerData.workers || [];

        const selectedWorker = workers.find(
          (item) => Number(item.worker_id) === Number(workerId)
        );

        if (!selectedWorker) {
          throw new Error("Worker not found");
        }

        setWorker(selectedWorker);
        setServices(selectedWorker.services || []);

        if (selectedWorker.hourly_rate) {
          setLabourCost(selectedWorker.hourly_rate);
        }
      } catch (err) {
        console.error("Booking form error:", err);
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
        setAvailabilityLoading(false);
      }
    };

    if (!token) {
      navigate("/login");
      return;
    }

    fetchData();
  }, [workerId, navigate, token]);

  const totalCost =
    Number(labourCost || 0) +
    Number(materialCost || 0) +
    Number(travelCharge || 0);

  const checkWorkerAvailability = (dateTimeValue) => {
    if (!dateTimeValue) {
      setIsTimeAvailable(null);
      setAvailabilityMessage("");
      return;
    }

    if (availabilityLoading) {
      return;
    }

    if (availability.length === 0) {
      setIsTimeAvailable(false);
      setAvailabilityMessage("This worker has not set their working hours yet.");
      return;
    }

    const selectedDate = new Date(dateTimeValue);

    if (Number.isNaN(selectedDate.getTime())) {
      setIsTimeAvailable(false);
      setAvailabilityMessage("Please select a valid date and time.");
      return;
    }

    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const selectedDay = dayNames[selectedDate.getDay()];
    const selectedTime =
      selectedDate.getHours().toString().padStart(2, "0") +
      ":" +
      selectedDate.getMinutes().toString().padStart(2, "0");

    const dayAvailability = availability.find(
      (day) => day.day_of_week === selectedDay && day.is_available === true
    );

    if (!dayAvailability) {
      setIsTimeAvailable(false);
      setAvailabilityMessage(`Worker is not available on ${selectedDay}.`);
      return;
    }

    const startTime = dayAvailability.start_time.slice(0, 5);
    const endTime = dayAvailability.end_time.slice(0, 5);

    if (selectedTime >= startTime && selectedTime < endTime) {
      setIsTimeAvailable(true);
      setAvailabilityMessage(
        `Worker is available on ${selectedDay} from ${startTime} to ${endTime}.`
      );
    } else {
      setIsTimeAvailable(false);
      setAvailabilityMessage(
        `Worker is available on ${selectedDay} from ${startTime} to ${endTime}. Please choose a time within these hours.`
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      const bookingData = {
        worker_id: Number(workerId),
        service_id: serviceId ? Number(serviceId) : null,
        booking_date: bookingDate,
        location,
        description,
        labour_cost: Number(labourCost || 0),
        material_cost: Number(materialCost || 0),
        travel_charge: Number(travelCharge || 0),
        workers_required: Number(workersRequired || 1),
        materials_provided_by: materialsProvidedBy,
      };

      const response = await fetch(`${API_URL}/api/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bookingData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to create booking");
      }

      navigate(`/client/bookings/${data.booking?.booking_id || ""}`);
    } catch (err) {
      console.error("Submit booking error:", err);
      setError(err.message || "Failed to submit booking");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="booking-page">
        <div className="booking-container">
          <div className="booking-loading">
            <div className="loader"></div>
            <p>Loading booking details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !worker) {
    return (
      <div className="booking-page">
        <div className="booking-container">
          <div className="booking-error-card">
            <h2>Error Loading Worker</h2>
            <p>{error}</p>
            <button onClick={() => navigate(-1)}>Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <div className="booking-container">
        <header className="booking-header">
          <div className="header-left">
            <button className="back-button" onClick={() => navigate(-1)}>
              ← Back
            </button>
            <div>
              <h1>Book Worker</h1>
              <p>Schedule service with {worker?.name || "Worker"}</p>
            </div>
          </div>
          <div className="header-right" style={{ display: "flex", alignItems: "center" }}>
            <LanguageSelector />
          </div>
        </header>

        {/* Selected Worker Info */}
        <div className="selected-worker-card">
          <div className="worker-avatar">
            {worker?.name ? worker.name.charAt(0).toUpperCase() : "W"}
          </div>

          <div className="worker-info">
            <h2>{worker?.name}</h2>
            <p>{worker?.category_name || "General Worker"}</p>

            <div className="worker-meta">
              <span>📍 {worker?.city || "Local"}</span>
              <span>⭐ {worker?.rating || "New"}</span>
              <span>💰 ₹{worker?.hourly_rate || 0}/hr</span>
              <span>📞 {worker?.phone}</span>
            </div>
          </div>
        </div>

        {error && <div className="booking-alert">{error}</div>}

        <form className="booking-form" onSubmit={handleSubmit}>
          {/* Service & Details */}
          <section className="form-section">
            <div className="section-title">
              <span>🛠️</span>
              <div>
                <h2>Service Details</h2>
                <p>Select service and specify requirement.</p>
              </div>
            </div>

            <div className="form-group">
              <label>Select Service</label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                <option value="">General Work (Custom)</option>
                {services.map((service) => (
                  <option key={service.service_id} value={service.service_id}>
                    {service.service_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                Workers Required <span>*</span>
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={workersRequired}
                onChange={(e) => setWorkersRequired(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Job Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the job work, expectations, etc..."
                rows="3"
              />
            </div>
          </section>

          {/* Schedule & Availability */}
          <section className="form-section">
            <div className="section-title">
              <span>📅</span>
              <div>
                <h2>Schedule</h2>
                <p>Choose when the worker should visit.</p>
              </div>
            </div>

            <div className="form-group">
              <label>
                Date & Time <span>*</span>
              </label>
              <input
                type="datetime-local"
                value={bookingDate}
                onChange={(e) => {
                  const value = e.target.value;
                  setBookingDate(value);
                  checkWorkerAvailability(value);
                }}
                required
              />

              {availabilityLoading && (
                <p className="availability-info">
                  Checking worker availability...
                </p>
              )}

              {!availabilityLoading && availability.length === 0 && (
                <p className="availability-warning">
                  ⚠️ This worker has not set their working hours yet.
                </p>
              )}

              {availabilityMessage && (
                <div
                  className={
                    isTimeAvailable
                      ? "availability-success"
                      : "availability-warning"
                  }
                >
                  {isTimeAvailable ? "✓ " : "⚠️ "}
                  {availabilityMessage}
                </div>
              )}
            </div>
          </section>

          {/* Location */}
          <section className="form-section">
            <div className="section-title">
              <span>📍</span>
              <div>
                <h2>Job Location</h2>
                <p>Where should the worker come?</p>
              </div>
            </div>

            <div className="form-group">
              <label>
                Location <span>*</span>
              </label>
              <textarea
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter complete job address..."
                rows="3"
                required
              />
            </div>
          </section>

          {/* Cost & Materials */}
          <section className="form-section">
            <div className="form-group">
              <label>
                Who will provide the materials? <span>*</span>
              </label>
              <select
                value={materialsProvidedBy}
                onChange={(e) => setMaterialsProvidedBy(e.target.value)}
                required
              >
                <option value="client">Client will provide materials</option>
                <option value="worker">Worker will provide materials</option>
                <option value="shared">Shared responsibility</option>
              </select>
            </div>

            <div className="section-title">
              <span>💰</span>
              <div>
                <h2>Cost Estimate</h2>
                <p>Enter the expected job costs.</p>
              </div>
            </div>

            <div className="cost-grid">
              <div className="form-group">
                <label>
                  Labour Cost <span>*</span>
                </label>
                <div className="input-with-symbol">
                  <span>₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={labourCost}
                    onChange={(e) => setLabourCost(e.target.value)}
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Material Cost</label>
                <div className="input-with-symbol">
                  <span>₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={materialCost}
                    onChange={(e) => setMaterialCost(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Travel Charge</label>
                <div className="input-with-symbol">
                  <span>₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={travelCharge}
                    onChange={(e) => setTravelCharge(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Summary */}
          <div className="booking-summary">
            <div className="summary-header">
              <h2>Booking Summary</h2>
            </div>

            <div className="summary-row">
              <span>Labour Cost</span>
              <strong>₹{Number(labourCost || 0).toFixed(2)}</strong>
            </div>

            <div className="summary-row">
              <span>Material Cost</span>
              <strong>₹{Number(materialCost || 0).toFixed(2)}</strong>
            </div>

            <div className="summary-row">
              <span>Travel Charge</span>
              <strong>₹{Number(travelCharge || 0).toFixed(2)}</strong>
            </div>

            <div className="summary-divider"></div>

            <div className="total-row">
              <span>Total Estimated Cost</span>
              <strong>₹{totalCost.toFixed(2)}</strong>
            </div>

            <p className="summary-note">
              Final charges depend on actual work completed.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="confirm-booking-button"
            disabled={submitting}
          >
            {submitting ? "Sending Booking Request..." : "✓ Confirm Booking"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default BookingForm;
