const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const API_BASE = 'https://discord.com/api/v10';

async function botFetch(path, options = {}) {
  if (!DISCORD_BOT_TOKEN) throw new Error('Falta configurar DISCORD_BOT_TOKEN en el .env');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Discord API ${res.status}: ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Trae todos los roles del servidor configurado
async function getGuildRoles() {
  if (!DISCORD_GUILD_ID) throw new Error('Falta configurar DISCORD_GUILD_ID en el .env');
  return botFetch(`/guilds/${DISCORD_GUILD_ID}/roles`);
}

// Trae el miembro (y sus roles) de un usuario puntual. Devuelve null si no está en el servidor.
async function getGuildMember(discordUserId) {
  if (!DISCORD_GUILD_ID) throw new Error('Falta configurar DISCORD_GUILD_ID en el .env');
  try {
    return await botFetch(`/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}`);
  } catch (err) {
    return null;
  }
}

// Cuenta cuántos miembros tienen cada rol (recorre la lista de miembros del servidor)
async function contarMiembrosPorRol() {
  if (!DISCORD_GUILD_ID) throw new Error('Falta configurar DISCORD_GUILD_ID en el .env');
  const conteo = {};
  let after = '0';
  while (true) {
    const pagina = await botFetch(`/guilds/${DISCORD_GUILD_ID}/members?limit=1000&after=${after}`);
    if (!pagina || pagina.length === 0) break;
    for (const miembro of pagina) {
      for (const roleId of miembro.roles) {
        conteo[roleId] = (conteo[roleId] || 0) + 1;
      }
    }
    if (pagina.length < 1000) break;
    after = pagina[pagina.length - 1].user.id;
  }
  return conteo;
}

module.exports = { getGuildRoles, getGuildMember, contarMiembrosPorRol };
