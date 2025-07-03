import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// --- Ваш публичный ключ Stripe ---
// Обязательно замените 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY' на ваш реальный публичный ключ Stripe.
// Для продакшена используйте переменные окружения!
const stripePromise = loadStripe('pk_test_51Rg3i9FV0PIBWfnxjk0n0Z3nIPEC7P0A6cU8G0VzUWoJsMha6oqmlL6gZy4un1o3C2M7ui6jNO1DGZI75NkoMtVh00IDw98YWm');

// --- Component for the actual payment form ---
// clientSecret теперь приходит как пропс из Navbar
const CheckoutForm = ({ amount, onPaymentSuccess, onPaymentError, onCloseForm, clientSecret }) => {
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false); // Состояние для Snackbar

  // Этот useEffect нужен для обработки случаев, когда Stripe редиректит пользователя обратно
  // после 3D Secure или других методов аутентификации.
  useEffect(() => {
    if (!stripe || !clientSecret) {
      return;
    }

    // Извлекаем paymentIntentClientSecret из URL, если был редирект
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntentClientSecret = urlParams.get('payment_intent_client_secret');

    // Если клиентский секрет в URL совпадает с текущим clientSecret,
    // или если это просто первый рендеринг формы с clientSecret
    if (paymentIntentClientSecret === clientSecret || !paymentIntentClientSecret) {
      stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
        switch (paymentIntent.status) {
          case 'succeeded':
            setMessage('Платеж успешно выполнен!');
            onPaymentSuccess('Платеж успешно выполнен!');
            setOpenSnackbar(true);
            break;
          case 'processing':
            setMessage('Платеж обрабатывается.');
            onPaymentError('Платеж обрабатывается.'); // Считаем ошибкой для пользователя, чтобы он ждал
            setOpenSnackbar(true);
            break;
          case 'requires_payment_method':
            setMessage('Ошибка платежа: пожалуйста, попробуйте другую карту.');
            onPaymentError('Ошибка платежа: попробуйте другую карту.');
            setOpenSnackbar(true);
            break;
          case 'requires_action':
            setMessage('Требуется дополнительная верификация платежа.');
            // Не нужно вызывать onPaymentError, т.к. Stripe должен был редиректить или показать UI для верификации
            setOpenSnackbar(true);
            break;
          default:
            setMessage('Что-то пошло не так.');
            onPaymentError('Что-то пошло не так.');
            setOpenSnackbar(true);
            break;
        }
      });
    }
  }, [stripe, clientSecret]); // Зависимости для useEffect

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not yet loaded.
      return;
    }

    setIsLoading(true);
    setMessage(null); // Очищаем предыдущие сообщения

    try {
      // clientSecret уже передан в Elements компонент,
      // поэтому здесь мы просто подтверждаем платеж
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        // clientSecret больше не нужно передавать сюда напрямую, он уже в Elements Context
        confirmParams: {
          return_url: window.location.origin, // Возвращаемся на текущий домен после 3D Secure/аутентификации
        },
        redirect: 'if_required', // Обрабатываем редирект вручную, если требуется 3D Secure
      });

      if (error) {
        // This point will only be reached if there is an immediate error when
        // confirming the payment (e.g., validation errors from Elements).
        setMessage(error.message);
        onPaymentError(error.message);
        setOpenSnackbar(true);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setMessage('Платеж успешно выполнен!');
        onPaymentSuccess('Платеж успешно выполнен!');
        setOpenSnackbar(true);
      } else if (paymentIntent && paymentIntent.status === 'requires_action') {
        // Для 3D Secure и других методов, требующих действия пользователя
        // Stripe.js уже должен был перенаправить или показать модальное окно.
        // Если это не произошло, возможно, что-то пошло не так.
        setMessage('Требуется дополнительная верификация платежа.');
        // onPaymentError('Требуется дополнительная верификация платежа.'); // Не ошибка, а статус
        setOpenSnackbar(true);
      }
    } catch (err) {
      console.error("Payment submission error:", err);
      setMessage(`Ошибка при обработке платежа: ${err.message}`);
      onPaymentError(`Ошибка при обработке платежа: ${err.message}`);
      setOpenSnackbar(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  return (
    <Box
      sx={{
        width: 450,
        backgroundColor: "#FFFFFF",
        padding: "30px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5">Оплата заказа</Typography>
        <IconButton
          onClick={onCloseForm} // Закрываем форму оплаты
          sx={{ color: "#000000", width: "40px", height: "40px" }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Render form only if elements are available */}
      {elements ? (
        <form id="payment-form" onSubmit={handleSubmit} style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* PaymentElement will create all the necessary input fields for card details */}
          {/* Layout 'tabs' - для удобства выбора способа оплаты */}
          <PaymentElement id="payment-element" options={{ layout: 'tabs' }} />

          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
            Сумма к оплате: {amount} ₽
          </Typography>

          <Button
            variant="contained"
            color="primary"
            fullWidth
            type="submit"
            disabled={isLoading || !stripe || !elements}
            sx={{ mt: 'auto' }} // Прижмем кнопку к низу
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : `Оплатить ${amount} ₽`}
          </Button>

          {/* Show any error or success messages */}
          {message && (
            <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
              <Alert onClose={handleCloseSnackbar} severity={message.includes('успешно') ? "success" : "error"} sx={{ width: '100%' }}>
                {message}
              </Alert>
            </Snackbar>
          )}
        </form>
      ) : (
        // Показываем лоадер, пока Stripe Elements инициализируются
        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Загрузка платежной формы...</Typography>
        </Box>
      )}
    </Box>
  );
};

// Main wrapper component for Stripe Elements
const StripePaymentForm = ({ clientSecret, ...props }) => {
  // clientSecret обязателен для инициализации Elements
  if (!clientSecret) {
    return (
      <Box
        sx={{
          width: 450,
          backgroundColor: "#FFFFFF",
          padding: "30px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6" color="error">Ошибка: Отсутствует clientSecret для Stripe.</Typography>
        <Button onClick={props.onCloseForm} sx={{ mt: 2 }}>Закрыть</Button>
      </Box>
    );
  }

  return (
    // Elements context must wrap the component that uses PaymentElement
    // options.clientSecret теперь приходит напрямую из пропсов
    <Elements options={{ clientSecret: clientSecret, appearance: { theme: 'stripe' } }} stripe={stripePromise}>
      {/* Передаем clientSecret вниз в CheckoutForm, хотя он там не строго нужен, но для логики retrievePaymentIntent можно оставить */}
      <CheckoutForm clientSecret={clientSecret} {...props} />
    </Elements>
  );
};

export default StripePaymentForm;
