import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, CheckCircle, Package, List, Loader2, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as adminProductService from '@/services/adminProductService';
import { getCategories, flattenCategories } from '@/services/categoryService';

/** Renders a preview of the selected file and revokes object URL on change/unmount */
function FilePreview({ file, className = 'h-20 w-20 rounded-lg object-cover' }) {
  const urlRef = useRef(null);
  const fileRef = useRef(null);
  if (fileRef.current !== file) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    fileRef.current = file;
    urlRef.current = file ? URL.createObjectURL(file) : null;
  }
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);
  if (!urlRef.current) return null;
  return <img src={urlRef.current} alt="Preview" className={className} />;
}

const sizeSchema = z.object({
  size: z.string().min(1, 'Size is required'),
  price: z.coerce.number().min(0, 'Price must be 0 or more'),
  stockQuantity: z.coerce.number().int().min(0, 'Stock must be 0 or more'),
  isActive: z.boolean().optional(),
  applyDiscount: z.boolean().optional(),
  discount: z.coerce.number().min(0).optional(),
});

const variantGroupSchema = z.object({
  color: z.string().min(1, 'Color is required'),
  isActive: z.boolean().optional(),
  sizes: z.array(sizeSchema).min(1, 'Add at least one size'),
});

const addProductSchema = z.object({
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
  variantGroups: z.array(variantGroupSchema).min(1, 'Add at least one color variant'),
});

function getInputClassName(error) {
  const base =
    'w-full rounded-none border-b border-border bg-transparent px-3 py-3 text-sm text-primary placeholder-tertiary outline-none transition-colors focus:border-black focus:ring-0';
  const normal = 'border-border focus:border-primary';
  const invalid = 'border-red-500 focus:border-red-500 text-red-600';
  return `${base} ${error ? invalid : normal}`;
}

function VariantGroupCard({
  control,
  register,
  watch,
  errors,
  index,
  totalGroups,
  isSubmitting,
  onRemove,
  groupImageFiles,
  setGroupImages,
}) {
  const { fields, append, remove } = useFieldArray({ control, name: `variantGroups.${index}.sizes` });
  const colorValue = watch(`variantGroups.${index}.color`);
  const files = Array.isArray(groupImageFiles) ? groupImageFiles : [];
  const isMulti = Number(totalGroups) > 1;
  const accent =
    index % 3 === 0 ? 'from-indigo-500/15 via-transparent to-transparent' :
    index % 3 === 1 ? 'from-emerald-500/15 via-transparent to-transparent' :
    'from-amber-500/18 via-transparent to-transparent';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`relative space-y-4 ${isMulti ? 'rounded-2xl border border-border/70 bg-white/60 p-4 shadow-sm shadow-black/5' : ''}`}
    >
      {isMulti ? (
        <div className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r ${accent}`} />
      ) : null}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-secondary">
            Color variant {index + 1}
            {colorValue ? <span className="ml-2 text-primary">({String(colorValue).trim()})</span> : null}
          </p>
          <p className="text-[10px] text-tertiary">Images are shared by all sizes in this color.</p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="relative rounded-full p-2 text-secondary transition-colors hover:bg-red-50 hover:text-red-600"
          aria-label={`Remove color group ${index + 1}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="relative flex flex-col gap-5">
        {/* Left: Color + Images */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium uppercase tracking-wider text-secondary">Color *</label>
            <input
              className={getInputClassName(errors?.variantGroups?.[index]?.color)}
              placeholder="e.g. White"
              {...register(`variantGroups.${index}.color`)}
            />
            {errors?.variantGroups?.[index]?.color && (
              <p className="mt-1 text-xs text-red-500">{errors.variantGroups[index].color.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium uppercase tracking-wider text-secondary">
              Images <span className="normal-case tracking-normal text-tertiary">(up to 5)</span>
            </label>

            {files.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {files.map((file, fileIdx) => (
                  <div key={fileIdx} className="group relative h-16 w-16 shrink-0">
                    <FilePreview file={file} className="h-16 w-16 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => setGroupImages(index, (cur) => cur.filter((_, i) => i !== fileIdx))}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white opacity-100 shadow transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label="Remove image"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {files.length < 5 && (
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                className="w-full text-xs text-secondary file:mr-2 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-xs file:font-medium file:text-white file:uppercase file:tracking-wider hover:file:bg-secondary"
                onChange={(e) => {
                  const incoming = Array.from(e.target.files ?? []);
                  setGroupImages(index, (cur) => [...cur, ...incoming].slice(0, 5));
                  e.target.value = '';
                }}
                disabled={isSubmitting}
              />
            )}
            <p className="mt-1 text-[10px] text-tertiary">{files.length} / 5 selected</p>
          </div>
        </div>

        {/* Right: Sizes (always visible) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-secondary">Sizes</p>
            <button
              type="button"
              onClick={() =>
                append({ size: '', price: 0, stockQuantity: 0, isActive: true, applyDiscount: false, discount: 0 })
              }
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary"
            >
              <Plus className="h-3.5 w-3.5" />
              Add size
            </button>
          </div>

          {errors?.variantGroups?.[index]?.sizes?.message && (
            <p className="text-xs text-red-500">{errors.variantGroups[index].sizes.message}</p>
          )}

          <div className="space-y-3">
            {fields.map((field, sizeIdx) => (
              <div key={field.id} className="rounded-lg bg-white/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-secondary">Size {sizeIdx + 1}</p>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(sizeIdx)}
                      className="rounded-full p-1.5 text-secondary hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove size"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-secondary">Size *</label>
                    <input
                      className={getInputClassName(errors?.variantGroups?.[index]?.sizes?.[sizeIdx]?.size)}
                      placeholder="e.g. M"
                      {...register(`variantGroups.${index}.sizes.${sizeIdx}.size`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-secondary">Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={getInputClassName(errors?.variantGroups?.[index]?.sizes?.[sizeIdx]?.price)}
                      {...register(`variantGroups.${index}.sizes.${sizeIdx}.price`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-secondary">Stock *</label>
                    <input
                      type="number"
                      min="0"
                      className={getInputClassName(errors?.variantGroups?.[index]?.sizes?.[sizeIdx]?.stockQuantity)}
                      {...register(`variantGroups.${index}.sizes.${sizeIdx}.stockQuantity`)}
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <label className="flex cursor-pointer select-none items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-primary focus:ring-black"
                      {...register(`variantGroups.${index}.sizes.${sizeIdx}.isActive`)}
                    />
                    <span className="text-xs text-primary">Active</span>
                  </label>
                  <label className="flex cursor-pointer select-none items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-primary focus:ring-black"
                      {...register(`variantGroups.${index}.sizes.${sizeIdx}.applyDiscount`)}
                    />
                    <span className="text-xs text-primary">Discount</span>
                  </label>
                  {watch(`variantGroups.${index}.sizes.${sizeIdx}.applyDiscount`) && (
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-secondary whitespace-nowrap">
                        Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className={getInputClassName(errors?.variantGroups?.[index]?.sizes?.[sizeIdx]?.discount)}
                        {...register(`variantGroups.${index}.sizes.${sizeIdx}.discount`)}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function AddProductPage() {
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdProduct, setCreatedProduct] = useState(null);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  /** Up to 5 image files per color group by index (matches variantGroups order) */
  const [groupImageFiles, setGroupImageFiles] = useState([]);
  const navigate = useNavigate();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(addProductSchema),
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
      variantGroups: [
        {
          color: '',
          isActive: true,
          sizes: [{ size: '', price: 0, stockQuantity: 0, isActive: true, applyDiscount: false, discount: 0 }],
        },
      ],
    },
  });

  const { fields: groupFields, append: appendGroup, remove: removeGroup } = useFieldArray({
    control,
    name: 'variantGroups',
  });

  const setGroupImages = (groupIndex, updater) => {
    setGroupImageFiles((prev) => {
      const next = [...prev];
      const current = Array.isArray(next[groupIndex]) ? next[groupIndex] : [];
      next[groupIndex] = typeof updater === 'function' ? updater(current) : updater;
      return next;
    });
  };

  useEffect(() => {
    getCategories()
      .then((tree) => {
        const flat = flattenCategories(tree);
        setCategoryOptions(flat);
        if (flat.length > 0) {
          setValue('categoryId', flat[0].id);
        }
      })
      .catch(() => setCategoryOptions([]))
      .finally(() => setCategoriesLoading(false));
  }, [setValue]);

  useEffect(() => {
    // Keep image state aligned to group count.
    setGroupImageFiles((prev) => {
      if (prev.length === groupFields.length) return prev;
      if (prev.length < groupFields.length) {
        return [...prev, ...Array.from({ length: groupFields.length - prev.length }, () => [])];
      }
      return prev.slice(0, groupFields.length);
    });
  }, [groupFields.length]);

  const onSubmit = async (data) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const groups = Array.isArray(data.variantGroups) ? data.variantGroups : [];
      const imagesForRequest = groups.map((_, idx) => (Array.isArray(groupImageFiles[idx]) ? groupImageFiles[idx] : []));
      const product = await adminProductService.createProduct(
        {
          ...data,
          description: data.description?.trim() || null,
          slug: data.slug?.trim() || undefined,
          brand: data.brand?.trim() || null,
          material: data.material?.trim() || null,
          variantGroups: groups.map((g) => ({
            color: String(g.color).trim(),
            isActive: g.isActive !== false,
            sizes: Array.isArray(g.sizes)
              ? g.sizes.map((s) => ({
                  size: s.size,
                  price: s.price,
                  stockQuantity: s.stockQuantity,
                  isActive: s.isActive !== false,
                  discount: s.applyDiscount ? (Number(s.discount) || 0) : 0,
                }))
              : [],
          })),
        },
        imagesForRequest
      );
      const resolved = product?.data ?? product;
      setCreatedProduct(resolved);
      setGroupImageFiles([]);
    } catch (err) {
      setSubmitError(err?.message ?? 'Failed to create product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-12">
      <div>
        <h1 className="font-brand text-xl text-primary">Add Product</h1>
        <p className="mt-0.5 text-xs text-secondary/70">
          Create a new product with color variants, images, and sizes.
        </p>
      </div>

      <div className="grid gap-12 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-12">
          {createdProduct ? (
            <div className="flex min-h-[50vh] flex-col items-center justify-center">
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
                    <h2 className="font-brand text-2xl text-primary">Product Created</h2>
                    <p className="mt-2 text-sm text-secondary">
                      <span className="font-medium text-primary">{createdProduct.name}</span> has been added to your catalog.
                    </p>
                    {createdProduct.slug && (
                      <p className="mt-1 font-mono text-xs text-tertiary">{createdProduct.slug}</p>
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
                        setCreatedProduct(null);
                        setGroupImageFiles([]);
                        reset();
                      }}
                      className="group inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-xs font-bold uppercase tracking-wider text-primary transition-all hover:border-primary hover:bg-primary/5 sm:w-auto"
                    >
                      <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                      Add Another Product
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
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

              {/* Product Details Section */}
              <section>
                <div className="mb-6 border-b border-border pb-4">
                  <h2 className="text-lg font-medium text-primary">Product Details</h2>
                </div>
                <div className="space-y-6">
                  <div className="space-y-1">
                    <label htmlFor="add-product-name" className="block text-xs font-medium uppercase tracking-wider text-secondary">
                      Name <span className="text-primary">*</span>
                    </label>
                    <input
                      id="add-product-name"
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
                    <label htmlFor="add-product-slug" className="block text-xs font-medium uppercase tracking-wider text-secondary">
                      Slug <span className="normal-case tracking-normal text-tertiary">(optional; generated from name if blank)</span>
                    </label>
                    <input
                      id="add-product-slug"
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
                    <label htmlFor="add-product-description" className="block text-xs font-medium uppercase tracking-wider text-secondary">
                      Description
                    </label>
                    <textarea
                      id="add-product-description"
                      rows={3}
                      className={getInputClassName(errors.description)}
                      placeholder="Product description..."
                      {...register('description')}
                    />
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label htmlFor="add-product-categoryId" className="block text-xs font-medium uppercase tracking-wider text-secondary">
                        Category <span className="text-primary">*</span>
                      </label>
                      <select
                        id="add-product-categoryId"
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
                      <label htmlFor="add-product-brand" className="block text-xs font-medium uppercase tracking-wider text-secondary">
                        Brand
                      </label>
                      <input
                        id="add-product-brand"
                        type="text"
                        className={getInputClassName(errors.brand)}
                        placeholder="e.g. AttireHub"
                        {...register('brand')}
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="add-product-material" className="block text-xs font-medium uppercase tracking-wider text-secondary">
                        Material
                      </label>
                      <input
                        id="add-product-material"
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

              {/* Variant Groups Section */}
              <section>
                <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
                  <h2 className="text-lg font-medium text-primary">Add Color Variants</h2>
                  <button
                    type="button"
                    onClick={() => {
                      appendGroup({
                        color: '',
                        isActive: true,
                        sizes: [{ size: '', price: 0, stockQuantity: 0, isActive: true, applyDiscount: false, discount: 0 }],
                      });
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:text-secondary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Color
                  </button>
                </div>
                {errors.variantGroups?.message && (
                  <p className="mb-4 text-xs text-red-500">{errors.variantGroups.message}</p>
                )}

                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {groupFields.map((field, index) => (
                      <VariantGroupCard
                        key={field.id}
                        control={control}
                        register={register}
                        watch={watch}
                        errors={errors}
                        index={index}
                        totalGroups={groupFields.length}
                        isSubmitting={isSubmitting}
                        onRemove={() => removeGroup(index)}
                        groupImageFiles={groupImageFiles[index] ?? []}
                        setGroupImages={setGroupImages}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>

              <div className="flex flex-wrap gap-3 border-t border-border pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {isSubmitting ? 'Creating…' : 'Create Product'}
                </button>
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-primary transition-all hover:bg-gray-50"
                >
                  Cancel
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border border-border bg-gray-50/50 p-6">
            <h3 className="font-brand text-lg text-primary">Tips</h3>
            <p className="mt-2 text-sm leading-relaxed text-secondary/80">
              Add at least one color variant. Each color has up to 5 images (shared across sizes), and each size row can have its own price and stock.
            </p>
            <div className="mt-6 flex items-start gap-3 text-sm text-primary">
              <Lightbulb className="h-5 w-5 shrink-0 text-primary/60" />
              <span className="text-secondary/80">
                Featured, New Arrival, and Trending products may appear on the homepage and collection highlights.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
