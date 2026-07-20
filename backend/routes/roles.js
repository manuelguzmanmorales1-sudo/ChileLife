const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { getGuildRoles, contarMiembrosPorRol } = require('../utils/discordBot');

const MODULOS_DISPONIBLES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'dni', label: 'Crear DNI' },
  { key: 'banco', label: 'Banco' },
  { key: 'tienda', label: 'Tienda' },
  { key: 'concesionario', label: 'Concesionario' },
  { key: 'inventario', label: 'Inventario' },
  { key: 'od-sistema', label: 'Sistema OD' },
  { key: 'carabineros-comisaria', label: 'Comisaría Virtual (Carabineros)' },
  { key: 'carabineros-aupol', label: 'AUPOL (Carabineros)' },
  { key: 'carabineros-esfocar', label: 'ESFOCAR (Carabineros)' },
  { key: 'pdi-prefectura', label: 'Prefectura PDI' },
  { key: 'pdi-gepol', label: 'GEPOL (PDI)' },
  { key: 'municipalidad-escipol', label: 'ESCIPOL (Municipalidad)' },
  { key: 'municipalidad-seguridad', label: 'Seguridad Providencia (Municipalidad)' },
  { key: 'admin-panel', label: 'Panel Admin' },
  { key: 'gestion-roles', label: 'Gestión de Roles' }
];

function toClient(row) {
  return {
    _id: row.id, discordRoleId: row.discord_role_id, nombre: row.nombre, color: row.color,
    descripcion: row.descripcion, categoria: row.categoria, modulos: row.modulos || [],
    permisos: row.permisos, prioridad: row.prioridad, activo: row.activo
  };
}

// Lista de módulos disponibles para armar los checkboxes en el frontend
router.get('/modulos-disponibles', authMiddleware, requireRole('admin'), (req, res) => {
  res.json(MODULOS_DISPONIBLES);
});

// Listar roles configurados, con búsqueda y filtro por categoría
router.get('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { search, categoria } = req.query;
    let query = supabase.from('roles_permisos').select('*');
    if (search) query = query.ilike('nombre', `%${search}%`);
    if (categoria) query = query.eq('categoria', categoria);
    query = query.order('prioridad', { ascending: false }).order('nombre', { ascending: true });

    const { data: roles, error } = await query;
    if (error) throw error;

    const conteos = await Promise.all(
      roles.map(r => supabase.from('users').select('id', { count: 'exact', head: true }).contains('discord_role_ids', [r.discord_role_id]))
    );

    const resultado = roles.map((r, i) => ({ ...toClient(r), cantidadUsuarios: conteos[i].count || 0 }));
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sincronizar roles desde Discord: crea los que falten, actualiza nombre/color de los existentes
router.post('/sync', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const rolesDiscord = await getGuildRoles();
    let creados = 0;
    let actualizados = 0;

    for (const rd of rolesDiscord) {
      if (rd.name === '@everyone') continue;
      const { data: existente } = await supabase.from('roles_permisos').select('*').eq('discord_role_id', rd.id).single();
      const colorHex = rd.color ? '#' + rd.color.toString(16).padStart(6, '0') : '#95a5a6';

      if (existente) {
        await supabase.from('roles_permisos').update({ nombre: rd.name, color: colorHex }).eq('discord_role_id', rd.id);
        actualizados++;
      } else {
        await supabase.from('roles_permisos').insert({
          discord_role_id: rd.id,
          nombre: rd.name,
          color: colorHex,
          modulos: [],
          activo: false,
          prioridad: rd.position || 0
        });
        creados++;
      }
    }

    res.json({ success: true, creados, actualizados, total: rolesDiscord.length - 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar los conteos de usuarios por rol (recorre miembros del server de Discord)
router.post('/refrescar-conteo', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const conteo = await contarMiembrosPorRol();
    res.json({ success: true, conteo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear un enlace manualmente (por si el rol no aparece en la sincronización)
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { discordRoleId, nombre, color, descripcion, categoria, modulos, permisos, prioridad, activo } = req.body;
    if (!discordRoleId || !nombre) {
      return res.status(400).json({ error: 'ID del rol de Discord y nombre son obligatorios' });
    }
    const { data: rol, error } = await supabase.from('roles_permisos').insert({
      discord_role_id: discordRoleId, nombre, color, descripcion, categoria, modulos, permisos, prioridad, activo
    }).select().single();
    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: 'Ese rol de Discord ya está enlazado' });
      throw error;
    }
    res.status(201).json(toClient(rol));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Editar permisos/módulos/prioridad/estado de un enlace
router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { nombre, color, descripcion, categoria, modulos, permisos, prioridad, activo } = req.body;
    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (color !== undefined) updates.color = color;
    if (descripcion !== undefined) updates.descripcion = descripcion;
    if (categoria !== undefined) updates.categoria = categoria;
    if (modulos !== undefined) updates.modulos = modulos;
    if (permisos !== undefined) updates.permisos = permisos;
    if (prioridad !== undefined) updates.prioridad = prioridad;
    if (activo !== undefined) updates.activo = activo;

    const { data: rol, error } = await supabase.from('roles_permisos').update(updates).eq('id', req.params.id).select().single();
    if (error || !rol) return res.status(404).json({ error: 'Enlace no encontrado' });
    res.json(toClient(rol));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar el enlace (no borra el rol real de Discord, solo su configuración en el portal)
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { data: rol, error: fetchErr } = await supabase.from('roles_permisos').select('id').eq('id', req.params.id).single();
    if (fetchErr || !rol) return res.status(404).json({ error: 'Enlace no encontrado' });
    const { error } = await supabase.from('roles_permisos').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
