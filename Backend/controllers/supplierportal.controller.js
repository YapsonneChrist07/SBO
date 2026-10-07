const db = require('../config/db');
const { success, error } = require('../utils/response');

// Everything here is scoped to req.organizationID (set by authorizeOrganization('supplier')),
// never to an ID from the URL or body, so a supplier can only see and edit their own data.

const getSummary = async (req, res) => {
  const supplierID = req.organizationID;
  try {
    const [[products]] = await db.query(
      `SELECT COUNT(*) AS productCount,
              SUM(EXISTS (SELECT 1 FROM productsupplierlocation psl
                          WHERE psl.supplierID = ps.supplierID AND psl.productID = ps.productID)) AS pricedInShops
       FROM productsupplier ps WHERE ps.supplierID = ?`,
      [supplierID]
    );
    const [[purchases]] = await db.query(
      'SELECT COUNT(*) AS purchaseCount, COALESCE(SUM(total), 0) AS purchaseTotal FROM purchase WHERE supplierID = ?',
      [supplierID]
    );
    const [[reviews]] = await db.query(
      'SELECT COUNT(*) AS reviewCount, AVG(ratingValue) AS averageRating FROM supplierreview WHERE supplierID = ?',
      [supplierID]
    );
    return success(res, {
      productCount: Number(products.productCount),
      pricedInShops: Number(products.pricedInShops || 0),
      purchaseCount: Number(purchases.purchaseCount),
      purchaseTotal: Number(purchases.purchaseTotal),
      reviewCount: Number(reviews.reviewCount),
      averageRating: reviews.averageRating === null ? null : Number(reviews.averageRating),
    });
  } catch (err) {
    return error(res, err.message);
  }
};

const getProducts = async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let where = ' WHERE ps.supplierID = ?';
  const params = [req.organizationID];
  if (search) { where += ' AND (p.name LIKE ? OR ps.supplierProductCode LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  try {
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM productsupplier ps JOIN product p ON p.productID = ps.productID${where}`,
      params
    );
    const [rows] = await db.query(
      `SELECT ps.productID, ps.supplierProductCode, ps.supplierUnitPrice,
              p.name, p.sellUnitPrice, (p.brokerImage IS NOT NULL) AS hasImage,
              (SELECT COUNT(*) FROM productsupplierlocation psl
               WHERE psl.supplierID = ps.supplierID AND psl.productID = ps.productID) AS shopPriceCount
       FROM productsupplier ps
       JOIN product p ON p.productID = ps.productID
       ${where}
       ORDER BY p.name
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    return success(res, {
      rows: rows.map((r) => ({ ...r, hasImage: !!r.hasImage })),
      total,
      page: Number(page),
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    return error(res, err.message);
  }
};

// Search SBO's catalogue for products to add, flagging the ones already supplied.
const searchCatalog = async (req, res) => {
  const search = (req.query.search || '').trim();
  if (!search) return success(res, []);
  try {
    const [rows] = await db.query(
      `SELECT p.productID, p.name, p.sellUnitPrice, (p.brokerImage IS NOT NULL) AS hasImage,
              (ps.productID IS NOT NULL) AS alreadySupplied
       FROM product p
       LEFT JOIN productsupplier ps ON ps.productID = p.productID AND ps.supplierID = ?
       WHERE p.name LIKE ?
       ORDER BY p.name
       LIMIT 10`,
      [req.organizationID, `%${search}%`]
    );
    return success(res, rows.map((r) => ({ ...r, hasImage: !!r.hasImage, alreadySupplied: !!r.alreadySupplied })));
  } catch (err) {
    return error(res, err.message);
  }
};

const getProduct = async (req, res) => {
  const { productID } = req.params;
  try {
    const [[product]] = await db.query(
      `SELECT ps.productID, ps.supplierProductCode, ps.supplierUnitPrice,
              p.name, p.description, p.sellUnitPrice, p.madeIn, (p.brokerImage IS NOT NULL) AS hasImage
       FROM productsupplier ps
       JOIN product p ON p.productID = ps.productID
       WHERE ps.supplierID = ? AND ps.productID = ?`,
      [req.organizationID, productID]
    );
    if (!product) return error(res, 'Produit introuvable dans votre catalogue', 404);

    // Every SBO shop location, with this supplier's price there if one is set.
    const [locations] = await db.query(
      `SELECT l.locationID, l.locationName, c.name AS cityName, psl.supplierAreaUnitPrice
       FROM location l
       LEFT JOIN address a ON a.addressID = l.addressID
       LEFT JOIN city c ON c.cityID = a.cityID
       LEFT JOIN productsupplierlocation psl
              ON psl.locationID = l.locationID AND psl.productID = ? AND psl.supplierID = ?
       ORDER BY l.locationName`,
      [productID, req.organizationID]
    );
    return success(res, { ...product, hasImage: !!product.hasImage, locations });
  } catch (err) {
    return error(res, err.message);
  }
};

// Add a catalogue product to the supplier's offer, or update its code/price.
const upsertProduct = async (req, res) => {
  const { productID } = req.params;
  const { supplierProductCode, supplierUnitPrice } = req.body;
  try {
    const [[product]] = await db.query('SELECT productID FROM product WHERE productID = ?', [productID]);
    if (!product) return error(res, 'Produit introuvable', 404);

    const [result] = await db.query(
      `INSERT INTO productsupplier (productID, supplierID, supplierProductCode, supplierUnitPrice)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE supplierProductCode = VALUES(supplierProductCode), supplierUnitPrice = VALUES(supplierUnitPrice)`,
      [productID, req.organizationID, supplierProductCode || null, Number(supplierUnitPrice)]
    );
    // affectedRows is 1 for an insert, 2 for an update (0 if nothing changed).
    const created = result.affectedRows === 1;
    return success(res, null, created ? 'Produit ajouté' : 'Produit mis à jour', created ? 201 : 200);
  } catch (err) {
    return error(res, err.message);
  }
};

const removeProduct = async (req, res) => {
  const { productID } = req.params;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      'DELETE FROM productsupplierlocation WHERE productID = ? AND supplierID = ?',
      [productID, req.organizationID]
    );
    const [result] = await conn.query(
      'DELETE FROM productsupplier WHERE productID = ? AND supplierID = ?',
      [productID, req.organizationID]
    );
    if (!result.affectedRows) {
      await conn.rollback();
      return error(res, 'Produit introuvable dans votre catalogue', 404);
    }
    await conn.commit();
    return success(res, null, 'Produit retiré');
  } catch (err) {
    await conn.rollback();
    return error(res, err.message);
  } finally {
    conn.release();
  }
};

const setShopPrice = async (req, res) => {
  const { productID, locationID } = req.params;
  try {
    // A per-shop price only makes sense for a product the supplier actually offers.
    const [[link]] = await db.query(
      'SELECT 1 AS ok FROM productsupplier WHERE productID = ? AND supplierID = ?',
      [productID, req.organizationID]
    );
    if (!link) return error(res, 'Ajoutez d’abord ce produit à votre catalogue', 404);
    const [[location]] = await db.query('SELECT locationID FROM location WHERE locationID = ?', [locationID]);
    if (!location) return error(res, 'Boutique introuvable', 404);

    await db.query(
      `INSERT INTO productsupplierlocation (productID, supplierID, locationID, supplierAreaUnitPrice)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE supplierAreaUnitPrice = VALUES(supplierAreaUnitPrice)`,
      [productID, req.organizationID, locationID, Number(req.body.supplierAreaUnitPrice)]
    );
    return success(res, null, 'Prix enregistré');
  } catch (err) {
    return error(res, err.message);
  }
};

const removeShopPrice = async (req, res) => {
  const { productID, locationID } = req.params;
  try {
    await db.query(
      'DELETE FROM productsupplierlocation WHERE productID = ? AND supplierID = ? AND locationID = ?',
      [productID, req.organizationID, locationID]
    );
    return success(res, null, 'Prix retiré');
  } catch (err) {
    return error(res, err.message);
  }
};

const getPurchases = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM purchase WHERE supplierID = ?', [req.organizationID]);
    const [rows] = await db.query(
      `SELECT pu.purchaseID, pu.purchaseDate, pu.receivedDate, pu.total, t.name AS transporterName, st.storeName,
              (SELECT COUNT(*) FROM purchasedetails pd WHERE pd.purchaseID = pu.purchaseID) AS itemCount
       FROM purchase pu
       LEFT JOIN transporter t ON t.transporterID = pu.transporterID
       LEFT JOIN store st ON st.storeID = pu.storeID
       WHERE pu.supplierID = ?
       ORDER BY pu.purchaseDate DESC
       LIMIT ? OFFSET ?`,
      [req.organizationID, Number(limit), Number(offset)]
    );
    return success(res, { rows, total, page: Number(page), totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    return error(res, err.message);
  }
};

const getPurchase = async (req, res) => {
  try {
    const [[purchase]] = await db.query(
      `SELECT pu.purchaseID, pu.purchaseDate, pu.receivedDate, pu.subTotal, pu.tax, pu.transportCost, pu.total,
              b.name AS brokerName, t.name AS transporterName, st.storeName,
              CONCAT(bc.firstName, ' ', bc.lastName) AS brokerContactName, bc.email AS brokerContactEmail
       FROM purchase pu
       LEFT JOIN broker b ON b.brokerID = pu.brokerID
       LEFT JOIN transporter t ON t.transporterID = pu.transporterID
       LEFT JOIN contact bc ON bc.contactID = pu.brokerContactID
       LEFT JOIN store st ON st.storeID = pu.storeID
       WHERE pu.purchaseID = ? AND pu.supplierID = ?`,
      [req.params.id, req.organizationID]
    );
    if (!purchase) return error(res, 'Commande introuvable', 404);
    const [details] = await db.query(
      `SELECT pd.productID, pd.quantity, pd.unitPrice, pd.total, p.name AS productName, ps.supplierProductCode,
              (ps.productID IS NOT NULL) AS inCatalog
       FROM purchasedetails pd
       JOIN product p ON p.productID = pd.productID
       LEFT JOIN productsupplier ps ON ps.productID = pd.productID AND ps.supplierID = ?
       WHERE pd.purchaseID = ?
       ORDER BY p.name`,
      [req.organizationID, req.params.id]
    );
    return success(res, { ...purchase, details: details.map((d) => ({ ...d, inCatalog: !!d.inCatalog })) });
  } catch (err) {
    return error(res, err.message);
  }
};

const getReviews = async (req, res) => {
  try {
    const [reviews] = await db.query(
      `SELECT sr.supplierReviewID, sr.ratingValue, sr.evaluatedDate, sr.reviewMessage,
              c.firstName, LEFT(c.lastName, 1) AS lastInitial
       FROM supplierreview sr
       LEFT JOIN contact c ON c.contactID = sr.contactID
       WHERE sr.supplierID = ?
       ORDER BY sr.evaluatedDate DESC`,
      [req.organizationID]
    );
    // Computed live rather than read from averagesupplierreview, which nothing keeps up to date.
    const distribution = [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: reviews.filter((r) => Math.round(r.ratingValue) === stars).length,
    }));
    const averageRating = reviews.length
      ? reviews.reduce((sum, r) => sum + r.ratingValue, 0) / reviews.length
      : null;
    return success(res, { averageRating, total: reviews.length, distribution, reviews });
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = {
  getSummary, getProducts, searchCatalog, getProduct, upsertProduct, removeProduct,
  setShopPrice, removeShopPrice, getPurchases, getPurchase, getReviews,
};
