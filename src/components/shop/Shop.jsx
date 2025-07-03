import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../../assets/firebase';
import {
  Box,
  Container,
  Typography,
  TextField,
  CircularProgress,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import WbSunnyIcon from '@mui/icons-material/WbSunny'; // Иконка солнца для летних
import AcUnitIcon from '@mui/icons-material/AcUnit'; // Иконка снежинки для зимних
import PublicIcon from '@mui/icons-material/Public'; // Иконка для "Все" сезоны

import CardShop from './Card'; // путь к вашему компоненту

const Shop1 = () => {
  const [products, setProducts] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('none'); // 'none', 'asc', 'desc'
  const [seasonFilter, setSeasonFilter] = useState('all'); // 'all', 'Летние', 'Зимние'
  const [carTypeFilter, setCarTypeFilter] = useState('all'); // Новое состояние для фильтра по типу авто
  const [sizeFilter, setSizeFilter] = useState('all'); // НОВОЕ: состояние для фильтра по размеру шин
  const [availableSizes, setAvailableSizes] = useState([]); // НОВОЕ: состояние для уникальных размеров из БД

  // Опции для фильтра по типу авто (можно вынести в отдельный файл или получить из БД, если они там есть)
  const carTypes = [
    'Легковые',
    'Кроссовер',
    'Внедорожник',
    'Микроавтобус',
    'Коммерческий',
    'Грузовой',
  ];

  useEffect(() => {
    const productsRef = ref(database, 'products');

    const unsubscribe = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const productsArray = Object.entries(data).map(([id, product]) => ({
          id,
          ...product,
        }));
        setProducts(productsArray);

        // НОВОЕ: Собираем уникальные размеры шин из полученных данных
        const uniqueSizes = [...new Set(
          productsArray
            .map(product => product.size)
            .filter(size => size && typeof size === 'string') // Убедимся, что size существует и является строкой
        )].sort((a, b) => {
            // Опционально: попробуй отсортировать размеры как числа для более логичного порядка
            // Например, "205/55R16" -> 2055516. Если размеры более сложные, может потребоваться кастомная сортировка.
            // Для простой сортировки как строк: a.localeCompare(b)
            return a.localeCompare(b);
        });
        setAvailableSizes(uniqueSizes);

      } else {
        setProducts([]);
        setAvailableSizes([]); // Сбросить размеры, если нет товаров
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleSortChange = (event, newSortOrder) => {
    setSortOrder(newSortOrder || 'none');
  };

  const handleSeasonFilterChange = (event, newSeason) => {
    setSeasonFilter(newSeason || 'all');
  };

  const handleCarTypeFilterChange = (event) => {
    setCarTypeFilter(event.target.value);
  };

  // НОВОЕ: Обработчик для изменения фильтра по размеру шин
  const handleSizeFilterChange = (event) => {
    setSizeFilter(event.target.value);
  };

  // Комбинируем логику фильтрации и сортировки
  const processedProducts = products
    ? products
        .filter(product => {
          // 1. Фильтрация по поисковому запросу
          const matchesSearch = searchTerm === '' ||
            product.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(product.price)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.season?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.size?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.type?.toLowerCase().includes(searchTerm.toLowerCase());

          // 2. Фильтрация по сезону
          const productSeasonLower = product.season ? product.season.toLowerCase() : '';
          const matchesSeason = seasonFilter === 'all' ||
            (productSeasonLower === seasonFilter.toLowerCase());

          // 3. Фильтрация по типу авто
          const productTypeLower = product.type ? product.type.toLowerCase() : '';
          const matchesCarType = carTypeFilter === 'all' ||
            (productTypeLower === carTypeFilter.toLowerCase());

          // НОВОЕ: 4. Фильтрация по размеру шин
          const productSize = product.size; // Размер может быть не всегда в нижнем регистре для точного сравнения
          const matchesSize = sizeFilter === 'all' ||
            (productSize === sizeFilter);

          return matchesSearch && matchesSeason && matchesCarType && matchesSize;
        })
        .sort((a, b) => {
          // Сортировка по цене
          const priceA = parseFloat(a.price) || 0;
          const priceB = parseFloat(b.price) || 0;

          if (sortOrder === 'asc') {
            return priceA - priceB;
          } else if (sortOrder === 'desc') {
            return priceB - priceA;
          }
          return 0; // Нет сортировки
        })
    : [];

  if (products === null) {
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Загрузка товаров...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, px: { xs: 2, md: 0 }, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      <Box sx={{ width: '100%'}}>

      {/* Поле для поиска с иконкой */}
      <TextField
        label="Поиск товаров"
        variant="outlined"
        fullWidth
        value={searchTerm}
        onChange={handleSearchChange}
        sx={{ mb: 3, }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />
      {/* Блок с фильтрами и сортировкой в одну строку */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{width: '100%', mb: 3, flexWrap: 'wrap', justifyContent: 'flex-start' }}
      >
        {/* Сортировка по цене */}
        <ToggleButtonGroup
          value={sortOrder}
          exclusive
          onChange={handleSortChange}
          aria-label="price sort order"
          sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: 'auto', md: '250px' } }}
        >
          <ToggleButton value="asc" aria-label="price ascending" sx={{ flexGrow: 1 }}>
            <ArrowUpwardIcon sx={{ mr: 1 }} /> По возрастанию цены
          </ToggleButton>
          <ToggleButton value="desc" aria-label="price descending" sx={{ flexGrow: 1 }}>
            <ArrowDownwardIcon sx={{ mr: 1 }} /> По убыванию цены
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Фильтрация по сезону */}
        <ToggleButtonGroup
          value={seasonFilter}
          exclusive
          onChange={handleSeasonFilterChange}
          aria-label="season filter"
          sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: 'auto' } }}
        >
          <ToggleButton value="all" aria-label="all seasons" sx={{ flexGrow: 1 }}>
            <PublicIcon sx={{ mr: 1 }} /> Все
          </ToggleButton>
          <ToggleButton value="Летние" aria-label="summer tires" sx={{ flexGrow: 1 }}>
            <WbSunnyIcon sx={{ mr: 1, color: 'gold' }} /> Летние
          </ToggleButton>
          <ToggleButton value="Зимние" aria-label="winter tires" sx={{ flexGrow: 1 }}>
            <AcUnitIcon sx={{ mr: 1, color: 'lightskyblue' }} /> Зимние
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Фильтрация по типу авто */}
        <FormControl sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: 'auto', md: '200px' } }}>
          <InputLabel id="car-type-select-label">Тип авто</InputLabel>
          <Select
            labelId="car-type-select-label"
            id="car-type-select"
            value={carTypeFilter}
            label="Тип авто"
            onChange={handleCarTypeFilterChange}
          >
            <MenuItem value="all">Все типы</MenuItem>
            {carTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* НОВОЕ: Фильтрация по размеру шин */}
        <FormControl>
          <InputLabel id="tire-size-select-label">Размер шин</InputLabel>
          <Select
            labelId="tire-size-select-label"
            id="tire-size-select"
            value={sizeFilter}
            label="Размер шин"
            onChange={handleSizeFilterChange}
          >
            <MenuItem value="all">Все размеры</MenuItem>
            {availableSizes.map((size) => (
              <MenuItem key={size} value={size}>
                {size}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      </Box>

      {/* Заголовок "Все шины" */}
      <Typography variant="h4" sx={{ mr: 'auto', mb: 2 }}>
        Все шины
      </Typography>

      {/* Условие для отображения сообщения "Товары не найдены" */}
      {processedProducts.length === 0 && (searchTerm !== '' || seasonFilter !== 'all' || carTypeFilter !== 'all' || sizeFilter !== 'all') ? (
        <Typography variant="h6" color="text.secondary" sx={{ mt: 4 }}>
          По заданным критериям товары не найдены.
        </Typography>
      ) : processedProducts.length === 0 && products !== null ? (
        <Typography variant="h6" color="text.secondary" sx={{ mt: 4 }}>
          Товары не найдены. Попробуйте обновить страницу.
        </Typography>
      ) : (
        // Сетка с карточками товаров
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            gap: 5,
            width: '100%',
            justifyContent: 'center',
            ml: '50px' // Уверен, что тут 50px? Возможно, лучше использовать auto или 0 для центрирования
          }}
        >
          {/* Маппинг по отфильтрованным и отсортированным товарам */}
          {processedProducts.map(product => (
            <CardShop key={product.id} {...product} />
          ))}
        </Box>
      )}
    </Container>
  );
};

export default Shop1;
