/** Display + API values (Spring-style enum names). */
export const PRODUCT_SOURCING_OPTIONS = [
  { value: 'CONSIGNMENT', label: 'Consignment' },
  { value: 'OWNED', label: 'Owned inventory' },
];

export const DEFAULT_PRODUCT_SOURCING_TYPE = 'CONSIGNMENT';

/**
 * @param {unknown} value
 * @returns {string | null}
 */
export function toApiSourcingType(value) {
  if (value == null) return null;
  const s = String(value).trim().toUpperCase();
  return s || null;
}
