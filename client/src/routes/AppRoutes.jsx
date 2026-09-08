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
        <Route path="/client/browse-workers" element={<BrowseWorkers />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
