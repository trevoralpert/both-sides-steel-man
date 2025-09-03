/**
 * Learning Goals Component
 * 
 * Task 7.5.1: Displays and manages personalized learning goals, milestones,
 * and progress tracking with goal setting and achievement celebration.
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Target, 
  Plus, 
  Calendar as CalendarIcon,
  CheckCircle2, 
  Clock, 
  Trophy,
  TrendingUp,
  Flag,
  Edit,
  Trash2,
  Star,
  Zap,
  Brain,
  MessageSquare,
  Users,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface LearningGoal {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  progress: number;
  competency: string;
  milestones: string[];
  priority: 'high' | 'medium' | 'low';
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Recommendation {
  id: string;
  type: 'skill_focus' | 'practice' | 'resource' | 'challenge';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  expectedImpact: string;
  competencies?: string[];
}

interface LearningGoalsProps {
  goals: LearningGoal[];
  recommendations: Recommendation[];
  className?: string;
}

export function LearningGoals({ goals, recommendations, className }: LearningGoalsProps) {
  const [selectedGoal, setSelectedGoal] = useState<LearningGoal | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Categorize goals
  const activeGoals = goals.filter(goal => goal.isActive && goal.progress < 1);
  const completedGoals = goals.filter(goal => goal.progress >= 1);
  const pausedGoals = goals.filter(goal => !goal.isActive && goal.progress < 1);

  // Sort goals by priority and progress
  const sortedActiveGoals = [...activeGoals].sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    return priorityWeight[b.priority] - priorityWeight[a.priority];
  });

  const handleCreateGoal = (goalData: Partial<LearningGoal>) => {
    // In a real app, this would make an API call
    console.log('Creating goal:', goalData);
    setShowCreateDialog(false);
  };

  const handleUpdateGoal = (goalId: string, updates: Partial<LearningGoal>) => {
    // In a real app, this would make an API call
    console.log('Updating goal:', goalId, updates);
    setShowEditDialog(false);
    setSelectedGoal(null);
  };

  const handleDeleteGoal = (goalId: string) => {
    // In a real app, this would make an API call
    console.log('Deleting goal:', goalId);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Create Goal Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Learning Goals</h2>
          <p className="text-muted-foreground">
            Set and track your learning objectives
          </p>
        </div>
        <CreateGoalDialog
          recommendations={recommendations}
          onCreateGoal={handleCreateGoal}
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />
      </div>

      {/* Goals Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{activeGoals.length}</div>
                <div className="text-xs text-muted-foreground">Active Goals</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{completedGoals.length}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">
                  {Math.round(
                    activeGoals.reduce((sum, goal) => sum + goal.progress, 0) / 
                    Math.max(activeGoals.length, 1) * 100
                  )}%
                </div>
                <div className="text-xs text-muted-foreground">Avg Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Goals */}
      {sortedActiveGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Active Goals</span>
              <Badge variant="secondary">{sortedActiveGoals.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedActiveGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={() => {
                  setSelectedGoal(goal);
                  setShowEditDialog(true);
                }}
                onDelete={() => handleDeleteGoal(goal.id)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommended Goals */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Suggested Goals</span>
              <Badge variant="outline">{recommendations.length}</Badge>
            </CardTitle>
            <CardDescription>
              AI-generated goal suggestions based on your learning profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.slice(0, 3).map((recommendation) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                onCreateGoal={(goalData) => handleCreateGoal(goalData)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5" />
              <span>Completed Goals</span>
              <Badge variant="secondary">{completedGoals.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedGoals.slice(0, 4).map((goal) => (
                <CompletedGoalCard key={goal.id} goal={goal} />
              ))}
            </div>
            {completedGoals.length > 4 && (
              <div className="text-center mt-4">
                <Button variant="outline" size="sm">
                  View All Completed Goals
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {activeGoals.length === 0 && completedGoals.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No Learning Goals Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set your first learning goal to start tracking your progress
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Goal Dialog */}
      {selectedGoal && (
        <EditGoalDialog
          goal={selectedGoal}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onUpdateGoal={(updates) => handleUpdateGoal(selectedGoal.id, updates)}
        />
      )}
    </div>
  );
}

interface GoalCardProps {
  goal: LearningGoal;
  onEdit: () => void;
  onDelete: () => void;
}

function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const daysUntilTarget = Math.ceil(
    (goal.targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-blue-500 bg-blue-50';
      case 'low': return 'border-l-green-500 bg-green-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  return (
    <div className={`border-l-4 rounded-lg p-4 ${getPriorityColor(goal.priority)}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-sm mb-1">{goal.title}</h3>
          <p className="text-xs text-muted-foreground mb-2">{goal.description}</p>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {goal.category}
            </Badge>
            <Badge 
              variant={goal.priority === 'high' ? 'destructive' : 'secondary'} 
              className="text-xs"
            >
              {goal.priority} priority
            </Badge>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Progress</span>
            <span className="font-medium">{Math.round(goal.progress * 100)}%</span>
          </div>
          <Progress value={goal.progress * 100} className="h-2" />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <CalendarIcon className="h-3 w-3" />
            <span>
              {daysUntilTarget > 0 ? `${daysUntilTarget} days left` : 'Overdue'}
            </span>
          </div>
          <span>Target: {goal.targetDate.toLocaleDateString()}</span>
        </div>

        {goal.milestones.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-medium">Milestones:</span>
            <div className="flex flex-wrap gap-1">
              {goal.milestones.slice(0, 3).map((milestone, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {milestone}
                </Badge>
              ))}
              {goal.milestones.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{goal.milestones.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  onCreateGoal: (goalData: Partial<LearningGoal>) => void;
}

function RecommendationCard({ recommendation, onCreateGoal }: RecommendationCardProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'skill_focus': return <Brain className="h-4 w-4" />;
      case 'practice': return <Zap className="h-4 w-4" />;
      case 'resource': return <BookOpen className="h-4 w-4" />;
      case 'challenge': return <TrendingUp className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const handleCreateFromRecommendation = () => {
    onCreateGoal({
      title: recommendation.title,
      description: recommendation.description,
      competency: recommendation.competencies?.[0] || '',
      category: recommendation.type.replace('_', ' '),
      priority: recommendation.priority,
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      progress: 0,
      isActive: true,
      milestones: []
    });
  };

  return (
    <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex-shrink-0 mt-0.5">
            {getTypeIcon(recommendation.type)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm mb-1">{recommendation.title}</h4>
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {recommendation.description}
            </p>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {recommendation.type.replace('_', ' ')}
              </Badge>
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                {recommendation.estimatedTime}
              </div>
            </div>
          </div>
        </div>
        <Button size="sm" onClick={handleCreateFromRecommendation}>
          <Plus className="h-4 w-4 mr-2" />
          Set as Goal
        </Button>
      </div>
    </div>
  );
}

interface CompletedGoalCardProps {
  goal: LearningGoal;
}

function CompletedGoalCard({ goal }: CompletedGoalCardProps) {
  return (
    <div className="border rounded-lg p-4 bg-green-50 border-green-200">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-medium text-sm mb-1">{goal.title}</h4>
          <p className="text-xs text-muted-foreground">{goal.description}</p>
        </div>
        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
      </div>
      
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">
          {goal.category}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Completed {goal.updatedAt.toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

interface CreateGoalDialogProps {
  recommendations: Recommendation[];
  onCreateGoal: (goalData: Partial<LearningGoal>) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateGoalDialog({ recommendations, onCreateGoal, open, onOpenChange }: CreateGoalDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    competency: '',
    category: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    milestones: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateGoal({
      ...formData,
      milestones: formData.milestones.split(',').map(m => m.trim()).filter(Boolean),
      progress: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      competency: '',
      category: '',
      priority: 'medium',
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      milestones: ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Goal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Learning Goal</DialogTitle>
          <DialogDescription>
            Set a new learning objective to track your progress
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Goal Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Improve critical thinking skills"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what you want to achieve..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select 
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical_thinking">Critical Thinking</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="research">Research Skills</SelectItem>
                  <SelectItem value="social_skills">Social Skills</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Target Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.targetDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.targetDate ? format(formData.targetDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.targetDate}
                  onSelect={(date) => date && setFormData(prev => ({ ...prev, targetDate: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="milestones">Milestones (optional)</Label>
            <Textarea
              id="milestones"
              value={formData.milestones}
              onChange={(e) => setFormData(prev => ({ ...prev, milestones: e.target.value }))}
              placeholder="Enter milestones separated by commas..."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple milestones with commas
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Goal</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditGoalDialogProps {
  goal: LearningGoal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateGoal: (updates: Partial<LearningGoal>) => void;
}

function EditGoalDialog({ goal, open, onOpenChange, onUpdateGoal }: EditGoalDialogProps) {
  const [formData, setFormData] = useState({
    title: goal.title,
    description: goal.description,
    category: goal.category,
    priority: goal.priority,
    targetDate: goal.targetDate,
    isActive: goal.isActive,
    milestones: goal.milestones.join(', ')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateGoal({
      ...formData,
      milestones: formData.milestones.split(',').map(m => m.trim()).filter(Boolean),
      updatedAt: new Date()
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Learning Goal</DialogTitle>
          <DialogDescription>
            Update your learning objective
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Goal Title *</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select 
                value={formData.priority}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.isActive ? 'active' : 'paused'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, isActive: value === 'active' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Target Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.targetDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.targetDate}
                  onSelect={(date) => date && setFormData(prev => ({ ...prev, targetDate: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-milestones">Milestones</Label>
            <Textarea
              id="edit-milestones"
              value={formData.milestones}
              onChange={(e) => setFormData(prev => ({ ...prev, milestones: e.target.value }))}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Update Goal</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
