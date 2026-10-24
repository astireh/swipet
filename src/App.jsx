import { useState, useRef, useEffect } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion';

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

 
function CountryCodeSelect({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Список стран строго по вашему второму макету
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
      {/* Кнопка с текущим выбранным кодом внутри инпута */}
      <div className="country-code" onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
        <span>{value}</span>
        <span className={`arrow ${isOpen ? 'rotate' : ''}`}>▼</span>
      </div>

      {/* Кастомное выпадающее меню в стиле макета */}
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
// НАЧАЛЬНЫЕ ДАННЫЕ
// ==========================================
// =======================================================
// 👇 ДОБАВИЛИ БОЛЬШЕ КАРТОЧЕК ДЛЯ ТЕСТИРОВАНИЯ СВАЙПОВ 👇
// =======================================================
const INITIAL_PETS = [
  {
    id: 1,
    name: 'Бетси и Мими',
    gender: '♀',
    ageInfo: '1 год',
    breed: 'Корги, классической раскраски',
    city: 'Воронеж',
    owner: 'Вика Короткевич',
    image: 'https://unsplash.com' // Фото корги
  },
  {
    id: 2,
    name: 'Рекс',
    gender: '♂',
    ageInfo: '2 года',
    breed: 'Такса, гладкошёрстная',
    city: 'Москва',
    owner: 'Илья Трубецкий',
    image: 'https://unsplash.com' // Фото таксы
  },
  {
    id: 3,
    name: 'Марли',
    gender: '♂',
    ageInfo: '6 месяцев',
    breed: 'Золотистый ретривер',
    city: 'Липецк',
    owner: 'Анна Кузнецова',
    image: 'https://unsplash.com' // Фото ретривера
  },
  {
    id: 4,
    name: 'Клео',
    gender: '♀',
    ageInfo: '3 года',
    breed: 'Сиамская кошка',
    city: 'Санкт-Петербург',
    owner: 'Дмитрий Петров',
    image: 'https://unsplash.com' // Фото кошки
  }
];


const MOCK_CHATS = [
  { id: 1, name: 'ИЛЬЯ ТРУБЕЦКИЙ', lastMsg: 'Здравствуйте, понравился вас песик, рекс!', avatarColor: '#2f4a36', isImage: true, image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=100' },
  { id: 2, name: 'ИМЯ И ФАМИЛИЯ', lastMsg: '', avatarColor: '#a3530c' },
  { id: 3, name: 'ИМЯ И ФАМИЛИЯ', lastMsg: '', avatarColor: '#1c2b3a' },
  { id: 4, name: 'ИМЯ И ФАМИЛИЯ', lastMsg: '', avatarColor: '#f5c242' },
]

// ==========================================
// ОСНОВНОЙ КОМПОНЕНТ
// ==========================================
function App() {
  // 👇 Стейт для темной темы 👇
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // Применяем тему к body
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // --- Состояния приложения ---
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activeTab, setActiveTab] = useState('main')
  const [countryCode, setCountryCode] = useState('+7')
  
  const [authMode, setAuthMode] = useState('register')
  const [authStep, setAuthStep] = useState(0)
  const [userGoal, setUserGoal] = useState('find')
  const [userType, setUserType] = useState('fiz')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [userCity, setUserCity] = useState('')
  const [userPassword, setUserPassword] = useState('')

  const [dashboardTab, setDashboardTab] = useState('tape')
  const [pets, setPets] = useState(INITIAL_PETS)
  const [currentPetIndex, setCurrentPetIndex] = useState(0)

  const [createStep, setCreateStep] = useState(1);

  
  const [profileTab, setProfileTab] = useState('menu');
  const [userPets, setUserPets] = useState([]);
  const [isPremium, setIsPremium] = useState(false); 


  const [activeChatOwner, setActiveChatOwner] = useState(null)
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState({
    1: [
      { sender: 'them', text: 'Здравствуйте, понравился вас песик, рекс!', time: '12:05' },
      { sender: 'me', text: 'Здравствуйте, заинтерисовал ваш песик, Рекс!', time: '12:06' }
    ]

  
  }) 
  // Логика анимации для свайпов
  const currentPet = pets[currentPetIndex];

  // Смещение по оси X во время перетаскивания карточки
  const x = useMotionValue(0);
  
  // Угол поворота наклона карточки при сдвиге в сторону
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  
  // Прозрачность карточки при её отдалении от центра
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5]);

  // Обработчик лайка (свайп вправо) -> Открытие чата
  const handleLike = () => {
    if (!currentPet) return;
    setDashboardTab('chat');
    setActiveChatOwner(currentPet.sellerId); 
    goToNextPet();
  };

  // Обработчик дизлайка (свайп влево) -> Просто следующая анкета
  const handleDislike = () => {
    goToNextPet();
  };

  const goToNextPet = () => {
    if (currentPetIndex < pets.length - 1) {
      setCurrentPetIndex(prev => prev + 1);
    } else {
      alert("Анкеты закончились!");
    }
  };

  const [petCategory, setPetCategory] = useState('')
  const [petType, setPetType] = useState('')
  const [petName, setPetName] = useState('')
  const [petCount, setPetCount] = useState(1)
  const [sameNames, setSameNames] = useState('no')

  const canCreateAd = userType === 'ip' || userType === 'yur' || userGoal === 'breed'

  useEffect(() => {
    if (!canCreateAd && dashboardTab === 'create-pet') {
      setDashboardTab('tape')
    }
  }, [canCreateAd, dashboardTab])

  const handleSwipeAction = (actionType) => {
    const currentPet = pets[currentPetIndex]
    if (actionType === 'like') {
      setActiveChatOwner(currentPet.owner)
      setDashboardTab('chat')
    }
    setCurrentPetIndex(prev => prev + 1)
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!chatMessage.trim() || !activeChatOwner) return
    const newMessage = { sender: 'me', text: chatMessage, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
    setChatHistory(prev => ({ ...prev, [activeChatOwner]: [...(prev[activeChatOwner] || []), newMessage] }))
    setChatMessage('')
  }


  const handleAuthSubmit = (e) => {
    e.preventDefault()
    setIsLoggedIn(true)
    setDashboardTab(canCreateAd ? 'create-pet' : 'tape')
  }

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
          {/*переключение темы */}
          <button 
            className="theme-toggle" 
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? "Включить светлую тему" : "Включить темную тему"}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>

          {isLoggedIn ? (
            <div className="user-badge" onClick={() => setDashboardTab('profile')}>
              <span>{firstName}</span>
              <img src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=100" alt="User" className="avatar-mini" />
            </div>
          ) : (
            <button className="btn-login" onClick={() => setIsLoggedIn(true)}>ВОЙТИ</button>
          )}
        </div>
      </nav>

      <div className="main-content">
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
                    <button type="button" className="btn-primary" onClick={() => setAuthStep(1)}>ПРОДОЛЖИТЬ</button>
                  </>
                )}

                {/* Регистрация (Шаг 2) */}
                {authMode === 'register' && authStep === 1 && (
                  <>
                    {/* Строка 1: Имя и Фамилия */}
                    <div className="row">
                      <div className="input-group">
                        <label>ИМЯ</label>
                        <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="ВВЕДИТЕ СВОЕ ИМЯ" required />
                      </div>
                      <div className="input-group">
                        <label>ФАМИЛИЯ</label>
                        <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="ВВЕДИТЕ СВОЮ ФАМИЛИЮ" required />
                      </div>
                    </div>

                    {/* Строка 2: Телефон и Email */}
                    <div className="row">
                      <div className="input-group">
                        <label>ТЕЛЕФОН</label>
                        <div className="phone-field">
                          <div className="country-code">
                            <select>
                              <option>+7</option>
                              
                            </select>
                            <span className="arrow">▼</span>
                          </div>
                          <input type="tel" placeholder="000 000-00-00" required />
                        </div>
                      </div>
                      <div className="input-group">
                        <label>EMAIL</label>
                        <input type="email" placeholder="ВВЕДИТЕ СВОЙ EMAIL" required />
                      </div>
                    </div>

                    {/* Блок Города: Вынесен в отдельную строку на всю ширину карточки */}
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
                      <button type="button" className="btn-primary btn-full-width" onClick={() => setAuthStep(2)}>ПРОДОЛЖИТЬ</button>
                      <button type="button" className="tab-button-back" onClick={() => setAuthStep(0)}>НАЗАД</button>
                    </div>
                  </>
                )}


                {/* Регистрация (Шаг 3) */}
                {authMode === 'register' && authStep === 2 && (
                  <>
                    <div className="input-group"><label>ПАРОЛЬ</label><input type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} required /></div>
                    <div className="input-group"><label>ПОВТОРИТЕ ПАРОЛЬ</label><input type="password" required /></div>
                    
                    
                    <div className="auth-action-column">
                      <button type="submit" className="btn-primary btn-full-width">ЗАРЕГИСТРИРОВАТЬСЯ</button>
                      <button type="button" className="tab-button-link" onClick={() => setAuthStep(1)}>НАЗАД</button>
                    </div>
                  </>
                )}

                {/* Авторизация */}
    
                {authMode === 'login' && (
                  <>
                    <div className="input-group"><label>ЛОГИН ИЛИ EMAIL</label><input type="text" required /></div>
                    <div className="input-group"><label>ПАРОЛЬ</label><input type="password" required /></div>
                    
                    <div className="auth-action-column">
                      <button type="submit" className="btn-primary btn-full-width">ВОЙТИ</button>
                      <button type="button" className="tab-button-link" onClick={() => setAuthMode('register')}>ЗАРЕГИСТРИРОВАТЬСЯ</button>
                    </div>
                  </>
                )}

                {authMode === 'register' && authStep === 0 && (
                  <>
                    <div className="divider-text">Или</div>
                    <button type="button" className="btn-primary" onClick={() => setAuthMode('login')}>
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
                <h3>{firstName} {lastName}</h3>
                <p>{userCity}</p>
                <span className="role-badge">{userType === 'fiz' ? 'ФИЗ. ЛИЦО' : userType === 'ip' ? 'ИП' : 'ЮР. ЛИЦО'}</span>
              </div>
              
              <nav className="sidebar-menu">
                {/* Кнопка: Лента */}
                <button className={dashboardTab === 'tape' ? 'active' : ''} onClick={() => setDashboardTab('tape')}>
                  <span className="menu-icon">🐾</span>
                  <span className="menu-text">ЛЕНТА</span>
                </button>
                
                {/* Кнопка: Сообщения */}
                <button className={dashboardTab === 'chat' ? 'active' : ''} onClick={() => { setDashboardTab('chat'); setActiveChatOwner(null); }}>
                  <span className="menu-icon">💬</span>
                  <span className="menu-text">СООБЩЕНИЯ</span>
                </button>
                
                {/* Кнопка: Создать объявление */}
                {canCreateAd && (
                  <button className={dashboardTab === 'create-pet' ? 'active' : ''} onClick={() => setDashboardTab('create-pet')}>
                    <span className="menu-icon">➕</span>
                    <span className="menu-text">СОЗДАТЬ ОБЪЯВЛЕНИЕ</span>
                  </button>
                )}
                
                {/* Кнопка: Профиль */}
                <button className={dashboardTab === 'profile' ? 'active' : ''} onClick={() => setDashboardTab('profile')}>
                  <span className="menu-icon">⚙️</span>
                  <span className="menu-text">ПРОФИЛЬ</span>
                </button>
              </nav>
              
              {/* Кнопка: Выйти */}
              <button className="btn-exit" onClick={() => { setIsLoggedIn(false); setAuthStep(0); }}>ВЫЙТИ</button>
            </aside>

            <main className="content-area">
            {/* 1. Лента*/}
            {dashboardTab === 'tape' && (
              <div className="tape-view">
                {currentPetIndex < pets.length ? (
                  <>
                    <div className="swipe-card-wrapper">
                      <div className="card-behind-2"></div>
                      <div className="card-behind-1"></div>
                      
                      <motion.div 
                        key={currentPetIndex}
                        className="swipe-card-desktop"
                        style={{ 
                          x, rotate, opacity,
                          backgroundImage: `linear-gradient(180deg, rgba(80, 55, 30, 0) 0%, rgba(53, 36, 19, 0.4) 40%, rgba(32, 20, 10, 0.95) 100%), url(${pets[currentPetIndex].image || pets[currentPetIndex].imageUrl})`
                        }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={(event, info) => {
                          if (info.offset.x > 150) handleLike();
                          else if (info.offset.x < -150) handleDislike();
                        }}
                      >
                        <div className="card-city-badge">
                          <span className="pin-icon">📍</span> {pets[currentPetIndex].city.toUpperCase()}
                        </div>
                        
                        <div className="card-details-blur-panel">
                          <div className="name-row">
                            <h2>{pets[currentPetIndex].name.toUpperCase()},</h2>
                            <span className="gender-icon">
                              {pets[currentPetIndex].gender === 'female' || pets[currentPetIndex].gender === '♀' ? '♀' : '♂'}
                            </span>
                            <span className="info-status-circle">↗</span>
                          </div>
                          <p className="age-text">{(pets[currentPetIndex].ageInfo || pets[currentPetIndex].age).toUpperCase()}</p>
                          <p className="breed-text">{pets[currentPetIndex].breed.toUpperCase()}</p>
                          <div className="owner-row">
                            <p className="owner-text">ПРОДАВЕЦ {pets[currentPetIndex].owner.toUpperCase()}</p>
                            <span className="online-dot"></span>
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    <div className="swipe-controls">
                      <button className="btn-swipe dislike" onClick={handleDislike}>✕</button>
                      <button className="btn-swipe like" onClick={handleLike}>❤️</button>
                      <button className="btn-swipe info">ℹ️</button>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <h3>АНКЕТЫ ЗАКОНЧИЛИСЬ</h3>
                    <button className="btn-primary" onClick={() => setCurrentPetIndex(0)}>СМОТРЕТЬ ЗАНОВО</button>
                  </div>
                )}
              </div>
            )}

            {/* 2. Сообщения*/}
            
            {dashboardTab === 'chat' && (
              <div className="mobile-chat-layout" style={{ height: 'auto', minHeight: '600px', display: 'flex', justifyContent: 'center', width: '100%' }}>
                
                {!activeChatOwner ? (
                  
                  <div className="chat-list-card" style={{ maxWidth: '500px' }}>
                    <div className="chat-list-header">
                      <h2>МЕТЧ-ЧАТЫ</h2>
                      <button className="close-chat-btn" onClick={() => setDashboardTab('tape')}>✕</button>
                    </div>

                    <div className="chat-search-bar">
                      <span className="filter-icon">☲</span>
                      <input type="text" placeholder="НАЧНИТЕ ВПИСЫВАТЬ" />
                      <span className="search-icon">🔍</span>
                    </div>

                    <div className="chat-list-items">
                      {MOCK_CHATS.map((chat) => {
                        const history = chatHistory[chat.id] || [];
                        const lastMessageText = history.length > 0 
                          ? history[history.length - 1].text 
                          : chat.lastMsg;

                        return (
                          <div 
                            key={chat.id} 
                            className="chat-item" 
                            onClick={() => setActiveChatOwner(chat.id)}
                          >
                            <div className="chat-avatar" style={{ backgroundColor: chat.avatarColor }}>
                              {chat.isImage ? (
                                <img src={chat.image} alt={chat.name} />
                              ) : (
                                <span style={{ color: '#fff', fontSize: '18px' }}>🐾</span>
                              )}
                            </div>
                            <div className="chat-item-info">
                              <h4>{chat.name}</h4>
                              <p>{lastMessageText || 'НЕТ СООБЩЕНИЙ'}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /*Перепика */
                  <div className="active-chat-card" style={{ maxWidth: '500px' }}>
                    
                    <div className="active-chat-header" style={{ width: '100%' }}>
                      <div className="active-chat-user">
                        <div 
                          className="chat-avatar" 
                          style={{ 
                            backgroundColor: MOCK_CHATS.find(c => c.id === activeChatOwner)?.avatarColor || '#3F5740',
                            width: '45px', 
                            height: '45px' 
                          }}
                        >
                          {MOCK_CHATS.find(c => c.id === activeChatOwner)?.isImage ? (
                            <img src={MOCK_CHATS.find(c => c.id === activeChatOwner)?.image} alt="" />
                          ) : (
                            <span style={{ color: '#fff' }}>🐾</span>
                          )}
                        </div>
                        <div className="active-chat-info">
                          <h3>{MOCK_CHATS.find(c => c.id === activeChatOwner)?.name}</h3>
                          <div className="online-dot" style={{ display: 'inline-block', marginRight: '5px' }}></div>
                          <span style={{ fontSize: '11px', color: 'var(--label)', textTransform: 'uppercase' }}>Онлайн</span>
                        </div>
                      </div>
                      <button className="close-chat-btn" onClick={() => setDashboardTab('tape')}>✕</button>
                    </div>

                    <div className="chat-sub-header">
                      <button className="back-arrow" onClick={() => setActiveChatOwner(null)}>‹</button>
                      <span className="chat-date">СЕГОДНЯ, 12:05</span>
                      <span className="options-dots">...</span>
                    </div>

                    <div className="chat-messages-area">
                      {(chatHistory[activeChatOwner] || []).map((msg, index) => (
                        <div 
                          key={index} 
                          className={`chat-bubble ${msg.sender === 'me' ? 'bubble-theirs' : 'bubble-mine'}`}
                          style={{
                            alignSelf: msg.sender === 'me' ? 'flex-end' : 'flex-start',
                            backgroundColor: msg.sender === 'me' ? 'var(--label)' : 'var(--white)',
                            color: msg.sender === 'me' ? 'var(--white)' : 'var(--text-main)'
                          }}
                        >
                          {msg.text}
                          <span className="bubble-time">{msg.time}</span>
                        </div>
                      ))}
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
                
                {/* Шапка формы создания */}
                <div className="modal-header">
                  <h2>ОБЪЯВЛЕНИЕ <span className="step">ШАГ {createStep} ИЗ 5</span></h2>
                  <button className="close-btn" onClick={() => { setDashboardTab('tape'); setCreateStep(1); }}>✕</button>
                  <div className="progress-bar">
                    <div className="fill" style={{ width: `${(createStep / 5) * 100}%` }}></div>
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
                      <input 
                        type="text" 
                        value={petName} 
                        onChange={(e) => setPetName(e.target.value)} 
                        placeholder="ВВЕДИТЕ ИМЯ ЖИВОТНОГО" 
                      />
                      <span style={{ fontSize: '12px', color: 'var(--label)', marginLeft: '10px', marginTop: '-4px' }}>
                        *ЕСЛИ У ЖИВОТНОГО НЕТ ИМЕНИ, ТО ОСТАВЬТЕ ПОЛЕ ПУСТЫМ.
                      </span>
                    </div>

                    <div className="input-group">
                      <label>СКОЛЬКО:</label>
                      <div className="counter">
                        <button type="button" onClick={() => setPetCount(Math.max(1, petCount - 1))}>-</button>
                        <span>{petCount}</span>
                        <button type="button" onClick={() => setPetCount(petCount + 1)}>+</button>
                      </div>
                    </div>

                    <div className="input-group">
                      <label>ЖИВОТНЫЕ ИМЕЮТ ОДИНАКОВЫЕ Х-КИ?</label>
                      <div className="toggle-buttons">
                        <button 
                          type="button" 
                          className={sameNames === 'yes' ? 'active' : ''} 
                          onClick={() => setSameNames('yes')}
                        >
                          ДА
                        </button>
                        <button 
                          type="button" 
                          className={sameNames === 'no' ? 'active' : ''} 
                          onClick={() => setSameNames('no')}
                        >
                          НЕТ
                        </button>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--label)', marginLeft: '10px', marginTop: '4px' }}>
                        *ЕСЛИ У ЖИВОТНЫХ РАЗНЫЕ Х-КИ, СЛЕДУЕТ СДЕЛАТЬ РАЗНЫЕ ОБЪЯВЛЕНИЯ.
                      </span>
                    </div>

                    <div className="auth-action-column" style={{ marginTop: '15px' }}>
                      <button type="button" className="btn-primary btn-full-width" onClick={() => setCreateStep(2)}>
                        ПРОДОЛЖИТЬ
                      </button>
                    </div>
                  </div>
                )}

                {/* Шаг 2*/}
                {createStep === 2 && (
                  <div className="modal-body">
                   
                    <div className="input-group">
                      <label>=</label>
                      <CustomSelect 
                        options={[
                          { value: 'male', label: 'МАЛЬЧИК / САМЕЦ' },
                          { value: 'female', label: 'ДЕВОЧКА / САМКА' }
                        ]}
                        value={""} 
                        onChange={() => {}} 
                        placeholder="ВЫБЕРИТЕ ПОЛ"
                      />
                    </div>

                    <div className="input-group">
                      <label>=</label>
                      <CustomSelect 
                        options={[
                          { value: 'baby', label: 'ДО 3 МЕСЯЦЕВ' },
                          { value: 'young', label: 'ОТ 3 ДО 12 МЕСЯЦЕВ' },
                          { value: 'adult', label: 'СТАРШЕ 1 ГОДА' }
                        ]}
                        value={""} 
                        onChange={() => {}} 
                        placeholder="ВЫБЕРИТЕ ВОЗРАСТ"
                      />
                    </div>

                    <div className="input-group">
                      <label>=</label>
                      <input 
                        type="text" 
                        placeholder="ВЫБЕРИТЕ ОКРАС / ДОП. ПАРАМЕТРЫ" 
                      />
                      <span style={{ fontSize: '12px', color: 'var(--label)', marginLeft: '10px', marginTop: '-4px' }}>
                        *ЕСЛИ У ЖИВОТНОГО НЕТ ИМЕНИ, ТО ОСТАВЬТЕ ПОЛЕ ПУСТЫМ.
                      </span>
                    </div>

                    <div className="auth-action-column" style={{ marginTop: '30px', gap: '12px' }}>
                      <button type="button" className="btn-primary btn-full-width" onClick={() => {
                        alert('Объявление успешно создано (демо)!');
                        setDashboardTab('tape');
                        setCreateStep(1);
                      }}>
                        ПРОДОЛЖИТЬ
                      </button>
                      <button type="button" className="tab-button-link" onClick={() => setCreateStep(1)}>
                        НАЗАД
                      </button>
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
                    <img src="https://unsplash.com" alt="Avatar" className="profile-page-avatar" />
                    <span className="avatar-status-dot">★</span>
                  </div>
                </div>
                
                <h3 className="profile-user-name">{firstName} {lastName}</h3>
                <p className="profile-user-city">ГОРОД {userCity.toUpperCase()}</p>
                <span className="role-badge">{userType === 'fiz' ? 'ФИЗ. ЛИЦО' : userType === 'ip' ? 'ИП' : 'ЮР. ЛИЦО'}</span>

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
                              <div className="mini-card-img" style={{ backgroundImage: `url(${pet.image || pet.imageUrl})` }}></div>
                              <div className="mini-card-info">
                                <h3>{pet.name.toUpperCase()}</h3>
                                <p>{pet.breed.toUpperCase()}</p>
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
                              <li>• ПОЛНОЕ ОТКЛЮЧЕНИЕ РЕКЛАМЫ</li>
                              <li>• ДОСТУП К ТАРИФУ НА 30 ДНЕЙ</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {profileTab === 'privacy' && (
                      <div className="profile-info-block">
                        <p><strong>ЗАЩИТА ДАННЫХ:</strong> ВСЕ ВАШИ ДИАЛОГИ И НОМЕРА НАДЕЖНО ШИФРУЮТСЯ.</p>
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
                        <p>ДАННЫЕ ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ: {firstName} {lastName}</p>
                        <p>ГОРОД: {userCity.toUpperCase()}</p>
                        
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