const router = require('express').Router();
const { supabase } = require('../config/db');
const { generateToken, authMiddleware, requireRole } = require('../middleware/auth');
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
const OWNER_DISCORD_ID = process.env.OWNER_DISCORD_ID;

// Convierte una fila de Supabase (snake_case) al objeto que espera el frontend (camelCase)
function toClientUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    discordId: row.discord_id,
    discordUsername: row.discord_username,
    discordAvatar: row.discord_avatar,
    robloxUsername: row.roblox_username || '',
    robloxAvatar: row.roblox_avatar || '',
    rut: row.rut,
    nombre: row.nombre,
    dinero: row.dinero,
    nivel: row.nivel,
    exp: row.exp,
    dineroNegro: row.dinero_negro,
    rango: row.rango,
    rol: row.rol,
    edad: row.edad,
    direccion: row.direccion,
    telefono: row.telefono,
    email: row.email,
    discordRol: row.discord_rol,
    inventario: row.inventario || [],
    vehiculos: row.vehiculos || [],
    historialFinanciero: row.historial_financiero || [],
    dniFoto: row.dni_foto || '',
    dniNumero: row.dni_numero || '',
    dniFechaEmision: row.dni_fecha_emision || '',
    dniFechaVencimiento: row.dni_fecha_vencimiento || '',
    dniFirma: row.dni_firma || '',
    sexo: row.sexo || '',
    nacionalidad: row.nacionalidad || '',
    fechaNacimiento: row.fecha_nacimiento || ''
  };
}

// Paso 1: redirige al usuario a Discord para que autorice la app
router.get('/discord', (req, res) => {
  if (!DISCORD_CLIENT_ID || !DISCORD_REDIRECT_URI) {
    return res.status(500).json({ error: 'OAuth2 de Discord no está configurado (faltan variables de entorno)' });
  }
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify'
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
});

// Paso 2: Discord redirige aquí con ?code=... ; lo cambiamos por un token y creamos/logueamos al usuario
router.get('/discord/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect('/index.html?error=discord');
  }

  try {
    const tokenParams = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: DISCORD_REDIRECT_URI
    });

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString()
    });

    if (!tokenRes.ok) {
      const detalle = await tokenRes.text();
      console.error('[Discord OAuth2] Respuesta de Discord:', tokenRes.status, detalle);
      throw new Error('No se pudo obtener el token de Discord');
    }
    const tokenData = await tokenRes.json();

    const profileRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    if (!profileRes.ok) throw new Error('No se pudo obtener el perfil de Discord');
    const profile = await profileRes.json();

    const esOwner = OWNER_DISCORD_ID && profile.id === OWNER_DISCORD_ID;
    const avatarUrl = profile.avatar
      ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
      : '';

    const { data: existente } = await supabase
      .from('users')
      .select('*')
      .eq('discord_id', profile.id)
      .maybeSingle();

    let user;

    if (!existente) {
      const { data, error: insertError } = await supabase
        .from('users')
        .insert({
          discord_id: profile.id,
          discord_username: profile.username,
          discord_avatar: avatarUrl,
          nombre: profile.global_name || profile.username,
          // Todos entran como Ciudadano; el rol real (Carabinero, PDI, Municipal, Admin/Staff)
          // lo asigna a mano un admin desde "Gestión de Usuarios".
          rol: esOwner ? 'admin' : 'ciudadano',
          dinero: 100000
        })
        .select()
        .single();
      if (insertError) throw insertError;
      user = data;
    } else {
      const updates = {
        discord_username: profile.username,
        discord_avatar: avatarUrl || existente.discord_avatar
      };
      // El rol no se toca acá — se administra desde "Gestión de Usuarios",
      // salvo que sea el dueño del servidor, que siempre queda como admin.
      if (esOwner) updates.rol = 'admin';

      const { data, error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', existente.id)
        .select()
        .single();
      if (updateError) throw updateError;
      user = data;
    }

    const jwtToken = generateToken(user.id);
    res.redirect(`/index.html?token=${jwtToken}`);
  } catch (err) {
    console.error('[Discord OAuth2]', err.message);
    res.redirect('/index.html?error=discord');
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: toClientUser(req.user) });
});

// Generar RUT y número de documento para DNI
router.post('/generar-rut', async (req, res) => {
  try {
    const { fechaNacimiento } = req.body;

    if (!fechaNacimiento) {
      return res.status(400).json({
        error: 'Fecha de nacimiento requerida'
      });
    }

    // Generador simple para rolplay (RUT chileno ficticio)
    const numero = Math.floor(10000000 + Math.random() * 89999999);

    // Calcula dígito verificador
    function calcularDV(rut) {
      let suma = 0;
      let multiplicador = 2;

      for (let i = rut.length - 1; i >= 0; i--) {
        suma += Number(rut[i]) * multiplicador;
        multiplicador++;
        if (multiplicador > 7) multiplicador = 2;
      }

      const resto = suma % 11;
      const dv = 11 - resto;

      if (dv === 11) return '0';
      if (dv === 10) return 'K';
      return String(dv);
    }

          // Formato RUT chileno: 12.345.678-9
const numeroFormateado = numero
  .toString()
  .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const rut = `${numeroFormateado}-${calcularDV(String(numero))}`;

// Formato documento: 123.456.789
const numeroDocumento = Math.floor(100000000 + Math.random() * 900000000)
  .toString()
  .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const dniNumero = numeroDocumento;
    

    res.json({
      rut,
      dniNumero
    });

  } catch (err) {
    console.error('[Generar RUT]', err.message);
    res.status(500).json({
      error: 'No se pudo generar el RUT'
    });
  }
});

// Ranking de los que más plata (legal) tienen — visible para cualquier logueado, no solo admin
router.get('/top-ricos', authMiddleware, async (req, res) => {
  try {
    const limite = Math.min(parseInt(req.query.limite) || 10, 50);
    const { data, error } = await supabase
      .from('users')
      .select('id, nombre, dinero, rango, rol, roblox_avatar')
      .order('dinero', { ascending: false })
      .limit(limite);
    if (error) throw error;
    res.json(data.map(u => ({
      _id: u.id,
      nombre: u.nombre,
      dinero: u.dinero,
      rango: u.rango,
      rol: u.rol,
      robloxAvatar: u.roblox_avatar || ''
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(toClientUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/rol', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { rol } = req.body;
    const validRoles = ['ciudadano', 'carabinero', 'pdi', 'municipal', 'admin'];
    if (!validRoles.includes(rol)) return res.status(400).json({ error: 'Rol inválido' });
    const { data, error } = await supabase
      .from('users')
      .update({ rol })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error || !data) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ success: true, user: toClientUser(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/dinero', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { dinero, dineroNegro } = req.body;
    const updates = {};
    if (dinero !== undefined) updates.dinero = dinero;
    if (dineroNegro !== undefined) updates.dinero_negro = dineroNegro;
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error || !data) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ success: true, user: toClientUser(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/update', authMiddleware, async (req, res) => {
  try {
    const { nombre, direccion, telefono, email, edad, dniNumero, dniFechaEmision, dniFechaVencimiento, dniFirma, dniFoto, sexo, nacionalidad, fechaNacimiento, rut, robloxUsername, robloxAvatar } = req.body;
    const updates = {};
    if (nombre) updates.nombre = nombre;
    if (direccion) updates.direccion = direccion;
    if (telefono) updates.telefono = telefono;
    if (email) updates.email = email;
    if (edad) updates.edad = edad;
    if (rut) updates.rut = rut;
    if (dniNumero) updates.dni_numero = dniNumero;
    if (dniFechaEmision) updates.dni_fecha_emision = dniFechaEmision;
    if (dniFechaVencimiento) updates.dni_fecha_vencimiento = dniFechaVencimiento;
    if (dniFirma !== undefined) updates.dni_firma = dniFirma;
    if (dniFoto !== undefined) updates.dni_foto = dniFoto;
    if (sexo) updates.sexo = sexo;
    if (nacionalidad) updates.nacionalidad = nacionalidad;
    if (fechaNacimiento) updates.fecha_nacimiento = fechaNacimiento;
    if (robloxUsername !== undefined) updates.roblox_username = robloxUsername;
    if (robloxAvatar !== undefined) updates.roblox_avatar = robloxAvatar;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, user: toClientUser(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/comprar', authMiddleware, async (req, res) => {
  try {
    const { monto } = req.body;
    if (!monto || monto <= 0) return res.status(400).json({ error: 'Monto inválido' });
    if (req.user.dinero < monto) return res.status(400).json({ error: 'Saldo insuficiente' });
    const { data, error } = await supabase
      .from('users')
      .update({ dinero: req.user.dinero - monto })
      .eq('id', req.user.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, dinero: data.dinero });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/comprar-tienda-item', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: 'ID del item requerido' });

    const { data: item, error: itemError } = await supabase
      .from('tienda_items')
      .select('*')
      .eq('id', itemId)
      .single();
    if (itemError || !item) return res.status(404).json({ error: 'Item no encontrado' });
    if (item.stock <= 0) return res.status(400).json({ error: 'Item agotado' });
    if (req.user.dinero < item.precio) return res.status(400).json({ error: 'Saldo insuficiente' });

    const inventario = req.user.inventario || [];
    const existe = inventario.find(inv => inv.itemId === itemId);
    if (existe) {
      existe.cantidad += 1;
    } else {
      inventario.push({
        itemId: item.id,
        nombre: item.nombre,
        precio: item.precio,
        categoria: item.categoria,
        icon: item.icon || 'fa-box',
        fechaCompra: new Date(),
        cantidad: 1
      });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .update({ dinero: req.user.dinero - item.precio, inventario })
      .eq('id', req.user.id)
      .select()
      .single();
    if (userError) throw userError;

    const { data: itemData, error: updateItemError } = await supabase
      .from('tienda_items')
      .update({ stock: item.stock - 1 })
      .eq('id', itemId)
      .select()
      .single();
    if (updateItemError) throw updateItemError;

    res.json({ success: true, dinero: userData.dinero, item: item.nombre, precio: item.precio, stockRestante: itemData.stock, inventario: userData.inventario });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;