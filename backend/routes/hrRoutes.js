// hrRoutes.js - Routes for HR functionalities like creating trainings, assigning employees, validating training completion, and generating reports.
const express = require("express");
const router = express.Router();
const {
  createTraining,
  assignEmployeesToTraining,
  getTrainingEmployees,
  validateEmployees,
  getTrainingReport,
  getTrainings,
  getManagers,
  getEmployees,
  getTrainingById,
  updateTrainingStatus,
  scheduleEmployeeMailsForTraining,
  exportTrainingReportExcel,
  exportAllDatabaseReports,
  exportSingleTableReport,
  // NEW: Table data endpoints (JSON)
  getEmployeesTable,
  getManagersTable,
  getTrainingProgramsTable,
  getTrainingEmployeesTable,
  getEmployeeFeedbackTable,
  getManagerFeedbackTable,
  getScheduledEmailsTable,
  getScheduledEmployeeEmailsTable,
  // Upload endpoint
  uploadTrainingWithEmployees
} = require("../controllers/hrController");
const { verifyToken } = require("../middlewares/authMiddleware");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

// Training CRUD
router.post("/create-training", verifyToken, createTraining);
router.get("/trainings", verifyToken, getTrainings);
router.get("/trainings/:training_id", verifyToken, getTrainingById);

router.post("/schedule-employee-mails", verifyToken, scheduleEmployeeMailsForTraining);
router.get("/training-report/:training_id/export", verifyToken, exportTrainingReportExcel);

// Upload Training with Employees
router.post("/upload-training", verifyToken, upload.single("file"), uploadTrainingWithEmployees);

// Employee Assignment (Direct to Training)
router.post("/assign-employees", verifyToken, assignEmployeesToTraining);
router.get("/trainings/:training_id/employees", verifyToken, getTrainingEmployees);
router.put("/trainings/:training_id/employees/:employee_id/status", verifyToken, updateTrainingStatus);

// Validation
router.post("/validate-employees", verifyToken, validateEmployees);

// Reports
router.get("/training-report/:training_id", verifyToken, getTrainingReport);

// Lists
router.get("/managers", verifyToken, getManagers);
router.get("/employees", verifyToken, getEmployees);

// ==============================
// DATABASE TABLE REPORT ROUTES (JSON data for frontend)
// ==============================
router.get("/reports/table/employees", verifyToken, getEmployeesTable);
router.get("/reports/table/managers", verifyToken, getManagersTable);
router.get("/reports/table/training_programs", verifyToken, getTrainingProgramsTable);
router.get("/reports/table/training_employees", verifyToken, getTrainingEmployeesTable);
router.get("/reports/table/employee_feedback", verifyToken, getEmployeeFeedbackTable);
router.get("/reports/table/manager_feedback", verifyToken, getManagerFeedbackTable);
router.get("/reports/table/scheduled_emails", verifyToken, getScheduledEmailsTable);
router.get("/reports/table/scheduled_employee_emails", verifyToken, getScheduledEmployeeEmailsTable);

// ==============================
// EXPORT ROUTES (Excel files)
// ==============================
router.get("/reports/all-database/export", verifyToken, exportAllDatabaseReports);
router.get("/reports/table/:table/export", verifyToken, exportSingleTableReport);

module.exports = router;