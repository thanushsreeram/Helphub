import pool from "../config/database.js";

/*
  Create a review for a completed booking
  Client -> Worker
*/
export const createReview = async (req, res) => {
  try {
    const clientId = req.user.userId;
    const bookingId = Number(req.body.booking_id);

    const rating = Number(req.body.rating);
    const behaviourRating =
      req.body.behaviour_rating !== undefined &&
      req.body.behaviour_rating !== null &&
      req.body.behaviour_rating !== ""
        ? Number(req.body.behaviour_rating)
        : null;

    const comment =
      typeof req.body.comment === "string"
        ? req.body.comment.trim()
        : null;

    const photos = Array.isArray(req.body.photos)
      ? req.body.photos.filter((p) => typeof p === "string" && p.trim())
      : [];

    if (comment && comment.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Comment must be 1000 characters or less",
      });
    }

    if (!bookingId || !Number.isInteger(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Valid booking_id is required",
      });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    if (
      behaviourRating !== null &&
      (!Number.isInteger(behaviourRating) ||
        behaviourRating < 1 ||
        behaviourRating > 5)
    ) {
      return res.status(400).json({
        success: false,
        message: "Behaviour rating must be between 1 and 5",
      });
    }

    const bookingResult = await pool.query(
      `SELECT
         b.id,
         b.client_id,
         b.worker_id,
         b.status,
         u.name AS worker_name
       FROM bookings b
       JOIN worker_profiles wp
         ON wp.id = b.worker_id
       JOIN users u
         ON u.id = wp.user_id
       WHERE b.id = $1
         AND b.client_id = $2`,
      [bookingId, clientId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or you are not the client",
      });
    }

    const booking = bookingResult.rows[0];

    if (booking.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "You can review the worker only after the job is completed",
      });
    }

    const existingReview = await pool.query(
      `SELECT id
       FROM reviews
       WHERE booking_id = $1
         AND (reviewer_type = 'client' OR reviewer_type IS NULL)`,
      [bookingId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this booking",
      });
    }

    const reviewResult = await pool.query(
      `INSERT INTO reviews
       (
         booking_id,
         client_id,
         worker_id,
         rating,
         comment,
         behaviour_rating,
         photos,
         reviewer_type
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'client')
       RETURNING *`,
      [
        bookingId,
        clientId,
        booking.worker_id,
        rating,
        comment || null,
        behaviourRating,
        JSON.stringify(photos),
      ]
    );

    // Recalculate worker rating
    const ratingResult = await pool.query(
      `SELECT
         ROUND(AVG(rating)::numeric, 2) AS average_rating,
         COUNT(*)::int AS total_reviews
       FROM reviews
       WHERE worker_id = $1
         AND (reviewer_type = 'client' OR reviewer_type IS NULL)`,
      [booking.worker_id]
    );

    const averageRating = ratingResult.rows[0].average_rating;
    const totalReviews = ratingResult.rows[0].total_reviews;

    await pool.query(
      `UPDATE worker_profiles
       SET
         rating = $1,
         total_reviews = $2
       WHERE id = $3`,
      [
        averageRating || 0,
        totalReviews,
        booking.worker_id,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review: reviewResult.rows[0],
      worker_rating: {
        rating: averageRating || 0,
        total_reviews: totalReviews,
      },
    });
  } catch (error) {
    console.error("Create review error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating review",
    });
  }
};


/*
  Create a review for a client
  Worker -> Client
*/
export const createClientReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookingId = Number(req.body.booking_id);

    const rating = Number(req.body.rating);
    const behaviourRating =
      req.body.behaviour_rating !== undefined &&
      req.body.behaviour_rating !== null &&
      req.body.behaviour_rating !== ""
        ? Number(req.body.behaviour_rating)
        : null;

    const comment =
      typeof req.body.comment === "string"
        ? req.body.comment.trim()
        : null;

    const photos = Array.isArray(req.body.photos)
      ? req.body.photos.filter((p) => typeof p === "string" && p.trim())
      : [];

    if (!bookingId || !Number.isInteger(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Valid booking_id is required",
      });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // Find worker profile for current user
    const workerProfileResult = await pool.query(
      `SELECT id FROM worker_profiles WHERE user_id = $1`,
      [userId]
    );

    if (workerProfileResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Worker profile not found",
      });
    }

    const workerId = workerProfileResult.rows[0].id;

    // Verify booking belongs to this worker and is completed
    const bookingResult = await pool.query(
      `SELECT id, client_id, status FROM bookings WHERE id = $1 AND worker_id = $2`,
      [bookingId, workerId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found or not assigned to you",
      });
    }

    const booking = bookingResult.rows[0];

    if (booking.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "You can rate the client only after the job is completed",
      });
    }

    // Check if worker already reviewed this booking
    const existingReview = await pool.query(
      `SELECT id FROM reviews WHERE booking_id = $1 AND reviewer_type = 'worker'`,
      [bookingId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed the client for this booking",
      });
    }

    // Insert worker review
    const reviewResult = await pool.query(
      `INSERT INTO reviews
       (
         booking_id,
         client_id,
         worker_id,
         rating,
         comment,
         behaviour_rating,
         photos,
         reviewer_type
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'worker')
       RETURNING *`,
      [
        bookingId,
        booking.client_id,
        workerId,
        rating,
        comment || null,
        behaviourRating,
        JSON.stringify(photos),
      ]
    );

    // Recalculate client rating in users table
    const ratingResult = await pool.query(
      `SELECT
         ROUND(AVG(rating)::numeric, 2) AS average_rating,
         COUNT(*)::int AS total_reviews
       FROM reviews
       WHERE client_id = $1 AND reviewer_type = 'worker'`,
      [booking.client_id]
    );

    const averageRating = ratingResult.rows[0].average_rating;
    const totalReviews = ratingResult.rows[0].total_reviews;

    await pool.query(
      `UPDATE users
       SET
         client_rating = $1,
         client_total_reviews = $2
       WHERE id = $3`,
      [averageRating || 0, totalReviews, booking.client_id]
    );

    return res.status(201).json({
      success: true,
      message: "Client review submitted successfully",
      review: reviewResult.rows[0],
      client_rating: {
        rating: averageRating || 0,
        total_reviews: totalReviews,
      },
    });
  } catch (error) {
    console.error("Create client review error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while rating client",
    });
  }
};


/*
  Get reviews for a worker (client -> worker)
*/
export const getWorkerReviews = async (req, res) => {
  try {
    const workerId = Number(req.params.workerId);

    if (!workerId || !Number.isInteger(workerId)) {
      return res.status(400).json({
        success: false,
        message: "Valid worker ID is required",
      });
    }

    const result = await pool.query(
      `SELECT
         r.id,
         r.booking_id,
         r.rating,
         r.comment,
         r.behaviour_rating,
         r.photos,
         r.reviewer_type,
         r.created_at,
         u.name AS client_name,
         u.avatar_url AS client_avatar_url
       FROM reviews r
       JOIN users u
         ON u.id = r.client_id
       WHERE r.worker_id = $1
         AND (r.reviewer_type = 'client' OR r.reviewer_type IS NULL)
       ORDER BY r.created_at DESC`,
      [workerId]
    );

    return res.json({
      success: true,
      count: result.rows.length,
      reviews: result.rows,
    });
  } catch (error) {
    console.error("Get worker reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching reviews",
    });
  }
};


/*
  Get reviews for a client (worker -> client)
*/
export const getClientReviews = async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);

    if (!clientId || !Number.isInteger(clientId)) {
      return res.status(400).json({
        success: false,
        message: "Valid client ID is required",
      });
    }

    const result = await pool.query(
      `SELECT
         r.id,
         r.booking_id,
         r.rating,
         r.comment,
         r.behaviour_rating,
         r.photos,
         r.reviewer_type,
         r.created_at,
         u.name AS worker_name,
         u.avatar_url AS worker_avatar_url
       FROM reviews r
       JOIN worker_profiles wp
         ON wp.id = r.worker_id
       JOIN users u
         ON u.id = wp.user_id
       WHERE r.client_id = $1
         AND r.reviewer_type = 'worker'
       ORDER BY r.created_at DESC`,
      [clientId]
    );

    return res.json({
      success: true,
      count: result.rows.length,
      reviews: result.rows,
    });
  } catch (error) {
    console.error("Get client reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching client reviews",
    });
  }
};


/*
  Get review for a specific booking (returns client & worker reviews if present)
*/
export const getBookingReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookingId = Number(req.params.bookingId);

    const result = await pool.query(
      `SELECT
         r.*,
         u_client.name AS client_name,
         u_client.avatar_url AS client_avatar_url,
         u_worker.name AS worker_name,
         u_worker.avatar_url AS worker_avatar_url
       FROM reviews r
       JOIN bookings b
         ON b.id = r.booking_id
       JOIN users u_client
         ON u_client.id = r.client_id
       JOIN worker_profiles wp
         ON wp.id = r.worker_id
       JOIN users u_worker
         ON u_worker.id = wp.user_id
       WHERE r.booking_id = $1
         AND (b.client_id = $2 OR wp.user_id = $2)`,
      [bookingId, userId]
    );

    const clientReview = result.rows.find((r) => r.reviewer_type === 'client' || !r.reviewer_type) || null;
    const workerReview = result.rows.find((r) => r.reviewer_type === 'worker') || null;

    return res.json({
      success: true,
      review: clientReview,
      client_review: clientReview,
      worker_review: workerReview,
    });
  } catch (error) {
    console.error("Get booking review error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching review",
    });
  }
};
//thanush