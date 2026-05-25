const cron = require("node-cron");
const pool = require("../db");
const { sendEmployeeTrainingEmail } = require("../services/emailService");

cron.schedule("* * * * *", async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(`
      SELECT
        se.id,
        se.employee_id,
        se.training_id,
        se.email,
        se.form_link,
        se.attempts,
        se.max_attempts,
        e.name AS employee_name,
        tp.training_name
      FROM scheduled_employee_emails se
      JOIN employees e
        ON se.employee_id = e.employee_id
      JOIN training_programs tp
        ON se.training_id = tp.training_id
      WHERE se.email_sent = false
      AND se.email_cancelled = false
      AND se.status = 'pending'
      AND se.scheduled_time <= NOW()
      AND se.attempts < se.max_attempts
      LIMIT 20
      FOR UPDATE SKIP LOCKED
    `);

    for (const row of result.rows) {
      try {
        await sendEmployeeTrainingEmail(
          row.email,
          row.employee_name,
          row.training_name,
          row.form_link
        );

        await client.query(`
          UPDATE scheduled_employee_emails
          SET email_sent = true,
              status = 'sent',
              sent_at = NOW(),
              last_attempt = NOW(),
              attempts = attempts + 1,
              error_message = NULL
          WHERE id = $1
        `, [row.id]);

        console.log("✅ Employee email sent:", row.email);

      } catch (mailError) {
        await client.query(`
          UPDATE scheduled_employee_emails
          SET attempts = attempts + 1,
              last_attempt = NOW(),
              error_message = $2,
              status = CASE
                WHEN attempts + 1 >= max_attempts THEN 'failed'
                ELSE 'pending'
              END
          WHERE id = $1
        `, [row.id, mailError.message]);

        console.error("❌ Employee email failed:", row.email, mailError.message);
      }
    }

    await client.query("COMMIT");

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Employee Scheduler Error:", error.message);
  } finally {
    client.release();
  }
});