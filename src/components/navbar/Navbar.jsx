import { Container, Box, Typography, Button, Drawer, IconButton, CircularProgress, Alert } from "@mui/material";
import BoltIcon from '@mui/icons-material/Bolt';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { auth } from '../../assets/firebase';
import { useState, useEffect } from "react";
import './navbar.css';
import { Link, useNavigate } from "react-router-dom";
import Basket from '../basket/Basket';
import StripePaymentForm from '../Stripe/StripePaymentForm'; // Импортируем компонент оплаты
import { httpsCallable } from 'firebase/functions'; // <-- Только httpsCallable
import { functions } from "../../assets/firebase"; // <-- Импортируем уже инициализированный functions SDK

const Navbar = () => {
    const navigate = useNavigate('');
    const [userEmail, setUserEmail] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const [basketDrawerOpen, setBasketDrawerOpen] = useState(false);

    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [clientSecret, setClientSecret] = useState(null);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentError, setPaymentError] = useState(null);

    const toggleBasketDrawer = (open) => {
        setBasketDrawerOpen(open);
    };

    const userId = auth.currentUser ? auth.currentUser.uid : null;

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                setUserEmail(user.email);
            } else {
                setUserEmail(null);
            }
        });

        return () => unsubscribe();
    }, []);

    const toggleDrawer = (open) => () => {
        setDrawerOpen(open);
    };
    console.log(auth.currentUser)
    const handleCheckout = async (totalPrice, basketItems) => {
    console.log("handleCheckout вызван в Navbar:", totalPrice, basketItems);
    
    if (!userId) { // Эта проверка на фронтенде остается
        alert("Пожалуйста, войдите, чтобы продолжить оплату.");
        return;
    }

    setPaymentLoading(true);
    setPaymentError(null);

    try {
        // Удалите user.getIdToken(true); это больше не нужно для onRequest
        // const user = auth.currentUser;
        // if (user) {
        //     await user.getIdToken(true);
        //     console.log("ID Token обновлен.");
        // } else {
        //     throw new Error("Пользователь не авторизован после проверки ID.");
        // }

        // === ИЗМЕНЕНИЕ ЗДЕСЬ: используем fetch для onRequest ===
        const response = await fetch('https://us-central1-voltage-f74f2.cloudfunctions.net/createPaymentIntentHttp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Никаких заголовков Authorization не требуется, если функция публичная
            },
            body: JSON.stringify({
                amount: totalPrice,
                currency: 'rub',
                userId: userId // <-- ПЕРЕДАЕМ userId ЯВНО
            }),
        });
        const data = await response.json(); // Получаем ответ как JSON

        if (response.status !== 200) { // Проверяем статус ответа
            throw new Error(data.error || 'Unknown error from server');
        }
        
        const fetchedClientSecret = data.clientSecret;
        setClientSecret(fetchedClientSecret);
        setPaymentAmount(totalPrice);
        setShowPaymentForm(true);
        setBasketDrawerOpen(false);
    } catch (error) {
        console.error("Ошибка при создании Payment Intent:", error);
        setPaymentError(`Не удалось начать процесс оплаты: ${error.message}`);
        alert(`Ошибка: ${error.message}`);
    } finally {
        setPaymentLoading(false);
    }
};

    const handlePaymentSuccess = (message) => {
        console.log("Успешная оплата:", message);
        alert(message);
        setShowPaymentForm(false);
        setClientSecret(null);
    };

    const handlePaymentError = (error) => {
        console.error("Ошибка оплаты:", error);
        alert(`Ошибка оплаты: ${error}`);
    };

    const handleClosePaymentForm = () => {
        setShowPaymentForm(false);
        setClientSecret(null);
        setPaymentError(null);
    };

    const drawerContent = (
        <Box
            sx={{
                width: 450,
                backgroundColor: '#FFFFFF',
                padding: '30px',
                height: '100%',
            }}
            role="presentation"
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5">
                    Выберите способ входа
                </Typography>
                <IconButton onClick={toggleDrawer(false)} sx={{ color: '#000000', width: '40px', height: '40px' }}>
                    <CloseIcon />
                </IconButton>
            </Box>
            <Link to={'/signin'} className="auth-link" style={{ textDecoration: 'none' }} onClick={toggleDrawer(false)}>
                <div className="auth-container-button" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginTop: '20px' }}>
                    <div className="icon-auth">
                        <BoltIcon sx={{ color: '#EF3123', fontSize: 40 }} />
                    </div>
                    <Typography sx={{ ml: '10px', flexGrow: 1 }}>
                        Войти в Voltage-Онлайн
                    </Typography>
                    <ArrowForwardIosIcon sx={{ color: '#000000', fontSize: 20, mr: '30px' }} />
                </div>
            </Link>
        </Box>
    );

    return (
        <div className="navbar">
            <Container
                sx={{
                    height: '80px',
                    backgroundColor: '#121212',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 20px',
                }}
            >
                <Box style={{ display: 'flex', alignItems: 'center', color: 'inherit', cursor: 'pointer' }}>
                    <a href="https://voltageauto.netlify.app/">
                        <BoltIcon sx={{ color: '#EF3123', fontSize: 50 }} />
                    </a>
                </Box>

                <Box
                    sx={{
                        display: 'flex',
                        gap: '20px',
                        marginLeft: '20px',
                    }}
                    >
                    {[
                        { text: 'Интернет магазин', path: '/' },
                        { text: 'Корзина', action: () => toggleBasketDrawer(true) },
                        { text: 'Избранное', path: '/favorites' }
                    ].map((item, index) => (
                        item.path ? (
                        <Link
                            to={item.path}
                            key={index}
                            style={{ textDecoration: 'none', cursor: 'default' }}
                        >
                            <Typography
                            sx={{
                                cursor: 'pointer',
                                color: 'white',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                transition: 'background-color 0.3s',
                                '&:hover': {
                                backgroundColor: '#2B2B2E',
                                },
                                userSelect: 'none'
                            }}
                            variant="body1"
                            >
                            {item.text}
                            </Typography>
                        </Link>
                        ) : (
                        <Typography
                            key={index}
                            onClick={item.action}
                            sx={{
                            cursor: 'pointer',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            transition: 'background-color 0.3s',
                            '&:hover': {
                                backgroundColor: '#2B2B2E',
                            },
                            userSelect: 'none'
                            }}
                            variant="body1"
                        >
                            {item.text}
                            </Typography>
                        )
                    ))}
                    </Box>


                <Box
                    sx={{
                        marginLeft: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px'
                    }}
                >
                    {userEmail ? (
                        <Box onClick={() => navigate('/profile')} sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'}}>
                            <AccountCircleIcon sx={{ fontSize: 32 }} />
                            <Typography variant="body1" sx={{ ml: 1 }}>
                                Профиль
                            </Typography>
                        </Box>
                    ) : (
                        <>
                            <Link to={'/signup'}>
                                <Button
                                    variant="contained"
                                    sx={{
                                        backgroundColor: '#2D2D2F',
                                        '&:hover': {
                                            backgroundColor: '#323234',
                                        }
                                    }}
                                >
                                    Зарегистрироваться
                                </Button>
                            </Link>
                            <Link to={'#'} onClick={toggleDrawer(true)}>
                                <Button variant="contained">Войти</Button>
                            </Link>
                        </>
                    )}
                </Box>
            </Container>

            {/* Drawer для авторизации */}
            <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer(false)}>
                {drawerContent}
            </Drawer>

            {/* Drawer для корзины */}
            {userId && (
                <Basket
                    isOpen={basketDrawerOpen}
                    toggleDrawer={toggleBasketDrawer}
                    userId={userId}
                    onCheckout={handleCheckout}
                />
            )}

            {/* --- БЛОК: РЕНДЕРИНГ ФОРМЫ ОПЛАТЫ --- */}
            {paymentLoading && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 9999,
                    }}
                >
                    <CircularProgress color="primary" />
                    <Typography sx={{ ml: 2, color: 'white' }}>Подготовка к оплате...</Typography>
                </Box>
            )}

            {paymentError && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 9999,
                    }}
                    onClick={handleClosePaymentForm}
                >
                    <Alert severity="error" onClose={handleClosePaymentForm}>
                        {paymentError}
                    </Alert>
                </Box>
            )}

            {showPaymentForm && clientSecret && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 9999,
                    }}
                    onClick={handleClosePaymentForm}
                >
                    {/* Предотвращаем закрытие формы при клике внутри неё */}
                    <Box onClick={(e) => e.stopPropagation()}>
                        <StripePaymentForm
                            amount={paymentAmount}
                            clientSecret={clientSecret}
                            onPaymentSuccess={handlePaymentSuccess}
                            onPaymentError={handlePaymentError}
                            onCloseForm={handleClosePaymentForm}
                        />
                    </Box>
                </Box>
            )}
        </div>
    );
}

export default Navbar;
