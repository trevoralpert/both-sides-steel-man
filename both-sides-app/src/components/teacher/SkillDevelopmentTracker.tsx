/**
 * Skill Development Tracker Component
 * 
 * Task 8.2.3: Track competency development using Phase 7 analytics data
 */

'use client';

import React, { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Users,
  BarChart3,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Star,
  BookOpen,
  FileText
} from 'lucide-react';

// Types
interface SkillData {
  skill: string;
  mastery: number;
  improvement: number;
  studentsCount: number;
}

interface SkillDevelopmentTrackerProps {
  skillData: SkillData[];
}

interface SkillDetail {
  skill: string;
  currentLevel: number;
  targetLevel: number;
  studentsAtTarget: number;
  totalStudents: number;
  trend: 'up' | 'down' | 'stable';
  subSkills: {
    name: string;
    level: number;
    importance: 'high' | 'medium' | 'low';
  }[];
  progressHistory: {
    date: string;
    level: number;
  }[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff88'];

export function SkillDevelopmentTracker({ skillData }: SkillDevelopmentTrackerProps) {
  const [selectedView, setSelectedView] = useState<'overview' | 'detailed' | 'comparison'>('overview');
  const [selectedSkill, setSelectedSkill] = useState<string>('');

  // Enhanced skill details with sub-skills and history
  const skillDetails: SkillDetail[] = skillData.map((skill, index) => ({
    skill: skill.skill,
    currentLevel: skill.mastery,
    targetLevel: Math.min(skill.mastery + 10, 100),
    studentsAtTarget: Math.floor(skill.studentsCount * (skill.mastery / 100)),
    totalStudents: skill.studentsCount,
    trend: skill.improvement > 2 ? 'up' : skill.improvement < -2 ? 'down' : 'stable',
    subSkills: generateSubSkills(skill.skill),
    progressHistory: generateProgressHistory(skill.mastery)
  }));

  function generateSubSkills(skillName: string) {
    const subSkillMap: Record<string, Array<{name: string, importance: 'high' | 'medium' | 'low'}>> = {
      'Critical Thinking': [
        { name: 'Analysis', importance: 'high' },
        { name: 'Evaluation', importance: 'high' },
        { name: 'Inference', importance: 'medium' },
        { name: 'Interpretation', importance: 'medium' }
      ],
      'Communication': [
        { name: 'Verbal Expression', importance: 'high' },
        { name: 'Written Communication', importance: 'high' },
        { name: 'Active Listening', importance: 'medium' },
        { name: 'Non-verbal Communication', importance: 'low' }
      ],
      'Research Skills': [
        { name: 'Information Gathering', importance: 'high' },
        { name: 'Source Evaluation', importance: 'high' },
        { name: 'Data Analysis', importance: 'medium' },
        { name: 'Citation', importance: 'medium' }
      ],
      'Collaboration': [
        { name: 'Teamwork', importance: 'high' },
        { name: 'Leadership', importance: 'medium' },
        { name: 'Conflict Resolution', importance: 'medium' },
        { name: 'Peer Support', importance: 'low' }
      ],
      'Problem Solving': [
        { name: 'Problem Identification', importance: 'high' },
        { name: 'Solution Generation', importance: 'high' },
        { name: 'Implementation', importance: 'medium' },
        { name: 'Evaluation', importance: 'medium' }
      ]
    };

    const baseSkills = subSkillMap[skillName] || [
      { name: 'Core Competency', importance: 'high' as const },
      { name: 'Application', importance: 'medium' as const }
    ];

    return baseSkills.map(subSkill => ({
      ...subSkill,
      level: Math.random() * 30 + 70 // Random level between 70-100
    }));
  }

  function generateProgressHistory(currentLevel: number) {
    const history = [];
    const startLevel = Math.max(currentLevel - 20, 40);
    
    for (let i = 7; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i * 7);
      const level = startLevel + (currentLevel - startLevel) * ((7 - i) / 7) + (Math.random() - 0.5) * 5;
      
      history.push({
        date: date.toISOString().split('T')[0],
        level: Math.max(0, Math.min(100, level))
      });
    }
    
    return history;
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Target className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSkillLevelBadge = (level: number) => {
    if (level >= 90) return <Badge variant="default" className="bg-green-100 text-green-800">Mastery</Badge>;
    if (level >= 80) return <Badge variant="default" className="bg-blue-100 text-blue-800">Proficient</Badge>;
    if (level >= 70) return <Badge variant="secondary">Developing</Badge>;
    return <Badge variant="outline">Beginning</Badge>;
  };

  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">High</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="text-xs">Medium</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-xs">Low</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Prepare data for radar chart
  const radarData = skillData.map(skill => ({
    skill: skill.skill.split(' ')[0], // Shortened name for radar
    current: skill.mastery,
    target: Math.min(skill.mastery + 10, 100)
  }));

  // Prepare data for improvement chart
  const improvementData = skillData.map(skill => ({
    skill: skill.skill,
    improvement: skill.improvement,
    current: skill.mastery
  }));

  const selectedSkillDetail = skillDetails.find(s => s.skill === selectedSkill);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Skill Development Tracking</h3>
          <p className="text-muted-foreground">
            Monitor competency development across key learning areas
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedView} onValueChange={(value: any) => setSelectedView(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="detailed">Detailed View</SelectItem>
              <SelectItem value="comparison">Comparison</SelectItem>
            </SelectContent>
          </Select>
          {selectedView === 'detailed' && (
            <Select value={selectedSkill} onValueChange={setSelectedSkill}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select skill" />
              </SelectTrigger>
              <SelectContent>
                {skillData.map(skill => (
                  <SelectItem key={skill.skill} value={skill.skill}>
                    {skill.skill}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {selectedView === 'overview' && (
        <>
          {/* Skill Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {skillDetails.map((skill) => (
              <Card key={skill.skill}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{skill.skill}</CardTitle>
                    {getTrendIcon(skill.trend)}
                  </div>
                  <div className="flex items-center space-x-2">
                    {getSkillLevelBadge(skill.currentLevel)}
                    <span className="text-sm text-muted-foreground">
                      {skill.studentsAtTarget}/{skill.totalStudents} at target
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span>Current Level</span>
                        <span className="font-medium">{skill.currentLevel.toFixed(1)}%</span>
                      </div>
                      <Progress value={skill.currentLevel} />
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Target:</span>
                        <span>{skill.targetLevel}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Progress:</span>
                        <span className={skill.trend === 'up' ? 'text-green-600' : skill.trend === 'down' ? 'text-red-600' : ''}>
                          {skill.trend === 'up' ? '+' : skill.trend === 'down' ? '-' : ''}
                          {Math.abs(Math.random() * 5).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Skills Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                Skills Profile
              </CardTitle>
              <CardDescription>
                Comprehensive view of current skill levels vs targets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="skill" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar
                      name="Current Level"
                      dataKey="current"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.3}
                    />
                    <Radar
                      name="Target Level"
                      dataKey="target"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.1}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {selectedView === 'detailed' && selectedSkillDetail && (
        <div className="space-y-6">
          {/* Detailed Skill Analysis */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <BookOpen className="h-5 w-5 mr-2" />
                    {selectedSkillDetail.skill} - Detailed Analysis
                  </CardTitle>
                  <CardDescription>
                    In-depth analysis of skill development and sub-competencies
                  </CardDescription>
                </div>
                {getSkillLevelBadge(selectedSkillDetail.currentLevel)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Progress History */}
                <div>
                  <h4 className="font-medium mb-3">Progress Over Time</h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={selectedSkillDetail.progressHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={formatDate} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip 
                          labelFormatter={(value) => formatDate(value as string)}
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Skill Level']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="level" 
                          stroke="#8884d8" 
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Current Statistics */}
                <div>
                  <h4 className="font-medium mb-3">Current Statistics</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">Current Level</span>
                        <span className="font-medium">{selectedSkillDetail.currentLevel.toFixed(1)}%</span>
                      </div>
                      <Progress value={selectedSkillDetail.currentLevel} />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">Target Achievement</span>
                        <span className="font-medium">
                          {selectedSkillDetail.studentsAtTarget}/{selectedSkillDetail.totalStudents}
                        </span>
                      </div>
                      <Progress value={(selectedSkillDetail.studentsAtTarget / selectedSkillDetail.totalStudents) * 100} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Trend</span>
                        <div className="flex items-center space-x-1">
                          {getTrendIcon(selectedSkillDetail.trend)}
                          <span className="capitalize">{selectedSkillDetail.trend}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Target Level</span>
                        <div className="font-medium">{selectedSkillDetail.targetLevel}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sub-Skills Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Sub-Skills Analysis
              </CardTitle>
              <CardDescription>
                Breakdown of individual competency components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedSkillDetail.subSkills.map((subSkill, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="font-medium">{subSkill.name}</div>
                      {getImportanceBadge(subSkill.importance)}
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-sm font-medium">{subSkill.level.toFixed(1)}%</div>
                      <div className="w-24">
                        <Progress value={subSkill.level} />
                      </div>
                      {getSkillLevelBadge(subSkill.level)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedView === 'comparison' && (
        <>
          {/* Skill Improvement Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Skill Improvement Analysis
              </CardTitle>
              <CardDescription>
                Compare improvement rates across different skills
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={improvementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="skill" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]} />
                    <Bar dataKey="improvement" fill="#8884d8" name="Improvement Rate" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Skill Distribution */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Mastery Distribution
                </CardTitle>
                <CardDescription>
                  Distribution of skill mastery levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={skillData.map((skill, index) => ({
                          name: skill.skill,
                          value: skill.mastery,
                          fill: COLORS[index % COLORS.length]
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${(value ?? 0).toFixed(1)}%`}
                      >
                        {skillData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Improvement Trends
                </CardTitle>
                <CardDescription>
                  Skills showing the most/least improvement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {improvementData
                    .sort((a, b) => b.improvement - a.improvement)
                    .map((skill, index) => (
                      <div key={skill.skill} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium">{skill.skill}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-medium ${
                            skill.improvement > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {skill.improvement > 0 ? '+' : ''}{skill.improvement.toFixed(1)}%
                          </span>
                          {skill.improvement > 0 ? 
                            <TrendingUp className="h-4 w-4 text-green-600" /> : 
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          }
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline">
          <Award className="h-4 w-4 mr-2" />
          Set Skill Goals
        </Button>
        <Button variant="outline">
          <Users className="h-4 w-4 mr-2" />
          Group by Skills
        </Button>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </div>
    </div>
  );
}
