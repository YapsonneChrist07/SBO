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
