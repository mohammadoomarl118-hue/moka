import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { getProducts } from './services/products'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth/Auth'
import HeroCup from './components/Hero/HeroCup'
import Admin from './pages/Admin/Admin'
import AdminLogin from './pages/Admin/AdminLogin'
import AdminMFA from './pages/Admin/AdminMFA'
import ProductGrid from './components/ProductGrid'

import './App.css'


/* =========================================================
   THEME
========================================================= */

const ThemeContext = createContext(null)

function useTheme() {
  return useContext(ThemeContext)
}


/* =========================================================
   UUID HELPERS
========================================================= */

function isValidUUID(value) {
  if (typeof value !== 'string') {
    return false
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}


function cleanCart(items) {
  if (!Array.isArray(items)) {
    return []
  }

  return items.filter((item) => {
    if (!item) {
      return false
    }

    if (!isValidUUID(item.id)) {
      return false
    }

    if (Number(item.price) < 0) {
      return false
    }

    if (Number(item.quantity) <= 0) {
      return false
    }

    return true
  })
}


/* =========================================================
   COFFEE MINI GAME
========================================================= */

function CupMemoryGame() {
  const coffeeTypes = [
    {
      type: 'espresso',
      name: 'إسبريسو',
      icon: '☕',
      description: 'قهوة مركزة بطعم قوي',
    },
    {
      type: 'cappuccino',
      name: 'كابتشينو',
      icon: '☕',
      description: 'إسبريسو مع الحليب والرغوة',
    },
    {
      type: 'latte',
      name: 'لاتيه',
      icon: '☕',
      description: 'إسبريسو مع كمية أكبر من الحليب',
    },
    {
      type: 'mocha',
      name: 'موكا',
      icon: '☕',
      description: 'قهوة مع الشوكولاتة والحليب',
    },
  ]

  const createCards = () => {
    const duplicated = coffeeTypes.flatMap((coffee) => [
      {
        ...coffee,
        id: `${coffee.type}-1`,
      },
      {
        ...coffee,
        id: `${coffee.type}-2`,
      },
    ])

    for (let i = duplicated.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))

      ;[duplicated[i], duplicated[j]] = [
        duplicated[j],
        duplicated[i],
      ]
    }

    return duplicated
  }

  const [cards, setCards] = useState(createCards)
  const [flipped, setFlipped] = useState([])
  const [matched, setMatched] = useState([])
  const [moves, setMoves] = useState(0)
  const [locked, setLocked] = useState(false)

  const restartGame = () => {
    setCards(createCards())
    setFlipped([])
    setMatched([])
    setMoves(0)
    setLocked(false)
  }

  const handleCardClick = (index) => {
    if (
      locked ||
      flipped.includes(index) ||
      matched.includes(index) ||
      flipped.length === 2
    ) {
      return
    }

    const newFlipped = [...flipped, index]

    setFlipped(newFlipped)

    if (newFlipped.length === 2) {
      setMoves((prev) => prev + 1)
      setLocked(true)

      const firstCard = cards[newFlipped[0]]
      const secondCard = cards[newFlipped[1]]

      if (firstCard.type === secondCard.type) {
        setTimeout(() => {
          setMatched((prev) => [
            ...prev,
            newFlipped[0],
            newFlipped[1],
          ])

          setFlipped([])
          setLocked(false)
        }, 450)
      } else {
        setTimeout(() => {
          setFlipped([])
          setLocked(false)
        }, 850)
      }
    }
  }

  const gameFinished =
    matched.length === cards.length

  return (
    <section
      className="cup-memory-section"
      id="game"
    >
      <div className="cup-memory-container">

        <div className="cup-memory-header">
          <div>
            <span className="cup-memory-eyebrow">
              MOKA MINI GAME
            </span>

            <h2>اختبر ذاكرتك بالقهوة</h2>

            <p>
              طابق أكواب القهوة وتعرّف على أنواعها المختلفة
            </p>
          </div>

          <div className="cup-memory-stats">
            <div className="cup-memory-stat">
              <span>المحاولات</span>
              <strong>{moves}</strong>
            </div>

            <div className="cup-memory-stat">
              <span>المطابقة</span>

              <strong>
                {matched.length / 2}/{coffeeTypes.length}
              </strong>
            </div>
          </div>
        </div>

        {gameFinished && (
          <div className="cup-memory-success">
            <div className="cup-memory-success-icon">
              ☕
            </div>

            <div>
              <h3>أحسنت! 🎉</h3>

              <p>
                أكملت اللعبة خلال {moves} محاولات
              </p>
            </div>

            <button
              type="button"
              onClick={restartGame}
              className="cup-memory-restart"
            >
              العب مرة أخرى
            </button>
          </div>
        )}

        <div className="cup-memory-grid">
          {cards.map((card, index) => {
            const isFlipped =
              flipped.includes(index)

            const isMatched =
              matched.includes(index)

            return (
              <button
                type="button"
                key={card.id}
                className={`cup-memory-card ${
                  isFlipped ? 'flipped' : ''
                } ${
                  isMatched ? 'matched' : ''
                }`}
                onClick={() =>
                  handleCardClick(index)
                }
                aria-label={
                  isFlipped || isMatched
                    ? card.name
                    : 'كوب قهوة مخفي'
                }
              >
                <span className="cup-memory-card-inner">

                  <span className="cup-memory-face cup-memory-back">
                    <span className="cup-memory-logo">
                      M
                    </span>

                    <span className="cup-memory-back-name">
                      MOKA
                    </span>
                  </span>

                  <span className="cup-memory-face cup-memory-front">
                    <span className="cup-memory-icon">
                      {card.icon}
                    </span>

                    <strong>
                      {card.name}
                    </strong>

                    {isMatched && (
                      <small>
                        {card.description}
                      </small>
                    )}
                  </span>

                </span>
              </button>
            )
          })}
        </div>

        {!gameFinished && (
          <button
            type="button"
            onClick={restartGame}
            className="cup-memory-reset"
          >
            إعادة اللعبة
          </button>
        )}

        <div className="cup-memory-learning">
          <div className="cup-memory-learning-title">
            <span>☕</span>

            <div>
              <h3>تعرّف على القهوة</h3>

              <p>
                أنواع القهوة الموجودة في اللعبة
              </p>
            </div>
          </div>

          <div className="cup-memory-learning-grid">
            {coffeeTypes.map((coffee) => (
              <div
                className="cup-memory-learning-card"
                key={coffee.type}
              >
                <span>{coffee.icon}</span>

                <div>
                  <strong>
                    {coffee.name}
                  </strong>

                  <p>
                    {coffee.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}


/* =========================================================
   ADMIN PROTECTION
========================================================= */

function ProtectedAdminRoute() {
  const location = useLocation()
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let mounted = true

    async function checkAdminAccess() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user) {
          if (mounted) {
            setStatus('unauthenticated')
          }

          return
        }

        const {
          data: isAdmin,
          error: adminError,
        } = await supabase.rpc('is_admin')

        if (adminError) {
          console.error(
            'Admin check error:',
            adminError
          )

          if (mounted) {
            setStatus('unauthorized')
          }

          return
        }

        if (!isAdmin) {
          await supabase.auth.signOut()

          if (mounted) {
            setStatus('unauthorized')
          }

          return
        }

        const {
          data: assurance,
          error: mfaError,
        } =
          await supabase.auth.mfa
            .getAuthenticatorAssuranceLevel()

        if (mfaError) {
          console.error(
            'MFA check error:',
            mfaError
          )

          if (mounted) {
            setStatus('mfa-required')
          }

          return
        }

        if (
          assurance.currentLevel !== 'aal2'
        ) {
          if (mounted) {
            setStatus('mfa-required')
          }

          return
        }

        if (
          location.state?.mfaVerified !== true
        ) {
          if (mounted) {
            setStatus('mfa-required')
          }

          return
        }

        if (mounted) {
          setStatus('authorized')
        }
      } catch (error) {
        console.error(
          'Admin protection error:',
          error
        )

        if (mounted) {
          setStatus('unauthorized')
        }
      }
    }

    checkAdminAccess()

    return () => {
      mounted = false
    }
  }, [location.state])

  if (status === 'checking') {
    return (
      <main className="admin-page">
        <div className="admin-container">
          <div className="admin-empty">
            جاري التحقق من صلاحيات الدخول...
          </div>
        </div>
      </main>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <Navigate
        to="/admin/login"
        replace
      />
    )
  }

  if (status === 'unauthorized') {
    return (
      <Navigate
        to="/admin/login"
        replace
      />
    )
  }

  if (status === 'mfa-required') {
    return (
      <Navigate
        to="/admin/mfa"
        replace
        state={{
          from: '/admin',
        }}
      />
    )
  }

  return <Admin />
}


/* =========================================================
   CHECKOUT
========================================================= */

function Checkout() {
  const navigate = useNavigate()
  const location = useLocation()

  const [cart, setCart] = useState(() => {
    const stateCart = location.state?.cart

    if (
      Array.isArray(stateCart) &&
      stateCart.length > 0
    ) {
      return cleanCart(stateCart)
    }

    try {
      const savedCart =
        localStorage.getItem('mokaCart')

      if (!savedCart) {
        return []
      }

      const parsedCart = JSON.parse(savedCart)

      return cleanCart(parsedCart)
    } catch {
      return []
    }
  })

  const [customerName, setCustomerName] =
    useState('')

  const [customerPhone, setCustomerPhone] =
    useState('')

  const [customerAddress, setCustomerAddress] =
    useState('')

  const [latitude, setLatitude] =
    useState(null)

  const [longitude, setLongitude] =
    useState(null)

  const [locationLoading, setLocationLoading] =
    useState(false)

  const [locationMessage, setLocationMessage] =
    useState('')

  const [notes, setNotes] =
    useState('')

  const [paymentMethod, setPaymentMethod] =
    useState('cash')

  const [loading, setLoading] =
    useState(false)

  const submitLockRef = useRef(false)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState(false)

  const cartTotal = cart.reduce(
    (total, item) =>
      total +
      Number(item.price) *
        Number(item.quantity),
    0
  )

  const cartCount = cart.reduce(
    (total, item) =>
      total +
      Number(item.quantity),
    0
  )


  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem(
        'mokaCart',
        JSON.stringify(cart)
      )
    }
  }, [cart])


  function detectLocation() {
    setError('')
    setLocationMessage('')

    if (!navigator.geolocation) {
      setLocationMessage(
        'المتصفح لا يدعم تحديد الموقع'
      )

      return
    }

    setLocationLoading(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const {
          latitude,
          longitude,
        } = position.coords

        setLatitude(latitude)
        setLongitude(longitude)

        setLocationMessage(
          'تم تحديد موقعك بنجاح'
        )

        setLocationLoading(false)
      },

      (locationError) => {
        console.error(
          'Location error:',
          locationError
        )

        if (
          locationError.code ===
          locationError.PERMISSION_DENIED
        ) {
          setLocationMessage(
            'لم يتم السماح بالوصول إلى موقعك، يمكنك كتابة العنوان يدويًا'
          )
        } else if (
          locationError.code ===
          locationError.POSITION_UNAVAILABLE
        ) {
          setLocationMessage(
            'تعذر تحديد موقعك حاليًا، اكتب العنوان يدويًا'
          )
        } else if (
          locationError.code ===
          locationError.TIMEOUT
        ) {
          setLocationMessage(
            'انتهى وقت تحديد موقعك، حاول مرة أخرى أو اكتب العنوان يدويًا'
          )
        } else {
          setLocationMessage(
            'تعذر تحديد موقعك، يمكنك كتابة العنوان يدويًا'
          )
        }

        setLocationLoading(false)
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    )
  }


  if (cart.length === 0 && !success) {
    return (
      <main className="checkout-page">
        <div className="container checkout-container">

          <div className="checkout-empty">

            <span className="section-kicker">
              CHECKOUT
            </span>

            <h1>
              السلة فارغة
            </h1>

            <p>
              أضف منتجات من القائمة أولًا
            </p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                navigate('/#menu')
              }
            >
              العودة للقائمة
            </button>

          </div>

        </div>
      </main>
    )
  }


  /* =======================================================
     CREATE ORDER
  ======================================================= */

  async function submitOrder(event) {
  event.preventDefault()

  if (submitLockRef.current || loading) {
    return
  }

  setError('')

  if (!customerName.trim()) {
    setError('يرجى كتابة الاسم')
    return
  }

  if (!customerPhone.trim()) {
    setError('يرجى كتابة رقم الهاتف')
    return
  }

  if (!customerAddress.trim()) {
    setError('يرجى كتابة العنوان')
    return
  }

  if (cart.length === 0) {
    setError('السلة فارغة')
    return
  }

  const cleanedItems = cart
    .map((item) => {
      const productId =
        String(item?.id || '').trim()

      const quantity =
        Number(item?.quantity)

      if (
        !isValidUUID(productId) ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return null
      }

      return {
        product_id: productId,
        quantity,
      }
    })
    .filter(Boolean)

  if (
    cleanedItems.length === 0 ||
    cleanedItems.length !== cart.length
  ) {
    localStorage.removeItem('mokaCart')

    setCart([])

    setError(
      'يوجد منتج قديم أو غير صالح في السلة، تم تنظيف السلة. أضف المنتجات من جديد'
    )

    return
  }

  submitLockRef.current = true
  setLoading(true)

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const {
      data: orderId,
      error: orderError,
    } = await supabase.rpc(
      'create_order_with_items',
      {
        p_customer_name:
          customerName.trim(),

        p_customer_phone:
          customerPhone.trim(),

        p_customer_address:
          customerAddress.trim(),

        p_latitude:
          latitude ?? null,

        p_longitude:
          longitude ?? null,

        p_location_address:
          customerAddress.trim(),

        p_payment_method:
          paymentMethod,

        p_notes:
          notes.trim() || null,

        p_user_id:
          user?.id || null,

        p_items:
          cleanedItems,
      }
    )

    if (orderError) {
      throw orderError
    }

    if (
      !orderId ||
      !isValidUUID(orderId)
    ) {
      throw new Error(
        'لم يتم إنشاء رقم طلب صالح'
      )
    }

    localStorage.removeItem('mokaCart')

    setCart([])

    setSuccess(true)

  } catch (err) {
    console.error(
      'Create order error:',
      err
    )

    setError(
      err?.message ||
      'حدث خطأ أثناء إرسال الطلب'
    )

  } finally {
    setLoading(false)

    setTimeout(() => {
      submitLockRef.current = false
    }, 500)
  }
}


  if (success) {
    return (
      <main className="checkout-page">
        <div className="container checkout-container">

          <div className="checkout-success">

            <div className="checkout-success-icon">
              ✓
            </div>

            <div className="checkout-success-content">

              <span className="section-kicker">
                ORDER CONFIRMED
              </span>

              <h1>
                تم استلام طلبك
              </h1>

              <p>
                شكرًا لك، تم إرسال الطلب إلى MOKA بنجاح
              </p>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  navigate('/')
                }
              >
                العودة للرئيسية
              </button>

            </div>

          </div>

        </div>
      </main>
    )
  }


  return (
    <main className="checkout-page">

      <div className="container checkout-container">

        <div className="checkout-header">

          <button
            type="button"
            className="checkout-back"
            onClick={() =>
              navigate('/')
            }
          >
            ←
          </button>

          <span className="section-kicker">
            CHECKOUT
          </span>

          <h1>
            إتمام الطلب
          </h1>

          <p>
            أدخل بياناتك لإرسال طلبك إلى MOKA
          </p>

        </div>


        <div className="checkout-grid">

          <form
            className="checkout-form"
            onSubmit={submitOrder}
          >

            <div className="checkout-card">

              <h2>
                بيانات العميل
              </h2>

              <div className="checkout-field">

                <label htmlFor="customer-name">
                  الاسم
                </label>

                <input
                  id="customer-name"
                  type="text"
                  value={customerName}
                  onChange={(event) =>
                    setCustomerName(
                      event.target.value
                    )
                  }
                  placeholder="اكتب اسمك"
                  autoComplete="name"
                />

              </div>


              <div className="checkout-field">

                <label htmlFor="customer-phone">
                  رقم الهاتف
                </label>

                <input
                  id="customer-phone"
                  type="tel"
                  value={customerPhone}
                  onChange={(event) =>
                    setCustomerPhone(
                      event.target.value
                    )
                  }
                  placeholder="05xxxxxxxx"
                  autoComplete="tel"
                />

              </div>


              <div className="checkout-field">

                <label htmlFor="customer-address">
                  عنوان التوصيل
                </label>

                <textarea
                  id="customer-address"
                  value={customerAddress}
                  onChange={(event) =>
                    setCustomerAddress(
                      event.target.value
                    )
                  }
                  placeholder="اكتب عنوان التوصيل"
                  rows="3"
                  autoComplete="street-address"
                />

                <button
                  type="button"
                  className="checkout-location-button"
                  onClick={detectLocation}
                  disabled={locationLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    gap: '5px',
                    padding: '5px 9px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    width: 'fit-content',
                    background: '#c89b5b',
                  }}
                >

                  <img
                    src="/assets/gps.png"
                    alt=""
                    aria-hidden="true"
                  />

                  <span>
                    {locationLoading
                      ? 'جاري تحديد موقعك...'
                      : 'تحديد موقعي'}
                  </span>

                </button>


                {locationMessage && (
                  <div
                    className={`checkout-location-message ${
                      latitude !== null &&
                      longitude !== null
                        ? 'success'
                        : ''
                    }`}
                  >
                    {locationMessage}
                  </div>
                )}

              </div>


              <div className="checkout-field">

                <label htmlFor="order-notes">
                  ملاحظات
                </label>

                <textarea
                  id="order-notes"
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target.value
                    )
                  }
                  placeholder="أي ملاحظات إضافية"
                  rows="3"
                />

              </div>

            </div>


            <div className="checkout-card">

              <h2>
                طريقة الدفع
              </h2>


              <label
                className={`payment-option ${
                  paymentMethod === 'cash'
                    ? 'active'
                    : ''
                }`}
              >

                <input
                  type="radio"
                  name="payment"
                  value="cash"
                  checked={
                    paymentMethod === 'cash'
                  }
                  onChange={() =>
                    setPaymentMethod(
                      'cash'
                    )
                  }
                />

                <span>

                  <strong>
                    الدفع عند الاستلام
                  </strong>

                  <strong>    </strong>

                  <small>
                    ادفع عند استلام طلبك
                  </small>

                </span>

              </label>


              <label
                className={`payment-option ${
                  paymentMethod === 'card'
                    ? 'active'
                    : ''
                }`}
              >

                <input
                  type="radio"
                  name="payment"
                  value="card"
                  checked={
                    paymentMethod === 'card'
                  }
                  onChange={() =>
                    setPaymentMethod(
                      'card'
                    )
                  }
                />

                <span>

                  <strong>
                    Visa / بطاقة
                  </strong>

                  <strong>    </strong>

                  <small>
                    سيتم ربط بوابة الدفع الإلكتروني لاحقًا
                  </small>

                </span>

              </label>

            </div>


            {error && (
              <div className="checkout-error">
                {error}
              </div>
            )}


            <button
              type="submit"
              className="btn btn-primary checkout-submit"
              disabled={loading}
            >
              {loading
                ? 'جاري إرسال الطلب...'
                : 'تأكيد الطلب'}
            </button>

          </form>


          <aside className="checkout-summary">

            <div className="checkout-card">

              <h2>
                ملخص الطلب
              </h2>

              <div className="checkout-items">

                {cart.map((item) => (

                  <div
                    className="checkout-item"
                    key={item.id}
                  >

                    <div>

                      <strong>
                        {item.name}
                      </strong>

                      <strong>            </strong>

                      <span>
                        الكمية: {item.quantity}
                      </span>

                    </div>

                    <strong>
                      {(
                        Number(item.price) *
                        Number(item.quantity)
                      ).toFixed(0)}{' '}
                      ₪
                    </strong>

                  </div>

                ))}

              </div>


              <div className="checkout-total">

                <span>
                  {cartCount} منتج
                </span>

                <strong>
                  {cartTotal.toFixed(0)} ₪
                </strong>

              </div>

            </div>

          </aside>

        </div>

      </div>

    </main>
  )
}


/* =========================================================
   PUBLIC HOME
========================================================= */

function Home() {
  const { theme, toggleTheme } = useTheme()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')


  /* =======================================================
     CART
  ======================================================= */

  const [cart, setCart] = useState(() => {
    try {
      const savedCart =
        localStorage.getItem('mokaCart')

      if (!savedCart) {
        return []
      }

      const parsedCart =
        JSON.parse(savedCart)

      return cleanCart(parsedCart)

    } catch {
      return []
    }
  })


  const [cartOpen, setCartOpen] =
    useState(false)


  /* =======================================================
     SOUNDS
  ======================================================= */

  const addSound = useRef(null)
  const openSound = useRef(null)
  const removeSound = useRef(null)


  useEffect(() => {
    addSound.current = new Audio(
      '/sounds/add.mp3'
    )

    openSound.current = new Audio(
      '/sounds/open.mp3'
    )

    removeSound.current = new Audio(
      '/sounds/remove.mp3'
    )

    addSound.current.volume = 0.45
    openSound.current.volume = 0.35
    removeSound.current.volume = 0.35

    addSound.current.preload = 'auto'
    openSound.current.preload = 'auto'
    removeSound.current.preload = 'auto'
  }, [])


  function playSound(soundRef) {
    if (!soundRef.current) {
      return
    }

    soundRef.current.currentTime = 0

    soundRef.current
      .play()
      .catch(() => {})
  }


  /* =======================================================
     LOAD PRODUCTS
  ======================================================= */

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await getProducts()

        setProducts(data)

      } catch (err) {

        console.error(err)

        setError(
          err.message ||
          'حدث خطأ أثناء تحميل المنتجات'
        )

      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [])


  /* =======================================================
     SAVE CART
  ======================================================= */

  useEffect(() => {
    localStorage.setItem(
      'mokaCart',
      JSON.stringify(cart)
    )
  }, [cart])


  /* =======================================================
     ADD TO CART
  ======================================================= */

  function addToCart(product) {
    if (!isValidUUID(product?.id)) {
      console.error(
        'Invalid product UUID:',
        product?.id
      )

      setToast(
        'تعذر إضافة هذا المنتج'
      )

      setTimeout(() => {
        setToast('')
      }, 2500)

      return
    }


    setCart((currentCart) => {

      const existingProduct =
        currentCart.find(
          (item) => item.id === product.id
        )


      if (existingProduct) {

        return currentCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity:
                  Number(item.quantity) + 1,
              }
            : item
        )

      }


      return [
        ...currentCart,

        {
          ...product,
          quantity: 1,
        },
      ]

    })


    playSound(addSound)

    setToast(
      'تمت إضافة المنتج للسلة'
    )

    setTimeout(() => {
      setToast('')
    }, 2500)
  }


  /* =======================================================
     OPEN CART
  ======================================================= */

  function openCart() {
    setCartOpen(true)

    playSound(openSound)
  }


  /* =======================================================
     CLOSE CART
  ======================================================= */

  function closeCart() {
    setCartOpen(false)
  }


  /* =======================================================
     REMOVE FROM CART
  ======================================================= */

  function removeFromCart(productId) {

    setCart((currentCart) =>
      currentCart.filter(
        (item) => item.id !== productId
      )
    )

    playSound(removeSound)
  }


  /* =======================================================
     CHANGE QUANTITY
  ======================================================= */

  function changeQuantity(
    productId,
    amount
  ) {

    setCart((currentCart) =>
      currentCart
        .map((item) => {

          if (item.id !== productId) {
            return item
          }

          return {
            ...item,

            quantity:
              Number(item.quantity) +
              amount,
          }

        })
        .filter(
          (item) =>
            Number(item.quantity) > 0
        )
    )


    if (amount < 0) {
      playSound(removeSound)
    }
  }


  /* =======================================================
     CART TOTALS
  ======================================================= */

  const cartCount = cart.reduce(
    (total, item) =>
      total +
      Number(item.quantity),
    0
  )


  const cartTotal = cart.reduce(
    (total, item) =>
      total +
      Number(item.price) *
        Number(item.quantity),
    0
  )


  const navigate =
    useNavigate()


  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="moka-app">

      {toast && (
        <div className="moka-toast">

          <span className="moka-toast-icon">
            ✓
          </span>

          <span>
            {toast}
          </span>

        </div>
      )}


      {/* ===================================================
          NAVBAR
      =================================================== */}

      <header className="navbar">

        <div className="container navbar-inner">

          <a
            href="#home"
            className="logo"
          >

            <span className="logo-mark">
              M
            </span>

            <span className="logo-text">

              <strong>
                MOKA
              </strong>

              <small>
                Coffee & More
              </small>

            </span>

          </a>


          <nav className="nav-links">

            <a href="#home">
              الرئيسية
            </a>

            <a href="#menu">
              القائمة
            </a>

            <a href="#about">
              عن موكا
            </a>

            <a href="#contact">
              تواصل معنا
            </a>

          </nav>


          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={
              theme === 'dark'
                ? 'تفعيل الوضع الفاتح'
                : 'تفعيل الوضع الداكن'
            }
          >
            <span className="theme-toggle-icon">
              {theme === 'dark'
                ? '☀'
                : '☾'}
            </span>
          </button>


          <button
            className="cart-button"
            type="button"
            onClick={openCart}
          >

            <span>
              السلة
            </span>

            <span className="cart-count">
              {cartCount}
            </span>

          </button>

        </div>

      </header>


      {/* ===================================================
          CART
      =================================================== */}

      {cartOpen && (
        <div
          className="cart-overlay"
          onClick={closeCart}
        >

          <aside
            className="cart-panel"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="cart-panel-header">

              <div>

                <span className="section-kicker">
                  YOUR ORDER
                </span>

                <h2>
                  سلة الطلب
                </h2>

              </div>


              <button
                type="button"
                className="cart-close"
                onClick={closeCart}
              >
                ×
              </button>

            </div>


            {cart.length === 0 ? (

              <div className="cart-empty">

                <div className="cart-empty-icon">
                  🛒
                </div>

                <h3>
                  السلة فارغة
                </h3>

                <p>
                  أضف شيئًا لذيذًا من القائمة
                </p>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {

                    closeCart()

                    document
                      .getElementById('menu')
                      ?.scrollIntoView({
                        behavior: 'smooth',
                      })

                  }}
                >
                  اكتشف القائمة
                </button>

              </div>

            ) : (

              <>

                <div className="cart-items">

                  {cart.map((item) => (

                    <div
                      className="cart-item"
                      key={item.id}
                    >

                      <div className="cart-item-image">

                        {item.image_url ? (

                          <img
                            src={item.image_url}
                            alt={item.name}
                          />

                        ) : (

                          <span>
                            ☕
                          </span>

                        )}

                      </div>


                      <div className="cart-item-info">

                        <h3>
                          {item.name}
                        </h3>

                        <strong>
                          {Number(
                            item.price
                          ).toFixed(0)}{' '}
                          ₪
                        </strong>


                        <div
                          style={{
                            background:
                              'var(--surface)',

                            border:
                              '1px solid var(--border)',

                            borderRadius:
                              '9px',

                            padding:
                              '3px',
                          }}

                          className="cart-item-controls"
                        >

                          <button
                            type="button"
                            onClick={() =>
                              changeQuantity(
                                item.id,
                                -1
                              )
                            }
                          >
                            −
                          </button>

                          <span>
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              changeQuantity(
                                item.id,
                                1
                              )
                            }
                          >
                            +
                          </button>

                        </div>

                      </div>


                      <button
                        type="button"
                        className="cart-item-remove"
                        onClick={() =>
                          removeFromCart(
                            item.id
                          )
                        }
                      >
                        ×
                      </button>

                    </div>

                  ))}

                </div>


                <div className="cart-summary">

                  <div>

                    <span>
                      عدد المنتجات
                    </span>

                    <strong>
                      {cartCount}
                    </strong>

                  </div>


                  <div className="cart-total-row">

                    <span>
                      المجموع
                    </span>

                    <strong>
                      {cartTotal.toFixed(0)} ₪
                    </strong>

                  </div>


                  <button
                    type="button"
                    className="btn btn-primary cart-checkout-button"
                    onClick={() => {

                      closeCart()

                      navigate(
                        '/checkout',
                        {
                          state: {
                            cart,
                          },
                        }
                      )

                    }}
                  >
                    إتمام الطلب
                  </button>

                </div>

              </>

            )}

          </aside>

        </div>
      )}


      {/* ===================================================
          MAIN
      =================================================== */}

      <main>

        {/* =================================================
            HERO
        ================================================= */}

        <section
          className="hero"
          id="home"
        >

          <div className="hero-glow hero-glow-one" />

          <div className="hero-glow hero-glow-two" />


          <div className="container hero-inner">

            <div className="hero-content">

              <span className="hero-kicker">
                MOKA • COFFEE & MORE
              </span>

              <h1>
                قهوتك
                <br />
                <span>
                  بطريقتك
                </span>
              </h1>

              <p>
                تجربة قهوة مختلفة، تبدأ من أول رشفة
                <br />
                وتنتهي بذكريات تستحق التكرار
              </p>

              <div className="hero-actions">

                <a
                  href="#menu"
                  className="btn btn-primary"
                >
                  اكتشف القائمة
                </a>

                <a
                  href="#about"
                  className="btn btn-secondary"
                >
                  اكتشف موكا
                </a>

              </div>

            </div>


            <div
              className="hero-visual"
              aria-hidden="true"
            >

              <div className="hero-3d-glow" />

              <HeroCup />

              <div className="hero-floor-shadow" />

            </div>

          </div>


          <div className="hero-bottom">

            <span>
              SCROLL TO DISCOVER
            </span>

            <span className="scroll-line" />

          </div>

        </section>


        {/* =================================================
            MENU
        ================================================= */}

        <section
          className="menu-section section"
          id="menu"
        >

          <div className="container">

            <div className="section-header">

              <span className="section-kicker">
                OUR MENU
              </span>

              <h2 className="section-title">
                اختيارات صنعت
                <br />
                لأجلك
              </h2>

              <p className="section-description">
                مجموعة من مشروباتنا وحلوياتنا التي نحضرها بعناية كل يوم
              </p>

            </div>


            {loading && (
              <div className="products-state">
                جاري تحميل المنتجات...
              </div>
            )}


            {error && (
              <div className="products-state products-error">
                {error}
              </div>
            )}


            {!loading &&
              !error &&
              products.length > 0 && (

                <ProductGrid
                  products={products}
                  onAddToCart={addToCart}
                />

              )}

          </div>

        </section>


        {/* =================================================
            ABOUT
        ================================================= */}

        <section
          className="about-section section"
          id="about"
        >

          <div className="container about-grid">

            <div className="about-number">
              01
            </div>

            <div>

              <span className="section-kicker">
                ABOUT MOKA
              </span>

              <h2 className="section-title">
                القهوة ليست
                <br />
                مجرد مشروب
              </h2>

            </div>

            <p className="about-text">
              في MOKA نصنع تجربة كاملة حول القهوة، من اختيار الحبوب
              إلى اللحظة التي تصل فيها إلى يديك
            </p>

          </div>

        </section>


        {/* =================================================
            CONTACT
        ================================================= */}

        <section
          className="contact-section section"
          id="contact"
        >

          <div className="container contact-box">

            <span className="section-kicker">
              COME SAY HI
            </span>

            <h2 className="section-title">
              نلتقي على فنجان؟
            </h2>

            <p>
              قريبًا سنضيف الموقع، أوقات العمل وطرق التواصل
            </p>

          </div>

        </section>


        {/* =================================================
            COFFEE MINI GAME
        ================================================= */}

        <CupMemoryGame />

      </main>


      {/* ===================================================
          FOOTER
      =================================================== */}

      <footer className="footer">

        <div className="container footer-inner">

          <strong>
            MOKA
          </strong>

          <span>
            © 2026 MOKA — Coffee & More
          </span>

        </div>

      </footer>

    </div>
  )
}


/* =========================================================
   APP
========================================================= */

function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme =
      localStorage.getItem('moka-theme')

    return savedTheme === 'dark'
      ? 'dark'
      : 'light'
  })


  useEffect(() => {
    document.documentElement.classList.toggle(
      'dark',
      theme === 'dark'
    )

    localStorage.setItem(
      'moka-theme',
      theme
    )
  }, [theme])


  function toggleTheme() {
    setTheme((currentTheme) =>
      currentTheme === 'dark'
        ? 'light'
        : 'dark'
    )
  }


  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
      }}
    >
      <BrowserRouter>

        <Routes>

          <Route
            path="/"
            element={<Home />}
          />

          <Route
            path="/checkout"
            element={<Checkout />}
          />

          <Route
            path="/auth"
            element={<Auth />}
          />

          <Route
            path="/admin/login"
            element={<AdminLogin />}
          />

          <Route
            path="/admin/mfa"
            element={<AdminMFA />}
          />

          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute />
            }
          />

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>

      </BrowserRouter>
    </ThemeContext.Provider>
  )
}


export default App