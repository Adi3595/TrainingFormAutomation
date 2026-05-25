// employeeRoutes.js - Routes for employee functionalities like submitting feedback and viewing manager information.
const express = require("express");
const router = express.Router();
const {verifyToken} = require("../middlewares/authMiddleware");

const {
  submitFeedback,
  getManagerForEmployee,

} = require("../controllers/employeeController");

router.post("/submit-feedback", verifyToken, submitFeedback);

// RESTful route
router.get("/employees/:employee_id/manager", verifyToken, getManagerForEmployee);

module.exports = router;