import { useRef } from "react";
import { Camera, User, Trash2 } from "lucide-react";
import "./AvatarUpload.css";

function AvatarUpload({ value, onChange, size = 110 }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be smaller than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onChange(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="avatar-upload-container">
      <div
        className="avatar-preview-box"
        style={{ width: `${size}px`, height: `${size}px` }}
        onClick={() => fileInputRef.current?.click()}
        title="Click to change profile picture"
      >
        {value ? (
          <img src={value} alt="Profile Avatar" className="avatar-image" />
        ) : (
          <div className="avatar-placeholder">
            <User size={size * 0.45} />
          </div>
        )}

        <div className="avatar-camera-badge">
          <Camera size={15} />
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          style={{ display: "none" }}
        />
      </div>

      {value && (
        <button
          type="button"
          className="avatar-remove-btn"
          onClick={handleRemove}
          title="Remove photo"
        >
          <Trash2 size={13} />
          Remove Photo
        </button>
      )}
    </div>
  );
}

export default AvatarUpload;
//thanush