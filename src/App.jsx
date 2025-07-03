import './App.css'
import { ThemeProvider } from '@emotion/react'
import { createTheme } from '@mui/material'
import Navbar from './components/navbar/Navbar'
import SignIn from './components/auth/signIn'
import SignUp from './components/auth/signUp'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Profile from './components/profile/Profile'
import Shop1 from './components/shop/Shop'
import Basket from './components/basket/Basket'
import ImportToDB from './components/shop/ImportToDB'
import FavoritesList from './components/shop/Favorite'

function App() {
  
  const theme = createTheme({
    palette: {
      primary: {
        main: '#EB2D2F',
      }
    }
  })

  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
              <Navbar />
              <Routes>
                <Route element={<SignIn />} path='/signin' />
                <Route element={<SignUp />} path='/signup' />
                <Route element={<Profile />} path="/profile" />
                <Route element={<Shop1/>} path='/' />
                <Route element={<ImportToDB/>} path='/1' />
                <Route element={<FavoritesList/>} path='/favorites' />
              </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
