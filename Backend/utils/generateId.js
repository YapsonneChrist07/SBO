const { v4: uuidv4 } = require('uuid');

const generateId = () => uuidv4().replace(/-/g, '').substring(0, 15).toUpperCase();

module.exports = generateId;
