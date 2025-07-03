import React, { useState, useEffect } from 'react';
import { auth, database } from '../../assets/firebase'; // ваш путь к инициализации Firebase
import { ref, get, set } from "firebase/database";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { TextField, Button, Box, Typography, CircularProgress } from '@mui/material';

const Profile = () => {
  const [user, setUser] = useState(null); // Firebase user
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    email: '',
    fullName: '',
    phone: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

    const handleLogout = () => {
    signOut(auth).catch((error) => {
      setError('Ошибка при выходе из аккаунта');
    });
  };

  useEffect(() => {
    // Подписка на изменение пользователя
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setProfile(prev => ({ ...prev, email: currentUser.email }));
        // Загрузим данные из базы
        const userRef = ref(database, 'users/' + currentUser.uid);
        get(userRef).then(snapshot => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            setProfile({
              email: currentUser.email,
              fullName: data.fullName || '',
              phone: data.phone || ''
            });
          }
          setLoading(false);
        }).catch(err => {
          setError('Ошибка загрузки профиля');
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    setProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    if (!user) {
      setError('Пользователь не авторизован');
      setSaving(false);
      return;
    }

    // Валидация (например, можно добавить)
    if (!profile.fullName.trim()) {
      setError('Введите ФИО');
      setSaving(false);
      return;
    }

    // Сохраняем в Realtime Database
    const userRef = ref(database, 'users/' + user.uid);
    set(userRef, {
      fullName: profile.fullName,
      phone: profile.phone
    }).then(() => {
      setSuccess('Профиль сохранён');
    }).catch(() => {
      setError('Ошибка сохранения');
    }).finally(() => {
      setSaving(false);
    });
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
  }

  if (!user) {
    return <Typography variant="h6" sx={{ mt: 5, textAlign: 'center' }}>Пожалуйста, войдите в аккаунт</Typography>;
  }

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 5, p: 3, border: '1px solid #ccc', borderRadius: 2 }}>
      <Typography variant="h5" mb={3}>Настройки профиля</Typography>

      <TextField
        label="Email"
        value={profile.email}
        fullWidth
        margin="normal"
        disabled
      />
      <TextField
        label="ФИО"
        name="fullName"
        value={profile.fullName}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Номер телефона"
        name="phone"
        value={profile.phone}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />

      {error && <Typography color="error" mt={1}>{error}</Typography>}
      {success && <Typography color="success.main" mt={1}>{success}</Typography>}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
        <Button
          variant="outlined"
          onClick={handleLogout}
          disabled={saving}
        >
          Выйти
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Сохраняем...' : 'Сохранить'}
        </Button>
      </Box>
    </Box>
  );
};

export default Profile;
