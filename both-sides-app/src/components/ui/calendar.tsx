'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface CalendarProps {
  mode?: 'single' | 'multiple' | 'range';
  selected?: Date | Date[] | { from: Date; to?: Date } | null;
  onSelect?: (date: Date | Date[] | { from: Date; to?: Date } | undefined) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
  initialFocus?: boolean;
}

const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(
  ({ className, mode = 'single', selected, onSelect, disabled, ...props }, ref) => {
    const [currentDate, setCurrentDate] = React.useState(new Date());

    const getDaysInMonth = (date: Date) => {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
      return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const handleDateClick = (day: number) => {
      const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      
      if (disabled?.(clickedDate)) return;
      
      if (mode === 'single') {
        onSelect?.(clickedDate);
      }
    };

    const isSelected = (day: number) => {
      if (!selected) return false;
      
      const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      
      if (mode === 'single' && selected instanceof Date) {
        return (
          dayDate.getDate() === selected.getDate() &&
          dayDate.getMonth() === selected.getMonth() &&
          dayDate.getFullYear() === selected.getFullYear()
        );
      }
      
      return false;
    };

    const previousMonth = () => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return (
      <div className={cn('p-3', className)} ref={ref} {...props}>
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={previousMonth}
            className="h-7 w-7 p-0"
          >
            &larr;
          </Button>
          <div className="text-sm font-medium">
            {months[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={nextMonth}
            className="h-7 w-7 p-0"
          >
            &rarr;
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className="text-xs font-medium text-muted-foreground text-center py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {emptyDays.map((_, index) => (
            <div key={`empty-${index}`} className="h-8" />
          ))}
          {days.map((day) => (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              className={cn(
                'h-8 w-8 text-sm rounded-md hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring',
                isSelected(day) && 'bg-primary text-primary-foreground',
                disabled?.(new Date(currentDate.getFullYear(), currentDate.getMonth(), day)) &&
                  'opacity-50 cursor-not-allowed'
              )}
              disabled={disabled?.(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
    );
  }
);

Calendar.displayName = 'Calendar';

export { Calendar };
