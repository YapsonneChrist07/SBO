# SBO — Small Business Operations

E-commerce platform for SBO, a retailer of African fashion, jewellery, art and cosmetics with
shops in Abidjan and Grand-Bassam. It rebuilds the legacy "SBO Lite N3C" site and connects
the three kinds of people SBO works with:

| Who | What they do on the site |
| --- | --- |
| **Clients** | Browse the catalogue, deals and shops, keep a wishlist, order and pay, follow their delivery, review products. |
| **Suppliers** | List the products they supply with their prices (optionally per shop), follow the purchase orders SBO sends them, read SBO's reviews of them. |
| **Transporters** | Deliver customer orders (pick-up → delivered), pick up purchase orders from suppliers, publish their tariffs by destination and weight. |
| **Admins** (SBO staff) | Dashboard, orders and delivery assignment, products, categories, promotions, inventory, customers, purchase orders to suppliers, and approving or disabling supplier and transporter accounts. |

Everyone logs in on the same page and picks **Client**, **Fournisseur** or **Transporteur**.
Supplier and transporter accounts are checked against the company they belong to, and a
new partner sign-up waits for an admin's approval (Partenaires page) before its space opens.

## Stack

- **Frontend:** React 19 + Vite, React Router, plain CSS per component (`Frontend/`)
- **Backend:** Node.js + Express, MySQL 8 via `mysql2` (raw SQL), JWT auth (`Backend/`)
- **Tests:** Jest + Supertest integration tests against a real MySQL test database

```
Backend/
  app.js, server.js       Express app / entry point
  routes/, controllers/   one pair per resource
  middleware/             auth (roles, admin, partner access), validation, rate limits
  database/               schema.sql + seed-reference.sql (+ tools/exportSchema.js)
  migrations/             schema changes on top of the legacy sbo.sql dump
  scripts/                make-admin, demo suppliers / transporters
  tests/                  integration tests
Frontend/
  src/pages/              one folder per page
  src/components/, src/api/, src/context/, src/hooks/
```

## Getting started

Requirements: **Node.js 20+** and **MySQL 8**.

### 1. Install

```sh
cd Backend && npm install
cd ../Frontend && npm install
```

### 2. Configure

```sh
cp Backend/.env.example Backend/.env
cp Frontend/.env.example Frontend/.env
```

Fill in `Backend/.env`: at least the `DB_*` settings and a long random `JWT_SECRET`.
SMTP settings are only needed for password-reset emails.

### 3. Create the database

Choose **one** option.

**A. With the full catalogue (recommended for demos).** The legacy dump `sbo.sql` (about 2 GB,
with product photos) is not in git; get it from the project's shared drive. Then apply the
migrations, in order:

```sh
mysql -u root -p < sbo.sql      # creates and fills a database named "sbo"
mysql -u root -p sbo < Backend/migrations/000_legacy_schema_fixes.sql
mysql -u root -p sbo < Backend/migrations/001_passwordreset.sql
mysql -u root -p sbo < Backend/migrations/002_purchase_receiving.sql
mysql -u root -p sbo < Backend/migrations/003_shipment_for_web_orders.sql
mysql -u root -p sbo < Backend/migrations/004_tariff_per_transporter.sql
mysql -u root -p sbo < Backend/migrations/005_partner_status.sql
```

The dump always creates and uses a database named `sbo`, whatever `DB_NAME` says. To use
another name, rename it afterwards or edit the `CREATE DATABASE` / `USE` lines at the top of the dump.

**B. Empty catalogue (from the repository only).** Countries, cities, shops, payment methods,
categories and shipping routes are included; products are added from the admin dashboard.

```sh
mysql -u root -p -e "CREATE DATABASE sbo CHARACTER SET utf8mb3"
mysql -u root -p sbo < Backend/database/schema.sql
mysql -u root -p sbo < Backend/database/seed-reference.sql
```

### 4. Create an admin

Sign up on the website, then:

```sh
cd Backend
npm run make-admin -- <your-username>
```

### 5. Optional: demo suppliers and transporters

Fictional partners so the supplier and transporter spaces have data to show (needs option A,
because they pick products from the catalogue). Logins are in
[`Backend/scripts/README.md`](Backend/scripts/README.md).

```sh
cd Backend
npm run demo:suppliers
npm run demo:transporters
```

Disable them with `-- --disable` once real partners have joined, or delete them with `-- --remove`.

### 6. Run

```sh
cd Backend && npm run dev     # API on http://localhost:5000
cd Frontend && npm run dev    # site on http://localhost:5173
```

## Tests

```sh
cd Backend
npm test
```

The tests rebuild a separate database (`TEST_DB_NAME`, default `sbo_test`) from
`database/schema.sql`, `database/seed-reference.sql` and `tests/fixtures.sql` on every run,
so they need MySQL running but never touch your real data. The setup refuses to run against
a database whose name does not end in `_test`.

They cover registration and role login, checkout pricing, who can access what (every admin
route and both partner spaces), the supplier catalogue, purchase orders and stock, the
delivery flow, transporter tariffs, and rate limiting.

## Changing the database schema

1. Add a numbered file to `Backend/migrations/` and apply it to your database.
2. Run `npm run db:export-schema` in `Backend/` to regenerate `database/schema.sql` and
   `database/seed-reference.sql` (the tests and option B install use them).
3. Add the new file to the list in step 3A above and in `Backend/migrations/README.md`.

## Security notes

- Passwords are hashed with bcrypt. Sessions are JWTs carrying the role and company; partner
  access is re-checked against the database on every request, so removing someone from a
  company takes effect immediately.
- Prices, totals and stock movements are always computed on the server.
- Login, sign-up and password-reset endpoints are rate-limited per IP. When deployed behind
  a proxy, set `TRUST_PROXY` (see `.env.example`).

## Known limitations

- **Card payments are simulated.** Card details are stored in the `creditcard` table as-is
  and no payment provider is involved. Acceptable for a school demo, not for production.
- **Currency:** the shop displays prices in euros, while transporter tariffs are in FCFA.
- **Shipping cost** at checkout is always 0; transporter tariffs are not yet used to compute it.
- Some legacy catalogue entries have placeholder or duplicate names.
- Rate-limit counters are kept in memory (one server instance).
