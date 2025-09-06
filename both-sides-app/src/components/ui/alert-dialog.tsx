"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface AlertDialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface AlertDialogTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

interface AlertDialogContentProps {
  children: React.ReactNode
  className?: string
}

interface AlertDialogHeaderProps {
  children: React.ReactNode
  className?: string
}

interface AlertDialogTitleProps {
  children: React.ReactNode
  className?: string
}

const AlertDialog: React.FC<AlertDialogProps> = ({ children, open: externalOpen, onOpenChange }) => {
  const [internalOpen, setInternalOpen] = React.useState(false)
  
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen
  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
  }
  
  return (
    <div className="relative">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === AlertDialogTrigger) {
          return React.cloneElement(child, { onClick: () => handleOpenChange(true) })
        }
        if (React.isValidElement(child) && child.type === AlertDialogContent && isOpen) {
          return (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
              <div onClick={(e) => e.stopPropagation()}>
                {React.cloneElement(child, { onClose: () => handleOpenChange(false) })}
              </div>
            </div>
          )
        }
        return null
      })}
    </div>
  )
}

const AlertDialogTrigger: React.FC<AlertDialogTriggerProps> = ({ children }) => {
  return <div className="cursor-pointer">{children}</div>
}

const AlertDialogContent: React.FC<AlertDialogContentProps & { onClose?: () => void }> = ({ 
  children, 
  className, 
  onClose 
}) => {
  return (
    <div 
      className={cn(
        "bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4",
        className
      )}
    >
      {children}
      <div className="mt-4 flex justify-end gap-2">
        <button 
          onClick={onClose}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

const AlertDialogHeader: React.FC<AlertDialogHeaderProps> = ({ children, className }) => {
  return (
    <div className={cn("mb-4", className)}>
      {children}
    </div>
  )
}

const AlertDialogTitle: React.FC<AlertDialogTitleProps> = ({ children, className }) => {
  return (
    <h3 className={cn("text-lg font-semibold", className)}>
      {children}
    </h3>
  )
}

const AlertDialogAction: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string }> = ({ 
  children, 
  onClick, 
  className 
}) => (
  <button 
    onClick={onClick}
    className={cn("px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded", className)}
  >
    {children}
  </button>
)

const AlertDialogCancel: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string }> = ({ 
  children, 
  onClick, 
  className 
}) => (
  <button 
    onClick={onClick}
    className={cn("px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded", className)}
  >
    {children}
  </button>
)

const AlertDialogDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <p className={cn("text-sm text-gray-600 mt-2", className)}>
    {children}
  </p>
)

const AlertDialogFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <div className={cn("flex gap-2 justify-end mt-4 pt-4 border-t", className)}>
    {children}
  </div>
)

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter
}
