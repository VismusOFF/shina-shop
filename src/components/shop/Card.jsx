import React, { useState, useEffect } from 'react'; // Добавили useEffect
import { Box, Typography, IconButton, Snackbar, Alert } from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getDatabase, ref, push, get, update, set, remove } from 'firebase/database'; // Добавили set и remove
import { getAuth } from 'firebase/auth';

const CardShop = ({ id, model, price, season, size, type, img }) => {
  const [favorite, setFavorite] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const auth = getAuth();
  const db = getDatabase();

  // Хук для инициализации статуса избранного при загрузке компонента
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      const user = auth.currentUser;
      if (user) {
        const uid = user.uid;
        const favoriteRef = ref(db, `users/${uid}/favorites/${id}`);
        try {
          const snapshot = await get(favoriteRef);
          setFavorite(snapshot.exists());
        } catch (error) {
          console.error("Ошибка при проверке статуса избранного:", error);
        }
      } else {
        setFavorite(false);
      }
    };

    checkFavoriteStatus();
  }, [id, auth.currentUser, db]); // Зависимости: id товара, текущий пользователь, объект базы данных

  const toggleFavorite = async () => { // Функция теперь асинхронная
    const user = auth.currentUser;
    if (!user) {
      alert('Пожалуйста, войдите в систему, чтобы управлять избранным');
      return;
    }

    const uid = user.uid;
    const favoriteItemRef = ref(db, `users/${uid}/favorites/${id}`);

    try {
      const snapshot = await get(favoriteItemRef);

      if (snapshot.exists()) {
        // Товар уже в избранном, удаляем его
        await remove(favoriteItemRef);
        setFavorite(false);
        // Можно добавить отдельный Snackbar для избранного/удаления из избранного
        // alert('Удалено из избранного');
      } else {
        // Товара нет в избранном, добавляем его
        await set(favoriteItemRef, {
          model,
          price,
          season,
          size,
          type,
          img,
          addedAt: Date.now(),
        });
        setFavorite(true);
        // alert('Добавлено в избранное');
      }
    } catch (error) {
      console.error('Ошибка при изменении статуса избранного:', error);
      alert('Ошибка при изменении статуса избранного');
    }
  };

  const imageSrc = img || 'https://via.placeholder.com/210x140.png?text=Фото+товара';

  const addToCart = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert('Пожалуйста, войдите в систему, чтобы добавить товар в корзину');
      return;
    }

    const uid = user.uid;
    // const db = getDatabase(); // Уже инициализирован выше

    try {
      const cartRef = ref(db, `users/${uid}/cart`);
      const cartSnapshot = await get(cartRef);
      const cart = cartSnapshot.val() || {};

      // Поиск существующего товара по его уникальному ID
      const existingEntry = Object.entries(cart).find(([key, item]) => {
        return item.id === id;
      });

      if (existingEntry) {
        const [existingKey, existingItem] = existingEntry;
        const newQuantity = (existingItem.quantity || 1) + 1;

        const updates = {};
        updates[`${existingKey}/quantity`] = newQuantity;

        await update(ref(db, `users/${uid}/cart`), updates);
      } else {
        // добавление нового товара
        const cartItem = {
          id, // Добавляем уникальный ID товара
          model,
          price,
          season,
          size,
          type,
          img,
          quantity: 1,
          addedAt: Date.now(),
        };
        await push(ref(db, `users/${uid}/cart`), cartItem);
      }

      setSnackbarOpen(true);
    } catch (error) {
      console.error('Ошибка при добавлении в корзину:', error);
      alert('Ошибка при добавлении в корзину');
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  return (
    <>
      <Box
        sx={{
          width: 210,
          height: 320,
          border: '1px solid #ccc',
          borderRadius: 2,
          position: 'relative',
          overflow: 'hidden',
          bgcolor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 1,
        }}
      >
        <IconButton
          onClick={toggleFavorite} // Вызываем новую асинхронную функцию
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            bgcolor: 'background.paper',
            zIndex: 2,
            boxShadow: 1,
            '&:hover': { bgcolor: 'background.paper' },
          }}
          size="small"
          aria-label="Добавить в избранное"
        >
          {favorite ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
        </IconButton>

        <Box
          component="img"
          src={imageSrc}
          alt={model}
          sx={{
            pt: '7px',
            justifySelf: 'center',
            alignSelf: 'center',
            width: '70%',
            height: 180,
            
            borderBottom: '1px solid #eee',
          }}
        />

        <Typography
          variant="subtitle1"
          sx={{
            mt: 1,
            px: 1,
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={model}
        >
          {model}
        </Typography>

        <Box sx={{ px: 1, color: 'text.secondary', mb: 1 }}>
          <Typography variant="body2" sx={{ lineHeight: 1.2 }} title={season}>
            {season}
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.2 }} title={size}>
            {size}
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.2 }} title={type}>
            {type}
          </Typography>
        </Box>

        <Box
          sx={{
            px: 1,
            mt: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
          }}
        >
          <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
            {price} ₽
          </Typography>
          <IconButton
            aria-label="Добавить в корзину"
            size="small"
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            }}
            onClick={addToCart}
          >
            <ShoppingCartIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Snackbar с зелёной галочкой */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="success"
          icon={<CheckCircleIcon fontSize="inherit" />}
          sx={{ width: '100%' }}
          variant="filled"
        >
          Товар добавлен в корзину
        </Alert>
      </Snackbar>
    </>
  );
};

export default CardShop;
