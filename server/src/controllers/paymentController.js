import "dotenv/config";
import pool from "../config/database.js";
import Razorpay from "razorpay";
import crypto from "crypto";

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "rzp_test_TX8UhLHvW0r4ou";
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "OjXRV73PHqeznOPbkYBkHb7c";

const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

/*
|--------------------------------------------------------------------------
| Create Razorpay Order
|--------------------------------------------------------------------------
*/

export const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookingId = Number(req.params.bookingId);

    if (!Number.isInteger(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    // Get booking and verify client ownership
    const bookingResult = await pool.query(
      `SELECT
         b.id,
         b.client_id,
         b.total_cost,
         b.status
       FROM bookings b
       WHERE b.id = $1
         AND b.client_id = $2`,
      [bookingId, userId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or you are not the client",
      });
    }

    const booking = bookingResult.rows[0];

    // Payment allowed only after worker accepts
    const allowedStatuses = [
      "accepted",
      "committed",
      "in_progress",
      "completed",
    ];

    if (!allowedStatuses.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Payment cannot be created for a ${booking.status} booking`,
      });
    }

    // Check existing payment
    const existingPayment = await pool.query(
      `SELECT id, payment_status
       FROM payments
       WHERE booking_id = $1`,
      [bookingId]
    );

    if (existingPayment.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Payment already exists for this booking",
        payment: existingPayment.rows[0],
      });
    }

    const amount = Number(booking.total_cost);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking amount",
      });
    }

    /*
     * Razorpay expects amount in paise.
     * Example:
     * ₹650 = 65000 paise
     */
    const amountInPaise = Math.round(amount * 100);

    const options = {
      amount: amountInPaise,
      currency: "INR",

      /*
       * This receipt lets us verify that the Razorpay
       * order belongs to this HelpHub booking.
       */
      receipt: `HH_BOOKING_${bookingId}_${Date.now()}`,

      notes: {
        booking_id: String(bookingId),
        client_id: String(userId),
      },
    };

    const order = await razorpay.orders.create(options);

    return res.status(201).json({
      success: true,
      message: "Razorpay order created",
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
      key_id: razorpayKeyId,
    });
  } catch (error) {
    console.error("Create Razorpay order error:", {
      message: error.message,
      statusCode: error.statusCode,
      description: error.error?.description,
      code: error.error?.code,
    });

    return res.status(500).json({
      success: false,
      message: "Server error while creating Razorpay order",
    });
  }
};


/*
|--------------------------------------------------------------------------
| Verify Razorpay Payment
|--------------------------------------------------------------------------
*/

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const userId = req.user.userId;

    const {
      booking_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const bookingId = Number(booking_id);

    if (
      !Number.isInteger(bookingId) ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are incomplete",
      });
    }

    // Verify booking belongs to client
    const bookingResult = await pool.query(
      `SELECT
         b.id,
         b.client_id,
         b.total_cost,
         b.status
       FROM bookings b
       WHERE b.id = $1
         AND b.client_id = $2`,
      [bookingId, userId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or you are not the client",
      });
    }

    const booking = bookingResult.rows[0];

    /*
     * Verify Razorpay signature.
     */
    const generatedSignature = crypto
      .createHmac(
        "sha256",
        razorpayKeySecret
      )
      .update(
        `${razorpay_order_id}|${razorpay_payment_id}`
      )
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    /*
     * Fetch the Razorpay order from Razorpay.
     *
     * This gives us an additional server-side check that
     * the order really belongs to this HelpHub booking.
     */
    const razorpayOrder =
      await razorpay.orders.fetch(razorpay_order_id);

    if (!razorpayOrder) {
      return res.status(400).json({
        success: false,
        message: "Razorpay order not found",
      });
    }

    if (razorpayOrder.status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Razorpay order has not been paid",
      });
    }

    if (
      razorpayOrder.receipt &&
      !razorpayOrder.receipt.startsWith(
        `HH_BOOKING_${bookingId}_`
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment order does not belong to this booking",
      });
    }

    const expectedAmount = Math.round(
      Number(booking.total_cost) * 100
    );

    if (Number(razorpayOrder.amount) !== expectedAmount) {
      return res.status(400).json({
        success: false,
        message: "Payment amount does not match booking amount",
      });
    }

    const dbClient = await pool.connect();
    let result;

    try {
      await dbClient.query("BEGIN");
      await dbClient.query("SELECT pg_advisory_xact_lock($1)", [bookingId]);

      const existingPayment = await dbClient.query(
        `SELECT * FROM payments WHERE booking_id = $1`,
        [bookingId]
      );

      if (existingPayment.rows.length > 0) {
        await dbClient.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          message: "Payment already exists for this booking",
          payment: existingPayment.rows[0],
        });
      }

      result = await dbClient.query(
        `INSERT INTO payments
         (
           booking_id,
           amount,
           payment_method,
           payment_status,
           transaction_id,
           paid_at
         )
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
          bookingId,
          Number(booking.total_cost),
          "online",
          "paid",
          razorpay_payment_id,
          new Date(),
        ]
      );

      await dbClient.query("COMMIT");
    } catch (transactionError) {
      await dbClient.query("ROLLBACK");
      throw transactionError;
    } finally {
      dbClient.release();
    }

    return res.status(201).json({
      success: true,
      message: "Payment verified and completed successfully",
      payment: result.rows[0],
    });
  } catch (error) {
    console.error("Verify Razorpay payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while verifying payment",
    });
  }
};


/*
|--------------------------------------------------------------------------
| Cash / Existing Payment
|--------------------------------------------------------------------------
*/

export const createPayment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookingId = Number(req.params.bookingId);

    const {
      payment_method,
    } = req.body;

    if (!payment_method) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required",
      });
    }

    if (payment_method !== "cash") {
      return res.status(400).json({
        success: false,
        message: "This endpoint is only for cash payments",
      });
    }

    const bookingResult = await pool.query(
      `SELECT
         b.id,
         b.client_id,
         b.total_cost,
         b.status
       FROM bookings b
       WHERE b.id = $1
         AND b.client_id = $2`,
      [bookingId, userId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or you are not the client",
      });
    }

    const booking = bookingResult.rows[0];

    const allowedStatuses = [
      "accepted",
      "committed",
      "in_progress",
      "completed",
    ];

    if (!allowedStatuses.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Payment cannot be created for a ${booking.status} booking`,
      });
    }

    const dbClient = await pool.connect();
    let result;

    try {
      await dbClient.query("BEGIN");
      await dbClient.query("SELECT pg_advisory_xact_lock($1)", [bookingId]);

      const existingPayment = await dbClient.query(
        `SELECT id, payment_status FROM payments WHERE booking_id = $1`,
        [bookingId]
      );

      if (existingPayment.rows.length > 0) {
        await dbClient.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          message: "Payment already exists for this booking",
          payment: existingPayment.rows[0],
        });
      }

      result = await dbClient.query(
        `INSERT INTO payments
         (
           booking_id,
           amount,
           payment_method,
           payment_status,
           transaction_id,
           paid_at
         )
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
          bookingId,
          Number(booking.total_cost),
          "cash",
          "pending",
          null,
          null,
        ]
      );

      await dbClient.query("COMMIT");
    } catch (transactionError) {
      await dbClient.query("ROLLBACK");
      throw transactionError;
    } finally {
      dbClient.release();
    }

    return res.status(201).json({
      success: true,
      message: "Cash payment recorded as pending",
      payment: result.rows[0],
    });
  } catch (error) {
    console.error("Create cash payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while creating cash payment",
    });
  }
};


/*
|--------------------------------------------------------------------------
| Get Payment
|--------------------------------------------------------------------------
*/

export const getPaymentByBooking = async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookingId = Number(req.params.bookingId);

    const result = await pool.query(
      `SELECT
         p.*
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       JOIN worker_profiles wp ON wp.id = b.worker_id
       WHERE p.booking_id = $1
         AND (b.client_id = $2 OR wp.user_id = $2)`,
      [bookingId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    return res.json({
      success: true,
      payment: result.rows[0],
    });
  } catch (error) {
    console.error("Get payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching payment",
    });
  }
};
