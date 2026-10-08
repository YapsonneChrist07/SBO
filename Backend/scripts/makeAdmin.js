/*
 * Gives an existing account access to the admin dashboard (/admin).
 *
 *   npm run make-admin -- <username>            grant
 *   npm run make-admin -- <username> --revoke   remove
 *
 * Create the account first through the website's sign-up page.
 */
const db = require('../config/db');
const generateId = require('../utils/generateId');

(async () => {
  const [username, flag] = process.argv.slice(2);
  if (!username) throw new Error('Usage: npm run make-admin -- <username> [--revoke]');

  const [[contact]] = await db.query('SELECT contactID FROM contact WHERE username = ?', [username]);
  if (!contact) throw new Error(`No account with username "${username}". Sign up on the website first.`);

  if (flag === '--revoke') {
    const [result] = await db.query('DELETE FROM usercreator WHERE contactID = ?', [contact.contactID]);
    console.log(result.affectedRows ? `${username} is no longer an admin.` : `${username} was not an admin.`);
  } else {
    const [[existing]] = await db.query('SELECT 1 AS ok FROM usercreator WHERE contactID = ?', [contact.contactID]);
    if (existing) {
      console.log(`${username} is already an admin.`);
    } else {
      await db.query(
        "INSERT INTO usercreator (userCreatorID, contactID, adminEntity) VALUES (?, ?, 'brokerAdmin')",
        [generateId(), contact.contactID]
      );
      console.log(`${username} is now an admin. Log out and back in to see the dashboard.`);
    }
  }
  await db.end();
})().catch(async (err) => {
  console.error(err.message);
  process.exitCode = 1;
  await db.end();
});
