// /api/capture-order.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { orderID } = req.body || {};

  if (!orderID) {
    return res.status(400).json({ error: "Missing orderID" });
  }

  const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
  const SECRET = process.env.PAYPAL_CLIENT_SECRET;
  const ENV = process.env.PAYPAL_ENV || "sandbox";

  const BASE = ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

  try {
    // 1. Get OAuth token
    const auth = Buffer.from(`${CLIENT_ID}:${SECRET}`).toString("base64");

    const tokenRes = await fetch(`${BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.status(500).json({ error: "Unable to authenticate with PayPal", details: tokenData });
    }

    const accessToken = tokenData.access_token;

    // 2. Capture order
    const captureRes = await fetch(`${BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    });

    const captureData = await captureRes.json();

    if (!captureData || captureData.error) {
      return res.status(400).json({
        status: "ERROR",
        message: captureData?.error_description || "Could not capture order",
        details: captureData
      });
    }

    // success!
    return res.status(200).json({
      status: captureData.status || "COMPLETED",
      id: captureData.id,
      details: captureData
    });

  } catch (error) {
    return res.status(500).json({ error: "Capture error", details: error.toString() });
  }
}
