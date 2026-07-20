const router = require('express').Router();

// GET /api/roblox/avatar?username=NombreDeUsuario
router.get('/avatar', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Falta el username' });

    // 1. Username -> userId
    const userRes = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: true })
    });
    const userData = await userRes.json();
    const found = userData.data && userData.data[0];
    if (!found) return res.status(404).json({ error: 'Usuario de Roblox no encontrado' });

    // 2. userId -> avatar (headshot)
    const avatarRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${found.id}&size=420x420&format=Png&isCircular=false`);
    const avatarData = await avatarRes.json();
    const avatarUrl = avatarData.data && avatarData.data[0] && avatarData.data[0].imageUrl;

    if (!avatarUrl) return res.status(404).json({ error: 'No se pudo obtener el avatar' });

    res.json({
      userId: found.id,
      username: found.name,
      displayName: found.displayName,
      avatarUrl
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
