const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: String,
  passwordHash: { type: String, required: true },
  plan: { type: String, enum: ["Старт", "Бизнес", "Про", "Агентство"], default: "Старт" },

  // Токены платформ (зашифрованы, пароли НЕ хранятся)
  connections: {
    telegram: {
      channelId: String,       // ID канала куда постим
      channelUsername: String, // @username канала
      connected: { type: Boolean, default: false },
    },
    vk: {
      accessToken: String,
      groupId: String,
      connected: { type: Boolean, default: false },
    },
    instagram: {
      accessToken: String,
      pageId: String,
      connected: { type: Boolean, default: false },
    },
    tiktok: {
      accessToken: String,
      refreshToken: String,
      connected: { type: Boolean, default: false },
    },
    youtube: {
      accessToken: String,
      refreshToken: String,
      channelId: String,
      connected: { type: Boolean, default: false },
    },
  },
}, { timestamps: true });

// Никогда не возвращаем хэш пароля в ответах
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

userSchema.methods.checkPassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.pre("save", async function (next) {
  if (this.isModified("passwordHash")) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
