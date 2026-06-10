# HR Training Management System (HTMS)

![version](https://img.shields.io/badge/version-1.0.0-blue) 
![license](https://img.shields.io/badge/license-MIT-green)
![build](https://img.shields.io/badge/build-passing-brightgreen)

---

## 1) Description 🧩

HR Training Management System (HTMS) is a web application that helps organizations manage training programs end-to-end—creating training configurations, assigning employees, collecting employee/manager feedback, scheduling email reminders, and generating performance reports.

**What problem it solves:**
- Streamlines training administration and feedback collection.
- Automates reminders to improve completion rates.
- Provides analytics and exports for HR stakeholders.

**Target audience:** HR managers, admins, and team managers.

**Key value proposition:**
Centralized training workflow with role-aware dashboards, automated scheduling, and report exports (Excel).

---

## 2) Features ✅

- 📋 Create and configure training programs (employee/manager feedback requirements)
- 👥 Upload bulk employee + manager data (CSV/XLSX workflows)
- 🗂️ Assign employees to trainings and track progress
- ✉️ Schedule feedback emails and reminders via cron jobs
- 🔐 Authentication with JWT + OAuth (Google & Microsoft)
- 📊 Training reports with analytics and rating distributions
- 📤 Excel export for per-training reports and database table exports
- 🛡️ Domain restriction support (via `ALLOWED_DOMAINS`)

---

## 3) Tech Stack 🧰

- **Frontend:** React.js (react-router-dom, chart.js)
- **Backend:** Node.js + Express (REST API)
- **Database:** PostgreSQL
- **Authentication:** JWT Bearer + OAuth (Google/Microsoft)
- **Deployment platform:** Render.com (recommended)
- **Key libraries/tools:** axios, multer, bcryptjs, pg, nodemailer, node-cron, passport

---

## 4) Architecture Overview 🏗️

### High-level system architecture
- **Client (Frontend):** React UI (login, dashboard, uploads, report views). Stores JWT in `localStorage`.
- **Server (Backend):** Express REST API + OAuth callbacks + email scheduling cron jobs.
- **Data (Database):** PostgreSQL is the single source of truth for users, training configuration, assignments, feedback, and email scheduling state.
- **Email:** Nodemailer (SMTP) sends scheduled notifications.

### Client-server interaction flow
1. UI requests protected data via Axios to backend endpoints.
2. Axios includes `Authorization: Bearer <JWT>`.
3. Backend verifies JWT (auth middleware) and reads/writes PostgreSQL.
4. Scheduler jobs periodically send due emails based on scheduled tables.

---

## 5) Prerequisites 📋

- Node.js (LTS recommended)
- npm
- PostgreSQL (local or managed)
- OAuth credentials for **Google** and **Microsoft**
- SMTP email credentials (Gmail app password or alternative SMTP)

**Accounts setups needed:**
- Google OAuth client
- Microsoft OAuth client
- Email/SMTP account

---

## 6) Environment Variables 🔐

Create backend env file from `backend/ENV_EXAMPLE.md`.

### Backend `.env` reference

| Variable | Description | Example | Required |
|---|---|---|---|
| `PORT` | Backend listening port | `5000` | Yes |
| `DB_URL` | PostgreSQL connection string | `postgresql://USER:PASSWORD@HOST:5432/DATABASE` | Yes |
| `JWT_SECRET` | JWT signing secret | `change-me` | Yes |
| `FRONTEND_URL` | Frontend base URL used for redirects | `https://trainingformautomation.onrender.com` | Yes |
| `ALLOWED_DOMAINS` | Comma-separated allowed email domains | `company.com,example.org` | Yes (recommended) |
| `GOOGLE_CLIENT_ID` | Google OAuth client id | `...` | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `...` | Yes |
| `GOOGLE_REDIRECT_URI` | Google OAuth redirect URI | `https://.../api/auth/google/callback` | Yes |
| `MICROSOFT_CLIENT_ID` | Microsoft OAuth client id | `...` | Yes |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth client secret | `...` | Yes |
| `MICROSOFT_REDIRECT_URI` | Microsoft OAuth redirect URI | `https://.../api/auth/microsoft/callback` | Yes |
| `EMAIL_USER` | SMTP username | `youremail@gmail.com` | Yes |
| `EMAIL_APP_PASSWORD` | SMTP password/app password | `xxxx-xxxx-xxxx` | Yes |

> Do **not** commit `.env`.

---

## 7) Installation & Setup ⚙️

### 1. Clone
```bash
git clone [your-repo-url]
cd TrainingFormAutomation
```

### 2. Install dependencies
Backend:
```bash
cd backend
npm install
```

Frontend:
```bash
cd ../frontend
npm install
```

### 3. Configure environment variables
1. Create `backend/.env`.
2. Copy values from `ENV_EXAMPLE.md`.

### 4. Database setup
The schema is defined in:
- `database/postgreSQL.sql`

Create your database in PostgreSQL and run the SQL file.

### 5. Run locally
Backend (dev):
```bash
cd backend
npm run dev
```

Frontend (optional direct dev):
```bash
cd frontend
npm start
```

> Note: backend is configured to serve the React build from `backend/build`.

---

## 8) Database Setup 🗄️

- Create DB in PostgreSQL.
- Run:
  - `database/postgreSQL.sql`

Seed data:
- Not included as a formal seeding step in this repo (schema-only).

---

## 9) Running the Application ▶️

### Development mode
- Start backend:
```bash
cd backend
npm run dev
```

### Production build (frontend)
1) Build frontend:
```bash
cd frontend
npm run build
```
2) Ensure the backend can serve the built output (committed/generated as appropriate for your deployment).

### Access URLs (defaults)
- Backend health check (example):
  - `GET http://localhost:5000/api`

---

## 10) API Documentation Reference 🔗

Full REST API docs + endpoint descriptions:
- `docs/06-api-documentation.md`

Authentication:
- JWT Bearer: `Authorization: Bearer <JWT>`
- OAuth (web flow) supported via `/api/auth/google*` and `/api/auth/microsoft*`

---

## 11) Deployment 🚀

Recommended hosting: **Render.com**.

High-level steps:
1. Create Render Postgres and copy `DB_URL`.
2. Create a Render Web Service for backend (`backend/server.js`).
3. Set environment variables in Render (`DB_URL`, `JWT_SECRET`, `FRONTEND_URL`, OAuth, SMTP).
4. Deploy with frontend build artifacts available for backend static serving.

See full checklist:
- `docs/08-deployment-document.md`

---

## 12) Project Structure 📁

```text
TrainingFormAutomation/
  backend/
    server.js
    controllers/
    routes/
    middlewares/
    jobs/
    services/
  frontend/
    src/
  database/
    postgreSQL.sql
  docs/
    01-project-overview.md
    ...
    16-er-diagram-mermaid.md
  ENV_EXAMPLE.md
  package.json
```

Key folders:
- `backend/` — API, auth, email schedulers
- `frontend/` — React dashboard UI
- `database/` — PostgreSQL schema
- `docs/` — documentation pack

---

## 13) Usage Examples 💡

### How to upload training data
- Go to dashboard upload UI and upload the corresponding CSV (employees/managers/feedback).
- Backend endpoints accept `multipart/form-data` with form field `file`.

### How to view reports
- Navigate to **Dashboard → Reports**.
- Select training and generate report.
- Export Excel report.

**Screenshot placeholders:**
- [screenshot-placeholder-login]
- [screenshot-placeholder-dashboard]
- [screenshot-placeholder-reports]

---

## 14) Testing 🧪

Current repo does not include a dedicated automated test suite.

Test strategy & manual checklist:
- `docs/07-testing-report.md`

---

## 15) Troubleshooting 🛠️

| Issue | Likely cause | Fix |
|---|---|---|
| OAuth redirect fails | Wrong OAuth redirect URI | Update Google/Microsoft redirect URIs to match your deployment |
| Emails/reminders not sent | Backend instance not running or SMTP blocked | Ensure Render service stays running; verify SMTP credentials |
| DB connection errors | Incorrect `DB_URL` | Confirm Postgres URL and network access |
| Uploads fail | File format mismatch / invalid MIME | Use the provided CSV templates; validate columns |

---

## 16) Contributing 🤝

If this is open source:
1. Fork the repo
2. Create a feature branch: `git checkout -b feature/<name>`
3. Commit changes
4. Open a Pull Request

---

## 18) Contact & Support 📬

- Author: [your-name]
- Email: [your-email]
- GitHub: [your-repo-url]
- Demo: [your-demo-url]

---

## 19) Acknowledgments 🙏

Thanks to the open-source community for the libraries used in this project (React, Express, PostgreSQL, Nodemailer, and OAuth libraries).

