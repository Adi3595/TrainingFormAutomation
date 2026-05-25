// adminRoutes.js - Routes for admin functionalities like uploading CSV files for employees, managers, feedback, and training with employees.
const express = require("express");
const router = express.Router();
const multer = require("multer");
const adminController = require("../controllers/adminController");
const {verifyToken} = require("../middlewares/authMiddleware");

// 📁 File upload config
const upload = multer({ dest: "uploads/" });

// ==============================
// Upload APIs
// ==============================
router.post("/upload-employees", verifyToken, upload.single("file"), adminController.uploadEmployees);
router.post("/upload-managers", verifyToken, upload.single("file"), adminController.uploadManagers);
router.post("/upload-employee-feedback", verifyToken, upload.single("file"), adminController.uploadEmployeeFeedback);
router.post("/upload-manager-feedback", verifyToken, upload.single("file"), adminController.uploadManagerFeedback);

// Upload Training with Employees
router.post("/upload-training-with-employees", verifyToken, upload.single("file"), adminController.uploadTrainingWithEmployees);

module.exports = router;