'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string;
    onValueChange?: (value: string) => void;
  }
>(({ className, value, onValueChange, children, ...props }, ref) => {
  return (
    <div
      className={cn('grid gap-2', className)}
      {...props}
      ref={ref}
      role="radiogroup"
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && typeof child.props === 'object' && child.props !== null) {
          return React.cloneElement(child as React.ReactElement<any>, {
            ...child.props,
            checked: (child.props as any).value === value,
            onSelect: onValueChange,
          });
        }
        return child;
      })}
    </div>
  );
});
RadioGroup.displayName = 'RadioGroup';

const RadioGroupItem = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    value: string;
    onSelect?: (value: string) => void;
  }
>(({ className, value, onSelect, onChange, ...props }, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e);
    if (e.target.checked) {
      onSelect?.(value);
    }
  };

  return (
    <input
      ref={ref}
      type="radio"
      value={value}
      className={cn(
        'aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      onChange={handleChange}
      {...props}
    />
  );
});
RadioGroupItem.displayName = 'RadioGroupItem';

export { RadioGroup, RadioGroupItem };
