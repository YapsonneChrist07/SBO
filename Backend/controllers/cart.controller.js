const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');
const { currentUnitPrices } = require('../utils/pricing');

const getCart = async (req, res) => {
  try {
    const [carts] = await db.query('SELECT * FROM cart WHERE cartID = ?', [req.params.cartID]);
    if (!carts.length) return error(res, 'Cart not found', 404);
    const [items] = await db.query(
      `SELECT cd.*, p.name AS productName, p.sellUnitPrice, l.lenghtValue
       FROM cartdetails cd
       JOIN product p ON p.productID = cd.productID
       LEFT JOIN lenghtlookup l ON l.lenghtID = cd.lenghtID
       WHERE cd.cartID = ?`,
      [req.params.cartID]
    );
    return success(res, { ...carts[0], items });
  } catch (err) {
    return error(res, err.message);
  }
};

const createCart = async (req, res) => {
  try {
    const cartID = generateId();
    await db.query('INSERT INTO cart (cartID, createdDate, nbrOfCartItems, subTotal, total) VALUES (?,NOW(),0,0,0)', [cartID]);
    return success(res, { cartID }, 'Cart created', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

const addItem = async (req, res) => {
  const { productID, quantity, lenghtID } = req.body;
  const { cartID } = req.params;
  try {
    // Charge the active-deal price if this product currently has one, so checkout matches
    // whatever discounted price the storefront displayed.
    const prices = await currentUnitPrices(db, [productID]);
    if (!prices.has(productID)) return error(res, 'Product not found', 404);
    const unitPrice = prices.get(productID);
    const total = unitPrice * quantity;

    await db.query(
      `INSERT INTO cartdetails (cartID, productID, lenghtID, quantity, unitPrice, total)
       VALUES (?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE quantity=VALUES(quantity), total=VALUES(total)`,
      [cartID, productID, lenghtID || null, quantity, unitPrice, total]
    );

    await recalcCart(cartID);
    return success(res, null, 'Item added to cart');
  } catch (err) {
    return error(res, err.message);
  }
};

const removeItem = async (req, res) => {
  const { cartID, productID } = req.params;
  try {
    await db.query('DELETE FROM cartdetails WHERE cartID=? AND productID=?', [cartID, productID]);
    await recalcCart(cartID);
    return success(res, null, 'Item removed from cart');
  } catch (err) {
    return error(res, err.message);
  }
};

const clearCart = async (req, res) => {
  try {
    await db.query('DELETE FROM cartdetails WHERE cartID=?', [req.params.cartID]);
    await db.query('UPDATE cart SET nbrOfCartItems=0, subTotal=0, total=0 WHERE cartID=?', [req.params.cartID]);
    return success(res, null, 'Cart cleared');
  } catch (err) {
    return error(res, err.message);
  }
};

async function recalcCart(cartID) {
  const [[agg]] = await db.query(
    'SELECT COUNT(*) AS cnt, COALESCE(SUM(total),0) AS sub FROM cartdetails WHERE cartID=?',
    [cartID]
  );
  await db.query(
    'UPDATE cart SET nbrOfCartItems=?, subTotal=?, total=? WHERE cartID=?',
    [agg.cnt, agg.sub, agg.sub, cartID]
  );
}

module.exports = { getCart, createCart, addItem, removeItem, clearCart };
