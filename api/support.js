// api/support.js
export default async function handler(req, res) {
    // Разрешаем только POST запросы
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { subject, message, userId, username, firstName } = req.body;

    // Простая валидация
    if (!subject || !message || subject.trim() === '' || message.trim() === '') {
        return res.status(400).json({ error: 'Тема и сообщение обязательны' });
    }

    // Ваш Telegram Bot Token и Chat ID (куда отправлять сообщения)
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;   // хранить в секретах Vercel
    const CHAT_ID = process.env.SUPPORT_CHAT_ID;        // ваш личный ID или ID группы

    if (!BOT_TOKEN || !CHAT_ID) {
        console.error('Отсутствуют переменные окружения TELEGRAM_BOT_TOKEN или SUPPORT_CHAT_ID');
        return res.status(500).json({ error: 'Сервер не настроен для отправки' });
    }

    // Формируем текст сообщения
    const userIdentifier = username ? `@${username} (ID: ${userId})` : `ID: ${userId}`;
    const userName = firstName || 'Пользователь';
    const text = `📩 *Новое обращение в поддержку*\n👤 *От:* ${userName} (${userIdentifier})\n📌 *Тема:* ${subject.trim()}\n💬 *Сообщение:*\n${message.trim()}`;

    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    try {
        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: text,
                parse_mode: 'Markdown',
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Ошибка Telegram API:', data);
            return res.status(500).json({ error: 'Не удалось отправить сообщение в поддержку' });
        }

        return res.status(200).json({ ok: true, message: 'Сообщение отправлено' });
    } catch (error) {
        console.error('Ошибка при запросе к Telegram:', error);
        return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
}
