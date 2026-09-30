const db = require('../config/db');
const generateId = require('../utils/generateId');
const { success, error } = require('../utils/response');

// Countries, Regions, Cities
const getCountries = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM country ORDER BY name');
    return success(res, rows);
  } catch (err) { return error(res, err.message); }
};

const getRegions = async (req, res) => {
  try {
    const { countryID } = req.query;
    let query = 'SELECT r.*, c.name AS countryName FROM region r JOIN country c ON c.countryID = r.countryID WHERE 1=1';
    const params = [];
    if (countryID) { query += ' AND r.countryID = ?'; params.push(countryID); }
    query += ' ORDER BY r.name';
    const [rows] = await db.query(query, params);
    return success(res, rows);
  } catch (err) { return error(res, err.message); }
};

const getCities = async (req, res) => {
  try {
    const { regionID } = req.query;
    let query = 'SELECT c.*, r.name AS regionName FROM city c JOIN region r ON r.regionID = c.regionID WHERE 1=1';
    const params = [];
    if (regionID) { query += ' AND c.regionID = ?'; params.push(regionID); }
    query += ' ORDER BY c.name';
    const [rows] = await db.query(query, params);
    return success(res, rows);
  } catch (err) { return error(res, err.message); }
};

// Colors & Lengths
const getColors = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM colorlookup ORDER BY colorValue');
    return success(res, rows);
  } catch (err) { return error(res, err.message); }
};

const getLengths = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM lenghtlookup ORDER BY lenghtValue');
    return success(res, rows);
  } catch (err) { return error(res, err.message); }
};

// Zones & Trajects
const getZones = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM zone ORDER BY name');
    return success(res, rows);
  } catch (err) { return error(res, err.message); }
};

const getTrajects = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT t.*, z.name AS zoneName FROM traject t LEFT JOIN zone z ON z.zoneID = t.zoneID ORDER BY t.departureCountry'
    );
    return success(res, rows);
  } catch (err) { return error(res, err.message); }
};

// Weight & Volume limits
const getWeightLimits = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM weightlimit ORDER BY weightMax');
    return success(res, rows);
  } catch (err) { return error(res, err.message); }
};

const getVolumeLimits = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM volumelimit ORDER BY volumeMax');
    return success(res, rows);
  } catch (err) { return error(res, err.message); }
};

// Product hierarchy
const getProductDivisions = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM productdivision ORDER BY name');
    return success(res, rows);
  } catch (err) { return error(res, err.message); }
};

const getProductLines = async (req, res) => {
  try {
    const { divisionID } = req.query;
    let query = 'SELECT pl.*, pd.name AS divisionName FROM productline pl LEFT JOIN productdivision pd ON pd.productDivisionID = pl.productDivisionID WHERE 1=1';
    const params = [];
    if (divisionID) { query += ' AND pl.productDivisionID = ?'; params.push(divisionID); }
    query += ' ORDER BY pl.name';
    const [rows] = await db.query(query, params);
    return success(res, rows);
  } catch (err) { return error(res, err.message); }
};

const getProductTypes = async (req, res) => {
  try {
    const { lineID } = req.query;
    let query = 'SELECT pt.*, pl.name AS lineName FROM producttype pt LEFT JOIN productline pl ON pl.productLineID = pt.productLineID WHERE 1=1';
    const params = [];
    if (lineID) { query += ' AND pt.productLineID = ?'; params.push(lineID); }
    query += ' ORDER BY pt.name';
    const [rows] = await db.query(query, params);
    return success(res, rows);
  } catch (err) { return error(res, err.message); }
};

// Product hierarchy: admin CRUD
const createDivision = async (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) return error(res, 'Le nom est requis', 400);
  try {
    const productDivisionID = generateId();
    await db.query('INSERT INTO productdivision (productDivisionID, name, description) VALUES (?,?,?)',
      [productDivisionID, name.trim(), description || null]);
    return success(res, { productDivisionID }, 'Division créée', 201);
  } catch (err) { return error(res, err.message); }
};

const updateDivision = async (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim()) return error(res, 'Le nom est requis', 400);
  try {
    const [result] = await db.query('UPDATE productdivision SET name=?, description=? WHERE productDivisionID=?',
      [name.trim(), description || null, req.params.id]);
    if (!result.affectedRows) return error(res, 'Division introuvable', 404);
    return success(res, null, 'Division mise à jour');
  } catch (err) { return error(res, err.message); }
};

const removeDivision = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM productdivision WHERE productDivisionID=?', [req.params.id]);
    if (!result.affectedRows) return error(res, 'Division introuvable', 404);
    return success(res, null, 'Division supprimée');
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      return error(res, 'Impossible de supprimer : des rayons utilisent encore cette division', 409);
    }
    return error(res, err.message);
  }
};

const createLine = async (req, res) => {
  const { name, description, productDivisionID } = req.body;
  if (!name?.trim()) return error(res, 'Le nom est requis', 400);
  try {
    const productLineID = generateId();
    await db.query('INSERT INTO productline (productLineID, productDivisionID, name, description) VALUES (?,?,?,?)',
      [productLineID, productDivisionID || null, name.trim(), description || null]);
    return success(res, { productLineID }, 'Rayon créé', 201);
  } catch (err) { return error(res, err.message); }
};

const updateLine = async (req, res) => {
  const { name, description, productDivisionID } = req.body;
  if (!name?.trim()) return error(res, 'Le nom est requis', 400);
  try {
    const [result] = await db.query('UPDATE productline SET name=?, description=?, productDivisionID=? WHERE productLineID=?',
      [name.trim(), description || null, productDivisionID || null, req.params.id]);
    if (!result.affectedRows) return error(res, 'Rayon introuvable', 404);
    return success(res, null, 'Rayon mis à jour');
  } catch (err) { return error(res, err.message); }
};

const removeLine = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM productline WHERE productLineID=?', [req.params.id]);
    if (!result.affectedRows) return error(res, 'Rayon introuvable', 404);
    return success(res, null, 'Rayon supprimé');
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      return error(res, 'Impossible de supprimer : des catégories utilisent encore ce rayon', 409);
    }
    return error(res, err.message);
  }
};

const createType = async (req, res) => {
  const { name, description, productLineID } = req.body;
  if (!name?.trim()) return error(res, 'Le nom est requis', 400);
  try {
    const productTypeID = generateId();
    await db.query('INSERT INTO producttype (productTypeID, productLineID, name, description) VALUES (?,?,?,?)',
      [productTypeID, productLineID || null, name.trim(), description || null]);
    return success(res, { productTypeID }, 'Catégorie créée', 201);
  } catch (err) { return error(res, err.message); }
};

const updateType = async (req, res) => {
  const { name, description, productLineID } = req.body;
  if (!name?.trim()) return error(res, 'Le nom est requis', 400);
  try {
    const [result] = await db.query('UPDATE producttype SET name=?, description=?, productLineID=? WHERE productTypeID=?',
      [name.trim(), description || null, productLineID || null, req.params.id]);
    if (!result.affectedRows) return error(res, 'Catégorie introuvable', 404);
    return success(res, null, 'Catégorie mise à jour');
  } catch (err) { return error(res, err.message); }
};

const removeType = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM producttype WHERE productTypeID=?', [req.params.id]);
    if (!result.affectedRows) return error(res, 'Catégorie introuvable', 404);
    return success(res, null, 'Catégorie supprimée');
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      return error(res, 'Impossible de supprimer : des produits utilisent encore cette catégorie', 409);
    }
    return error(res, err.message);
  }
};

const getBrands = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM brand ORDER BY name');
    return success(res, rows);
  } catch (err) { return error(res, err.message); }
};

// Type lookups
const getClientTypes = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM clienttype');
    return success(res, rows);
  } catch (err) { return error(res, err.message); }
};

const getSupplierTypes = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM suppliertype');
    return success(res, rows);
  } catch (err) { return error(res, err.message); }
};

const getBrokerTypes = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM brokertype');
    return success(res, rows);
  } catch (err) { return error(res, err.message); }
};

const getTransporterTypes = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM transportertype');
    return success(res, rows);
  } catch (err) { return error(res, err.message); }
};

module.exports = {
  getCountries, getRegions, getCities,
  getColors, getLengths,
  getZones, getTrajects,
  getWeightLimits, getVolumeLimits,
  getProductDivisions, getProductLines, getProductTypes, getBrands,
  getClientTypes, getSupplierTypes, getBrokerTypes, getTransporterTypes,
  createDivision, updateDivision, removeDivision,
  createLine, updateLine, removeLine,
  createType, updateType, removeType,
};
