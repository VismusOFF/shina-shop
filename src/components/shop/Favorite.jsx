import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, onValue } from 'firebase/database';
import CardShop from '../shop/Card';
import { Box, Container, Typography } from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';

const FavoritesList = () => {
  const auth = getAuth();
  const db = getDatabase();

  const [favorites, setFavorites] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setFavorites({});
      setLoading(false);
      return;
    }

    const favoritesRef = ref(db, `users/${user.uid}/favorites`);

    const unsubscribe = onValue(
      favoritesRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        setFavorites(data);
        setLoading(false);
      },
      (error) => {
        console.error('Ошибка при загрузке избранного:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [auth, db]);

  if (loading) {
    return (
      <Container
        sx={{
          mt: '40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <Typography>Загрузка избранных товаров...</Typography>
      </Container>
    );
  }

  if (Object.keys(favorites).length === 0) {
    return (
      <Container
        sx={{
          mt: '40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          color: 'text.secondary',
        }}
      >
        <FavoriteBorderIcon sx={{ fontSize: 60, mb: 2 }} color="disabled" />
        <Typography variant="h6">У вас нет избранных товаров</Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: '40px', display: 'flex', flexDirection: 'column' }}>
      <Typography sx={{ mb: '40px' }} variant="h4">
        Избранное
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          justifyContent: 'flex-start',
        }}
      >
        {Object.entries(favorites).map(([favId, favItem]) => (
          <CardShop
            key={favId}
            id={favId}
            model={favItem.model}
            price={favItem.price}
            season={favItem.season}
            size={favItem.size}
            type={favItem.type}
            img={favItem.img}
          />
        ))}
      </Box>
    </Container>
  );
};

export default FavoritesList;
