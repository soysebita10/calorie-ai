# CalorieAI

One-page marketing site for **CalorieAI**, an AI-powered calorie tracking app by **Sebastian Nieves**.

## Files

- `index.html`: page markup
- `styles.css`: green-and-white responsive styles
- `favicon.svg`: site icon
- `vercel.json`: Vercel config (static site, no build step)

## Run locally

Open `index.html` in a browser.

## Deploy to Vercel

**Option A: Vercel CLI**

```bash
npm i -g vercel
cd calorie-ai
vercel        # preview deploy
vercel --prod # production deploy
```

**Option B: GitHub + Vercel dashboard**

1. Push this folder to a GitHub repo.
2. In Vercel, click **Add New → Project** and import the repo.
3. Framework preset: **Other**. Leave the build command empty and the output directory as the default (root).
4. Click **Deploy**.

Authentication and payments are intentionally not included yet.
