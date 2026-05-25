// Scheduler.js
const cron = require("node-cron");
const pool = require("../db");
const { sendManagerEmail } = require("../services/emailService");

cron.schedule("* * * * *", async () => {
  const now = new Date();
  const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

  console.log("=".repeat(80));
  console.log("⏳ Checking scheduled emails...");
  console.log("⏳ UTC Time:", now.toISOString());
  console.log("⏳ IST Time:", istTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));
  console.log("⏳ Timestamp:", now.getTime());

  const client = await pool.connect();

  try {
    await client.query("SET timezone = 'Asia/Kolkata'");
    await client.query("BEGIN");

    // STEP 1: Proactively cancel any pending emails where manager feedback already exists
    const cancelledAlreadyDone = await client.query(`
      UPDATE scheduled_emails se
      SET
        attempts = COALESCE(attempts, 0) + 1,
        email_sent = true,
        sent_at = NOW(),
        last_attempt = NOW(),
        email_cancelled = true,
        cancelled_at = NOW(),
        cancellation_reason = 'Feedback already submitted (proactive check)',
        status = 'cancelled',
        error_message = 'Cancelled: manager feedback already submitted'
      WHERE se.email_sent = false
        AND (se.email_cancelled IS NOT true OR se.email_cancelled IS NULL)
        AND se.attempts < se.max_attempts
        AND EXISTS (
          SELECT 1
          FROM manager_feedback mf
          WHERE mf.employee_id = se.employee_id
            AND mf.training_id = se.training_id
            AND mf.manager_id = se.manager_id
            AND mf.form_completed = true
        )
      RETURNING se.id, se.email, se.email_type, se.employee_id, se.manager_id, se.training_id
    `);

    if (cancelledAlreadyDone.rows.length > 0) {
      console.log(`🛑 Proactively cancelled ${cancelledAlreadyDone.rows.length} scheduled email(s) because feedback was already submitted.`);
      cancelledAlreadyDone.rows.forEach((row) => {
        console.log(
          `   Cancelled -> ID: ${row.id}, Type: ${row.email_type}, Email: ${row.email}, Employee: ${row.employee_id}, Manager: ${row.manager_id}, Training: ${row.training_id}`
        );
      });
    }

    // DEBUG: Check pending emails after cancellation
    const allPendingQuery = await client.query(`
      SELECT
        se.id,
        se.email,
        se.employee_id,
        se.manager_id,
        se.training_id,
        se.scheduled_time,
        se.email_type,
        se.attempts,
        se.max_attempts,
        se.email_sent,
        se.email_cancelled,
        se.status,
        se.sent_at,
        e.name AS employee_name,
        m.name AS manager_name,
        m.email AS manager_email,
        tp.training_name,
        scheduled_time <= NOW() AS is_due,
        EXTRACT(EPOCH FROM (scheduled_time - NOW())) / 60 AS minutes_until_due
      FROM scheduled_emails se
      LEFT JOIN employees e ON se.employee_id = e.employee_id
      LEFT JOIN managers m ON se.manager_id = m.manager_id
      LEFT JOIN training_programs tp ON se.training_id = tp.training_id
      WHERE se.email_sent = false
        AND (se.email_cancelled IS NOT true OR se.email_cancelled IS NULL)
        AND se.attempts < se.max_attempts
      ORDER BY se.scheduled_time ASC
      LIMIT 5
    `);

    console.log(`📋 Total pending emails after cancellation check: ${allPendingQuery.rows.length}`);
    if (allPendingQuery.rows.length > 0) {
      console.log("📋 First 5 pending emails (IST):");
      allPendingQuery.rows.forEach((row) => {
        console.log(`   ID: ${row.id}, Email: ${row.email}, Type: ${row.email_type}, Status: ${row.status}`);
        console.log(`      Employee: ${row.employee_name || row.employee_id} (ID: ${row.employee_id})`);
        console.log(`      Manager: ${row.manager_name || 'Unknown'} (${row.manager_email || row.manager_id})`);
        console.log(`      Training: ${row.training_name || 'N/A'}`);
        console.log(`      Training ID: ${row.training_id}`);
        console.log(`      Scheduled (IST): ${row.scheduled_time}`);
        console.log(`      Due: ${row.is_due ? "YES" : "NO"}`);
        console.log(`      Minutes until due: ${row.minutes_until_due}`);
      });
    }

    // STEP 2: Fetch due emails only after proactive cancellation
    const result = await client.query(`
      SELECT
        se.id,
        se.email,
        se.form_link,
        se.employee_id,
        se.training_id,
        se.manager_id,
        se.email_type,
        se.attempts,
        se.max_attempts,
        se.reminder_delay_minutes,
        se.scheduled_time,
        e.name AS employee_name,
        e.email AS employee_email,
        m.name AS manager_name,
        m.email AS manager_email,
        tp.training_name,
        tp.manager_form_link,
        u.user_id AS sender_user_id,
        u.email AS sender_email,
        u.name AS sender_name,
        EXISTS (
          SELECT 1
          FROM manager_feedback mf
          WHERE mf.employee_id = se.employee_id
            AND mf.training_id = se.training_id
            AND mf.manager_id = se.manager_id
            AND mf.form_completed = true
        ) AS manager_done
      FROM scheduled_emails se
      JOIN employees e ON se.employee_id = e.employee_id
      LEFT JOIN managers m ON se.manager_id = m.manager_id
      JOIN training_programs tp ON se.training_id = tp.training_id
      LEFT JOIN app_users u ON tp.created_by = u.user_id
      WHERE se.scheduled_time <= NOW()
        AND se.attempts < se.max_attempts
        AND se.email_sent = false
        AND (se.email_cancelled IS NOT true OR se.email_cancelled IS NULL)
      ORDER BY se.scheduled_time ASC
      LIMIT 10
    `);

    console.log(`📧 Found ${result.rows.length} emails that are due NOW (IST)`);

    if (result.rows.length === 0 && allPendingQuery.rows.length > 0) {
      console.log("⚠️ WARNING: There are pending emails but none are due yet!");
      console.log("   This could be due to timezone mismatch or future scheduled times.");
    }

    for (const row of result.rows) {
      console.log(`\n📨 Processing email ID: ${row.id}, Type: ${row.email_type}, To: ${row.email}`);
      console.log(`   Scheduled time (IST): ${row.scheduled_time}`);
      console.log(`   Current time (IST): ${istTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
      console.log(`   Employee: ${row.employee_name} (${row.employee_email})`);
      console.log(`   Manager: ${row.manager_name || 'Unknown'} (${row.manager_email || row.manager_id})`);
      console.log(`   Training: ${row.training_name}`);
      console.log(`   Training ID: ${row.training_id}`);

      const scheduledDate = new Date(row.scheduled_time);
      const timeDiff = (now - scheduledDate) / 1000;
      console.log(`   Time difference: ${timeDiff} seconds overdue`);

      // Safety check again for exact combo
      if (row.manager_done) {
        console.log(`✅ Manager already submitted. Cancelling ${row.email_type} email to ${row.email}`);

        await client.query(`
          UPDATE scheduled_emails
          SET
            attempts = attempts + 1,
            email_sent = true,
            sent_at = NOW(),
            last_attempt = NOW(),
            email_cancelled = true,
            cancelled_at = NOW(),
            cancellation_reason = 'Feedback already submitted (pre-send check)',
            status = 'cancelled',
            error_message = 'Cancelled: manager feedback already submitted'
          WHERE id = $1
        `, [row.id]);

        continue;
      }

      try {
        const formLink = row.form_link || row.manager_form_link;

        if (!formLink) {
          throw new Error("No form link available for this email");
        }

        console.log(`📧 Sending ${row.email_type} email to: ${row.email} for training: ${row.training_name}`);
        console.log(`   Form Link: ${formLink}`);
        console.log(`   Manager Name: ${row.manager_name || 'N/A'}`);
        console.log(`   Employee Name: ${row.employee_name}`);

        const senderUser = row.sender_user_id
          ? {
              user_id: row.sender_user_id,
              email: row.sender_email,
              name: row.sender_name,
            }
          : null;

        await sendManagerEmail(
          row.email,
          formLink,
          row.employee_name,
          row.training_name,
          row.email_type || "initial",
          senderUser
        );

        await client.query(`
          UPDATE scheduled_emails
          SET
            attempts = attempts + 1,
            last_attempt = NOW(),
            error_message = NULL,
            status = 'sent'
          WHERE id = $1
        `, [row.id]);

        console.log(`✅ ${row.email_type} email sent successfully to: ${row.email}`);

        if (row.email_type === "initial" && row.attempts + 1 < row.max_attempts) {
          const checkStillNotSubmitted = await client.query(`
            SELECT EXISTS (
              SELECT 1
              FROM manager_feedback mf
              WHERE mf.employee_id = $1
                AND mf.training_id = $2
                AND mf.manager_id = $3
                AND mf.form_completed = true
            ) AS manager_done
          `, [row.employee_id, row.training_id, row.manager_id]);

          if (!checkStillNotSubmitted.rows[0].manager_done) {
            const reminderDelayMinutes = row.reminder_delay_minutes || (3 * 24 * 60);

            const reminderTime = new Date();
            reminderTime.setMinutes(reminderTime.getMinutes() + reminderDelayMinutes);

            // Fetch manager details again to ensure we have the correct email
            const managerRes = await client.query(
              `SELECT manager_id, name, email FROM managers WHERE manager_id = $1`,
              [row.manager_id]
            );

            if (managerRes.rows.length === 0) {
              console.error(`❌ Manager not found for reminder scheduling: ${row.manager_id}`);
              throw new Error(`Manager not found for reminder scheduling: ${row.manager_id}`);
            }

            const reminderManagerId = managerRes.rows[0].manager_id;
            const reminderManagerEmail = managerRes.rows[0].email;
            const reminderManagerName = managerRes.rows[0].name;

            console.log(`📧 Scheduling reminder email for manager: ${reminderManagerName} (${reminderManagerEmail})`);

            await client.query(`
              INSERT INTO scheduled_emails
              (email, form_link, scheduled_time, employee_id, training_id, manager_id,
              email_type, attempts, max_attempts, email_sent, reminder_delay_minutes, status)
              VALUES (
                $1, $2, $3, $4, $5, $6,
                'reminder', 0, $7, false, $8, 'pending'
              )
            `, [
              reminderManagerEmail,
              formLink,
              reminderTime,
              row.employee_id,
              row.training_id,
              reminderManagerId,
              row.max_attempts - 1,
              row.reminder_delay_minutes,
            ]);

            const reminderIST = new Date(
              reminderTime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
            );

            console.log(
              `📅 Reminder email scheduled for ${reminderIST.toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })} (IST) to: ${reminderManagerEmail}`
            );
            console.log(
              `   Reminder delay: ${reminderDelayMinutes} minutes (${formatMinutes(reminderDelayMinutes)})`
            );

            await client.query(`
              UPDATE scheduled_emails
              SET
                email_sent = true,
                sent_at = NOW(),
                error_message = 'Initial email sent successfully',
                status = 'sent'
              WHERE id = $1
            `, [row.id]);
          } else {
            console.log(
              `⚠️ Manager submitted feedback between initial email send and reminder scheduling. Skipping reminder for ${row.email}`
            );

            await client.query(`
              UPDATE scheduled_emails
              SET
                email_sent = true,
                sent_at = NOW(),
                email_cancelled = true,
                cancelled_at = NOW(),
                cancellation_reason = 'Feedback submitted between initial and reminder',
                status = 'cancelled',
                error_message = 'Initial email sent; reminder skipped because feedback already submitted'
              WHERE id = $1
            `, [row.id]);
          }
        } else if (row.email_type === "reminder") {
          await client.query(`
            UPDATE scheduled_emails
            SET
              email_sent = true,
              sent_at = NOW(),
              error_message = 'Reminder email sent successfully',
              status = 'sent'
            WHERE id = $1
          `, [row.id]);
        } else {
          await client.query(`
            UPDATE scheduled_emails
            SET
              email_sent = true,
              sent_at = NOW(),
              error_message = 'Email processed successfully',
              status = 'sent'
            WHERE id = $1
          `, [row.id]);
        }
      } catch (err) {
        console.error(`❌ Failed to send ${row.email_type} email to ${row.email}:`, err.message);
        console.error(err.stack);

        await client.query(`
          UPDATE scheduled_emails
          SET
            attempts = attempts + 1,
            last_attempt = NOW(),
            error_message = $2,
            status = CASE WHEN attempts + 1 >= max_attempts THEN 'failed' ELSE 'pending' END
          WHERE id = $1
        `, [row.id, err.message.substring(0, 500)]);

        if (row.attempts + 1 >= row.max_attempts) {
          console.log(`❌ Max attempts reached for email ID: ${row.id}`);
          await client.query(`
            UPDATE scheduled_emails
            SET
              email_sent = true,
              sent_at = NOW(),
              error_message = COALESCE(error_message, 'Max attempts reached'),
              status = 'failed'
            WHERE id = $1
          `, [row.id]);
        }
      }
    }

    await client.query("COMMIT");
    console.log("✅ Scheduled emails check completed (IST)");
    console.log("=".repeat(80) + "\n");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Scheduler error:", err.message);
    console.error(err.stack);
  } finally {
    client.release();
  }
});

// Helper function to format minutes into readable format
function formatMinutes(minutes) {
  if (minutes < 60) {
    return `${minutes} minutes`;
  } else if (minutes < 1440) {
    const hours = minutes / 60;
    return `${hours} hours`;
  } else {
    const days = minutes / 1440;
    return `${days} days`;
  }
}

// Clean up old failed emails every hour
cron.schedule("0 * * * *", async () => {
  const now = new Date();
  console.log("🧹 Cleaning up old failed emails...");
  console.log("🧹 UTC Time:", now.toISOString());
  console.log(
    "🧹 IST Time:",
    new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
      .toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
  );

  const client = await pool.connect();

  try {
    await client.query("SET timezone = 'Asia/Kolkata'");

    const result = await client.query(`
      UPDATE scheduled_emails
      SET
        email_sent = true,
        sent_at = NOW(),
        status = 'cleaned',
        error_message = COALESCE(error_message, 'Auto-cleaned after 7 days')
      WHERE attempts >= max_attempts
        AND email_sent = false
        AND (email_cancelled IS NOT true OR email_cancelled IS NULL)
        AND last_attempt < NOW() - INTERVAL '7 days'
      RETURNING id
    `);

    if (result.rows.length > 0) {
      console.log(`🧹 Cleaned up ${result.rows.length} old failed emails`);
    }
  } catch (err) {
    console.error("❌ Cleanup error:", err.message);
  } finally {
    client.release();
  }
});

console.log("=".repeat(80));
console.log("⏰ Email scheduler started - Running every minute");
console.log("🌏 Timezone: Asia/Kolkata (IST)");
console.log("=".repeat(80));