import express from "express";
import pool from "../config/database.js";

import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();


// Any logged-in user: GET profile
router.get(
  "/profile",
  authenticateToken,
  async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT id, name, email, role, phone, avatar_url, created_at FROM users WHERE id = $1",
        [req.user.userId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      res.json({
        success: true,
        user: result.rows[0],
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// Any logged-in user: PUT profile
router.put(
  "/profile",
  authenticateToken,
  async (req, res) => {
    try {
      const { name, phone, avatar_url } = req.body;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ success: false, message: "Name is required" });
      }
      const result = await pool.query(
        `UPDATE users
         SET name = $1, phone = $2, avatar_url = $3
         WHERE id = $4
         RETURNING id, name, email, role, phone, avatar_url, created_at`,
        [name.trim(), phone ? phone.trim() : null, avatar_url || null, req.user.userId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      res.json({
        success: true,
        message: "Profile updated successfully",
        user: result.rows[0],
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);


// Client only
router.get(
  "/client-dashboard",
  authenticateToken,
  authorizeRoles("client"),
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome to the Client Dashboard",
      user: req.user,
    });
  }
);


// Worker only
router.get(
  "/worker-dashboard",
  authenticateToken,
  authorizeRoles("worker"),
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome to the Worker Dashboard",
      user: req.user,
    });
  }
);


// Admin only
router.get(
  "/admin-dashboard",
  authenticateToken,
  authorizeRoles("admin"),
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome to the Admin Dashboard",
      user: req.user,
    });
  }
);

export default router;