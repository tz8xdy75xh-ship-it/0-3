const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---- Stripe Checkout ----
const stripeSecret = process.env.STRIPE_SECRET_KEY;
let stripe = null;
if (stripeSecret) {
  stripe = require('stripe')(stripeSecret);
}

app.post('/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
    const { itemName, priceYen } = req.body;
    const amount = Number(priceYen);
    if (!itemName || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'invalid params' });
    }
    const host = `${req.protocol}://${req.get('host')}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'jpy',
          product_data: { name: itemName },
          unit_amount: amount // JPY は小数なし
        },
        quantity: 1
      }],
      success_url: `${host}/?paid=1`,
      cancel_url: `${host}/?paid=0`
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to create session' });
  }
});

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
