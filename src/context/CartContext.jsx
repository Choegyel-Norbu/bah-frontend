import { createContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import * as cartService from '@/services/cartService';

// eslint-disable-next-line react-refresh/only-export-components
export const CartContext = createContext(undefined);

const emptyCartState = {
  cartId: null,
  items: [],
  totalItems: 0,
  subtotal: 0,
  discount: 0,
  total: 0,
  appliedCoupon: null,
};

function applyCartToState(data) {
  return {
    ...emptyCartState,
    cartId: data?.id ?? null,
    items: data?.items ?? [],
    totalItems: data?.totalItems ?? 0,
    subtotal: data?.subtotal ?? 0,
    total: data?.subtotal ?? 0,
  };
}

export const CartProvider = ({ children }) => {
  const [state, setState] = useState(emptyCartState);

  const fetchCart = useCallback(async () => {
    try {
      const data = await cartService.getCart();
      if (data) setState(applyCartToState(data));
      else setState(emptyCartState);
    } catch {
      setState(emptyCartState);
    }
  }, []);

  const clearCartState = useCallback(() => {
    setState(emptyCartState);
  }, []);

  const addToCart = async (variantId, quantity) => {
    const addedQty = Math.max(1, Number(quantity) || 1);
    const data = await cartService.addCartItem(variantId, quantity);
    setState((prev) => {
      const next = { ...prev, ...applyCartToState(data) };
      // Ensure navbar count updates: use response totalItems or optimistic prev + added
      if (next.totalItems <= 0 && addedQty > 0) {
        next.totalItems = prev.totalItems + addedQty;
      }
      return next;
    });
  };

  const updateQuantity = async (itemId, quantity) => {
    const data = await cartService.updateCartItem(itemId, quantity);
    setState((prev) => ({
      ...prev,
      ...applyCartToState(data),
    }));
  };

  const removeFromCart = async (itemId) => {
    try {
      const data = await cartService.removeCartItem(itemId);
      setState((prev) => ({
        ...prev,
        ...applyCartToState(data),
      }));
    } catch {
      await fetchCart();
    }
  };

  const applyCoupon = async (code) => {
    console.log('Applying coupon', code);
  };

  const removeCoupon = async () => {
    console.log('Removing coupon');
  };

  const clearCart = async () => {
    try {
      await cartService.clearCart();
      setState(emptyCartState);
    } catch (err) {
      throw err;
    }
  };

  return (
    <CartContext.Provider 
      value={{ 
        ...state, 
        fetchCart,
        clearCartState,
        addToCart, 
        updateQuantity, 
        removeFromCart, 
        applyCoupon, 
        removeCoupon,
        clearCart 
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

CartProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
