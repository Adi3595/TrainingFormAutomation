// authController.js - With Domain Restriction & Redirect for Email/Password
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { google } = require("googleapis");
const pool = require("../db");
const axios = require("axios");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// ==============================
// HELPER FUNCTION: Check if email domain is allowed
// ==============================
const isAllowedDomain = (email) => {
  if (!process.env.ALLOWED_DOMAINS) {
    console.log("⚠️ No ALLOWED_DOMAINS configured. Allowing all domains.");
    return true;
  }
  
  const allowedDomains = process.env.ALLOWED_DOMAINS.split(',').map(d => d.trim().toLowerCase());
  const emailDomain = email.split('@')[1]?.toLowerCase();
  
  if (!emailDomain) return false;
  
  const isAllowed = allowedDomains.includes(emailDomain);
  
  if (!isAllowed) {
    console.log(`❌ Domain not allowed: ${emailDomain}. Allowed: ${allowedDomains.join(', ')}`);
  }
  
  return isAllowed;
};

// ==============================
// HELPER FUNCTION: Get domain restriction message
// ==============================
const getDomainRestrictionMessage = () => {
  if (!process.env.ALLOWED_DOMAINS) {
    return null;
  }
  const domains = process.env.ALLOWED_DOMAINS.split(',').map(d => d.trim());
  if (domains.length === 1) {
    return `Only @${domains[0]} email addresses are allowed to access this system.`;
  }
  return `Only emails from ${domains.map(d => `@${d}`).join(', ')} are allowed to access this system.`;
};

// ==============================
// HELPER FUNCTION: Redirect to error page
// ==============================
const redirectToError = (res, errorType, message) => {
  const encodedMessage = encodeURIComponent(message);
  return res.redirect(`${process.env.FRONTEND_URL}/auth-error?error=${errorType}&message=${encodedMessage}`);
};

// ==============================
// SIGN UP (with domain restriction - redirect for web, JSON for API)
// ==============================
exports.signup = async (req, res) => {
  try {
    const { name, email, company, password } = req.body;

    if (!name || !email || !company || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCompany = company.trim();

    // Check domain restriction - REDIRECT for web
    if (!isAllowedDomain(cleanEmail)) {
      const restrictionMessage = getDomainRestrictionMessage();
      return res.redirect(`${process.env.FRONTEND_URL}/auth-error?error=domain_not_allowed&message=${encodeURIComponent(restrictionMessage || "Your email domain is not authorized to access this system.")}`);
    }

    if (password.length < 8) {
      // For password length error, we need to handle differently
      // Since it's a form submission, we should redirect with error
      return res.redirect(`${process.env.FRONTEND_URL}/auth-error?error=signup_failed&message=${encodeURIComponent("Password must be at least 8 characters")}`);
    }

    const existing = await pool.query(
      `SELECT user_id FROM app_users WHERE email = $1`,
      [cleanEmail]
    );

    if (existing.rows.length > 0) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth-error?error=signup_failed&message=${encodeURIComponent("User already exists")}`);
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO app_users (name, email, company, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, name, email, company, role`,
      [cleanName, cleanEmail, cleanCompany, password_hash]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.redirect(`${process.env.FRONTEND_URL}/auth-success?token=${token}`);
    
  } catch (error) {
    console.error("Signup error:", error);
    return res.redirect(`${process.env.FRONTEND_URL}/auth-error?error=signup_failed&message=${encodeURIComponent("Server error")}`);
  }
};

// ==============================
// LOGIN (with domain restriction - REDIRECT for web)
// ==============================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check domain restriction - NOW REDIRECTS instead of returning JSON
    if (!isAllowedDomain(cleanEmail)) {
      const restrictionMessage = getDomainRestrictionMessage();
      // REDIRECT to auth-error page
      return res.redirect(`${process.env.FRONTEND_URL}/auth-error?error=domain_not_allowed&message=${encodeURIComponent(restrictionMessage || "Your email domain is not authorized to access this system.")}`);
    }

    const result = await pool.query(
      `SELECT * FROM app_users WHERE email = $1`,
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(400).json({
        error: "This account uses Google sign-in. Please continue with Google."
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // For successful login, you need to redirect to frontend with token
    // Since this is a form submission, we should redirect to auth-success
    return res.redirect(`${process.env.FRONTEND_URL}/auth-success?token=${token}`);

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// ==============================
// GOOGLE CONNECT / LOGIN
// ==============================
exports.googleConnect = async (req, res) => {
  try {
    const url = oauth2Client.generateAuthUrl({
      access_type: "online",
      scope: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/gmail.send"
      ],
      include_granted_scopes: true,
      ...(process.env.GOOGLE_HD ? { hd: process.env.GOOGLE_HD } : {})
    });

    return res.redirect(url);
  } catch (error) {
    console.error("Google connect error:", error);
    return redirectToError(res, "google_auth_failed", "Failed to start Google authentication");
  }
};

// ==============================
// GOOGLE CALLBACK (with domain restriction)
// ==============================
exports.googleCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return redirectToError(res, "google_auth_failed", "Authorization code missing");
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: "v2"
    });

    const userInfo = await oauth2.userinfo.get();

    const google_id = userInfo.data.id;
    const name = (userInfo.data.name || "Google User").trim();
    const email = userInfo.data.email.trim().toLowerCase();

    // Check domain restriction
    if (!isAllowedDomain(email)) {
      const restrictionMessage = getDomainRestrictionMessage();
      return redirectToError(res, "domain_not_allowed", restrictionMessage || "Your email domain is not authorized to access this system.");
    }

    const existingResult = await pool.query(
      `SELECT * FROM app_users WHERE email = $1`,
      [email]
    );

    let user;

    if (existingResult.rows.length > 0) {
      const updated = await pool.query(
        `UPDATE app_users
         SET
           name = COALESCE($1, name),
           google_id = $2,
           google_connected = true,
           updated_at = NOW()
         WHERE email = $3
         RETURNING user_id, name, email, company, role`,
        [name, google_id, email]
      );

      user = updated.rows[0];
    } else {
      const inserted = await pool.query(
        `INSERT INTO app_users
         (name, email, google_id, google_connected)
         VALUES ($1, $2, $3, true)
         RETURNING user_id, name, email, company, role`,
        [name, email, google_id]
      );

      user = inserted.rows[0];
    }

    const jwt_token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.redirect(`${process.env.FRONTEND_URL}/auth-success?token=${jwt_token}`);
  } catch (error) {
    console.error("Google callback error:", error);
    return redirectToError(res, "google_auth_failed", "Google authentication failed");
  }
};

// ==============================
// MICROSOFT CONNECT
// ==============================
exports.microsoftConnect = async (req, res) => {
  try {
    const params = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      response_type: "code",
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
      response_mode: "query",
      scope: "openid profile email User.Read",
      prompt: "select_account"
    });

    if (process.env.MICROSOFT_HD) {
      params.append("domain_hint", process.env.MICROSOFT_HD);
    }

    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;

    return res.redirect(url);
  } catch (error) {
    console.error("Microsoft connect error:", error);
    return redirectToError(res, "microsoft_auth_failed", "Failed to start Microsoft authentication");
  }
};

// ==============================
// MICROSOFT CALLBACK (with domain restriction)
// ==============================
exports.microsoftCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return redirectToError(res, "microsoft_auth_failed", "Authorization code missing");
    }

    const tokenResponse = await axios.post(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        code,
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
        grant_type: "authorization_code"
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    const userResponse = await axios.get("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const msUser = userResponse.data;

    const microsoft_id = msUser.id;
    const name = msUser.displayName || "Microsoft User";
    const email = (msUser.mail || msUser.userPrincipalName || "").toLowerCase();

    if (!email) {
      return redirectToError(res, "no_email", "Could not retrieve your email from Microsoft");
    }

    // Check domain restriction
    if (!isAllowedDomain(email)) {
      const restrictionMessage = getDomainRestrictionMessage();
      return redirectToError(res, "domain_not_allowed", restrictionMessage || "Your email domain is not authorized to access this system.");
    }

    const existingResult = await pool.query(
      `SELECT * FROM app_users WHERE email = $1`,
      [email]
    );

    let user;

    if (existingResult.rows.length > 0) {
      const updated = await pool.query(
        `UPDATE app_users
         SET
           name = COALESCE($1, name),
           microsoft_id = $2,
           microsoft_connected = true,
           updated_at = NOW()
         WHERE email = $3
         RETURNING user_id, name, email, company, role`,
        [name, microsoft_id, email]
      );

      user = updated.rows[0];
    } else {
      const inserted = await pool.query(
        `INSERT INTO app_users
         (name, email, microsoft_id, microsoft_connected)
         VALUES ($1, $2, $3, true)
         RETURNING user_id, name, email, company, role`,
        [name, email, microsoft_id]
      );

      user = inserted.rows[0];
    }

    const jwt_token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.redirect(`${process.env.FRONTEND_URL}/auth-success?token=${jwt_token}`);
  } catch (error) {
    console.error("Microsoft callback error:", error.response?.data || error);
    return redirectToError(res, "microsoft_auth_failed", "Microsoft authentication failed");
  }
};

// ==============================
// GET CURRENT USER
// ==============================
exports.getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, name, email, company, role, google_connected, microsoft_connected
       FROM app_users
       WHERE user_id = $1`,
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user: result.rows[0] });
  } catch (error) {
    console.error("GetMe error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// ==============================
// LOGOUT
// ==============================
exports.logout = async (req, res) => {
  try {
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// ==============================
// GET ALLOWED DOMAINS INFO (for frontend)
// ==============================
exports.getAllowedDomains = async (req, res) => {
  try {
    const domains = process.env.ALLOWED_DOMAINS 
      ? process.env.ALLOWED_DOMAINS.split(',').map(d => d.trim())
      : [];
    
    return res.json({
      allowedDomains: domains,
      restricted: domains.length > 0,
      message: domains.length > 0 
        ? `Only ${domains.map(d => `@${d}`).join(', ')} email addresses can access this system.`
        : "All email domains are allowed."
    });
  } catch (error) {
    console.error("Get allowed domains error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};