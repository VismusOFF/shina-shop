import React, { useEffect, useState, useCallback } from "react"; // Добавили useCallback
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  // Добавим CircularProgress и Alert для более полной обработки
  CircularProgress,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import ShoppingBasketOutlinedIcon from "@mui/icons-material/ShoppingBasketOutlined";
import { getDatabase, ref, onValue, remove } from "firebase/database";

// Добавим проп onCheckout для вызова процесса оплаты
const Basket = ({ isOpen, toggleDrawer, userId, onCheckout }) => {
  const [basketItems, setBasketItems] = useState(null);
  const [loading, setLoading] = useState(true); // Добавим состояние загрузки
  const [error, setError] = useState(null);   // Добавим состояние ошибки

  useEffect(() => {
    if (!userId) {
      setBasketItems(null);
      setLoading(false); // Загрузка завершена, если нет пользователя
      return;
    }

    setLoading(true); // Начинаем загрузку
    setError(null);   // Сбрасываем ошибку

    const db = getDatabase();
    const basketRef = ref(db, `users/${userId}/cart`);

    const unsubscribe = onValue(
      basketRef,
      (snapshot) => {
        const data = snapshot.val();
        setBasketItems(data);
        setLoading(false); // Загрузка завершена
      },
      (err) => { // Обработка ошибок при чтении из Realtime Database
        console.error("Ошибка чтения корзины:", err);
        setError("Не удалось загрузить корзину.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const totalPrice = basketItems
    ? Object.values(basketItems).reduce(
        (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
        0
      )
    : 0;

  const totalCount = basketItems
    ? Object.values(basketItems).reduce(
        (sum, item) => sum + (item.quantity || 1),
        0
      )
    : 0;

  // Удаление товара по itemId
  const handleDelete = useCallback((itemId) => {
    if (!userId) return;
    const db = getDatabase();
    const itemRef = ref(db, `users/${userId}/cart/${itemId}`);

    remove(itemRef).catch((error) => {
      console.error("Ошибка удаления товара из корзины:", error);
      // Можно показать уведомление пользователю об ошибке
    });
  }, [userId]); // Зависимость userId

  // Обработчик для кнопки "Оплатить"
  const handlePay = useCallback(() => {
    if (onCheckout && totalPrice > 0) {
      // Передаем общую сумму и, возможно, список товаров для оформления заказа
      onCheckout(totalPrice, basketItems);
      toggleDrawer(false); // Закрываем корзину после начала оплаты
    }
  }, [onCheckout, totalPrice, basketItems, toggleDrawer]); // Зависимости

  return (
    <Drawer anchor="right" open={isOpen} onClose={() => toggleDrawer(false)}>
      <Box
        sx={{
          width: 450,
          backgroundColor: "#FFFFFF",
          padding: "30px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        role="presentation"
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h5">Ваша корзина</Typography>
          <IconButton
            onClick={() => toggleDrawer(false)}
            sx={{ color: "#000000", width: "40px", height: "40px" }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {loading ? ( // Показываем индикатор загрузки
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CircularProgress />
          </Box>
        ) : error ? ( // Показываем ошибку, если она есть
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        ) : !basketItems || Object.keys(basketItems).length === 0 ? (
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <ShoppingBasketOutlinedIcon
              sx={{ fontSize: 80, color: "#ccc", mb: 2 }}
            />
            <Typography variant="h6" color="text.secondary">
              Ваша корзина пуста
            </Typography>
          </Box>
        ) : (
          <>
            <Box
              sx={{
                flexGrow: 1,
                overflowY: "auto", // Добавим скролл для списка товаров
                pb: 2, // Отступ снизу, чтобы кнопка не перекрывала
              }}
            >
              <List sx={{ width: "100%" }}>
                {Object.entries(basketItems).map(([itemId, item]) => (
                  <React.Fragment key={itemId}>
                    <ListItem
                      alignItems="flex-start"
                      secondaryAction={
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={() => handleDelete(itemId)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={
                          item.model || item.name || "Товар без названия"
                        }
                        secondary={
                          <>
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.primary"
                            >
                              Количество: {item.quantity || 1} — Цена за шт.:{" "}
                              {item.price} ₽
                            </Typography>
                            <br />
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.secondary"
                            >
                              Сезон: {item.season || "-"} | Размер:{" "}
                              {item.size || "-"} | Тип: {item.type || "-"}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            </Box>

            <Box sx={{ mt: "auto", pt: 3, borderTop: "1px solid #eee" }}> {/* Прижмем к низу */}
              <Typography variant="subtitle1" fontWeight="bold">
                Итого товаров: {totalCount}
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="primary">
                Общая сумма: {totalPrice} ₽
              </Typography>

              <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2 }}
                onClick={handlePay} // Вызываем handlePay при клике
                disabled={totalPrice === 0} // Отключаем кнопку, если сумма 0
              >
                Оплатить {totalPrice} ₽
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
};

export default Basket;
