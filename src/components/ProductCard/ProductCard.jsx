import { useCallback, useEffect, useRef } from 'react'
import './ProductCard.css'

class Spring {
  constructor(value, stiffness, damping) {
    this.x = value
    this.v = 0
    this.target = value
    this.k = stiffness
    this.d = damping
  }

  step(dt) {
    const acceleration =
      this.k * (this.target - this.x) -
      this.d * this.v

    this.v += acceleration * dt
    this.x += this.v * dt

    return this.x
  }
}

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value))

export default function ProductCard({
  product,
  onAddToCart,
}) {
  const cardRef = useRef(null)
  const shadowRef = useRef(null)
  const frameRef = useRef(null)

  const stateRef = useRef({
    sx: new Spring(0, 120, 10),
    sy: new Spring(0, 120, 10),

    px: 0.5,
    py: 0.5,

    hovering: false,
    time: 0,
    last: 0,
  })

  const renderCard = useCallback((rx, ry) => {
    const card = cardRef.current

    if (!card) return

    const state = stateRef.current

    card.style.transform =
      `rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg)`

    card.style.setProperty(
      '--holo-px',
      state.px.toFixed(4)
    )

    card.style.setProperty(
      '--holo-py',
      state.py.toFixed(4)
    )

    card.style.setProperty(
      '--holo-hue',
      (ry * 4 + (state.px - 0.5) * 40).toFixed(2)
    )

    const lean =
      (Math.abs(rx) + Math.abs(ry)) / 26

    card.style.setProperty(
      '--holo-glare-opacity',
      (0.22 + lean * 0.4).toFixed(3)
    )

    const shadow = shadowRef.current

    if (shadow) {
      shadow.style.transform =
        `translate3d(
          ${(-ry * 1.8).toFixed(2)}px,
          ${(rx * 1.2).toFixed(2)}px,
          0
        )
        scale(${(1 + lean * 0.08).toFixed(3)})`

      shadow.style.opacity =
        (0.75 + lean * 0.25).toFixed(3)
    }
  }, [])

  useEffect(() => {
    let animationFrame

    const animate = (now) => {
      const state = stateRef.current

      if (!state.last) {
        state.last = now
      }

      const dt = clamp(
        (now - state.last) / 1000,
        0,
        0.05
      )

      state.last = now
      state.time += dt

      if (!state.hovering) {
        state.sy.target =
          Math.sin(state.time * 0.5) * 1.5

        state.sx.target =
          Math.cos(state.time * 0.37) * 1

        const rate = Math.min(
          1,
          dt * 2
        )

        state.px +=
          (0.5 - state.px) * rate

        state.py +=
          (0.5 - state.py) * rate
      }

      const rx = state.sx.step(dt)
      const ry = state.sy.step(dt)

      renderCard(rx, ry)

      animationFrame =
        requestAnimationFrame(animate)
    }

    animationFrame =
      requestAnimationFrame(animate)

    frameRef.current =
      animationFrame

    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [renderCard])

  const handlePointerMove = (event) => {
    const card = cardRef.current

    if (!card) return

    const rect =
      card.getBoundingClientRect()

    if (
      rect.width === 0 ||
      rect.height === 0
    ) {
      return
    }

    const px = clamp(
      (event.clientX - rect.left) /
        rect.width,
      0,
      1
    )

    const py = clamp(
      (event.clientY - rect.top) /
        rect.height,
      0,
      1
    )

    const state = stateRef.current

    state.px = px
    state.py = py
    state.hovering = true

    /*
      نفس فكرة HoloCard:
      X المؤشر → دوران Y
      Y المؤشر → دوران X
    */

    state.sy.target =
      (px - 0.5) * 2 * 15

    state.sx.target =
      -(py - 0.5) * 2 * 11
  }

  const handlePointerLeave = () => {
    const state = stateRef.current

    state.hovering = false
  }

  const handleAdd = (event) => {
    event.stopPropagation()
    onAddToCart(product)
  }

  return (
    <div
      className="moka-product-card-holo-wrapper"
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      onPointerUp={(event) => {
        if (event.pointerType !== 'mouse') {
          handlePointerLeave()
        }
      }}
    >
      <div
        ref={shadowRef}
        className="moka-product-card-shadow"
        aria-hidden="true"
      />

      <article
        ref={cardRef}
        className="moka-product-card"
      >
        {/* Holo foil */}
        <div
          className="moka-product-holo-foil"
          aria-hidden="true"
        />

        {/* Glare */}
        <div
          className="moka-product-holo-glare"
          aria-hidden="true"
        />

        <div className="moka-product-card-content">
          <div className="moka-product-image">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                loading="lazy"
              />
            ) : (
              <div className="moka-product-image-placeholder">
                <span>☕</span>
              </div>
            )}

            <span className="moka-product-category">
              {product.category === 'hot'
                ? 'ساخن'
                : product.category === 'cold'
                  ? 'بارد'
                  : 'حلويات'}
            </span>
          </div>

          <div className="moka-product-info">
            <div className="moka-product-heading">
              <h3>{product.name}</h3>

              <span className="moka-product-price">
                {Number(product.price).toFixed(0)} ₪
              </span>
            </div>

            {product.description && (
              <p className="moka-product-description">
                {product.description}
              </p>
            )}

            <button
              type="button"
              className="moka-product-add-button"
              aria-label={`إضافة ${product.name} إلى السلة`}
              onClick={handleAdd}
            >
              <span>أضف للسلة</span>

              <span className="moka-product-add-icon">
                +
              </span>
            </button>
          </div>
        </div>
      </article>
    </div>
  )
}