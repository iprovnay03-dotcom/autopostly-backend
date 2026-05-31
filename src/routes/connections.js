const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");
const { checkBotIsAdmin } = require("../services/telegram");

const router = express.Router();
router.use(auth);

// GET /api/connections — статус подключений текущего пользователя
router.get("/", async (req, res) => {
  const conn = req.user.connections;
  res.json({
    telegram: { connected: conn.telegram?.connected || false, channel: conn.telegram?.channelUsername || "" },
    vk: { connected: conn.vk?.connected || false, groupId: conn.vk?.groupId || "" },
    instagram: { connected: conn.instagram?.connected || false },
    tiktok: { connected: conn.tiktok?.connected || false },
    youtube: { connected: conn.youtube?.connected || false },
  });
});

// POST /api/connections/telegram — подключить Telegram-канал
// Пользователь уже добавил бота в канал и передаёт @username или ID канала
router.post("/telegram", async (req, res) => {
  try {
    const { channelId } = req.body;
    if (!channelId) return res.status(400).json({ error: "Передайте channelId (@username или -100xxxxxxxxx)" });

    // Проверяем что бот является администратором
    const isAdmin = await checkBotIsAdmin(channelId);
    if (!isAdmin) {
      return res.status(400).json({
        error: "Бот не является администратором канала. Добавьте @AutoPostlyBot в администраторы и повторите.",
      });
    }

    await User.findByIdAndUpdate(req.user._id, {
      "connections.telegram": {
        channelId,
        channelUsername: channelId,
        connected: true,
      },
    });

    res.json({ success: true, message: `Telegram-канал ${channelId} подключён` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/connections/vk — сохранить токен VK после OAuth
router.post("/vk", async (req, res) => {
  try {
    const { accessToken, groupId } = req.body;
    if (!accessToken || !groupId) return res.status(400).json({ error: "Нужны accessToken и groupId" });

    await User.findByIdAndUpdate(req.user._id, {
      "connections.vk": { accessToken, groupId, connected: true },
    });

    res.json({ success: true, message: "VK подключён" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/connections/:platform — отключить платформу
router.delete("/:platform", async (req, res) => {
  const platform = req.params.platform.toLowerCase();
  const allowed = ["telegram", "vk", "instagram", "tiktok", "youtube"];
  if (!allowed.includes(platform)) return res.status(400).json({ error: "Неизвестная платформа" });

  await User.findByIdAndUpdate(req.user._id, {
    [`connections.${platform}`]: { connected: false },
  });

  res.json({ success: true, message: `${platform} отключён` });
});

module.exports = router;
