const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');
const { sendPasswordResetEmail } = require('../utils/mailer');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const register = async (req, res) => {
  const { firstName, lastName, username, password, email, phone, nickName } = req.body;
  try {
    const [existing] = await db.query('SELECT contactID FROM contact WHERE username = ?', [username]);
    if (existing.length) return error(res, 'Username already taken', 409);

    const hashed = await bcrypt.hash(password, 10);
    const contactID = generateId();

    // contact.addressID is NOT NULL, but we don't collect an address at signup —
    // create a placeholder the user fills in for real at checkout.
    const [[defaultCity]] = await db.query('SELECT cityID FROM city ORDER BY cityID LIMIT 1');
    if (!defaultCity) return error(res, 'No city configured for new addresses', 500);
    const addressID = generateId();
    await db.query(
      'INSERT INTO address (addressID, cityID, phone, email) VALUES (?, ?, ?, ?)',
      [addressID, defaultCity.cityID, phone || null, email || null]
    );

    await db.query(
      `INSERT INTO contact (contactID, addressID, firstName, lastName, username, password, nickName, phone, email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [contactID, addressID, firstName, lastName, username, hashed, nickName || null, phone || null, email || null]
    );

    return success(res, { contactID }, 'Registration successful', 201);
  } catch (err) {
    console.error(err);
    return error(res, err.message);
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.query(
      'SELECT c.*, u.adminEntity FROM contact c LEFT JOIN usercreator u ON u.contactID = c.contactID WHERE c.username = ?',
      [username]
    );
    if (!rows.length) return error(res, 'Invalid credentials', 401);

    const contact = rows[0];
    const valid = await bcrypt.compare(password, contact.password);
    if (!valid) return error(res, 'Invalid credentials', 401);

    const token = jwt.sign(
      { contactID: contact.contactID, username: contact.username, adminEntity: contact.adminEntity },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    const { password: _, ...user } = contact;
    return success(res, { token, user }, 'Login successful');
  } catch (err) {
    console.error(err);
    return error(res, err.message);
  }
};

const getMe = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.contactID, c.firstName, c.lastName, c.username, c.nickName, c.phone, c.alternatePhone, c.email, u.adminEntity,
              a.addressID, a.lineOfAddress, a.postalCode, ci.cityID, ci.name AS cityName
       FROM contact c
       LEFT JOIN usercreator u ON u.contactID = c.contactID
       LEFT JOIN address a ON a.addressID = c.addressID
       LEFT JOIN city ci ON ci.cityID = a.cityID
       WHERE c.contactID = ?`,
      [req.user.contactID]
    );
    if (!rows.length) return error(res, 'User not found', 404);
    return success(res, rows[0]);
  } catch (err) {
    return error(res, err.message);
  }
};

const updateMe = async (req, res) => {
  const { firstName, lastName, nickName, phone, alternatePhone, email } = req.body;
  try {
    await db.query(
      `UPDATE contact SET firstName = ?, lastName = ?, nickName = ?, phone = ?, alternatePhone = ?, email = ?
       WHERE contactID = ?`,
      [firstName, lastName, nickName || null, phone || null, alternatePhone || null, email || null, req.user.contactID]
    );
    const [rows] = await db.query(
      'SELECT contactID, firstName, lastName, username, nickName, phone, alternatePhone, email FROM contact WHERE contactID = ?',
      [req.user.contactID]
    );
    return success(res, rows[0], 'Profile updated');
  } catch (err) {
    return error(res, err.message);
  }
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const [rows] = await db.query('SELECT password FROM contact WHERE contactID = ?', [req.user.contactID]);
    if (!rows.length) return error(res, 'User not found', 404);

    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) return error(res, 'Current password is incorrect', 401);

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE contact SET password = ? WHERE contactID = ?', [hashed, req.user.contactID]);
    return success(res, null, 'Password updated');
  } catch (err) {
    return error(res, err.message);
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const [rows] = await db.query('SELECT contactID, firstName, email FROM contact WHERE email = ?', [email]);
    // Always respond the same way whether or not the email exists, so we don't leak account info.
    if (rows.length) {
      const contact = rows[0];
      const rawToken = crypto.randomBytes(32).toString('hex');
      const resetID = generateId();
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await db.query(
        'INSERT INTO passwordreset (resetID, contactID, tokenHash, expiresAt) VALUES (?, ?, ?, ?)',
        [resetID, contact.contactID, hashToken(rawToken), expiresAt]
      );

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;
      sendPasswordResetEmail(contact.email, contact.firstName, resetUrl).catch((err) =>
        console.error('Failed to send password reset email:', err.message)
      );
    }
    return success(res, null, 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.');
  } catch (err) {
    return error(res, err.message);
  }
};

const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const tokenHash = hashToken(token);
    const [rows] = await db.query(
      'SELECT resetID, contactID, expiresAt, used FROM passwordreset WHERE tokenHash = ?',
      [tokenHash]
    );
    if (!rows.length) return error(res, 'Lien de réinitialisation invalide ou expiré', 400);

    const reset = rows[0];
    if (reset.used || new Date(reset.expiresAt) < new Date()) {
      return error(res, 'Lien de réinitialisation invalide ou expiré', 400);
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE contact SET password = ? WHERE contactID = ?', [hashed, reset.contactID]);
    await db.query('UPDATE passwordreset SET used = 1 WHERE resetID = ?', [reset.resetID]);

    return success(res, null, 'Mot de passe réinitialisé avec succès');
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { register, login, getMe, updateMe, changePassword, forgotPassword, resetPassword };
