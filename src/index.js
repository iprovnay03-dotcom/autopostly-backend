require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const TelegramBot = require("node-telegram-bot-api");
const cron = require("node-cron");
const axios = require("axios");
 
const app = express();
const PORT = process.env.PORT || 3001;
const DB_FILE = path.join(__dirname, "db.json");
 
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
 
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const empty = { users: [], posts: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(empty, null, 2));
    return empty;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}
 
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}
 
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "50mb" }));
 
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Токен не передан" });
  }
  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = readDB();
    const user = db.users.find(u => u.id === decoded.userId);
    if (!user) return res.status(401).json({ error: "Пользователь не найден" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Токен недействителен" });
  }
}
 
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Имя, email и пароль обязательны" });
    }
    const db = readDB();
    if (db.users.find(u => u.email === email)) {
      return res.status(400).json({ error: "Email уже зарегистрирован" });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = {
      id: Date.now().toString(),
      name, email, phone: phone || "",
      passwordHash,
      plan: "Старт",
      connections: {
        telegram: { connected: false, channelId: "", channelUsername: "" },
        vk: { connected: false, accessToken: "", groupId: "" },
        instagram: { connected: false },
        tiktok: { connected: false },
        youtube: { connected: false },
      },
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    writeDB(db);
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "30d" });
    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "30d" });
    const { passwordHash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
app.get("/api/posts", authMiddleware, (req, res) => {
  const db = readDB();
  const posts = db.posts.filter(p => p.userId === req.user.id);
  res.json(posts);
});
 
app.post("/api/posts", authMiddleware, (req, res) => {
  try {
    const { title, text, platforms, scheduledAt, workspace, goal } = req.body;
    if (!title || !text || !platforms?.length || !scheduledAt) {
      return res.status(400).json({ error: "Заполните все поля" });
    }
    const db = readDB();
    const post = {
      id: Date.now().toString(),
      userId: req.user.id,
      title, text, platforms,
      scheduledAt,
      status: "scheduled",
      workspace: workspace || "Основной проект",
      goal: goal || "Без цели",
      results: [],
      createdAt: new Date().toISOString(),
    };
    db.posts.push(post);
    writeDB(db);
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
app.delete("/api/posts/:id", authMiddleware, (req, res) => {
  const db = readDB();
  const index = db.posts.findIndex(p => p.id === req.params.id && p.userId === req.user.id);
  if (index === -1) return res.status(404).json({ error: "Пост не найден" });
  db.posts.splice(index, 1);
  writeDB(db);
  res.json({ message: "Пост удалён" });
});
 
app.get("/api/connections", authMiddleware, (req, res) => {
  const conn = req.user.connections || {};
  res.json({
    telegram: { connected: conn.telegram?.connected || false, channel: conn.telegram?.channelUsername || "" },
    vk: { connected: conn.vk?.connected || false },
    instagram: { connected: conn.instagram?.connected || false },
    tiktok: { connected: conn.tiktok?.connected || false },
    youtube: { connected: conn.youtube?.connected || false },
  });
});
 
app.post("/api/connections/telegram", authMiddleware, async (req, res) => {
  try {
    const { channelId } = req.body;
    if (!channelId) return res.status(400).json({ error: "Передайте channelId" });
    try {
      await bot.sendMessage(channelId, "✅ AutoPostly успешно подключён к каналу!");
    } catch {
      return res.status(400).json({ error: "Бот не добавлен администратором канала." });
    }
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === req.user.id);
    db.users[userIndex].connections.telegram = { connected: true, channelId, channelUsername: channelId };
    writeDB(db);
    res.json({ success: true, message: `Telegram канал ${channelId} подключён` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
app.delete("/api/connections/:platform", authMiddleware, (req, res) => {
  const platform = req.params.platform.toLowerCase();
  const db = readDB();
  const userIndex = db.users.findIndex(u => u.id === req.user.id);
  if (db.users[userIndex].connections[platform]) {
    db.users[userIndex].connections[platform] = { connected: false };
  }
  writeDB(db);
  res.json({ success: true });
});
 
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
 
app.post("/api/generate", async (req, res) => {
  const { message, platform, contentType, tone } = req.body;
  if (!message) return res.status(400).json({ error: "Нет текста" });
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `Ты профессиональный SMM-копирайтер. Пишешь посты на русском языке. Платформа: ${platform || "Telegram"}. Тип: ${contentType || "Пост"}. Тон: ${tone || "Дружелюбный"}. Пиши живо, 5-8 строк, с эмодзи.`
          },
          { role: "user", content: message }
        ],
        max_tokens: 500,
        temperature: 0.8
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
        }
      }
    );
    const text = response.data.choices?.[0]?.message?.content || "Не удалось получить ответ.";
    res.json({ text });
  } catch (err) {
    console.error("Groq error:", err.response?.data || err.message);
    res.status(500).json({ error: "Ошибка генерации: " + (err.response?.data?.error?.message || err.message) });
  }
});
 
cron.schedule("* * * * *", async () => {
  const now = new Date();
  const db = readDB();
  const toPublish = db.posts.filter(p => p.status === "scheduled" && new Date(p.scheduledAt) <= now);
  if (toPublish.length === 0) return;
  console.log(`[Scheduler] публикую ${toPublish.length} пост(ов)`);
  for (const post of toPublish) {
    const postIndex = db.posts.findIndex(p => p.id === post.id);
    db.posts[postIndex].status = "publishing";
    writeDB(db);
    const user = db.users.find(u => u.id === post.userId);
    const results = [];
    for (const platform of post.platforms) {
      let result;
      if (platform === "Telegram") {
        const conn = user?.connections?.telegram;
        if (!conn?.connected || !conn?.channelId) {
          result = { platform, success: false, error: "Telegram не подключён" };
        } else {
          try {
            const msg = await bot.sendMessage(conn.channelId, post.text);
            result = { platform, success: true, messageId: String(msg.message_id), publishedAt: new Date().toISOString() };
            console.log(`[Telegram] ✅ Опубликован "${post.title}"`);
          } catch (err) {
            result = { platform, success: false, error: err.message };
          }
        }
      } else {
        result = { platform, success: false, error: `${platform}: в разработке` };
      }
      results.push(result);
    }
    const updatedIndex = db.posts.findIndex(p => p.id === post.id);
    db.posts[updatedIndex].status = results.some(r => r.success) ? "published" : "failed";
    db.posts[updatedIndex].results = results;
    writeDB(db);
  }
});
 
app.listen(PORT, () => {
  console.log(`🚀 AutoPostly сервер запущен на порту ${PORT}`);
  console.log(`⏰ Планировщик запущен — проверяет посты каждую минуту`);
  console.log(`🤖 Telegram бот: @AutoPostly_RuBot`);
});
