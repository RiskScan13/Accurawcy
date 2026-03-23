export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { frontBase64, frontType, backBase64, backType } = req.body;
  if (!frontBase64 || !backBase64) return res.status(400).json({ error: 'Faltan imágenes' });

  const prompt = `Eres un grader profesional certificado con 20 años de experiencia graduando cartas para PSA y BGS. Tu análisis debe ser IDÉNTICO al de un grader humano experto. Sé ESTRICTO y PRECISO, nunca seas generoso.

Analiza esta carta Pokémon (imagen 1 = frontal, imagen 2 = trasera) siguiendo EXACTAMENTE este sistema de puntuación matemático:

SISTEMA: Empieza cada subcriterio en 100 y resta penalizaciones acumuladas.

CRITERIO 1 - ESQUINAS (25% del total):
Examina las 4 esquinas individualmente. Penalizaciones por esquina:
- Whitening micro (solo bajo lupa): -1pt
- Whitening light (visible a ojo): -3pts
- Whitening moderate (claramente visible): -6pts
- Whitening heavy (grave): -12pts
- Fraying light: -3pts | moderate: -7pts | heavy: -12pts
- Chipping light: -4pts | moderate: -8pts | heavy: -15pts
- Denting light: -3pts | moderate: -7pts
subScore corners = 100 menos suma de penalizaciones de las 4 esquinas.

CRITERIO 2 - BORDES (25% del total):
Examina los 4 bordes. Penalizaciones por borde:
- Chipping light: -3pts | moderate: -7pts | heavy: -14pts
- Roughness light: -2pts | moderate: -5pts
- Nicks light: -2pts | moderate: -5pts
- Líneas de borde irregulares: -2 a -5pts
subScore edges = 100 menos suma de penalizaciones de los 4 bordes.

CRITERIO 3 - SUPERFICIE (25% del total):
Examina ambas caras. Penalizaciones:
- Scratch hairline: -2pts | light: -5pts | moderate: -10pts | deep: -18pts
- Print lines (fábrica): -1 a -3pts
- Print defects: -3 a -8pts
- Loss of gloss: -2 a -12pts
- Dents/indentations: -3 a -8pts
- Finger marks: -1 a -4pts
- Creases/dobleces: -5 a -20pts
subScore surface = 100 menos suma de todas las penalizaciones de superficie.

CRITERIO 4 - CENTRADO (25% del total):
Mide proporción izquierda/derecha Y arriba/abajo en frontal y trasera. Usa el peor eje:
- 50/50: 0pts | 55/45: -1pt | 60/40: -3pts | 65/35: -7pts | 70/30: -12pts | 75/25+: -18pts
subScore centering = 100 menos penalización.

SCORE FINAL = (corners + edges + surface + centering) / 4, redondeado al entero.

GRADOS:
98-100=GEM MINT | 93-97=MINT | 87-92=NEAR MINT+ | 80-86=NEAR MINT | 70-79=EXCELLENT MINT | 60-69=EXCELLENT | 45-59=VERY GOOD | 30-44=GOOD | 0-29=POOR

REGLAS:
1. Aplica las penalizaciones matemáticamente. El resultado debe ser siempre el mismo para la misma imagen.
2. Si no puedes ver un área con claridad, penaliza conservadoramente.
3. Indica siempre la ubicación exacta de cada defecto.
4. Incluye entre 6 y 10 findings cubriendo todos los criterios.

Responde ÚNICAMENTE con JSON válido, sin markdown, sin texto extra:
{"score":85,"grade":"NEAR MINT+","subScores":{"corners":88,"edges":85,"surface":82,"centering":90},"findings":[{"severity":"ok","title":"Título","detail":"Ubicación exacta + defecto + severidad + penalización aplicada"}],"summary":"Valoración técnica de 2-3 frases como grader PSA.","marketContext":"Rango de precio en CardMarket/eBay y recomendación de compra/venta."}`;

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
        max_tokens: 1500,
        temperature: 0,
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
    return res.status(200).json(JSON.parse(clean.slice(start, end + 1)));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
