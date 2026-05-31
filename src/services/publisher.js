const telegram = require("./telegram");
const vk = require("./vk");
const User = require("../models/User");
const Post = require("../models/Post");

/**
 * Публикует пост на все выбранные платформы
 * @param {object} post - документ Post из MongoDB
 */
async function publishPost(post) {
  const user = await User.findById(post.userId);
  if (!user) {
    console.error(`[Publisher] Пользователь ${post.userId} не найден`);
    return;
  }

  const results = [];

  for (const platform of post.platforms) {
    let result;

    if (platform === "Telegram") {
      const conn = user.connections.telegram;
      if (!conn?.connected || !conn?.channelId) {
        result = { platform, success: false, error: "Telegram не подключён" };
      } else {
        // Если есть медиа — публикуем с фото/видео
        if (post.mediaUrls?.length > 0) {
          result = await telegram.publishPhoto(conn.channelId, post.mediaUrls[0], post.text);
        } else {
          result = await telegram.publishText(conn.channelId, post.text);
        }
        result.platform = "Telegram";
      }
    }

    else if (platform === "VK") {
      const conn = user.connections.vk;
      if (!conn?.connected || !conn?.accessToken || !conn?.groupId) {
        result = { platform, success: false, error: "VK не подключён" };
      } else {
        if (post.mediaUrls?.length > 0) {
          result = await vk.publishPhotoPost(conn.accessToken, conn.groupId, post.mediaUrls[0], post.text);
        } else {
          result = await vk.publishPost(conn.accessToken, conn.groupId, post.text);
        }
        result.platform = "VK";
      }
    }

    else if (platform === "Instagram") {
      // Instagram Graph API — добавить аналогично VK
      result = { platform, success: false, error: "Instagram: сервис в разработке" };
    }

    else if (platform === "TikTok") {
      result = { platform, success: false, error: "TikTok: сервис в разработке" };
    }

    else if (platform === "YouTube") {
      result = { platform, success: false, error: "YouTube: сервис в разработке" };
    }

    else {
      result = { platform, success: false, error: "Неизвестная платформа" };
    }

    results.push(result);
    console.log(`[Publisher] ${platform}: ${result.success ? "✅ опубликован" : "❌ " + result.error}`);
  }

  // Обновляем статус поста в базе
  const allSuccess = results.every(r => r.success);
  await Post.findByIdAndUpdate(post._id, {
    status: allSuccess ? "published" : results.some(r => r.success) ? "published" : "failed",
    results,
  });

  return results;
}

module.exports = { publishPost };
