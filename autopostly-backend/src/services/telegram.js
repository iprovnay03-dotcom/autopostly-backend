const TelegramBot = require("node-telegram-bot-api");

// Создаём бота один раз при старте сервера
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

/**
 * Публикует текстовый пост в Telegram-канал
 * @param {string} channelId - ID или @username канала
 * @param {string} text - текст поста
 * @returns {object} - результат публикации
 */
async function publishText(channelId, text) {
  try {
    const message = await bot.sendMessage(channelId, text, {
      parse_mode: "HTML",
    });

    return {
      success: true,
      messageId: String(message.message_id),
      publishedAt: new Date(),
    };
  } catch (err) {
    console.error(`[Telegram] Ошибка публикации в ${channelId}:`, err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Публикует фото с подписью
 * @param {string} channelId
 * @param {string} photoUrl - прямая ссылка на фото
 * @param {string} caption - подпись под фото
 */
async function publishPhoto(channelId, photoUrl, caption = "") {
  try {
    const message = await bot.sendPhoto(channelId, photoUrl, {
      caption,
      parse_mode: "HTML",
    });

    return {
      success: true,
      messageId: String(message.message_id),
      publishedAt: new Date(),
    };
  } catch (err) {
    console.error(`[Telegram] Ошибка отправки фото:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Публикует видео с подписью
 */
async function publishVideo(channelId, videoUrl, caption = "") {
  try {
    const message = await bot.sendVideo(channelId, videoUrl, {
      caption,
      parse_mode: "HTML",
    });

    return {
      success: true,
      messageId: String(message.message_id),
      publishedAt: new Date(),
    };
  } catch (err) {
    console.error(`[Telegram] Ошибка отправки видео:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Проверяет что бот является администратором канала
 */
async function checkBotIsAdmin(channelId) {
  try {
    const chat = await bot.getChat(channelId);
    const member = await bot.getChatMember(channelId, (await bot.getMe()).id);
    return member.status === "administrator" || member.status === "creator";
  } catch {
    return false;
  }
}

module.exports = { publishText, publishPhoto, publishVideo, checkBotIsAdmin };
