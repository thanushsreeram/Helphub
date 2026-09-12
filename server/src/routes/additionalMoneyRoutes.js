import express from "express";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import {
  createAdditionalMoneyRequest,
  getAdditionalMoneyRequestsByBooking,
  rejectAdditionalMoneyRequest,
  createAdditionalMoneyPaymentOrder,
  verifyAdditionalMoneyPayment,
  cashAdditionalMoneyPayment,
} from "../controllers/additionalMoneyController.js";

const router = express.Router();

// Worker creates additional money request
router.post(
  "/request/:bookingId",
  authenticateToken,
  authorizeRoles("worker"),
  createAdditionalMoneyRequest,
);

// Worker or Client views additional money requests for a booking
router.get(
  "/booking/:bookingId",
  authenticateToken,
  getAdditionalMoneyRequestsByBooking,
);

// Client rejects request
router.patch(
  "/request/:requestId/reject",
  authenticateToken,
  authorizeRoles("client"),
  rejectAdditionalMoneyRequest,
);

// Client creates payment order (Razorpay)
router.post(
  "/request/:requestId/pay/order",
  authenticateToken,
  authorizeRoles("client"),
  createAdditionalMoneyPaymentOrder,
);

// Client verifies Razorpay payment (marks PAID & updates booking total)
router.post(
  "/request/:requestId/pay/verify",
  authenticateToken,
  authorizeRoles("client"),
  verifyAdditionalMoneyPayment,
);

// Client records cash payment (marks PAID & updates booking total)
router.post(
  "/request/:requestId/pay/cash",
  authenticateToken,
  authorizeRoles("client"),
  cashAdditionalMoneyPayment,
);

export default router;
