import { forwardRef, useImperativeHandle, useRef } from 'react';
import { motion } from 'framer-motion';
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const variantStyles = {
  default: 'bg-quaternary border-border text-primary',
  success: 'bg-quaternary border-green-600/50 text-primary',
  error: 'bg-quaternary border-red-600/50 text-primary',
  warning: 'bg-quaternary border-amber-600/50 text-primary',
};

const titleColor = {
  default: 'text-primary',
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-amber-600',
};

const iconColor = {
  default: 'text-secondary',
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-amber-600',
};

const variantIcons = {
  default: Info,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
};

const toastAnimation = {
  initial: { opacity: 0, y: 50, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 50, scale: 0.95 },
};

const Toaster = forwardRef(
  ({ defaultPosition = 'bottom-right' }, ref) => {
    const toastReference = useRef(null);

    useImperativeHandle(ref, () => ({
      show({
        title,
        message,
        variant = 'default',
        duration = 4000,
        position = defaultPosition,
        actions,
        onDismiss,
        highlightTitle,
      }) {
        const Icon = variantIcons[variant] ?? Info;

        toastReference.current = sonnerToast.custom(
          (toastId) => (
            <motion.div
              variants={toastAnimation}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={cn(
                'flex w-full max-w-xs items-center justify-between rounded-xl border p-3 shadow-md',
                variantStyles[variant]
              )}
            >
              <div className="flex items-start gap-2">
                <Icon
                  className={cn(
                    'mt-0.5 h-4 w-4 flex-shrink-0',
                    iconColor[variant]
                  )}
                />
                <div className="space-y-0.5">
                  {title && (
                    <h3
                      className={cn(
                        'text-xs font-medium leading-none',
                        titleColor[variant],
                        highlightTitle && 'text-green-600'
                      )}
                    >
                      {title}
                    </h3>
                  )}
                  <p className="text-xs text-secondary">{message}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {actions?.label && (
                  <Button
                    variant={actions.variant || 'outline'}
                    size="sm"
                    onClick={() => {
                      actions.onClick();
                      sonnerToast.dismiss(toastId);
                    }}
                    className={cn(
                      'cursor-pointer',
                      variant === 'success' &&
                        'border-green-600 text-green-600 hover:bg-green-600/10',
                      variant === 'error' &&
                        'border-red-600 text-red-600 hover:bg-red-600/10',
                      variant === 'warning' &&
                        'border-amber-600 text-amber-600 hover:bg-amber-600/10'
                    )}
                  >
                    {actions.label}
                  </Button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    sonnerToast.dismiss(toastId);
                    onDismiss?.();
                  }}
                  className="rounded-full p-1 text-secondary transition-colors hover:bg-tertiary/30 focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Dismiss notification"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </motion.div>
          ),
          { duration, position }
        );
      },
    }));

    return (
      <SonnerToaster
        position={defaultPosition}
        toastOptions={{ unstyled: true, className: 'flex justify-end' }}
      />
    );
  }
);

Toaster.displayName = 'Toaster';

export default Toaster;
