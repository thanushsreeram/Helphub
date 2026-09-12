import { Routes, Route } from "react-router-dom";

// Home
import Home from "../pages/Home";

// Authentication
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ChooseRole from "../pages/auth/ChooseRole";
import ForgotPassword from "../pages/auth/ForgotPassword";
import VerifyEmail from "../pages/auth/VerifyEmail";

// Worker
import ProtectedRoute from "./ProtectedRoute";
import WorkerDashboard from "../pages/worker/WorkerDashboard";
import WorkerProfile from "../pages/worker/WorkerProfile";
import Specialization from "../pages/worker/Specialization";
import Availability from "../pages/worker/Availability";
import MyJobs from "../pages/worker/MyJobs";
import JobDetails from "../pages/worker/JobDetails";

// Client
import ClientDashboard from "../pages/client/ClientDashboard";
import ClientProfile from "../pages/client/ClientProfile";
import BrowseWorkers from "../pages/client/BrowseWorkers";
import WorkerDetails from "../pages/client/WorkerDetails";
import BookingForm from "../pages/client/BookingForm";
import ClientBookings from "../pages/client/ClientBookings";
import ClientPayment from "../pages/client/ClientPayment";
import ClientBookingDetails from "../pages/client/ClientBookingDetails";
import ClientReview from "../pages/client/ClientReview";
import AppointmentForm from "../pages/client/AppointmentForm";
import ClientAppointments from "../pages/client/ClientAppointments";

// 404
import NotFound from "../pages/NotFound";

import ProfileGuard from "./ProfileGuard";

function AppRoutes() {
  return (
    <Routes>
      {/* =========================
          HOME & COMMON
      ========================= */}
      <Route path="/" element={<Home />} />
      <Route path="/profile" element={<ProfileGuard />} />

      {/* =========================
          AUTHENTICATION
      ========================= */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/choose-role" element={<ChooseRole />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* =========================
          WORKER ROUTES
      ========================= */}
      <Route element={<ProtectedRoute allowedRole="worker" />}>
        <Route path="/worker/dashboard" element={<WorkerDashboard />} />

        <Route path="/worker/profile" element={<WorkerProfile />} />

        <Route path="/worker/specialization" element={<Specialization />} />

        <Route path="/worker/availability" element={<Availability />} />

        <Route path="/worker/jobs" element={<MyJobs />} />

        <Route path="/worker/jobs/:id" element={<JobDetails />} />
      </Route>

      {/* =========================
          CLIENT ROUTES
      ========================= */}
      <Route element={<ProtectedRoute allowedRole="client" />}>
        <Route path="/client/dashboard" element={<ClientDashboard />} />

        <Route path="/client/profile" element={<ClientProfile />} />

        <Route path="/client/workers" element={<BrowseWorkers />} />

        <Route path="/client/worker/:workerId" element={<WorkerDetails />} />

        <Route path="/client/book/:workerId" element={<BookingForm />} />

        <Route path="/client/bookings" element={<ClientBookings />} />

        <Route path="/client/payment/:bookingId" element={<ClientPayment />} />

        <Route
          path="/client/bookings/:bookingId"
          element={<ClientBookingDetails />}
        />

        <Route
          path="/client/bookings/:bookingId/review"
          element={<ClientReview />}
        />

        <Route path="/client/appointment/:workerId" element={<AppointmentForm />} />
        <Route path="/client/appointments" element={<ClientAppointments />} />

        <Route path="/client/browse-workers" element={<BrowseWorkers />} />
      </Route>

      {/* =========================
          404
      ========================= */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
