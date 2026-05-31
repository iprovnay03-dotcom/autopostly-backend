const cron = require("node-cron");
const Post = require("../models/Post");
const { publishPost } = require("../services/publisher");

/**
 * Запускает планировщик публикаций.
 * Каждую минуту проверяет базу — есть ли посты, время которых пришло.
 */
function startScheduler() {
  // Запускается каждую минуту: "* * * * *"
  cron.schedule("* * * * *", async () => {
    const now = new Date();

    // Ищем посты, которые нужно опубликовать прямо сейчас
    // scheduledAt <= текущее время И статус "scheduled"
    const postsToPublish = await Post.find({
      status: "scheduled",
      scheduledAt: { $lte: now },
    });

    if (postsToPublish.length === 0) return;

    console.log(`[Scheduler] ${now.toISOString()} — найдено ${postsToPublish.length} поста(ов) для публикации`);

    for (const post of postsToPublish) {
      // Сразу меняем статус чтобы не опубликовать дважды
      await Post.findByIdAndUpdate(post._id, { status: "publishing" });

      try {
        await publishPost(post);
      } catch (err) {
        console.error(`[Scheduler] Ошибка при публикации поста ${post._id}:`, err.message);
        await Post.findByIdAndUpdate(post._id, { status: "failed" });
      }
    }
  });

  console.log("⏰ Планировщик запущен — проверяет посты каждую минуту");
}

module.exports = { startScheduler };
