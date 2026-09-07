import { ArrowRight, BriefcaseBusiness, UserRound } from "lucide-react";

function RoleCard({ type, title, description, onClick }) {
  const isClient = type === "client";

  return (
    <button className="role-card" onClick={onClick}>
      <div className="role-icon">
        {isClient ? (
          <UserRound size={28} />
        ) : (
          <BriefcaseBusiness size={28} />
        )}
      </div>

      <div className="role-card-content">
        <span>{isClient ? "FOR CLIENTS" : "FOR WORKERS"}</span>

        <h2>{title}</h2>

        <p>{description}</p>
      </div>

      <ArrowRight className="role-arrow" size={22} />
    </button>
  );
}

export default RoleCard;