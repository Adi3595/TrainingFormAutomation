# System Map

Files/DB/User stories consolidated in SYSTEM_FLOWS.md

*Updated Oct 2024*
| File | Used In Flow | User Story |
|------|--------------|------------|
| `App.js` | Routing + Auth Guard | All users see dashboard after login |
| `Dashboard.js` | Tab switching | HR/Admin selects "Create Training/Batch/Assign" |
| `CreateTraining.js` | Training creation form | **HR**: Creates program w/ Google Form links |
| `CreateBatch.js` | Batch form (training+manager+dates) | **HR**: Schedules specific training |
| `AssignEmployee.js` | Employee assignment (CSV/search) | **HR**: Adds employees to batch |
| `AdminUpload.js` | CSV upload employees/managers | **Admin**: Bulk data import |
| `TrainingReport.js` | Stats + feedback table | **HR**: Reviews completion |
| `LoginPage.js` | Google OAuth signup | **All**: Authenticates |
| `services/api.js` | All API calls (`/hr/*`, `/admin/*`) | Backend communication |

### Backend Controllers (API Logic)
| File | Endpoints | Flow Step |
|------|-----------|-----------|
| `hrController.js` | `/hr/create-training`, `/create-batch`, `/assign-employee` | Core HR workflow |
| `adminController.js` | `/admin/upload-*` | CSV → DB parsing |
| `employeeController.js` | `/employee/submit-feedback` | Feedback → Email trigger |
| `managerController.js` | `/manager/submit-feedback` | Manager rating |
| `authController.js` | `/api/auth/*` | Google + JWT |
| `syncController.js` | `/sync-responses` | Google Forms → DB sync |

### Backend Jobs & Services
| File | Role | Trigger |
|------|------|---------|
| `jobs/Scheduler.js` | Cron emails every minute | Auto (server.js loads) |
| `services/emailService.js` | Gmail HTML templates | Called by Scheduler |
| `db.js` | PostgreSQL pool | All controllers |

### Database Tables Flow
```
app_users → employees/managers → training_programs → training_batches
  ↓ junction
batch_employees → employee_feedback → manager_feedback
  ↓ scheduled
scheduled_emails ← cron ← Scheduler.js
```

## 👥 Detailed User Stories

### **Admin User**
```
AS Admin, I want to:
1. Upload employee CSV → employees table populated
2. Upload manager CSV → managers table populated  
3. Upload feedback CSV → Direct DB insert (bypass flow)
```

### **HR Manager User**
```
AS HR, I want to:
1. Create training → Store Google Form links
2. Create batch → Link training + manager + dates
3. Assign employees → Bulk via CSV/search
4. View reports → % complete, avg ratings, export
5. Dashboard notifications → Pending batches
```

**Flow**: Dashboard → CreateTraining → CreateBatch → AssignEmployee → TrainingReport

### **Employee User** (External)
```
AS Employee, I want to:
1. Receive email post-batch → Click form link
2. Submit rating/comments → Triggers manager email
```

### **Manager User** (External)
```
AS Manager, I want to:
1. Receive employee feedback notice
2. Submit performance rating (1-5 + comments)
```

## 🔄 Complete File Usage Flow Diagram
```
Frontend UI → api.js → Backend Routes → Controllers → DB
                ↓ Auto
            Scheduler.js → EmailService → Gmail
```

**All 50+ files mapped to training flow!** Updated: `date`
