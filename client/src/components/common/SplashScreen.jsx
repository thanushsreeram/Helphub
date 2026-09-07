import { useEffect, useState } from "react";
import "./SplashScreen.css";
import helphubLogo from "../../assets/helphub-logo.png";

const SplashScreen = ({ onFinish, duration = 3000 }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setIsExiting(true), duration);
    const finishTimer = setTimeout(() => onFinish?.(), duration + 550);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [duration, onFinish]);

  return (
    <div className={`splash-screen ${isExiting ? "is-exiting" : ""}`}>
      <div className="splash-mark">
        <span className="splash-ring" aria-hidden="true" />
        <img src={helphubLogo} alt="HelpHub" className="splash-logo" />
      </div>
      <p className="splash-name">HelpHub</p>
    </div>
  );
};

export default SplashScreen;
