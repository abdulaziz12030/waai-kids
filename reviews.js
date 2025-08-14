import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, name, stars, text, created_at, approved')
        .eq('approved', true)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { name = 'ضيف', stars = 5, text = '' } = req.body || {};
      if (!text.trim()) return res.status(400).json({ error: 'النص مطلوب' });
      const { data, error } = await supabase
        .from('reviews')
        .insert([{ name, stars: Math.max(1, Math.min(5, parseInt(stars, 10) || 5)), text }])
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    const isAdmin = req.headers['x-admin-key'] === (process.env.ADMIN_KEY || '123123');

    if (req.method === 'PATCH') {
      if (!isAdmin) return res.status(401).json({ error: 'unauthorized' });
      const { id, approved } = req.body || {};
      const { error } = await supabase.from('reviews').update({ approved: !!approved }).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      if (!isAdmin) return res.status(401).json({ error: 'unauthorized' });
      const { id } = req.query;
      const { error } = await supabase.from('reviews').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']);
    return res.status(405).end('Method Not Allowed');
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'server_error' });
  }
}
