const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { error } = require('../utils/response');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'No token provided', 401);
  }
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return error(res, 'Invalid or expired token', 401);
  }
};

const authorizeAdmin = (req, res, next) => {
  if (!req.user?.adminEntity) {
    return error(res, 'Admin access required', 403);
  }
  next();
};

const ORGANIZATION_LINKS = {
  supplier: { org: 'supplier', link: 'suppliercontact', id: 'supplierID' },
  transporter: { org: 'transporter', link: 'transportercontact', id: 'transporterID' },
};

// Requires a token issued for `role` and re-checks, on every request, that the contact is
// still linked to the organization in the token and that SBO has approved it (status
// 'active'). Revoking a link or disabling a company takes effect without waiting for the
// JWT to expire. Sets req.organizationID for controllers to scope every query by.
const authorizeOrganization = (role) => async (req, res, next) => {
  const { org, link, id } = ORGANIZATION_LINKS[role];
  if (req.user?.role !== role || !req.user.organizationID) {
    return error(res, 'Accès réservé à cet espace partenaire', 403);
  }
  try {
    const [[row]] = await db.query(
      `SELECT o.status FROM ${link} l JOIN ${org} o ON o.${id} = l.${id}
       WHERE l.${id} = ? AND l.contactID = ? AND (l.endedDate IS NULL OR l.endedDate > NOW())`,
      [req.user.organizationID, req.user.contactID]
    );
    if (!row) return error(res, 'Accès réservé à cet espace partenaire', 403);
    if (row.status === 'pending') return error(res, 'Votre compte est en cours de validation par SBO.', 403);
    if (row.status !== 'active') return error(res, 'Ce compte a été désactivé par SBO.', 403);
    req.organizationID = req.user.organizationID;
    next();
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { authenticate, authorizeAdmin, authorizeOrganization };
