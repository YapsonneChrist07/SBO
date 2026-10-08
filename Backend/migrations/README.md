# Database migrations

Schema changes made on top of `sbo.sql` (repo root). On a fresh install, import
`sbo.sql` first, then run these files in numeric order:

```sh
mysql -u <user> -p <database> < Backend/migrations/001_passwordreset.sql
mysql -u <user> -p <database> < Backend/migrations/002_purchase_receiving.sql
mysql -u <user> -p <database> < Backend/migrations/003_shipment_for_web_orders.sql
mysql -u <user> -p <database> < Backend/migrations/004_tariff_per_transporter.sql
```

Each file is applied once; there is no migration tracking table.
