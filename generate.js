// Female Dominance Studio — Gemini Image Generation Proxy
// Deploy on Vercel. Set GEMINI_API_KEY in Vercel environment variables.

module.exports = async function handler(req, res) {
  // CORS headers — must be set before ANYTHING else
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Health check — GET request just confirms proxy is alive
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', message: 'FD Studio Gemini proxy is running' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured in Vercel environment variables' });
  }

  try {
    const body = req.body || {};
    const { prompt, model, refImageBase64, refImageMime } = body;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    // Use gemini-2.0-flash-exp — confirmed free, available, supports image generation
    const geminiModel = model || 'gemini-2.0-flash-exp';

    // Build parts
    const parts = [];

    if (refImageBase64) {
      parts.push({
        text:
          'CRITICAL: The attached reference photo shows the EXACT person for this scene. ' +
          'Preserve their face, features, skin tone, eye shape, hair colour/style, ' +
          'body proportions, outfit and footwear (including heel type/height) exactly. ' +
          'Do NOT change the person\'s appearance at all. ' +
          'Only change the scene background/environment as described below.\n\n' + prompt
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
      'https://generativelanguage.googleapis.com/v1beta/models/' + geminiModel + ':generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: parts }],
          generationConfig: { responseModalities: ['Text', 'Image'] }
        })
      }
    );

    const responseText = await geminiRes.text();

    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({
        error: 'Gemini API error ' + geminiRes.status,
        details: responseText
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return res.status(500).json({ error: 'Invalid JSON from Gemini', raw: responseText.slice(0, 500) });
    }

    const parts2 = (data.candidates &&
                    data.candidates[0] &&
                    data.candidates[0].content &&
                    data.candidates[0].content.parts) || [];

    const imagePart = parts2.find(function(p) {
      return p.inlineData && p.inlineData.mimeType && p.inlineData.mimeType.startsWith('image/');
    });

    if (!imagePart) {
      const textPart = parts2.find(function(p) { return p.text; });
      return res.status(500).json({
        error: 'No image in Gemini response',
        debug: textPart ? textPart.text : JSON.stringify(data).slice(0, 500)
      });
    }

    return res.status(200).json({
      imageBase64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType
    });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown server error' });
  }
};

