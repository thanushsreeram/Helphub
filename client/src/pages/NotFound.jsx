import { ArrowLeft, Home, SearchX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../App.css";

function NotFound() {
  const navigate = useNavigate();

  return (
    <main className="not-found-page">
      <div className="not-found-card">
        <div className="not-found-icon" aria-hidden="true">
          <SearchX size={30} />
        </div>
        <span className="not-found-code">404</span>
        <h1>That page is not available</h1>
        <p>
          The link may be outdated, or the page may have moved. Let&apos;s get
          you back to HelpHub.
        </p>
        <div className="not-found-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => navigate("/")}
          >
            <Home size={17} /> Go home
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={17} /> Go back
          </button>
        </div>
      </div>
    </main>
  );
}

export default NotFound;
