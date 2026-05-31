const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  text: { type: String, required: true },
  platforms: [{ type: String, enum: ["Telegram", "VK", "YouTube", "Instagram", "TikTok"] }],
  mediaUrls: [String],
  scheduledAt: { type: Date, required: true },
  status: { type: String, enum: ["scheduled", "published", "failed", "draft"], default: "scheduled" },
  results: [{
    platform: String,
    success: Boolean,
    messageId: String,
    error: String,
    publishedAt: Date,
  }],
  workspace: { type: String, default: "Основной проект" },
  goal: { type: String, default: "Без цели" },
}, { timestamps: true });

module.exports = mongoose.model("Post", postSchema);
