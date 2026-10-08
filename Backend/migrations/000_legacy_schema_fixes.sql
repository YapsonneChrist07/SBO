-- Changes that were made directly on the development database before migrations were
-- tracked. Without them a fresh install from sbo.sql is broken. Already applied on the
-- original dev database; run it first on a fresh sbo.sql import.
--
--  * contact.password held 25 characters, but bcrypt hashes are 60: every signup failed.
--  * Website shoppers are contacts, not B2B `client` rows, so reviews must not require one.
--  * contact.addressID is filled at signup with a placeholder, but may be empty for
--    accounts created by other means.
--  * Indexes used by the product catalogue (search, price sort, newest first).

ALTER TABLE `contact`
  MODIFY `password` varchar(255) NOT NULL,
  MODIFY `addressID` varchar(15) DEFAULT NULL;

ALTER TABLE `productreview`
  MODIFY `clientID` varchar(15) DEFAULT NULL;

ALTER TABLE `supplierreview`
  MODIFY `clientID` varchar(15) DEFAULT NULL;

ALTER TABLE `product`
  ADD KEY `idx_product_name` (`name`),
  ADD KEY `idx_product_sellUnitPrice` (`sellUnitPrice`),
  ADD KEY `idx_product_createdDate` (`createdDate`);
