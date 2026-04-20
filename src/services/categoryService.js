import { api } from './api';

const CATEGORIES_PATH = '/categories';

/**
 * Flatten category tree into a list of { id, name, depth } for dropdowns.
 * @param {Array<{ id: number, name: string, children?: Array }>} nodes
 * @param {number} depth
 * @returns {Array<{ id: number, name: string, depth: number }>}
 */
export function flattenCategories(nodes, depth = 0) {
  if (!Array.isArray(nodes)) return [];
  const result = [];
  for (const node of nodes) {
    if (node && typeof node.id === 'number' && typeof node.name === 'string') {
      result.push({ id: node.id, name: node.name, depth });
      if (Array.isArray(node.children) && node.children.length > 0) {
        result.push(...flattenCategories(node.children, depth + 1));
      }
    }
  }
  return result;
}

/**
 * Flatten category tree into a list of { id, name, slug, depth } for filter dropdowns.
 * @param {Array<{ id: number, name: string, slug?: string, children?: Array }>} nodes
 * @param {number} depth
 * @returns {Array<{ id: number, name: string, slug: string, depth: number }>}
 */
export function flattenCategoriesWithSlug(nodes, depth = 0) {
  if (!Array.isArray(nodes)) return [];
  const result = [];
  for (const node of nodes) {
    if (node && typeof node.id === 'number' && typeof node.name === 'string') {
      result.push({
        id: node.id,
        name: node.name,
        slug: typeof node.slug === 'string' ? node.slug : '',
        depth,
      });
      if (Array.isArray(node.children) && node.children.length > 0) {
        result.push(...flattenCategoriesWithSlug(node.children, depth + 1));
      }
    }
  }
  return result;
}

/**
 * Fetch all categories (tree). Response shape: { success, data: [ { id, name, slug, parentId, children } ] }
 * @returns {Promise<Array<{ id: number, name: string, slug: string, parentId: number | null, children: Array }>>}
 */
export async function getCategories() {
  const response = await api.get(CATEGORIES_PATH);
  const data = response?.data ?? response;
  return Array.isArray(data) ? data : [];
}
