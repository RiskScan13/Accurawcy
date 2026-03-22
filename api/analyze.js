export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { frontBase64, frontType, backBase64, backType } = req.body;
  if (!frontBase64 || !backBase64) return res.status(400).json({ error: 'Faltan imágenes' });

  const prompt = `Eres un experto en grading de cartas Pokémon raw con 20 años de experiencia. Analiza estas imágenes (frontal y trasera) y responde ÚNICAMENTE con JSON válido sin markdown ni texto extra:
{"score":85,"grade":"NEAR MINT+","subScores":{"corners":88,"edges":85,"surface":82,"centering":90},"findings":[{"severity":"ok","title":"Título","detail":"Detalle específico con ubicación"}],"summary":"Descripción técnica de 2-3 frases.","marketContext":"Consejo para CardMarket o eBay."}
Incluye entre 4 y 8 findings concretos.`;

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
            { type: 'image', source: { type: 'base64', media_type: frontType || 'image/jpeg', data: frontBase64 } },
            { type: 'image', source: { type: 'base64', media_type: backType || 'image/jpeg', data: backBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const text = await response.text();
    if (!response.ok) return res.status(500).json({ error: text });
    const data = JSON.parse(text);
    const raw = (data.content || []).map(b => b.text || '').join('').trim();
    const clean = raw.replace(/```json|```/g, '').trim();
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    const jsonStr = clean.slice(start, end + 1);
    return res.status(200).json(JSON.parse(jsonStr));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
