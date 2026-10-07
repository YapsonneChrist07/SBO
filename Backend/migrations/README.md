# Database migrations

Schema changes made on top of `sbo.sql` (repo root). On a fresh install, import
`sbo.sql` first, then run these files in numeric order:

```sh
mysql -u <user> -p <database> < Backend/migrations/001_passwordreset.sql
mysql -u <user> -p <database> < Backend/migrations/002_purchase_receiving.sql
```

Each file is applied once; there is no migration tracking table.
