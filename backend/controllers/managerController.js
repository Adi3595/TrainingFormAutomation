// managerController.js
const pool = require("../db");

exports.submitManagerFeedback = async (req, res) => {
  try {
    const {
      manager_id,
      employee_id,
      training_id,
      performance_rating,
      manager_comments
    } = req.body;

    const query = `
      INSERT INTO manager_feedback
      (manager_id, employee_id, training_id, performance_rating, manager_comments)
      VALUES ($1,$2,$3,$4,$5)
    `;

    await pool.query(query, [
      manager_id,
      employee_id,
      training_id,
      performance_rating,
      manager_comments
    ]);

    res.json({ message: "Manager feedback submitted successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};