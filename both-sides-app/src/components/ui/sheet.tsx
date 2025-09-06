'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

interface SheetContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue>({
  open: false,
  setOpen: () => {},
});

const Sheet: React.FC<{
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}> = ({ children, open = false, onOpenChange }) => {
  const [internalOpen, setInternalOpen] = React.useState(open);

  const setOpen = (newOpen: boolean) => {
    setInternalOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  React.useEffect(() => {
    setInternalOpen(open);
  }, [open]);

  return (
    <SheetContext.Provider value={{ open: internalOpen, setOpen }}>
      {children}
    </SheetContext.Provider>
  );
};

const SheetTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<'button'>
>(({ className, onClick, ...props }, ref) => {
  const { setOpen } = React.useContext(SheetContext);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    setOpen(true);
  };

  return (
    <button
      ref={ref}
      className={cn(className)}
      onClick={handleClick}
      {...props}
    />
  );
});
SheetTrigger.displayName = 'SheetTrigger';

const SheetContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    side?: 'top' | 'right' | 'bottom' | 'left';
  }
>(({ side = 'right', className, children, ...props }, ref) => {
  const { open, setOpen } = React.useContext(SheetContext);

  if (!open) return null;

  const sideClasses = {
    top: 'top-0 left-0 right-0 border-b',
    right: 'top-0 right-0 bottom-0 border-l',
    bottom: 'bottom-0 left-0 right-0 border-t', 
    left: 'top-0 left-0 bottom-0 border-r',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      
      {/* Sheet Content */}
      <div
        ref={ref}
        className={cn(
          'fixed z-50 bg-background p-6 shadow-lg transition ease-in-out',
          'sm:max-w-sm',
          sideClasses[side],
          className
        )}
        {...props}
      >
        {children}
      </div>
    </>
  );
});
SheetContent.displayName = 'SheetContent';

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-2 text-center sm:text-left',
      className
    )}
    {...props}
  />
);
SheetHeader.displayName = 'SheetHeader';

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className
    )}
    {...props}
  />
);
SheetFooter.displayName = 'SheetFooter';

const SheetTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold text-foreground', className)}
    {...props}
  />
));
SheetTitle.displayName = 'SheetTitle';

const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
SheetDescription.displayName = 'SheetDescription';

export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
