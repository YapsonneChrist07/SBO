// The price a shopper pays right now for each product: the active deal price if the
// product is in a running promotion, else its regular selling price. This must match what
// the storefront displays (see product.controller.js getAll/getById).
// Returns a Map productID → unitPrice; unknown products are absent.
const currentUnitPrices = async (conn, productIDs) => {
  if (!productIDs.length) return new Map();
  const [rows] = await conn.query(
    `SELECT p.productID,
            COALESCE(
              (SELECT MIN(pd.currentPrice) FROM promotiondetails pd
               JOIN promotion promo ON promo.promotionID = pd.promotionID AND NOW() BETWEEN promo.startDate AND promo.endDate
               WHERE pd.productID = p.productID AND pd.currentPrice > 0),
              p.sellUnitPrice
            ) AS unitPrice
     FROM product p
     WHERE p.productID IN (?)`,
    [productIDs]
  );
  return new Map(rows.map((r) => [r.productID, Number(r.unitPrice) || 0]));
};

module.exports = { currentUnitPrices };
