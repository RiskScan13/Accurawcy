export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { frontBase64, frontType, backBase64, backType } = req.body;
  if (!frontBase64 || !backBase64) return res.status(400).json({ error: 'Faltan imágenes' });

  const prompt = `Eres un experto en grading de cartas Pokémon raw con 20 años de experiencia. Has graduado miles de cartas para PSA, BGS y CGC. Tu análisis es EXTREMADAMENTE preciso y objetivo.

Analiza estas imágenes de una carta Pokémon (primera imagen = frontal, segunda imagen = trasera) y proporciona una evaluación RIGUROSA. Sé muy crítico y preciso. Si hay cualquier defecto, penaliza en consecuencia.

Evalúa estos 4 criterios del 0 al 100:
1. ESQUINAS: Examina las 4 esquinas. Busca desgaste, rizado, chipping, pérdida de material.
2. BORDES: Examina los 4 bordes. Busca chipping, roughness, marcas, irregularidades.
3. SUPERFICIE: Examina ambas caras. Busca rayaduras, pérdida de brillo, marcas de dedos, scratches, print defects.
4. CENTRADO: Proporción del borde en cada lado. Ideal 50/50. PSA acepta hasta 60/40 front y 65/35 back.

ESCALA: 95-100=GEM MINT, 88-94=MINT, 80-87=NEAR MINT+, 70-79=NEAR MINT, 60-69=EXCELLENT MINT, 50-59=EXCELLENT, 35-49=VERY GOOD, 20-34=GOOD, 1-19=POOR

Responde ÚNICAMENTE con JSON válido sin markdown ni texto extra:
{"score":85,"grade":"NEAR MINT+","subScores":{"corners":88,"edges":85,"surface":82,"centering":90},"findings":[{"severity":"ok","title":"Título","detail":"Detalle específico con ubicación exacta"}],"summary":"Descripción técnica de 2-3 frases.","marketContext":"Consejo de compra/venta para CardMarket o eBay."}

Incluye entre 4 y 8 findings muy concretos con ubicación exacta de cada defecto.`;

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
            { type: 'image', source: { type: 'base64', media_type: backType,  data: backBase64  } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(500).json({ error: err?.error?.message || 'Error de API' });
    }

    const data = await response.json();
    const raw = (data.content || []).map(b => b.text || '').join('').trim();
    const clean = raw.replace(/^```json\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Error interno' });
  }
}
