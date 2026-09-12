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

// ============================================================
// CREATE APPOINTMENT (Client only)
// ============================================================
export const createAppointment = async (req, res) => {
  try {
    const clientId = req.user.userId;

    const {
      worker_id,
      service_id,
      appointment_date,
      appointment_time,
      location,
      description,
    } = req.body;

    // 1. Validation
    if (!worker_id || !appointment_date || !appointment_time || !location?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Worker, appointment date, preferred time, and job location are required",
      });
    }

    // 2. Check worker exists and is available
    const workerCheck = await pool.query(
      `SELECT wp.id, wp.user_id, wp.is_available, u.name as worker_name
       FROM worker_profiles wp
       JOIN users u ON u.id = wp.user_id
       WHERE wp.id = $1`,
      [worker_id],
    );

    if (workerCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
      });
    }

    const worker = workerCheck.rows[0];

    // Check that client is not booking themselves
    if (worker.user_id === clientId) {
      return res.status(400).json({
        success: false,
        message: "You cannot request an appointment with yourself",
      });
    }

    // 3. Insert Appointment
    const result = await pool.query(
      `INSERT INTO appointments
       (
         client_id,
         worker_id,
         service_id,
         appointment_date,
         appointment_time,
         location,
         description,
         status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [
        clientId,
        worker_id,
        service_id || null,
        appointment_date,
        appointment_time,
        location.trim(),
        description?.trim() || null,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Appointment request sent successfully! Waiting for worker confirmation.",
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error("Create appointment error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating appointment request",
    });
  }
};

// ============================================================
// GET CLIENT APPOINTMENTS (Client only)
// ============================================================
export const getClientAppointments = async (req, res) => {
  try {
    const clientId = req.user.userId;

    const result = await pool.query(
      `SELECT
         a.*,
         u.name AS client_name,
         u.email AS client_email,
         u.phone AS client_phone,
         wu.name AS worker_name,
         wu.phone AS worker_phone,
         wu.avatar_url AS worker_avatar_url,
         wp.location AS worker_city,
         s.name AS service_name
       FROM appointments a
       JOIN users u ON u.id = a.client_id
       JOIN worker_profiles wp ON wp.id = a.worker_id
       JOIN users wu ON wu.id = wp.user_id
       LEFT JOIN services s ON s.id = a.service_id
       WHERE a.client_id = $1
       ORDER BY a.created_at DESC`,
      [clientId],
    );

    return res.json({
      success: true,
      count: result.rows.length,
      appointments: result.rows,
    });
  } catch (error) {
    console.error("Get client appointments error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching client appointments",
    });
  }
};

// ============================================================
// GET WORKER APPOINTMENTS (Worker only)
// ============================================================
export const getWorkerAppointments = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get worker_profile for this user
    const workerCheck = await pool.query(
      `SELECT id FROM worker_profiles WHERE user_id = $1`,
      [userId],
    );

    if (workerCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found for this account",
      });
    }

    const workerId = workerCheck.rows[0].id;

    const result = await pool.query(
      `SELECT
         a.*,
         u.name AS client_name,
         u.email AS client_email,
         u.phone AS client_phone,
         u.avatar_url AS client_avatar_url,
         s.name AS service_name
       FROM appointments a
       JOIN users u ON u.id = a.client_id
       LEFT JOIN services s ON s.id = a.service_id
       WHERE a.worker_id = $1
       ORDER BY a.created_at DESC`,
      [workerId],
    );

    return res.json({
      success: true,
      count: result.rows.length,
      appointments: result.rows,
    });
  } catch (error) {
    console.error("Get worker appointments error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching worker appointments",
    });
  }
};

// ============================================================
// ACCEPT APPOINTMENT (Worker only)
// ============================================================
export const acceptAppointment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const appointmentId = Number(req.params.id);

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
      });
    }

    // Ensure appointment belongs to this worker and is pending
    const apptCheck = await pool.query(
      `SELECT a.id, a.status, wp.user_id as worker_user_id
       FROM appointments a
       JOIN worker_profiles wp ON wp.id = a.worker_id
       WHERE a.id = $1`,
      [appointmentId],
    );

    if (apptCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    const appt = apptCheck.rows[0];

    if (appt.worker_user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not assigned to this appointment",
      });
    }

    if (appt.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot accept appointment that is already ${appt.status}`,
      });
    }

    const updateResult = await pool.query(
      `UPDATE appointments
       SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [appointmentId],
    );

    return res.json({
      success: true,
      message: "Appointment accepted successfully! The client will be notified.",
      appointment: updateResult.rows[0],
    });
  } catch (error) {
    console.error("Accept appointment error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while accepting appointment",
    });
  }
};

// ============================================================
// REJECT APPOINTMENT (Worker only)
// ============================================================
export const rejectAppointment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const appointmentId = Number(req.params.id);

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
      });
    }

    const apptCheck = await pool.query(
      `SELECT a.id, a.status, wp.user_id as worker_user_id
       FROM appointments a
       JOIN worker_profiles wp ON wp.id = a.worker_id
       WHERE a.id = $1`,
      [appointmentId],
    );

    if (apptCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    const appt = apptCheck.rows[0];

    if (appt.worker_user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not assigned to this appointment",
      });
    }

    if (appt.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot reject appointment that is already ${appt.status}`,
      });
    }

    const updateResult = await pool.query(
      `UPDATE appointments
       SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [appointmentId],
    );

    return res.json({
      success: true,
      message: "Appointment rejected.",
      appointment: updateResult.rows[0],
    });
  } catch (error) {
    console.error("Reject appointment error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while rejecting appointment",
    });
  }
};

// ============================================================
// CANCEL APPOINTMENT (Client only)
// ============================================================
export const cancelAppointment = async (req, res) => {
  try {
    const clientId = req.user.userId;
    const appointmentId = Number(req.params.id);

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
      });
    }

    const apptCheck = await pool.query(
      `SELECT id, client_id, status
       FROM appointments
       WHERE id = $1`,
      [appointmentId],
    );

    if (apptCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    const appt = apptCheck.rows[0];

    if (appt.client_id !== clientId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot cancel another client's appointment",
      });
    }

    if (appt.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Only pending appointments can be cancelled (current status: ${appt.status})`,
      });
    }

    const updateResult = await pool.query(
      `UPDATE appointments
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [appointmentId],
    );

    return res.json({
      success: true,
      message: "Appointment cancelled successfully.",
      appointment: updateResult.rows[0],
    });
  } catch (error) {
    console.error("Cancel appointment error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while cancelling appointment",
    });
  }
};

// ============================================================
// SUBMIT WORK DECISION (Worker only)
// ============================================================
export const submitWorkDecision = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.userId;
    const appointmentId = Number(req.params.id);
    const { decision, agreed_amount, agreed_notes } = req.body;

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
      });
    }

    if (!decision || !["accepted", "refused"].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "Work decision must be either 'accepted' or 'refused'",
      });
    }

    // Verify appointment belongs to this worker
    const apptCheck = await pool.query(
      `SELECT a.id, a.status, a.worker_id, a.client_id, wp.user_id as worker_user_id
       FROM appointments a
       JOIN worker_profiles wp ON wp.id = a.worker_id
       WHERE a.id = $1`,
      [appointmentId],
    );

    if (apptCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    const appt = apptCheck.rows[0];

    if (appt.worker_user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not assigned to this appointment",
      });
    }

    // Only accepted appointments (where meeting took place) can have a work decision submitted
    if (appt.status !== "accepted") {
      return res.status(400).json({
        success: false,
        message: `Work decision cannot be made on an appointment with status '${appt.status}'. The appointment must be accepted first.`,
      });
    }

    // SCENARIO 1: WORKER REFUSES WORK
    if (decision === "refused") {
      const updateResult = await pool.query(
        `UPDATE appointments
         SET status = 'work_refused',
             work_decision = 'refused',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [appointmentId],
      );

      return res.json({
        success: true,
        message: "Work decision recorded as Refused. The client has been updated. No project was created.",
        appointment: updateResult.rows[0],
      });
    }

    // SCENARIO 2: WORKER ACCEPTS WORK
    // Validate agreed_amount
    const numericAmount = Number(agreed_amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid positive agreed amount (₹) is required to accept work",
      });
    }

    // Check worker active project limit (maximum 3 active projects)
    const activeResult = await pool.query(
      `SELECT COUNT(*)::int AS active_jobs
       FROM bookings
       WHERE worker_id = $1
         AND status IN ('accepted', 'committed', 'in_progress')`,
      [appt.worker_id],
    );

    const activeJobs = activeResult.rows[0].active_jobs;
    if (activeJobs >= 3) {
      return res.status(409).json({
        success: false,
        message: "You currently have 3 active projects. You cannot accept new work until an active project is completed.",
        active_jobs: activeJobs,
        maximum_active_jobs: 3,
      });
    }

    const updateResult = await pool.query(
      `UPDATE appointments
       SET status = 'payment_pending',
           work_decision = 'accepted',
           agreed_amount = $1,
           agreed_notes = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [numericAmount, agreed_notes?.trim() || null, appointmentId],
    );

    return res.json({
      success: true,
      message: "Work agreement created successfully! Waiting for client to pay the agreed amount.",
      appointment: updateResult.rows[0],
    });
  } catch (error) {
    console.error("Submit work decision error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while processing work decision",
    });
  } finally {
    client.release();
  }
};

// ============================================================
// CREATE RAZORPAY ORDER FOR APPOINTMENT WORK (Client only)
// ============================================================
export const createAppointmentPaymentOrder = async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: "Online payments are not configured",
      });
    }

    const userId = req.user.userId;
    const appointmentId = Number(req.params.id);

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
      });
    }

    const apptCheck = await pool.query(
      `SELECT a.*, wp.user_id as worker_user_id
       FROM appointments a
       JOIN worker_profiles wp ON wp.id = a.worker_id
       WHERE a.id = $1 AND a.client_id = $2`,
      [appointmentId, userId],
    );

    if (apptCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found or you are not the client",
      });
    }

    const appt = apptCheck.rows[0];

    if (appt.status !== "payment_pending" || !appt.agreed_amount) {
      return res.status(400).json({
        success: false,
        message: `Payment order cannot be created for an appointment with status '${appt.status}'`,
      });
    }

    // Check worker active jobs
    const activeResult = await pool.query(
      `SELECT COUNT(*)::int AS active_jobs
       FROM bookings
       WHERE worker_id = $1
         AND status IN ('accepted', 'committed', 'in_progress')`,
      [appt.worker_id],
    );

    if (activeResult.rows[0].active_jobs >= 3) {
      return res.status(409).json({
        success: false,
        message: "Worker has reached the maximum of 3 active projects. Please wait until one of their projects is completed.",
      });
    }

    const amountInPaise = Math.round(Number(appt.agreed_amount) * 100);

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `HH_APPT_${appointmentId}_${Date.now()}`,
      notes: {
        appointment_id: String(appointmentId),
        client_id: String(userId),
        worker_id: String(appt.worker_id),
      },
    };

    const order = await razorpay.orders.create(options);

    return res.status(201).json({
      success: true,
      message: "Razorpay order created for appointment agreement",
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
      key_id: razorpayKeyId,
    });
  } catch (error) {
    console.error("Create appointment Razorpay order error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating payment order",
    });
  }
};

// ============================================================
// VERIFY RAZORPAY PAYMENT FOR APPOINTMENT (Client only)
// Activates Project into Bookings and Payments
// ============================================================
export const verifyAppointmentPayment = async (req, res) => {
  const dbClient = await pool.connect();
  try {
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: "Online payments are not configured",
      });
    }

    const userId = req.user.userId;
    const appointmentId = Number(req.params.id);

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !Number.isInteger(appointmentId) ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are incomplete",
      });
    }

    // Verify appointment ownership
    const apptCheck = await pool.query(
      `SELECT a.*, wp.user_id as worker_user_id
       FROM appointments a
       JOIN worker_profiles wp ON wp.id = a.worker_id
       WHERE a.id = $1 AND a.client_id = $2`,
      [appointmentId, userId],
    );

    if (apptCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found or you are not the client",
      });
    }

    const appt = apptCheck.rows[0];

    if (appt.status !== "payment_pending" || !appt.agreed_amount) {
      return res.status(400).json({
        success: false,
        message: `Appointment is not in payment pending state (current: ${appt.status})`,
      });
    }

    // Verify Razorpay HMAC signature
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

    // Fetch order from Razorpay to verify amount
    const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);
    if (!razorpayOrder || razorpayOrder.status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Razorpay order has not been paid",
      });
    }

    const expectedAmountPaise = Math.round(Number(appt.agreed_amount) * 100);
    if (Number(razorpayOrder.amount) !== expectedAmountPaise) {
      return res.status(400).json({
        success: false,
        message: "Paid amount does not match stored agreed amount",
      });
    }

    // Begin Transaction to lock worker & activate project
    await dbClient.query("BEGIN");
    await dbClient.query("SELECT pg_advisory_xact_lock($1)", [appt.worker_id]);

    // Check active jobs limit < 3
    const activeResult = await dbClient.query(
      `SELECT COUNT(*)::int AS active_jobs
       FROM bookings
       WHERE worker_id = $1
         AND status IN ('accepted', 'committed', 'in_progress')`,
      [appt.worker_id],
    );

    if (activeResult.rows[0].active_jobs >= 3) {
      await dbClient.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Worker has already reached the maximum of 3 active projects.",
      });
    }

    // 1. Insert into bookings as committed (active project)
    const bookingResult = await dbClient.query(
      `INSERT INTO bookings
       (
         client_id,
         worker_id,
         service_id,
         booking_date,
         location,
         description,
         workers_required,
         labour_cost,
         material_cost,
         travel_charge,
         total_cost,
         materials_provided_by,
         status
       )
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, 1, $6, 0, 0, $6, 'client', 'committed')
       RETURNING *`,
      [
        appt.client_id,
        appt.worker_id,
        appt.service_id,
        appt.location,
        appt.agreed_notes || appt.description || "Agreed project work",
        Number(appt.agreed_amount),
      ],
    );

    const newBooking = bookingResult.rows[0];

    // 2. Insert into payments
    const paymentResult = await dbClient.query(
      `INSERT INTO payments
       (
         booking_id,
         amount,
         payment_method,
         payment_status,
         transaction_id,
         paid_at
       )
       VALUES ($1, $2, 'online', 'paid', $3, CURRENT_TIMESTAMP)
       RETURNING *`,
      [newBooking.id, Number(appt.agreed_amount), razorpay_payment_id],
    );

    // 3. Update appointment
    const apptUpdate = await dbClient.query(
      `UPDATE appointments
       SET status = 'project_active',
           booking_id = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [newBooking.id, appointmentId],
    );

    await dbClient.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Payment verified successfully! Project is now ACTIVE.",
      appointment: apptUpdate.rows[0],
      booking: newBooking,
      payment: paymentResult.rows[0],
    });
  } catch (error) {
    await dbClient.query("ROLLBACK");
    console.error("Verify appointment payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while verifying payment",
    });
  } finally {
    dbClient.release();
  }
};

// ============================================================
// CASH PAYMENT FOR APPOINTMENT (Client only)
// Activates Project into Bookings and Payments
// ============================================================
export const cashAppointmentPayment = async (req, res) => {
  const dbClient = await pool.connect();
  try {
    const userId = req.user.userId;
    const appointmentId = Number(req.params.id);

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID",
      });
    }

    const apptCheck = await pool.query(
      `SELECT a.*, wp.user_id as worker_user_id
       FROM appointments a
       JOIN worker_profiles wp ON wp.id = a.worker_id
       WHERE a.id = $1 AND a.client_id = $2`,
      [appointmentId, userId],
    );

    if (apptCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found or you are not the client",
      });
    }

    const appt = apptCheck.rows[0];

    if (appt.status !== "payment_pending" || !appt.agreed_amount) {
      return res.status(400).json({
        success: false,
        message: `Appointment is not in payment pending state (current: ${appt.status})`,
      });
    }

    await dbClient.query("BEGIN");
    await dbClient.query("SELECT pg_advisory_xact_lock($1)", [appt.worker_id]);

    // Check worker active jobs < 3
    const activeResult = await dbClient.query(
      `SELECT COUNT(*)::int AS active_jobs
       FROM bookings
       WHERE worker_id = $1
         AND status IN ('accepted', 'committed', 'in_progress')`,
      [appt.worker_id],
    );

    if (activeResult.rows[0].active_jobs >= 3) {
      await dbClient.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Worker has already reached the maximum of 3 active projects.",
      });
    }

    // 1. Insert into bookings as committed (active project)
    const bookingResult = await dbClient.query(
      `INSERT INTO bookings
       (
         client_id,
         worker_id,
         service_id,
         booking_date,
         location,
         description,
         workers_required,
         labour_cost,
         material_cost,
         travel_charge,
         total_cost,
         materials_provided_by,
         status
       )
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, 1, $6, 0, 0, $6, 'client', 'committed')
       RETURNING *`,
      [
        appt.client_id,
        appt.worker_id,
        appt.service_id,
        appt.location,
        appt.agreed_notes || appt.description || "Agreed project work",
        Number(appt.agreed_amount),
      ],
    );

    const newBooking = bookingResult.rows[0];

    // 2. Insert into payments
    const paymentResult = await dbClient.query(
      `INSERT INTO payments
       (
         booking_id,
         amount,
         payment_method,
         payment_status,
         transaction_id,
         paid_at
       )
       VALUES ($1, $2, 'cash', 'pending', NULL, NULL)
       RETURNING *`,
      [newBooking.id, Number(appt.agreed_amount)],
    );

    // 3. Update appointment
    const apptUpdate = await dbClient.query(
      `UPDATE appointments
       SET status = 'project_active',
           booking_id = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [newBooking.id, appointmentId],
    );

    await dbClient.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Cash payment recorded. Project is now ACTIVE!",
      appointment: apptUpdate.rows[0],
      booking: newBooking,
      payment: paymentResult.rows[0],
    });
  } catch (error) {
    await dbClient.query("ROLLBACK");
    console.error("Cash appointment payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while processing cash payment",
    });
  } finally {
    dbClient.release();
  }
};
