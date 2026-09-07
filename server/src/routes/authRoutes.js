import express from "express";
import {
  register,
  login,
  verifyEmail,
  switchRole,
} from "../controllers/authController.js";
import {
  loginRateLimiter,
  registrationRateLimiter,
} from "../middleware/rateLimitMiddleware.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registrationRateLimiter, register);
router.post("/login", loginRateLimiter, login);
router.get("/verify-email", verifyEmail);
router.post("/verify-email", verifyEmail);
router.post("/switch-role", authenticateToken, switchRole);

export default router;

