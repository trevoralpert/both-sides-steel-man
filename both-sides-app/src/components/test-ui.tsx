'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function TestUI() {
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Both Sides UI Test</CardTitle>
          <CardDescription>
            Testing shadcn/ui components integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="test-input" className="text-sm font-medium">
              Test Input
            </label>
            <Input
              id="test-input"
              placeholder="Type something..."
              className="w-full"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="default">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              ✅ Tailwind CSS classes working
              <br />
              ✅ shadcn/ui components rendering
              <br />✅ Design system variables applied
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
