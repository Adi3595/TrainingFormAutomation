// trainingRoutes.js - Routes for training-related functionalities like receiving employee responses after training completion.
const express = require("express");
const router = express.Router();
const {verifyToken} = require("../middlewares/authMiddleware");

const controller = require("../controllers/trainingController");

// Protected endpoint (requires logged-in user)
router.post("/employee-response", verifyToken, controller.employeeResponseReceived);

module.exports = router;