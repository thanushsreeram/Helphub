import express from "express";

import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

import {
  createPayment,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getPaymentByBooking,
} from "../controllers/paymentController.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Cash Payment
|--------------------------------------------------------------------------
*/

router.post(
  "/:bookingId",
  authenticateToken,
  authorizeRoles("client"),
  createPayment
);


/*
|--------------------------------------------------------------------------
| Create Razorpay Order
|--------------------------------------------------------------------------
*/

router.post(
  "/:bookingId/order",
  authenticateToken,
  authorizeRoles("client"),
  createRazorpayOrder
);


/*
|--------------------------------------------------------------------------
| Verify Razorpay Payment
|--------------------------------------------------------------------------
*/

router.post(
  "/verify",
  authenticateToken,
  authorizeRoles("client"),
  verifyRazorpayPayment
);


/*
|--------------------------------------------------------------------------
| Get Payment
|--------------------------------------------------------------------------
*/

router.get(
  "/:bookingId",
  authenticateToken,
  getPaymentByBooking
);

export default router;