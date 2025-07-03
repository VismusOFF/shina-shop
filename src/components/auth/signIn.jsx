import { Container, TextField, Box, Button, FormControlLabel, Checkbox } from "@mui/material";
import { useState, useEffect } from "react";
import { auth } from '../../assets/firebase';
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem("email");
    const savedPassword = localStorage.getItem("password");

    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Успешный вход:", { email, rememberMe });

      if (rememberMe) {
        localStorage.setItem("email", email);
        localStorage.setItem("password", password);
      } else {
        localStorage.removeItem("email");
        localStorage.removeItem("password");
      }

      navigate('/request');
    } catch (error) {
      console.error("Ошибка входа:", error.message);
    }
  };

  return (
    <Container 
      sx={{ 
        width: '100%', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
      }}
    >
      <Box 
        component="form" 
        onSubmit={handleSubmit}
        sx={{ 
          padding: '40px', 
          width: '500px', 
          margin: '20px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 2, 
        }}
      >
        <TextField 
          variant="outlined" 
          label="Почта" 
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField 
          variant="outlined" 
          label="Пароль" 
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <FormControlLabel
          control={
            <Checkbox 
              checked={rememberMe} 
              onChange={(e) => setRememberMe(e.target.checked)} 
              color="primary" 
            />
          } 
          label="Запомнить меня" 
        />
        <Button type="submit" variant="contained" size="large">
          Войти
        </Button>
      </Box>
    </Container>
  );
}

export default SignIn;
