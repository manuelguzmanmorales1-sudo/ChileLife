const jwt = require('jsonwebtoken');
const { supabase } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'wcrp_super_secret_jwt_key_2026_chile';

function generateToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
}

async function findUserById(id) {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  if (error) return null;
  return data;
}

async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token requerido' });
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(decoded.id);
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });
    delete user.password;
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    findUserById(decoded.id).then(user => {
      if (user) delete user.password;
      req.user = user || null;
      next();
    }).catch(() => { req.user = null; next(); });
  } catch {
    req.user = null;
    next();
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Autenticación requerida' });
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}

function requireInstitucion(instituciones) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Autenticación requerida' });
    if (req.user.rol === 'admin') return next();
    const userInstitucion = req.user.rol === 'carabinero' ? 'Carabineros'
      : req.user.rol === 'pdi' ? 'PDI'
      : req.user.rol === 'municipal' ? 'Municipalidad Providencia'
      : null;
    if (!userInstitucion || !instituciones.includes(userInstitucion)) {
      return res.status(403).json({ error: 'No perteneces a esta institución' });
    }
    next();
  };
}

module.exports = { generateToken, authMiddleware, optionalAuth, requireRole, requireInstitucion };
