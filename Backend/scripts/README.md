# Backend scripts

## Demo suppliers — `demoSuppliers.js`

Creates four **fictional** suppliers so the supplier space (`/supplier/...`) and the admin
purchase orders (`/admin/purchases`) have data to show before real suppliers sign up.
They are clearly marked: every name ends in "(démo)", every row's ID starts with `DEMO`,
and their emails use the reserved `example.com` domain, so password-reset emails never
reach a real person.

| Supplier | Offers | Login |
| --- | --- | --- |
| Atelier Wax (démo) | Wax fabrics, decoration fabrics | `demo_wax` |
| Bijoux du Lagon (démo) | Bracelets, necklaces, earrings | `demo_bijoux` |
| Coopérative Karité (démo) | Cosmetics, body care | `demo_karite` |
| Artisans d’Art (démo) | Artworks, decoration (no orders or reviews yet) | `demo_art` |

All four use the password `DemoSBO2026` locally. Log in with the **Fournisseur** role.
The scripts use `DEMO_PASSWORD` instead when it is set; the online demo is always built
with its own private password (see [DEPLOYMENT.md](../../DEPLOYMENT.md)), so this one does
not work there.

They come with catalogue products and wholesale prices, a few per-shop prices, some past
(received) purchase orders, two pending orders you can mark as received from
`/admin/purchases`, and some reviews.

```sh
cd Backend
npm run demo:suppliers               # create (does nothing if they already exist)
npm run demo:suppliers -- --disable  # block their logins and hide them from new purchase orders
npm run demo:suppliers -- --enable   # undo --disable
npm run demo:suppliers -- --remove   # delete everything the script created
```

Notes:
- `--disable` keeps their data and order history. Use it once real suppliers have joined.
- `--remove` deletes demo orders too. Pending orders give back their "en commande"
  quantities. Stock that was added by receiving a demo order in the app stays in the inventory.

## Demo transporters — `demoTransporters.js`

Creates two **fictional** transporters for the transporter space (`/transporter/...`),
marked the same way as the demo suppliers ("(démo)" names, `DEMO…` IDs, `example.com` emails).

| Transporter | Tariff | Login |
| --- | --- | --- |
| Bassam Express (démo) | Domestic only (Côte d'Ivoire → Côte d'Ivoire) | `demo_express` |
| Trans-Côtière Cargo (démo) | International, 5% below the legacy "Transport Group" rates | `demo_cargo` |

Same password as the demo suppliers (`DemoSBO2026`). Log in with the **Transporteur** role.

If the demo suppliers exist, their purchase orders are assigned to these transporters as
pick-ups. Customer deliveries are **not** created by the script: assign a demo transporter
to an order from the admin order page (`/admin/orders/:id` → "Livraison").

```sh
cd Backend
npm run demo:transporters               # create
npm run demo:transporters -- --disable  # block their logins; no new deliveries can be assigned to them
npm run demo:transporters -- --enable   # undo --disable
npm run demo:transporters -- --remove   # delete them
```

`--remove` gives back customer orders that were assigned but not yet picked up. If a demo
transporter has already picked up or delivered a customer order, it refuses and asks you
to use `--disable`, so that the order's history keeps its transporter.
