// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

// 🔥 Import scheduler (email sender)
require("./jobs/Scheduler");
require("./jobs/employeeMailScheduler");

// 🔥 Import cron for auto sync
const cron = require("node-cron");
const employeeRoutes = require("./routes/employeeRoutes");
const managerRoutes = require("./routes/managerRoutes");
const hrRoutes = require("./routes/hrRoutes");
const trainingRoutes = require("./routes/trainingRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const updateRoutes = require("./routes/updateRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 ROUTES
app.use("/employee", employeeRoutes);
app.use("/manager", managerRoutes);
app.use("/hr", hrRoutes);
app.use("/training", trainingRoutes);
app.use("/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/update", updateRoutes); // for employee/manager/training updates

// 🔥 ROOT
app.get("/", (req, res) => {
  res.send("Training Management API Running 🚀");
});

// 🔥 SERVER START
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});