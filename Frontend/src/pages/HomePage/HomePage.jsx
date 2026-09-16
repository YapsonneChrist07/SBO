import React, { useMemo, useState } from 'react'
import HeroVideo from '../../components/HeroVideo/HeroVideo'
import TrustBar from '../../components/TrustBar/TrustBar'
import FeaturedCategories from '../../components/FeaturedCategories/FeaturedCategories'
import DealsBanner from '../../components/DealsBanner/DealsBanner'
import Sidebar from '../../components/Sidebar/Sidebar'
import ProductGrid from '../../components/ProductGrid/ProductGrid'
import Testimonials from '../../components/Testimonials/Testimonials'
import useProducts from '../../hooks/useProducts'
import { categories } from '../../data/mockData'
import './HomePage.css'

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [sort, setSort] = useState('newest')

  const productLineIDs = useMemo(() => {
    const cat = categories.find((c) => c.id === activeCategory)
    return cat ? cat.productLineIDs : []
  }, [activeCategory])

  const { products, total, loading, error, hasMore, loadMore } = useProducts({
    productLineIDs,
    sort,
  })

  const handleCategorySelect = (id) => {
    setActiveCategory(id)
    document.getElementById('shop-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <main className="home">
      <HeroVideo />
      <TrustBar />
      <FeaturedCategories onSelectCategory={handleCategorySelect} />
      <DealsBanner />

      <section className="home__shop" id="shop-section">
        <div className="home__shop-inner">
          <Sidebar activeCategory={activeCategory} onSelect={handleCategorySelect} />
          <ProductGrid
            products={products}
            total={total}
            loading={loading}
            error={error}
            activeCategory={activeCategory}
            sort={sort}
            onSortChange={setSort}
            hasMore={hasMore}
            onLoadMore={loadMore}
          />
        </div>
      </section>

      <Testimonials />
    </main>
  )
}
