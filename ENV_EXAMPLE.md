# Environment Variables Example (.env)

Create a file named `.env` in the `backend/` directory.

## Backend
- `PORT`=5000
- `DB_URL`=postgresql://USER:PASSWORD@HOST:5432/DATABASE
- `JWT_SECRET`=your-jwt-secret

## Google OAuth (used by auth)
- `GOOGLE_CLIENT_ID`=your-google-client-id
- `GOOGLE_CLIENT_SECRET`=your-google-client-secret

## Email (Gmail/Nodemailer)
- `EMAIL_USER`=youremail@gmail.com
- `EMAIL_PASS`=your-app-password

## Notes
- Do NOT commit `.env` or real credentials to GitHub.

