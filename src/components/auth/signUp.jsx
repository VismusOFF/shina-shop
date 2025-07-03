import { Container, TextField, Box, Button } from "@mui/material";
import { useState } from "react";
import { auth } from '../../assets/firebase';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Пароли не совпадают!");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      console.log("Успешная регистрация:", { email });
      navigate('/request');
    } catch (error) {
      console.error("Ошибка регистрации:", error.message);
      setError(error.message);
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
        <TextField 
          variant="outlined" 
          label="Подтвердите пароль" 
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <Button type="submit" variant="contained" size="large">
          Зарегистрироваться
        </Button>
      </Box>
    </Container>
  );
}

export default SignUp;
