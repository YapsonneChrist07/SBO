# Deploying SBO (Railway + Vercel)

- **Railway** runs the API (`Backend/`) and the MySQL database.
- **Vercel** serves the website (`Frontend/`).
- The online database is the **demo catalogue** (about 440 products with photos, the demo
  suppliers and transporters, no customers), not the full 2 GB dump.

Budget about an hour the first time. You need a GitHub account with access to this
repository, and the code pushed to GitHub (`git push`).

---

## 1. Build the demo database (on your computer)

```sh
cd Backend
npm run demo:suppliers        # if not done already: the demo catalogue includes their products
npm run db:build-demo         # creates ../sbo_demo.sql (about 125 MB)
```

## 2. Railway: database

1. Create an account on [railway.com](https://railway.com) (sign in with GitHub) and create a
   **New Project → Deploy MySQL**. Rename the service to `MySQL` if it isn't already.
2. Open the MySQL service → **Variables**. Note `MYSQL_PUBLIC_URL`, which looks like
   `mysql://root:<password>@<host>.proxy.rlwy.net:<port>/railway`.
3. Import the demo database from your computer (PowerShell, from the repo root; replace
   `<host>` and `<port>`, and type the password when asked):

   ```powershell
   cmd /c '"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -h <host>.proxy.rlwy.net -P <port> -u root -p railway < sbo_demo.sql'
   ```

   It takes a minute or two. Nothing is printed when it succeeds.

## 3. Railway: API

1. In the same project: **New → GitHub Repo →** this repository.
2. Service **Settings**:
   - **Root Directory:** `Backend`
   - **Start command:** `npm start` (detected automatically)
   - **Healthcheck Path:** `/`
   - **Networking → Generate Domain.** Note the URL, e.g. `https://sbo-api.up.railway.app`.
3. Service **Variables** (the `${{MySQL.…}}` values link to the database automatically):

   | Variable | Value |
   | --- | --- |
   | `DB_HOST` | `${{MySQL.MYSQLHOST}}` |
   | `DB_PORT` | `${{MySQL.MYSQLPORT}}` |
   | `DB_USER` | `${{MySQL.MYSQLUSER}}` |
   | `DB_PASSWORD` | `${{MySQL.MYSQLPASSWORD}}` |
   | `DB_NAME` | `${{MySQL.MYSQLDATABASE}}` |
   | `JWT_SECRET` | a new long random string: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
   | `JWT_EXPIRES_IN` | `24h` |
   | `TRUST_PROXY` | `1` |
   | `FRONTEND_URL` | your Vercel URL (step 4; fill in afterwards) |
   | `CORS_ORIGIN` | your Vercel URL (same) |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | optional, for password-reset emails |

   Use a **different `JWT_SECRET` from your local one**.
4. Deploy, then open `https://<your-api>.up.railway.app/` in a browser: it should show
   `{"message":"SBO API is running", …}`.

> Password-reset emails: Railway's cheaper plans may block outgoing email (SMTP). If reset
> emails don't arrive online, check Railway's current plan limits. Everything else works without email.

## 4. Vercel: website

1. Create an account on [vercel.com](https://vercel.com) (sign in with GitHub) → **Add New →
   Project →** this repository.
2. **Root Directory:** `Frontend`. Framework preset **Vite** is detected (build `npm run build`,
   output `dist`).
3. **Environment Variables:** `VITE_API_URL` = `https://<your-api>.up.railway.app/api`
4. Deploy and note the site URL, e.g. `https://sbo.vercel.app`.
5. Back in Railway, set `FRONTEND_URL` and `CORS_ORIGIN` to that URL (no trailing slash).
   Railway redeploys the API by itself.

`Frontend/vercel.json` sends every path to the React app, so refreshing a page like
`/product/123` works.

## 5. Create your admin account

1. Sign up on the live site.
2. On your computer, point the admin script at the Railway database for this one command
   (values from `MYSQL_PUBLIC_URL`; PowerShell, in `Backend/`):

   ```powershell
   $env:DB_HOST='<host>.proxy.rlwy.net'; $env:DB_PORT='<port>'; $env:DB_USER='root'; $env:DB_PASSWORD='<password>'; $env:DB_NAME='railway'
   npm run make-admin -- <your-username>
   Remove-Item Env:DB_HOST, Env:DB_PORT, Env:DB_USER, Env:DB_PASSWORD, Env:DB_NAME
   ```

3. Log out and back in on the site: the **Dashboard** link appears.

## 6. Check

- Shop: products with photos, deals, add to cart, checkout.
- Log in as a demo supplier / transporter (logins in `Backend/scripts/README.md`).
- Admin: Partenaires, purchase orders, assigning a transporter to an order.

## Updating later

- **Code:** push to GitHub. Railway and Vercel redeploy automatically.
- **Database schema:** apply the new migration file to the Railway database the same way as
  the import in step 2 (`... railway < Backend/migrations/00X_….sql`).
- **Demo partners:** when real suppliers and transporters join, run the demo scripts with
  `-- --disable` using the same temporary `DB_*` variables as in step 5.
