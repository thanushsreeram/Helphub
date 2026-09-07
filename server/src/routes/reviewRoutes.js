import express from "express";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

import {
  createReview,
  createClientReview,
  getWorkerReviews,
  getClientReviews,
  getBookingReview,
} from "../controllers/reviewController.js";

const router = express.Router();

// Client submits a review for worker
router.post(
  "/",
  authenticateToken,
  authorizeRoles("client"),
  createReview
);

// Worker submits a review for client
router.post(
  "/client",
  authenticateToken,
  authorizeRoles("worker"),
  createClientReview
);

// Anyone can view a worker's reviews
router.get(
  "/worker/:workerId",
  getWorkerReviews
);

// Authenticated users can view a client's reviews
router.get(
  "/client/:clientId",
  authenticateToken,
  getClientReviews
);

// Client/worker can view a review for a booking
router.get(
  "/booking/:bookingId",
  authenticateToken,
  getBookingReview
);

export default router;