const db = require('../config/db');
const { success, error } = require('../utils/response');

const getSummary = async (req, res) => {
  try {
    const [[sales]] = await db.query(
      'SELECT COUNT(*) AS totalSells, COALESCE(SUM(total),0) AS totalRevenue FROM sell'
    );
    const [[purchases]] = await db.query(
      'SELECT COUNT(*) AS totalPurchases, COALESCE(SUM(total),0) AS totalPurchaseCost FROM purchase'
    );
    const [[clients]] = await db.query('SELECT COUNT(*) AS totalClients FROM client');
    const [[products]] = await db.query('SELECT COUNT(*) AS totalProducts FROM product');
    const [[suppliers]] = await db.query('SELECT COUNT(*) AS totalSuppliers FROM supplier');
    const [[lowStock]] = await db.query(
      'SELECT COUNT(*) AS lowStockCount FROM inventory WHERE quantityInStock <= minQuantity'
    );
    const [recentSells] = await db.query(
      `SELECT s.sellID, s.sellDate, s.total, c.name AS clientName
       FROM sell s LEFT JOIN client c ON c.clientID = s.clientID
       ORDER BY s.sellDate DESC LIMIT 5`
    );
    const [topProducts] = await db.query(
      `SELECT p.name, SUM(sd.quantity) AS totalSold, SUM(sd.total) AS revenue
       FROM selldetails sd JOIN product p ON p.productID = sd.productID
       GROUP BY sd.productID ORDER BY totalSold DESC LIMIT 5`
    );

    return success(res, {
      sells: sales,
      purchases,
      clients,
      products,
      suppliers,
      lowStock,
      recentSells,
      topProducts,
    });
  } catch (err) {
    return error(res, err.message);
  }
};

const getVisitCount = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM visitcount ORDER BY visitCountID');
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

const getSalesTrend = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT DATE_FORMAT(sellDate, '%Y-%m') AS month,
              COUNT(*) AS orders,
              COALESCE(SUM(total), 0) AS revenue
       FROM sell
       GROUP BY month
       ORDER BY month ASC`
    );
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getSummary, getVisitCount, getSalesTrend };
