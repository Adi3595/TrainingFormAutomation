// server.js

const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// 🔥 Import scheduler (email sender)
require("./jobs/scheduler");
require("./jobs/employeeMailScheduler");

// 🔥 Import cron
const cron = require("node-cron");

// 🔥 Routes
const employeeRoutes = require("./routes/employeeRoutes");
const managerRoutes = require("./routes/managerRoutes");
const hrRoutes = require("./routes/hrRoutes");
const trainingRoutes = require("./routes/trainingRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const updateRoutes = require("./routes/updateRoutes");

const app = express();

// ✅ Middleware
app.use(express.json());

app.use(
  cors({
    origin: "*", // change later for production security
    credentials: true,
  })
);

// ✅ API Routes
app.use("/employee", employeeRoutes);
app.use("/manager", managerRoutes);
app.use("/hr", hrRoutes);
app.use("/training", trainingRoutes);
app.use("/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/update", updateRoutes);

// ✅ API Health Check
app.get("/api", (req, res) => {
  res.send("Training Management API Running 🚀");
});

// =====================================================
// ✅ FRONTEND DEPLOYMENT (React Build)
// =====================================================

// 🔥 Serve React build folder
app.use(express.static(path.join(__dirname, "build")));

// 🔥 React Router Fix
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// =====================================================
// ✅ SERVER START
// =====================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
