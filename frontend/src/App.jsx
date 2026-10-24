import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion';

import { api, getToken, setToken, fileUrl } from './api'
import './App.css'

// ==========================================
// КОМПОНЕНТ КРАСИВОГО ВЫПАДАЮЩЕГО СПИСКА
// ==========================================
function CustomSelect({ options, value, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div className="custom-dropdown-container" ref={dropdownRef}>
      <div className={`custom-dropdown-header ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        <span className={selectedOption ? 'selected-text' : 'placeholder-text'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="dropdown-arrow-circle">
          <span className={`arrow-icon ${isOpen ? 'rotate' : ''}`}>⌄</span>
        </div>
      </div>

      {isOpen && (
        <ul className="custom-dropdown-list">
          {options.map((option) => (
            <li
              key={option.value}
              className={`custom-dropdown-item ${value === option.value ? 'active' : ''}`}
              onClick={() => { onChange(option.value); setIsOpen(false) }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ==========================================
// ВЫБОР КОДА СТРАНЫ ДЛЯ ТЕЛЕФОНА
// ==========================================
function CountryCodeSelect({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const countryOptions = [
    { id: 'ru', name: 'РОССИЯ', code: '+7' },
    { id: 'us', name: 'США', code: '+1' },
    { id: 'nl', name: 'НИДЕРЛАНДЫ', code: '+31' },
    { id: 'by', name: 'БЕЛАРУСЬ', code: '+375' },
    { id: 'lv', name: 'ЛАТВИЯ', code: '+371' }
  ]

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="country-code-container" ref={dropdownRef} style={{ position: 'relative' }}>
      <div className="country-code" onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
        <span>{value}</span>
        <span className={`arrow ${isOpen ? 'rotate' : ''}`}>▼</span>
      </div>
      {isOpen && (
        <ul className="country-code-list">
          {countryOptions.map((country) => (
            <li
              key={country.id}
              className={`country-code-item ${value === country.code ? 'active' : ''}`}
              onClick={() => { onChange(country.code); setIsOpen(false); }}
            >
              <span className="country-name">{country.name}</span>
              <span className="country-num">{country.code}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ==========================================
// СПРАВОЧНИКИ И ПРЕОБРАЗОВАНИЯ ДАННЫХ
// ==========================================
const SPECIES_OPTIONS = [
  { value: 'cat', label: 'КОШКА / КОТЁНОК' },
  { value: 'dog', label: 'СОБАКА / ЩЕНОК' },
  { value: 'parrot', label: 'ПОПУГАЙ' },
  { value: 'hamster', label: 'ХОМЯК' },
  { value: 'rabbit', label: 'КРОЛИК' },
  { value: 'fish', label: 'РЫБКИ' },
  { value: 'cow', label: 'СЕЛЬСКОХОЗЯЙСТВЕННЫЕ' },
]
const OTHER_SPECIES = SPECIES_OPTIONS.filter(o => o.value !== 'cat' && o.value !== 'dog')
const SPECIES_EMOJI = { cat: '🐱', dog: '🐶', parrot: '🦜', hamster: '🐹', rabbit: '🐰', fish: '🐟', cow: '🐄' }

// Возраст для формы создания объявления -> месяцы для бэкенда
const AGE_OPTIONS = [
  { value: '2', label: 'ДО 3 МЕСЯЦЕВ' },
  { value: '5', label: 'ОТ 3 ДО 6 МЕСЯЦЕВ' },
  { value: '9', label: 'ОТ 6 ДО 12 МЕСЯЦЕВ' },
  { value: '24', label: 'ОТ 1 ГОДА ДО 3 ЛЕТ' },
  { value: '60', label: 'СТАРШЕ 3 ЛЕТ' },
]

function plural(n, one, few, many) {
  const n10 = n % 10, n100 = n % 100
  if (n10 === 1 && n100 !== 11) return one
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few
  return many
}

function formatAge(months) {
  if (months === null || months === undefined) return 'возраст не указан'
  if (months < 12) return `${months} ${plural(months, 'месяц', 'месяца', 'месяцев')}`
  const years = Math.floor(months / 12)
  const rest = months % 12
  const y = `${years} ${plural(years, 'год', 'года', 'лет')}`
  return rest ? `${y} ${rest} мес.` : y
}

function formatPrice(pet) {
  return pet.is_free ? 'БЕСПЛАТНО' : `${Math.round(pet.price).toLocaleString('ru-RU')} ₽`
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

// Карточка ленты с бэкенда -> формат, который рисует интерфейс
function toCard(pet) {
  return {
    id: pet.id,
    name: pet.name || 'Без имени',
    gender: pet.gender,
    ageInfo: formatAge(pet.age_in_months),
    breed: pet.breed || (pet.category === 'cat' ? 'кошка' : pet.category === 'dog' ? 'собака' : pet.category),
    city: pet.city || 'город не указан',
    owner: pet.seller_name || 'продавец',
    image: fileUrl(pet.photo_url),
    category: pet.category,
    price: formatPrice(pet),
    description: pet.description,
    isPromo: pet.is_promo,
    source: pet.source,
    reasons: pet.reasons || [],
  }
}

// ==========================================
// ОСНОВНОЙ КОМПОНЕНТ
// ==========================================
function App() {
  // Тёмная тема
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try { return localStorage.getItem('theme') === 'dark' } catch { return false }
  });

  useEffect(() => {
    if (isDarkMode) document.body.classList.add('dark');
    else document.body.classList.remove('dark');
    try { localStorage.setItem('theme', isDarkMode ? 'dark' : 'light') } catch { /* нет доступа */ }
  }, [isDarkMode]);

  // --- Аккаунт ---
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [profile, setProfile] = useState(null)       // ответ /profile/me
  const [activeTab, setActiveTab] = useState('main')
  const [countryCode, setCountryCode] = useState('+7')

  const [authMode, setAuthMode] = useState('register')
  const [authStep, setAuthStep] = useState(0)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [userGoal, setUserGoal] = useState('find')
  const [userType, setUserType] = useState('fiz')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userCity, setUserCity] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [userPassword2, setUserPassword2] = useState('')
  const [prefSpecies, setPrefSpecies] = useState('')
  const [prefAbout, setPrefAbout] = useState('')
  const [loginValue, setLoginValue] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [dashboardTab, setDashboardTab] = useState('tape')
  const [notice, setNotice] = useState('')

  // --- Лента ---
  const [pets, setPets] = useState([])
  const [currentPetIndex, setCurrentPetIndex] = useState(0)
  const [feedLoading, setFeedLoading] = useState(false)
  const [feedLoaded, setFeedLoaded] = useState(false)
  const [feedError, setFeedError] = useState('')
  const [limitReached, setLimitReached] = useState(false)
  const [swipesLeft, setSwipesLeft] = useState(null)
  const [swipeBusy, setSwipeBusy] = useState(false)
  const [why, setWhy] = useState(null)               // { petId, loading, text, by }

  // --- Профиль ---
  const [profileTab, setProfileTab] = useState('menu');
  const [userPets, setUserPets] = useState([]);
  const [subscription, setSubscription] = useState(null)
  const isPremium = Boolean(subscription && subscription.is_premium)

  // --- Чаты ---
  const [chats, setChats] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [chatMessage, setChatMessage] = useState('')
  const [chatSearch, setChatSearch] = useState('')
  const messagesEndRef = useRef(null)

  // --- Создание объявления ---
  const [createStep, setCreateStep] = useState(1);
  const [petCategory, setPetCategory] = useState('')
  const [otherSpecies, setOtherSpecies] = useState('')
  const [petType, setPetType] = useState('')
  const [petName, setPetName] = useState('')
  const [petCount, setPetCount] = useState(1)
  const [sameNames, setSameNames] = useState('no')
  const [petGender, setPetGender] = useState('')
  const [petAge, setPetAge] = useState('')
  const [petColor, setPetColor] = useState('')
  const [petBreed, setPetBreed] = useState('')
  const [petDescription, setPetDescription] = useState('')
  const [petIsFree, setPetIsFree] = useState('no')
  const [petPrice, setPetPrice] = useState('')
  const [petPhoto, setPetPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [createError, setCreateError] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  // Кто может создавать объявления: решает бэкенд, при регистрации - по выбранным полям
  const canCreateAd = profile
    ? profile.can_create_ad
    : (userType === 'ip' || userType === 'yur' || userGoal === 'breed')
  const displayFirst = profile ? profile.firstName : firstName
  const displayLast = profile ? profile.lastName : lastName
  const displayCity = (profile ? profile.city : userCity) || ''
  const displayType = profile ? profile.user_type : userType

  useEffect(() => {
    if (!canCreateAd && dashboardTab === 'create-pet') setDashboardTab('tape')
  }, [canCreateAd, dashboardTab])

  // Сообщение вверху экрана, исчезает само
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(t)
  }, [notice])

  // ==========================================
  // АККАУНТ: вход по сохранённому токену, регистрация, вход, выход
  // ==========================================
  useEffect(() => {
    if (!getToken()) return
    api.me()
      .then(p => { setProfile(p); setIsLoggedIn(true) })
      .catch(() => setToken(null))
  }, [])

  const resetSession = () => {
    setPets([]); setCurrentPetIndex(0); setFeedLoaded(false); setFeedError('')
    setLimitReached(false); setWhy(null); setChats([]); setActiveChatId(null)
    setMessages([]); setUserPets([]); setSubscription(null); setProfileTab('menu')
    setSwipesLeft(null); setNotice('')
  }

  const applyAuth = (response, firstTab) => {
    setToken(response.token)
    resetSession()
    setProfile(response.profile)
    setIsLoggedIn(true)
    setAuthError('')
    setDashboardTab(firstTab)
  }

  const goToStep = (step) => { setAuthError(''); setAuthStep(step) }

  const validatePersonal = () => {
    if (!firstName.trim() || !lastName.trim()) return 'Введите имя и фамилию'
    if (userPhone.replace(/\D/g, '').length < 5) return 'Введите номер телефона'
    if (!/^\S+@\S+\.\S+$/.test(userEmail.trim())) return 'Введите корректный e-mail'
    return ''
  }

  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    try {
      if (authMode === 'login') {
        const response = await api.login(loginValue.trim(), loginPassword)
        applyAuth(response, 'tape')
      } else {
        if (userPassword.length < 3) throw new Error('Пароль слишком короткий')
        if (userPassword !== userPassword2) throw new Error('Пароли не совпадают')
        const response = await api.register({
          email: userEmail.trim(),
          password: userPassword,
          displayName: `${firstName.trim()} ${lastName.trim()}`.trim(),
          phone: countryCode + userPhone.replace(/\D/g, ''),
          city: userCity.trim() || null,
          user_type: userType,
          goal: userGoal,
        })
        setToken(response.token)
        // Анкета для умной ленты: вид и пожелания своими словами (по ним работает ruBERT)
        if (userGoal === 'find' && (prefSpecies || prefAbout.trim())) {
          await api.savePrefs({
            species: prefSpecies || null,
            city: userCity.trim() || null,
            about: prefAbout.trim() || null,
          })
        }
        applyAuth(response, response.profile.can_create_ad ? 'create-pet' : 'tape')
        setUserPassword(''); setUserPassword2('')
      }
    } catch (error) {
      setAuthError(error.message)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    try { await api.logout() } catch { /* всё равно выходим */ }
    setToken(null)
    setIsLoggedIn(false)
    setProfile(null)
    resetSession()
    setAuthMode('login')
    setAuthStep(0)
    setActiveTab('main')
  }

  // ==========================================
  // ЛЕНТА
  // ==========================================
  const currentPet = pets[currentPetIndex];
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5]);

  const loadFeed = useCallback(async () => {
    setFeedLoading(true)
    setFeedError('')
    try {
      const data = await api.feed(10)
      setPets(data.map(toCard))
      setCurrentPetIndex(0)
      setWhy(null)
    } catch (error) {
      setFeedError(error.message)
    } finally {
      setFeedLoading(false)
      setFeedLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (isLoggedIn && dashboardTab === 'tape' && !feedLoaded && !feedLoading) loadFeed()
  }, [isLoggedIn, dashboardTab, feedLoaded, feedLoading, loadFeed])

  const goToNextPet = () => {
    x.set(0)
    setWhy(null)
    if (currentPetIndex < pets.length - 1) {
      setCurrentPetIndex(prev => prev + 1);
    } else {
      loadFeed()        // порция закончилась: сервер пересчитает ленту с учётом свайпов
    }
  };

  const swipeCurrent = async (direction) => {
    if (!currentPet || swipeBusy) return
    setSwipeBusy(true)
    try {
      const result = await api.swipe(currentPet.id, direction)
      setSwipesLeft(result.swipes_left)
      if (direction === 'right' && result.chat_id) {
        openChat(result.chat_id)
        setNotice(`${currentPet.name}: лайк отправлен, продавец получил уведомление`)
      }
      goToNextPet()
    } catch (error) {
      x.set(0)
      if (error.status === 429) setLimitReached(true)
      else if (error.status === 400) goToNextPet()      // уже свайпнут или снят с публикации
      else setFeedError(error.message)
    } finally {
      setSwipeBusy(false)
    }
  }

  const handleLike = () => swipeCurrent('right')
  const handleDislike = () => swipeCurrent('left')

  // «Почему мне это показали?» - объяснение от GigaChat
  const handleWhy = async () => {
    if (!currentPet) return
    if (why && why.petId === currentPet.id) { setWhy(null); return }
    setWhy({ petId: currentPet.id, loading: true })
    try {
      const result = await api.why(currentPet.id)
      setWhy({ petId: currentPet.id, loading: false, text: result.explanation, by: result.by })
    } catch (error) {
      setWhy({ petId: currentPet.id, loading: false, text: error.message, by: 'error' })
    }
  }

  // ==========================================
  // ЧАТЫ (новые сообщения подтягиваются с сервера каждые несколько секунд)
  // ==========================================
  const loadChats = useCallback(async () => {
    try { setChats(await api.chats()) } catch { /* покажем то, что есть */ }
  }, [])

  const loadMessages = useCallback(async (chatId) => {
    try { setMessages(await api.messages(chatId)) } catch { /* следующая попытка через пару секунд */ }
  }, [])

  function openChat(chatId) {
    setDashboardTab('chat')
    setActiveChatId(chatId)
    setMessages([])
    loadChats()       // новый чат (после лайка) сразу появится в списке с именем собеседника
  }

  useEffect(() => {
    if (!isLoggedIn || dashboardTab !== 'chat') return
    loadChats()
    const t = setInterval(loadChats, 5000)
    return () => clearInterval(t)
  }, [isLoggedIn, dashboardTab, loadChats])

  useEffect(() => {
    if (!isLoggedIn || dashboardTab !== 'chat' || !activeChatId) return
    loadMessages(activeChatId)
    const t = setInterval(() => loadMessages(activeChatId), 3000)
    return () => clearInterval(t)
  }, [isLoggedIn, dashboardTab, activeChatId, loadMessages])

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ block: 'end' })
  }, [messages])

  const activeChat = chats.find(c => c.id === activeChatId)
  const visibleChats = chats.filter(c => {
    const q = chatSearch.trim().toLowerCase()
    return !q || (c.partner_name || '').toLowerCase().includes(q) || (c.pet_name || '').toLowerCase().includes(q)
  })

  const handleSendMessage = async (e) => {
    e.preventDefault()
    const text = chatMessage.trim()
    if (!text || !activeChatId) return
    setChatMessage('')
    try {
      const msg = await api.sendMessage(activeChatId, text)
      setMessages(prev => [...prev, msg])
      loadChats()
    } catch (error) {
      setNotice(error.message)
      setChatMessage(text)
    }
  }

  // ==========================================
  // ПРОФИЛЬ: мои анкеты и подписка
  // ==========================================
  const loadMyPets = useCallback(async () => {
    try { setUserPets(await api.myPets()) } catch (error) { setNotice(error.message) }
  }, [])

  const loadSubscription = useCallback(async () => {
    try { setSubscription(await api.subscription()) } catch (error) { setNotice(error.message) }
  }, [])

  useEffect(() => {
    if (!isLoggedIn || dashboardTab !== 'profile') return
    if (profileTab === 'my-ads') loadMyPets()
    if (profileTab === 'subscription') loadSubscription()
  }, [isLoggedIn, dashboardTab, profileTab, loadMyPets, loadSubscription])

  const togglePremium = async () => {
    try {
      if (isPremium) await api.cancelPremium()
      else await api.activatePremium()
      await loadSubscription()
      setLimitReached(false)
      setNotice(isPremium ? 'Премиум отключён' : 'Премиум оформлен на 30 дней (оплата имитируется)')
    } catch (error) {
      setNotice(error.message)
    }
  }

  // ==========================================
  // СОЗДАНИЕ ОБЪЯВЛЕНИЯ
  // ==========================================
  const species = petCategory === 'dogs' ? 'dog' : petCategory === 'cats' ? 'cat' : otherSpecies

  const resetCreateForm = () => {
    setCreateStep(1); setPetCategory(''); setOtherSpecies(''); setPetType(''); setPetName('')
    setPetCount(1); setSameNames('no'); setPetGender(''); setPetAge(''); setPetColor('')
    setPetBreed(''); setPetDescription(''); setPetIsFree('no'); setPetPrice('')
    setPetPhoto(null); setPhotoPreview(''); setCreateError('')
  }

  const nextCreateStep = (step) => {
    setCreateError('')
    if (step === 2) {
      if (!petCategory || !species) return setCreateError('Выберите категорию и вид животного')
      if (!petType) return setCreateError('Укажите: породистое или метис')
    }
    if (step === 3) {
      if (!petGender) return setCreateError('Выберите пол')
      if (!petAge) return setCreateError('Выберите возраст')
    }
    setCreateStep(step)
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setCreateError('Фото должно быть JPG, PNG или WebP')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setCreateError('Фото больше 5 МБ')
      return
    }
    setCreateError('')
    setPetPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleCreatePet = async () => {
    setCreateError('')
    if (petIsFree === 'no' && !(Number(petPrice) > 0)) return setCreateError('Укажите цену или выберите «бесплатно»')
    setCreateLoading(true)
    try {
      const countNote = petCount > 1 ? `В объявлении ${petCount} животных. ` : ''
      const pet = await api.createPet({
        name: petName.trim() || 'Без имени',
        category: species,
        gender: petGender,
        age_in_months: Number(petAge),
        color: petColor.trim() || null,
        breed: petBreed.trim() || (petType === 'mixed' ? 'Метис' : null),
        description: (countNote + petDescription.trim()).trim() || null,
        is_free: petIsFree === 'yes',
        price: petIsFree === 'yes' ? 0 : Number(petPrice),
      })
      if (petPhoto) await api.uploadPhoto(pet.id, petPhoto)
      resetCreateForm()
      setNotice(`Объявление «${pet.name}» опубликовано!`)
      setProfile(p => (p ? { ...p, can_create_ad: true } : p))
      setDashboardTab('profile')
      setProfileTab('my-ads')
      loadMyPets()
    } catch (error) {
      setCreateError(error.message)
    } finally {
      setCreateLoading(false)
    }
  }

  // ==========================================
  // РАЗМЕТКА
  // ==========================================
  return (
    <div className="web-app-container">
      {/* навбар*/}
      <nav className="navbar">
        <div className="nav-logo" onClick={() => setActiveTab('main')}>
          <img src="/assets/logo.svg" alt="" className="logo-icon" />
          <span className="logo-text">SWIPET</span>
        </div>
        <div className="nav-links">
          <button className={activeTab === 'main' ? 'active' : ''} onClick={() => setActiveTab('main')}>ГЛАВНАЯ</button>
          <button className={activeTab === 'product' ? 'active' : ''} onClick={() => setActiveTab('product')}>ПРОДУКТ</button>
          <button className={activeTab === 'about' ? 'active' : ''} onClick={() => setActiveTab('about')}>О НАС</button>
        </div>
        <div className="nav-user-zone">
          <button
            className="theme-toggle"
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? "Включить светлую тему" : "Включить темную тему"}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>

          {isLoggedIn ? (
            <div className="user-badge" onClick={() => { setActiveTab('main'); setDashboardTab('profile') }}>
              <span>{displayFirst}</span>
              <img src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=100" alt="User" className="avatar-mini" />
            </div>
          ) : (
            <button className="btn-login" onClick={() => { setActiveTab('main'); setAuthMode('login'); setAuthError('') }}>ВОЙТИ</button>
          )}
        </div>
      </nav>

      <div className="main-content">
        {notice && <div className="app-notice" onClick={() => setNotice('')}>{notice}</div>}

        {/* Экран регистрации и авторизации*/}
        {!isLoggedIn && activeTab === 'main' && (
          <div className="auth-screen">
            <div className="auth-card">
              <h2 className="auth-title">{authMode === 'register' ? 'РЕГИСТРАЦИЯ' : 'АВТОРИЗАЦИЯ'}</h2>
              <form onSubmit={handleAuthSubmit} className="auth-form">

                {/* Регистрация (Шаг 1) */}
                {authMode === 'register' && authStep === 0 && (
                  <>
                    <div className="input-group">
                      <label>КАКОВА ОСНОВНАЯ ЦЕЛЬ ИСПОЛЬЗОВАНИЯ?</label>
                      <CustomSelect
                        options={[
                          { value: 'find', label: 'Поиск питомца для дома и семьи' },
                          { value: 'breed', label: 'Разведение и регулярная продажа животных' }
                        ]}
                        value={userGoal} onChange={setUserGoal} placeholder="ВЫБЕРИТЕ ЦЕЛЬ"
                      />
                    </div>
                    <div className="input-group">
                      <label>УКАЖИТЕ ВАШ ТИП ПОЛЬЗОВАТЕЛЯ</label>
                      <div className="role-grid-three">
                        <button type="button" className={`role-grid-btn ${userType === 'fiz' ? 'active' : ''}`} onClick={() => setUserType('fiz')}>ФИЗ. ЛИЦО</button>
                        <button type="button" className={`role-grid-btn ${userType === 'ip' ? 'active' : ''}`} onClick={() => setUserType('ip')}>ИП</button>
                        <button type="button" className={`role-grid-btn ${userType === 'yur' ? 'active' : ''}`} onClick={() => setUserType('yur')}>ЮР. ЛИЦО</button>
                      </div>
                    </div>
                    <button type="button" className="btn-primary" onClick={() => goToStep(1)}>ПРОДОЛЖИТЬ</button>
                  </>
                )}

                {/* Регистрация (Шаг 2): личные данные */}
                {authMode === 'register' && authStep === 1 && (
                  <>
                    <div className="row">
                      <div className="input-group">
                        <label>ИМЯ</label>
                        <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="ВВЕДИТЕ СВОЕ ИМЯ" />
                      </div>
                      <div className="input-group">
                        <label>ФАМИЛИЯ</label>
                        <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="ВВЕДИТЕ СВОЮ ФАМИЛИЮ" />
                      </div>
                    </div>

                    <div className="row">
                      <div className="input-group">
                        <label>ТЕЛЕФОН</label>
                        <div className="phone-field">
                          <CountryCodeSelect value={countryCode} onChange={setCountryCode} />
                          <input type="tel" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} placeholder="000 000-00-00" />
                        </div>
                      </div>
                      <div className="input-group">
                        <label>EMAIL</label>
                        <input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="ВВЕДИТЕ СВОЙ EMAIL" />
                      </div>
                    </div>

                    <div className="row-full">
                      <div className="input-group">
                        <label>ГОРОД</label>
                        <div className="city-input-wrapper">
                          <input type="text" value={userCity} onChange={(e) => setUserCity(e.target.value)} placeholder="ВВЕДИТЕ СВОЙ ГОРОД" />
                          <div className="geo-icon">📍</div>
                        </div>
                      </div>
                    </div>

                    <div className="auth-action-buttons">
                      <button type="button" className="btn-primary btn-full-width" onClick={() => {
                        const error = validatePersonal()
                        if (error) setAuthError(error)
                        else goToStep(userGoal === 'find' ? 2 : 3)
                      }}>ПРОДОЛЖИТЬ</button>
                      <button type="button" className="tab-button-back" onClick={() => goToStep(0)}>НАЗАД</button>
                    </div>
                  </>
                )}

                {/* Регистрация (Шаг 3, только для тех, кто ищет питомца): анкета для умной ленты */}
                {authMode === 'register' && authStep === 2 && (
                  <>
                    <div className="input-group">
                      <label>КОГО ВЫ ИЩЕТЕ?</label>
                      <CustomSelect
                        options={[{ value: '', label: 'ПОКА НЕ ЗНАЮ' }, ...SPECIES_OPTIONS]}
                        value={prefSpecies} onChange={setPrefSpecies} placeholder="ВЫБЕРИТЕ ВИД ЖИВОТНОГО"
                      />
                    </div>
                    <div className="input-group">
                      <label>ОПИШИТЕ СВОИМИ СЛОВАМИ, КАКОЙ ПИТОМЕЦ НУЖЕН</label>
                      <textarea className="app-textarea" value={prefAbout} onChange={(e) => setPrefAbout(e.target.value)}
                        maxLength={500} placeholder="НАПРИМЕР: СПОКОЙНАЯ КОШКА ДЛЯ КВАРТИРЫ, ЕСТЬ МАЛЕНЬКИЕ ДЕТИ" />
                      <span className="field-hint">*ПО ЭТОМУ ТЕКСТУ ИИ ПОДБЕРЁТ ЛЕНТУ. МОЖНО ПРОПУСТИТЬ.</span>
                    </div>
                    <div className="auth-action-buttons">
                      <button type="button" className="btn-primary btn-full-width" onClick={() => goToStep(3)}>ПРОДОЛЖИТЬ</button>
                      <button type="button" className="tab-button-back" onClick={() => goToStep(1)}>НАЗАД</button>
                    </div>
                  </>
                )}

                {/* Регистрация (последний шаг): пароль */}
                {authMode === 'register' && authStep === 3 && (
                  <>
                    <div className="input-group"><label>ПАРОЛЬ</label><input type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} required /></div>
                    <div className="input-group"><label>ПОВТОРИТЕ ПАРОЛЬ</label><input type="password" value={userPassword2} onChange={(e) => setUserPassword2(e.target.value)} required /></div>

                    <div className="auth-action-column">
                      <button type="submit" className="btn-primary btn-full-width" disabled={authLoading}>
                        {authLoading ? 'ПОДОЖДИТЕ...' : 'ЗАРЕГИСТРИРОВАТЬСЯ'}
                      </button>
                      <button type="button" className="tab-button-link" onClick={() => goToStep(userGoal === 'find' ? 2 : 1)}>НАЗАД</button>
                    </div>
                  </>
                )}

                {/* Авторизация */}
                {authMode === 'login' && (
                  <>
                    <div className="input-group"><label>ТЕЛЕФОН ИЛИ EMAIL</label><input type="text" value={loginValue} onChange={(e) => setLoginValue(e.target.value)} required /></div>
                    <div className="input-group"><label>ПАРОЛЬ</label><input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required /></div>

                    <div className="auth-action-column">
                      <button type="submit" className="btn-primary btn-full-width" disabled={authLoading}>
                        {authLoading ? 'ПОДОЖДИТЕ...' : 'ВОЙТИ'}
                      </button>
                      <button type="button" className="tab-button-link" onClick={() => { setAuthMode('register'); goToStep(0) }}>ЗАРЕГИСТРИРОВАТЬСЯ</button>
                    </div>
                  </>
                )}

                {authError && <div className="form-error">{authError}</div>}

                {authMode === 'register' && authStep === 0 && (
                  <>
                    <div className="divider-text">Или</div>
                    <button type="button" className="btn-primary" onClick={() => { setAuthMode('login'); setAuthError('') }}>
                      ВОЙТИ
                    </button>
                  </>
                )}
              </form>
            </div>
          </div>
        )}

        {/* Личный кабинет*/}
        {isLoggedIn && activeTab === 'main' && (
          <div className="dashboard-layout">
            <aside className="sidebar">
              <div className="profile-summary" onClick={() => setDashboardTab('profile')}>
                <img src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150" alt="Avatar" />
                <h3>{displayFirst} {displayLast}</h3>
                <p>{displayCity}</p>
                <span className="role-badge">{displayType === 'ip' ? 'ИП' : displayType === 'yur' ? 'ЮР. ЛИЦО' : 'ФИЗ. ЛИЦО'}</span>
              </div>

              <nav className="sidebar-menu">
                <button className={dashboardTab === 'tape' ? 'active' : ''} onClick={() => setDashboardTab('tape')}>
                  <span className="menu-icon">🐾</span>
                  <span className="menu-text">ЛЕНТА</span>
                </button>

                <button className={dashboardTab === 'chat' ? 'active' : ''} onClick={() => { setDashboardTab('chat'); setActiveChatId(null); }}>
                  <span className="menu-icon">💬</span>
                  <span className="menu-text">СООБЩЕНИЯ</span>
                  {chats.some(c => c.unread > 0) && <span className="unread-dot"></span>}
                </button>

                {canCreateAd && (
                  <button className={dashboardTab === 'create-pet' ? 'active' : ''} onClick={() => setDashboardTab('create-pet')}>
                    <span className="menu-icon">➕</span>
                    <span className="menu-text">СОЗДАТЬ ОБЪЯВЛЕНИЕ</span>
                  </button>
                )}

                <button className={dashboardTab === 'profile' ? 'active' : ''} onClick={() => setDashboardTab('profile')}>
                  <span className="menu-icon">⚙️</span>
                  <span className="menu-text">ПРОФИЛЬ</span>
                </button>
              </nav>

              <button className="btn-exit" onClick={handleLogout}>ВЫЙТИ</button>
            </aside>

            <main className="content-area">
            {/* 1. Лента*/}
            {dashboardTab === 'tape' && (
              <div className="tape-view">
                {limitReached ? (
                  <div className="empty-state">
                    <h3>СВАЙПЫ НА СЕГОДНЯ ЗАКОНЧИЛИСЬ</h3>
                    <p className="empty-text">ПРЕМИУМ УВЕЛИЧИВАЕТ ЛИМИТ С 10 ДО 50 СВАЙПОВ В ДЕНЬ</p>
                    <button className="btn-primary" onClick={() => { setDashboardTab('profile'); setProfileTab('subscription') }}>ОФОРМИТЬ ПРЕМИУМ</button>
                  </div>
                ) : feedLoading && !currentPet ? (
                  <div className="empty-state"><h3>ПОДБИРАЕМ ПИТОМЦЕВ...</h3></div>
                ) : feedError && !currentPet ? (
                  <div className="empty-state">
                    <h3>НЕ УДАЛОСЬ ЗАГРУЗИТЬ ЛЕНТУ</h3>
                    <p className="empty-text">{feedError}</p>
                    <button className="btn-primary" onClick={loadFeed}>ПОПРОБОВАТЬ СНОВА</button>
                  </div>
                ) : currentPet ? (
                  <>
                    <div className="swipe-card-wrapper">
                      <div className="card-behind-2"></div>
                      <div className="card-behind-1"></div>

                      <motion.div
                        key={currentPet.id}
                        className="swipe-card-desktop"
                        style={{
                          x, rotate, opacity,
                          backgroundImage: currentPet.image
                            ? `linear-gradient(180deg, rgba(80, 55, 30, 0) 0%, rgba(53, 36, 19, 0.4) 40%, rgba(32, 20, 10, 0.95) 100%), url(${currentPet.image})`
                            : undefined
                        }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={(event, info) => {
                          if (info.offset.x > 150) handleLike();
                          else if (info.offset.x < -150) handleDislike();
                        }}
                      >
                        <div className="card-city-badge">
                          <span className="pin-icon">📍</span> {currentPet.city.toUpperCase()}
                        </div>
                        {currentPet.isPromo && <div className="card-promo-badge">РЕКЛАМА</div>}

                        {!currentPet.image && (
                          <div className="card-emoji-placeholder">{SPECIES_EMOJI[currentPet.category] || '🐾'}</div>
                        )}

                        <div className="card-details-blur-panel">
                          <div className="name-row">
                            <h2>{currentPet.name.toUpperCase()},</h2>
                            <span className="gender-icon">
                              {currentPet.gender === 'female' ? '♀' : '♂'}
                            </span>
                            <span className="info-status-circle" onClick={handleWhy} style={{ cursor: 'pointer' }} title="Почему мне это показали?">↗</span>
                          </div>
                          <p className="age-text">{currentPet.ageInfo.toUpperCase()} · {currentPet.price}</p>
                          <p className="breed-text">{currentPet.breed.toUpperCase()}</p>
                          {currentPet.description && <p className="card-description">{currentPet.description}</p>}
                          <div className="owner-row">
                            <p className="owner-text">ПРОДАВЕЦ {currentPet.owner.toUpperCase()}</p>
                            <span className="online-dot"></span>
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    <div className="swipe-controls">
                      <button className="btn-swipe dislike" onClick={handleDislike} disabled={swipeBusy} title="Пропустить">✕</button>
                      <button className="btn-swipe like" onClick={handleLike} disabled={swipeBusy} title="Нравится">❤️</button>
                      <button className="btn-swipe info" onClick={handleWhy} title="Почему мне это показали?">ℹ️</button>
                    </div>

                    {why && why.petId === currentPet.id && (
                      <div className="why-panel">
                        <div className="why-title">ПОЧЕМУ ВЫ ВИДИТЕ ЭТУ КАРТОЧКУ</div>
                        {why.loading ? (
                          <p>ИИ думает...</p>
                        ) : (
                          <>
                            <p>{why.text}</p>
                            {currentPet.reasons.length > 0 && (
                              <div className="why-reasons">
                                {currentPet.reasons.map(r => <span key={r} className="why-chip">{r}</span>)}
                              </div>
                            )}
                            <span className="why-source">
                              {why.by === 'gigachat' ? 'Объяснение: GigaChat' : why.by === 'template' ? 'GigaChat недоступен, объяснение по шаблону' : ''}
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {swipesLeft !== null && <p className="swipes-left">СВАЙПОВ НА СЕГОДНЯ: {swipesLeft}</p>}
                  </>
                ) : (
                  <div className="empty-state">
                    <h3>АНКЕТЫ ЗАКОНЧИЛИСЬ</h3>
                    <p className="empty-text">ВЫ ПОСМОТРЕЛИ ВСЕХ ДОСТУПНЫХ ПИТОМЦЕВ</p>
                    <button className="btn-primary" onClick={loadFeed}>ОБНОВИТЬ</button>
                  </div>
                )}
              </div>
            )}

            {/* 2. Сообщения*/}
            {dashboardTab === 'chat' && (
              <div className="mobile-chat-layout" style={{ height: 'auto', minHeight: '600px', display: 'flex', justifyContent: 'center', width: '100%' }}>

                {!activeChatId ? (
                  <div className="chat-list-card" style={{ maxWidth: '500px' }}>
                    <div className="chat-list-header">
                      <h2>МЕТЧ-ЧАТЫ</h2>
                      <button className="close-chat-btn" onClick={() => setDashboardTab('tape')}>✕</button>
                    </div>

                    <div className="chat-search-bar">
                      <span className="filter-icon">☲</span>
                      <input type="text" value={chatSearch} onChange={(e) => setChatSearch(e.target.value)} placeholder="НАЧНИТЕ ВПИСЫВАТЬ" />
                      <span className="search-icon">🔍</span>
                    </div>

                    <div className="chat-list-items">
                      {visibleChats.length === 0 && (
                        <p className="empty-text" style={{ textAlign: 'center' }}>
                          {chats.length === 0 ? 'ЧАТОВ ПОКА НЕТ. ЛАЙКНИТЕ ПИТОМЦА В ЛЕНТЕ' : 'НИЧЕГО НЕ НАЙДЕНО'}
                        </p>
                      )}
                      {visibleChats.map((chat) => (
                        <div key={chat.id} className="chat-item" onClick={() => openChat(chat.id)}>
                          <div className="chat-avatar" style={{ backgroundColor: chat.my_role === 'seller' ? '#a3530c' : '#2f4a36' }}>
                            {chat.pet_photo ? (
                              <img src={fileUrl(chat.pet_photo)} alt={chat.pet_name} />
                            ) : (
                              <span style={{ color: '#fff', fontSize: '18px' }}>🐾</span>
                            )}
                          </div>
                          <div className="chat-item-info">
                            <h4>{chat.partner_name} · {chat.pet_name}</h4>
                            <p>{chat.last_message || 'НЕТ СООБЩЕНИЙ'}</p>
                          </div>
                          {chat.unread > 0 && <span className="chat-unread">{chat.unread}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Переписка */
                  <div className="active-chat-card" style={{ maxWidth: '500px' }}>
                    <div className="active-chat-header" style={{ width: '100%' }}>
                      <div className="active-chat-user">
                        <div className="chat-avatar" style={{ backgroundColor: '#3F5740', width: '45px', height: '45px' }}>
                          {activeChat && activeChat.pet_photo ? (
                            <img src={fileUrl(activeChat.pet_photo)} alt="" />
                          ) : (
                            <span style={{ color: '#fff' }}>🐾</span>
                          )}
                        </div>
                        <div className="active-chat-info">
                          <h3>{activeChat ? activeChat.partner_name : 'ЧАТ'}</h3>
                          <span style={{ fontSize: '11px', color: 'var(--label)', textTransform: 'uppercase' }}>
                            {activeChat ? (activeChat.my_role === 'seller' ? 'ПОКУПАТЕЛЬ' : 'ПРОДАВЕЦ') : ''}
                          </span>
                        </div>
                      </div>
                      <button className="close-chat-btn" onClick={() => setDashboardTab('tape')}>✕</button>
                    </div>

                    <div className="chat-sub-header">
                      <button className="back-arrow" onClick={() => setActiveChatId(null)}>‹</button>
                      <span className="chat-date">{activeChat ? `ПИТОМЕЦ: ${(activeChat.pet_name || '').toUpperCase()}` : ''}</span>
                      <span className="options-dots">...</span>
                    </div>

                    <div className="chat-messages-area">
                      {messages.length === 0 && <p className="empty-text" style={{ textAlign: 'center' }}>НАПИШИТЕ ПЕРВОЕ СООБЩЕНИЕ</p>}
                      {messages.map((msg) => {
                        const mine = activeChat && msg.sender_type === activeChat.my_role
                        return (
                          <div
                            key={msg.id}
                            className={`chat-bubble ${mine ? 'bubble-theirs' : 'bubble-mine'}`}
                            style={{
                              alignSelf: mine ? 'flex-end' : 'flex-start',
                              backgroundColor: mine ? 'var(--label)' : 'var(--white)',
                              color: mine ? 'var(--white)' : 'var(--text-main)'
                            }}
                          >
                            {msg.text}
                            <span className="bubble-time">{formatTime(msg.sent_date)}</span>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef}></div>
                    </div>

                    <form className="chat-input-bar" onSubmit={handleSendMessage}>
                      <button type="button" className="plus-btn">+</button>
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        placeholder="ВВЕДИТЕ ТЕКСТ"
                      />
                      <button type="submit" className="send-btn">↗</button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* Создание объявления*/}
            {dashboardTab === 'create-pet' && (
              <div className="modal-content" style={{ maxWidth: '604px', margin: '0 auto', display: 'block', maxHeight: 'none', overflowY: 'visible' }}>

                <div className="modal-header">
                  <h2>ОБЪЯВЛЕНИЕ <span className="step">ШАГ {createStep} ИЗ 3</span></h2>
                  <button className="close-btn" onClick={() => { setDashboardTab('tape'); resetCreateForm(); }}>✕</button>
                  <div className="progress-bar">
                    <div className="fill" style={{ width: `${(createStep / 3) * 100}%` }}></div>
                  </div>
                </div>

                {createStep === 1 && (
                  <div className="modal-body">
                    <p className="modal-subtitle">
                      КОГО ВЫ ХОТИТЕ РАЗМЕСТИТЬ ? <br />
                      <span>РАССКАЖИТЕ НЕМНОГО О ЖИВОТНОМ, ЧТОБЫ МЫ МОГЛИ ПРАВИЛЬНО ОФОРМИТЬ ОБЪЯВЛЕНИЕ.</span>
                    </p>

                    <div className="input-group">
                      <label>ВЫБЕРИТЕ КАТЕГОРИЮ:</label>
                      <CustomSelect
                        options={[
                          { value: 'dogs', label: 'СОБАКИ / ЩЕНКИ' },
                          { value: 'cats', label: 'КОШКИ / КОТЯТА' },
                          { value: 'other', label: 'ДРУГИЕ ЖИВОТНЫЕ' }
                        ]}
                        value={petCategory}
                        onChange={setPetCategory}
                        placeholder="ВЫБЕРИТЕ КАТЕГОРИЮ ЖИВОТНОГО"
                      />
                    </div>

                    {petCategory === 'other' && (
                      <div className="input-group">
                        <label>КАКОЕ ЖИВОТНОЕ:</label>
                        <CustomSelect options={OTHER_SPECIES} value={otherSpecies} onChange={setOtherSpecies} placeholder="ВЫБЕРИТЕ ЖИВОТНОЕ" />
                      </div>
                    )}

                    <div className="input-group">
                      <label>ВЫБЕРИТЕ ВИД:</label>
                      <CustomSelect
                        options={[
                          { value: 'purebred', label: 'ПОРОДИСТОЕ ЖИВОТНОЕ' },
                          { value: 'mixed', label: 'МЕТИС / БЕСПОРОДНОЕ' }
                        ]}
                        value={petType}
                        onChange={setPetType}
                        placeholder="ВЫБЕРИТЕ ВИД ЖИВОТНОГО"
                      />
                    </div>

                    <div className="input-group">
                      <label>ИМЯ ЖИВОТНОГО</label>
                      <input type="text" value={petName} onChange={(e) => setPetName(e.target.value)} placeholder="ВВЕДИТЕ ИМЯ ЖИВОТНОГО" />
                      <span className="field-hint">*ЕСЛИ У ЖИВОТНОГО НЕТ ИМЕНИ, ТО ОСТАВЬТЕ ПОЛЕ ПУСТЫМ.</span>
                    </div>

                    <div className="input-group">
                      <label>СКОЛЬКО:</label>
                      <div className="counter">
                        <button type="button" onClick={() => setPetCount(Math.max(1, petCount - 1))}>-</button>
                        <span>{petCount}</span>
                        <button type="button" onClick={() => setPetCount(petCount + 1)}>+</button>
                      </div>
                    </div>

                    {petCount > 1 && (
                      <div className="input-group">
                        <label>ЖИВОТНЫЕ ИМЕЮТ ОДИНАКОВЫЕ Х-КИ?</label>
                        <div className="toggle-buttons">
                          <button type="button" className={sameNames === 'yes' ? 'active' : ''} onClick={() => setSameNames('yes')}>ДА</button>
                          <button type="button" className={sameNames === 'no' ? 'active' : ''} onClick={() => setSameNames('no')}>НЕТ</button>
                        </div>
                        <span className="field-hint">*ЕСЛИ У ЖИВОТНЫХ РАЗНЫЕ Х-КИ, СЛЕДУЕТ СДЕЛАТЬ РАЗНЫЕ ОБЪЯВЛЕНИЯ.</span>
                      </div>
                    )}

                    {createError && <div className="form-error">{createError}</div>}
                    <div className="auth-action-column" style={{ marginTop: '15px' }}>
                      <button type="button" className="btn-primary btn-full-width" onClick={() => nextCreateStep(2)}>ПРОДОЛЖИТЬ</button>
                    </div>
                  </div>
                )}

                {createStep === 2 && (
                  <div className="modal-body">
                    <div className="input-group">
                      <label>ПОЛ</label>
                      <CustomSelect
                        options={[
                          { value: 'male', label: 'МАЛЬЧИК / САМЕЦ' },
                          { value: 'female', label: 'ДЕВОЧКА / САМКА' }
                        ]}
                        value={petGender} onChange={setPetGender} placeholder="ВЫБЕРИТЕ ПОЛ"
                      />
                    </div>

                    <div className="input-group">
                      <label>ВОЗРАСТ</label>
                      <CustomSelect options={AGE_OPTIONS} value={petAge} onChange={setPetAge} placeholder="ВЫБЕРИТЕ ВОЗРАСТ" />
                    </div>

                    <div className="input-group">
                      <label>ОКРАС</label>
                      <input type="text" value={petColor} onChange={(e) => setPetColor(e.target.value)} placeholder="НАПРИМЕР: РЫЖИЙ, ТРИКОЛОР" />
                    </div>

                    {createError && <div className="form-error">{createError}</div>}
                    <div className="auth-action-column" style={{ marginTop: '30px', gap: '12px' }}>
                      <button type="button" className="btn-primary btn-full-width" onClick={() => nextCreateStep(3)}>ПРОДОЛЖИТЬ</button>
                      <button type="button" className="tab-button-link" onClick={() => setCreateStep(1)}>НАЗАД</button>
                    </div>
                  </div>
                )}

                {createStep === 3 && (
                  <div className="modal-body">
                    <div className="input-group">
                      <label>ПОРОДА</label>
                      <input type="text" value={petBreed} onChange={(e) => setPetBreed(e.target.value)}
                        placeholder={petType === 'mixed' ? 'МЕТИС (МОЖНО УТОЧНИТЬ)' : 'НАПРИМЕР: КОРГИ'} />
                    </div>

                    <div className="input-group">
                      <label>ОПИСАНИЕ</label>
                      <textarea className="app-textarea" value={petDescription} onChange={(e) => setPetDescription(e.target.value)}
                        maxLength={1000} placeholder="ХАРАКТЕР, ПРИВЫЧКИ, ЗДОРОВЬЕ, ДЛЯ КОГО ПОДОЙДЁТ" />
                      <span className="field-hint">*ПО ОПИСАНИЮ ИИ ПОДБИРАЕТ ПИТОМЦА ПОД ЗАПРОС ПОКУПАТЕЛЯ.</span>
                    </div>

                    <div className="input-group">
                      <label>ТИП ПЕРЕДАЧИ</label>
                      <div className="toggle-buttons">
                        <button type="button" className={petIsFree === 'no' ? 'active' : ''} onClick={() => setPetIsFree('no')}>ПЛАТНО</button>
                        <button type="button" className={petIsFree === 'yes' ? 'active' : ''} onClick={() => setPetIsFree('yes')}>БЕСПЛАТНО</button>
                      </div>
                    </div>

                    {petIsFree === 'no' && (
                      <div className="input-group">
                        <label>ЦЕНА, ₽</label>
                        <input type="number" min="1" value={petPrice} onChange={(e) => setPetPrice(e.target.value)} placeholder="ВВЕДИТЕ ЦЕНУ" />
                      </div>
                    )}

                    <div className="input-group">
                      <label>ФОТО</label>
                      <label className="photo-upload">
                        {photoPreview ? <img src={photoPreview} alt="Фото питомца" /> : <span>+ ВЫБРАТЬ ФОТО (JPG, PNG, WEBP ДО 5 МБ)</span>}
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} hidden />
                      </label>
                    </div>

                    {createError && <div className="form-error">{createError}</div>}
                    <div className="auth-action-column" style={{ marginTop: '30px', gap: '12px' }}>
                      <button type="button" className="btn-primary btn-full-width" onClick={handleCreatePet} disabled={createLoading}>
                        {createLoading ? 'ПУБЛИКУЕМ...' : 'ОПУБЛИКОВАТЬ'}
                      </button>
                      <button type="button" className="tab-button-link" onClick={() => setCreateStep(2)}>НАЗАД</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. Профиль*/}
            {dashboardTab === 'profile' && (
              <div className="mobile-profile-card">
                <div className="profile-cover-area">
                  <div className="profile-cover-bg"></div>
                  <div className="profile-avatar-container">
                    <img src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200" alt="Avatar" className="profile-page-avatar" />
                    <span className="avatar-status-dot">★</span>
                  </div>
                </div>

                <h3 className="profile-user-name">{displayFirst} {displayLast}</h3>
                <p className="profile-user-city">ГОРОД {displayCity.toUpperCase() || '—'}</p>
                <span className="role-badge">{displayType === 'ip' ? 'ИП' : displayType === 'yur' ? 'ЮР. ЛИЦО' : 'ФИЗ. ЛИЦО'}</span>

                {profileTab === 'menu' && (
                  <>
                    <div className="profile-menu-list">
                      <button onClick={() => setProfileTab('my-ads')}>МОИ АНКЕТЫ</button>
                      <button onClick={() => setProfileTab('details')}>ПРОФИЛЬ</button>
                      <button onClick={() => setProfileTab('subscription')}>ПОДПИСКА</button>
                      <button onClick={() => setProfileTab('privacy')}>КОНФИДЕНЦИАЛЬНОСТЬ & БЕЗОПАСНОСТЬ</button>
                      <button onClick={(e) => e.preventDefault()}>НАСТРОЙКИ</button>
                      <button onClick={() => setProfileTab('support')}>ПОДДЕРЖКА</button>
                      <button onClick={(e) => e.preventDefault()}>F&G</button>
                    </div>

                    {canCreateAd && (
                      <button className="profile-create-btn" onClick={() => setDashboardTab('create-pet')}>
                        <span className="plus-icon">+</span> Создать объявление
                      </button>
                    )}
                  </>
                )}

                {profileTab !== 'menu' && (
                  <div className="profile-sub-view">
                    <div className="sub-view-header">
                      <button className="btn-back-arrow" onClick={() => setProfileTab('menu')}>← НАЗАД</button>
                      <h2>
                        {profileTab === 'my-ads' && 'МОИ АНКЕТЫ'}
                        {profileTab === 'details' && 'ПРОФИЛЬ'}
                        {profileTab === 'subscription' && 'ПОДПИСКА'}
                        {profileTab === 'privacy' && 'КОНФИДЕНЦИАЛЬНОСТЬ'}
                        {profileTab === 'support' && 'ПОДДЕРЖКА'}
                      </h2>
                    </div>

                    {profileTab === 'my-ads' && (
                      userPets.length === 0 ? (
                        <div className="profile-info-block text-center">
                          <p className="empty-text">АНКЕТ НЕТ</p>
                        </div>
                      ) : (
                        <div className="user-pets-grid">
                          {userPets.map((pet) => (
                            <div key={pet.id} className="user-pet-mini-card">
                              <div className="mini-card-img" style={{ backgroundImage: pet.photo_url ? `url(${fileUrl(pet.photo_url)})` : undefined }}>
                                {!pet.photo_url && <span className="mini-card-emoji">{SPECIES_EMOJI[pet.category] || '🐾'}</span>}
                              </div>
                              <div className="mini-card-info">
                                <h3>{(pet.name || 'Без имени').toUpperCase()}</h3>
                                <p>{(pet.breed || '').toUpperCase()} · {formatPrice(pet)}</p>
                                <p>{pet.status === 'active' ? 'АКТИВНА' : pet.status === 'sold' ? 'ПРИСТРОЕН' : 'В АРХИВЕ'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    )}

                    {profileTab === 'subscription' && (
                      <div className="subscription-view">
                        <div className="status-badge-container">
                          <span className="status-label">ТЕКУЩИЙ СТАТУС:</span>
                          <span className={`status-value ${isPremium ? 'premium-text' : 'free-text'}`}>
                            {isPremium ? '★ ПРЕМИУМ ПОДПИСКА' : 'БЕСПЛАТНЫЙ ТАРИФ'}
                          </span>
                        </div>
                        {subscription && (
                          <p className="empty-text">
                            СВАЙПОВ СЕГОДНЯ: {subscription.swipes_left} ИЗ {subscription.daily_limit}
                            {isPremium && subscription.premium_until && ` · ДО ${new Date(subscription.premium_until).toLocaleDateString('ru-RU')}`}
                          </p>
                        )}
                        <div className="tariffs-grid">
                          <div className={`tariff-card ${!isPremium ? 'active-tariff' : ''}`}>
                            <h3>БЕСПЛАТНЫЙ</h3>
                            <ul>
                              <li>• 10 СВАЙПОВ В СУТКИ</li>
                              <li>• СТАНДАРТНЫЙ ПРИОРИТЕТ АНКЕТ</li>
                            </ul>
                          </div>
                          <div className={`tariff-card premium ${isPremium ? 'active-tariff' : ''}`}>
                            <h3>PREMIUM ★</h3>
                            <ul>
                              <li>• 50 СВАЙПОВ В СУТКИ</li>
                              <li>• ДОСТУП К ТАРИФУ НА 30 ДНЕЙ</li>
                            </ul>
                          </div>
                        </div>
                        <button className="btn-primary btn-full-width" onClick={togglePremium}>
                          {isPremium ? 'ОТКЛЮЧИТЬ ПРЕМИУМ' : 'ОФОРМИТЬ ПРЕМИУМ (ДЕМО-ОПЛАТА)'}
                        </button>
                      </div>
                    )}

                    {profileTab === 'privacy' && (
                      <div className="profile-info-block">
                        <p><strong>ЗАЩИТА ДАННЫХ:</strong> ПАРОЛИ ХРАНЯТСЯ ТОЛЬКО В ВИДЕ ХЕША, КОНТАКТЫ ВИДНЫ ПОСЛЕ ЛАЙКА И ЧАТА.</p>
                      </div>
                    )}

                    {profileTab === 'support' && (
                      <div className="profile-info-block support-view">
                        <p>ЕСЛИ У ВАС ВОЗНИКЛИ ВОПРОСЫ, НАША КОМАНДА ВСЕГДА НА СВЯЗИ.</p>
                        <div className="support-content-placeholder">
                          <p>https://t.me/swipet_support</p>
                        </div>
                        <div className="support-contacts">
                          <p>EMAIL: SUPPORT@SWIPET.RU</p>
                        </div>
                      </div>
                    )}

                    {profileTab === 'details' && (
                      <div className="profile-info-block">
                        <p>ИМЯ: {displayFirst} {displayLast}</p>
                        <p>ГОРОД: {displayCity.toUpperCase() || '—'}</p>
                        {profile && <p>EMAIL: {profile.email}</p>}
                        {profile && <p>ТЕЛЕФОН: {profile.phone}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            </main>
          </div>
        )}

      </div>
    </div>
  )
}

export default App
