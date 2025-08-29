/**
 * Phase 6 Task 6.3.2: Turn Management Testing Page
 * 
 * Complete demonstration and testing interface for turn management components
 * Accessible at /debug/turn-management for development and QA testing
 */

import { TurnManagementDemo } from '@/components/debate-room';

export default function TurnManagementPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <TurnManagementDemo />
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Turn Management Demo | Both Sides',
  description: 'Interactive demonstration of debate turn management and speaking order components'
};
