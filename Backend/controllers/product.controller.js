const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

const SORT_MAP = {
  newest: 'p.createdDate DESC',
  oldest: 'p.createdDate ASC',
  price_asc: 'p.sellUnitPrice IS NULL, p.sellUnitPrice ASC',
  price_desc: 'p.sellUnitPrice DESC',
  name: 'p.name ASC',
  discount: 'pd.rebate DESC',
};

const getAll = async (req, res) => {
  try {
    const { search, productTypeID, brandID, productLineID, sort, onDeal, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(60, Math.max(1, Number(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const where = ['1=1'];
    const params = [];
    if (search) { where.push('(p.name LIKE ? OR p.description LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    if (productTypeID) { where.push('p.productTypeID = ?'); params.push(productTypeID); }
    if (brandID) { where.push('p.brandID = ?'); params.push(brandID); }
    if (productLineID) {
      const ids = String(productLineID).split(',').map((s) => s.trim()).filter(Boolean);
      if (ids.length) {
        where.push(`pt.productLineID IN (${ids.map(() => '?').join(',')})`);
        params.push(...ids);
      }
    }
    const whereSql = where.join(' AND ');
    const isDeal = onDeal === 'true';
    const orderSql = SORT_MAP[sort] || SORT_MAP.newest;
    // Only currently-active promotions (NOW() between start/end) count as a "deal".
    const dealJoin = isDeal
      ? `JOIN promotiondetails pd ON pd.productID = p.productID AND pd.currentPrice > 0
         JOIN promotion promo ON promo.promotionID = pd.promotionID AND NOW() BETWEEN promo.startDate AND promo.endDate`
      : '';
    const dealSelect = isDeal
      ? ', pd.previousPrice AS dealPreviousPrice, pd.currentPrice AS dealCurrentPrice, pd.rebate AS dealRebate'
      : '';

    const [rows] = await db.query(
      `SELECT p.productID, p.name, p.description, p.sellUnitPrice, p.madeIn,
              p.color, p.rawMaterial, p.weight, p.volume, p.length, p.height, p.width,
              p.createdDate, p.lastModifiedDate,
              (p.brokerImage IS NOT NULL) AS hasImage,
              pt.name AS productTypeName, pt.productLineID${dealSelect}
       FROM product p
       LEFT JOIN producttype pt ON pt.productTypeID = p.productTypeID
       ${dealJoin}
       WHERE ${whereSql}
       ORDER BY ${orderSql}
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM product p
       LEFT JOIN producttype pt ON pt.productTypeID = p.productTypeID
       ${dealJoin}
       WHERE ${whereSql}`,
      params
    );

    return success(res, {
      products: rows.map((r) => ({ ...r, hasImage: !!r.hasImage })),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    });
  } catch (err) {
    return error(res, err.message);
  }
};

const getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.productID, p.name, p.description, p.brandID, p.productTypeID, p.madeIn,
              p.sellUnitPrice, p.length, p.height, p.width, p.weight, p.volume,
              p.color, p.rawMaterial, p.specsDetails, p.createdDate, p.lastModifiedDate,
              (p.brokerImage IS NOT NULL) AS hasImage,
              (p.brokerVideo IS NOT NULL) AS hasVideo,
              b.name AS brandName, pt.name AS productTypeName,
              pt.productLineID, pl.name AS productLineName,
              deal.previousPrice AS dealPreviousPrice, deal.currentPrice AS dealCurrentPrice, deal.rebate AS dealRebate
       FROM product p
       LEFT JOIN brand b ON b.brandID = p.brandID
       LEFT JOIN producttype pt ON pt.productTypeID = p.productTypeID
       LEFT JOIN productline pl ON pl.productLineID = pt.productLineID
       LEFT JOIN (
         SELECT pd.productID, pd.previousPrice, pd.currentPrice, pd.rebate
         FROM promotiondetails pd
         JOIN promotion promo ON promo.promotionID = pd.promotionID AND NOW() BETWEEN promo.startDate AND promo.endDate
         WHERE pd.currentPrice > 0
       ) deal ON deal.productID = p.productID
       WHERE p.productID = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Product not found', 404);
    const product = { ...rows[0], hasImage: !!rows[0].hasImage, hasVideo: !!rows[0].hasVideo };

    const [images] = await db.query('SELECT imageID, productID FROM productimage WHERE productID = ?', [req.params.id]);
    // Public endpoint: supplier names only — never the wholesale price SBO pays them.
    const [suppliers] = await db.query(
      `SELECT s.supplierID, s.name
       FROM productsupplier ps JOIN supplier s ON s.supplierID = ps.supplierID
       WHERE ps.productID = ? AND s.status = 'active'`,
      [req.params.id]
    );
    const [reviews] = await db.query(
      `SELECT pr.*, c.firstName, c.lastName FROM productreview pr
       LEFT JOIN contact c ON c.contactID = pr.contactID
       WHERE pr.productID = ? ORDER BY pr.evaluatedDate DESC`,
      [req.params.id]
    );
    return success(res, { ...product, images, suppliers, reviews });
  } catch (err) {
    return error(res, err.message);
  }
};

const getImage = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT brokerImage FROM product WHERE productID = ?', [req.params.id]);
    if (!rows.length || !rows[0].brokerImage) return error(res, 'Image not found', 404);
    const buf = rows[0].brokerImage;
    let type = 'image/jpeg';
    if (buf[0] === 0x89 && buf[1] === 0x50) type = 'image/png';
    else if (buf[0] === 0x47 && buf[1] === 0x49) type = 'image/gif';
    else if (buf[0] === 0x52 && buf[1] === 0x49 && buf[8] === 0x57) type = 'image/webp';
    res.set('Content-Type', type);
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(buf);
  } catch (err) {
    return error(res, err.message);
  }
};

const create = async (req, res) => {
  const { name, description, brandID, productTypeID, madeIn, sellUnitPrice,
          length, height, width, weight, volume, color, rawMaterial } = req.body;
  try {
    const productID = generateId();
    await db.query(
      `INSERT INTO product (productID, name, description, brandID, productTypeID, madeIn,
       sellUnitPrice, length, height, width, weight, volume, color, rawMaterial, createdDate, lastModifiedDate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [productID, name, description || null, brandID || null, productTypeID || null, madeIn || null,
       sellUnitPrice || null, length || null, height || null, width || null,
       weight || null, volume || null, color || null, rawMaterial || null]
    );
    return success(res, { productID }, 'Product created', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

const update = async (req, res) => {
  const { name, description, brandID, productTypeID, madeIn, sellUnitPrice,
          length, height, width, weight, volume, color, rawMaterial } = req.body;
  try {
    const [result] = await db.query(
      `UPDATE product SET name=?, description=?, brandID=?, productTypeID=?, madeIn=?,
       sellUnitPrice=?, length=?, height=?, width=?, weight=?, volume=?, color=?, rawMaterial=?, lastModifiedDate=NOW()
       WHERE productID=?`,
      [name, description || null, brandID || null, productTypeID || null, madeIn || null,
       sellUnitPrice || null, length || null, height || null, width || null,
       weight || null, volume || null, color || null, rawMaterial || null, req.params.id]
    );
    if (!result.affectedRows) return error(res, 'Product not found', 404);
    return success(res, null, 'Product updated');
  } catch (err) {
    return error(res, err.message);
  }
};

const PATCHABLE_FIELDS = [
  'name', 'description', 'brandID', 'productTypeID', 'madeIn', 'sellUnitPrice',
  'length', 'height', 'width', 'weight', 'volume', 'color', 'rawMaterial',
];

const patch = async (req, res) => {
  const fields = Object.keys(req.body).filter((k) => PATCHABLE_FIELDS.includes(k));
  if (!fields.length) return error(res, 'No valid fields to update', 400);
  try {
    const setSql = fields.map((f) => `${f} = ?`).join(', ');
    const params = fields.map((f) => req.body[f]);
    const [result] = await db.query(
      `UPDATE product SET ${setSql}, lastModifiedDate = NOW() WHERE productID = ?`,
      [...params, req.params.id]
    );
    if (!result.affectedRows) return error(res, 'Product not found', 404);
    return success(res, null, 'Product updated');
  } catch (err) {
    return error(res, err.message);
  }
};

const remove = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM product WHERE productID = ?', [req.params.id]);
    if (!result.affectedRows) return error(res, 'Product not found', 404);
    return success(res, null, 'Product deleted');
  } catch (err) {
    return error(res, err.message);
  }
};

const getInventory = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT i.*, s.storeName FROM inventory i JOIN store s ON s.storeID = i.storeID WHERE i.productID = ?`,
      [req.params.id]
    );
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

const getPromotions = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT pd.*, p.startDate, p.endDate FROM promotiondetails pd
       JOIN promotion p ON p.promotionID = pd.promotionID
       WHERE pd.productID = ? AND NOW() BETWEEN p.startDate AND p.endDate`,
      [req.params.id]
    );
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getAll, getById, getImage, create, update, patch, remove, getInventory, getPromotions };
