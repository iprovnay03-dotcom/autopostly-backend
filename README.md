# AutoPostly Backend

Node.js + Express бэкенд для автопостинга в Telegram, VK, Instagram, TikTok, YouTube.

## Структура проекта

```
autopostly-backend/
├── src/
│   ├── index.js              # Точка входа, запуск сервера
│   ├── models/
│   │   ├── User.js           # Модель пользователя (с токенами платформ)
│   │   └── Post.js           # Модель поста (текст, платформы, время)
│   ├── routes/
│   │   ├── auth.js           # POST /api/auth/register, /login
│   │   ├── posts.js          # CRUD для постов
│   │   └── connections.js    # Подключение/отключение платформ
│   ├── services/
│   │   ├── telegram.js       # Публикация через Telegram Bot API
│   │   ├── vk.js             # Публикация через VK API
│   │   └── publisher.js      # Оркестратор — запускает нужный сервис
│   ├── middleware/
│   │   └── auth.js           # JWT-проверка токена
│   └── jobs/
│       └── scheduler.js      # Cron — каждую минуту ищет посты для публикации
├── .env.example              # Шаблон переменных окружения
└── package.json
```

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

```bash
cp .env.example .env
```

Открой `.env` и заполни:

- `MONGODB_URI` — строка подключения к MongoDB Atlas (бесплатно на mongodb.com)
- `JWT_SECRET` — любая длинная случайная строка (минимум 32 символа)
- `TELEGRAM_BOT_TOKEN` — токен от @BotFather

### 3. Создание Telegram-бота

1. Открой @BotFather в Telegram
2. Напиши `/newbot`
3. Дай имя боту: `AutoPostly`
4. Дай username: `AutoPostlyYourNameBot`
5. Скопируй токен в `.env` → `TELEGRAM_BOT_TOKEN`

### 4. Добавление бота в канал

1. Открой канал → Управление каналом → Администраторы
2. Добавь `@AutoPostlyYourNameBot`
3. Дай право «Публикация сообщений»

### 5. Запуск

```bash
# Режим разработки (с авто-перезапуском)
npm run dev

# Продакшн
npm start
```

Сервер запустится на `http://localhost:3001`

---

## API эндпоинты

### Авторизация

| Метод | URL | Описание |
|-------|-----|----------|
| POST | /api/auth/register | Регистрация |
| POST | /api/auth/login | Вход |

### Посты

Все запросы требуют заголовок: `Authorization: Bearer <token>`

| Метод | URL | Описание |
|-------|-----|----------|
| GET | /api/posts | Все посты пользователя |
| POST | /api/posts | Создать пост |
| PATCH | /api/posts/:id | Обновить пост |
| DELETE | /api/posts/:id | Удалить пост |

Пример создания поста:
```json
POST /api/posts
{
  "title": "Утренний пост",
  "text": "Привет! Сегодня рассказываем про...",
  "platforms": ["Telegram", "VK"],
  "scheduledAt": "2025-06-25T09:30:00.000Z"
}
```

### Подключения платформ

| Метод | URL | Описание |
|-------|-----|----------|
| GET | /api/connections | Статус всех подключений |
| POST | /api/connections/telegram | Подключить Telegram-канал |
| POST | /api/connections/vk | Подключить VK-группу |
| DELETE | /api/connections/:platform | Отключить платформу |

Пример подключения Telegram:
```json
POST /api/connections/telegram
{
  "channelId": "@my_channel"
}
```

---

## Как работает планировщик

Каждую минуту `scheduler.js` делает запрос в MongoDB:

```
Найди все посты где:
  status = "scheduled"
  scheduledAt <= сейчас
```

Для каждого найденного поста:
1. Меняет статус на `"publishing"` (чтобы не опубликовать дважды)
2. Вызывает `publisher.js` который определяет платформы
3. Публикует через нужный сервис (telegram.js, vk.js и т.д.)
4. Сохраняет результат в поле `results` поста

---

## Деплой (бесплатно)

### Railway (рекомендую)
1. Зарегистрируйся на railway.app
2. New Project → Deploy from GitHub
3. Выбери репозиторий
4. Добавь переменные из `.env` в настройках
5. Готово — Railway даёт публичный URL

### Render
1. render.com → New Web Service
2. Подключи GitHub
3. Build: `npm install`, Start: `npm start`
4. Добавь env-переменные

### Запуск локально для теста фронтенда
Фронтенд на порту 3000, бэкенд на 3001.
В `.env` фронтенда добавь:
```
VITE_API_URL=http://localhost:3001/api
```

---

## Следующие шаги

- [ ] Добавить Instagram Graph API (аналогично VK)
- [ ] Добавить TikTok Content Posting API
- [ ] Добавить YouTube Data API v3
- [ ] Добавить OAuth flow для VK (сейчас токен передаётся вручную)
- [ ] Добавить загрузку медиафайлов (multer → облако)
- [ ] Подключить платёжный провайдер (ЮKassa или Stripe)
