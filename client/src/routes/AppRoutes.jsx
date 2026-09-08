import { Routes, Route } from "react-router-dom";

import Home from "../pages/Home";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ChooseRole from "../pages/auth/ChooseRole";
import ForgotPassword from "../pages/auth/ForgotPassword";
import VerifyEmail from "../pages/auth/VerifyEmail";

import WorkerDashboard from "../pages/worker/WorkerDashboard";
import WorkerProfile from "../pages/worker/WorkerProfile";
import Specialization from "../pages/worker/Specialization";
import Availability from "../pages/worker/Availability";
import MyJobs from "../pages/worker/MyJobs";
import JobDetails from "../pages/worker/JobDetails";
import ClientDashboard from "../pages/client/ClientDashboard";
import BrowseWorkers from "../pages/client/BrowseWorkers";
import WorkerDetails from "../pages/client/WorkerDetails";
import BookingForm from "../pages/client/BookingForm";
import ClientBookings from "../pages/client/ClientBookings";
import ClientPayment from "../pages/client/ClientPayment";
import ClientBookingDetails from "../pages/client/ClientBookingDetails";
import ClientReview from "../pages/client/ClientReview";
import ClientProfile from "../pages/client/ClientProfile";
import NotFound from "../pages/NotFound";

function AppRoutes() {
  return (
    <Routes>
      {/* Home */}
      <Route path="/" element={<Home />} />

      {/* Authentication */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/choose-role" element={<ChooseRole />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Worker */}
      <Route path="/worker/dashboard" element={<WorkerDashboard />} />

      <Route path="/worker/profile" element={<WorkerProfile />} />

      <Route path="/worker/specialization" element={<Specialization />} />

      <Route path="/worker/availability" element={<Availability />} />
      <Route path="/worker/jobs" element={<MyJobs />} />
      <Route path="/worker/jobs/:id" element={<JobDetails />} />
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
      <Route path="/client/browse-workers" element={<BrowseWorkers />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
