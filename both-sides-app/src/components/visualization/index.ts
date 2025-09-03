/**
 * Data Visualization Components - Main Export
 * 
 * Task 7.5.4: Centralized exports for all data visualization and reporting components.
 * This provides interactive charts, graphs, and exportable reports for learning analytics.
 */

// Core Progress Visualization
export { 
  ProgressChart, 
  MultiMetricProgressChart, 
  CompactProgressChart 
} from './ProgressChart';

// Opinion Plasticity Visualization
export { PlasticityMap } from './PlasticityMap';

// Engagement Timeline
export { EngagementTimeline } from './EngagementTimeline';

// Comparative Analysis
export { ComparativeCharts } from './ComparativeCharts';

// Export and Reporting
export { ExportComponents } from './ExportComponents';

// Type definitions for external use
export interface VisualizationConfig {
  theme?: 'light' | 'dark' | 'auto';
  accessibility?: {
    highContrast?: boolean;
    screenReaderOptimized?: boolean;
    keyboardNavigation?: boolean;
    altTextGeneration?: boolean;
  };
  interactivity?: {
    enableDrillDown?: boolean;
    enableFiltering?: boolean;
    enableAnimation?: boolean;
    enableTooltips?: boolean;
  };
  export?: {
    enableQuickExport?: boolean;
    enableAdvancedExport?: boolean;
    defaultFormat?: 'pdf' | 'excel' | 'png' | 'csv';
    includeMetadata?: boolean;
  };
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
    pointRadius?: number;
    pointHoverRadius?: number;
  }>;
  metadata?: {
    title?: string;
    description?: string;
    source?: string;
    lastUpdated?: Date;
    confidenceLevel?: number;
  };
}

export interface VisualizationProps {
  config?: VisualizationConfig;
  data: ChartData | any;
  height?: number;
  width?: number;
  responsive?: boolean;
  className?: string;
  onDataPointClick?: (data: any) => void;
  onExport?: (format: string, data: any) => void;
}

/**
 * Accessibility Helper Functions
 * 
 * These functions ensure all visualizations meet WCAG 2.1 AA standards
 * and provide alternative access methods for screen readers.
 */
export const AccessibilityHelpers = {
  /**
   * Generate descriptive alt text for charts
   */
  generateAltText: (chartType: string, data: ChartData): string => {
    const { datasets, labels } = data;
    const totalDataPoints = datasets.reduce((sum, dataset) => sum + dataset.data.length, 0);
    const highestValue = Math.max(...datasets.flatMap(d => d.data));
    const lowestValue = Math.min(...datasets.flatMap(d => d.data));
    
    return `${chartType} showing ${datasets.length} data series with ${totalDataPoints} total points. ` +
           `Values range from ${lowestValue} to ${highestValue}. ` +
           `Data covers: ${labels.join(', ')}.`;
  },

  /**
   * Generate data table for screen readers
   */
  generateDataTable: (data: ChartData): string => {
    const { datasets, labels } = data;
    let table = 'Data table: ';
    
    // Headers
    table += 'Categories: ' + labels.join(', ') + '. ';
    
    // Data rows
    datasets.forEach(dataset => {
      table += `${dataset.label}: `;
      dataset.data.forEach((value, index) => {
        table += `${labels[index]}: ${value}, `;
      });
    });
    
    return table;
  },

  /**
   * Generate trend descriptions
   */
  generateTrendDescription: (data: number[]): string => {
    if (data.length < 2) return 'Insufficient data for trend analysis.';
    
    const first = data[0];
    const last = data[data.length - 1];
    const change = ((last - first) / first) * 100;
    
    if (Math.abs(change) < 5) return 'Data shows stable trend with minimal variation.';
    if (change > 0) return `Data shows upward trend with ${Math.round(change)}% increase.`;
    return `Data shows downward trend with ${Math.round(Math.abs(change))}% decrease.`;
  },

  /**
   * Ensure color contrast meets WCAG standards
   */
  validateColorContrast: (background: string, foreground: string): boolean => {
    // Simplified contrast checking - in a real app, use a proper contrast calculation library
    const bgLuminance = getLuminance(background);
    const fgLuminance = getLuminance(foreground);
    const contrast = (Math.max(bgLuminance, fgLuminance) + 0.05) / (Math.min(bgLuminance, fgLuminance) + 0.05);
    
    return contrast >= 4.5; // WCAG AA standard for normal text
  }
};

/**
 * Chart Configuration Presets
 * 
 * Pre-configured chart settings optimized for different use cases
 */
export const ChartPresets = {
  /**
   * Student Progress Chart - Optimized for individual learning tracking
   */
  studentProgress: {
    accessibility: {
      highContrast: false,
      screenReaderOptimized: true,
      keyboardNavigation: true,
      altTextGeneration: true
    },
    interactivity: {
      enableDrillDown: true,
      enableFiltering: true,
      enableAnimation: true,
      enableTooltips: true
    },
    export: {
      enableQuickExport: true,
      enableAdvancedExport: true,
      defaultFormat: 'pdf' as const,
      includeMetadata: true
    }
  },

  /**
   * Teacher Analytics - Optimized for class-level insights
   */
  teacherAnalytics: {
    accessibility: {
      highContrast: false,
      screenReaderOptimized: true,
      keyboardNavigation: true,
      altTextGeneration: true
    },
    interactivity: {
      enableDrillDown: true,
      enableFiltering: true,
      enableAnimation: false, // Less distracting for data analysis
      enableTooltips: true
    },
    export: {
      enableQuickExport: true,
      enableAdvancedExport: true,
      defaultFormat: 'excel' as const,
      includeMetadata: true
    }
  },

  /**
   * Presentation Mode - Optimized for sharing and presenting
   */
  presentation: {
    accessibility: {
      highContrast: true,
      screenReaderOptimized: true,
      keyboardNavigation: false,
      altTextGeneration: true
    },
    interactivity: {
      enableDrillDown: false,
      enableFiltering: false,
      enableAnimation: true,
      enableTooltips: false
    },
    export: {
      enableQuickExport: true,
      enableAdvancedExport: false,
      defaultFormat: 'png' as const,
      includeMetadata: false
    }
  },

  /**
   * Accessibility Mode - Maximum accessibility compliance
   */
  accessibility: {
    accessibility: {
      highContrast: true,
      screenReaderOptimized: true,
      keyboardNavigation: true,
      altTextGeneration: true
    },
    interactivity: {
      enableDrillDown: true,
      enableFiltering: true,
      enableAnimation: false,
      enableTooltips: true
    },
    export: {
      enableQuickExport: true,
      enableAdvancedExport: true,
      defaultFormat: 'csv' as const, // Most accessible format
      includeMetadata: true
    }
  }
};

/**
 * Data Validation Utilities
 */
export const DataValidation = {
  /**
   * Validate chart data structure
   */
  validateChartData: (data: ChartData): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!data.labels || data.labels.length === 0) {
      errors.push('Chart data must include labels');
    }
    
    if (!data.datasets || data.datasets.length === 0) {
      errors.push('Chart data must include at least one dataset');
    }
    
    data.datasets?.forEach((dataset, index) => {
      if (!dataset.label) {
        errors.push(`Dataset ${index} must have a label`);
      }
      
      if (!dataset.data || dataset.data.length === 0) {
        errors.push(`Dataset ${index} must contain data points`);
      }
      
      if (dataset.data && dataset.data.length !== data.labels.length) {
        errors.push(`Dataset ${index} data length must match labels length`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Sanitize data for security
   */
  sanitizeData: (data: any): any => {
    // Remove any potentially harmful properties
    const sanitized = JSON.parse(JSON.stringify(data));
    
    // Remove functions, undefined values, etc.
    return cleanObject(sanitized);
  }
};

// Helper functions
function getLuminance(color: string): number {
  // Simplified luminance calculation - in a real app, use a proper color library
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  const [rs, gs, bs] = [r, g, b].map(c => 
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function cleanObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(cleanObject);
  }
  
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && typeof value !== 'function') {
      cleaned[key] = cleanObject(value);
    }
  }
  
  return cleaned;
}
