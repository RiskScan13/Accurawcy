export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { frontBase64, frontType, backBase64, backType } = req.body;
  if (!frontBase64 || !backBase64) return res.status(400).json({ error: 'Faltan imágenes' });

  const prompt = `Eres un experto en grading de cartas Pokémon raw. Analiza estas imágenes y responde ÚNICAMENTE con JSON válido sin markdown:
{"score":85,"grade":"NEAR MINT+","subScores":{"corners":88,"edges":85,"surface":82,"centering":90},"findings":[{"severity":"ok","title":"Título","detail":"Detalle"}],"summary":"Descripción.","marketContext":"Consejo de mercado."}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: frontType, data: frontBase64 } },
            { type: 'image', source: { type: 'base64', media_type: backType, data: backBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data?.error?.message || 'Error API' });
    const raw = (data.content || []).map(b => b.text || '').join('').trim();
    const clean = raw.replace(/```json|```/g, '').trim();
    return res.status(200).json(JSON.parse(clean));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
