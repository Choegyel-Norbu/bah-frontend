import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

/**
 * Redirects /search?q=... to /products?search=... so product list handles search.
 * Keeps /search route working for bookmarks and legacy links.
 */
export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get('q')?.trim();

  useEffect(() => {
    if (q) {
      navigate(`/products?search=${encodeURIComponent(q)}`, { replace: true });
    } else {
      navigate('/products', { replace: true });
    }
  }, [q, navigate]);

  return null;
}
