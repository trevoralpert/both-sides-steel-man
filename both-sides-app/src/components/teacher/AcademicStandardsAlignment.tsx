/**
 * Academic Standards Alignment Component
 * 
 * Task 8.2.3: Standards mapping for debate activities and reflections,
 * competency tracking against educational frameworks, and evidence collection
 */

'use client';

import React, { useState, useEffect } from 'react';

import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  BookOpen,
  Target,
  Award,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  FileText,
  BarChart3,
  Layers,
  Map,
  Clipboard,
  Calendar,
  User,
  Users,
  GraduationCap,
  School,
  Library,
  Eye,
  Edit,
  Trash2,
  Link,
  Unlink,
  Star,
  TrendingUp,
  Database,
  Settings
} from 'lucide-react';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface AcademicStandard {
  id: string;
  code: string;
  title: string;
  description: string;
  framework: 'Common Core' | 'Next Generation Science' | 'C3 Framework' | 'State Standards' | 'Custom';
  subject: string;
  gradeLevel: string[];
  category: string;
  subcategory?: string;
  prerequisites: string[];
  relatedStandards: string[];
  bloomsLevel: 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';
  difficultyLevel: 1 | 2 | 3 | 4 | 5;
  isActive: boolean;
}

interface StandardsMapping {
  id: string;
  activityId: string;
  activityType: 'debate_session' | 'reflection' | 'assignment' | 'assessment';
  activityTitle: string;
  standardIds: string[];
  mappingType: 'primary' | 'secondary' | 'reinforcement';
  alignmentStrength: 'strong' | 'moderate' | 'weak';
  evidenceRequired: string[];
  mappedBy: string;
  mappedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  approved: boolean;
}

interface CompetencyTracker {
  id: string;
  studentId: string;
  studentName: string;
  standardId: string;
  standardCode: string;
  standardTitle: string;
  proficiencyLevel: 'not_met' | 'approaching' | 'proficient' | 'advanced';
  progressPercentage: number;
  evidenceCount: number;
  lastAssessment: Date;
  trend: 'improving' | 'stable' | 'declining';
  targetDate?: Date;
  notes?: string;
}

interface EvidenceItem {
  id: string;
  studentId: string;
  standardId: string;
  activityId: string;
  activityTitle: string;
  evidenceType: 'performance' | 'artifact' | 'observation' | 'assessment';
  description: string;
  score?: number;
  maxScore?: number;
  proficiencyLevel: 'not_met' | 'approaching' | 'proficient' | 'advanced';
  dateCollected: Date;
  collectedBy: string;
  rubricUsed?: string;
  feedback?: string;
  attachments: string[];
}

interface AcademicStandardsAlignmentProps {
  students?: any[];
  activities?: any[];
  onStandardCreate?: (standard: AcademicStandard) => void;
  onMappingUpdate?: (mapping: StandardsMapping) => void;
  onEvidenceAdd?: (evidence: EvidenceItem) => void;
}

export function AcademicStandardsAlignment({
  students = [],
  activities = [],
  onStandardCreate,
  onMappingUpdate,
  onEvidenceAdd
}: AcademicStandardsAlignmentProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [activeTab, setActiveTab] = useState('standards');
  const [standards, setStandards] = useState<AcademicStandard[]>([]);
  const [mappings, setMappings] = useState<StandardsMapping[]>([]);
  const [competencyTrackers, setCompetencyTrackers] = useState<CompetencyTracker[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    framework: '',
    subject: '',
    gradeLevel: '',
    search: '',
    proficiencyLevel: '',
    studentId: ''
  });

  // Form states
  const [showCreateStandard, setShowCreateStandard] = useState(false);
  const [showAddEvidence, setShowAddEvidence] = useState(false);
  const [selectedStandard, setSelectedStandard] = useState<AcademicStandard | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>('');

  const [standardForm, setStandardForm] = useState({
    code: '',
    title: '',
    description: '',
    framework: 'Common Core' as AcademicStandard['framework'],
    subject: '',
    gradeLevel: [] as string[],
    category: '',
    subcategory: '',
    bloomsLevel: 'Understand' as AcademicStandard['bloomsLevel'],
    difficultyLevel: 3 as AcademicStandard['difficultyLevel']
  });

  const [evidenceForm, setEvidenceForm] = useState({
    studentId: '',
    standardId: '',
    activityId: '',
    evidenceType: 'performance' as EvidenceItem['evidenceType'],
    description: '',
    score: 0,
    maxScore: 100,
    proficiencyLevel: 'proficient' as EvidenceItem['proficiencyLevel'],
    feedback: ''
  });

  useEffect(() => {
    loadStandardsData();
  }, [user?.id]);

  const loadStandardsData = async () => {
    setLoading(true);
    try {
      // Mock data for development
      const mockStandards: AcademicStandard[] = [
        {
          id: '1',
          code: 'CCSS.ELA-LITERACY.SL.9-10.1',
          title: 'Initiate and participate effectively in collaborative discussions',
          description: 'Initiate and participate effectively in a range of collaborative discussions (one-on-one, in groups, and teacher-led) with diverse partners on grades 9-10 topics, texts, and issues, building on others\' ideas and expressing their own clearly and persuasively.',
          framework: 'Common Core',
          subject: 'English Language Arts',
          gradeLevel: ['9', '10'],
          category: 'Speaking and Listening',
          subcategory: 'Comprehension and Collaboration',
          prerequisites: [],
          relatedStandards: ['CCSS.ELA-LITERACY.SL.9-10.3', 'CCSS.ELA-LITERACY.SL.9-10.4'],
          bloomsLevel: 'Apply',
          difficultyLevel: 3,
          isActive: true
        },
        {
          id: '2',
          code: 'CCSS.ELA-LITERACY.RST.9-10.7',
          title: 'Translate quantitative information expressed in text',
          description: 'Translate quantitative or technical information expressed in words in a text into visual form (e.g., a table or chart) and translate information expressed visually or mathematically into words.',
          framework: 'Common Core',
          subject: 'English Language Arts',
          gradeLevel: ['9', '10'],
          category: 'Reading',
          subcategory: 'Science and Technical Subjects',
          prerequisites: [],
          relatedStandards: ['CCSS.ELA-LITERACY.RST.9-10.4'],
          bloomsLevel: 'Analyze',
          difficultyLevel: 4,
          isActive: true
        },
        {
          id: '3',
          code: 'CCSS.ELA-LITERACY.WHST.9-10.1',
          title: 'Write arguments to support claims in an analysis',
          description: 'Write arguments to support claims in an analysis of substantive topics or texts, using valid reasoning and relevant and sufficient evidence.',
          framework: 'Common Core',
          subject: 'English Language Arts',
          gradeLevel: ['9', '10'],
          category: 'Writing',
          subcategory: 'History/Social Studies, Science, and Technical Subjects',
          prerequisites: [],
          relatedStandards: ['CCSS.ELA-LITERACY.WHST.9-10.4'],
          bloomsLevel: 'Create',
          difficultyLevel: 4,
          isActive: true
        }
      ];

      const mockMappings: StandardsMapping[] = [
        {
          id: '1',
          activityId: 'debate1',
          activityType: 'debate_session',
          activityTitle: 'Climate Change Policy Debate',
          standardIds: ['1', '3'],
          mappingType: 'primary',
          alignmentStrength: 'strong',
          evidenceRequired: ['Participation rubric', 'Argument quality assessment', 'Collaboration evaluation'],
          mappedBy: 'teacher1',
          mappedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          approved: true
        },
        {
          id: '2',
          activityId: 'reflection1',
          activityType: 'reflection',
          activityTitle: 'Post-Debate Reflection: Economic Impact',
          standardIds: ['2', '3'],
          mappingType: 'secondary',
          alignmentStrength: 'moderate',
          evidenceRequired: ['Written reflection analysis', 'Evidence synthesis'],
          mappedBy: 'teacher1',
          mappedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          approved: true
        }
      ];

      const mockCompetencyTrackers: CompetencyTracker[] = [
        {
          id: '1',
          studentId: 'student1',
          studentName: 'Sarah Johnson',
          standardId: '1',
          standardCode: 'CCSS.ELA-LITERACY.SL.9-10.1',
          standardTitle: 'Collaborative discussions',
          proficiencyLevel: 'proficient',
          progressPercentage: 85,
          evidenceCount: 4,
          lastAssessment: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          trend: 'improving'
        },
        {
          id: '2',
          studentId: 'student1',
          studentName: 'Sarah Johnson',
          standardId: '3',
          standardCode: 'CCSS.ELA-LITERACY.WHST.9-10.1',
          standardTitle: 'Write arguments to support claims',
          proficiencyLevel: 'advanced',
          progressPercentage: 95,
          evidenceCount: 3,
          lastAssessment: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          trend: 'stable'
        },
        {
          id: '3',
          studentId: 'student2',
          studentName: 'Michael Chen',
          standardId: '1',
          standardCode: 'CCSS.ELA-LITERACY.SL.9-10.1',
          standardTitle: 'Collaborative discussions',
          proficiencyLevel: 'approaching',
          progressPercentage: 68,
          evidenceCount: 2,
          lastAssessment: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          trend: 'improving'
        }
      ];

      const mockEvidence: EvidenceItem[] = [
        {
          id: '1',
          studentId: 'student1',
          standardId: '1',
          activityId: 'debate1',
          activityTitle: 'Climate Change Policy Debate',
          evidenceType: 'performance',
          description: 'Strong collaborative discussion during climate change debate, effectively building on peers\' arguments',
          score: 42,
          maxScore: 50,
          proficiencyLevel: 'proficient',
          dateCollected: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          collectedBy: 'teacher1',
          rubricUsed: 'Collaboration Rubric v2.1',
          feedback: 'Excellent listening skills and respectful disagreement techniques demonstrated',
          attachments: []
        },
        {
          id: '2',
          studentId: 'student1',
          standardId: '3',
          activityId: 'reflection1',
          activityTitle: 'Post-Debate Reflection',
          evidenceType: 'artifact',
          description: 'Written argument supporting environmental policy position with multiple sources',
          score: 47,
          maxScore: 50,
          proficiencyLevel: 'advanced',
          dateCollected: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          collectedBy: 'teacher1',
          rubricUsed: 'Argument Writing Rubric',
          feedback: 'Sophisticated use of evidence and counter-argument consideration',
          attachments: ['reflection_document.pdf']
        }
      ];

      setStandards(mockStandards);
      setMappings(mockMappings);
      setCompetencyTrackers(mockCompetencyTrackers);
      setEvidenceItems(mockEvidence);

    } catch (error) {
      console.error('Failed to load standards data:', error);
      addNotification({
        type: 'error',
        title: 'Load Failed',
        message: 'Failed to load standards data. Please try again.',
        read: false
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStandard = async () => {
    try {
      const newStandard: AcademicStandard = {
        id: Date.now().toString(),
        code: standardForm.code,
        title: standardForm.title,
        description: standardForm.description,
        framework: standardForm.framework,
        subject: standardForm.subject,
        gradeLevel: standardForm.gradeLevel,
        category: standardForm.category,
        subcategory: standardForm.subcategory,
        prerequisites: [],
        relatedStandards: [],
        bloomsLevel: standardForm.bloomsLevel,
        difficultyLevel: standardForm.difficultyLevel,
        isActive: true
      };

      setStandards(prev => [...prev, newStandard]);
      onStandardCreate?.(newStandard);

      setStandardForm({
        code: '',
        title: '',
        description: '',
        framework: 'Common Core',
        subject: '',
        gradeLevel: [],
        category: '',
        subcategory: '',
        bloomsLevel: 'Understand',
        difficultyLevel: 3
      });
      setShowCreateStandard(false);

      addNotification({
        type: 'success',
        title: 'Standard Created',
        message: `Academic standard "${newStandard.code}" has been created.`,
        read: false
      });

    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Creation Failed',
        message: 'Failed to create academic standard. Please try again.',
        read: false
      });
    }
  };

  const handleAddEvidence = async () => {
    if (!evidenceForm.studentId || !evidenceForm.standardId || !evidenceForm.description) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all required fields.',
        read: false
      });
      return;
    }

    try {
      const student = students.find(s => s.id === evidenceForm.studentId);
      const activity = activities.find(a => a.id === evidenceForm.activityId);

      const newEvidence: EvidenceItem = {
        id: Date.now().toString(),
        studentId: evidenceForm.studentId,
        standardId: evidenceForm.standardId,
        activityId: evidenceForm.activityId,
        activityTitle: activity?.title || 'Manual Entry',
        evidenceType: evidenceForm.evidenceType,
        description: evidenceForm.description,
        score: evidenceForm.score,
        maxScore: evidenceForm.maxScore,
        proficiencyLevel: evidenceForm.proficiencyLevel,
        dateCollected: new Date(),
        collectedBy: user?.id || 'teacher',
        feedback: evidenceForm.feedback,
        attachments: []
      };

      setEvidenceItems(prev => [...prev, newEvidence]);
      
      // Update competency tracker
      const existingTracker = competencyTrackers.find(
        ct => ct.studentId === evidenceForm.studentId && ct.standardId === evidenceForm.standardId
      );

      if (existingTracker) {
        setCompetencyTrackers(prev => 
          prev.map(ct => 
            ct.id === existingTracker.id
              ? {
                  ...ct,
                  evidenceCount: ct.evidenceCount + 1,
                  lastAssessment: new Date(),
                  proficiencyLevel: evidenceForm.proficiencyLevel,
                  progressPercentage: Math.round((evidenceForm.score / evidenceForm.maxScore) * 100)
                }
              : ct
          )
        );
      } else {
        // Create new competency tracker
        const standard = standards.find(s => s.id === evidenceForm.standardId);
        const newTracker: CompetencyTracker = {
          id: Date.now().toString() + '_tracker',
          studentId: evidenceForm.studentId,
          studentName: student?.firstName + ' ' + student?.lastName || 'Unknown',
          standardId: evidenceForm.standardId,
          standardCode: standard?.code || '',
          standardTitle: standard?.title || '',
          proficiencyLevel: evidenceForm.proficiencyLevel,
          progressPercentage: Math.round((evidenceForm.score / evidenceForm.maxScore) * 100),
          evidenceCount: 1,
          lastAssessment: new Date(),
          trend: 'stable'
        };
        setCompetencyTrackers(prev => [...prev, newTracker]);
      }

      onEvidenceAdd?.(newEvidence);

      setEvidenceForm({
        studentId: '',
        standardId: '',
        activityId: '',
        evidenceType: 'performance',
        description: '',
        score: 0,
        maxScore: 100,
        proficiencyLevel: 'proficient',
        feedback: ''
      });
      setShowAddEvidence(false);

      addNotification({
        type: 'success',
        title: 'Evidence Added',
        message: 'Evidence has been successfully recorded and competency tracking updated.',
        read: false
      });

    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Evidence Failed',
        message: 'Failed to add evidence. Please try again.',
        read: false
      });
    }
  };

  const getProficiencyColor = (level: string) => {
    switch (level) {
      case 'not_met':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'approaching':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'proficient':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'advanced':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getBloomsLevel = (level: string) => {
    const levels = {
      'Remember': 'bg-blue-100 text-blue-800',
      'Understand': 'bg-green-100 text-green-800', 
      'Apply': 'bg-yellow-100 text-yellow-800',
      'Analyze': 'bg-orange-100 text-orange-800',
      'Evaluate': 'bg-red-100 text-red-800',
      'Create': 'bg-purple-100 text-purple-800'
    };
    return (levels as any)[level] || 'bg-gray-100 text-gray-800';
  };


  const filteredStandards = standards.filter(standard => {
    if (filters.framework && standard.framework !== filters.framework) return false;
    if (filters.subject && standard.subject !== filters.subject) return false;
    if (filters.gradeLevel && !standard.gradeLevel.includes(filters.gradeLevel)) return false;
    if (filters.search && 
        !standard.code.toLowerCase().includes(filters.search.toLowerCase()) &&
        !standard.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const filteredTrackers = competencyTrackers.filter(tracker => {
    if (filters.proficiencyLevel && tracker.proficiencyLevel !== filters.proficiencyLevel) return false;
    if (filters.studentId && tracker.studentId !== filters.studentId) return false;
    if (filters.search && 
        !tracker.studentName.toLowerCase().includes(filters.search.toLowerCase()) &&
        !tracker.standardCode.toLowerCase().includes(filters.search.toLowerCase()) &&
        !tracker.standardTitle.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <GraduationCap className="h-5 w-5 mr-2" />
            Academic Standards Alignment
          </h3>
          <p className="text-sm text-muted-foreground">
            Map activities to standards, track competency development, and collect evidence
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm" onClick={() => setShowCreateStandard(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Standard
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="standards">
            Standards Library ({standards.length})
          </TabsTrigger>
          <TabsTrigger value="mapping">
            Activity Mapping ({mappings.length})
          </TabsTrigger>
          <TabsTrigger value="tracking">
            Competency Tracking ({competencyTrackers.length})
          </TabsTrigger>
          <TabsTrigger value="evidence">
            Evidence Collection ({evidenceItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standards" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search standards..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Framework</label>
                  <Select value={filters.framework} onValueChange={(value) => setFilters(prev => ({ ...prev, framework: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All frameworks" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All frameworks</SelectItem>
                      <SelectItem value="Common Core">Common Core</SelectItem>
                      <SelectItem value="Next Generation Science">Next Generation Science</SelectItem>
                      <SelectItem value="C3 Framework">C3 Framework</SelectItem>
                      <SelectItem value="State Standards">State Standards</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Select value={filters.subject} onValueChange={(value) => setFilters(prev => ({ ...prev, subject: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All subjects</SelectItem>
                      <SelectItem value="English Language Arts">English Language Arts</SelectItem>
                      <SelectItem value="Mathematics">Mathematics</SelectItem>
                      <SelectItem value="Science">Science</SelectItem>
                      <SelectItem value="Social Studies">Social Studies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Grade Level</label>
                  <Select value={filters.gradeLevel} onValueChange={(value) => setFilters(prev => ({ ...prev, gradeLevel: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All grades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All grades</SelectItem>
                      <SelectItem value="9">Grade 9</SelectItem>
                      <SelectItem value="10">Grade 10</SelectItem>
                      <SelectItem value="11">Grade 11</SelectItem>
                      <SelectItem value="12">Grade 12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Standards List */}
          <div className="space-y-4">
            {filteredStandards.length === 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center py-8">
                    <Library className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No standards found</h3>
                    <p className="text-muted-foreground mb-4">
                      {standards.length === 0 
                        ? "Start building your standards library"
                        : "No standards match your current filters"
                      }
                    </p>
                    {standards.length === 0 && (
                      <Button onClick={() => setShowCreateStandard(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Standard
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredStandards.map((standard) => (
                <Card key={standard.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{standard.framework}</Badge>
                          <Badge variant="secondary">{standard.subject}</Badge>
                          <Badge className={getBloomsLevel(standard.bloomsLevel)}>
                            {standard.bloomsLevel}
                          </Badge>
                          <div className="flex items-center">
                            {Array.from({ length: standard.difficultyLevel }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-current text-yellow-400" />
                            ))}
                          </div>
                        </div>
                        <h4 className="font-medium">{standard.code}</h4>
                        <h5 className="text-sm font-medium text-muted-foreground">{standard.title}</h5>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm">{standard.description}</p>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h6 className="font-medium mb-1">Grade Levels</h6>
                        <div className="flex flex-wrap gap-1">
                          {standard.gradeLevel.map(grade => (
                            <Badge key={grade} variant="outline" className="text-xs">
                              Grade {grade}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h6 className="font-medium mb-1">Category</h6>
                        <p className="text-sm text-muted-foreground">
                          {standard.category}
                          {standard.subcategory && ` > ${standard.subcategory}`}
                        </p>
                      </div>
                    </div>

                    {standard.relatedStandards.length > 0 && (
                      <div>
                        <h6 className="font-medium mb-1">Related Standards</h6>
                        <div className="flex flex-wrap gap-1">
                          {standard.relatedStandards.map((relatedId, index) => {
                            const related = standards.find(s => s.id === relatedId);
                            return related ? (
                              <Badge key={index} variant="outline" className="text-xs">
                                {related.code}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="mapping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Map className="h-5 w-5 mr-2" />
                Activity-Standards Mapping
              </CardTitle>
              <CardDescription>
                Connect debate activities and assessments to academic standards
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mappings.length === 0 ? (
                <div className="text-center py-8">
                  <Link className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No mappings created yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start connecting your activities to academic standards
                  </p>
                  <Button>
                    <Link className="h-4 w-4 mr-2" />
                    Create First Mapping
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {mappings.map((mapping) => (
                    <Card key={mapping.id}>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="capitalize">
                                  {mapping.activityType.replace('_', ' ')}
                                </Badge>
                                <Badge 
                                  className={mapping.mappingType === 'primary' ? 'bg-blue-100 text-blue-800' : 
                                           mapping.mappingType === 'secondary' ? 'bg-green-100 text-green-800' : 
                                           'bg-yellow-100 text-yellow-800'}
                                >
                                  {mapping.mappingType}
                                </Badge>
                                <Badge 
                                  className={mapping.alignmentStrength === 'strong' ? 'bg-green-100 text-green-800' :
                                           mapping.alignmentStrength === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                                           'bg-orange-100 text-orange-800'}
                                >
                                  {mapping.alignmentStrength} alignment
                                </Badge>
                                {mapping.approved && (
                                  <Badge className="bg-green-100 text-green-800">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Approved
                                  </Badge>
                                )}
                              </div>
                              <h4 className="font-medium">{mapping.activityTitle}</h4>
                              <p className="text-sm text-muted-foreground">
                                Mapped: {mapping.mappedAt.toLocaleDateString()} • {mapping.standardIds.length} standards
                              </p>
                            </div>
                          </div>

                          <div>
                            <h5 className="font-medium mb-2">Aligned Standards</h5>
                            <div className="space-y-2">
                              {mapping.standardIds.map(standardId => {
                                const standard = standards.find(s => s.id === standardId);
                                return standard ? (
                                  <div key={standardId} className="flex items-center space-x-2 p-2 border rounded">
                                    <Badge variant="outline">{standard.framework}</Badge>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{standard.code}</p>
                                      <p className="text-xs text-muted-foreground">{standard.title}</p>
                                    </div>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </div>

                          <div>
                            <h5 className="font-medium mb-1">Evidence Required</h5>
                            <div className="flex flex-wrap gap-1">
                              {mapping.evidenceRequired.map((evidence, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {evidence}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-4">
          {/* Tracking Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Student</label>
                  <Select value={filters.studentId} onValueChange={(value) => setFilters(prev => ({ ...prev, studentId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All students" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All students</SelectItem>
                      {students.map(student => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.firstName} {student.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Proficiency Level</label>
                  <Select value={filters.proficiencyLevel} onValueChange={(value) => setFilters(prev => ({ ...prev, proficiencyLevel: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All levels</SelectItem>
                      <SelectItem value="not_met">Not Met</SelectItem>
                      <SelectItem value="approaching">Approaching</SelectItem>
                      <SelectItem value="proficient">Proficient</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tracking..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Competency Trackers */}
          <div className="space-y-4">
            {filteredTrackers.length === 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No competency data yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Competency tracking will populate as evidence is collected
                    </p>
                    <Button onClick={() => setShowAddEvidence(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Evidence
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredTrackers.map((tracker) => (
                <Card key={tracker.id}>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Badge className={getProficiencyColor(tracker.proficiencyLevel)}>
                              {tracker.proficiencyLevel.replace('_', ' ')}
                            </Badge>
                            {tracker.trend === 'improving' && (
                              <Badge className="bg-green-100 text-green-800">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Improving
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium">{tracker.studentName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {tracker.standardCode} • Last assessed: {tracker.lastAssessment.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{tracker.progressPercentage}%</p>
                          <p className="text-xs text-muted-foreground">{tracker.evidenceCount} evidence items</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">{tracker.standardTitle}</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Progress</span>
                            <span>{tracker.progressPercentage}%</span>
                          </div>
                          <Progress value={tracker.progressPercentage} />
                        </div>
                      </div>

                      {tracker.notes && (
                        <div>
                          <h5 className="font-medium mb-1">Notes</h5>
                          <p className="text-sm text-muted-foreground">{tracker.notes}</p>
                        </div>
                      )}

                      {tracker.targetDate && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 mr-2" />
                          Target date: {tracker.targetDate.toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="evidence" className="space-y-4">
          {/* Evidence Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Clipboard className="h-5 w-5 mr-2" />
                    Evidence Collection
                  </CardTitle>
                  <CardDescription>
                    Document and track evidence of student competency
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddEvidence(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Evidence
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Evidence Items */}
          <div className="space-y-4">
            {evidenceItems.length === 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center py-8">
                    <Clipboard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No evidence collected yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start collecting evidence of student competency development
                    </p>
                    <Button onClick={() => setShowAddEvidence(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Evidence
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              evidenceItems.map((evidence) => {
                const student = students.find(s => s.id === evidence.studentId);
                const standard = standards.find(s => s.id === evidence.standardId);
                
                return (
                  <Card key={evidence.id}>
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="capitalize">
                                {evidence.evidenceType}
                              </Badge>
                              <Badge className={getProficiencyColor(evidence.proficiencyLevel)}>
                                {evidence.proficiencyLevel.replace('_', ' ')}
                              </Badge>
                              {evidence.score && evidence.maxScore && (
                                <Badge variant="secondary">
                                  {evidence.score}/{evidence.maxScore}
                                </Badge>
                              )}
                            </div>
                            <h4 className="font-medium">
                              {student?.firstName} {student?.lastName} • {evidence.activityTitle}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {standard?.code} • Collected: {evidence.dateCollected.toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium mb-1">Evidence Description</h5>
                          <p className="text-sm">{evidence.description}</p>
                        </div>

                        {evidence.feedback && (
                          <div>
                            <h5 className="font-medium mb-1">Feedback</h5>
                            <p className="text-sm text-muted-foreground">{evidence.feedback}</p>
                          </div>
                        )}

                        {evidence.rubricUsed && (
                          <div>
                            <h5 className="font-medium mb-1">Rubric Used</h5>
                            <Badge variant="outline">{evidence.rubricUsed}</Badge>
                          </div>
                        )}

                        {evidence.attachments.length > 0 && (
                          <div>
                            <h5 className="font-medium mb-1">Attachments</h5>
                            <div className="flex flex-wrap gap-1">
                              {evidence.attachments.map((attachment, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  <FileText className="h-3 w-3 mr-1" />
                                  {attachment}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="text-sm text-muted-foreground">
                          Collected by: {evidence.collectedBy}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Standard Dialog */}
      <Dialog open={showCreateStandard} onOpenChange={setShowCreateStandard}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Academic Standard</DialogTitle>
            <DialogDescription>
              Add a new academic standard to your library
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Standard Code *</label>
                <Input
                  placeholder="e.g., CCSS.ELA-LITERACY.SL.9-10.1"
                  value={standardForm.code}
                  onChange={(e) => setStandardForm(prev => ({ ...prev, code: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Framework</label>
                <Select value={standardForm.framework} onValueChange={(value: any) => setStandardForm(prev => ({ ...prev, framework: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Common Core">Common Core</SelectItem>
                    <SelectItem value="Next Generation Science">Next Generation Science</SelectItem>
                    <SelectItem value="C3 Framework">C3 Framework</SelectItem>
                    <SelectItem value="State Standards">State Standards</SelectItem>
                    <SelectItem value="Custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Title *</label>
              <Input
                placeholder="Brief descriptive title"
                value={standardForm.title}
                onChange={(e) => setStandardForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description *</label>
              <Textarea
                placeholder="Full standard description"
                value={standardForm.description}
                onChange={(e) => setStandardForm(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Input
                  placeholder="e.g., English Language Arts"
                  value={standardForm.subject}
                  onChange={(e) => setStandardForm(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Input
                  placeholder="e.g., Speaking and Listening"
                  value={standardForm.category}
                  onChange={(e) => setStandardForm(prev => ({ ...prev, category: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Bloom's Level</label>
                <Select value={standardForm.bloomsLevel} onValueChange={(value: any) => setStandardForm(prev => ({ ...prev, bloomsLevel: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Remember">Remember</SelectItem>
                    <SelectItem value="Understand">Understand</SelectItem>
                    <SelectItem value="Apply">Apply</SelectItem>
                    <SelectItem value="Analyze">Analyze</SelectItem>
                    <SelectItem value="Evaluate">Evaluate</SelectItem>
                    <SelectItem value="Create">Create</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Difficulty Level</label>
                <Select value={standardForm.difficultyLevel.toString()} onValueChange={(value) => setStandardForm(prev => ({ ...prev, difficultyLevel: parseInt(value) as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Basic</SelectItem>
                    <SelectItem value="2">2 - Developing</SelectItem>
                    <SelectItem value="3">3 - Proficient</SelectItem>
                    <SelectItem value="4">4 - Advanced</SelectItem>
                    <SelectItem value="5">5 - Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateStandard(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateStandard}>
              <Plus className="h-4 w-4 mr-2" />
              Create Standard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Evidence Dialog */}
      <Dialog open={showAddEvidence} onOpenChange={setShowAddEvidence}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Evidence</DialogTitle>
            <DialogDescription>
              Record evidence of student competency development
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Student *</label>
                <Select value={evidenceForm.studentId} onValueChange={(value) => setEvidenceForm(prev => ({ ...prev, studentId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map(student => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.firstName} {student.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Academic Standard *</label>
                <Select value={evidenceForm.standardId} onValueChange={(value) => setEvidenceForm(prev => ({ ...prev, standardId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select standard" />
                  </SelectTrigger>
                  <SelectContent>
                    {standards.map(standard => (
                      <SelectItem key={standard.id} value={standard.id}>
                        {standard.code} - {standard.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Evidence Type</label>
                <Select value={evidenceForm.evidenceType} onValueChange={(value: any) => setEvidenceForm(prev => ({ ...prev, evidenceType: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="artifact">Artifact</SelectItem>
                    <SelectItem value="observation">Observation</SelectItem>
                    <SelectItem value="assessment">Assessment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Proficiency Level</label>
                <Select value={evidenceForm.proficiencyLevel} onValueChange={(value: any) => setEvidenceForm(prev => ({ ...prev, proficiencyLevel: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_met">Not Met</SelectItem>
                    <SelectItem value="approaching">Approaching</SelectItem>
                    <SelectItem value="proficient">Proficient</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description *</label>
              <Textarea
                placeholder="Describe the evidence observed or collected..."
                value={evidenceForm.description}
                onChange={(e) => setEvidenceForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Score</label>
                <Input
                  type="number"
                  placeholder="Points earned"
                  value={evidenceForm.score}
                  onChange={(e) => setEvidenceForm(prev => ({ ...prev, score: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Score</label>
                <Input
                  type="number"
                  placeholder="Total points possible"
                  value={evidenceForm.maxScore}
                  onChange={(e) => setEvidenceForm(prev => ({ ...prev, maxScore: parseInt(e.target.value) || 100 }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Feedback</label>
              <Textarea
                placeholder="Additional feedback or observations..."
                value={evidenceForm.feedback}
                onChange={(e) => setEvidenceForm(prev => ({ ...prev, feedback: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEvidence(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEvidence}>
              <Plus className="h-4 w-4 mr-2" />
              Add Evidence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
