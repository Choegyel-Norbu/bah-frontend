import { createContext, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import Toaster from '@/components/ui/toast';

export const ToastContext = createContext(undefined);

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.position]
 */
export function ToastProvider({ children, position = 'bottom-right' }) {
  const toasterRef = useRef(null);

  const show = useCallback((options) => {
    toasterRef.current?.show(options);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <Toaster ref={toasterRef} defaultPosition={position} />
    </ToastContext.Provider>
  );
}

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired,
  position: PropTypes.oneOf([
    'top-left',
    'top-center',
    'top-right',
    'bottom-left',
    'bottom-center',
    'bottom-right',
  ]),
};
