import { Link, useNavigate } from "react-router-dom";
import RoleCard from "../../components/auth/RoleCard";
import LanguageSelector from "../../components/common/LanguageSelector";
import { handleLogoClick } from "../../utils/navigation";
import "../../App.css";

function ChooseRole() {
  const navigate = useNavigate();

  const selectRole = (role) => {
    navigate(`/register?role=${role}`);
  };

  return (
    <div className="role-page">
      <div className="role-container">

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "20px" }}>
          <div onClick={() => handleLogoClick(navigate)} className="role-logo" style={{ margin: 0, cursor: "pointer" }} title="Go Back">
            <img src="/helphub-logo-transparent.png" alt="HelpHub Logo" style={{ height: "52px", objectFit: "contain" }} />
          </div>
          <LanguageSelector />
        </div>

        <div className="role-header">
          <span>GET STARTED</span>

          <h1>How will you use HelpHub?</h1>

          <p>
            Choose your role to get started with HelpHub.
          </p>
        </div>

        <div className="role-cards">

          <RoleCard
            type="client"
            title="I'm a Client"
            description="Find trusted workers, compare services, and book help for your needs."
            onClick={() => selectRole("client")}
          />

          <RoleCard
            type="worker"
            title="I'm a Worker"
            description="Offer your skills, find jobs, manage bookings, and grow your work."
            onClick={() => selectRole("worker")}
          />

        </div>

        <div className="role-footer">
          Already have an account?{" "}
          <Link to="/login">Login</Link>
        </div>

      </div>
    </div>
  );
}

export default ChooseRole;