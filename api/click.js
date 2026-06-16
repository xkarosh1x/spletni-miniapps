// api/click.js
import { createClient } from '@supabase/supabase-js';

// Инициализация Supabase (переменные из настроек Vercel)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
  // Разрешаем только POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, username } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // Проверка на спам: последний клик был не менее 0.5 секунды назад
    // Можно реализовать, но для простоты пропустим

    // 1. Получаем текущий счёт пользователя
    let { data: user, error: selectError } = await supabase
      .from('clicks')
      .select('score')
      .eq('user_id', userId)
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Select error:', selectError);
      return res.status(500).json({ error: 'Database error' });
    }

    let newScore;
    const now = new Date().toISOString();

    if (user) {
      // Пользователь существует → увеличиваем счёт
      newScore = user.score + 1;
      const { error: updateError } = await supabase
        .from('clicks')
        .update({ 
          score: newScore, 
          username: username || user.username || 'anon',
          updated_at: now 
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Update error:', updateError);
        return res.status(500).json({ error: 'Failed to update score' });
      }
    } else {
      // Новый пользователь → создаём запись
      newScore = 1;
      const { error: insertError } = await supabase
        .from('clicks')
        .insert({
          user_id: userId,
          username: username || 'anon',
          score: 1,
          updated_at: now
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        return res.status(500).json({ error: 'Failed to create user' });
      }
    }

    return res.status(200).json({ 
      success: true, 
      score: newScore 
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
