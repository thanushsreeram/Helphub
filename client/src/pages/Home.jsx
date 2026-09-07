import { Link, useNavigate } from "react-router-dom";
import { handleLogoClick } from "../utils/navigation";
import {
  Wrench,
  Zap,
  Sparkles,
  Paintbrush,
  Hammer,
  Droplets,
  ArrowRight,
  ShieldCheck,
  Star,
  Clock,
} from "lucide-react";
import LanguageSelector from "../components/common/LanguageSelector";
import { useLanguage } from "../context/LanguageContext";

import "../App.css";

const services = [
  {
    icon: Wrench,
    title: "Repairs",
    categoryKey: "cat_other",
    description: "Fix everyday problems quickly.",
  },
  {
    icon: Zap,
    title: "Electrical",
    categoryKey: "cat_electrical",
    description: "Find skilled electricians nearby.",
  },
  {
    icon: Droplets,
    title: "Plumbing",
    categoryKey: "cat_plumbing",
    description: "Reliable plumbing professionals.",
  },
  {
    icon: Sparkles,
    title: "Cleaning",
    categoryKey: "cat_cleaning",
    description: "Keep your home fresh and clean.",
  },
  {
    icon: Paintbrush,
    title: "Painting",
    categoryKey: "cat_painting",
    description: "Give your space a new look.",
  },
  {
    icon: Hammer,
    title: "Construction",
    categoryKey: "cat_construction",
    description: "Experienced workers for your project.",
  },
];

function Home() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="home-page">
      {/* Navbar */}
      <nav className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div onClick={() => handleLogoClick(navigate)} className="logo" style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} title="Go Back">
            <img src="/helphub-logo-icon.png" alt="HelpHub Logo" style={{ height: "40px", objectFit: "contain" }} />
            <span>Help<span>Hub</span></span>
          </div>
        </div>

        <div className="nav-links">
          <Link to="/">{t("nav_home")}</Link>
          <a href="#services">{t("nav_browse_workers")}</a>
          <a href="#how-it-works">How It Works</a>
        </div>

        <div className="nav-actions" style={{ display: "flex", alignItems: "center", gap: "12px" }}>

          <Link to="/login" className="login-btn">
            {t("nav_login")}
          </Link>

          <Link to="/choose-role" className="signup-btn">
            {t("nav_register")}
          </Link>
          <LanguageSelector />
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <ShieldCheck size={16} />
            {t("app_tagline")}
          </div>

          <h1>
            Get help.
            <br />
            <span>Get it done.</span>
          </h1>

          <p>
            {t("find_expert_workers")}
          </p>

          <div className="hero-buttons">
            <Link to="/choose-role" className="primary-button">
              {t("nav_browse_workers")}
              <ArrowRight size={18} />
            </Link>

            <Link to="/register" className="secondary-button">
              {t("nav_register")}
            </Link>
          </div>

          <div className="trust-row">
            <div>
              <strong>10K+</strong>
              <span>Workers</span>
            </div>

            <div>
              <strong>25K+</strong>
              <span>Jobs completed</span>
            </div>

            <div>
              <strong>4.8</strong>
              <span>Average rating</span>
            </div>
          </div>
        </div>

        {/* Hero visual */}
        <div className="hero-visual">
          <div className="floating-card card-one">
            <div className="mini-icon">
              <ShieldCheck size={20} />
            </div>

            <div>
              <strong>Verified Workers</strong>
              <span>Trusted professionals</span>
            </div>
          </div>

          <div className="worker-preview">
            <div className="worker-avatar">👷</div>

            <div className="worker-info">
              <span>Available now</span>
              <h3>Professional Worker</h3>

              <div className="rating">
                <Star size={15} fill="currentColor" />
                4.9
                <small>(120 reviews)</small>
              </div>
            </div>

            <button>
              <ArrowRight size={20} />
            </button>
          </div>

          <div className="floating-card card-two">
            <Clock size={20} />
            <div>
              <strong>Quick response</strong>
              <span>Find help when you need it</span>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="services-section" id="services">
        <div className="section-heading">
          <div>
            <span className="section-label">OUR SERVICES</span>

            <h2>
              Whatever you need,
              <br />
              <span>we've got you covered.</span>
            </h2>
          </div>

          <p>
            From small household repairs to large projects, find the right
            professional for the job.
          </p>
        </div>

        <div className="services-grid">
          {services.map((service) => {
            const Icon = service.icon;

            return (
              <div className="service-card" key={service.title}>
                <div className="service-icon">
                  <Icon size={25} />
                </div>

                <h3>{t(service.categoryKey, service.title)}</h3>

                <p>{service.description}</p>

                <ArrowRight size={18} className="service-arrow" />
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="how-section" id="how-it-works">
        <div className="section-heading centered">
          <span className="section-label">HOW IT WORKS</span>

          <h2>
            Getting help is
            <br />
            <span>simple.</span>
          </h2>
        </div>

        <div className="steps">
          <div className="step">
            <div className="step-number">01</div>
            <h3>Find a service</h3>
            <p>
              Choose the service you need and tell us what needs to be done.
            </p>
          </div>

          <div className="step">
            <div className="step-number">02</div>
            <h3>Choose a worker</h3>
            <p>
              Compare verified workers, ratings, skills and availability.
            </p>
          </div>

          <div className="step">
            <div className="step-number">03</div>
            <h3>Book & get it done</h3>
            <p>
              Book your worker, track the job and complete the work safely.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div>
          <span className="section-label">READY TO GET STARTED?</span>

          <h2>
            Your next job
            <br />
            starts with HelpHub.
          </h2>
        </div>

        <Link to="/choose-role" className="cta-button">
          Get Started
          <ArrowRight size={19} />
        </Link>
      </section>

      {/* Footer */}
      <footer>
        <div className="footer-logo" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
          <img src="/helphub-logo-icon.png" alt="HelpHub Logo" style={{ height: "36px", objectFit: "contain" }} />
          <span>Help<span>Hub</span></span>
        </div>

        <p>Connecting people with trusted local professionals.</p>

        <span>© 2026 HelpHub</span>
      </footer>
    </div>
  );
}

export default Home;