-- Supplier and transporter accounts are reviewed by SBO before they can use their space.
--  pending   signed up on the website, waiting for an admin (the default for new sign-ups,
--            set by the registration code)
--  active    approved: can use their space, receive purchase orders / deliveries
--  disabled  turned off by an admin
-- Existing companies were created by SBO or before approval existed: they start active.

ALTER TABLE `supplier`
  ADD COLUMN `status` enum('pending','active','disabled') NOT NULL DEFAULT 'active',
  ADD COLUMN `statusChangedDate` datetime DEFAULT NULL;

ALTER TABLE `transporter`
  ADD COLUMN `status` enum('pending','active','disabled') NOT NULL DEFAULT 'active',
  ADD COLUMN `statusChangedDate` datetime DEFAULT NULL;
