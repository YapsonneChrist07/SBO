# Database migrations

Schema changes on top of the legacy `sbo.sql` dump (repo root, not in git; it creates a
database named `sbo`). After importing `sbo.sql`, run every file once, in numeric order:

```sh
mysql -u <user> -p <database> < Backend/migrations/000_legacy_schema_fixes.sql
mysql -u <user> -p <database> < Backend/migrations/001_passwordreset.sql
mysql -u <user> -p <database> < Backend/migrations/002_purchase_receiving.sql
mysql -u <user> -p <database> < Backend/migrations/003_shipment_for_web_orders.sql
mysql -u <user> -p <database> < Backend/migrations/004_tariff_per_transporter.sql
mysql -u <user> -p <database> < Backend/migrations/005_partner_status.sql
mysql -u <user> -p <database> < Backend/migrations/006_region_countries.sql
```

`sbo.sql` + these migrations gives exactly the schema in `../database/schema.sql`. A database
created from `schema.sql` already includes them all.

Each file is applied once; there is no migration tracking table. After adding a migration,
run `npm run db:export-schema` so `database/schema.sql` stays in sync.
