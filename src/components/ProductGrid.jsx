import ProductCard from './ProductCard/ProductCard'
import './ProductGrid.css'

export default function ProductGrid({ products, onAddToCart }) {
  if (!products?.length) {
    return null
  }

  return (
    <div className="products-grid">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  )
}