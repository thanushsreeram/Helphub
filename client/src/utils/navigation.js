/**
 * Handles logo click navigation safely:
 * - If user is logged in and clicking logo would take them back to /login, /register, or auth pages,
 *   it prevents returning to login and instead just refreshes the current page (or stays on dashboard/home).
 * - If user is not logged in or on another sub-page, it smoothly goes back in history or refreshes.
 */
export const handleLogoClick = (navigate) => {
  const token = localStorage.getItem("helphub_token");
  const currentPath = window.location.pathname;
  const referrer = document.referrer || "";

  // List of authentication routes that logged-in users shouldn't be taken back to
  const authRoutes = ["/login", "/register", "/choose-role", "/forgot-password", "/verify-email"];

  if (token) {
    // User is logged in
    // If user is currently on Home page ('/') or a main dashboard, or if referrer was login
    const isAuthReferrer = authRoutes.some((route) => referrer.includes(route));

    if (currentPath === "/" || currentPath.includes("dashboard") || isAuthReferrer) {
      // Just refresh the current page as requested by user
      window.location.reload();
      return;
    }

    // On internal sub-pages (e.g. WorkerDetails, BookingForm), try going back
    // But verify we don't land on login
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      window.location.reload();
    }
  } else {
    // Guest user (not logged in)
    if (currentPath === "/") {
      window.location.reload();
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }
};
