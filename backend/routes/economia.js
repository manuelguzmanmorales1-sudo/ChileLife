const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { getGuildRoles } = require('../utils/discordBot');

function toClient(row) {
  return {
    _id: row.id, nombre: row.nombre, discordRoleId: row.discord_role_id,
    nombreRolDiscord: row.nombre_rol_discord, categoria: row.categoria,
    sueldo: row.sueldo, bonificaciones: row.bonificaciones, horasExtras: row.horas_extras,
    descuentos: row.descuentos, multas: row.multas, recompensas: row.recompensas,
    limiteDinero: row.limite_dinero, saldoInicial: row.saldo_inicial,
    frecuenciaPagoDias: row.frecuencia_pago_dias, activo: row.activo,
    rolExisteEnDiscord: row.rol_existe_en_discord
  };
}

// Roles de Discord disponibles (para elegir al crear una economía nueva)
router.get('/discord-roles', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const roles = await getGuildRoles();
    const { data: usados, error } = await supabase.from('economia_config').select('discord_role_id');
    if (error) throw error;
    const idsUsados = new Set((usados || []).map(e => e.discord_role_id));
    const disponibles = roles
      .filter(r => r.name !== '@everyone')
      .map(r => ({
        id: r.id,
        nombre: r.name,
        color: r.color ? '#' + r.color.toString(16).padStart(6, '0') : '#95a5a6',
        yaTieneEconomia: idsUsados.has(r.id)
      }));
    res.json(disponibles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar economías configuradas, con búsqueda (nombre o ID de rol) y filtro por categoría
router.get('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { search, categoria } = req.query;
    let query = supabase.from('economia_config').select('*');
    if (search) query = query.or(`nombre.ilike.%${search}%,discord_role_id.ilike.%${search}%,nombre_rol_discord.ilike.%${search}%`);
    if (categoria) query = query.eq('categoria', categoria);
    query = query.order('nombre', { ascending: true });

    const { data: economias, error } = await query;
    if (error) throw error;

    const conteos = await Promise.all(
      economias.map(e => supabase.from('users').select('id', { count: 'exact', head: true }).eq('economia_role_id', e.discord_role_id))
    );
    const resultado = economias.map((e, i) => ({ ...toClient(e), cantidadUsuarios: conteos[i].count || 0 }));
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear una economía nueva para un rol de Discord puntual
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const {
      nombre, discordRoleId, categoria, sueldo, bonificaciones, horasExtras,
      descuentos, multas, recompensas, limiteDinero, saldoInicial, frecuenciaPagoDias, activo
    } = req.body;

    if (!nombre || !discordRoleId) {
      return res.status(400).json({ error: 'Nombre e ID del rol de Discord son obligatorios' });
    }

    let nombreRolDiscord = '';
    try {
      const roles = await getGuildRoles();
      const rolEncontrado = roles.find(r => r.id === discordRoleId);
      nombreRolDiscord = rolEncontrado ? rolEncontrado.name : '';
    } catch (err) {
      console.error('[Economía] No se pudo verificar el rol contra Discord:', err.message);
    }

    const { data: economia, error } = await supabase.from('economia_config').insert({
      nombre, discord_role_id: discordRoleId, nombre_rol_discord: nombreRolDiscord, categoria,
      sueldo, bonificaciones, horas_extras: horasExtras, descuentos, multas, recompensas,
      limite_dinero: limiteDinero, saldo_inicial: saldoInicial, frecuencia_pago_dias: frecuenciaPagoDias,
      activo: activo !== undefined ? activo : true,
      rol_existe_en_discord: !!nombreRolDiscord
    }).select().single();
    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: 'Ya existe una economía enlazada a ese rol de Discord' });
      throw error;
    }
    res.status(201).json(toClient(economia));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Editar una economía. El discordRoleId NUNCA se modifica (es el identificador inmutable).
router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const {
      nombre, categoria, sueldo, bonificaciones, horasExtras,
      descuentos, multas, recompensas, limiteDinero, saldoInicial, frecuenciaPagoDias, activo
    } = req.body;

    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (categoria !== undefined) updates.categoria = categoria;
    if (sueldo !== undefined) updates.sueldo = sueldo;
    if (bonificaciones !== undefined) updates.bonificaciones = bonificaciones;
    if (horasExtras !== undefined) updates.horas_extras = horasExtras;
    if (descuentos !== undefined) updates.descuentos = descuentos;
    if (multas !== undefined) updates.multas = multas;
    if (recompensas !== undefined) updates.recompensas = recompensas;
    if (limiteDinero !== undefined) updates.limite_dinero = limiteDinero;
    if (saldoInicial !== undefined) updates.saldo_inicial = saldoInicial;
    if (frecuenciaPagoDias !== undefined) updates.frecuencia_pago_dias = frecuenciaPagoDias;
    if (activo !== undefined) updates.activo = activo;

    const { data: economia, error } = await supabase.from('economia_config').update(updates).eq('id', req.params.id).select().single();
    if (error || !economia) return res.status(404).json({ error: 'Economía no encontrada' });
    res.json(toClient(economia));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verificar si el rol de Discord vinculado todavía existe en el servidor
router.post('/:id/verificar', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { data: economia, error: fetchErr } = await supabase.from('economia_config').select('*').eq('id', req.params.id).single();
    if (fetchErr || !economia) return res.status(404).json({ error: 'Economía no encontrada' });

    const roles = await getGuildRoles();
    const rolEncontrado = roles.find(r => r.id === economia.discord_role_id);

    const updates = { rol_existe_en_discord: !!rolEncontrado };
    if (rolEncontrado) updates.nombre_rol_discord = rolEncontrado.name;

    const { data: actualizado, error } = await supabase.from('economia_config').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;

    res.json(toClient(actualizado));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar una economía
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { data: economia, error: fetchErr } = await supabase.from('economia_config').select('id').eq('id', req.params.id).single();
    if (fetchErr || !economia) return res.status(404).json({ error: 'Economía no encontrada' });
    const { error } = await supabase.from('economia_config').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
