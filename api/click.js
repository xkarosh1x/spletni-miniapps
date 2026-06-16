// api/click.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, username, score } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    try {
        // Получаем текущую запись
        let { data: user, error: selectError } = await supabase
            .from('clicks')
            .select('score, username')
            .eq('user_id', userId)
            .maybeSingle();

        if (selectError && selectError.code !== 'PGRST116') {
            console.error('Select error:', selectError);
            return res.status(500).json({ error: 'Database error' });
        }

        const now = new Date().toISOString();
        let finalScore = 0;
        let finalUsername = username || 'anon';

        if (user) {
            // Используем максимум из переданного и текущего
            finalScore = Math.max(user.score, score || 0);
            finalUsername = username || user.username || 'anon';
            // Обновляем только если изменилось
            if (finalScore !== user.score || finalUsername !== user.username) {
                await supabase
                    .from('clicks')
                    .update({ 
                        score: finalScore, 
                        username: finalUsername,
                        updated_at: now 
                    })
                    .eq('user_id', userId);
            }
        } else {
            // Новая запись – сохраняем переданный score (или 0)
            finalScore = score || 0;
            await supabase
                .from('clicks')
                .insert({
                    user_id: userId,
                    username: finalUsername,
                    score: finalScore,
                    updated_at: now
                });
        }

        return res.status(200).json({ 
            success: true, 
            score: finalScore 
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
