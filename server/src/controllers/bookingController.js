import pool from "../config/database.js";

// ============================================================
// CREATE BOOKING
// ============================================================

export const createBooking = async (req, res) => {
  try {
    const clientId = req.user.userId;

    const {
      worker_id,
      service_id,
      booking_date,
      location,
      description,
      workers_required,
      labour_cost,
      material_cost,
      travel_charge,
      materials_provided_by,
    } = req.body;

    // ----------------------------------------------------------
    // 1. Basic validation
    // ----------------------------------------------------------

    if (
      !worker_id ||
      !service_id ||
      !booking_date ||
      !location ||
      labour_cost === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "worker_id, service_id, booking_date, location and labour_cost are required",
      });
    }

    // ----------------------------------------------------------
    // 2. Validate number of workers
    // ----------------------------------------------------------

    const workersRequired = Number(workers_required);

    if (
      !Number.isInteger(workersRequired) ||
      workersRequired < 1 ||
      workersRequired > 10
    ) {
      return res.status(400).json({
        success: false,
        message: "Number of workers must be between 1 and 10",
      });
    }

    // ----------------------------------------------------------
    // 3. Validate material responsibility
    // ----------------------------------------------------------

    if (!["client", "worker", "shared"].includes(materials_provided_by)) {
      return res.status(400).json({
        success: false,
        message: "materials_provided_by must be client, worker, or shared",
      });
    }

    // ----------------------------------------------------------
    // 4. Check worker
    // ----------------------------------------------------------

    const workerCheck = await pool.query(
      `SELECT id, user_id, is_available
       FROM worker_profiles
       WHERE id = $1`,
      [worker_id],
    );

    if (workerCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

    if (!workerCheck.rows[0].is_available) {
      return res.status(400).json({
        success: false,
        message: "Worker is currently unavailable",
      });
    }

    // ----------------------------------------------------------
    // 5. Check service
    // ----------------------------------------------------------

    const serviceCheck = await pool.query(
      `SELECT id, name
       FROM services
       WHERE id = $1`,
      [service_id],
    );

    if (serviceCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const workerServiceCheck = await pool.query(
      `SELECT 1
       FROM worker_services
       WHERE worker_id = $1 AND service_id = $2`,
      [worker_id, service_id],
    );

    if (workerServiceCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "This worker does not provide the selected service",
      });
    }

    // ----------------------------------------------------------
    // 6. Validate booking date
    // ----------------------------------------------------------

    const bookingDateObject = new Date(booking_date);

    if (Number.isNaN(bookingDateObject.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking date and time",
      });
    }

    // Prevent booking in the past
    if (bookingDateObject <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Booking date and time must be in the future",
      });
    }

    // ----------------------------------------------------------
    // 7. Check worker availability
    // ----------------------------------------------------------

    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const selectedDay = dayNames[bookingDateObject.getDay()];

    const selectedTime =
      bookingDateObject.getHours().toString().padStart(2, "0") +
      ":" +
      bookingDateObject.getMinutes().toString().padStart(2, "0");

    const availabilityCheck = await pool.query(
      `SELECT
         start_time,
         end_time,
         schedule_type,
         valid_month,
         start_date,
         end_date
       FROM worker_availability
       WHERE worker_id = $1
         AND day_of_week = $2
         AND is_available = true
         AND $3::time >= start_time
         AND $3::time < end_time
       LIMIT 1`,
      [worker_id, selectedDay, selectedTime],
    );

    if (availabilityCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Worker is not available on ${selectedDay} at ${selectedTime}. Please choose another date or time.`,
        day: selectedDay,
        time: selectedTime,
      });
    }

    const avail = availabilityCheck.rows[0];
    const bookingYear = bookingDateObject.getFullYear();
    const bookingMonth = String(bookingDateObject.getMonth() + 1).padStart(
      2,
      "0",
    );
    const bookingMonthStr = `${bookingYear}-${bookingMonth}`;
    const bookingDayStr = `${bookingYear}-${bookingMonth}-${String(bookingDateObject.getDate()).padStart(2, "0")}`;

    if (avail.schedule_type === "month" && avail.valid_month) {
      if (bookingMonthStr !== avail.valid_month) {
        return res.status(400).json({
          success: false,
          message: `Worker schedule was set for ${avail.valid_month} only. Please select a date within ${avail.valid_month}.`,
        });
      }
    } else if (avail.schedule_type === "custom") {
      const startDateStr = avail.start_date
        ? new Date(avail.start_date).toISOString().slice(0, 10)
        : null;
      const endDateStr = avail.end_date
        ? new Date(avail.end_date).toISOString().slice(0, 10)
        : null;

      if (startDateStr && bookingDayStr < startDateStr) {
        return res.status(400).json({
          success: false,
          message: `Worker is only available starting from ${startDateStr}.`,
        });
      }
      if (endDateStr && bookingDayStr > endDateStr) {
        return res.status(400).json({
          success: false,
          message: `Worker schedule ended on ${endDateStr}.`,
        });
      }
    }

    // ----------------------------------------------------------
    // 8. Prevent duplicate booking at same time
    // ----------------------------------------------------------

    const conflictingBooking = await pool.query(
      `SELECT id, booking_date, status
       FROM bookings
       WHERE worker_id = $1
         AND booking_date = $2
         AND status IN (
           'pending',
           'committed',
           'in_progress'
         )
       LIMIT 1`,
      [worker_id, booking_date],
    );

    if (conflictingBooking.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This worker already has a booking at the selected date and time. Please choose another time.",
        conflicting_booking: conflictingBooking.rows[0],
      });
    }

    // ----------------------------------------------------------
    // 9. Validate costs
    // ----------------------------------------------------------

    const labourCost = Number(labour_cost);
    const materialCost = Number(material_cost || 0);
    const travelCharge = Number(travel_charge || 0);

    if (
      !Number.isFinite(labourCost) ||
      !Number.isFinite(materialCost) ||
      !Number.isFinite(travelCharge) ||
      labourCost < 0 ||
      materialCost < 0 ||
      travelCharge < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid cost values",
      });
    }

    const totalCost = labourCost + materialCost + travelCharge;

    // ----------------------------------------------------------
    // 10. Create booking
    // ----------------------------------------------------------

    const result = await pool.query(
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
       VALUES
       (
         $1,
         $2,
         $3,
         $4,
         $5,
         $6,
         $7,
         $8,
         $9,
         $10,
         $11,
         $12,
         'pending'
       )
       RETURNING *`,
      [
        clientId,
        worker_id,
        service_id,
        booking_date,
        location.trim(),
        description?.trim() || null,
        workersRequired,
        labourCost,
        materialCost,
        travelCharge,
        totalCost,
        materials_provided_by,
      ],
    );

    // ----------------------------------------------------------
    // 11. Response
    // ----------------------------------------------------------

    return res.status(201).json({
      success: true,
      message: "Booking request created successfully",
      booking: result.rows[0],
    });
  } catch (error) {
    console.error("Create booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while creating booking",
    });
  }
};

// ============================================================
// GET MY BOOKINGS
// ============================================================

export const getMyBookings = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT
         b.*,
         u.name AS client_name,
         u.avatar_url AS client_avatar_url,
         u.client_rating,
         u.client_total_reviews,
         wp.user_id AS worker_user_id,
         wu.name AS worker_name,
         wu.avatar_url AS worker_avatar_url,
         s.name AS service_name,
         EXISTS (SELECT 1 FROM reviews r WHERE r.booking_id = b.id AND (r.reviewer_type = 'client' OR r.reviewer_type IS NULL)) AS has_review,
         EXISTS (SELECT 1 FROM reviews r WHERE r.booking_id = b.id AND r.reviewer_type = 'worker') AS has_worker_review
       FROM bookings b
       JOIN users u ON u.id = b.client_id
       JOIN worker_profiles wp ON wp.id = b.worker_id
       JOIN users wu ON wu.id = wp.user_id
       JOIN services s ON s.id = b.service_id
       WHERE b.client_id = $1
          OR wp.user_id = $1
       ORDER BY b.created_at DESC`,
      [userId],
    );

    return res.json({
      success: true,
      count: result.rows.length,
      bookings: result.rows,
    });
  } catch (error) {
    console.error("Get bookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching bookings",
    });
  }
};

// ============================================================
// GET BOOKING BY ID
// ============================================================

export const getBookingById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookingId = Number(req.params.id);

    const result = await pool.query(
      `SELECT
         b.*,
         u.name AS client_name,
         u.avatar_url AS client_avatar_url,
         u.client_rating,
         u.client_total_reviews,
         wp.user_id AS worker_user_id,
         wu.name AS worker_name,
         wu.avatar_url AS worker_avatar_url,
         s.name AS service_name,
         EXISTS (SELECT 1 FROM reviews r WHERE r.booking_id = b.id AND (r.reviewer_type = 'client' OR r.reviewer_type IS NULL)) AS has_review,
         EXISTS (SELECT 1 FROM reviews r WHERE r.booking_id = b.id AND r.reviewer_type = 'worker') AS has_worker_review
       FROM bookings b
       JOIN users u ON u.id = b.client_id
       JOIN worker_profiles wp ON wp.id = b.worker_id
       JOIN users wu ON wu.id = wp.user_id
       JOIN services s ON s.id = b.service_id
       WHERE b.id = $1
         AND (b.client_id = $2 OR wp.user_id = $2)`,
      [bookingId, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    return res.json({
      success: true,
      booking: result.rows[0],
    });
  } catch (error) {
    console.error("Get booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching booking",
    });
  }
};

// ============================================================
// ACCEPT BOOKING
// ============================================================

export const acceptBooking = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.userId;
    const bookingId = Number(req.params.id);

    await client.query("BEGIN");

    const bookingResult = await client.query(
      `SELECT
         b.*,
         wp.user_id AS worker_user_id
       FROM bookings b
       JOIN worker_profiles wp ON wp.id = b.worker_id
       WHERE b.id = $1
       FOR UPDATE`,
      [bookingId],
    );

    if (bookingResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const booking = bookingResult.rows[0];

    if (Number(booking.worker_user_id) !== Number(userId)) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        success: false,
        message: "You can only accept bookings assigned to you",
      });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Booking cannot be accepted because its status is ${booking.status}`,
      });
    }

    // Serialize accepts for the same worker so concurrent requests cannot
    // bypass the maximum-active-jobs rule.
    await client.query("SELECT pg_advisory_xact_lock($1)", [booking.worker_id]);

    // Maximum 3 active jobs
    const activeResult = await client.query(
      `SELECT COUNT(*)::int AS active_jobs
       FROM bookings
       WHERE worker_id = $1
         AND status IN ('accepted', 'committed', 'in_progress')`,
      [booking.worker_id],
    );

    const activeJobs = activeResult.rows[0].active_jobs;

    if (activeJobs >= 3) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message:
          "Worker already has 3 active jobs. This booking cannot be accepted.",
        active_jobs: activeJobs,
        maximum_active_jobs: 3,
      });
    }

    const updated = await client.query(
      `UPDATE bookings
      SET status = 'accepted'
       WHERE id = $1
       RETURNING *`,
      [bookingId],
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Booking accepted successfully",
      booking: updated.rows[0],
      active_jobs: activeJobs + 1,
      maximum_active_jobs: 3,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Accept booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while accepting booking",
    });
  } finally {
    client.release();
  }
};

// ============================================================
// REJECT BOOKING
// ============================================================

export const rejectBooking = async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookingId = Number(req.params.id);

    const result = await pool.query(
      `UPDATE bookings b
       SET status = 'rejected'
       FROM worker_profiles wp
       WHERE b.id = $1
         AND b.worker_id = wp.id
         AND wp.user_id = $2
         AND b.status = 'pending'
       RETURNING b.*`,
      [bookingId, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pending booking not found or you are not the assigned worker",
      });
    }

    return res.json({
      success: true,
      message: "Booking rejected",
      booking: result.rows[0],
    });
  } catch (error) {
    console.error("Reject booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while rejecting booking",
    });
  }
};

// ============================================================
// START BOOKING
// ============================================================

export const startBooking = async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookingId = Number(req.params.id);

    const result = await pool.query(
      `UPDATE bookings b
       SET status = 'in_progress'
       FROM worker_profiles wp
       WHERE b.id = $1
         AND b.worker_id = wp.id
         AND wp.user_id = $2
         AND b.status = 'committed'
       RETURNING b.*`,
      [bookingId, userId],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Booking cannot be started. It must be committed and assigned to you.",
      });
    }

    return res.json({
      success: true,
      message: "Job started",
      booking: result.rows[0],
    });
  } catch (error) {
    console.error("Start booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while starting job",
    });
  }
};

// ============================================================
// COMPLETE BOOKING
// ============================================================

export const completeBooking = async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookingId = Number(req.params.id);

    const result = await pool.query(
      `UPDATE bookings b
       SET status = 'completed'
       FROM worker_profiles wp
       WHERE b.id = $1
         AND b.worker_id = wp.id
         AND wp.user_id = $2
         AND b.status = 'in_progress'
       RETURNING b.*`,
      [bookingId, userId],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Job cannot be completed. It must be in progress and assigned to you.",
      });
    }

    return res.json({
      success: true,
      message: "Job completed successfully",
      booking: result.rows[0],
    });
  } catch (error) {
    console.error("Complete booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while completing job",
    });
  }
};

// ============================================================
// CANCEL BOOKING
// ============================================================

export const cancelBooking = async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookingId = Number(req.params.id);

    const { cancellation_reason, additional_details } = req.body;

    // Validate reason
    if (!cancellation_reason || !cancellation_reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Cancellation reason is required",
      });
    }

    const reason = cancellation_reason.trim();
    const details =
      typeof additional_details === "string" ? additional_details.trim() : "";

    const finalReason = details ? `${reason}: ${details}` : reason;

    if (reason.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Cancellation reason is too short",
      });
    }

    if (finalReason.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Cancellation reason must be 500 characters or less",
      });
    }

    const result = await pool.query(
      `UPDATE bookings
       SET status = 'cancelled',
           cancellation_reason = $1
       WHERE id = $2
         AND client_id = $3
         AND status IN ('pending', 'committed')
       RETURNING *`,
      [finalReason, bookingId, userId],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Booking cannot be cancelled. It may already be in progress, completed, rejected, or you are not the client.",
      });
    }

    return res.json({
      success: true,
      message: "Booking cancelled successfully",
      booking: result.rows[0],
    });
  } catch (error) {
    console.error("Cancel booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while cancelling booking",
    });
  }
};

// ============================================================
// EMERGENCY CANCEL BOOKING
// ============================================================

export const emergencyCancelBooking = async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookingId = Number(req.params.id);
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Emergency cancellation reason is required",
      });
    }

    const result = await pool.query(
      `UPDATE bookings b
       SET
         status = 'cancelled',
         cancellation_reason = $1
       FROM worker_profiles wp
       WHERE b.id = $2
         AND b.worker_id = wp.id
         AND wp.user_id = $3
         AND b.status IN ('committed', 'in_progress')
       RETURNING b.*`,
      [reason.trim(), bookingId, userId],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Booking cannot be cancelled. It must be committed or in progress and assigned to you.",
      });
    }

    return res.json({
      success: true,
      message: "Emergency cancellation submitted",
      booking: result.rows[0],
    });
  } catch (error) {
    console.error("Emergency cancellation error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while cancelling booking",
    });
  }
};

// ============================================================
// COMMIT BOOKING
// ============================================================

export const commitBooking = async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookingId = Number(req.params.id);

    const result = await pool.query(
      `UPDATE bookings b
       SET status = 'committed'
       FROM worker_profiles wp
       WHERE b.id = $1
         AND b.worker_id = wp.id
         AND wp.user_id = $2
         AND b.status = 'accepted'
       RETURNING b.*`,
      [bookingId, userId],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Booking cannot be committed. It must be accepted and assigned to you.",
      });
    }

    return res.json({
      success: true,
      message: "Booking committed successfully",
      booking: result.rows[0],
    });
  } catch (error) {
    console.error("Commit booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while committing booking",
    });
  }
};
