require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
const connectionRoutes = require("./routes/connections");
const { startScheduler } = require("./jobs/scheduler");

const app = express();
const PORT = process.env.PORT || 3001;

// Безопасность
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// Ограничение запросов (защита от спама)
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: "Слишком много запросов. Подождите 15 минут." });
app.use("/api/", limiter);

// Роуты
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/connections", connectionRoutes);

// Healthcheck
app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

// Подключение к MongoDB и запуск
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB подключена");
    startScheduler();
    app.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));
  })
  .catch(err => {
    console.error("❌ Ошибка MongoDB:", err.message);
    process.exit(1);
  });

module.exports = app;
