// authRoutes.js - Routes for authentication functionalities like signup, login, logout, and Google OAuth.
const express = require("express");
const router = express.Router();
const {
  signup,
  login,
  logout,
  googleConnect,
  googleCallback,
  getMe,
  microsoftConnect,
  microsoftCallback
} = require("../controllers/authController");
const { verifyToken } = require("../middlewares/authMiddleware");

router.post("/signup", signup);
router.post("/login", login);
router.get("/google", googleConnect);
router.get("/google/callback", googleCallback);
router.get("/me", verifyToken, getMe);
router.post("/logout", verifyToken, logout);
router.get("/microsoft", microsoftConnect);
router.get("/microsoft/callback", microsoftCallback);

module.exports = router;