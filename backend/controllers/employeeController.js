// employeeController.js
const pool = require("../db");

exports.submitFeedback = async (req, res) => {
  try {
    const { employee_id, training_id, rating, comments } = req.body;

    const query = `
      INSERT INTO employee_feedback
      (employee_id, training_id, rating, comments)
      VALUES ($1,$2,$3,$4)
    `;

    await pool.query(query, [employee_id, training_id, rating, comments]);

    res.json({
      message: "Employee feedback submitted successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Server error"
    });
  }
};

// Get manager for an employee (used when employee submits feedback to notify manager)
exports.getManagerForEmployee = async (req, res) => {
  try {
    const { employee_id } = req.params;

    const query = `
      SELECT m.manager_id, m.name, m.email, m.department
      FROM employees e
      JOIN managers m ON e.manager_id = m.manager_id
      WHERE e.employee_id = $1
    `;

    const result = await pool.query(query, [employee_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Manager not found for this employee"
      });
    }

    res.json({
      manager_id: result.rows[0].manager_id,
      manager_name: result.rows[0].name,
      manager_email: result.rows[0].email,
      department: result.rows[0].department
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Server error"
    });
  }
};