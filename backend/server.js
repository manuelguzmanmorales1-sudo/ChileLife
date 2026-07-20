require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { connectDB, disconnectDB } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: (origin, callback) => {
    const permitidos = ['http://localhost:3000', 'http://127.0.0.1:3000'];
    // En Vercel, el sitio se sirve desde el mismo dominio que la API,
    // así que basta con permitir *.vercel.app además de tu dominio propio si tienes uno.
    if (!origin || permitidos.includes(origin) || /\.vercel\.app$/.test(new URL(origin).hostname)) {
      return callback(null, true);
    }
    callback(new Error('No permitido por CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 500,
  message: { error: 'Demasiadas peticiones. Intenta de nuevo en un momento.' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Demasiados intentos de autenticación. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

const compraLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Demasiadas compras. Espera un momento.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(generalLimiter);
app.use(express.json({ limit: '10kb' }));

app.use((req, res, next) => {
  if (req.body) {
    const sanitize = (obj) => {
      for (let key in obj) {
        if (key.startsWith('$') || key.startsWith('_')) {
          delete obj[key];
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    };
    sanitize(req.body);
  }
  next();
});

app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/roblox', require('./routes/roblox'));
app.use('/api/denuncias', require('./routes/denuncias'));
app.use('/api/funcionarios', require('./routes/funcionarios'));
app.use('/api/investigaciones', require('./routes/investigaciones'));
app.use('/api/personas-buscadas', require('./routes/personasBuscadas'));
app.use('/api/incautaciones', require('./routes/incautaciones'));
app.use('/api/multas', require('./routes/multas'));
app.use('/api/vehiculos', require('./routes/vehiculos'));
app.use('/api/bienes', require('./routes/bienes'));
app.use('/api/antecedentes', require('./routes/antecedentes'));
app.use('/api/sumarios', require('./routes/sumarios'));
app.use('/api/blackmarket', require('./routes/blackMarket'));
app.use('/api/tienda', compraLimiter, require('./routes/tienda'));
app.use('/api/concesionario', compraLimiter, require('./routes/concesionario'));
app.use('/api/snsm', require('./routes/snsm'));
app.use('/api/propiedades', require('./routes/propiedades'));
app.use('/api/empresas', require('./routes/empresas'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/banco', require('./routes/banco'));
app.use('/api/od', compraLimiter, require('./routes/od'));
app.use('/api/sueldos', require('./routes/sueldos'));
app.use('/api/roles', require('./routes/roles'));
app.use('/api/economia', require('./routes/economia'));
app.use('/api/hospital', require('./routes/hospital'));
app.use('/api/pertenencias', require('./routes/pertenencias'));

// Endpoint que dispara Vercel Cron (1 vez al día alcanza, porque el sueldo
// es "cada 3 días" — cada corrida solo paga a quien ya cumplió su plazo).
// Protegido con el CRON_SECRET que Vercel inyecta solo.
app.get('/api/cron/sueldos', async (req, res) => {
  const secretEsperado = process.env.CRON_SECRET;
  if (secretEsperado && req.headers.authorization !== `Bearer ${secretEsperado}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    const { pagarSueldosAutomaticos } = require('./utils/pagarSueldosAutomaticos');
    await pagarSueldosAutomaticos();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.disable('x-powered-by');

app.use(express.static(path.join(__dirname, '..'), {
  etag: true,
  lastModified: true
}));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
  }
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

async function start() {
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`[Server] Chile Life corriendo en http://localhost:${PORT}`);
    console.log(`[Server] API base: http://localhost:${PORT}/api`);
    console.log(`[Server] Seguridad: Helmet + RateLimit + CORS activados`);
  });

  // El setInterval solo tiene sentido corriendo local/servidor propio.
  // En Vercel (serverless) esto lo reemplaza el Cron Job de /api/cron/sueldos.
  const { pagarSueldosAutomaticos } = require('./utils/pagarSueldosAutomaticos');
  setInterval(pagarSueldosAutomaticos, 10 * 60 * 1000);
  console.log('[Server] Sueldos automáticos (por rol fijo): revisión cada 10 min');

  process.on('SIGINT', async () => {
    server.close();
    await disconnectDB();
    process.exit(0);
  });
}

if (process.env.VERCEL) {
  // En Vercel no se llama a app.listen(): cada request instancia esta función.
  // La conexión se valida on-demand porque Supabase es HTTP, no hace falta
  // "mantener" nada abierto entre invocaciones.
  module.exports = app;
} else {
  start();
}