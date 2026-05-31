const express = require("express");
const auth = require("../middleware/auth");
const Post = require("../models/Post");

const router = express.Router();

// Все роуты требуют авторизации
router.use(auth);

// GET /api/posts — все посты пользователя
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.user._id }).sort({ scheduledAt: 1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts — создать новый пост
router.post("/", async (req, res) => {
  try {
    const { title, text, platforms, scheduledAt, workspace, goal, mediaUrls } = req.body;

    if (!title || !text || !platforms?.length || !scheduledAt) {
      return res.status(400).json({ error: "Заполните все обязательные поля" });
    }

    const post = new Post({
      userId: req.user._id,
      title,
      text,
      platforms,
      scheduledAt: new Date(scheduledAt),
      workspace: workspace || "Основной проект",
      goal: goal || "Без цели",
      mediaUrls: mediaUrls || [],
    });

    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/posts/:id — удалить пост
router.delete("/:id", async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!post) return res.status(404).json({ error: "Пост не найден" });
    res.json({ message: "Пост удалён" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/posts/:id — обновить пост
router.patch("/:id", async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: req.body },
      { new: true }
    );
    if (!post) return res.status(404).json({ error: "Пост не найден" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
