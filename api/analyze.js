export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { frontBase64, frontType, backBase64, backType } = req.body;
  if (!frontBase64 || !backBase64) return res.status(400).json({ error: 'Faltan imágenes' });

  const prompt = `You are a senior PSA card grader with 20 years of experience. You have personally graded over 100,000 Pokémon cards. Your assessment must match exactly what PSA would assign. Be STRICT. Never be generous. A card with ANY visible damage cannot be a 10.

CRITICAL PSA RULE: The final grade is determined by the WORST of the four criteria. A card with perfect corners, edges and surface but bad centering gets capped at the centering grade. One bad area ruins the whole grade.

═══════════════════════════════════════════
STEP 1 — CENTERING (examine FRONT and BACK)
═══════════════════════════════════════════
Visually estimate the border ratio left/right AND top/bottom on BOTH faces.
Use the WORST axis (horizontal or vertical, front or back) to determine centering grade:

PSA 10 requires: front 55/45 or better AND back 75/25 or better
PSA 9 requires: front 60/40 or better AND back 90/10 or better  
PSA 8 requires: front 65/35 or better AND back 90/10 or better
PSA 7 requires: front 70/30 or better AND back 90/10 or better
PSA 6 requires: front 80/20 or better AND back 90/10 or better
PSA 5 requires: front 85/15 or better AND back 90/10 or better
PSA 4 or below: worse than 85/15 on front

Assign centering_grade (integer 1-10) based on above.

═══════════════════════════════════════════
STEP 2 — CORNERS (examine all 4 corners)
═══════════════════════════════════════════
Inspect every corner under maximum detail. Look for:
- WHITENING: white spots or lines at corner tips from layer separation. Even ONE tiny dot = PSA 9 maximum. Multiple dots or visible whitening = PSA 8 or lower.
- FRAYING: fiber separation at corner tip. Slight fraying = PSA 8. Moderate = PSA 7. Heavy = PSA 6 or lower.
- ROUNDING/SOFTNESS: corner not sharp anymore. Slight = PSA 7-8. Noticeable = PSA 6. Rounded = PSA 5 or lower.
- CHIPPING: actual material loss. Automatic PSA 6 or lower.
- DENTING/BENDING: any bend or crush. PSA 7 or lower.

PSA 10: ALL four corners perfectly sharp, zero whitening visible even under 10x magnification
PSA 9: Maximum ONE tiny whitening dot OR barely detectable softness on ONE corner
PSA 8: Very slight fraying on 1-2 corners OR slight whitening visible to naked eye
PSA 7: Slight fraying on some corners, minor wear visible
PSA 6: Slightly graduated fraying, more visible corner wear
PSA 5: Minor rounding becoming evident
PSA 4: Corners slightly rounded
PSA 3: Noticeable rounding, not extreme
PSA 2: Accelerated rounding, obvious wear
PSA 1: Extreme rounding, corners may affect picture framing

Assign corners_grade (integer 1-10).

═══════════════════════════════════════════
STEP 3 — EDGES (examine all 4 edges)
═══════════════════════════════════════════
Look at all four edges of the card. On Pokémon cards the back is dark blue — whitening shows much more on dark borders.

- WHITENING on edges: any visible white = PSA 9 maximum on that edge. Heavy whitening across multiple edges = PSA 7 or lower.
- CHIPPING: small pieces missing from edge. Light = PSA 7-8. Moderate = PSA 6. Heavy = PSA 5 or lower.
- NICKS/NOTCHES: small indentations. Light = PSA 8. Visible = PSA 7.
- ROUGHNESS: uneven cut texture. Light = PSA 8-9. Visible = PSA 7.
- FRAYING on edges: fiber separation along edge. Light = PSA 8. Visible = PSA 7.

PSA 10: Perfectly crisp and clean edges on all four sides, zero whitening
PSA 9: Extremely minor edge imperfection, barely detectable
PSA 8: Slight fraying or whitening on one edge
PSA 7: Minor wear visible on edges, slight whitening
PSA 6: Very slight notching, more visible whitening
PSA 5: Minor chipping on edges
PSA 4: Noticeable edge wear
PSA 3: Edges exhibit noticeable wear
PSA 2: Chipping present, multiple edge issues

Assign edges_grade (integer 1-10).

═══════════════════════════════════════════
STEP 4 — SURFACE (examine FRONT and BACK)
═══════════════════════════════════════════
Examine both faces completely. On holographic Pokémon cards, surface damage is MORE visible.

- SCRATCHES: hairline scratches on holo = PSA 9 maximum. Light scratches visible = PSA 8. Moderate = PSA 7. Heavy = PSA 6 or lower.
- PRINT LINES: horizontal/vertical lines from printing process. Faint = PSA 9-10 possible (factory defect allowance). Visible = PSA 9. Obvious = PSA 8 or lower.
- LOSS OF GLOSS/MATTE SPOTS: any dulling of original shine = PSA 9 maximum. Significant loss = PSA 8 or lower.
- STAINS/MARKS: any discoloration = PSA 8 maximum. Visible stain = PSA 7 or lower.
- FINGER MARKS/GREASE: visible fingerprints or oiliness = PSA 8 maximum.
- DENTS/INDENTATIONS: any surface depression = PSA 8 maximum. Visible = PSA 7 or lower.
- CREASES/BENDS: any crease within the border = PSA 7 maximum. Crease visible from front = PSA 6 or lower. Multiple creases = PSA 5 or lower. Heavy crease = PSA 4 or lower.
- SILVERING on holo: foil layer separation showing silver = PSA 8 maximum. Heavy = PSA 7 or lower.
- PRINT DEFECTS (factory): off-register printing, color issues = evaluate severity. Slight = PSA 9. Obvious = PSA 8 or lower.
- FOCUS/BLUR: out-of-register printing. Slight = PSA 9. Noticeable = PSA 8. Obvious = PSA 7 or lower.

PSA 10: Original factory gloss intact, zero scratches, zero stains, no print lines (or only one allowable minor factory imperfection)
PSA 9: Only one of: very slight wax stain on BACK only, minor print imperfection, OR slightly off-white borders
PSA 8: Very slight surface wear, possible minor print imperfection, possibly slightly off-white borders
PSA 7: Minor surface wear visible, small print blemish acceptable, most original gloss retained
PSA 6: Visible surface wear or print defect, very light scratch detectable under close inspection, some gloss loss
PSA 5: Surface wear more visible, several light scratches visible
PSA 4: Noticeable surface wear, light scuffing or scratches, some gloss retained
PSA 3: Some surface wear apparent, possible creasing
PSA 2: Obvious surface wear, possible heavy scratches or several creases, gloss mostly gone

Assign surface_grade (integer 1-10).

═══════════════════════════════════════════
STEP 5 — FINAL GRADE CALCULATION
═══════════════════════════════════════════
PSA METHOD: The final grade is primarily determined by the WEAKEST subgrade. A strong area cannot save a weak one.

final_grade = minimum(centering_grade, corners_grade, edges_grade, surface_grade)

Exception: if three subgrades are significantly higher than the fourth, the final grade may be bumped up by maximum 0.5 from the minimum (e.g., if three are 10 and one is 9, final = 9, not 8).

Round to nearest integer (PSA does not use half-points for final grade).

Map to grade name:
10 = GEM MINT
9 = MINT  
8 = NEAR MINT-MINT
7 = NEAR MINT
6 = EXCELLENT-MINT
5 = EXCELLENT
4 = VERY GOOD-EXCELLENT
3 = VERY GOOD
2 = GOOD
1 = POOR

Convert PSA grade (1-10) to 0-100 score:
10 → 96-100 (center at 98)
9 → 88-95 (center at 92)
8 → 80-87 (center at 84)
7 → 70-79 (center at 75)
6 → 60-69 (center at 65)
5 → 50-59 (center at 55)
4 → 40-49 (center at 45)
3 → 30-39 (center at 35)
2 → 20-29 (center at 25)
1 → 1-19 (center at 10)

Adjust within the range based on how strong or weak within that grade.

IMPORTANT REMINDERS:
- A card with rounded corners, edge whitening, surface scratches CANNOT be a PSA 9 or 10. Period.
- If you see obvious damage (visible scratches, whitening, rounding), the grade must reflect it realistically.
- Be as strict as a real PSA grader. Most cards grade 7-8, not 9-10.
- Only truly exceptional pack-fresh cards deserve PSA 9-10.
- Describe defects with EXACT locations: "top-right corner", "bottom edge center", "holo surface near Pokémon name", etc.

Respond ONLY with valid JSON, no markdown, no text before or after:
{"score":75,"grade":"NEAR MINT","subScores":{"corners":80,"edges":75,"surface":78,"centering":85},"findings":[{"severity":"bad","title":"Whitening esquina superior derecha","detail":"Whitening visible a simple vista en la esquina superior derecha. Múltiples puntos blancos por separación de capas. Esto cap a la carta en PSA 8 máximo para corners."},{"severity":"warn","title":"Pérdida de gloss en superficie frontal","detail":"Zona central del artwork muestra pérdida de brillo original. Probable scratch hairline. Cap en PSA 9 para surface."}],"summary":"Carta con desgaste visible en esquinas y superficie. Las esquinas muestran whitening que la excluye de PSA 9-10. La superficie presenta pérdida de brillo consistente con uso moderado.","marketContext":"En este estado (equivalente PSA 7) el valor en CardMarket sería raw. No rentable graduar con PSA dado el coste vs valor esperado. Precio raw orientativo según carta."}

Include 6-10 findings. Cover ALL four criteria. Be extremely specific about location and severity.`;

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
        max_tokens: 2000,
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
