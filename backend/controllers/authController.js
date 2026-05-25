// authController.js
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
// SIGN UP
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

    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters"
      });
    }

    const existing = await pool.query(
      `SELECT user_id FROM app_users WHERE email = $1`,
      [cleanEmail]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "User already exists" });
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

    return res.json({
      message: "Account created successfully",
      token,
      user
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// ==============================
// LOGIN
// ==============================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const cleanEmail = email.trim().toLowerCase();

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

    return res.json({
      message: "Login successful",
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        company: user.company,
        role: user.role
      }
    });
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
      include_granted_scopes: true
    });

    return res.redirect(url);
  } catch (error) {
    console.error("Google connect error:", error);
    return res.status(500).json({ error: "Failed to start Google auth" });
  }
};

// ==============================
// GOOGLE CALLBACK
// ==============================
exports.googleCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: "Authorization code missing" });
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

    const existingResult = await pool.query(
      `SELECT * FROM app_users WHERE email = $1`,
      [email]
    );

    let user;

    if (existingResult.rows.length > 0) {
      // Update existing user - REMOVED refresh_token
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
      // Insert new user - REMOVED refresh_token
      const inserted = await pool.query(
        `INSERT INTO app_users
         (name, email, google_id, google_connected)
         VALUES ($1, $2, $3, true)
         RETURNING user_id, name, email, company, role`,
        [name, email, google_id]
      );

      user = inserted.rows[0];
    }

    // Generate JWT token
    const jwt_token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.redirect(`${process.env.FRONTEND_URL}/auth-success?token=${jwt_token}`);
  } catch (error) {
    console.error("Google callback error:", error);
    return res.status(500).json({ error: "Google authentication failed" });
  }
};

// ==============================
// GET CURRENT USER
// ==============================
exports.getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, name, email, company, role, google_connected
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
    // In a stateless JWT system, logout is handled on client side
    // The client should remove the token from localStorage
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

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

    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;

    return res.redirect(url);
  } catch (error) {
    console.error("Microsoft connect error:", error);
    return res.status(500).json({ error: "Failed to start Microsoft auth" });
  }
};

exports.microsoftCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: "Authorization code missing" });
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
      return res.status(400).json({ error: "Microsoft email not found" });
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
    return res.status(500).json({ error: "Microsoft authentication failed" });
  }
};