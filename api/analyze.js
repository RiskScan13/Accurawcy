export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { frontBase64, frontType, backBase64, backType } = req.body;
  if (!frontBase64 || !backBase64) return res.status(400).json({ error: 'Faltan imágenes' });

  const prompt = `Eres un grader profesional certificado con 20 años de experiencia graduando cartas para PSA y BGS. Tu análisis debe ser IDÉNTICO al de un grader humano experto. Sé ESTRICTO y PRECISO — nunca seas generoso.

Analiza esta carta Pokémon (imagen 1 = frontal, imagen 2 = trasera) siguiendo EXACTAMENTE estos criterios profesionales:

═══════════════════════════════
CRITERIO 1: ESQUINAS (weight: 25%)
═══════════════════════════════
Examina las 4 esquinas bajo máximo detalle. Busca:
- WHITENING: pérdida de la capa de tinta blanca exterior. Clasifica: none / micro (visible solo a 10x) / light (visible a ojo) / moderate (claramente visible) / heavy (grave pérdida)
- FRAYING: deshilachado de las fibras del cartón en la punta
- CHIPPING: pérdida de material en la esquina
- DENTING: hundimiento o aplastamiento de la esquina
Penalización por esquina: none=0pts, micro=-1, light=-4, moderate=-8, heavy=-15

═══════════════════════════════
CRITERIO 2: BORDES (weight: 25%)
═══════════════════════════════
Examina los 4 bordes completos. Busca:
- CHIPPING: pérdida de tinta/material en el borde
- ROUGHNESS: irregularidades táctiles en el corte
- NICKS: pequeñas muescas o golpes
- BORDER LINES: líneas de color en los bordes exteriores (normal en algunas ediciones, pero evalúa uniformidad)
Penalización: leve=-3, moderado=-7, grave=-14 por borde afectado

═══════════════════════════════
CRITERIO 3: SUPERFICIE (weight: 25%)
═══════════════════════════════
Examina AMBAS caras con máximo detalle. Busca:
- SCRATCHES: rayaduras. Clasifica: hairline (apenas visibles) / light / moderate / deep
- PRINT LINES: líneas de impresión del proceso de fabricación (defecto de fábrica, penaliza menos)
- PRINT DEFECTS: manchas, áreas sin tinta, colores desplazados
- LOSS OF GLOSS: pérdida de brillo en zonas específicas
- INDENTATIONS/DENTS: hundimientos en la superficie
- FINGER MARKS/GREASE: marcas de dedos o grasa
- CREASES: arrugas o dobleces leves
Penalización según severidad y extensión

═══════════════════════════════
CRITERIO 4: CENTRADO (weight: 25%)
═══════════════════════════════
Mide visualmente la proporción de borde en cada lado:
FRONTAL: compara borde izquierdo vs derecho, y borde superior vs inferior
TRASERA: mismo análisis
Escala PSA:
- 50/50: perfecto = sin penalización
- 55/45: excelente = -1pt
- 60/40: bueno (límite PSA 10) = -3pts
- 65/35: aceptable (límite PSA 9) = -6pts
- 70/30: malo = -10pts
- >70/30: muy malo = -15pts
Usa el peor eje (H o V) para puntuar

═══════════════════════════════
ESCALA DE PUNTUACIÓN FINAL
═══════════════════════════════
Empieza con 100 puntos y aplica penalizaciones acumuladas:
100-98: GEM MINT (PSA 10 / BGS 9.5+)
97-93: MINT (PSA 9)
92-87: NEAR MINT+ (PSA 8.5)
86-80: NEAR MINT (PSA 8)
79-70: EXCELLENT MINT (PSA 7)
69-60: EXCELLENT (PSA 6)
59-45: VERY GOOD (PSA 5)
44-30: GOOD (PSA 4-3)
<30: POOR (PSA 2-1)

IMPORTANTE: Si la imagen no tiene suficiente resolución para evaluar un criterio con certeza, indícalo en los findings con severity "warn" y asume el caso más desfavorable razonable.

Responde ÚNICAMENTE con JSON válido, sin markdown, sin texto extra:
{"score":85,"grade":"NEAR MINT+","subScores":{"corners":88,"edges":85,"surface":82,"centering":90},"findings":[{"severity":"ok|warn|bad","title":"Título corto","detail":"Descripción muy específica: qué defecto, en qué ubicación exacta, qué severidad, cómo impacta en la puntuación"}],"summary":"Valoración técnica global de 2-3 frases como haría un grader profesional.","marketContext":"Precio orientativo en CardMarket/eBay para esta carta en este estado, y recomendación de compra/venta."}

Incluye SIEMPRE entre 5 y 10 findings. Sé extremadamente específico en las ubicaciones (ej: 'esquina superior derecha', 'borde inferior', 'zona central del artwork', 'tercio superior del reverso').`;

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
