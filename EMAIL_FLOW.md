# Email Flows

Trigger: Feedback submit
Cron: Scheduler.js every min
### 1. **TRIGGER**: Employee Submits Feedback
```
POST /employee/submit-feedback
→ INSERT employee_feedback (form_completed=true)
→ syncController.js OR employeeController.js detects
→ IF training_programs.requires_manager_feedback = true:
  → Check training_batches.manager_id exists
  → Calculate delay: training_programs.initial_delay_minutes 
  → INSERT scheduled_emails:
    {
      email: manager.email,
      form_link: training_programs.manager_form_link,
      scheduled_time: NOW() + delay,
      employee_id, batch_id, manager_id,
      email_type: 'initial',
      attempts: 0, max_attempts: 2
    }
```

### 2. **CRON SCHEDULER** (`backend/jobs/Scheduler.js`)
**Runs every minute** (`* * * * *`):
```
1. SELECT pending emails:
   scheduled_time <= NOW()
   AND email_sent = false  
   AND attempts < max_attempts
   LIMIT 10
   
2. For each email:
   → Check if manager already submitted (manager_feedback.form_completed)
   → IF submitted → Cancel email
   
3. Send via emailService.sendManagerEmail()
4. UPDATE attempts +1, last_attempt
   
5. IF initial email sent AND manager not done:
   → Schedule REMINDER:
     reminderTime = NOW() + reminder_delay_minutes (3 days default)
     INSERT new scheduled_emails (email_type='reminder')
```

### 3. **EMAIL SENDING** (`backend/services/emailService.js`)
```
transporter.sendManagerEmail(recipient, formLink, employeeName, trainingName)
→ Gmail + App Password (.env EMAIL_USER/PASSWORD)
→ Beautiful HTML template:
  - Employee name
  - Training name
  - Sender (HR who created training)
  - "Initial" vs "Reminder" styling
→ UPDATE scheduled_emails.email_sent = true
```

## File Responsibilities

| File | What It Does |
|------|-------------|
| **jobs/Scheduler.js** | `* * * * *` cron → Finds pending emails → Sends or schedules reminders |
| **services/emailService.js** | Creates Gmail transporter → Beautiful HTML emails |
| **controllers/*Controller.js** | **Triggers** initial scheduled_emails INSERT after employee feedback |
| **db.js** | PostgreSQL connection pool |

## Email Types & Flow Diagram
```
Employee Feedback Submitted
        ↓
[employeeController/syncController]
        ↓ (IF requires_manager_feedback)
INSERT scheduled_emails (initial)
        ↓
1 min later → Scheduler finds it
        ↓
Manager already done? → Skip
        ↓ No
SendManagerEmail() → Gmail
        ↓ Success
Schedule REMINDER (3 days)
        ↓ 3 days → Repeat
```

## DB Tables Involved
```
scheduled_emails: 12 columns tracking everything
- scheduled_time, attempts, max_attempts (2)
- email_type: 'initial', 'reminder' 
- Indexes on scheduled_time, email_sent, batch_id
```

## Edge Cases Handled
- ✅ Max attempts reached → Mark failed  
- ✅ Manager submits between emails → Auto-cancel
- ✅ No form_link → Error logged
- ✅ Gmail fails → Retry up to 2x
- ✅ Cleanup cron: Old failed emails after 7 days

**Loaded by server.js** → Always running!

---
*Email system fully documented. Updated: `date`*
