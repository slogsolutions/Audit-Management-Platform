import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Modal({ 
  open, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showCloseButton = true 
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Blurred backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div 
        className={cn(
          "relative z-50 w-full rounded-2xl bg-white dark:bg-gray-900 shadow-2xl",
          "border border-white/20 flex flex-col max-h-[90vh]",
          "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-300",
          sizeClasses[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient header */}
        <div className="relative rounded-t-2xl bg-gradient-to-r from-blue-500 via-blue-600 to-teal-500 p-6 flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-teal-600/20 rounded-t-2xl" />
          <div className="relative flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 text-white border-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Modal body - scrollable */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
