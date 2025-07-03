// functions/index.js

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe');

// --- ИМПОРТИРУЕМ defineSecret И defineString (или defineString если не секрет) ---
const { defineSecret } = require('firebase-functions/params'); // Для секретов
const { defineString } = require('firebase-functions/params'); // Для обычных строковых параметров

// 1. Определяем параметры, которые будут доступны через functions.config()
// Для секретного ключа Stripe:
const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY'); // Имя, под которым секрет будет доступен в process.env

// Для секрета вебхука Stripe:
// Если вы его задавали как `stripe.webhook_secret`, то можно так:
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET'); // Имя, под которым секрет будет доступен в process.env

// Если у вас есть другие переменные, которые вы хотите получить
// const SOME_OTHER_VAR = defineString('SOME_OTHER_VAR'); // Для обычных строковых переменных


// 2. Глобальные переменные для отложенной инициализации
let adminInitialized = false;
let stripeClientInstance = null;
let stripeWebhookSecretValue = null;

function initializeFirebaseAdmin() {
  if (!adminInitialized) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    adminInitialized = true;
  }
}

function getStripeClient() {
  if (!stripeClientInstance) {
    // === ИЗМЕНЕНИЕ ЗДЕСЬ: ДОСТУП ЧЕРЕЗ process.env ===
    const secretKey = STRIPE_SECRET_KEY.value(); // Доступ к значению секрета
    // ===============================================
    
    if (!secretKey) {
      console.error("CRITICAL ERROR: STRIPE_SECRET_KEY is NOT set in Firebase Functions environment configuration. Payment intents will fail.");
      return null;
    }
    stripeClientInstance = stripe(secretKey);
  }
  return stripeClientInstance;
}

function getStripeWebhookSecret() {
  if (!stripeWebhookSecretValue) {
    // === ИЗМЕНЕНИЕ ЗДЕСЬ: ДОСТУП ЧЕРЕЗ process.env ===
    const webhookSecret = STRIPE_WEBHOOK_SECRET.value(); // Доступ к значению секрета
    // ===============================================
    
    if (!webhookSecret) {
      console.warn("WARNING: STRIPE_WEBHOOK_SECRET is NOT set. Webhook verification will fail!");
      return null;
    }
    stripeWebhookSecretValue = webhookSecret;
  }
  return stripeWebhookSecretValue;
}


// --- Cloud Function: createPaymentIntent ---
// Прикрепляем параметры к функции
exports.createPaymentIntentHttp = functions.https.onRequest( // <-- НОВОЕ ИМЯ
  { secrets: [STRIPE_SECRET_KEY] },
  async (req, res) => {
    // === CORS Headers (Обязательно для onRequest!) ===
    res.set('Access-Control-Allow-Origin', 'http://localhost:5173'); // Конкретный домен localhost
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');

    // Handle OPTIONS (preflight) request
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    // ===============================================

    initializeFirebaseAdmin(); // Инициализация Admin SDK

    const stripeClient = getStripeClient();
    if (!stripeClient) {
      console.error("Stripe client not initialized.");
      return res.status(500).json({ error: 'Server configuration error: Stripe client not available.' });
    }

    // Данные теперь в req.body
    const { amount, currency, userId } = req.body; // Получаем userId из тела запроса

    // Проверка данных (можно добавить более строгие проверки)
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount provided.' });
    }
    if (!currency || typeof currency !== 'string') {
      return res.status(400).json({ error: 'Invalid currency provided.' });
    }
    // userId теперь приходит из тела запроса, а не из context.auth
    if (!userId) {
        console.warn("createPaymentIntent called without userId.");
        // Можно вернуть ошибку или продолжить без userId в metadata Stripe
        return res.status(400).json({ error: 'User ID is required.' });
    }


    try {
      const paymentIntent = await stripeClient.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: currency,
        metadata: { userId: userId }, // Передаем userId из req.body
        description: `Покупка для пользователя ${userId}`,
      });

      return res.status(200).json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error('Error creating Payment Intent:', error);
      return res.status(500).json({ error: 'Unable to create payment intent.', details: error.message });
    }
  }
);


// --- Cloud Function: stripeWebhook ---
// Прикрепляем параметры к функции
exports.stripeWebhook = functions.https.onRequest(
  { secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] }, // Объявляем, что этой функции нужны эти секреты
  async (req, res) => {
    initializeFirebaseAdmin();

    const stripeClient = getStripeClient();
    const endpointSecret = getStripeWebhookSecret();

    if (!stripeClient || !endpointSecret) {
      console.error("Stripe client or webhook secret is not initialized. Cannot process webhook.");
      return res.status(500).send("Server configuration error.");
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripeClient.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed.', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntentSucceeded = event.data.object;
        console.log(`PaymentIntent for ${paymentIntentSucceeded.amount} was successful! Payment ID: ${paymentIntentSucceeded.id}`);

        const userId = paymentIntentSucceeded.metadata.userId;
        const stripePaymentId = paymentIntentSucceeded.id;
        const orderAmount = paymentIntentSucceeded.amount / 100;

        if (userId) {
          const db = admin.database();
          const userOrderRef = db.ref(`users/${userId}/orders/${stripePaymentId}`);

          try {
            await userOrderRef.set({
              status: 'completed',
              amount: orderAmount,
              currency: paymentIntentSucceeded.currency,
              createdAt: admin.database.ServerValue.TIMESTAMP,
            });
            await db.ref(`users/${userId}/cart`).remove();
            console.log(`Order for user ${userId} updated to completed, cart cleared.`);
          } catch (dbError) {
            console.error(`Error updating DB for user ${userId}:`, dbError);
            return res.status(500).send(`Database update error: ${dbError.message}`);
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntentFailed = event.data.object;
        console.log(`PaymentIntent failed for ${paymentIntentFailed.amount}. Reason: ${paymentIntentFailed.last_payment_error?.message}`);
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({received: true});
  }
);
