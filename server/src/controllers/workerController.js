import pool from "../config/database.js";

export const createWorkerProfile = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      name,
      phone,
      bio,
      location,
      hourly_rate,
      experience_years,
      avatar_url,
    } = req.body;

    const userId = req.user.userId;

    // Check whether profile already exists
    const existingProfile = await pool.query(
      `SELECT id FROM worker_profiles WHERE user_id = $1`,
      [userId],
    );

    if (existingProfile.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Worker profile already exists",
      });
    }

    const hourlyRate = Number(hourly_rate || 0);
    const experienceYears = Number(experience_years || 0);

    await client.query("BEGIN");

    await client.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           avatar_url = COALESCE($3, avatar_url)
       WHERE id = $4`,
      [name?.trim() || null, phone?.trim() || null, avatar_url || null, userId],
    );

    const result = await client.query(
      `INSERT INTO worker_profiles
       (user_id, bio, location, hourly_rate, experience_years)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, bio || null, location || null, hourlyRate, experienceYears],
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Worker profile created successfully",
      profile: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create worker profile error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create worker profile",
    });
  } finally {
    client.release();
  }
};

export const getMyWorkerProfile = async (req, res) => {
  try {
    if (req.user?.role !== "worker") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Access is restricted to worker accounts only",
      });
    }

    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT
        wp.*,
        u.name,
        u.email,
        u.phone,
        u.avatar_url
       FROM worker_profiles wp
       JOIN users u ON wp.user_id = u.id
       WHERE wp.user_id = $1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
      });
    }

    res.json({
      success: true,
      profile: result.rows[0],
    });
  } catch (error) {
    console.error("Get worker profile error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get worker profile",
    });
  }
};
export const updateWorkerProfile = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.userId;

    const {
      name,
      phone,
      avatar_url,
      bio,
      location,
      hourly_rate,
      experience_years,
    } = req.body;

    // Basic validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const rate = Number(hourly_rate);
    const experience = Number(experience_years);

    if (Number.isNaN(rate) || rate < 0) {
      return res.status(400).json({
        success: false,
        message: "Hourly rate must be a valid positive number",
      });
    }

    if (Number.isNaN(experience) || experience < 0) {
      return res.status(400).json({
        success: false,
        message: "Experience must be a valid positive number",
      });
    }

    await client.query("BEGIN");

    // Check worker profile
    const workerResult = await client.query(
      `SELECT id
       FROM worker_profiles
       WHERE user_id = $1`,
      [userId],
    );

    if (workerResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
      });
    }

    const workerId = workerResult.rows[0].id;

    // Update user information
    await client.query(
      `UPDATE users
       SET name = $1,
           phone = $2,
           avatar_url = $3
         WHERE id = $4`,
      [name.trim(), phone.trim(), avatar_url || null, userId],
    );

    // Update worker professional information
    await client.query(
      `UPDATE worker_profiles
       SET bio = $1,
           location = $2,
           hourly_rate = $3,
           experience_years = $4
       WHERE id = $5`,
      [
        bio?.trim() || null,
        location?.trim() || null,
        rate,
        experience,
        workerId,
      ],
    );

    await client.query("COMMIT");

    // Return updated profile
    const updatedProfile = await pool.query(
      `SELECT
        wp.*,
        u.name,
        u.email,
        u.phone,
        u.avatar_url
       FROM worker_profiles wp
       JOIN users u
         ON wp.user_id = u.id
       WHERE wp.user_id = $1`,
      [userId],
    );

    return res.json({
      success: true,
      message: "Worker profile updated successfully",
      profile: updatedProfile.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Update worker profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update worker profile",
    });
  } finally {
    client.release();
  }
};
export const addWorkerServices = async (req, res) => {
  const client = await pool.connect();

  try {
    const { service_ids } = req.body;
    const userId = req.user.userId;

    if (!Array.isArray(service_ids) || service_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one service",
      });
    }

    const serviceIds = service_ids.map(Number);

    if (
      serviceIds.some((serviceId) => !Number.isInteger(serviceId)) ||
      new Set(serviceIds).size !== serviceIds.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Service IDs must be unique integers",
      });
    }

    await client.query("BEGIN");

    // Find worker profile
    const workerResult = await client.query(
      `SELECT id FROM worker_profiles WHERE user_id = $1`,
      [userId],
    );

    if (workerResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
      });
    }

    const workerId = workerResult.rows[0].id;

    // Check that all services exist
    const servicesResult = await client.query(
      `SELECT id FROM services WHERE id = ANY($1::int[])`,
      [serviceIds],
    );

    if (servicesResult.rows.length !== serviceIds.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "One or more service IDs are invalid",
      });
    }

    // Remove previous services
    await client.query(`DELETE FROM worker_services WHERE worker_id = $1`, [
      workerId,
    ]);

    await client.query(
      `INSERT INTO worker_services (worker_id, service_id)
       SELECT $1, UNNEST($2::int[])`,
      [workerId, serviceIds],
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Worker services updated successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Add worker services error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update worker services",
    });
  } finally {
    client.release();
  }
};

export const getMyWorkerServices = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT
        s.id,
        s.name,
        s.description,
        s.category
       FROM worker_services ws
       JOIN worker_profiles wp
         ON ws.worker_id = wp.id
       JOIN services s
         ON ws.service_id = s.id
       WHERE wp.user_id = $1
       ORDER BY s.name`,
      [userId],
    );

    res.json({
      success: true,
      services: result.rows,
    });
  } catch (error) {
    console.error("Get worker services error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get worker services",
    });
  }
};
export const searchWorkers = async (req, res) => {
  try {
    const { service, location, worker_id: workerIdParam } = req.query;

    let query = `
      SELECT
        wp.id AS worker_id,
        u.id AS user_id,
        u.name,
        u.email,
        u.phone,
        u.avatar_url,
        wp.bio,
        wp.location,
        wp.hourly_rate,
        wp.experience_years,
        wp.is_available,
        wp.rating,
        wp.total_reviews,
        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'id', s.id,
              'name', s.name,
              'category', s.category
            )
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'
        ) AS services
      FROM worker_profiles wp
      JOIN users u
        ON wp.user_id = u.id
      LEFT JOIN worker_services ws
        ON wp.id = ws.worker_id
      LEFT JOIN services s
        ON ws.service_id = s.id
    `;

    const conditions = [];
    const values = [];

    if (workerIdParam !== undefined) {
      const workerId = Number(workerIdParam);

      if (!Number.isInteger(workerId) || workerId < 1) {
        return res.status(400).json({
          success: false,
          message: "worker_id must be a positive integer",
        });
      }

      values.push(workerId);
      conditions.push(`wp.id = $${values.length}`);
    }

    if (service) {
      values.push(service);
      conditions.push(`
        EXISTS (
          SELECT 1
          FROM worker_services ws2
          JOIN services s2
            ON ws2.service_id = s2.id
          WHERE ws2.worker_id = wp.id
          AND s2.name ILIKE $${values.length}
        )
      `);
    }

    if (location) {
      values.push(location);
      conditions.push(`wp.location ILIKE '%' || $${values.length} || '%'`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += `
      GROUP BY
        wp.id,
        u.id
      ORDER BY
        wp.rating DESC,
        wp.total_reviews DESC,
        wp.experience_years DESC
    `;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      count: result.rows.length,
      workers: result.rows,
    });
  } catch (error) {
    console.error("Search workers error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to search workers",
    });
  }
};
export const updateWorkerAvailability = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      availability,
      schedule_type = "permanent",
      valid_month = null,
      start_date = null,
      end_date = null,
    } = req.body;
    const userId = req.user.userId;

    if (!Array.isArray(availability)) {
      return res.status(400).json({
        success: false,
        message: "Availability must be an array",
      });
    }

    const validDays = new Set([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]);
    const submittedDays = new Set();

    for (const day of availability) {
      if (
        !day.day_of_week ||
        !day.start_time ||
        !day.end_time ||
        !validDays.has(day.day_of_week) ||
        submittedDays.has(day.day_of_week) ||
        day.start_time >= day.end_time
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Each availability entry needs a valid day and working hours",
        });
      }

      submittedDays.add(day.day_of_week);
    }

    await client.query("BEGIN");

    // Find worker profile
    const workerResult = await client.query(
      `SELECT id
       FROM worker_profiles
       WHERE user_id = $1`,
      [userId],
    );

    if (workerResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Worker profile not found",
      });
    }

    const workerId = workerResult.rows[0].id;

    // Replace existing availability
    await client.query(
      `DELETE FROM worker_availability
       WHERE worker_id = $1`,
      [workerId],
    );

    // Insert new availability
    for (const day of availability) {
      await client.query(
        `INSERT INTO worker_availability
         (worker_id, day_of_week, start_time, end_time, is_available, schedule_type, valid_month, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          workerId,
          day.day_of_week,
          day.start_time,
          day.end_time,
          day.is_available !== false,
          schedule_type,
          schedule_type === "month" ? valid_month : null,
          schedule_type === "custom" ? start_date : null,
          schedule_type === "custom" ? end_date : null,
        ],
      );
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Worker availability updated successfully",
      schedule_type,
      valid_month: schedule_type === "month" ? valid_month : null,
      start_date: schedule_type === "custom" ? start_date : null,
      end_date: schedule_type === "custom" ? end_date : null,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update worker availability error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update worker availability",
    });
  } finally {
    client.release();
  }
};

export const getWorkerAvailability = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT
        wa.id,
        wa.day_of_week,
        wa.start_time,
        wa.end_time,
        wa.is_available,
        wa.schedule_type,
        wa.valid_month,
        wa.start_date,
        wa.end_date
       FROM worker_availability wa
       JOIN worker_profiles wp
         ON wa.worker_id = wp.id
       WHERE wp.user_id = $1
       ORDER BY
         CASE wa.day_of_week
           WHEN 'Monday' THEN 1
           WHEN 'Tuesday' THEN 2
           WHEN 'Wednesday' THEN 3
           WHEN 'Thursday' THEN 4
           WHEN 'Friday' THEN 5
           WHEN 'Saturday' THEN 6
           WHEN 'Sunday' THEN 7
         END`,
      [userId],
    );

    const firstRow = result.rows[0] || {};
    const schedule_type = firstRow.schedule_type || "permanent";
    const valid_month = firstRow.valid_month || null;
    const start_date = firstRow.start_date || null;
    const end_date = firstRow.end_date || null;

    res.json({
      success: true,
      availability: result.rows,
      schedule_type,
      valid_month,
      start_date,
      end_date,
    });
  } catch (error) {
    console.error("Get worker availability error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get worker availability",
    });
  }
};

// Get availability of a worker for clients
export const getPublicWorkerAvailability = async (req, res) => {
  try {
    const workerId = Number(req.params.workerId);

    if (!workerId || !Number.isInteger(workerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker ID",
      });
    }

    const result = await pool.query(
      `SELECT
        wa.id,
        wa.day_of_week,
        wa.start_time,
        wa.end_time,
        wa.is_available,
        wa.schedule_type,
        wa.valid_month,
        wa.start_date,
        wa.end_date
       FROM worker_availability wa
       WHERE wa.worker_id = $1
       ORDER BY
         CASE wa.day_of_week
           WHEN 'Monday' THEN 1
           WHEN 'Tuesday' THEN 2
           WHEN 'Wednesday' THEN 3
           WHEN 'Thursday' THEN 4
           WHEN 'Friday' THEN 5
           WHEN 'Saturday' THEN 6
           WHEN 'Sunday' THEN 7
         END`,
      [workerId],
    );

    const firstRow = result.rows[0] || {};
    const schedule_type = firstRow.schedule_type || "permanent";
    const valid_month = firstRow.valid_month || null;
    const start_date = firstRow.start_date || null;
    const end_date = firstRow.end_date || null;

    return res.json({
      success: true,
      worker_id: workerId,
      availability: result.rows,
      schedule_type,
      valid_month,
      start_date,
      end_date,
    });
  } catch (error) {
    console.error("Get public worker availability error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get worker availability",
    });
  }
};
