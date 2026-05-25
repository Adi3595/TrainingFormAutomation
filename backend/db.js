// db.js - Store all timestamps in IST
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  timezone: "Asia/Kolkata"  // Correct IST timezone name
});

// Set session timezone to IST for all connections
pool.on('connect', (client) => {
  client.query("SET timezone = 'Asia/Kolkata'")
    .catch(err => console.error('Error setting timezone:', err));
});

module.exports = pool;