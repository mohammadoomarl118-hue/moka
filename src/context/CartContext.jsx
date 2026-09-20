import {
  useEffect,
  useState,
} from 'react'

import { CartContext } from './cart-context'

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved =
        localStorage.getItem('moka-cart')

      return saved
        ? JSON.parse(saved)
        : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(
      'moka-cart',
      JSON.stringify(cart)
    )
  }, [cart])

  function addToCart(product) {
    setCart((current) => {
      const existing = current.find(
        (item) => item.id === product.id
      )

      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity:
                  item.quantity + 1,
              }
            : item
        )
      }

      return [
        ...current,
        {
          ...product,
          quantity: 1,
        },
      ]
    })
  }

  function removeFromCart(productId) {
    setCart((current) =>
      current.filter(
        (item) => item.id !== productId
      )
    )
  }

  function updateQuantity(
    productId,
    quantity
  ) {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCart((current) =>
      current.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity,
            }
          : item
      )
    )
  }

  function clearCart() {
    setCart([])
  }

  const cartCount = cart.reduce(
    (total, item) =>
      total + item.quantity,
    0
  )

  const cartTotal = cart.reduce(
    (total, item) =>
      total +
      Number(item.price) *
        item.quantity,
    0
  )

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}