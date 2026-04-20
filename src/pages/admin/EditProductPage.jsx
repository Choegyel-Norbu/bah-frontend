import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  List,
  Trash2,
} from 'lucide-react';
import * as adminProductService from '@/services/adminProductService';
import { getProductBySlug } from '@/services/productService';
import { getCategories, flattenCategoriesWithSlug } from '@/services/categoryService';
import { getVariantMainImageUrl } from '@/utils/productImages';
import { useToast } from '@/hooks/useToast';

const editProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  categoryId: z.coerce.number().int().min(1, 'Category is required'),
  brand: z.string().optional().nullable(),
  material: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  isTrending: z.boolean().optional(),
});

/** Read product-level {@code active} / {@code isActive} when the API sends a boolean. */
function readProductActiveFlag(p) {
  if (!p || typeof p !== 'object') return undefined;
  if (typeof p.active === 'boolean') return p.active;
  if (typeof p.isActive === 'boolean') return p.isActive;
  return undefined;
}

/**
 * Prefer {@code active} from public detail when present; otherwise admin list row (your list payload shape).
 */
function resolveFormIsActive(detail, adminListRow) {
  return readProductActiveFlag(detail) ?? readProductActiveFlag(adminListRow) ?? true;
}

function getInputClassName(error) {
  const base =
    'w-full rounded-none border-b border-border bg-transparent px-3 py-3 text-sm text-primary placeholder-tertiary outline-none transition-colors focus:border-black focus:ring-0';
  const normal = 'border-border focus:border-primary';
  const invalid = 'border-red-500 focus:border-red-500 text-red-600';
  return `${base} ${error ? invalid : normal}`;
}

function normalizeColorKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function hexToRgb(hex) {
  const raw = String(hex).trim().replace(/^#/, '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function colorNameToRgb(name) {
  const key = normalizeColorKey(name);
  const table = {
    black: { r: 0, g: 0, b: 0 },
    white: { r: 255, g: 255, b: 255 },
    gray: { r: 107, g: 114, b: 128 },
    grey: { r: 107, g: 114, b: 128 },
    red: { r: 239, g: 68, b: 68 },
    blue: { r: 59, g: 130, b: 246 },
    green: { r: 34, g: 197, b: 94 },
    yellow: { r: 234, g: 179, b: 8 },
    orange: { r: 249, g: 115, b: 22 },
    purple: { r: 168, g: 85, b: 247 },
    indigo: { r: 99, g: 102, b: 241 },
    pink: { r: 236, g: 72, b: 153 },
    brown: { r: 120, g: 53, b: 15 },
    beige: { r: 245, g: 245, b: 220 },
    cream: { r: 255, g: 251, b: 235 },
  };
  return table[key] ?? null;
}

function hashStringToRgb(value) {
  const s = String(value ?? '');
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  // create a pleasant pastel-ish color
  const r = 80 + (hash & 0x7f);
  const g = 80 + ((hash >> 8) & 0x7f);
  const b = 80 + ((hash >> 16) & 0x7f);
  return { r, g, b };
}

function resolveAccentRgb(color) {
  const c = String(color ?? '').trim();
  if (!c) return { r: 99, g: 102, b: 241 }; // indigo-ish default
  if (c.startsWith('#')) return hexToRgb(c) ?? hashStringToRgb(c);
  return colorNameToRgb(c) ?? hashStringToRgb(c);
}

function buildAccentGradientStyle(color, alpha = 0.14) {
  const { r, g, b } = resolveAccentRgb(color);
  const a = Math.max(0, Math.min(1, alpha));
  return {
    backgroundImage: `linear-gradient(90deg, rgba(${r}, ${g}, ${b}, ${a}), rgba(${r}, ${g}, ${b}, 0) 65%, rgba(${r}, ${g}, ${b}, 0) 100%)`,
  };
}

/** Renders a file preview and revokes object URLs on change or unmount */
function FilePreview({ file, className = 'h-10 w-10 rounded object-cover' }) {
  const urlRef = useRef(null);
  const fileRef = useRef(null);
  if (fileRef.current !== file) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    fileRef.current = file;
    urlRef.current = file ? URL.createObjectURL(file) : null;
  }
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);
  if (!urlRef.current) return null;
  return <img src={urlRef.current} alt="" className={className} />;
}

function VariantGroupEditor({
  group,
  groupIndex,
  totalGroups,
  isSubmitting,
  pendingFiles,
  existingImages,
  removingKeys,
  onDeleteImage,
  onSetPendingFiles,
  groupDraft,
  onChangeGroupDraft,
  onDeleteSizeOption,
  onDeleteColorVariant,
  deleteColorDisabled,
  isDeletingColorVariant,
}) {
  const [addError, setAddError] = useState(null);
  const [deletingSizeIds, setDeletingSizeIds] = useState(() => new Set());
  const [sizesOpen, setSizesOpen] = useState(false);

  const sizeRows = Array.isArray(groupDraft?.sizes) ? groupDraft.sizes : [];

  /** Draft wins so renames show immediately; API `group` updates after save / reload. */
  const colorInputValue =
    groupDraft != null ? String(groupDraft.color ?? '') : String(group?.color ?? '');
  const colorLabel = colorInputValue.trim() || `Group ${groupIndex + 1}`;
  const sizeCount = sizeRows.length;
  const sizesSectionId = `group-sizes-${group?.id ?? groupIndex}`;
  const isMulti = Number(totalGroups) > 1;
  const accentStyle = buildAccentGradientStyle(colorLabel, 0.14);

  return (
    <div className={`relative space-y-4 ${isMulti ? 'rounded-2xl border border-border/70 bg-white/60 p-4 shadow-sm shadow-black/5' : ''}`}>
      {isMulti ? (
        <div className="pointer-events-none absolute inset-0 rounded-2xl" style={accentStyle} />
      ) : null}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">{colorLabel}</p>
          <p className="text-[11px] text-tertiary">Images are shared by all sizes in this color.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {onDeleteColorVariant ? (
            <button
              type="button"
              onClick={onDeleteColorVariant}
              disabled={isSubmitting || isDeletingColorVariant || deleteColorDisabled}
              title={
                deleteColorDisabled
                  ? 'Add another color variant first — a product must keep at least one color.'
                  : 'Remove this color variant and all its sizes and images'
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeletingColorVariant ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              )}
              {isDeletingColorVariant ? 'Removing…' : 'Remove color'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setSizesOpen((v) => {
                const next = !v;
                if (next) {
                  // wait for the sizes section to render expanded, then scroll
                  setTimeout(() => {
                    document.getElementById(sizesSectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 0);
                }
                return next;
              });
            }}
            className="relative inline-flex items-center gap-1.5 rounded-full border border-border bg-white/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary hover:bg-white"
            aria-expanded={sizesOpen}
            aria-controls={sizesSectionId}
          >
            {sizesOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {sizesOpen ? 'Hide sizes' : 'Show sizes'}
            <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-secondary">
              {sizeCount}
            </span>
          </button>
        </div>
      </div>

      <div className="relative flex flex-col gap-4">
        {/* Left: Color + Images */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium uppercase tracking-wider text-secondary">Color</label>
            <input className="w-full rounded-md bg-white px-3 py-2 text-sm text-primary ring-1 ring-border/60" value={colorLabel} readOnly />
          </div>

          {/* Existing group images */}
          {existingImages.length > 0 && pendingFiles.length === 0 && (
            <div className="w-full overflow-x-auto pb-1 scrollbar-hide">
              <div className="flex items-center gap-2">
                {existingImages.map((img, imgIdx) => {
                  const removing = removingKeys.has(`g:${group.id}:${img.id}`);
                  return (
                    <div key={img.id ?? imgIdx} className="group relative h-14 w-14 shrink-0">
                      <img
                        src={img.imageUrl}
                        alt=""
                        className={`h-14 w-14 rounded-lg object-cover ring-1 ring-border/60 transition-opacity ${removing ? 'opacity-60' : ''}`}
                      />
                      {removing && (
                        <div className="absolute inset-0 grid place-items-center">
                          <div className="grid h-6 w-6 place-items-center rounded-full bg-white/90 ring-1 ring-border/60">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          </div>
                        </div>
                      )}
                      {img.id != null && (
                        <button
                          type="button"
                          onClick={() => onDeleteImage(group.id, img.id)}
                          disabled={isSubmitting || removing}
                          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white opacity-100 ring-1 ring-black/10 transition-opacity disabled:opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                          aria-label="Delete image"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending uploads for this group */}
          {pendingFiles.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {pendingFiles.map((file, fileIdx) => (
                <div key={fileIdx} className="group relative h-14 w-14 shrink-0">
                  <FilePreview file={file} className="h-14 w-14 rounded-lg object-cover ring-1 ring-border/60" />
                  <button
                    type="button"
                    onClick={() => onSetPendingFiles(groupIndex, (cur) => cur.filter((_, i) => i !== fileIdx))}
                    disabled={isSubmitting}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white opacity-100 ring-1 ring-black/10 transition-opacity disabled:opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label="Remove file"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {pendingFiles.length < 5 && (
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              className="w-full cursor-pointer text-xs text-secondary file:mr-2 file:cursor-pointer file:rounded-full file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-medium file:uppercase file:tracking-wider file:text-white hover:file:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
              onChange={(e) => {
                const incoming = Array.from(e.target.files ?? []);
                onSetPendingFiles(groupIndex, (current) => [...current, ...incoming].slice(0, 5));
                e.target.value = '';
              }}
              disabled={isSubmitting}
            />
          )}
          <p className="text-[10px] text-tertiary">
            Uploads happen when you click <span className="font-medium text-primary">Save changes</span>.
          </p>
        </div>

        {/* Right: Sizes (editable) */}
        <div id={sizesSectionId} className="space-y-3">
          {sizesOpen ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wider text-secondary">Sizes</p>
              </div>

              <div className="space-y-3">
                {sizeRows.map((s, idx) => {
                  return (
                    <div key={s.id ?? `new-${idx}`} className="rounded-lg bg-white/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-medium text-secondary">Size {idx + 1}</p>
                        {sizeRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const row = sizeRows[idx];
                              const rowId = row?.id;
                              const groupId = group?.id;

                              // New, unsaved row: remove locally only
                              if (rowId == null || groupId == null) {
                                onChangeGroupDraft((prev) => ({
                                  ...prev,
                                  sizes: prev.sizes.filter((_, i) => i !== idx),
                                }));
                                return;
                              }

                              // Existing row: delete immediately from backend
                              setDeletingSizeIds((prev) => new Set(prev).add(rowId));
                              Promise.resolve(onDeleteSizeOption?.(groupId, rowId))
                                .then(() => {
                                  onChangeGroupDraft((prev) => ({
                                    ...prev,
                                    sizes: prev.sizes.filter((_, i) => i !== idx),
                                  }));
                                })
                                .finally(() => {
                                  setDeletingSizeIds((prev) => {
                                    const next = new Set(prev);
                                    next.delete(rowId);
                                    return next;
                                  });
                                });
                            }}
                            disabled={isSubmitting || deletingSizeIds.has(sizeRows[idx]?.id)}
                            className="rounded-full p-1.5 text-secondary hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                            aria-label="Remove size"
                          >
                            {deletingSizeIds.has(sizeRows[idx]?.id) ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-secondary">Size</label>
                          <input
                            className={getInputClassName(false)}
                            value={s.size ?? ''}
                            onChange={(e) =>
                              onChangeGroupDraft((prev) => ({
                                ...prev,
                                sizes: prev.sizes.map((row, i) => (i === idx ? { ...row, size: e.target.value } : row)),
                              }))
                            }
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-secondary">Price</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className={getInputClassName(false)}
                            value={s.price ?? ''}
                            onChange={(e) =>
                              onChangeGroupDraft((prev) => ({
                                ...prev,
                                sizes: prev.sizes.map((row, i) => (i === idx ? { ...row, price: e.target.value } : row)),
                              }))
                            }
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-secondary">Stock</label>
                          <input
                            type="number"
                            min="0"
                            className={getInputClassName(false)}
                            value={s.stockQuantity ?? 0}
                            onChange={(e) =>
                              onChangeGroupDraft((prev) => ({
                                ...prev,
                                sizes: prev.sizes.map((row, i) => (i === idx ? { ...row, stockQuantity: e.target.value } : row)),
                              }))
                            }
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-4">
                          <label className="flex cursor-pointer select-none items-center gap-2">
                            <input
                              type="checkbox"
                              checked={s.isActive !== false}
                              onChange={(e) =>
                                onChangeGroupDraft((prev) => ({
                                  ...prev,
                                  sizes: prev.sizes.map((row, i) => (i === idx ? { ...row, isActive: e.target.checked } : row)),
                                }))
                              }
                              disabled={isSubmitting}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-black"
                            />
                            <span className="text-xs text-primary">Active</span>
                          </label>
                          <label className="flex cursor-pointer select-none items-center gap-2">
                            <input
                              type="checkbox"
                              checked={Boolean(s.applyDiscount)}
                              onChange={(e) =>
                                onChangeGroupDraft((prev) => ({
                                  ...prev,
                                  sizes: prev.sizes.map((row, i) => (i === idx ? { ...row, applyDiscount: e.target.checked } : row)),
                                }))
                              }
                              disabled={isSubmitting}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-black"
                            />
                            <span className="text-xs text-primary">Discount</span>
                          </label>
                          {s.applyDiscount && (
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-secondary">Amount</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className={getInputClassName(false)}
                                value={s.discount ?? 0}
                                onChange={(e) =>
                                  onChangeGroupDraft((prev) => ({
                                    ...prev,
                                    sizes: prev.sizes.map((row, i) => (i === idx ? { ...row, discount: e.target.value } : row)),
                                  }))
                                }
                                disabled={isSubmitting}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-lg bg-white/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-secondary">Add size</p>
                  <button
                    type="button"
                    onClick={() => {
                      setAddError(null);
                      onChangeGroupDraft((prev) => ({
                        ...prev,
                        sizes: [
                          ...(Array.isArray(prev.sizes) ? prev.sizes : []),
                          { id: undefined, sku: '', size: '', price: '', stockQuantity: '', isActive: true, applyDiscount: false, discount: '' },
                        ],
                      }));
                    }}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-secondary disabled:opacity-60"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </button>
                </div>
                {addError && <p className="mt-2 text-xs text-red-600">{addError}</p>}
                <p className="mt-2 text-[10px] text-tertiary">Sizes are saved when you click Save changes.</p>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-tertiary">
              Sizes are hidden. Click <span className="font-medium text-primary">Show sizes</span> to view and edit.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EditProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { show: showToast } = useToast();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatedProduct, setUpdatedProduct] = useState(null);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  /** Legacy: up to 5 image files per variant by index; [] = no change for that variant */
  const [variantImageFiles, setVariantImageFiles] = useState([]);
  /** New: up to 5 image files per color group by index; [] = no change for that group */
  const [groupImageFiles, setGroupImageFiles] = useState([]);
  /** Set of image keys currently being removed (for loading state) */
  const [removingVariantImageIds, setRemovingVariantImageIds] = useState(() => new Set());
  const [deletingGroupId, setDeletingGroupId] = useState(null);
  /** Pending delete: which color group to remove after user confirms in the dialog. */
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState(null);
  const [groupDrafts, setGroupDrafts] = useState([]);
  const [pendingNewGroups, setPendingNewGroups] = useState([]);
  const [newGroupDraft, setNewGroupDraft] = useState(() => ({
    color: '',
    isActive: true,
    sizes: [{ size: '', price: '', stockQuantity: '', isActive: true, applyDiscount: false, discount: '' }],
  }));
  const [newGroupImageFiles, setNewGroupImageFiles] = useState([]);
  const [groupDraftError, setGroupDraftError] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(editProductSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      basePrice: 0,
      categoryId: 1,
      brand: '',
      material: '',
      isActive: true,
      isFeatured: false,
      isNewArrival: false,
      isTrending: false,
    },
  });

  useEffect(() => {
    if (!slug) {
      setLoadError('Product slug is missing.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    Promise.all([
      getProductBySlug(slug),
      getCategories(),
      adminProductService.fetchAdminProductRowBySlug(slug),
    ])
      .then(([productData, categoryTree, adminListRow]) => {
        if (cancelled) return;
        const flat = flattenCategoriesWithSlug(Array.isArray(categoryTree) ? categoryTree : []);
        setCategoryOptions(flat);
        setProduct(productData);
        const p = productData;
        const categoryId = p?.categoryId ?? (flat.find((c) => c.slug === (p?.categorySlug ?? ''))?.id ?? flat[0]?.id ?? 1);
        reset({
          name: p?.name ?? '',
          slug: p?.slug ?? '',
          description: p?.description ?? '',
          basePrice: p?.basePrice ?? 0,
          categoryId,
          brand: p?.brand ?? '',
          material: p?.material ?? '',
          isActive: resolveFormIsActive(p, adminListRow),
          isFeatured: Boolean(p?.featured ?? p?.isFeatured),
          isNewArrival: Boolean(p?.newArrival ?? p?.isNewArrival),
          isTrending: Boolean(p?.trending ?? p?.isTrending),
        });
        const groupsCount = (p?.variantGroups || []).length;
        if (groupsCount > 0) {
          setGroupImageFiles(Array.from({ length: groupsCount }, () => []));
          setVariantImageFiles([]);
          setGroupDrafts(
            (p.variantGroups || []).map((g) => ({
              groupId: g.id,
              color: g.color ?? '',
              isActive: g.isActive !== false && g.active !== false,
              sizes: Array.isArray(g.sizeOptions)
                ? g.sizeOptions.map((s) => ({
                    id: s.id,
                    variantId: s.variantId ?? s.productVariantId ?? null,
                    sku: s.sku ?? '',
                    size: s.size ?? '',
                    price: typeof s.price === 'number' ? s.price : s.price ?? '',
                    stockQuantity: s.stockQuantity ?? 0,
                    isActive: s.isActive !== false && s.active !== false,
                    applyDiscount: (s.discount ?? 0) > 0,
                    discount: s.discount ?? 0,
                  }))
                : [],
            }))
          );
          setPendingNewGroups([]);
          setNewGroupDraft({
            color: '',
            isActive: true,
            sizes: [{ size: '', price: '', stockQuantity: '', isActive: true, applyDiscount: false, discount: '' }],
          });
          setNewGroupImageFiles([]);
        } else {
          const variantCount = (p?.variants || []).length;
          setVariantImageFiles(Array.from({ length: variantCount }, () => []));
          setGroupImageFiles([]);
          setGroupDrafts([]);
          setPendingNewGroups([]);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err?.message ?? 'Failed to load product.');
          setProduct(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setCategoriesLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [slug, reset]);

  const onSubmit = async (data) => {
    if (!product?.id) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const groups = Array.isArray(product.variantGroups) ? product.variantGroups : [];
      const usingGroups = groups.length > 0;
      const indexCount = usingGroups ? groups.length : (product.variants || []).length;
      const source = usingGroups ? groupImageFiles : variantImageFiles;
      let imagesForRequest = Array.from({ length: indexCount }, (_, i) => source[i] ?? []);

      let variantGroupsForUpdate = usingGroups
        ? (Array.isArray(groupDrafts) && groupDrafts.length > 0
            ? groupDrafts.map((g) => ({
                color: String(g.color ?? '').trim(),
                isActive: g.isActive !== false,
                sizes: Array.isArray(g.sizes)
                  ? g.sizes
                      .map((s) => ({
                        ...(s?.id ? { id: s.id } : {}),
                        size: String(s.size ?? '').trim(),
                        price: Number(s.price),
                        discount: s.applyDiscount ? (Number(s.discount) || 0) : 0,
                        stockQuantity: Number(s.stockQuantity) || 0,
                        isActive: s.isActive !== false,
                      }))
                      .filter(
                        (s) =>
                          s.size &&
                          Number.isFinite(s.price) &&
                          s.price >= 0 &&
                          Number.isFinite(s.stockQuantity) &&
                          s.stockQuantity >= 0
                      )
                  : [],
              }))
            : groups.map((g) => ({
                color: String(g?.color ?? '').trim(),
                isActive: g?.isActive !== false && g?.active !== false,
                sizes: Array.isArray(g.sizeOptions)
                  ? g.sizeOptions.map((s) => ({
                      id: s.id,
                      size: s.size,
                      price: s.price,
                      discount: s.discount ?? 0,
                      stockQuantity: s.stockQuantity ?? 0,
                      isActive: s.isActive !== false && s.active !== false,
                    }))
                  : [],
              })))
        : undefined;

      // If admin has started drafting a new color group (and/or selected images) but clicks "Save changes",
      // include that draft in the same update request so images are not silently dropped.
      if (usingGroups) {
        const draftColor = String(newGroupDraft?.color ?? '').trim();
        const hasInlineDraft =
          Boolean(draftColor) ||
          (Array.isArray(newGroupImageFiles) && newGroupImageFiles.some((f) => f && f.size > 0));

        const normalizedExistingColors = new Set(
          (variantGroupsForUpdate ?? []).map((g) => String(g?.color ?? '').trim().toLowerCase())
        );

        const staged = Array.isArray(pendingNewGroups) ? pendingNewGroups : [];
        const combinedNew = [...staged];
        if (hasInlineDraft) {
          combinedNew.push({ draft: newGroupDraft, files: newGroupImageFiles });
        }

        combinedNew.forEach((entry) => {
          const draft = entry?.draft ?? entry;
          const files = entry?.files ?? [];
          const color = String(draft?.color ?? '').trim();
          if (!color) return;
          const key = color.toLowerCase();
          if (normalizedExistingColors.has(key)) {
            throw new Error(`That color already exists: ${color}`);
          }
          const sizes = Array.isArray(draft?.sizes) ? draft.sizes : [];
          if (sizes.length === 0) throw new Error(`Add Color (${color}): add at least one size.`);
          const normalizedSizes = sizes.map((s) => ({
            size: String(s.size ?? '').trim(),
            price: Number(s.price),
            discount: s.applyDiscount ? (Number(s.discount) || 0) : 0,
            stockQuantity: Number(s.stockQuantity) || 0,
            isActive: s.isActive !== false,
          }));
          if (normalizedSizes.some((s) => !s.size)) throw new Error(`Add Color (${color}): each size needs a size value.`);
          if (normalizedSizes.some((s) => Number.isNaN(s.price) || s.price < 0)) throw new Error(`Add Color (${color}): each size needs a valid price.`);
          if (normalizedSizes.some((s) => s.stockQuantity < 0)) throw new Error(`Add Color (${color}): stock must be 0 or more.`);

          variantGroupsForUpdate = [...(variantGroupsForUpdate ?? []), { color, isActive: true, sizes: normalizedSizes }];
          imagesForRequest = [...imagesForRequest, files];
          normalizedExistingColors.add(key);
        });
      }
      const result = await adminProductService.updateProduct(
        product.id,
        {
          name: data.name,
          slug: data.slug?.trim() || undefined,
          description: data.description?.trim() || null,
          categoryId: Number(data.categoryId),
          brand: data.brand?.trim() || null,
          material: data.material?.trim() || null,
          isActive: data.isActive !== false,
          isFeatured: Boolean(data.isFeatured),
          isNewArrival: Boolean(data.isNewArrival),
          isTrending: Boolean(data.isTrending),
          ...(usingGroups && { variantGroups: variantGroupsForUpdate }),
        },
        imagesForRequest
      );
      const resolved = result?.data ?? result;
      setUpdatedProduct(resolved);
      if (Array.isArray(resolved?.variantGroups) && resolved.variantGroups.length > 0) {
        setGroupImageFiles(Array.from({ length: resolved.variantGroups.length }, () => []));
        setVariantImageFiles([]);
        setPendingNewGroups([]);
        setNewGroupDraft({
          color: '',
          isActive: true,
          sizes: [{ size: '', price: '', stockQuantity: '', isActive: true, applyDiscount: false, discount: '' }],
        });
        setNewGroupImageFiles([]);
      } else {
        setVariantImageFiles(Array((resolved?.variants || []).length).fill(null));
        setGroupImageFiles([]);
      }
    } catch (err) {
      setSubmitError(err?.message ?? 'Failed to update product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setVariantImages = (index, updater) => {
    setVariantImageFiles((prev) => {
      const next = [...prev];
      const current = Array.isArray(next[index]) ? next[index] : [];
      const updated = typeof updater === 'function' ? updater(current) : updater;
      next[index] = updated;
      return next;
    });
  };

  const setGroupImages = (index, updater) => {
    setGroupImageFiles((prev) => {
      const next = [...prev];
      const current = Array.isArray(next[index]) ? next[index] : [];
      const updated = typeof updater === 'function' ? updater(current) : updater;
      next[index] = updated;
      return next;
    });
  };

  const handleRemoveVariantImage = async (variantId, index, imageId) => {
    if (Array.isArray(variantImageFiles[index]) && variantImageFiles[index].length > 0) {
      setVariantImages(index, []);
      return;
    }
    const v = product?.variants?.[index];
    const existingUrl = v ? getVariantMainImageUrl(v) : null;
    if (!existingUrl || !product?.id) return;
    const key = imageId != null ? `${variantId}:${imageId}` : String(variantId);
    setRemovingVariantImageIds((prev) => new Set(prev).add(key));
    setSubmitError(null);
    try {
      await adminProductService.deleteVariantImage(product.id, variantId, imageId);
      const updated = await getProductBySlug(slug);
      setProduct(updated);
      setVariantImageFiles(Array.from({ length: (updated?.variants || []).length }, () => []));
    } catch (err) {
      setSubmitError(err?.message ?? 'Failed to remove variant image.');
    } finally {
      setRemovingVariantImageIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleDeleteGroupImage = async (groupId, imageId) => {
    if (!product?.id || !groupId || !imageId) return;
    const key = `g:${groupId}:${imageId}`;
    setRemovingVariantImageIds((prev) => new Set(prev).add(key));
    setSubmitError(null);
    try {
      await adminProductService.deleteVariantGroupImage(product.id, groupId, imageId);
      const updated = await getProductBySlug(slug);
      setProduct(updated);
      setGroupImageFiles(Array.from({ length: (updated?.variantGroups || []).length }, () => []));
    } catch (err) {
      setSubmitError(err?.message ?? 'Failed to delete image.');
    } finally {
      setRemovingVariantImageIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const openDeleteGroupDialog = (groupId, groupIndex) => {
    if (!product?.id || groupId == null) return;
    const groups = Array.isArray(product.variantGroups) ? product.variantGroups : [];
    if (groups.length <= 1) {
      showToast({
        title: 'Cannot remove',
        message: 'Add another color variant first. A product must keep at least one color.',
        variant: 'error',
      });
      return;
    }
    const label = String(groups[groupIndex]?.color ?? '').trim() || 'this color';
    setDeleteGroupConfirm({ groupId, groupIndex, label });
  };

  const closeDeleteGroupDialog = () => {
    if (deletingGroupId != null) return;
    setDeleteGroupConfirm(null);
  };

  const confirmDeleteVariantGroup = async () => {
    if (!deleteGroupConfirm || !product?.id) return;
    const { groupId, groupIndex, label } = deleteGroupConfirm;
    setDeletingGroupId(groupId);
    try {
      await adminProductService.deleteVariantGroup(product.id, groupId);
      showToast({
        title: 'Color variant removed',
        message: `"${label}" was deleted.`,
        variant: 'success',
      });
      setProduct((prev) => {
        if (!prev) return prev;
        const nextGroups = (Array.isArray(prev.variantGroups) ? prev.variantGroups : []).filter(
          (gg) => gg?.id !== groupId
        );
        return { ...prev, variantGroups: nextGroups };
      });
      setGroupDrafts((prev) => {
        const arr = Array.isArray(prev) ? [...prev] : [];
        arr.splice(groupIndex, 1);
        return arr;
      });
      setGroupImageFiles((prev) => {
        const arr = Array.isArray(prev) ? [...prev] : [];
        arr.splice(groupIndex, 1);
        return arr;
      });
      setDeleteGroupConfirm(null);
    } catch (err) {
      showToast({
        title: 'Delete failed',
        message: err?.message ?? 'Could not remove this color variant.',
        variant: 'error',
      });
    } finally {
      setDeletingGroupId(null);
    }
  };

  // Legacy add-variant flow removed (replaced by Add Color + Add size within group)

  const stageNewGroup = () => {
    setGroupDraftError(null);
    const color = String(newGroupDraft.color ?? '').trim();
    if (!color) {
      setGroupDraftError('Color is required.');
      return;
    }
    const sizes = Array.isArray(newGroupDraft.sizes) ? newGroupDraft.sizes : [];
    if (sizes.length === 0) {
      setGroupDraftError('Add at least one size.');
      return;
    }
    setPendingNewGroups((prev) => [...(Array.isArray(prev) ? prev : []), { draft: newGroupDraft, files: newGroupImageFiles }]);
    setNewGroupDraft({
      color: '',
      isActive: true,
      sizes: [{ size: '', price: '', stockQuantity: '', isActive: true, applyDiscount: false, discount: '' }],
    });
    setNewGroupImageFiles([]);
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary/30" aria-hidden />
        <p className="text-sm text-secondary">Loading product…</p>
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <p className="text-primary">{loadError ?? 'Product not found.'}</p>
        <Link
          to="/admin/products"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-secondary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to products
        </Link>
      </div>
    );
  }

  if (updatedProduct) {
    const p = updatedProduct;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-white shadow-xl shadow-black/5"
          >
            <div className="bg-green-50/50 p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 ring-8 ring-green-50">
                <CheckCircle className="h-8 w-8 text-green-600" strokeWidth={2} />
              </div>
              <h2 className="font-brand text-2xl text-primary">Update Successful</h2>
              <p className="mt-2 text-sm text-secondary">
                <span className="font-medium text-primary">{p.name}</span> has been updated.
              </p>
              {p.slug && (
                <p className="mt-1 font-mono text-xs text-tertiary">{p.slug}</p>
              )}
            </div>

            <div className="flex flex-col gap-3 bg-white p-6 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => navigate('/admin/products')}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-secondary hover:shadow-lg hover:shadow-primary/20 sm:w-auto"
              >
                <List className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                Product Management
              </button>
              <button
                type="button"
                onClick={() => {
                  setUpdatedProduct(null);
                  setVariantImageFiles(Array.from({ length: (product?.variants || []).length }, () => []));
                }}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-xs font-bold uppercase tracking-wider text-primary transition-all hover:border-primary hover:bg-primary/5 sm:w-auto"
              >
                <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                Continue Editing
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  const variantGroups = Array.isArray(product.variantGroups) ? product.variantGroups : [];
  const variants = Array.isArray(product.variants) ? product.variants : [];

  return (
    <div className="mx-auto max-w-5xl space-y-12">
      <div>
        <Link
          to="/admin/products"
          className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-secondary hover:text-primary mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Products
        </Link>
        <h1 className="font-brand text-xl text-primary">Edit product</h1>
        <p className="mt-0.5 text-xs text-secondary/70">
          Update product details and manage variants.
        </p>
      </div>

      <div className="grid gap-12 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-12">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
            <AnimatePresence>
              {submitError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div
                    role="alert"
                    className="rounded-md border border-red-100 bg-red-50 p-3 text-xs text-red-600"
                  >
                    {submitError}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Product details */}
            <section>
              <div className="mb-6 border-b border-border pb-4">
                <h2 className="text-lg font-medium text-primary">Product details</h2>
              </div>
              <div className="space-y-6">
                <div className="space-y-1">
                  <label htmlFor="edit-product-name" className="block text-xs font-medium uppercase tracking-wider text-secondary">
                    Name <span className="text-primary">*</span>
                  </label>
                  <input
                    id="edit-product-name"
                    type="text"
                    className={getInputClassName(errors.name)}
                    placeholder="e.g. Classic Oxford Shirt"
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label htmlFor="edit-product-slug" className="block text-xs font-medium uppercase tracking-wider text-secondary">
                    Slug <span className="normal-case tracking-normal text-tertiary">(optional)</span>
                  </label>
                  <input
                    id="edit-product-slug"
                    type="text"
                    className={getInputClassName(errors.slug)}
                    placeholder="classic-oxford-shirt"
                    {...register('slug')}
                  />
                  {errors.slug && (
                    <p className="mt-1 text-xs text-red-500">{errors.slug.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label htmlFor="edit-product-description" className="block text-xs font-medium uppercase tracking-wider text-secondary">
                    Description
                  </label>
                  <textarea
                    id="edit-product-description"
                    rows={3}
                    className={getInputClassName(errors.description)}
                    placeholder="Product description..."
                    {...register('description')}
                  />
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="edit-product-categoryId" className="block text-xs font-medium uppercase tracking-wider text-secondary">
                      Category <span className="text-primary">*</span>
                    </label>
                    <select
                      id="edit-product-categoryId"
                      className={getInputClassName(errors.categoryId)}
                      {...register('categoryId')}
                      disabled={categoriesLoading}
                    >
                      {categoriesLoading ? (
                        <option value="">Loading categories…</option>
                      ) : categoryOptions.length === 0 ? (
                        <option value="">No categories found</option>
                      ) : (
                        categoryOptions.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.depth > 0 ? '\u00A0'.repeat(cat.depth * 2) + '↳ ' : ''}{cat.name}
                          </option>
                        ))
                      )}
                    </select>
                    {errors.categoryId && (
                      <p className="mt-1 text-xs text-red-500">{errors.categoryId.message}</p>
                    )}
                  </div>
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="edit-product-brand" className="block text-xs font-medium uppercase tracking-wider text-secondary">
                      Brand
                    </label>
                    <input
                      id="edit-product-brand"
                      type="text"
                      className={getInputClassName(errors.brand)}
                      placeholder="e.g. AttireHub"
                      {...register('brand')}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="edit-product-material" className="block text-xs font-medium uppercase tracking-wider text-secondary">
                      Material
                    </label>
                    <input
                      id="edit-product-material"
                      type="text"
                      className={getInputClassName(errors.material)}
                      placeholder="e.g. Cotton"
                      {...register('material')}
                    />
                  </div>
                </div>
                <div className="border-t border-border pt-6">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-secondary">Status &amp; homepage</p>
                  <div className="flex flex-wrap gap-6">
                    <label className="flex cursor-pointer select-none items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-primary focus:ring-black"
                        {...register('isActive')}
                      />
                      <span className="text-sm text-primary">Active</span>
                    </label>
                    <label className="flex cursor-pointer select-none items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-primary focus:ring-black"
                        {...register('isFeatured')}
                      />
                      <span className="text-sm text-primary">Featured</span>
                    </label>
                    <label className="flex cursor-pointer select-none items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-primary focus:ring-black"
                        {...register('isNewArrival')}
                      />
                      <span className="text-sm text-primary">New Arrival</span>
                    </label>
                    <label className="flex cursor-pointer select-none items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-primary focus:ring-black"
                        {...register('isTrending')}
                      />
                      <span className="text-sm text-primary">Trending</span>
                    </label>
                  </div>
                </div>
              </div>
            </section>

            {/* Variant Groups / Variants */}
            <section>
              <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
                <h2 className="text-lg font-medium text-primary">Color Variants</h2>
                {variantGroups.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('add-color-group');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Color
                  </button>
                ) : null}
              </div>

              {variantGroups.length > 0 ? (
                <div className="space-y-5">
                  {variantGroups.map((g, groupIndex) => {
                    const pending = Array.isArray(groupImageFiles[groupIndex]) ? groupImageFiles[groupIndex] : [];
                    const existing = Array.isArray(g?.images)
                      ? g.images
                          .filter((img) => img && typeof img.imageUrl === 'string' && img.imageUrl.trim())
                          .slice(0, 5)
                      : [];
                    const groupDraft = Array.isArray(groupDrafts) ? groupDrafts[groupIndex] : undefined;
                    return (
                      <VariantGroupEditor
                        key={g.id ?? `${g.color}-${groupIndex}`}
                        group={g}
                        groupIndex={groupIndex}
                        totalGroups={variantGroups.length}
                        isSubmitting={isSubmitting}
                        pendingFiles={pending}
                        existingImages={existing}
                        removingKeys={removingVariantImageIds}
                        onDeleteImage={handleDeleteGroupImage}
                        onSetPendingFiles={setGroupImages}
                        groupDraft={groupDraft}
                        onDeleteSizeOption={async (groupId, sizeOptionId) => {
                          try {
                            await adminProductService.deleteSizeOption(product.id, groupId, sizeOptionId);
                            showToast({
                              title: 'Size deleted',
                              message: 'The size option was removed successfully.',
                              variant: 'success',
                            });
                            // keep local product state in sync so subsequent saves don't re-send the deleted row
                            setProduct((prev) => {
                              if (!prev) return prev;
                              const nextGroups = Array.isArray(prev.variantGroups) ? [...prev.variantGroups] : [];
                              const idx = nextGroups.findIndex((gg) => gg?.id === groupId);
                              if (idx === -1) return prev;
                              const gg = nextGroups[idx];
                              const nextSizeOptions = Array.isArray(gg?.sizeOptions)
                                ? gg.sizeOptions.filter((s) => s?.id !== sizeOptionId)
                                : [];
                              nextGroups[idx] = { ...gg, sizeOptions: nextSizeOptions };
                              return { ...prev, variantGroups: nextGroups };
                            });
                          } catch (err) {
                            showToast({
                              title: 'Delete failed',
                              message: err?.message ?? 'Failed to delete size option.',
                              variant: 'error',
                            });
                            throw err;
                          }
                        }}
                        onChangeGroupDraft={(updater) => {
                          setGroupDrafts((prev) => {
                            const arr = Array.isArray(prev) ? [...prev] : [];
                            const current = arr[groupIndex] ?? { groupId: g.id, color: g.color ?? '', isActive: true, sizes: [] };
                            const next = typeof updater === 'function' ? updater(current) : updater;
                            arr[groupIndex] = next;
                            return arr;
                          });
                        }}
                        onDeleteColorVariant={
                          g?.id != null ? () => openDeleteGroupDialog(g.id, groupIndex) : undefined
                        }
                        deleteColorDisabled={variantGroups.length <= 1}
                        isDeletingColorVariant={deletingGroupId === g.id}
                      />
                    );
                  })}

                  {/* Add color group (like Add Product) */}
                  <div
                    id="add-color-group"
                    className="relative space-y-4 rounded-2xl border border-dashed border-border/80 bg-gray-50/30 p-4 shadow-sm shadow-black/5"
                  >
                    <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/5 via-transparent to-transparent" />
                    <div className="relative flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-secondary">New color variant</p>
                        <h3 className="text-sm font-medium text-primary">Add color</h3>
                      </div>
                      <button
                        type="button"
                        onClick={stageNewGroup}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-secondary disabled:opacity-60"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add color
                      </button>
                    </div>
                    {groupDraftError && <p className="relative mt-2 text-xs text-red-600">{groupDraftError}</p>}
                    {pendingNewGroups.length > 0 && (
                      <p className="relative mt-2 text-[11px] text-tertiary">
                        {pendingNewGroups.length} color{pendingNewGroups.length > 1 ? 's' : ''} staged. Click <span className="font-medium text-primary">Save changes</span> to submit.
                      </p>
                    )}

                    <div className="relative flex flex-col gap-4">
                      {/* Color + Images */}
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium uppercase tracking-wider text-secondary">Color *</label>
                          <input
                            className={getInputClassName(false)}
                            placeholder="e.g. White"
                            value={newGroupDraft.color}
                            onChange={(e) => setNewGroupDraft((p) => ({ ...p, color: e.target.value }))}
                            disabled={isSubmitting}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-medium uppercase tracking-wider text-secondary">
                            Images <span className="normal-case tracking-normal text-tertiary">(up to 5)</span>
                          </label>

                          {newGroupImageFiles.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                              {newGroupImageFiles.map((file, fileIdx) => (
                                <div key={fileIdx} className="group relative h-16 w-16 shrink-0">
                                  <FilePreview file={file} className="h-16 w-16 rounded-lg object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => setNewGroupImageFiles((prev) => prev.filter((_, i) => i !== fileIdx))}
                                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white opacity-100 ring-1 ring-black/10 transition-opacity disabled:opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                                    aria-label="Remove image"
                                    disabled={isSubmitting}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {newGroupImageFiles.length < 5 && (
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/gif,image/webp"
                              multiple
                              className="w-full cursor-pointer text-xs text-secondary file:mr-2 file:cursor-pointer file:rounded-full file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-medium file:uppercase file:tracking-wider file:text-white hover:file:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                              onChange={(e) => {
                                const incoming = Array.from(e.target.files ?? []);
                                setNewGroupImageFiles((prev) => [...prev, ...incoming].slice(0, 5));
                                e.target.value = '';
                              }}
                              disabled={isSubmitting}
                            />
                          )}
                          <p className="mt-1 text-[10px] text-tertiary">{newGroupImageFiles.length} / 5 selected</p>
                        </div>
                      </div>

                      {/* Sizes */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-bold uppercase tracking-wider text-secondary">Sizes</p>
                          <button
                            type="button"
                            onClick={() =>
                              setNewGroupDraft((prev) => ({
                                ...prev,
                                sizes: [
                                  ...(Array.isArray(prev.sizes) ? prev.sizes : []),
                                  { size: '', price: '', stockQuantity: '', isActive: true, applyDiscount: false, discount: '' },
                                ],
                              }))
                            }
                            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary"
                            disabled={isSubmitting}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add size
                          </button>
                        </div>

                        <div className="space-y-3">
                          {(Array.isArray(newGroupDraft.sizes) ? newGroupDraft.sizes : []).map((s, idx) => (
                            <div key={idx} className="rounded-lg bg-white/70 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-xs font-medium text-secondary">Size {idx + 1}</p>
                                {(newGroupDraft.sizes?.length ?? 0) > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setNewGroupDraft((prev) => ({
                                        ...prev,
                                        sizes: prev.sizes.filter((_, i) => i !== idx),
                                      }))
                                    }
                                    className="rounded-full p-1.5 text-secondary hover:bg-red-50 hover:text-red-600"
                                    aria-label="Remove size"
                                    disabled={isSubmitting}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>

                              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                <input
                                  className={getInputClassName(false)}
                                  placeholder="Size (e.g. M)"
                                  value={s.size}
                                  onChange={(e) =>
                                    setNewGroupDraft((prev) => ({
                                      ...prev,
                                      sizes: prev.sizes.map((row, i) => (i === idx ? { ...row, size: e.target.value } : row)),
                                    }))
                                  }
                                  disabled={isSubmitting}
                                />
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className={getInputClassName(false)}
                                  placeholder="Price"
                                  value={s.price}
                                  onChange={(e) =>
                                    setNewGroupDraft((prev) => ({
                                      ...prev,
                                      sizes: prev.sizes.map((row, i) => (i === idx ? { ...row, price: e.target.value } : row)),
                                    }))
                                  }
                                  disabled={isSubmitting}
                                />
                                <input
                                  type="number"
                                  min="0"
                                  className={getInputClassName(false)}
                                  placeholder="Stock"
                                  value={s.stockQuantity}
                                  onChange={(e) =>
                                    setNewGroupDraft((prev) => ({
                                      ...prev,
                                      sizes: prev.sizes.map((row, i) => (i === idx ? { ...row, stockQuantity: e.target.value } : row)),
                                    }))
                                  }
                                  disabled={isSubmitting}
                                />
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-4">
                                <label className="flex cursor-pointer select-none items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={s.isActive !== false}
                                    onChange={(e) =>
                                      setNewGroupDraft((prev) => ({
                                        ...prev,
                                        sizes: prev.sizes.map((row, i) => (i === idx ? { ...row, isActive: e.target.checked } : row)),
                                      }))
                                    }
                                    disabled={isSubmitting}
                                    className="h-4 w-4 rounded border-border text-primary focus:ring-black"
                                  />
                                  <span className="text-xs text-primary">Active</span>
                                </label>
                                <label className="flex cursor-pointer select-none items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(s.applyDiscount)}
                                    onChange={(e) =>
                                      setNewGroupDraft((prev) => ({
                                        ...prev,
                                        sizes: prev.sizes.map((row, i) => (i === idx ? { ...row, applyDiscount: e.target.checked } : row)),
                                      }))
                                    }
                                    disabled={isSubmitting}
                                    className="h-4 w-4 rounded border-border text-primary focus:ring-black"
                                  />
                                  <span className="text-xs text-primary">Discount</span>
                                </label>
                                {s.applyDiscount && (
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className={getInputClassName(false)}
                                    placeholder="Discount"
                                    value={s.discount}
                                    onChange={(e) =>
                                      setNewGroupDraft((prev) => ({
                                        ...prev,
                                        sizes: prev.sizes.map((row, i) => (i === idx ? { ...row, discount: e.target.value } : row)),
                                      }))
                                    }
                                    disabled={isSubmitting}
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : variants.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-border bg-white">
                  <table className="w-full min-w-[640px] text-left text-sm table-fixed">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="w-20 shrink-0 px-3 py-3 text-xs font-medium uppercase tracking-wider text-secondary whitespace-nowrap">Image</th>
                        <th className="w-24 shrink-0 px-3 py-3 text-xs font-medium uppercase tracking-wider text-secondary whitespace-nowrap">SKU</th>
                        <th className="w-16 shrink-0 px-3 py-3 text-xs font-medium uppercase tracking-wider text-secondary whitespace-nowrap">Size</th>
                        <th className="w-20 shrink-0 px-3 py-3 text-xs font-medium uppercase tracking-wider text-secondary whitespace-nowrap">Color</th>
                        <th className="w-20 shrink-0 px-3 py-3 text-xs font-medium uppercase tracking-wider text-secondary whitespace-nowrap">Price</th>
                        <th className="w-16 shrink-0 px-3 py-3 text-xs font-medium uppercase tracking-wider text-secondary whitespace-nowrap">Stock</th>
                        <th className="min-w-[140px] px-3 py-3 text-xs font-medium uppercase tracking-wider text-secondary whitespace-nowrap">Upload</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v, index) => {
                        const existingImageUrl = getVariantMainImageUrl(v);
                        const pendingFiles = Array.isArray(variantImageFiles[index]) ? variantImageFiles[index] : [];
                        const existingImages = Array.isArray(v?.images)
                          ? v.images.filter((img) => img && typeof img.imageUrl === 'string' && img.imageUrl.trim()).slice(0, 5)
                          : [];
                        return (
                        <tr key={v.id} className="border-b border-border/50 last:border-0">
                          <td className="w-20 shrink-0 px-3 py-3 align-middle">
                            {pendingFiles.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {pendingFiles.slice(0, 5).map((file, fileIndex) => (
                                  <FilePreview
                                    // eslint-disable-next-line react/no-array-index-key
                                    key={fileIndex}
                                    file={file}
                                    className="h-10 w-10 rounded-lg border border-border object-cover shadow-sm"
                                  />
                                ))}
                              </div>
                            ) : existingImageUrl ? (
                              <img src={existingImageUrl} alt="" className="h-12 w-12 rounded-lg border border-border object-cover shadow-sm" />
                            ) : (
                              <span className="text-[10px] text-tertiary">—</span>
                            )}
                          </td>
                          <td className="w-24 shrink-0 px-3 py-3 font-mono text-primary text-xs truncate" title={v.sku ?? ''}>{v.sku ?? '—'}</td>
                          <td className="w-16 shrink-0 px-3 py-3 text-primary">{v.size ?? '—'}</td>
                          <td className="w-20 shrink-0 px-3 py-3 text-primary">{v.color ?? '—'}</td>
                          <td className="w-20 shrink-0 px-3 py-3 text-primary">
                            {typeof v.price === 'number' ? v.price.toLocaleString() : v.price ?? '—'}
                          </td>
                          <td className="w-16 shrink-0 px-3 py-3 text-primary">{v.stockQuantity ?? 0}</td>
                          <td className="min-w-[140px] px-3 py-3 align-top">
                            {/* Existing images (horizontal, scrollable) */}
                            {existingImages.length > 0 && pendingFiles.length === 0 && (
                              <div className="mb-2 w-full max-w-[220px] overflow-x-auto pb-1 scrollbar-hide sm:max-w-[280px]">
                                <div className="flex items-center gap-1.5">
                                {existingImages.map((img, imgIdx) => {
                                  const imgKey = `${v.id}:${img.id ?? imgIdx}`;
                                  const removing = removingVariantImageIds.has(imgKey);
                                  return (
                                    <div
                                      key={img.id ?? imgIdx}
                                      className="group relative h-9 w-9 shrink-0 sm:h-10 sm:w-10 lg:h-12 lg:w-12"
                                    >
                                      <img
                                        src={img.imageUrl}
                                        alt=""
                                        className={`h-full w-full rounded-lg border border-border object-cover shadow-sm transition-opacity ${
                                          removing ? 'opacity-60' : 'opacity-100'
                                        }`}
                                      />
                                      {removing && (
                                        <div className="absolute inset-0 grid place-items-center">
                                          <div className="grid h-6 w-6 place-items-center rounded-full bg-white/90 shadow ring-1 ring-border">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                          </div>
                                        </div>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveVariantImage(v.id, index, img.id)}
                                        disabled={isSubmitting || removing}
                                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white opacity-100 shadow transition-opacity disabled:opacity-60 sm:h-4 sm:w-4 sm:opacity-0 sm:group-hover:opacity-100"
                                        aria-label="Delete image"
                                      >
                                        <Trash2 className="h-3 w-3 sm:h-2.5 sm:w-2.5" />
                                      </button>
                                    </div>
                                  );
                                })}
                                </div>
                              </div>
                            )}

                            {pendingFiles.length > 0 && (
                              <div className="mb-2 flex flex-wrap gap-1.5">
                                {pendingFiles.map((file, fileIdx) => (
                                  <div key={fileIdx} className="group relative">
                                    <FilePreview file={file} className="h-10 w-10 rounded-lg border border-border object-cover shadow-sm" />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setVariantImages(index, (cur) =>
                                          cur.filter((_, i) => i !== fileIdx)
                                        )
                                      }
                                      className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                                      aria-label="Remove file"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            {pendingFiles.length < 5 && (
                              <label className="block">
                                <span className="sr-only">Upload images for {v.size} / {v.color}</span>
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/gif,image/webp"
                                  multiple
                                  className="w-full cursor-pointer text-xs text-secondary file:mr-2 file:cursor-pointer file:rounded-full file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-medium file:uppercase file:tracking-wider file:text-white hover:file:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                                  onChange={(e) => {
                                    const incoming = Array.from(e.target.files ?? []);
                                    setVariantImages(index, (current) => {
                                      const merged = [...current, ...incoming];
                                      return merged.slice(0, 5);
                                    });
                                    e.target.value = '';
                                  }}
                                  disabled={isSubmitting}
                                />
                              </label>
                            )}
                            <p className="mt-1 text-[10px] text-tertiary">
                              {pendingFiles.length > 0
                                ? `${pendingFiles.length} / 5 selected`
                                : 'Up to 5. JPEG, PNG, GIF, WebP'}
                            </p>
                            {existingImageUrl && pendingFiles.length === 0 && existingImages.length === 0 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveVariantImage(v.id, index)}
                                disabled={isSubmitting || removingVariantImageIds.has(String(v.id))}
                                className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-red-600 hover:text-red-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label={`Remove existing images for ${v.size} / ${v.color}`}
                              >
                                {removingVariantImageIds.has(String(v.id)) ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                                Remove existing
                              </button>
                            )}
                          </td>
                        </tr>
                      );})}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-secondary">No variants yet. Add one below.</p>
              )}

            </section>

            <div className="flex flex-wrap gap-3 border-t border-border pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {isSubmitting ? 'Saving…' : 'Save changes'}
              </button>
              <Link
                to="/admin/products"
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-primary transition-all hover:bg-gray-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border border-border bg-gray-50/50 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-brand text-lg text-primary">Edit product</h3>
            <p className="mt-2 text-sm leading-relaxed text-secondary/80">
              Change name, slug, price, category, and flags. Each variant has one image; use “Replace” to upload a new image (order matches variant order). Add new variants below.
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {deleteGroupConfirm && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="presentation"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDeleteGroupDialog}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              aria-hidden
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-color-variant-title"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-2xl"
            >
              <h3 id="delete-color-variant-title" className="font-brand text-lg text-primary">
                Remove color variant?
              </h3>
              <p className="mt-2 text-sm text-secondary">
                Delete{' '}
                <span className="font-medium text-primary">
                  &ldquo;{deleteGroupConfirm.label}&rdquo;
                </span>
                ? This removes all sizes and images for this color. This cannot be undone.
              </p>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeDeleteGroupDialog}
                  disabled={deletingGroupId != null}
                  className="rounded-full border border-border px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-primary hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteVariantGroup}
                  disabled={deletingGroupId != null}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {deletingGroupId != null ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : null}
                  {deletingGroupId != null ? 'Removing…' : 'Remove color'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
