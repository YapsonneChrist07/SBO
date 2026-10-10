-- Test-only catalogue: a handful of products, one of them on promotion, stocked in every shop.

INSERT INTO `product` (`productID`, `name`, `sellUnitPrice`, `weight`) VALUES
  ('TEST_P1', 'Produit test 1', 20, 0.5),
  ('TEST_P2', 'Produit test 2', 50, 1.5),
  ('TEST_P3', 'Produit test 3 (en promo)', 40, 2),
  ('TEST_P4', 'Produit test 4', 10, 0.2);

-- Active promotion on TEST_P3: 40 → 30.
INSERT INTO `promotion` (`promotionID`, `brokerID`, `brokerContactID`, `startDate`, `endDate`) VALUES
  ('TEST_PROMO', 'BRK_1', 'CNT_SBO', NOW() - INTERVAL 1 DAY, NOW() + INTERVAL 30 DAY);
INSERT INTO `promotiondetails` (`promotionID`, `productID`, `rebate`, `currentPrice`, `previousPrice`) VALUES
  ('TEST_PROMO', 'TEST_P3', 0.25, 30, 40);

INSERT INTO `inventory` (`productID`, `storeID`, `quantityInStock`, `quantityOnCommand`, `minQuantity`, `lastUpdate`)
SELECT p.productID, s.storeID, 10, 0, 5, NOW()
FROM product p CROSS JOIN store s
WHERE p.productID LIKE 'TEST\_%';

-- A carrier delivering in Côte d'Ivoire (TRJ_3), so test shoppers (Plateau) can check out.
-- Prices are multiples of 655.957 FCFA (= 1 €) and some brackets are missing on purpose:
-- ≤0.5 kg 2 €, ≤1 kg 3 €, ≤2 kg 4 €, ≤10 kg 10 €.
INSERT INTO `address` (`addressID`, `cityID`) VALUES ('TEST_TADR', 'CITY_1');
INSERT INTO `contact` (`contactID`, `addressID`, `firstName`, `lastName`, `username`, `password`) VALUES
  ('TEST_TCNT', 'TEST_TADR', 'Test', 'Livreur', 'test_livreur', '!disabled');
INSERT INTO `transporter` (`transporterID`, `addressID`, `name`, `status`) VALUES
  ('TEST_TRP', 'TEST_TADR', 'Livreur Test', 'active');
INSERT INTO `transportercontact` (`transporterID`, `contactID`, `startedDate`) VALUES
  ('TEST_TRP', 'TEST_TCNT', NOW() - INTERVAL 1 DAY);
INSERT INTO `transportercostpertraject` (`trajectID`, `weightLimitID`, `transporterID`, `transportCost`) VALUES
  ('TRJ_3', 'WL_1', 'TEST_TRP', 1311.914),
  ('TRJ_3', 'WL_2', 'TEST_TRP', 1967.871),
  ('TRJ_3', 'WL_4', 'TEST_TRP', 2623.828),
  ('TRJ_3', 'WL_20', 'TEST_TRP', 6559.57);
