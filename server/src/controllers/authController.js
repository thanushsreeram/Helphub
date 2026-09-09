import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import pool from "../config/database.js";

export const register = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Validate required fields
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !role
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and role are required",
      });
    }

    if (!name.trim() || password.length < 6 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Name is required and password must be 6 to 128 characters",
      });
    }

    // Validate role
    if (!["client", "worker"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be client or worker",
      });
    }

    // Check existing user
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase().trim()],
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Unique email verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Create user with unverified email status
    const result = await pool.query(
      `INSERT INTO users
       (name, email, password_hash, role, phone, is_email_verified, email_verification_token)
       VALUES ($1, $2, $3, $4, $5, false, $6)
       RETURNING id, name, email, role, phone, is_email_verified, created_at`,
      [
        name.trim(),
        email.toLowerCase().trim(),
        passwordHash,
        role,
        phone || null,
        verificationToken,
      ],
    );

    const user = result.rows[0];
    const origin = req.headers.origin || "http://localhost:5173";
    const verificationLink = `${origin}/verify-email?token=${verificationToken}`;

    console.log(
      `📧 [HelpHub Email Service] Verification email sent to ${user.email}: ${verificationLink}`,
    );

    const response = {
      success: true,
      message:
        "Registration successful! Please check your email to verify your account.",
      user,
    };

    if (process.env.NODE_ENV !== "production") {
      response.verification_token = verificationToken;
      response.verification_link = verificationLink;
    }

    res.status(201).json(response);
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const token = req.query.token || req.body.token;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required",
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET is_email_verified = true,
           email_verification_token = NULL
       WHERE email_verification_token = $1
       RETURNING id, name, email, role, phone, created_at`,
      [token],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired email verification link",
      });
    }

    const user = result.rows[0];

    const jwtToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    return res.json({
      success: true,
      message: "Email verified successfully! You are now logged in.",
      token: jwtToken,
      user,
    });
  } catch (error) {
    console.error("Verify email error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during email verification",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const result = await pool.query(
      `SELECT id, name, email, password_hash, role, phone,
              is_email_verified, email_verification_token
       FROM users
       WHERE email = $1
       ORDER BY id ASC`,
      [normalizedEmail],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    let user = null;

    for (const account of result.rows) {
      const passwordMatch = await bcrypt.compare(
        password,
        account.password_hash,
      );

      if (passwordMatch) {
        user = account;
        break;
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const autoVerify =
      process.env.AUTO_VERIFY_EMAIL === "true" ||
      process.env.REQUIRE_EMAIL_VERIFICATION === "false";

    if (user.is_email_verified === false && !autoVerify) {
      return res.status(403).json({
        success: false,
        is_unverified: true,
        message:
          "Your email address is not verified yet. Please check your inbox and click the verification link.",
      });
    }

    const roles = [...new Set(result.rows.map((account) => account.role))];
    const hasClientAccount = roles.includes("client");
    const hasWorkerAccount = roles.includes("worker");
    const hasBothAccounts = hasClientAccount && hasWorkerAccount;

    const jwtSecret =
      process.env.JWT_SECRET || "helphub_default_secure_jwt_secret_key_2026";

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      jwtSecret,
      {
        expiresIn: "7d",
      },
    );

    delete user.password_hash;

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user,
      roles,
      hasClientAccount,
      hasWorkerAccount,
      hasBothAccounts,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Server error during login",
    });
  }
};

export const switchRole = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { target_role } = req.body;

    if (!target_role || !["client", "worker"].includes(target_role)) {
      return res.status(400).json({
        success: false,
        message: "Target role must be client or worker",
      });
    }

    // Update user role
    const updateResult = await pool.query(
      `UPDATE users
       SET role = $1
       WHERE id = $2
       RETURNING id, name, email, role, phone, is_email_verified, created_at`,
      [target_role, userId],
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = updateResult.rows[0];

    // If switching to worker, ensure worker profile exists
    if (target_role === "worker") {
      const workerCheck = await pool.query(
        `SELECT id FROM worker_profiles WHERE user_id = $1`,
        [userId],
      );

      if (workerCheck.rows.length === 0) {
        await pool.query(
          `INSERT INTO worker_profiles
           (user_id, hourly_rate, bio, category, experience_years, is_available)
           VALUES ($1, 500, 'Service Professional', 'General Labour', 1, true)`,
          [userId],
        );
      }
    }

    const jwtSecret =
      process.env.JWT_SECRET || "helphub_default_secure_jwt_secret_key_2026";

    // Issue updated JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      jwtSecret,
      {
        expiresIn: "7d",
      },
    );

    const rolesResult = await pool.query(
      `SELECT role FROM users WHERE email = $1`,
      [user.email.toLowerCase().trim()],
    );
    const roles = [...new Set(rolesResult.rows.map((a) => a.role))];
    const hasClientAccount = roles.includes("client");
    const hasWorkerAccount = roles.includes("worker");
    const hasBothAccounts = hasClientAccount && hasWorkerAccount;

    res.json({
      success: true,
      message: `Successfully switched to ${target_role} role`,
      token,
      user,
      roles,
      hasClientAccount,
      hasWorkerAccount,
      hasBothAccounts,
    });
  } catch (error) {
    console.error("Switch role error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to switch user role",
    });
  }
};
