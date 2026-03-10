// Female Dominance Studio — Gemini Image Generation Proxy
// Deploy on Vercel. Set GEMINI_API_KEY in Vercel environment variables.
// Free tier: 500 images/day, no credit card needed from Google AI Studio.

module.exports = async function handler(req, res) {
  // CORS — allow all origins (your GitHub Pages app)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set in Vercel env vars' });

  try {
    const { prompt, model, refImageBase64, refImageMime } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const geminiModel = model || 'gemini-2.0-flash-exp';

    // Build parts — text prompt + optional reference image
    const parts = [];

    if (refImageBase64) {
      parts.push({
        text:
          'CRITICAL: The attached reference photo shows the EXACT person for this scene. ' +
          'Preserve their face, facial features, skin tone, eye shape, hair colour and style, ' +
          'body proportions, and every detail of their outfit and footwear (including heel type/height) ' +
          'with complete accuracy. Do NOT alter the person\'s appearance in any way. ' +
          'Only change the scene background and environment as described.\n\n' + prompt
      });
      parts.push({
        inlineData: {
          mimeType: refImageMime || 'image/jpeg',
          data: refImageBase64
        }
      });
    } else {
      parts.push({ text: prompt });
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            responseModalities: ['Text', 'Image']
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return res.status(geminiRes.status).json({ error: 'Gemini error: ' + errText });
    }

    const data = await geminiRes.json();
    const candidates = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];

    const imagePart = candidates.find(function(p) { return p.inlineData && p.inlineData.mimeType && p.inlineData.mimeType.startsWith('image/'); });
    if (!imagePart) {
      const textPart = candidates.find(function(p) { return p.text; });
      return res.status(500).json({ error: 'No image returned', debug: (textPart && textPart.text) || JSON.stringify(data) });
    }

    return res.status(200).json({
      imageBase64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
