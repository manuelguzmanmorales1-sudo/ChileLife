const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const ROLES = ['ciudadano', 'carabinero', 'pdi', 'municipal', 'admin'];

function toClient(row) {
  return { rol: row.rol, monto: row.sueldo, intervaloMinutos: row.frecuencia_dias, activo: row.activo };
}

// Lista la config de sueldos de cada rol
router.get('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('sueldos_config').select('*').order('rol', { ascending: true });
    if (error) throw error;
    res.json(data.map(toClient));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualiza el sueldo, frecuencia o estado de un rol puntual
router.put('/:rol', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    if (!ROLES.includes(req.params.rol)) return res.status(400).json({ error: 'Rol inválido' });
    const { monto, intervaloMinutos, activo } = req.body;
    const updates = {};
    if (monto !== undefined) updates.sueldo = monto;
    if (intervaloMinutos !== undefined) updates.frecuencia_dias = intervaloMinutos;
    if (activo !== undefined) updates.activo = activo;

    const { data: config, error } = await supabase.from('sueldos_config').update(updates).eq('rol', req.params.rol).select().single();
    if (error || !config) return res.status(404).json({ error: 'Configuración no encontrada' });
    res.json(toClient(config));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;