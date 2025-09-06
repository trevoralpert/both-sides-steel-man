'use client';

/**
 * Phase 6 Task 6.1.1: Responsive Layout Component
 * 
 * Handles mobile/desktop layout management with collapsible sidebar
 * Optimized for different screen sizes with smooth transitions
 */

import React, { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import { ResponsiveLayoutProps } from '@/types/debate';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Sidebar, 
  SidebarClose, 
  X, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

interface BreakpointHook {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

// Custom hook for responsive breakpoints
function useBreakpoint(): BreakpointHook {
  const [breakpoint, setBreakpoint] = useState<BreakpointHook>({
    isMobile: false,
    isTablet: false,
    isDesktop: true
  });

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      setBreakpoint({
        isMobile: width < 768,   // < md
        isTablet: width >= 768 && width < 1024, // md to lg
        isDesktop: width >= 1024  // >= lg
      });
    };

    // Initial check
    updateBreakpoint();

    // Listen for resize events
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
}

interface SidebarToggleProps {
  isVisible: boolean;
  onToggle: () => void;
  isMobile: boolean;
  className?: string;
}

function SidebarToggle({ isVisible, onToggle, isMobile, className }: SidebarToggleProps) {
  const IconComponent = isMobile 
    ? (isVisible ? X : Sidebar)
    : (isVisible ? ChevronRight : ChevronLeft);
  
  const label = isMobile
    ? (isVisible ? 'Close sidebar' : 'Open sidebar')
    : (isVisible ? 'Hide coaching' : 'Show coaching');

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className={cn(
        "h-8 w-8 p-0",
        "hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary",
        className
      )}
      aria-label={label}
      title={label}
    >
      <IconComponent className="h-4 w-4" />
    </Button>
  );
}

export function ResponsiveLayout({
  children,
  sidebar,
  sidebarVisible = true,
  onToggleSidebar,
  className
}: ResponsiveLayoutProps) {
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  const [sidebarWidth, setSidebarWidth] = useState(320);

  // Adjust sidebar visibility behavior based on screen size
  const shouldShowSidebar = sidebarVisible && (isDesktop || (isMobile && sidebarVisible));
  const sidebarAsOverlay = isMobile || isTablet;

  // Handle escape key to close sidebar on mobile
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarAsOverlay && sidebarVisible && onToggleSidebar) {
        onToggleSidebar();
      }
    };

    if (sidebarAsOverlay && sidebarVisible) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [sidebarAsOverlay, sidebarVisible, onToggleSidebar]);

  // Prevent scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarAsOverlay && sidebarVisible) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [sidebarAsOverlay, sidebarVisible]);

  return (
    <div 
      className={cn(
        "relative flex flex-1 overflow-hidden",
        className
      )}
    >
      {/* Main Content Area */}
      <div 
        className={cn(
          "flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
          // Desktop sidebar spacing
          !sidebarAsOverlay && shouldShowSidebar && "mr-80",
          // Mobile blur when sidebar is open
          sidebarAsOverlay && shouldShowSidebar && "blur-sm"
        )}
      >
        {/* Toggle Button - Positioned in content area */}
        <div className="flex justify-end p-2 border-b">
          {onToggleSidebar && (
            <SidebarToggle
              isVisible={sidebarVisible}
              onToggle={onToggleSidebar}
              isMobile={isMobile}
            />
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>

      {/* Sidebar Overlay (Mobile/Tablet) */}
      {sidebarAsOverlay && shouldShowSidebar && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={onToggleSidebar}
            aria-hidden="true"
          />
          
          {/* Sidebar */}
          <Card 
            className={cn(
              "fixed top-0 right-0 bottom-0 z-50 w-80 max-w-[calc(100vw-2rem)]",
              "transform transition-transform duration-300 ease-in-out",
              "border-l border-t-0 border-r-0 border-b-0 rounded-none",
              "shadow-xl"
            )}
            role="dialog"
            aria-modal="true"
            aria-label="AI Coaching Sidebar"
          >
            <div className="flex flex-col h-full">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-semibold text-sm">AI Coaching</h2>
                {onToggleSidebar && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleSidebar}
                    className="h-6 w-6 p-0"
                    aria-label="Close sidebar"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {/* Sidebar Content */}
              <div className="flex-1 overflow-y-auto">
                {sidebar}
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Fixed Sidebar (Desktop) */}
      {!sidebarAsOverlay && shouldShowSidebar && (
        <Card 
          className={cn(
            "fixed top-[73px] right-0 bottom-0 w-80 z-30",
            "border-l border-t-0 border-r-0 border-b-0 rounded-none",
            "transform transition-transform duration-300 ease-in-out"
          )}
          style={{ 
            transform: shouldShowSidebar ? 'translateX(0)' : 'translateX(100%)' 
          }}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-sm">AI Coaching</h2>
            </div>
            
            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto">
              {sidebar}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default ResponsiveLayout;
