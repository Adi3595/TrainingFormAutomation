// updateRoutes.js - Complete routes
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const {
  getEmployeeById,
  updateEmployee,
  getManagerById,
  updateManager,
  getTrainingProgramById,
  updateTrainingProgram,
  getAllManagers,
  getAllEmployees,
  getAllTrainingPrograms
} = require("../controllers/updateController");

// ==============================
// EMPLOYEE ROUTES
// ==============================
router.get("/employees", verifyToken, getAllEmployees);
router.get("/employees/:id", verifyToken, getEmployeeById);
router.put("/employees/:id", verifyToken, updateEmployee);

// ==============================
// MANAGER ROUTES
// ==============================
router.get("/managers", verifyToken, getAllManagers);
router.get("/managers/:id", verifyToken, getManagerById);
router.put("/managers/:id", verifyToken, updateManager);

// ==============================
// TRAINING PROGRAM ROUTES
// ==============================
router.get("/training-programs", verifyToken, getAllTrainingPrograms);
router.get("/training-programs/:id", verifyToken, getTrainingProgramById);
router.put("/training-programs/:id", verifyToken, updateTrainingProgram);

module.exports = router;