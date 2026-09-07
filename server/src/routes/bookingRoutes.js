import express from "express";

import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

import {
  createBooking,
  getMyBookings,
  getBookingById,
  acceptBooking,
  rejectBooking,
  commitBooking,
  startBooking,
  completeBooking,
  cancelBooking,
  emergencyCancelBooking,
  
} from "../controllers/bookingController.js";

const router = express.Router();

// Create booking - Client
router.post(
  "/",
  authenticateToken,
  authorizeRoles("client"),
  createBooking
);

// Get my bookings - Client or Worker
router.get(
  "/",
  authenticateToken,
  getMyBookings
);

// Get booking by ID - Client or Worker
router.get(
  "/:id",
  authenticateToken,
  getBookingById
);

// Accept booking - Worker
router.put(
  "/:id/accept",
  authenticateToken,
  authorizeRoles("worker"),
  acceptBooking
);

// Reject booking - Worker
router.put(
  "/:id/reject",
  authenticateToken,
  authorizeRoles("worker"),
  rejectBooking
);

// Start job - Worker
router.put(
  "/:id/start",
  authenticateToken,
  authorizeRoles("worker"),
  startBooking
);

// Complete job - Worker
router.put(
  "/:id/complete",
  authenticateToken,
  authorizeRoles("worker"),
  completeBooking
);

// Cancel booking - Client
router.put(
  "/:id/cancel",
  authenticateToken,
  authorizeRoles("client"),
  cancelBooking
);
router.put(
  "/:id/emergency-cancel",
  authenticateToken,
  authorizeRoles("worker"),
  emergencyCancelBooking
);
// Commit booking - Worker
router.put(
  "/:id/commit",
  authenticateToken,
  authorizeRoles("worker"),
  commitBooking
);

export default router;