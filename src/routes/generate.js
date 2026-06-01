const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  const { message, platform, contentType, tone } = req.body;
  if (!message) return res.status(400).json({ error: 'Нет текста запроса' });

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: `Ты профессиональный SMM-копирайтер. Пишешь посты для соцсетей на русском языке. Платформа: ${platform || 'Telegram'}. Тип контента: ${contentType || 'Пост'}. Тон: ${tone || 'Дружелюбный'}. Пиши живо, по-человечески, без канцелярщины. Средний размер — 5-8 строк. Добавляй эмодзи где уместно.`
          },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.8
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || 'Не удалось получить ответ.';
    res.json({ text });
  } catch (err) {
    console.error('Groq error:', err);
    res.status(500).json({ error: 'Ошибка генерации' });
  }
});

module.exports = router;
