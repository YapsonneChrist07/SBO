-- Purchase orders (SBO buying stock from a supplier):
--  * storeID: the SBO shop the goods are for. Picks the supplier's per-shop price
--    (productsupplierlocation) and is where stock lands when the order is received.
--  * receivedDate: NULL while the order is pending; set when the goods arrive.
--  * The transporter becomes optional: it may not be known when the order is placed,
--    and a transporter company may have no linked contact yet.

ALTER TABLE `purchase`
  ADD COLUMN `storeID` varchar(15) DEFAULT NULL AFTER `supplierContactID`,
  ADD COLUMN `receivedDate` datetime DEFAULT NULL AFTER `purchaseDate`,
  ADD KEY `storeID_PST_idx` (`storeID`),
  ADD CONSTRAINT `storeID_PST` FOREIGN KEY (`storeID`) REFERENCES `store` (`storeID`),
  MODIFY `transporterID` varchar(15) DEFAULT NULL,
  MODIFY `transporterContactID` varchar(15) DEFAULT NULL;
