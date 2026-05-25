// managerRoutes.js - Routes for manager functionalities like submitting feedback for employees and viewing training information.
const express = require("express");
const router = express.Router();
const {verifyToken} = require("../middlewares/authMiddleware");

const {
  submitManagerFeedback
} = require("../controllers/managerController");

// Protected route (requires logged-in user)
router.post("/submit-feedback", verifyToken, submitManagerFeedback);

module.exports = router;