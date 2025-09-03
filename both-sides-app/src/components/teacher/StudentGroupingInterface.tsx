/**
 * Student Grouping Interface Component
 * 
 * Task 8.2.2: Student grouping and organization tools for dynamic grouping
 * and skill-based assignments.
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from '@hello-pangea/dnd';
import { 
  Users,
  Plus,
  Settings,
  Shuffle,
  Target,
  Brain,
  TrendingUp,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  Group,
  Tag,
  Filter,
  Search,
  BarChart3,
  Award,
  MessageSquare
} from 'lucide-react';

// Types
interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  grade: string;
  averageScore: number;
  engagementLevel: 'low' | 'medium' | 'high';
  skillProgression: Record<string, number>;
  groups: string[];
  tags: string[];
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
}

interface StudentGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  type: 'skill_based' | 'random' | 'manual' | 'debate_pairing';
  criteria: {
    skillLevel?: 'high' | 'medium' | 'low';
    engagementLevel?: 'high' | 'medium' | 'low';
    learningStyle?: string;
    performanceRange?: { min: number; max: number };
  };
  members: string[]; // student IDs
  createdAt: Date;
  lastModified: Date;
  isActive: boolean;
}

interface StudentGroupingInterfaceProps {
  students: StudentProfile[];
}

export function StudentGroupingInterface({ students }: StudentGroupingInterfaceProps) {
  const [groups, setGroups] = useState<StudentGroup[]>([
    {
      id: '1',
      name: 'Advanced Learners',
      description: 'High-performing students ready for advanced challenges',
      color: 'bg-green-100 border-green-300',
      type: 'skill_based',
      criteria: { skillLevel: 'high', performanceRange: { min: 85, max: 100 } },
      members: students.filter(s => s.averageScore >= 85).map(s => s.id),
      createdAt: new Date(2024, 8, 15),
      lastModified: new Date(),
      isActive: true
    },
    {
      id: '2',
      name: 'Support Group',
      description: 'Students needing additional support and guidance',
      color: 'bg-yellow-100 border-yellow-300',
      type: 'skill_based',
      criteria: { skillLevel: 'low', performanceRange: { min: 0, max: 70 } },
      members: students.filter(s => s.averageScore < 70).map(s => s.id),
      createdAt: new Date(2024, 8, 20),
      lastModified: new Date(),
      isActive: true
    },
    {
      id: '3',
      name: 'Science Track',
      description: 'Students focused on science-related debate topics',
      color: 'bg-blue-100 border-blue-300',
      type: 'manual',
      criteria: {},
      members: students.filter(s => s.tags.includes('science-focused')).map(s => s.id),
      createdAt: new Date(2024, 9, 1),
      lastModified: new Date(),
      isActive: true
    }
  ]);

  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<StudentGroup | null>(null);
  const [activeTab, setActiveTab] = useState('groups');

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = searchTerm === '' || 
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGroup = filterGroup === '' || 
      groups.find(g => g.id === filterGroup)?.members.includes(student.id);
    
    return matchesSearch && matchesGroup;
  });

  // Ungrouped students
  const ungroupedStudents = students.filter(student => 
    !groups.some(group => group.members.includes(student.id))
  );

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    
    if (!destination) return;
    
    const sourceGroupId = source.droppableId;
    const destGroupId = destination.droppableId;
    
    if (sourceGroupId === destGroupId) return;
    
    // Remove student from source group
    if (sourceGroupId !== 'ungrouped') {
      setGroups(prev => prev.map(group => 
        group.id === sourceGroupId 
          ? { ...group, members: group.members.filter(id => id !== draggableId) }
          : group
      ));
    }
    
    // Add student to destination group
    if (destGroupId !== 'ungrouped') {
      setGroups(prev => prev.map(group => 
        group.id === destGroupId 
          ? { ...group, members: [...group.members, draggableId] }
          : group
      ));
    }
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const handleBulkAddToGroup = (groupId: string) => {
    setGroups(prev => prev.map(group => 
      group.id === groupId 
        ? { 
            ...group, 
            members: [...new Set([...group.members, ...selectedStudents])]
          }
        : group
    ));
    setSelectedStudents(new Set());
  };

  const createAutoGroups = (type: 'skill' | 'engagement' | 'random') => {
    const newGroups: StudentGroup[] = [];
    
    switch (type) {
      case 'skill':
        const skillGroups = [
          { name: 'High Performers', min: 85, max: 100, color: 'bg-green-100 border-green-300' },
          { name: 'Medium Performers', min: 70, max: 84, color: 'bg-blue-100 border-blue-300' },
          { name: 'Developing Learners', min: 0, max: 69, color: 'bg-yellow-100 border-yellow-300' }
        ];
        
        skillGroups.forEach((group, index) => {
          const members = students
            .filter(s => s.averageScore >= group.min && s.averageScore <= group.max)
            .map(s => s.id);
          
          if (members.length > 0) {
            newGroups.push({
              id: `auto-skill-${index}`,
              name: group.name,
              description: `Students with performance scores ${group.min}-${group.max}%`,
              color: group.color,
              type: 'skill_based',
              criteria: { performanceRange: { min: group.min, max: group.max } },
              members,
              createdAt: new Date(),
              lastModified: new Date(),
              isActive: true
            });
          }
        });
        break;
        
      case 'engagement':
        const engagementLevels = ['high', 'medium', 'low'] as const;
        engagementLevels.forEach((level, index) => {
          const members = students
            .filter(s => s.engagementLevel === level)
            .map(s => s.id);
          
          if (members.length > 0) {
            newGroups.push({
              id: `auto-engagement-${index}`,
              name: `${level.charAt(0).toUpperCase() + level.slice(1)} Engagement`,
              description: `Students with ${level} engagement levels`,
              color: level === 'high' ? 'bg-green-100 border-green-300' : 
                     level === 'medium' ? 'bg-blue-100 border-blue-300' : 
                     'bg-yellow-100 border-yellow-300',
              type: 'skill_based',
              criteria: { engagementLevel: level },
              members,
              createdAt: new Date(),
              lastModified: new Date(),
              isActive: true
            });
          }
        });
        break;
        
      case 'random':
        const groupSize = Math.ceil(students.length / 4);
        const shuffled = [...students].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < 4; i++) {
          const start = i * groupSize;
          const end = start + groupSize;
          const members = shuffled.slice(start, end).map(s => s.id);
          
          if (members.length > 0) {
            newGroups.push({
              id: `auto-random-${i}`,
              name: `Group ${i + 1}`,
              description: 'Randomly assigned group for balanced collaboration',
              color: ['bg-purple-100 border-purple-300', 'bg-pink-100 border-pink-300', 
                     'bg-indigo-100 border-indigo-300', 'bg-teal-100 border-teal-300'][i],
              type: 'random',
              criteria: {},
              members,
              createdAt: new Date(),
              lastModified: new Date(),
              isActive: true
            });
          }
        }
        break;
    }
    
    setGroups(prev => [...prev, ...newGroups]);
  };

  const deleteGroup = (groupId: string) => {
    setGroups(prev => prev.filter(group => group.id !== groupId));
  };

  const getStudentById = (id: string) => {
    return students.find(s => s.id === id);
  };

  const getEngagementIcon = (level: string) => {
    switch (level) {
      case 'high':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'medium':
        return <Target className="h-3 w-3 text-yellow-600" />;
      case 'low':
        return <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Student Groups</h3>
          <p className="text-muted-foreground">
            Organize students for collaborative learning and targeted support
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => createAutoGroups('skill')}>
            <Brain className="h-4 w-4 mr-2" />
            Auto-Group by Skill
          </Button>
          <Button variant="outline" onClick={() => createAutoGroups('random')}>
            <Shuffle className="h-4 w-4 mr-2" />
            Random Groups
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>
                  Set up a new student group with specific criteria
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Group name" />
                <Input placeholder="Description" />
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Group type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Assignment</SelectItem>
                    <SelectItem value="skill_based">Skill-Based</SelectItem>
                    <SelectItem value="debate_pairing">Debate Pairing</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setShowCreateDialog(false)}>
                    Create Group
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="groups">Group Management</TabsTrigger>
          <TabsTrigger value="analytics">Group Analytics</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={filterGroup} onValueChange={setFilterGroup}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All students</SelectItem>
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Drag and Drop Interface */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Student Pool */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Available Students ({filteredStudents.length})
                  </CardTitle>
                  {selectedStudents.size > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">
                        {selectedStudents.size} selected
                      </span>
                      <Select onValueChange={handleBulkAddToGroup}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Add to group..." />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.map(group => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <Droppable droppableId="ungrouped">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="space-y-2 min-h-[200px]"
                      >
                        {filteredStudents.map((student, index) => (
                          <Draggable 
                            key={student.id} 
                            draggableId={student.id} 
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`flex items-center space-x-3 p-3 border rounded-lg cursor-move ${
                                  snapshot.isDragging ? 'shadow-lg bg-white' : 'hover:bg-muted/50'
                                }`}
                              >
                                <Checkbox
                                  checked={selectedStudents.has(student.id)}
                                  onCheckedChange={() => handleSelectStudent(student.id)}
                                />
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={student.avatar} />
                                  <AvatarFallback className="text-xs">
                                    {student.firstName[0]}{student.lastName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="font-medium text-sm">
                                    {student.firstName} {student.lastName}
                                  </div>
                                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                    <span>{student.averageScore.toFixed(0)}%</span>
                                    {getEngagementIcon(student.engagementLevel)}
                                    <span className="capitalize">{student.engagementLevel}</span>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {student.groups.slice(0, 2).map((group, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {group}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </CardContent>
              </Card>

              {/* Groups */}
              <div className="space-y-4">
                {groups.map((group) => (
                  <Card key={group.id} className={group.color}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center">
                            <Group className="h-4 w-4 mr-2" />
                            {group.name}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {group.description} ({group.members.length} members)
                          </CardDescription>
                        </div>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => deleteGroup(group.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Droppable droppableId={group.id}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="space-y-2 min-h-[100px]"
                          >
                            {group.members.map((memberId, index) => {
                              const student = getStudentById(memberId);
                              if (!student) return null;
                              
                              return (
                                <Draggable 
                                  key={student.id} 
                                  draggableId={student.id} 
                                  index={index}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`flex items-center space-x-2 p-2 bg-white border rounded cursor-move ${
                                        snapshot.isDragging ? 'shadow-lg' : 'hover:shadow-sm'
                                      }`}
                                    >
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={student.avatar} />
                                        <AvatarFallback className="text-xs">
                                          {student.firstName[0]}{student.lastName[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1">
                                        <div className="text-sm font-medium">
                                          {student.firstName} {student.lastName}
                                        </div>
                                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                          <span>{student.averageScore.toFixed(0)}%</span>
                                          {getEngagementIcon(student.engagementLevel)}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </DragDropContext>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Group Analytics
              </CardTitle>
              <CardDescription>
                Performance comparison and group effectiveness metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Group Analytics</h3>
                <p className="text-muted-foreground">
                  Advanced group analytics and performance comparison tools will be implemented here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Group Assignments
              </CardTitle>
              <CardDescription>
                Assign debates and activities to specific groups
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Group Assignments</h3>
                <p className="text-muted-foreground">
                  Group-based assignment and debate scheduling tools will be implemented here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
