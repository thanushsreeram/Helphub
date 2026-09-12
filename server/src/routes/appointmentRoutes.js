import express from "express";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import {
  createAppointment,
  getClientAppointments,
  getWorkerAppointments,
  acceptAppointment,
  rejectAppointment,
  cancelAppointment,
  submitWorkDecision,
  createAppointmentPaymentOrder,
  verifyAppointmentPayment,
  cashAppointmentPayment,
} from "../controllers/appointmentController.js";

const router = express.Router();

// Client creates appointment request
router.post(
  "/",
  authenticateToken,
  authorizeRoles("client"),
  createAppointment,
);

// Client views their appointments
router.get(
  "/client",
  authenticateToken,
  authorizeRoles("client"),
  getClientAppointments,
);

// Worker views incoming appointment requests
router.get(
  "/worker",
  authenticateToken,
  authorizeRoles("worker"),
  getWorkerAppointments,
);

// Worker accepts appointment (meeting request)
router.patch(
  "/:id/accept",
  authenticateToken,
  authorizeRoles("worker"),
  acceptAppointment,
);

// Worker rejects appointment (meeting request)
router.patch(
  "/:id/reject",
  authenticateToken,
  authorizeRoles("worker"),
  rejectAppointment,
);

// Worker submits post-meeting work decision (accept work with agreed amount or refuse work)
router.patch(
  "/:id/work-decision",
  authenticateToken,
  authorizeRoles("worker"),
  submitWorkDecision,
);

// Client creates Razorpay payment order for agreed appointment work
router.post(
  "/:id/pay/order",
  authenticateToken,
  authorizeRoles("client"),
  createAppointmentPaymentOrder,
);

// Client verifies Razorpay payment for agreed appointment work (activates project)
router.post(
  "/:id/pay/verify",
  authenticateToken,
  authorizeRoles("client"),
  verifyAppointmentPayment,
);

// Client records cash payment for agreed appointment work (activates project)
router.post(
  "/:id/pay/cash",
  authenticateToken,
  authorizeRoles("client"),
  cashAppointmentPayment,
);

// Client cancels their pending appointment
router.patch(
  "/:id/cancel",
  authenticateToken,
  authorizeRoles("client"),
  cancelAppointment,
);

export default router;
