---
name: vercel
description: Deploy this Next.js repo to Vercel, including build verification, Vercel environment variable checks, CLI deployment, and Git push workflow.
---

# Vercel Deployment

Use this skill when deploying this repository to Vercel or preparing a push that should trigger a Vercel deployment.

## Repo Facts

- App framework: Next.js
- Package manager: pnpm is preferred because `pnpm-lock.yaml` and `pnpm-workspace.yaml` are present.
- Build command: `pnpm build`
- Dev command: `pnpm dev`
- Vercel framework preset: Next.js
- Vercel root directory: repository root

## Required Environment Variables

Use one backend path.

Google AI Studio:

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
NEXT_PUBLIC_DEFAULT_TOP_K=3
```

Vertex AI:

```env
VERTEX_PROJECT=
VERTEX_LOCATION=us-central1
VERTEX_SERVICE_ACCOUNT_JSON=
GEMINI_MODEL=gemini-2.0-flash-001
NEXT_PUBLIC_DEFAULT_TOP_K=3
```

Never commit `.env.local` or secret values. Set production secrets in Vercel Project Settings -> Environment Variables, or with `vercel env add`.

## Deployment Workflow

1. Check repository state:

```bash
git status --short
git remote -v
```

2. Verify the app builds locally:

```bash
pnpm build
```

3. If deploying via Vercel CLI, link the project if needed:

```bash
npx vercel link
```

4. Deploy a preview:

```bash
npx vercel
```

5. Deploy production:

```bash
npx vercel --prod
```

6. If using Git-connected Vercel deployment, commit and push:

```bash
git add skills/vercel/SKILL.md skills/vercel/SKILLS.md
git commit -m "Add Vercel deployment skill"
git push origin main
```

## Vercel Project Settings

Use these settings if Vercel asks:

- Framework Preset: Next.js
- Install Command: `pnpm install`
- Build Command: `pnpm build`
- Output Directory: leave default
- Root Directory: `./`

## Failure Handling

- If the build fails, fix the app before deploying.
- If Vercel CLI is not authenticated, run `npx vercel login`.
- If env vars are missing in production, add them in Vercel and redeploy.
- If both `package-lock.json` and `pnpm-lock.yaml` confuse Vercel, set the install command explicitly to `pnpm install`.
