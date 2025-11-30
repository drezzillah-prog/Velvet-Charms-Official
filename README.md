# Velvet Charms — Website Deployment Guide

## Files included
- `index.html`, `catalogue.html`, `about.html`, `contact.html`
- `style.css`, `script.js`
- `catalogue.json`
- `api/paypal/create_order.js`
- `api/paypal/capture_order.js`
- `vercel.json`
- `lang/en.json`
- Images in `/data/` (upload from your repository)

## 1) Push to GitHub
Place all files in the root of your GitHub repo (no nested webserver required).

## 2) Connect GitHub repo to Vercel
Import project on Vercel. Use default settings.

## 3) Environment variables (Vercel Project Settings)
Add the following:
- `PAYPAL_CLIENT_ID` = (your client id)
- `PAYPAL_CLIENT_SECRET` = (your secret) **DO NOT** commit to GitHub
- `PAYPAL_ENV` = `sandbox` (for testing) or `live`
- `BASE_URL` = `https://<your-vercel-domain>`

## 4) Test with Sandbox
1. Set `PAYPAL_ENV=sandbox`.
2. Create a PayPal Sandbox app at developer.paypal.com and copy sandbox client id & secret to Vercel env.
3. Deploy, open site, add items to cart, checkout — it should redirect to PayPal sandbox for approval.
4. Approve payment. PayPal will redirect to `/api/paypal/capture_order` which returns a confirmation page.

## 5) Switch to Live
When testing OK, set `PAYPAL_ENV=live` and replace sandbox creds with live app credentials.

## 6) Notes & next steps
- If images have mismatched filenames, rename either files or JSON references.
- If you want multi-currency conversion based on live exchange rates, we can integrate a rates API next.
- For translations (FR/IT/RO), I will auto-generate and you can review.

Good luck — ping me if you want me to:
- Auto-generate `lang/fr.json`, `lang/it.json`, `lang/ro.json`
- Add order storage (Google Sheets / Firebase / Postgres)
- Add shipping labels integration later
