const router = require('express').Router();
const { supabase } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

function soloStaff(req, res, next) {
  if (req.user.rol === 'ciudadano') return res.status(403).json({ error: 'No autorizado' });
  next();
}

// Consulta completa de un ciudadano por RUT: datos, vehículos, incidentes y órdenes municipales.
// Usa las mismas tablas que ya alimentan AUPOL (Carabineros) y GEPOL (PDI).
router.get('/consulta/:rut', authMiddleware, soloStaff, async (req, res) => {
  try {
    const rut = req.params.rut;
    const { data: ciudadano, error: cError } = await supabase.from('users').select('*').eq('rut', rut).single();
    if (cError || !ciudadano) return res.status(404).json({ error: 'Ciudadano no encontrado' });

    const [antecedentesRes, multasRes, denunciasRes, investigacionesRes, detencionesRes] = await Promise.all([
      supabase.from('antecedentes').select('*').eq('rut', rut).order('created_at', { ascending: false }),
      supabase.from('multas').select('*').eq('rut', rut).order('created_at', { ascending: false }),
      supabase.from('denuncias').select('*').eq('run', rut).order('created_at', { ascending: false }),
      supabase.from('investigaciones').select('*').eq('rut', rut).eq('estado', 'Activa').order('created_at', { ascending: false }),
      supabase.from('detenciones').select('*').eq('rut_detenido', rut).order('created_at', { ascending: false })
    ]);

    res.json({
      ciudadano: {
        rut: ciudadano.rut,
        nombre: ciudadano.nombre,
        direccion: ciudadano.direccion,
        edad: ciudadano.edad,
        nacionalidad: ciudadano.nacionalidad,
        rol: ciudadano.rol
      },
      inventario: (ciudadano.inventario || []).map(i => ({
        itemId: i.itemId, nombre: i.nombre, categoria: i.categoria, cantidad: i.cantidad || 1
      })),
      // Vehículos que la persona realmente tiene en su inventario (comprados en el Concesionario)
      vehiculos: (ciudadano.vehiculos || []).map(v => ({
        patente: v.patente, marca: v.marca, modelo: v.modelo, anio: v.anio, precio: v.precio
      })),
      antecedentes: (antecedentesRes.data || []).map(a => ({ _id: a.id, delito: a.delito, descripcion: a.descripcion, institucion: a.institucion, fecha: a.fecha })),
      multas: (multasRes.data || []).map(m => ({ _id: m.id, motivo: m.motivo, monto: m.monto, pagada: m.pagada })),
      denuncias: (denunciasRes.data || []).map(d => ({ _id: d.id, tipo: d.tipo, fecha: d.fecha, estado: d.estado })),
      investigado: (investigacionesRes.data || []).length > 0,
      investigaciones: (investigacionesRes.data || []).map(i => ({ titulo: i.titulo, tipo: i.tipo, encargado: i.encargado, fecha: i.fecha })),
      detenciones: (detencionesRes.data || []).map(d => ({ motivo: d.motivo, oficial: d.oficial_nombre, institucion: d.institucion, fecha: d.fecha }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;