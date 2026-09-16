const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

const createProductReview = async (req, res) => {
  const { productID, clientID, ratingValue, reviewMessage } = req.body;
  if (!productID) return error(res, 'productID is required', 400);
  const rating = Number(ratingValue);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return error(res, 'ratingValue must be an integer between 1 and 5', 400);
  }
  try {
    const reviewID = generateId();
    await db.query(
      `INSERT INTO productreview (productReviewID, productID, clientID, contactID, ratingValue, evaluatedDate, reviewMessage)
       VALUES (?,?,?,?,?,NOW(),?)`,
      [reviewID, productID, clientID || null, req.user.contactID, rating, reviewMessage || null]
    );
    return success(res, { reviewID }, 'Review submitted', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

const createSupplierReview = async (req, res) => {
  const { supplierID, clientID, ratingValue, reviewMessage } = req.body;
  try {
    const reviewID = generateId();
    await db.query(
      `INSERT INTO supplierreview (supplierReviewID, supplierID, clientID, contactID, ratingValue, evaluatedDate, reviewMessage)
       VALUES (?,?,?,?,?,NOW(),?)`,
      [reviewID, supplierID, clientID || null, req.user.contactID, ratingValue, reviewMessage || null]
    );
    return success(res, { reviewID }, 'Review submitted', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

const getProductRatings = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM averageproductratings WHERE productID = ?', [req.params.productID]);
    return success(res, rows[0] || {});
  } catch (err) {
    return error(res, err.message);
  }
};

const getSupplierRatings = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM averagesupplierreview WHERE supplierID = ?', [req.params.supplierID]);
    return success(res, rows[0] || {});
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { createProductReview, createSupplierReview, getProductRatings, getSupplierRatings };
