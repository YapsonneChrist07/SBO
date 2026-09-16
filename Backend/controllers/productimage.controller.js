const db = require('../config/db');
const { success, error } = require('../utils/response');

const getImages = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT imageID, productID FROM productimage WHERE productID = ?',
      [req.params.productID]
    );
    return success(res, rows);
  } catch (err) {
    return error(res, err.message);
  }
};

const getImageById = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT imageValue FROM productimage WHERE imageID = ? AND productID = ?',
      [req.params.imageID, req.params.productID]
    );
    if (!rows.length) return error(res, 'Image not found', 404);
    const imageBuffer = rows[0].imageValue;
    res.set('Content-Type', 'image/jpeg');
    return res.send(imageBuffer);
  } catch (err) {
    return error(res, err.message);
  }
};

const uploadImage = async (req, res) => {
  try {
    if (!req.body.imageBase64) return error(res, 'imageBase64 field is required', 400);
    const imageBuffer = Buffer.from(req.body.imageBase64, 'base64');
    const [result] = await db.query(
      'INSERT INTO productimage (productID, imageValue) VALUES (?,?)',
      [req.params.productID, imageBuffer]
    );
    return success(res, { imageID: result.insertId }, 'Image uploaded', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

const deleteImage = async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM productimage WHERE imageID = ? AND productID = ?',
      [req.params.imageID, req.params.productID]
    );
    if (!result.affectedRows) return error(res, 'Image not found', 404);
    return success(res, null, 'Image deleted');
  } catch (err) {
    return error(res, err.message);
  }
};

module.exports = { getImages, getImageById, uploadImage, deleteImage };
