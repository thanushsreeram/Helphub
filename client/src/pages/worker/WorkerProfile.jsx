import { useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  IndianRupee,
  ArrowLeft,
  Star,
  CircleCheck,
  Settings,
  CalendarDays,
  Wrench,
  ChevronRight,
  Edit3,
  X,
  Save,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AvatarUpload from "../../components/common/AvatarUpload";
import LanguageSelector from "../../components/common/LanguageSelector";
import { handleLogoClick } from "../../utils/navigation";
import { API_URL } from "../../services/api";
import "./WorkerProfile.css";

function WorkerProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit profile states
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    bio: "",
    location: "",
    hourly_rate: "",
    experience_years: "",
    avatar_url: "",
  });

  const token = localStorage.getItem("helphub_token");
  const storedUser = JSON.parse(localStorage.getItem("helphub_user") || "{}");

  const fetchProfile = async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_URL}/api/workers/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.status === 404) {
        setProfile(null);
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load profile");
      }

      setProfile(data.profile);
    } catch (requestError) {
      console.error("Failed to load worker profile:", requestError);
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !storedUser || !storedUser.role) {
      navigate("/login", { replace: true });
      return;
    }

    if (storedUser.role === "client") {
      navigate("/client/profile", { replace: true });
      return;
    }

    if (storedUser.role === "worker") {
      fetchProfile();
    }
  }, [token, navigate, storedUser?.role]);

  if (!token || !storedUser || storedUser.role !== "worker") {
    return null;
  }

  const formatRating = (rating) => {
    const value = Number(rating || 0);
    return value.toFixed(1);
  };

  // Open edit form
  const handleEdit = () => {
    setFormData({
      name: profile?.name || storedUser.name || "",
      phone: profile?.phone || storedUser.phone || "",
      bio: profile?.bio || "",
      location: profile?.location || "",
      hourly_rate: profile?.hourly_rate || "",
      experience_years: profile?.experience_years || "",
      avatar_url: profile?.avatar_url || storedUser.avatar_url || "",
    });

    setFormError("");
    setSaveMessage("");
    setIsEditing(true);
  };

  // Close edit form
  const handleCloseEdit = () => {
    if (saving) return;

    setIsEditing(false);
    setFormError("");
    setSaveMessage("");
  };

  // Handle input changes
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Save profile
  const handleSaveProfile = async (event) => {
    event.preventDefault();

    setFormError("");
    setSaveMessage("");

    if (!formData.name.trim()) {
      setFormError("Name is required.");
      return;
    }

    if (!formData.phone.trim()) {
      setFormError("Phone number is required.");
      return;
    }

    if (!/^\d{10}$/.test(formData.phone.trim())) {
      setFormError("Phone number must contain exactly 10 digits.");
      return;
    }

    if (formData.hourly_rate === "" || Number(formData.hourly_rate) < 0) {
      setFormError("Please enter a valid hourly rate.");
      return;
    }

    if (
      formData.experience_years === "" ||
      Number(formData.experience_years) < 0
    ) {
      setFormError("Please enter valid experience.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`${API_URL}/api/workers/profile`, {
        method: profile ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          bio: formData.bio.trim(),
          location: formData.location.trim(),
          hourly_rate: Number(formData.hourly_rate),
          experience_years: Number(formData.experience_years),
          avatar_url: formData.avatar_url,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update profile");
      }

      if (profile) {
        setProfile(data.profile);
      } else {
        await fetchProfile();
      }

      // Sync storedUser in localStorage
      const updatedUser = {
        ...storedUser,
        name: formData.name.trim(),
        avatar_url: formData.avatar_url,
      };
      localStorage.setItem("helphub_user", JSON.stringify(updatedUser));

      setSaveMessage(
        profile
          ? "Profile updated successfully!"
          : "Profile created successfully!",
      );

      setTimeout(() => {
        setIsEditing(false);
        setSaveMessage("");
      }, 1000);
    } catch (error) {
      console.error("Failed to update profile:", error);
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="worker-profile-page">
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="worker-profile-page">
        <div className="profile-error">
          <h2>Unable to load profile</h2>
          <p>{error}</p>

          <button
            onClick={() => navigate("/worker/dashboard")}
            className="back-button"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="worker-profile-page">
      {/* HEADER */}
      <header className="profile-header">
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
            onClick={() => navigate("/worker/dashboard")}
            className="back-button"
          >
            <ArrowLeft size={18} />
            Dashboard
          </button>
          <LanguageSelector />
        </div>
      </header>

      <main className="profile-container">
        {/* PAGE HEADING */}
        <div className="profile-heading">
          <div>
            <span className="heading-label">WORKER ACCOUNT</span>
            <h2>
              <User size={28} />
              My Profile
            </h2>
            <p>Manage your professional information and HelpHub account.</p>
          </div>
        </div>

        {/* MAIN PROFILE CARD */}
        <section className="profile-main-card">
          {/* PROFILE TOP */}
          <div className="profile-top">
            <div className="profile-avatar-large">
              {profile?.avatar_url || storedUser?.avatar_url ? (
                <img
                  src={profile?.avatar_url || storedUser?.avatar_url}
                  alt={profile?.name || "Worker"}
                  className="profile-avatar-img"
                />
              ) : (
                <User size={52} />
              )}
            </div>

            <div className="profile-name-section">
              <h2>{profile?.name || "Worker"}</h2>
              <p className="worker-role">HelpHub Professional Worker</p>

              <div
                className={`profile-status ${
                  profile?.is_available ? "available" : "unavailable"
                }`}
              >
                <CircleCheck size={17} />
                <span>
                  {profile?.is_available
                    ? "Available for work"
                    : "Currently unavailable"}
                </span>
              </div>
            </div>

            <div className="profile-top-actions">
              <button
                className="profile-action-button edit-profile-button"
                onClick={handleEdit}
              >
                <Edit3 size={17} />
                {profile ? "Edit Profile" : "Set Up Profile"}
              </button>

              <button
                className="profile-action-button"
                onClick={() => navigate("/worker/specialization")}
              >
                <Wrench size={17} />
                Specialization
              </button>

              <button
                className="profile-action-button"
                onClick={() => navigate("/worker/availability")}
              >
                <CalendarDays size={17} />
                Availability
              </button>
            </div>
          </div>

          {/* QUICK STATS */}
          <div className="profile-stats">
            <div className="profile-stat">
              <div className="stat-icon">
                <Star size={20} />
              </div>
              <div>
                <strong>{formatRating(profile?.rating)}</strong>
                <span>Rating</span>
              </div>
            </div>

            <div className="profile-stat">
              <div className="stat-icon">
                <Briefcase size={20} />
              </div>
              <div>
                <strong>{profile?.total_reviews || 0}</strong>
                <span>Reviews</span>
              </div>
            </div>

            <div className="profile-stat">
              <div className="stat-icon">
                <IndianRupee size={20} />
              </div>
              <div>
                <strong>₹{Number(profile?.hourly_rate || 0)}</strong>
                <span>Per Hour</span>
              </div>
            </div>

            <div className="profile-stat">
              <div className="stat-icon">
                <Briefcase size={20} />
              </div>
              <div>
                <strong>{profile?.experience_years || 0}</strong>
                <span>Years Experience</span>
              </div>
            </div>
          </div>

          {/* PERSONAL INFORMATION */}
          <div className="profile-section">
            <div className="section-heading">
              <h3>Personal Information</h3>
              <p>Your account contact information</p>
            </div>

            <div className="profile-details">
              <div className="detail-card">
                <Mail size={22} />
                <div>
                  <span>Email</span>
                  <strong>{profile?.email || "Not available"}</strong>
                </div>
              </div>

              <div className="detail-card">
                <Phone size={22} />
                <div>
                  <span>Phone</span>
                  <strong>{profile?.phone || "Not provided"}</strong>
                </div>
              </div>

              <div className="detail-card">
                <MapPin size={22} />
                <div>
                  <span>Location</span>
                  <strong>{profile?.location || "Not provided"}</strong>
                </div>
              </div>

              <div className="detail-card">
                <Briefcase size={22} />
                <div>
                  <span>Experience</span>
                  <strong>
                    {profile?.experience_years
                      ? `${profile.experience_years} years`
                      : "Not provided"}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* PROFESSIONAL INFORMATION */}
          <div className="profile-section">
            <div className="section-heading">
              <h3>Professional Information</h3>
              <p>Information clients see when choosing you</p>
            </div>

            <div className="professional-grid">
              <div className="professional-item">
                <IndianRupee size={21} />
                <div>
                  <span>Hourly Rate</span>
                  <strong>
                    {profile?.hourly_rate
                      ? `₹${profile.hourly_rate} / hour`
                      : "Not provided"}
                  </strong>
                </div>
              </div>

              <div className="professional-item">
                <Star size={21} />
                <div>
                  <span>Customer Rating</span>
                  <strong>
                    ⭐ {formatRating(profile?.rating)} (
                    {profile?.total_reviews || 0} reviews)
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* BIO */}
          <div className="profile-bio">
            <div className="section-heading">
              <h3>About Me</h3>
              <p>Your professional introduction</p>
            </div>

            <div className="bio-content">
              <p>
                {profile?.bio ||
                  "No professional description has been added yet."}
              </p>
            </div>
          </div>
        </section>

        {/* MANAGEMENT OPTIONS */}
        <section className="profile-management">
          <div className="section-heading">
            <h3>Profile Management</h3>
            <p>Manage your worker settings</p>
          </div>

          <div className="management-grid">
            <button
              className="management-card"
              onClick={() => navigate("/worker/specialization")}
            >
              <div className="management-icon">
                <Wrench size={22} />
              </div>
              <div>
                <strong>Specialization</strong>
                <span>Manage your services and skills</span>
              </div>
              <ChevronRight size={20} />
            </button>

            <button
              className="management-card"
              onClick={() => navigate("/worker/availability")}
            >
              <div className="management-icon">
                <CalendarDays size={22} />
              </div>
              <div>
                <strong>Working Availability</strong>
                <span>Set your working days and hours</span>
              </div>
              <ChevronRight size={20} />
            </button>

            <button
              className="management-card"
              onClick={() => navigate("/worker/dashboard")}
            >
              <div className="management-icon">
                <Settings size={22} />
              </div>
              <div>
                <strong>Worker Dashboard</strong>
                <span>View jobs and booking activity</span>
              </div>
              <ChevronRight size={20} />
            </button>
          </div>
        </section>
      </main>

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <div className="edit-profile-overlay">
          <div className="edit-profile-modal">
            {/* MODAL HEADER */}
            <div className="edit-modal-header">
              <div>
                <span className="edit-modal-label">WORKER ACCOUNT</span>
                <h2>
                  <Edit3 size={22} />
                  Edit Profile
                </h2>
                <p>Update the information clients see about you.</p>
              </div>

              <button
                type="button"
                className="close-edit-button"
                onClick={handleCloseEdit}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>

            {/* FORM */}
            <form className="edit-profile-form" onSubmit={handleSaveProfile}>
              {/* AVATAR UPLOAD */}
              <div className="form-group avatar-form-group">
                <label>Profile Picture</label>
                <AvatarUpload
                  value={formData.avatar_url}
                  onChange={(newAvatar) =>
                    setFormData((prev) => ({
                      ...prev,
                      avatar_url: newAvatar,
                    }))
                  }
                />
              </div>

              {/* NAME */}
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <div className="input-with-icon">
                  <User size={18} />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    disabled={saving}
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-with-icon disabled-input">
                  <Mail size={18} />
                  <input
                    id="email"
                    type="email"
                    value={profile?.email || ""}
                    disabled
                  />
                </div>
                <small>Email cannot be changed from your profile.</small>
              </div>

              {/* PHONE */}
              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <div className="input-with-icon">
                  <Phone size={18} />
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="10-digit phone number"
                    maxLength={10}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* LOCATION */}
              <div className="form-group">
                <label htmlFor="location">Location</label>
                <div className="input-with-icon">
                  <MapPin size={18} />
                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Example: Hyderabad"
                    disabled={saving}
                  />
                </div>
              </div>

              {/* HOURLY RATE & EXPERIENCE */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="hourly_rate">Hourly Rate (₹)</label>
                  <div className="input-with-icon">
                    <IndianRupee size={18} />
                    <input
                      id="hourly_rate"
                      name="hourly_rate"
                      type="number"
                      min="0"
                      value={formData.hourly_rate}
                      onChange={handleChange}
                      placeholder="500"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="experience_years">Experience (Years)</label>
                  <div className="input-with-icon">
                    <Briefcase size={18} />
                    <input
                      id="experience_years"
                      name="experience_years"
                      type="number"
                      min="0"
                      value={formData.experience_years}
                      onChange={handleChange}
                      placeholder="3"
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              {/* BIO */}
              <div className="form-group">
                <label htmlFor="bio">About Me</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell clients about your experience and professional skills..."
                  rows="5"
                  disabled={saving}
                />
                <small>
                  Give clients a short introduction about your work.
                </small>
              </div>

              {/* ERROR */}
              {formError && (
                <div className="form-error-message">{formError}</div>
              )}

              {/* SUCCESS */}
              {saveMessage && (
                <div className="form-success-message">
                  <CircleCheck size={18} />
                  {saveMessage}
                </div>
              )}

              {/* ACTIONS */}
              <div className="edit-form-actions">
                <button
                  type="button"
                  className="cancel-edit-button"
                  onClick={handleCloseEdit}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-profile-button"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="button-spinner"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkerProfile;
