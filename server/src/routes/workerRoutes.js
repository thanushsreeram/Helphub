import express from "express";

import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

import {
  createWorkerProfile,
  getMyWorkerProfile,
  updateWorkerProfile,
  addWorkerServices,
  getMyWorkerServices,
  searchWorkers,
  updateWorkerAvailability,
  getWorkerAvailability,
  getPublicWorkerAvailability,
} from "../controllers/workerController.js";
const router = express.Router();

router.put(
  "/services",
  authenticateToken,
  authorizeRoles("worker"),
  addWorkerServices
);

router.get(
  "/services",
  authenticateToken,
  authorizeRoles("worker"),
  getMyWorkerServices
);

router.get(
  "/",
  authenticateToken,
  authorizeRoles("client"),
  searchWorkers
);
router.put(
  "/availability",
  authenticateToken,
  authorizeRoles("worker"),
  updateWorkerAvailability
);

router.get(
  "/availability",
  authenticateToken,
  authorizeRoles("worker"),
  getWorkerAvailability
);
router.get(
  "/:workerId/availability",
  authenticateToken,
  authorizeRoles("client"),
  getPublicWorkerAvailability
);
router.post(
  "/profile",
  authenticateToken,
  authorizeRoles("worker"),
  createWorkerProfile
);

router.get(
  "/profile",
  authenticateToken,
  authorizeRoles("worker"),
  getMyWorkerProfile
);

router.put(
  "/profile",
  authenticateToken,
  authorizeRoles("worker"),
  updateWorkerProfile
);
export default router;
