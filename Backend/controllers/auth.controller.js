const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');
const { sendPasswordResetEmail } = require('../utils/mailer');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const ROLES = ['client', 'supplier', 'transporter'];
const ROLE_LABELS = { supplier: 'fournisseur', transporter: 'transporteur' };

// Suppliers and transporters are companies; a contact acts on behalf of one through
// the suppliercontact / transportercontact link tables. Returns null when the contact
// isn't (or is no longer) linked to an organization of that role. organizationStatus is
// the company's review state: 'pending' (awaiting SBO), 'active' or 'disabled'.
const findOrganization = async (contactID, role) => {
  const tables = {
    supplier: { org: 'supplier', link: 'suppliercontact', id: 'supplierID' },
    transporter: { org: 'transporter', link: 'transportercontact', id: 'transporterID' },
  }[role];
  if (!tables) return null;

  const [rows] = await db.query(
    `SELECT o.${tables.id} AS organizationID, o.name AS organizationName, o.status AS organizationStatus
     FROM ${tables.link} l
     JOIN ${tables.org} o ON o.${tables.id} = l.${tables.id}
     WHERE l.contactID = ? AND (l.endedDate IS NULL OR l.endedDate > NOW())
     ORDER BY l.startedDate DESC
     LIMIT 1`,
    [contactID]
  );
  return rows[0] || null;
};

const register = async (req, res) => {
  const { firstName, lastName, username, password, email, phone, nickName, companyName, businessDescription } = req.body;
  const role = req.body.role || 'client';
  const conn = await db.getConnection();
  try {
    const [existing] = await conn.query('SELECT contactID FROM contact WHERE username = ?', [username]);
    if (existing.length) return error(res, 'Username already taken', 409);

    const hashed = await bcrypt.hash(password, 10);
    const contactID = generateId();

    // contact.addressID is NOT NULL, but we don't collect an address at signup —
    // create a placeholder the user fills in for real at checkout.
    const [[defaultCity]] = await conn.query('SELECT cityID FROM city ORDER BY cityID LIMIT 1');
    if (!defaultCity) return error(res, 'No city configured for new addresses', 500);

    await conn.beginTransaction();

    const addressID = generateId();
    await conn.query(
      'INSERT INTO address (addressID, cityID, phone, email) VALUES (?, ?, ?, ?)',
      [addressID, defaultCity.cityID, phone || null, email || null]
    );

    await conn.query(
      `INSERT INTO contact (contactID, addressID, firstName, lastName, username, password, nickName, phone, email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [contactID, addressID, firstName, lastName, username, hashed, nickName || null, phone || null, email || null]
    );

    // Supplier/transporter signups also create the company and link the contact to it.
    // The company gets its own address row (transporter.addressID is NOT NULL) so that
    // editing the person's delivery address later doesn't move the company.
    if (role !== 'client') {
      const orgAddressID = generateId();
      await conn.query(
        'INSERT INTO address (addressID, cityID, phone, email) VALUES (?, ?, ?, ?)',
        [orgAddressID, defaultCity.cityID, phone || null, email || null]
      );

      const organizationID = generateId();
      const org = role === 'supplier'
        ? { table: 'supplier', link: 'suppliercontact', id: 'supplierID' }
        : { table: 'transporter', link: 'transportercontact', id: 'transporterID' };
      await conn.query(
        // Website sign-ups wait for an admin to approve them (Partenaires page).
        `INSERT INTO ${org.table} (${org.id}, addressID, name, businessDescription, status, statusChangedDate)
         VALUES (?, ?, ?, ?, 'pending', NOW())`,
        [organizationID, orgAddressID, companyName.trim(), businessDescription || null]
      );
      await conn.query(
        `INSERT INTO ${org.link} (${org.id}, contactID, startedDate) VALUES (?, ?, NOW())`,
        [organizationID, contactID]
      );
    }

    await conn.commit();
    return success(res, { contactID, role }, 'Registration successful', 201);
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return error(res, err.message);
  } finally {
    conn.release();
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;
  const role = req.body.role || 'client';
  try {
    const [rows] = await db.query(
      'SELECT c.*, u.adminEntity FROM contact c LEFT JOIN usercreator u ON u.contactID = c.contactID WHERE c.username = ?',
      [username]
    );
    if (!rows.length) return error(res, 'Invalid credentials', 401);

    const contact = rows[0];
    const valid = await bcrypt.compare(password, contact.password);
    if (!valid) return error(res, 'Invalid credentials', 401);

    // Anyone can shop as a client; the supplier/transporter spaces require the
    // account to actually be linked to such a company.
    let organization = null;
    if (role !== 'client') {
      organization = await findOrganization(contact.contactID, role);
      if (!organization) {
        return error(res, `Ce compte n'est pas enregistré comme ${ROLE_LABELS[role]}.`, 403);
      }
      // A pending company may log in (its space explains it awaits approval); a disabled one may not.
      if (organization.organizationStatus === 'disabled') {
        return error(res, `Ce compte ${ROLE_LABELS[role]} a été désactivé par SBO. Contactez-nous pour plus d'informations.`, 403);
      }
    }

    const token = jwt.sign(
      {
        contactID: contact.contactID,
        username: contact.username,
        adminEntity: contact.adminEntity,
        role,
        organizationID: organization?.organizationID || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    const { password: _, ...user } = contact;
    return success(res, { token, user: { ...user, role, ...organization } }, 'Login successful');
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

    // Tokens issued before roles existed carry no role — treat them as clients.
    const role = req.user.role || 'client';
    let organization = null;
    if (role !== 'client') {
      organization = await findOrganization(req.user.contactID, role);
      // The contact was unlinked from the company since logging in: force a fresh login.
      if (!organization) return error(res, `Ce compte n'est plus enregistré comme ${ROLE_LABELS[role]}.`, 401);
      if (organization.organizationStatus === 'disabled') {
        return error(res, `Ce compte ${ROLE_LABELS[role]} a été désactivé par SBO.`, 401);
      }
    }
    return success(res, { ...rows[0], role, ...organization });
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

module.exports = { ROLES, register, login, getMe, updateMe, changePassword, forgotPassword, resetPassword };
