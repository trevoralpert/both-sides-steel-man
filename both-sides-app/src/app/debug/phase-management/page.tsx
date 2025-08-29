/**
 * Phase 6 Task 6.3.1: Phase Management Testing Page
 * 
 * Complete demonstration and testing interface for phase management components
 * Accessible at /debug/phase-management for development and QA testing
 */

import { PhaseManagementDemo } from '@/components/debate-room';

export default function PhaseManagementPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <PhaseManagementDemo />
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Phase Management Demo | Both Sides',
  description: 'Interactive demonstration of debate phase management components'
};
