import { useState, useEffect, useCallback, Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ImageOff,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Filter,
  MoreHorizontal,
} from 'lucide-react';
import { getCategories, flattenCategoriesWithSlug } from '@/services/categoryService';
import {
  getAdminProducts,
  updateVariant,
  deleteVariant,
  deleteProduct,
  updateSizeOption,
  deleteSizeOption,
} from '@/services/adminProductService';
import { getProductCardImageUrl } from '@/utils/productImages';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'basePrice,asc', label: 'Price (low to high)' },
  { value: 'basePrice,desc', label: 'Price (high to low)' },
  { value: 'name,asc', label: 'Name (A–Z)' },
  { value: 'name,desc', label: 'Name (Z–A)' },
];

/**
 * Product-level storefront visibility from the admin list API.
 * - Prefer `active` when the backend sends it (your current API shape).
 * - Fall back to `isActive` for older/other payloads that used that name instead.
 * (Variant rows can also have their own `active` / `isActive`; this is only the product row.)
 */
function isProductCatalogActive(product) {
  if (typeof product?.active === 'boolean') return product.active;
  if (typeof product?.isActive === 'boolean') return product.isActive;
  return true;
}

export default function ProductManagementPage() {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [last, setLast] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [editVariant, setEditVariant] = useState(null);
  const [variantForm, setVariantForm] = useState(null);
  const [variantSubmitError, setVariantSubmitError] = useState(null);
  const [variantSaving, setVariantSaving] = useState(false);
  const [variantToDelete, setVariantToDelete] = useState(null);
  const [variantDeleting, setVariantDeleting] = useState(false);
  const [variantDeleteError, setVariantDeleteError] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [productDeleting, setProductDeleting] = useState(false);
  const [productDeleteError, setProductDeleteError] = useState(null);
  const [actionsMenuProductId, setActionsMenuProductId] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const openEditVariant = (productId, productName, variant, mode = 'variant') => {
    setEditVariant({ productId, productName, variant, mode });
    setVariantForm({
      sku: variant.sku ?? '',
      size: variant.size ?? '',
      color: variant.color ?? '',
      price: typeof variant.price === 'number' ? variant.price : '',
      stockQuantity: variant.stockQuantity ?? 0,
      isActive: variant.isActive !== false && variant.active !== false,
      applyDiscount: (variant.discount ?? 0) > 0,
      discount: variant.discount ?? '',
    });
    setVariantSubmitError(null);
  };

  const closeEditVariant = () => {
    setEditVariant(null);
    setVariantForm(null);
    setVariantSubmitError(null);
  };

  const handleVariantSubmit = async (e) => {
    e.preventDefault();
    if (!editVariant || !variantForm) return;
    setVariantSubmitError(null);
    setVariantSaving(true);
    try {
      const payload = {
        sku: variantForm.sku?.trim() || undefined,
        size: variantForm.size?.trim() || undefined,
        color: variantForm.color?.trim() || undefined,
        price: variantForm.price !== '' ? Number(variantForm.price) : undefined,
        stockQuantity: variantForm.stockQuantity != null ? Number(variantForm.stockQuantity) : undefined,
        isActive: variantForm.isActive,
        discount: variantForm.applyDiscount ? (Number(variantForm.discount) || 0) : 0,
      };

      if (editVariant.mode === 'sizeOption') {
        await updateSizeOption(editVariant.productId, editVariant.variant.id, payload);
      } else {
        await updateVariant(editVariant.productId, editVariant.variant.id, payload);
      }
      closeEditVariant();
      fetchProducts();
    } catch (err) {
      setVariantSubmitError(err?.message ?? 'Failed to update variant.');
    } finally {
      setVariantSaving(false);
    }
  };

  const openDeleteVariantConfirm = (productId, productName, variant, mode = 'variant') => {
    setVariantToDelete({ productId, productName, variant, mode });
    setVariantDeleteError(null);
  };

  const closeDeleteVariantConfirm = () => {
    setVariantToDelete(null);
    setVariantDeleteError(null);
  };

  const handleDeleteVariantConfirm = async () => {
    if (!variantToDelete) return;
    setVariantDeleting(true);
    setVariantDeleteError(null);
    try {
      if (variantToDelete.mode === 'sizeOption') {
        await deleteSizeOption(variantToDelete.productId, variantToDelete.variant.groupId, variantToDelete.variant.id);
      } else {
        await deleteVariant(variantToDelete.productId, variantToDelete.variant.id);
      }
      closeDeleteVariantConfirm();
      fetchProducts();
    } catch (err) {
      setVariantDeleteError(err?.message ?? 'Failed to delete variant.');
    } finally {
      setVariantDeleting(false);
    }
  };

  const openDeleteProductConfirm = (product) => {
    setProductToDelete(product);
    setProductDeleteError(null);
  };

  const closeDeleteProductConfirm = () => {
    setProductToDelete(null);
    setProductDeleteError(null);
  };

  const handleDeleteProductConfirm = async () => {
    if (!productToDelete?.id) return;
    setProductDeleting(true);
    setProductDeleteError(null);
    try {
      await deleteProduct(productToDelete.id);
      closeDeleteProductConfirm();
      if (expandedId === productToDelete.id) setExpandedId(null);
      fetchProducts();
    } catch (err) {
      setProductDeleteError(err?.message ?? 'Failed to delete product.');
    } finally {
      setProductDeleting(false);
    }
  };

  const [filters, setFilters] = useState({
    search: '',
    category: '',
    sort: '',
    minPrice: '',
    maxPrice: '',
    featured: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    category: '',
    sort: '',
    minPrice: '',
    maxPrice: '',
    featured: '',
  });

  const fetchCategories = useCallback(async () => {
    try {
      const tree = await getCategories();
      setCategories(flattenCategoriesWithSlug(tree));
    } catch {
      setCategories([]);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        size,
        sort: appliedFilters.sort || undefined,
        category: appliedFilters.category || undefined,
        search: appliedFilters.search.trim() || undefined,
        minPrice: appliedFilters.minPrice === '' ? undefined : Number(appliedFilters.minPrice),
        maxPrice: appliedFilters.maxPrice === '' ? undefined : Number(appliedFilters.maxPrice),
        featured:
          appliedFilters.featured === ''
            ? undefined
            : appliedFilters.featured === 'true',
      };
      const result = await getAdminProducts(params);
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
  }, [page, size, appliedFilters]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (!editVariant) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeEditVariant();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editVariant]);

  useEffect(() => {
    if (!imagePreview) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setImagePreview(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [imagePreview]);

  useEffect(() => {
    if (actionsMenuProductId == null) return;
    const close = () => setActionsMenuProductId(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [actionsMenuProductId]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
    setPage(0);
  };

  const from = totalElements === 0 ? 0 : page * size + 1;
  const to = Math.min((page + 1) * size, totalElements);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-brand text-3xl text-primary">Products</h1>
          <p className="mt-1 text-secondary">Manage your product catalog.</p>
        </div>
        <Link
          to="/admin/products/new"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-secondary"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary" />
            <input
              type="search"
              placeholder="Search products..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              className="w-full rounded-md border border-border bg-white py-2 pl-9 pr-3 text-sm text-primary placeholder:text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All Categories</option>
            {categories
              .filter((c) => c.slug)
              .map((c) => (
                <option key={c.id} value={c.slug}>
                  {'—'.repeat(c.depth)} {c.name}
                </option>
              ))}
          </select>
          <select
            value={filters.sort}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value || 'default'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={applyFilters}
            className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-secondary"
          >
            <Filter className="h-4 w-4" />
            Apply Filters
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="w-10 py-4 pl-6 pr-2"></th>
                  <th className="py-4 px-4 font-bold text-primary">Product</th>
                  <th className="py-4 px-4 font-bold text-primary">Price</th>
                  <th className="py-4 px-4 font-bold text-primary">Category</th>
                  <th className="py-4 px-4 font-bold text-primary">Brand</th>
                  <th className="py-4 px-4 font-bold text-primary">Status</th>
                  <th className="py-4 px-4 font-bold text-primary">Variants</th>
                  <th className="py-4 px-4 font-bold text-primary">Flags</th>
                  <th className="py-4 px-4 text-right font-bold text-primary pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-secondary">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  products.map((p, index) => {
                    const variants = Array.isArray(p.variants) ? p.variants : [];
                    const groups = Array.isArray(p.variantGroups) ? p.variantGroups : [];
                    const totalSizeOptions = groups.reduce(
                      (acc, g) => acc + (Array.isArray(g?.sizeOptions) ? g.sizeOptions.length : 0),
                      0
                    );
                    const isExpanded = expandedId === p.id;
                    const isLastRow = index === products.length - 1;
                    const previewSrc = getProductCardImageUrl(p);
                    const catalogActive = isProductCatalogActive(p);
                    return (
                      <Fragment key={p.id}>
                        <tr className="group hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 pl-6 pr-2">
                            {(groups.length > 0 || variants.length > 0) && (
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : p.id)}
                                className="rounded p-1 text-secondary hover:bg-gray-200 hover:text-primary"
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-gray-100">
                                {previewSrc ? (
                                  <button
                                    type="button"
                                    className="h-full w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    onClick={() => setImagePreview({ src: previewSrc, name: p.name })}
                                    aria-label={`Preview image for ${p.name}`}
                                  >
                                    <img src={previewSrc} alt="" className="h-full w-full object-cover" />
                                  </button>
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-tertiary">
                                    <ImageOff className="h-4 w-4" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-primary">{p.name}</p>
                                <p className="text-xs text-secondary font-mono">{p.slug}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-medium text-primary">
                            {(() => {
                              const firstGroup = groups[0];
                              const firstSize = Array.isArray(firstGroup?.sizeOptions) ? firstGroup.sizeOptions[0] : null;
                              if (firstSize && typeof firstSize.price === 'number') {
                                return firstSize.price.toLocaleString(undefined, { maximumFractionDigits: 0 });
                              }
                              if (variants.length > 0 && typeof variants[0].price === 'number') {
                                return variants[0].price.toLocaleString(undefined, { maximumFractionDigits: 0 });
                              }
                              if (typeof p.basePrice === 'number') {
                                return p.basePrice.toLocaleString(undefined, { maximumFractionDigits: 0 });
                              }
                              return '—';
                            })()}
                          </td>
                          <td className="py-4 px-4 text-secondary">{p.categoryName ?? '—'}</td>
                          <td className="py-4 px-4 text-secondary">{p.brand ?? '—'}</td>
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                catalogActive
                                  ? 'border-primary/20 bg-primary/5 text-primary'
                                  : 'border-gray-200 bg-gray-100 text-gray-600'
                              }`}
                            >
                              {catalogActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-secondary">
                            {groups.length > 0 ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-primary">
                                  {groups.length} color{groups.length === 1 ? '' : 's'}
                                </span>
                                <span className="text-[11px] text-tertiary">
                                  {totalSizeOptions} size{totalSizeOptions === 1 ? '' : 's'}
                                </span>
                              </div>
                            ) : variants.length > 0 ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-primary">
                                {variants.length}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-wrap gap-1">
                              {(p.featured === true || p.isFeatured) && (
                                <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Featured</span>
                              )}
                              {(p.newArrival === true || p.isNewArrival) && (
                                <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">New</span>
                              )}
                              {(p.trending === true || p.isTrending) && (
                                <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">Trending</span>
                              )}
                              {!(p.featured === true || p.isFeatured) && !(p.newArrival === true || p.isNewArrival) && !(p.trending === true || p.isTrending) && '—'}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right pr-6">
                            <div className="relative flex items-center justify-end">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionsMenuProductId(actionsMenuProductId === p.id ? null : p.id);
                                }}
                                className="rounded p-2 text-secondary hover:bg-gray-100 hover:text-primary transition-colors"
                                aria-label={`Actions for ${p.name}`}
                                aria-expanded={actionsMenuProductId === p.id}
                                aria-haspopup="true"
                              >
                                <MoreHorizontal className="h-5 w-5" />
                              </button>
                              {actionsMenuProductId === p.id && (
                                <div
                                  className={`absolute right-0 z-10 min-w-[140px] rounded-lg border border-border bg-white py-1 shadow-lg ${isLastRow ? 'bottom-full mb-1' : 'top-full mt-1'}`}
                                  role="menu"
                                  onMouseDown={(e) => e.stopPropagation()}
                                >
                                  <Link
                                    to={`/admin/products/edit/${encodeURIComponent(p.slug ?? '')}`}
                                    role="menuitem"
                                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium text-primary hover:bg-gray-50"
                                    onClick={() => setActionsMenuProductId(null)}
                                  >
                                    <Pencil className="h-4 w-4 shrink-0" />
                                    Edit
                                  </Link>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                      setActionsMenuProductId(null);
                                      openDeleteProductConfirm(p);
                                    }}
                                    aria-label={`Delete product ${p.name}`}
                                  >
                                    <Trash2 className="h-4 w-4 shrink-0" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (groups.length > 0 || variants.length > 0) && (
                          <tr className="bg-gray-50/30">
                            <td colSpan={9} className="px-6 py-4">
                              <div className="rounded-lg border border-border bg-white overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50 border-b border-border">
                                    <tr>
                                      <th className="py-2 px-4 text-left font-medium text-secondary">SKU</th>
                                      <th className="py-2 px-4 text-left font-medium text-secondary">Size</th>
                                      <th className="py-2 px-4 text-left font-medium text-secondary">Color</th>
                                      <th className="py-2 px-4 text-left font-medium text-secondary">Price</th>
                                      <th className="py-2 px-4 text-left font-medium text-secondary">Stock</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                    {groups.length > 0
                                      ? groups.flatMap((g) =>
                                          (Array.isArray(g.sizeOptions) ? g.sizeOptions : []).map((s) => (
                                            <tr key={s.id}>
                                              <td className="py-2 px-4 font-mono text-xs text-primary">{s.sku ?? '—'}</td>
                                              <td className="py-2 px-4 text-primary">{s.size ?? '—'}</td>
                                              <td className="py-2 px-4 text-primary">{g.color ?? s.color ?? '—'}</td>
                                              <td className="py-2 px-4 text-primary">
                                                {typeof s.price === 'number'
                                                  ? s.price.toLocaleString(undefined, { maximumFractionDigits: 0 })
                                                  : s.price ?? '—'}
                                              </td>
                                              <td className="py-2 px-4 text-primary">{s.stockQuantity ?? 0}</td>
                                            </tr>
                                          ))
                                        )
                                      : variants.map((v) => (
                                          <tr key={v.id}>
                                            <td className="py-2 px-4 font-mono text-xs text-primary">{v.sku ?? '—'}</td>
                                            <td className="py-2 px-4 text-primary">{v.size ?? '—'}</td>
                                            <td className="py-2 px-4 text-primary">{v.color ?? '—'}</td>
                                            <td className="py-2 px-4 text-primary">
                                              {typeof v.price === 'number'
                                                ? v.price.toLocaleString(undefined, { maximumFractionDigits: 0 })
                                                : v.price ?? '—'}
                                            </td>
                                            <td className="py-2 px-4 text-primary">{v.stockQuantity ?? 0}</td>
                                          </tr>
                                        ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border px-6 py-4">
            <p className="text-sm text-secondary">
              Showing {from}–{to} of {totalElements} results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                disabled={page === 0}
                className="rounded p-1 text-primary hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setPage((prev) => prev + 1)}
                disabled={last}
                className="rounded p-1 text-primary hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Dialog */}
      {imagePreview?.src && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setImagePreview(null)}
            aria-label="Close image preview"
          />
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={imagePreview.name ? `Image preview: ${imagePreview.name}` : 'Image preview'}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-primary">
                  {imagePreview.name ?? 'Image preview'}
                </p>
                <p className="truncate text-xs text-secondary">Click outside or press Esc to close</p>
              </div>
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-primary hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <div className="bg-black/5 p-4">
              <img
                src={imagePreview.src}
                alt={imagePreview.name ?? 'Preview'}
                className="mx-auto max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Dialog */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeDeleteProductConfirm} />
          <div
            className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-product-title"
            aria-describedby="delete-product-description"
          >
            <h2 id="delete-product-title" className="text-lg font-bold text-primary">
              Delete product?
            </h2>
            <p id="delete-product-description" className="mt-2 text-sm text-secondary">
              <span className="font-medium text-primary">{productToDelete.name}</span>
              {productToDelete.slug && (
                <span className="text-tertiary"> ({productToDelete.slug})</span>
              )}
              . This cannot be undone.
            </p>
            {productDeleteError && (
              <p className="mt-4 text-sm text-red-600" role="alert">{productDeleteError}</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteProductConfirm}
                disabled={productDeleting}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-primary hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProductConfirm}
                disabled={productDeleting}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {productDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {productDeleting ? 'Deleting…' : 'Delete product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Variant Confirmation Dialog */}
      {variantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeDeleteVariantConfirm} />
          <div
            className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-variant-title"
            aria-describedby="delete-variant-description"
          >
            <h2 id="delete-variant-title" className="text-lg font-bold text-primary">
              Delete variant?
            </h2>
            <p id="delete-variant-description" className="mt-2 text-sm text-secondary">
              <span className="font-medium text-primary">{variantToDelete.productName}</span>
              {' — '}
              {variantToDelete.variant.sku ?? `${variantToDelete.variant.size} / ${variantToDelete.variant.color}`}.
              This cannot be undone.
            </p>
            {variantDeleteError && (
              <p className="mt-4 text-sm text-red-600" role="alert">{variantDeleteError}</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteVariantConfirm}
                disabled={variantDeleting}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-primary hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteVariantConfirm}
                disabled={variantDeleting}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {variantDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {variantDeleting ? 'Deleting…' : 'Delete variant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Variant Modal */}
      {editVariant && variantForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeEditVariant} />
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-primary">Edit Variant</h2>
            <p className="text-sm text-secondary mb-4">{editVariant.productName}</p>
            
            {variantSubmitError && (
              <p className="mb-4 text-sm text-red-600">{variantSubmitError}</p>
            )}

            <form onSubmit={handleVariantSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-secondary">SKU</label>
                <input
                  type="text"
                  value={variantForm.sku}
                  onChange={(e) => setVariantForm((f) => ({ ...f, sku: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-secondary">Size</label>
                  <input
                    type="text"
                    value={variantForm.size}
                    onChange={(e) => setVariantForm((f) => ({ ...f, size: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-secondary">Color</label>
                  <input
                    type="text"
                    value={variantForm.color}
                    onChange={(e) => setVariantForm((f) => ({ ...f, color: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-secondary">Price</label>
                  <input
                    type="number"
                    value={variantForm.price}
                    onChange={(e) => setVariantForm((f) => ({ ...f, price: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-secondary">Stock</label>
                  <input
                    type="number"
                    value={variantForm.stockQuantity}
                    onChange={(e) => setVariantForm((f) => ({ ...f, stockQuantity: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <label className="flex cursor-pointer select-none items-center gap-2">
                  <input
                    type="checkbox"
                    checked={variantForm.applyDiscount}
                    onChange={(e) => setVariantForm((f) => ({ ...f, applyDiscount: e.target.checked }))}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-primary">Apply discount</span>
                </label>
                {variantForm.applyDiscount && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-secondary">Discount amount</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={variantForm.discount}
                      onChange={(e) => setVariantForm((f) => ({ ...f, discount: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      placeholder="0"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeEditVariant}
                  className="rounded-md px-4 py-2 text-sm font-medium text-secondary hover:text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={variantSaving}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-secondary disabled:opacity-50"
                >
                  {variantSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
