import "dotenv/config";
import pool from "../config/database.js";
import Razorpay from "razorpay";
import crypto from "crypto";

const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
const razorpay =
  razorpayKeyId && razorpayKeySecret
    ? new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret })
    : null;

/*
|--------------------------------------------------------------------------
| 1. Worker creates additional money request
|--------------------------------------------------------------------------
*/
export const createAdditionalMoneyRequest = async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookingId = Number(req.params.bookingId);
    const { requested_amount, reason } = req.body;

    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const amount = Number(requested_amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid positive additional amount (₹)",
      });
    }

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reason for additional amount is required",
      });
    }

    // Get worker profile for authenticated user
    const workerProfileResult = await pool.query(
      `SELECT id FROM worker_profiles WHERE user_id = $1`,
      [userId],
    );

    if (workerProfileResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Worker profile not found for this user",
      });
    }

    const workerProfileId = workerProfileResult.rows[0].id;

    // Verify booking belongs to this worker and is strictly ACTIVE
    const bookingResult = await pool.query(
      `SELECT id, client_id, worker_id, status, total_cost, original_agreed_amount
       FROM bookings
       WHERE id = $1`,
      [bookingId],
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project booking not found",
      });
    }

    const booking = bookingResult.rows[0];

    if (booking.worker_id !== workerProfileId) {
      return res.status(403).json({
        success: false,
        message: "You can only request additional money for your own projects",
      });
    }

    // ACTIVE project status rule: only 'committed' or 'in_progress' are active
    const activeStatuses = ["committed", "in_progress"];
    if (!activeStatuses.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Additional money requests can only be made for ACTIVE projects (current project status: ${booking.status})`,
      });
    }

    // Create the additional money request with status 'pending'
    const insertResult = await pool.query(
      `INSERT INTO additional_money_requests
       (
         booking_id,
         worker_id,
         client_id,
         requested_amount,
         reason,
         status
       )
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [
        bookingId,
        workerProfileId,
        booking.client_id,
        amount,
        reason.trim(),
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Additional money request submitted successfully! Waiting for client review.",
      request: insertResult.rows[0],
    });
  } catch (error) {
    console.error("Create additional money request error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating additional money request",
    });
  }
};

/*
|--------------------------------------------------------------------------
| 2. Get additional money requests for a booking
|--------------------------------------------------------------------------
*/
export const getAdditionalMoneyRequestsByBooking = async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookingId = Number(req.params.bookingId);

    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    // Verify user is either client or worker for this booking
    const bookingResult = await pool.query(
      `SELECT b.id, b.client_id, b.worker_id, b.status, b.total_cost, b.original_agreed_amount,
              wp.user_id as worker_user_id,
              u.name as client_name,
              wu.name as worker_name
       FROM bookings b
       JOIN worker_profiles wp ON wp.id = b.worker_id
       JOIN users u ON u.id = b.client_id
       JOIN users wu ON wu.id = wp.user_id
       WHERE b.id = $1`,
      [bookingId],
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project booking not found",
      });
    }

    const booking = bookingResult.rows[0];

    if (booking.client_id !== userId && booking.worker_user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view requests for this project",
      });
    }

    const requestsResult = await pool.query(
      `SELECT amr.*,
              wu.name as worker_name,
              u.name as client_name,
              p.payment_method,
              p.transaction_id,
              p.paid_at
       FROM additional_money_requests amr
       JOIN worker_profiles wp ON wp.id = amr.worker_id
       JOIN users wu ON wu.id = wp.user_id
       JOIN users u ON u.id = amr.client_id
       LEFT JOIN payments p ON p.id = amr.payment_id
       WHERE amr.booking_id = $1
       ORDER BY amr.created_at ASC`,
      [bookingId],
    );

    // Calculate totals
    const originalAmount = Number(booking.original_agreed_amount || booking.total_cost);
    const additionalApprovedPaid = requestsResult.rows
      .filter((r) => r.status === "paid")
      .reduce((sum, r) => sum + Number(r.requested_amount), 0);
    const currentTotal = Number(booking.total_cost);

    return res.json({
      success: true,
      booking: {
        id: booking.id,
        status: booking.status,
        original_agreed_amount: originalAmount,
        additional_approved_amount: additionalApprovedPaid,
        current_total_amount: currentTotal,
      },
      requests: requestsResult.rows,
    });
  } catch (error) {
    console.error("Get additional money requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching additional money requests",
    });
  }
};

/*
|--------------------------------------------------------------------------
| 3. Client rejects additional money request
|--------------------------------------------------------------------------
*/
export const rejectAdditionalMoneyRequest = async (req, res) => {
  try {
    const userId = req.user.userId;
    const requestId = Number(req.params.requestId);

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    const requestResult = await pool.query(
      `SELECT amr.*, b.status as booking_status
       FROM additional_money_requests amr
       JOIN bookings b ON b.id = amr.booking_id
       WHERE amr.id = $1`,
      [requestId],
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Additional money request not found",
      });
    }

    const request = requestResult.rows[0];

    // Verify client authorization
    if (request.client_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the client of this project can reject this request",
      });
    }

    if (request.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Cannot reject a request that has already been paid",
      });
    }

    if (request.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Request is already rejected",
      });
    }

    const updateResult = await pool.query(
      `UPDATE additional_money_requests
       SET status = 'rejected',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [requestId],
    );

    return res.json({
      success: true,
      message: "Additional money request has been rejected. Project amount remains unchanged.",
      request: updateResult.rows[0],
    });
  } catch (error) {
    console.error("Reject additional money request error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while rejecting additional money request",
    });
  }
};

/*
|--------------------------------------------------------------------------
| 4. Client creates Razorpay order for additional money request
|--------------------------------------------------------------------------
*/
export const createAdditionalMoneyPaymentOrder = async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: "Online payments are not configured",
      });
    }

    const userId = req.user.userId;
    const requestId = Number(req.params.requestId);

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    const requestResult = await pool.query(
      `SELECT amr.*, b.status as booking_status, b.total_cost
       FROM additional_money_requests amr
       JOIN bookings b ON b.id = amr.booking_id
       WHERE amr.id = $1`,
      [requestId],
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Additional money request not found",
      });
    }

    const request = requestResult.rows[0];

    // Client authorization
    if (request.client_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the client of this project can pay for this request",
      });
    }

    // Active project check
    if (!["committed", "in_progress"].includes(request.booking_status)) {
      return res.status(400).json({
        success: false,
        message: `Project is not currently active (status: ${request.booking_status})`,
      });
    }

    if (request.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "This additional money request has already been paid",
      });
    }

    if (request.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: "This additional money request was rejected",
      });
    }

    // Update status to payment_pending if it was pending
    await pool.query(
      `UPDATE additional_money_requests
       SET status = 'payment_pending',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'pending'`,
      [requestId],
    );

    const amountInPaise = Math.round(Number(request.requested_amount) * 100);

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `HH_ADD_REQ_${requestId}_${Date.now()}`,
      notes: {
        request_id: String(requestId),
        booking_id: String(request.booking_id),
        client_id: String(userId),
        worker_id: String(request.worker_id),
        type: "additional_money",
      },
    };

    const order = await razorpay.orders.create(options);

    return res.status(201).json({
      success: true,
      message: "Payment order created for additional money request",
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
      key_id: razorpayKeyId,
    });
  } catch (error) {
    console.error("Create additional money payment order error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating payment order",
    });
  }
};

/*
|--------------------------------------------------------------------------
| 5. Client verifies Razorpay payment for additional money request
|--------------------------------------------------------------------------
*/
export const verifyAdditionalMoneyPayment = async (req, res) => {
  const dbClient = await pool.connect();
  try {
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: "Online payments are not configured",
      });
    }

    const userId = req.user.userId;
    const requestId = Number(req.params.requestId);

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !Number.isInteger(requestId) ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are incomplete",
      });
    }

    // Check request existence and client ownership
    const requestResult = await dbClient.query(
      `SELECT amr.*, b.total_cost, b.status as booking_status
       FROM additional_money_requests amr
       JOIN bookings b ON b.id = amr.booking_id
       WHERE amr.id = $1`,
      [requestId],
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Additional money request not found",
      });
    }

    const request = requestResult.rows[0];

    if (request.client_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to pay for this request",
      });
    }

    // Verify HMAC signature
    const generatedSignature = crypto
      .createHmac("sha256", razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // Fetch Razorpay order to verify paid status & amount
    const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);
    if (!razorpayOrder || razorpayOrder.status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Razorpay order has not been paid",
      });
    }

    const expectedAmountPaise = Math.round(Number(request.requested_amount) * 100);
    if (Number(razorpayOrder.amount) !== expectedAmountPaise) {
      return res.status(400).json({
        success: false,
        message: "Paid amount does not match requested additional amount",
      });
    }

    // Concurrency protection: Begin transaction & advisory lock on request id
    await dbClient.query("BEGIN");
    await dbClient.query("SELECT pg_advisory_xact_lock($1)", [requestId]);

    // Re-verify request status inside locked transaction to prevent double payment
    const lockCheck = await dbClient.query(
      `SELECT amr.*, b.total_cost, b.status as booking_status
       FROM additional_money_requests amr
       JOIN bookings b ON b.id = amr.booking_id
       WHERE amr.id = $1 FOR UPDATE`,
      [requestId],
    );

    const lockedRequest = lockCheck.rows[0];
    if (lockedRequest.status === "paid") {
      await dbClient.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "This additional money request has already been paid",
      });
    }

    // 1. Record separate payment row
    const paymentResult = await dbClient.query(
      `INSERT INTO payments
       (
         booking_id,
         amount,
         payment_method,
         payment_status,
         transaction_id,
         payment_type,
         additional_request_id,
         paid_at
       )
       VALUES ($1, $2, 'online', 'paid', $3, 'additional', $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        lockedRequest.booking_id,
        Number(lockedRequest.requested_amount),
        razorpay_payment_id,
        requestId,
      ],
    );

    const payment = paymentResult.rows[0];

    // 2. Increase project total amount (and labour_cost for consistency)
    const bookingUpdate = await dbClient.query(
      `UPDATE bookings
       SET total_cost = total_cost + $1,
           labour_cost = labour_cost + $1
       WHERE id = $2
       RETURNING *`,
      [Number(lockedRequest.requested_amount), lockedRequest.booking_id],
    );

    // 3. Mark additional money request as PAID
    const requestUpdate = await dbClient.query(
      `UPDATE additional_money_requests
       SET status = 'paid',
           payment_id = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [payment.id, requestId],
    );

    await dbClient.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Payment completed successfully! Project total has been updated.",
      request: requestUpdate.rows[0],
      booking: bookingUpdate.rows[0],
      payment,
    });
  } catch (error) {
    await dbClient.query("ROLLBACK");
    console.error("Verify additional money payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while verifying additional payment",
    });
  } finally {
    dbClient.release();
  }
};

/*
|--------------------------------------------------------------------------
| 6. Client records cash payment for additional money request
|--------------------------------------------------------------------------
*/
export const cashAdditionalMoneyPayment = async (req, res) => {
  const dbClient = await pool.connect();
  try {
    const userId = req.user.userId;
    const requestId = Number(req.params.requestId);

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    // Check request existence and client ownership
    const requestResult = await dbClient.query(
      `SELECT amr.*, b.total_cost, b.status as booking_status
       FROM additional_money_requests amr
       JOIN bookings b ON b.id = amr.booking_id
       WHERE amr.id = $1`,
      [requestId],
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Additional money request not found",
      });
    }

    const request = requestResult.rows[0];

    if (request.client_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to pay for this request",
      });
    }

    if (!["committed", "in_progress"].includes(request.booking_status)) {
      return res.status(400).json({
        success: false,
        message: `Project is not currently active (status: ${request.booking_status})`,
      });
    }

    if (request.status === "paid") {
      return res.status(409).json({
        success: false,
        message: "This additional money request has already been paid",
      });
    }

    if (request.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: "This additional money request was rejected",
      });
    }

    // Concurrency protection: Begin transaction & advisory lock on request id
    await dbClient.query("BEGIN");
    await dbClient.query("SELECT pg_advisory_xact_lock($1)", [requestId]);

    // Re-verify request status inside locked transaction
    const lockCheck = await dbClient.query(
      `SELECT amr.*, b.total_cost, b.status as booking_status
       FROM additional_money_requests amr
       JOIN bookings b ON b.id = amr.booking_id
       WHERE amr.id = $1 FOR UPDATE`,
      [requestId],
    );

    const lockedRequest = lockCheck.rows[0];
    if (lockedRequest.status === "paid") {
      await dbClient.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "This additional money request has already been paid",
      });
    }

    // 1. Record separate cash payment row
    const paymentResult = await dbClient.query(
      `INSERT INTO payments
       (
         booking_id,
         amount,
         payment_method,
         payment_status,
         transaction_id,
         payment_type,
         additional_request_id,
         paid_at
       )
       VALUES ($1, $2, 'cash', 'completed', NULL, 'additional', $3, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        lockedRequest.booking_id,
        Number(lockedRequest.requested_amount),
        requestId,
      ],
    );

    const payment = paymentResult.rows[0];

    // 2. Increase project total amount
    const bookingUpdate = await dbClient.query(
      `UPDATE bookings
       SET total_cost = total_cost + $1,
           labour_cost = labour_cost + $1
       WHERE id = $2
       RETURNING *`,
      [Number(lockedRequest.requested_amount), lockedRequest.booking_id],
    );

    // 3. Mark additional money request as PAID
    const requestUpdate = await dbClient.query(
      `UPDATE additional_money_requests
       SET status = 'paid',
           payment_id = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [payment.id, requestId],
    );

    await dbClient.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Cash payment recorded. Request is PAID and project total has been updated!",
      request: requestUpdate.rows[0],
      booking: bookingUpdate.rows[0],
      payment,
    });
  } catch (error) {
    await dbClient.query("ROLLBACK");
    console.error("Cash additional money payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while processing cash payment",
    });
  } finally {
    dbClient.release();
  }
};
