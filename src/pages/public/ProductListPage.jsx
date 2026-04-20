import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/product/ProductCard';
import ProductGridSkeleton from '@/components/product/ProductGridSkeleton';
import { getProducts } from '@/services/productService';
import { getCategories, flattenCategoriesWithSlug } from '@/services/categoryService';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  X,
  SlidersHorizontal,
  ArrowDownWideNarrow,
} from 'lucide-react';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25];

const SORT_OPTIONS = [
  { value: '', label: 'Featured' },
  { value: 'basePrice,asc', label: 'Price: Low to High' },
  { value: 'basePrice,desc', label: 'Price: High to Low' },
  { value: 'name,asc', label: 'Name: A–Z' },
  { value: 'name,desc', label: 'Name: Z–A' },
];

function getFiltersFromSearchParams(searchParams) {
  return {
    search: searchParams.get('search') ?? '',
    category: searchParams.get('category') ?? '',
    sort: searchParams.get('sort') ?? '',
    minPrice: searchParams.get('minPrice') ?? '',
    maxPrice: searchParams.get('maxPrice') ?? '',
  };
}

function getPageSizeFromSearchParams(searchParams) {
  const raw = Number(searchParams.get('size'));
  return PAGE_SIZE_OPTIONS.includes(raw) ? raw : DEFAULT_PAGE_SIZE;
}

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(getPageSizeFromSearchParams(searchParams));
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [last, setLast] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const initialFromUrl = getFiltersFromSearchParams(searchParams);
  const [filters, setFilters] = useState(initialFromUrl);
  const [appliedFilters, setAppliedFilters] = useState(initialFromUrl);

  // Sync state with URL params
  useEffect(() => {
    const fromUrl = getFiltersFromSearchParams(searchParams);
    setFilters(fromUrl);
    setAppliedFilters(fromUrl);
    setPageSize(getPageSizeFromSearchParams(searchParams));
    setPage(0);
  }, [searchParams]);

  // Scroll to top on param change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [searchParams, page]);

  // Load categories
  useEffect(() => {
    getCategories()
      .then((tree) => setCategories(flattenCategoriesWithSlug(Array.isArray(tree) ? tree : [])))
      .catch(() => setCategories([]));
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const newArrivalsOnly = searchParams.get('newArrivalsOnly') === 'true';
      const trending = searchParams.get('trending') === 'true';
      const params = {
        page,
        size: pageSize,
        search: appliedFilters.search.trim() || undefined,
        category: appliedFilters.category || undefined,
        sort: appliedFilters.sort || undefined,
        minPrice: appliedFilters.minPrice === '' ? undefined : Number(appliedFilters.minPrice),
        maxPrice: appliedFilters.maxPrice === '' ? undefined : Number(appliedFilters.maxPrice),
        newArrivalsOnly: newArrivalsOnly || undefined,
        trending: trending || undefined,
      };
      const result = await getProducts(params);
      setProducts(result.content);
      setTotalElements(result.totalElements);
      setTotalPages(result.totalPages);
      setLast(result.last);
    } catch (err) {
      setError(err?.message ?? 'Failed to load products.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, appliedFilters, searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const applyFilters = (nextFilters) => {
    const finalFilters = nextFilters ?? filters;
    setAppliedFilters(finalFilters);
    setPage(0);
    setShowMobileFilters(false);
    // Start from current URL so newArrivalsOnly/trending are never dropped
    const params = new URLSearchParams(searchParams);
    if (finalFilters.search.trim()) params.set('search', finalFilters.search.trim());
    else params.delete('search');
    if (finalFilters.category) params.set('category', finalFilters.category);
    else params.delete('category');
    if (finalFilters.sort) params.set('sort', finalFilters.sort);
    else params.delete('sort');
    if (finalFilters.minPrice !== '') params.set('minPrice', finalFilters.minPrice);
    else params.delete('minPrice');
    if (finalFilters.maxPrice !== '') params.set('maxPrice', finalFilters.maxPrice);
    else params.delete('maxPrice');
    setSearchParams(params, { replace: true });
  };

  const clearFilters = () => {
    const empty = { search: '', category: '', sort: '', minPrice: '', maxPrice: '' };
    setFilters(empty);
    setAppliedFilters(empty);
    setPage(0);
    setShowMobileFilters(false);
    setSearchParams({}, { replace: true });
  };

  const handlePageSizeChange = (nextSize) => {
    const normalized = Number(nextSize);
    if (!PAGE_SIZE_OPTIONS.includes(normalized)) return;
    setPageSize(normalized);
    setPage(0);
    const params = new URLSearchParams(searchParams);
    if (normalized === DEFAULT_PAGE_SIZE) params.delete('size');
    else params.set('size', String(normalized));
    setSearchParams(params, { replace: true });
  };

  const hasActiveFilters =
    appliedFilters.search ||
    appliedFilters.category ||
    appliedFilters.sort ||
    appliedFilters.minPrice !== '' ||
    appliedFilters.maxPrice !== '';

  const from = totalElements === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalElements);
  const pageTitle = searchParams.get('newArrivalsOnly') === 'true' ? 'New Arrivals' : 'All Products';

  // Sidebar Filter Content
  const filterSidebarContent = (
    <div className="space-y-8">
      {/* Search */}
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary">Search</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary" />
          <input
            type="search"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="w-full rounded-md border border-border bg-white py-2 pl-9 pr-3 text-sm text-primary placeholder:text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Categories */}
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary">Categories</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
          <button
            onClick={() => setFilters((f) => ({ ...f, category: '' }))}
            className={`block w-full text-left text-sm transition-colors ${
              filters.category === '' ? 'font-semibold text-primary' : 'text-secondary/70 hover:text-primary'
            }`}
          >
            All Categories
          </button>
          {categories.filter(c => c.slug).map((c) => (
            <button
              key={c.id}
              onClick={() => setFilters((f) => ({ ...f, category: c.slug }))}
              className={`block w-full text-left text-sm transition-colors ${
                filters.category === c.slug ? 'font-semibold text-primary' : 'text-secondary/70 hover:text-primary'
              }`}
              style={{ paddingLeft: `${c.depth * 12}px` }}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary">Price Range</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value }))}
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-tertiary">-</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))}
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Sort (Mobile only usually, but added here for completeness if needed, though usually top right) */}
      <div className="lg:hidden">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary">Sort By</h3>
        <select
          value={filters.sort}
          onChange={(e) => {
            const updated = { ...filters, sort: e.target.value };
            setFilters(updated);
            applyFilters(updated);
          }}
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value || 'default'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-border space-y-3">
        <button
          onClick={() => applyFilters()}
          className="w-full rounded-full bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-secondary"
        >
          Apply Filters
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="w-full px-4 py-2 text-center text-xs font-medium text-secondary hover:text-primary hover:underline"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      
      {/* Page title — slight right nudge on large screens to align with content */}
      <div className="bg-[#F9F9F9] px-3 py-4 sm:px-6 sm:py-6 lg:py-8 lg:px-8">
        <div className="mx-auto max-w-7xl lg:pl-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-brand text-xl text-primary sm:text-2xl lg:text-3xl"
          >
            {pageTitle}
          </motion.h1>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="flex flex-col lg:flex-row lg:items-stretch lg:gap-12">
          
          {/* Desktop Sidebar — sticks in place while product grid scrolls */}
          <aside className="hidden w-64 shrink-0 lg:block lg:self-stretch">
            <div
              className="sticky z-10 top-30 max-h-[calc(100vh-8rem)] overflow-y-auto overflow-x-hidden bg-white pt-4"
              style={{ position: 'sticky', top: '7rem' }}
            >
              {filterSidebarContent}
            </div>
          </aside>

          {/* Mobile Filter Controls */}
          <div className="mb-6 flex items-center justify-between lg:mb-8 lg:hidden">
            <button
              type="button"
              onClick={() => setShowMobileFilters(true)}
              className="flex min-h-10 items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-medium text-primary hover:bg-gray-50 sm:px-4 sm:text-sm"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
            <div className="text-xs text-secondary sm:text-sm">
              {totalElements} Items
            </div>
          </div>

          {/* Mobile Filter Drawer */}
          <AnimatePresence>
            {showMobileFilters && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowMobileFilters(false)}
                  className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
                />
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="fixed inset-y-0 right-0 z-50 w-full max-w-[min(100vw-2rem,20rem)] overflow-y-auto bg-white p-4 shadow-xl lg:hidden sm:p-6 pr-[max(1rem,env(safe-area-inset-right))]"
                >
                  <div className="mb-6 flex items-center justify-between sm:mb-8">
                    <h2 className="text-base font-brand font-medium text-primary sm:text-lg">Filters</h2>
                    <button
                      type="button"
                      onClick={() => setShowMobileFilters(false)}
                      className="flex min-h-10 min-w-10 items-center justify-center text-secondary hover:text-primary"
                      aria-label="Close filters"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  {filterSidebarContent}
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Product Grid Area */}
          <div className="flex-1">
            {/* Top Bar (Sort & Count) */}
            <div className="mb-8 hidden items-center justify-between lg:flex">
              <p className="text-sm text-secondary">
                Showing <span className="font-medium text-primary">{from}–{to}</span> of{' '}
                <span className="font-medium text-primary">{totalElements}</span> results
              </p>
              <div className="flex items-center gap-3">
                <span className="text-sm text-secondary">Sort by:</span>
                <div className="relative">
                  <select
                    value={filters.sort}
                    onChange={(e) => {
                      const updated = { ...filters, sort: e.target.value };
                      setFilters(updated);
                      applyFilters(updated);
                    }}
                    className="appearance-none cursor-pointer rounded-full border border-border/50 bg-white px-3 pr-8 py-1.5 text-sm font-medium text-primary focus:border-primary focus:outline-none focus:ring-0 hover:text-secondary"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value || 'default'} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ArrowDownWideNarrow className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                </div>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <ProductGridSkeleton count={12} />
            ) : error ? (
              <div className="rounded-lg bg-red-50 p-4 text-center text-sm text-red-600">
                {error}
              </div>
            ) : products.length === 0 ? (
              <div className="flex h-96 flex-col items-center justify-center text-center">
                <p className="text-lg font-medium text-primary">No products found</p>
                <p className="mt-2 text-secondary/60">Try adjusting your filters.</p>
                <button
                  onClick={clearFilters}
                  className="mt-6 text-sm font-medium text-primary underline underline-offset-4 hover:text-secondary"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-6 sm:gap-y-8 lg:grid-cols-3 xl:grid-cols-4">
                  {products.map((product) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </div>

                <div className="mt-8 flex items-center justify-center gap-2">
                  <label htmlFor="page-size" className="text-sm text-secondary">
                    Items per page:
                  </label>
                  <select
                    id="page-size"
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(e.target.value)}
                    className="cursor-pointer rounded-full border border-border/60 bg-white px-3 py-1.5 text-sm font-medium text-primary focus:border-primary focus:outline-none focus:ring-0"
                  >
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-10 flex flex-wrap items-center justify-center gap-3 border-t border-border pt-6 sm:mt-16 sm:gap-4 sm:pt-8">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="flex min-h-10 items-center gap-1 rounded-full px-4 py-2 text-xs font-medium text-primary transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent sm:px-6 sm:text-sm"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>
                    <span className="text-xs font-medium text-secondary sm:text-sm">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={last}
                      className="flex min-h-10 items-center gap-1 rounded-full px-4 py-2 text-xs font-medium text-primary transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent sm:px-6 sm:text-sm"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
