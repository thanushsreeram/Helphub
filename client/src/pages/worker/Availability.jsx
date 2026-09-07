import { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock,
  Save,
  ArrowLeft,
  Check,
  AlertCircle,
  Repeat,
  Calendar,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../services/api";
import LanguageSelector from "../../components/common/LanguageSelector";
import { useLanguage } from "../../context/LanguageContext";
import { handleLogoClick } from "../../utils/navigation";
import "./Availability.css";

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function Availability() {
  const navigate = useNavigate();
  const { t, tDay } = useLanguage();

  const [availability, setAvailability] = useState([]);
  const [scheduleType, setScheduleType] = useState("permanent");
  const [validMonth, setValidMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAvailability = async () => {
      const token = localStorage.getItem("helphub_token");

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/workers/availability`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Failed to load availability."
          );
        }

        setAvailability(data.availability || []);
        if (data.schedule_type) setScheduleType(data.schedule_type);
        if (data.valid_month) setValidMonth(data.valid_month);
        if (data.start_date) setStartDate(data.start_date.slice(0, 10));
        if (data.end_date) setEndDate(data.end_date.slice(0, 10));
      } catch (error) {
        console.error(
          "Failed to load availability:",
          error
        );

        setError(
          error.message ||
            "Unable to load your availability."
        );
      } finally {
        setLoading(false);
      }
    };

    loadAvailability();
  }, [navigate]);

  const isDaySelected = (day) => {
    return availability.some(
      (item) => item.day_of_week === day
    );
  };

  const toggleDay = (day) => {
    setMessage("");
    setError("");

    if (isDaySelected(day)) {
      setAvailability((current) =>
        current.filter(
          (item) => item.day_of_week !== day
        )
      );
    } else {
      setAvailability((current) => [
        ...current,
        {
          day_of_week: day,
          start_time: "09:00",
          end_time: "18:00",
          is_available: true,
        },
      ]);
    }
  };

  const updateTime = (day, field, value) => {
    setMessage("");
    setError("");

    setAvailability((current) =>
      current.map((item) =>
        item.day_of_week === day
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const validateAvailability = () => {
    if (availability.length === 0) {
      return "Please select at least one working day.";
    }

    for (const item of availability) {
      if (!item.start_time || !item.end_time) {
        return `Please select both start and end time for ${item.day_of_week}.`;
      }

      if (item.start_time >= item.end_time) {
        return `End time must be after start time on ${item.day_of_week}.`;
      }
    }

    if (scheduleType === "month" && !validMonth) {
      return "Please select a valid month for month-specific availability.";
    }

    if (scheduleType === "custom") {
      if (!startDate || !endDate) {
        return "Please select both start date and end date for custom date range.";
      }
      if (startDate > endDate) {
        return "Start date cannot be after end date.";
      }
    }

    return "";
  };

  const handleSave = async () => {
    setMessage("");
    setError("");

    const validationError = validateAvailability();

    if (validationError) {
      setError(validationError);
      return;
    }

    const token = localStorage.getItem("helphub_token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `${API_URL}/api/workers/availability`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            availability,
            schedule_type: scheduleType,
            valid_month: validMonth,
            start_date: startDate,
            end_date: endDate,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to save availability."
        );
      }

      setAvailability(data.availability || availability);
      if (data.schedule_type) setScheduleType(data.schedule_type);

      setMessage(
        "Your availability schedule and duration have been saved successfully."
      );
    } catch (error) {
      console.error(
        "Save availability error:",
        error
      );

      setError(
        error.message ||
          "Unable to save availability."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="availability-page">
        <div className="availability-loading">
          <div className="availability-spinner"></div>
          <p>Loading your availability...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="availability-page">
      <div className="availability-container">

        {/* HEADER BAR */}
        <header className="availability-nav-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <img src="/helphub-logo-transparent.png" alt="HelpHub" style={{ height: "38px", objectFit: "contain", cursor: "pointer" }} onClick={() => handleLogoClick(navigate)} title="Go Back" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              className="back-button"
              onClick={() => navigate("/worker/dashboard")}
            >
              <ArrowLeft size={18} />
              {t("nav_dashboard")}
            </button>
            <LanguageSelector />
          </div>
        </header>

        {/* HEADER */}
        <div className="availability-header">
          <div className="header-icon">
            <CalendarDays size={28} />
          </div>

          <div>
            <p className="availability-eyebrow">
              WORKER PORTAL
            </p>

            <h1>My Availability</h1>

            <p>
              Choose the days, hours, and duration scope when you're
              available for work.
            </p>
          </div>
        </div>

        {/* MAIN CARD */}
        <div className="availability-card">

          {/* DURATION / SCOPE SECTION */}
          <div className="scope-section">
            <div className="section-header">
              <div className="card-title">
                <Repeat size={20} />
                <div>
                  <h2>Schedule Duration Scope</h2>
                  <p>
                    Set whether this schedule applies permanently, for a single month, or custom dates.
                  </p>
                </div>
              </div>
            </div>

            <div className="scope-grid">
              <div
                className={`scope-card ${scheduleType === "permanent" ? "selected" : ""}`}
                onClick={() => { setMessage(""); setError(""); setScheduleType("permanent"); }}
              >
                <div className="scope-card-header">
                  <div className="scope-radio">
                    <div className="radio-dot"></div>
                  </div>
                  <Repeat size={18} className="scope-icon" />
                </div>
                <div className="scope-info">
                  <strong>Permanent (Every Week)</strong>
                  <p>Repeats indefinitely every week until you modify it.</p>
                </div>
              </div>

              <div
                className={`scope-card ${scheduleType === "month" ? "selected" : ""}`}
                onClick={() => { setMessage(""); setError(""); setScheduleType("month"); }}
              >
                <div className="scope-card-header">
                  <div className="scope-radio">
                    <div className="radio-dot"></div>
                  </div>
                  <Calendar size={18} className="scope-icon" />
                </div>
                <div className="scope-info">
                  <strong>Specific Month Only</strong>
                  <p>Valid only for the chosen month (e.g. September 2026), then expires.</p>
                </div>
              </div>

              <div
                className={`scope-card ${scheduleType === "custom" ? "selected" : ""}`}
                onClick={() => { setMessage(""); setError(""); setScheduleType("custom"); }}
              >
                <div className="scope-card-header">
                  <div className="scope-radio">
                    <div className="radio-dot"></div>
                  </div>
                  <Sparkles size={18} className="scope-icon" />
                </div>
                <div className="scope-info">
                  <strong>Custom Date Range</strong>
                  <p>Valid strictly between your specified start and end dates.</p>
                </div>
              </div>
            </div>

            {/* MONTH PICKER CONTROLS */}
            {scheduleType === "month" && (
              <div className="scope-details-box">
                <div className="scope-detail-field">
                  <label>Select Target Month:</label>
                  <input
                    type="month"
                    value={validMonth}
                    className="scope-input"
                    onChange={(e) => { setMessage(""); setError(""); setValidMonth(e.target.value); }}
                  />
                </div>
                <p className="scope-help-text">
                  🗓️ Clients will only be able to book your selected days during{" "}
                  <strong>
                    {validMonth
                      ? new Date(validMonth + "-01").toLocaleString("default", { month: "long", year: "numeric" })
                      : "the selected month"}
                  </strong>
                  . In subsequent months, clients will see that availability needs to be refreshed.
                </p>
              </div>
            )}

            {/* CUSTOM DATE RANGE CONTROLS */}
            {scheduleType === "custom" && (
              <div className="scope-details-box custom-range">
                <div className="scope-detail-field">
                  <label>Start Date:</label>
                  <input
                    type="date"
                    value={startDate}
                    className="scope-input"
                    onChange={(e) => { setMessage(""); setError(""); setStartDate(e.target.value); }}
                  />
                </div>
                <div className="scope-detail-field">
                  <label>End Date:</label>
                  <input
                    type="date"
                    value={endDate}
                    className="scope-input"
                    onChange={(e) => { setMessage(""); setError(""); setEndDate(e.target.value); }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* WORKING DAYS */}
          <div className="section-header" style={{ marginTop: "30px", paddingTop: "25px", borderTop: "1px solid #eceef3" }}>
            <div className="card-title">
              <CalendarDays size={20} />

              <div>
                <h2>Working Days</h2>
                <p>
                  Select the days you normally accept
                  jobs.
                </p>
              </div>
            </div>

            <div className="selected-days-count">
              {availability.length} day
              {availability.length !== 1
                ? "s"
                : ""}{" "}
              selected
            </div>
          </div>

          <div className="days-grid">
            {days.map((day) => {
              const selected = isDaySelected(day);

              return (
                <button
                  type="button"
                  key={day}
                  className={`day-button ${
                    selected ? "selected" : ""
                  }`}
                  onClick={() => toggleDay(day)}
                >
                  <span className="day-check">
                    {selected && <Check size={15} />}
                  </span>

                  <span>{tDay(day)}</span>
                </button>
              );
            })}
          </div>

          {/* WORKING HOURS */}
          <div className="schedule-section">

            <div className="card-title">
              <Clock size={20} />

              <div>
                <h2>Working Hours</h2>
                <p>
                  Set the working hours for each selected
                  day.
                </p>
              </div>
            </div>

            {availability.length === 0 ? (
              <div className="no-days">
                <CalendarDays size={22} />

                <div>
                  <strong>
                    No working days selected
                  </strong>

                  <p>
                    Select at least one day above to
                    configure your working hours.
                  </p>
                </div>
              </div>
            ) : (
              <div className="schedule-list">
                {days
                  .filter((day) =>
                    isDaySelected(day)
                  )
                  .map((day) => {
                    const item =
                      availability.find(
                        (a) =>
                          a.day_of_week === day
                      );

                    return (
                      <div
                        className="schedule-row"
                        key={day}
                      >
                        <div className="schedule-day">
                          <div className="schedule-day-icon">
                            <CalendarDays
                              size={17}
                            />
                          </div>

                          <strong>{day}</strong>
                        </div>

                        <div className="time-inputs">

                          <div className="time-field">
                            <label>
                              Start time
                            </label>

                            <div className="time-input-wrapper">
                              <Clock size={16} />

                              <input
                                type="time"
                                value={
                                  item.start_time
                                }
                                onChange={(e) =>
                                  updateTime(
                                    day,
                                    "start_time",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </div>

                          <span className="time-separator">
                            to
                          </span>

                          <div className="time-field">
                            <label>
                              End time
                            </label>

                            <div className="time-input-wrapper">
                              <Clock size={16} />

                              <input
                                type="time"
                                value={
                                  item.end_time
                                }
                                onChange={(e) =>
                                  updateTime(
                                    day,
                                    "end_time",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* ERROR */}
          {error && (
            <div className="availability-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* SUCCESS */}
          {message && (
            <div className="availability-message">
              <Check size={18} />
              <span>{message}</span>
            </div>
          )}

          {/* SAVE */}
          <div className="save-section">

            <div className="save-info">
              <strong>
                {availability.length === 0
                  ? "No working days"
                  : `${availability.length} working day${
                      availability.length !== 1
                        ? "s"
                        : ""
                    } configured`}
              </strong>

              <p>
                You can update your availability
                whenever your schedule changes.
              </p>
            </div>

            <button
              type="button"
              className="save-availability"
              onClick={handleSave}
              disabled={saving}
            >
              <Save size={18} />

              {saving
                ? "Saving..."
                : "Save Availability"}
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}

export default Availability;
