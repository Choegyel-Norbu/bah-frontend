import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Hero from '@/components/home/Hero';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/product/ProductCard';
import { useAuth } from '@/context/AuthContext';
import { getProducts } from '@/services/productService';
import { getCategories, flattenCategoriesWithSlug } from '@/services/categoryService';

const FEATURED_SIZE = 8;
const TRENDING_SIZE = 8;
const NEW_ARRIVAL_SIZE = 8;

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [newArrivalProducts, setNewArrivalProducts] = useState([]);
  const [newArrivalLoading, setNewArrivalLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getProducts({ newArrivalsOnly: true, size: NEW_ARRIVAL_SIZE })
      .then((res) => setNewArrivalProducts(res.content ?? []))
      .catch(() => setNewArrivalProducts([]))
      .finally(() => setNewArrivalLoading(false));
  }, []);

  useEffect(() => {
    getProducts({ trending: true, size: TRENDING_SIZE })
      .then((res) => setTrendingProducts(res.content ?? []))
      .catch(() => setTrendingProducts([]))
      .finally(() => setTrendingLoading(false));
  }, []);

  useEffect(() => {
    getProducts({ featured: true, size: FEATURED_SIZE })
      .then((res) => setFeaturedProducts(res.content ?? []))
      .catch(() => setFeaturedProducts([]))
      .finally(() => setFeaturedLoading(false));
  }, []);

  useEffect(() => {
    getCategories()
      .then((tree) => {
        const flat = flattenCategoriesWithSlug(Array.isArray(tree) ? tree : []);
        setCategories(flat.filter((c) => c.slug && c.depth === 0).slice(0, 4)); // Limit to 4 top-level
      })
      .catch(() => setCategories([]));
  }, []);

  // Reusable Section Component — horizontal scroll with consistent spacing and side margins
  const ProductSection = ({ title, subtitle, products, loading, linkTo }) => (
    <section className="py-6 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-1 sm:mb-7 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <h2 className="font-brand text-xl font-medium tracking-tight text-primary sm:text-2xl lg:text-3xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-sm text-secondary/80 sm:mt-1.5 sm:text-base">{subtitle}</p>
            )}
          </motion.div>
          {linkTo && (
            <Link
              to={linkTo}
              className="group mt-1 inline-flex min-h-9 items-center gap-1.5 self-end text-xs font-semibold uppercase tracking-wider text-primary transition-colors hover:text-secondary sm:mt-0 sm:text-sm"
            >
              View All
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 sm:h-4 sm:w-4" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center rounded-2xl bg-gray-50/80 sm:h-52">
            <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
          </div>
        ) : products.length === 0 ? (
          <p className="rounded-2xl bg-gray-50/80 py-10 text-center text-sm text-secondary sm:py-14">
            No products found.
          </p>
        ) : (
          <div
            className="flex overflow-x-auto overflow-y-hidden scrollbar-hide snap-x snap-mandatory gap-5 pb-3 pt-2 -mx-4 sm:mx-0 sm:gap-7 sm:pb-4 sm:pt-1"
            style={{ scrollPaddingLeft: '1.25rem', scrollPaddingRight: '1.25rem' }}
          >
            <div className="shrink-0 w-5 sm:w-0" aria-hidden />
            {products.map((product) => (
              <div
                key={product.id}
                className="flex shrink-0 snap-start w-[190px] sm:w-[210px] lg:w-[240px]"
              >
                <ProductCard product={product} />
              </div>
            ))}
            <div className="shrink-0 w-5 sm:w-0" aria-hidden />
          </div>
        )}
      </div>
    </section>
  );

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <Hero />

      {/* Shop by Category */}
      <section className="bg-[#F9F9F9] py-14 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col items-center gap-3 text-center sm:mb-16">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary/70">
              Curated For Every Wardrobe
            </p>
            <h2 className="font-brand text-2xl font-medium text-primary sm:text-3xl lg:text-4xl">
              Shop by Category
            </h2>
            <p className="max-w-xl text-sm text-secondary/70 sm:mt-1 sm:text-base">
              Discover pieces tailored for him, her, little ones, and the finishing touches that make every look feel complete.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {categories.map((category, index) => {
              const key = `${(category?.slug || category?.name || '').toLowerCase()}`;

              const imageUrl = key.includes('women')
                ? 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80'
                : key.includes('men')
                ? 'https://t4.ftcdn.net/jpg/01/35/02/49/360_F_135024994_csmSPpJ72LJVfbn27KPqCIi0DIUy5hxY.jpg'
                : key.includes('kid')
                ? 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=1200&q=80'
                : key.includes('accessor')
                ? 'https://www.shutterstock.com/image-photo/set-stylish-clothes-shoes-accessories-260nw-2715490281.jpg'
                : index === 0
                ? 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80'
                : index === 1
                ? 'https://images.unsplash.com/photo-1528701800489-20be3c30c1d5?auto=format&fit=crop&w=1200&q=80'
                : index === 2
                ? 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80'
                : 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80';

              return (
                <Link
                  key={category.id}
                  to={`/products?category=${encodeURIComponent(category.slug)}`}
                  className="group relative overflow-hidden rounded-3xl border border-black/5 bg-white/60 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={category.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent opacity-80 mix-blend-multiply" />
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.3),transparent_55%)]" />
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 lg:p-6">
                    <span className="mb-2 inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/80 backdrop-blur">
                      Category
                    </span>
                    <h3 className="font-brand text-lg font-semibold text-white sm:text-xl lg:text-2xl">
                      {category.name}
                    </h3>
                    <div className="mt-2 flex items-center gap-2 text-xs font-medium text-white/90">
                      <span>Explore pieces</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Collection */}
      <ProductSection 
        title="Featured Collection" 
        subtitle="Curated picks for the season."
        products={featuredProducts} 
        loading={featuredLoading}
        linkTo="/products"
      />

      {/* New Arrivals */}
      <ProductSection 
        title="New Arrivals" 
        subtitle="Fresh styles just landed."
        products={newArrivalProducts} 
        loading={newArrivalLoading}
        linkTo="/products?newArrivalsOnly=true"
      />

      {/* Trending */}
      <ProductSection 
        title="Trending Now" 
        subtitle="What everyone is talking about."
        products={trendingProducts} 
        loading={trendingLoading}
        linkTo="/products?trending=true"
      />

      {/* Editorial / CTA Strip */}
      <section className="relative overflow-hidden bg-primary py-12 sm:py-16 lg:py-24">
        <div className="absolute inset-0 opacity-20">
           <img 
             src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop" 
             alt="" 
             className="h-full w-full object-cover grayscale"
           />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-brand text-xl font-medium text-white sm:text-2xl lg:text-3xl">
            Elevate Your Everyday
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-xs text-white/80 sm:mt-3 sm:text-sm">
            Join our community for exclusive access to new drops, sales, and style inspiration.
          </p>
          
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row">
            {isAuthenticated ? (
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-xs font-bold uppercase tracking-wider text-primary transition-colors hover:bg-gray-100"
              >
                Shop Full Collection
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-xs font-bold uppercase tracking-wider text-primary transition-colors hover:bg-gray-100"
                >
                  Create Account
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-white px-6 py-3 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/10"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
