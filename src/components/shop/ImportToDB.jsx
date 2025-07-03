import { Box, Button, Container, TextField } from "@mui/material"
import { database } from "../../assets/firebase";
import { useEffect, useState } from "react";
import { onValue, ref, set } from "firebase/database";

const ImportToDB = () => {
    const [product, setProduct] = useState([])
    const [model, setModel] = useState()
    const [price, setPrice] = useState()
    const [season, setSeason] = useState()
    const [size, setSize] = useState()
    const [type, setType] = useState()
    const [img, setImg] = useState()

    const [editId, setEditId] = useState()

    useEffect(() => {
        const productRef = ref(database, `products/`)
        onValue(productRef, (snapshot) => {
            const data = snapshot.val()
            const productsArray = data ? Object.keys(data).map(key => ({id: key, ...data[key]})) : []
            setProduct(productsArray)
        })
    }, [])


    const handleAddOrUpdate = () => {
        const productRef = ref(database, `products/${editId || Date.now()}`)
        set(productRef, {model, price, season, size, type, img})
        setEditId(null)
    }

    return (
        <Container>
            <Box>
                <TextField value={model} onChange={(e) => setModel(e.target.value)} label='Модель' />
                <TextField value={price} onChange={(e) => setPrice(e.target.value)} label='Цена' />
                <TextField value={season} onChange={(e) => setSeason(e.target.value)} label='Сезон' />
                <TextField value={size} onChange={(e) => setSize(e.target.value)} label='Размер' />
                <TextField value={type} onChange={(e) => setType(e.target.value)} label='Тип' />
                <TextField value={img} onChange={(e) => setImg(e.target.value)} label='Фото' />
                <Button onClick={handleAddOrUpdate}>Добавить</Button>
            </Box>
        </Container>
    )
}

export default ImportToDB;