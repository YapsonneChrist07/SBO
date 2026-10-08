-- Shipments (a transporter delivering a customer order) for orders placed on the website:
--  * clientID referenced the B2B `client` table, but web shoppers are contacts, not
--    clients (sell.clientID is already optional) — the shopper is clientContactID.
--  * transportID referenced a `transport` route record nothing creates.
--  * One shipment per order: reassigning a transporter updates it.
-- status: 'assigned' → 'in_transit' (shipmentDate = pick-up) → 'delivered' (receivedDate).

ALTER TABLE `shipment`
  MODIFY `clientID` varchar(15) DEFAULT NULL,
  MODIFY `transportID` varchar(15) DEFAULT NULL,
  ADD UNIQUE KEY `sellID_SHS_unique` (`sellID`);
