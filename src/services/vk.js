const axios = require("axios");

const VK_API = "https://api.vk.com/method";
const VK_VERSION = "5.131";

/**
 * Публикует пост на стене группы VK
 * @param {string} accessToken - токен пользователя (из OAuth)
 * @param {string} groupId - ID группы (без минуса)
 * @param {string} text - текст поста
 */
async function publishPost(accessToken, groupId, text) {
  try {
    const { data } = await axios.post(`${VK_API}/wall.post`, null, {
      params: {
        access_token: accessToken,
        owner_id: `-${groupId}`, // минус = группа, плюс = пользователь
        message: text,
        from_group: 1,
        v: VK_VERSION,
      },
    });

    if (data.error) {
      throw new Error(data.error.error_msg);
    }

    return {
      success: true,
      messageId: String(data.response.post_id),
      publishedAt: new Date(),
    };
  } catch (err) {
    console.error("[VK] Ошибка публикации:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Загружает фото и публикует пост с ним
 */
async function publishPhotoPost(accessToken, groupId, photoUrl, text) {
  try {
    // 1. Получаем сервер загрузки
    const { data: serverData } = await axios.get(`${VK_API}/photos.getWallUploadServer`, {
      params: { access_token: accessToken, group_id: groupId, v: VK_VERSION },
    });

    const uploadUrl = serverData.response.upload_url;

    // 2. Скачиваем фото и загружаем на VK
    const imageResponse = await axios.get(photoUrl, { responseType: "arraybuffer" });
    const FormData = require("form-data");
    const form = new FormData();
    form.append("photo", Buffer.from(imageResponse.data), { filename: "photo.jpg" });

    const { data: uploadData } = await axios.post(uploadUrl, form, { headers: form.getHeaders() });

    // 3. Сохраняем фото
    const { data: saveData } = await axios.post(`${VK_API}/photos.saveWallPhoto`, null, {
      params: { access_token: accessToken, group_id: groupId, ...uploadData, v: VK_VERSION },
    });

    const photo = saveData.response[0];
    const attachments = `photo${photo.owner_id}_${photo.id}`;

    // 4. Публикуем пост с фото
    const { data: postData } = await axios.post(`${VK_API}/wall.post`, null, {
      params: { access_token: accessToken, owner_id: `-${groupId}`, message: text, attachments, from_group: 1, v: VK_VERSION },
    });

    return { success: true, messageId: String(postData.response.post_id), publishedAt: new Date() };
  } catch (err) {
    console.error("[VK] Ошибка публикации с фото:", err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { publishPost, publishPhotoPost };
