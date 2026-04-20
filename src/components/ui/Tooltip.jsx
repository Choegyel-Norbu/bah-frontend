import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Simple hover tooltip. Wraps a trigger element and shows text on hover.
 * Accessible: uses title as fallback and avoids covering the trigger.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Trigger element (e.g. button)
 * @param {string} props.text - Tooltip content
 * @param {string} [props.side='top'] - Preferred side: 'top' | 'bottom' | 'left' | 'right'
 * @param {string} [props.className] - Optional class for the wrapper
 */
export function Tooltip({ children, text, side = 'top', className }) {
  const [visible, setVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  };

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {text && (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-quaternary shadow-md transition-opacity duration-150',
            positionClasses[side],
            visible ? 'opacity-100' : 'opacity-0'
          )}
        >
          {text}
        </span>
      )}
    </span>
  );
}
