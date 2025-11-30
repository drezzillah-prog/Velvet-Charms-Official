// /api/create-order.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { cart } = req.body || {};

  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    return res.status(400).json({ error: "Cart is empty or invalid" });
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

    // 2. Build purchase units from cart
    const items = cart.items.map(item => ({
      name: item.name || `Product ${item.id}`,
      unit_amount: {
        currency_code: "USD",
        value: Number(item.price).toFixed(2)
      },
      quantity: item.qty.toString()
    }));

    const total = items.reduce((s, it) => s + (Number(it.unit_amount.value) * Number(it.quantity)), 0);
    const shippingAmount = cart.shipping || 0;

    const orderBody = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: (total + shippingAmount).toFixed(2),
            breakdown: {
              item_total: {
                currency_code: "USD",
                value: total.toFixed(2)
              },
              shipping: {
                currency_code: "USD",
                value: shippingAmount.toFixed(2)
              }
            }
          },
          items
        }
      ],
      application_context: {
        brand_name: "Velvet Charms",
        landing_page: "LOGIN",
        user_action: "PAY_NOW",
        return_url: "https://example.com/return", 
        cancel_url: "https://example.com/cancel"
      }
    };

    // 3. Create order
    const orderRes = await fetch(`${BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(orderBody)
    });

    const orderData = await orderRes.json();

    if (!orderData.id) {
      return res.status(500).json({ error: "Failed to create order", details: orderData });
    }

    // Return order ID + approval link
    const approveUrl = orderData.links?.find(l => l.rel === "approve")?.href;

    return res.status(200).json({
      orderID: orderData.id,
      approveUrl
    });

  } catch (error) {
    return res.status(500).json({ error: "Create order error", details: error.toString() });
  }
}
