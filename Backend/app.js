require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// Behind a hosting proxy (Render, Railway, nginx…) every request arrives from the proxy's
// IP; tell Express how many proxy hops to trust so rate limits apply per real visitor.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// CORS_ORIGIN: comma-separated list of sites allowed to call the API (the deployed
// frontend). Unset = any origin, which is fine locally. Auth uses the Authorization
// header, not cookies, so this limits which sites can use the API rather than CSRF.
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors(allowedOrigins?.length ? { origin: allowedOrigins } : undefined));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => res.json({ message: 'SBO API is running', version: '1.0.0' }));
app.use('/api', routes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

module.exports = app;
