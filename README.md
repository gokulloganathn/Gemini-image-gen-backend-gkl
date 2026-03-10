# FD Studio — Gemini Proxy (Vercel)
## What this does
Proxies image generation requests from your GitHub Pages app → Google Gemini API.
- **500 free images/day** (Google AI Studio free tier, no credit card)
- Your API key stays secret on Vercel — never exposed in browser
- Supports face/costume reference images

---

## Setup (5 minutes)

### Step 1 — Get your free Gemini API key
1. Go to **https://aistudio.google.com/apikey**
2. Sign in with Google
3. Click **"Create API Key"**
4. Copy the key (starts with `AIza...`)

### Step 2 — Deploy this to Vercel
1. Go to **https://vercel.com** → sign up free with GitHub
2. Click **"Add New Project"**
3. Upload this folder OR push it to a GitHub repo and import it
4. In **Environment Variables**, add:
   - Name: `GEMINI_API_KEY`
   - Value: `AIza...` (your key from Step 1)
5. Click **Deploy**
6. Copy your Vercel URL: `https://your-project.vercel.app`

### Step 3 — Update your index.html
In **Settings** (⚙️ icon) in the app, paste your Vercel URL.
That's it. Image generation now uses Gemini directly — no Puter needed.

---

## Free tier limits
| Model | Free/day | Quality |
|---|---|---|
| gemini-2.5-flash-image | ~500 images | Great |
| gemini-3.1-flash-image-preview | Limited | Better |

## API endpoint
`POST https://your-project.vercel.app/api/generate`

```json
{
  "prompt": "your scene description",
  "model": "gemini-2.5-flash-image",
  "refImageBase64": "...(optional, pure base64)...",
  "refImageMime": "image/jpeg"
}
```

Response:
```json
{
  "imageBase64": "...(base64 PNG)...",
  "mimeType": "image/png"
}
```
