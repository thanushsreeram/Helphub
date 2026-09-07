import { Globe } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import "./LanguageSelector.css";

function LanguageSelector({ className = "" }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`language-selector-wrapper ${className}`}>
      <Globe size={16} className="lang-globe-icon" />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="language-select-dropdown"
        aria-label="Select Language"
      >
        <option value="en">English</option>
        <option value="te">తెలుగు</option>
        <option value="hi">हिंदी</option>
      </select>
    </div>
  );
}

export default LanguageSelector;
