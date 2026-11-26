require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const passwordResetRoutes = require('./routes/password-reset.routes');
const familyRoutes = require('./routes/family.routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());

const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080', 'http://127.0.0.1:8080', 'https://localhost:3443'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '32kb' }));

// Preserve public abuse protection without rate-limiting trusted, high-frequency
// service-to-service family lookups as if they were browser requests.
// Require the real internal key and a narrow method/path allowlist. Internal
// traffic has an independent bounded quota; no arbitrary path is exempt.
const { isInternalKeyValid } = require('./middlewares/authenticate');
const INTERNAL_FAMILY_LOOKUP_PATH = /^\/family\/internal\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/(?:recipients|elderly)\/?$/i;
function trustedInternalRatePath(req) {
  return (req.method === 'POST' && req.path === '/auth/internal/session')
    || (req.method === 'GET' && INTERNAL_FAMILY_LOOKUP_PATH.test(req.path));
}
function isTrustedInternalRequest(req) {
  return trustedInternalRatePath(req) && isInternalKeyValid(req.headers['x-internal-api-key']);
}

app.use(rateLimit({
  windowMs: Number(process.env.INTERNAL_RATE_LIMIT_WINDOW_MS || 900000),
  max: Number(process.env.INTERNAL_RATE_LIMIT_MAX || 5000),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: () => 'aha-internal-allowlisted',
  skip: (req) => !isTrustedInternalRequest(req),
  message: { success: false, message: 'Internal request quota exceeded' },
}));

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  max: Number(process.env.RATE_LIMIT_MAX || 100),
  skip: isTrustedInternalRequest,
});
app.use(limiter);
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', service: 'auth-service' }));
app.use('/auth', authRoutes);
app.use('/auth', passwordResetRoutes);
app.use('/family', familyRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));
app.use(errorHandler);

module.exports = app;

