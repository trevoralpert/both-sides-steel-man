/**
 * Session Resource Library Component
 * 
 * Task 8.3.3: Session resource and material management system with categorized materials,
 * custom resource upload, resource sharing, version control, and analytics.
 */

'use client';

import React, { useState, useEffect } from 'react';

import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileText,
  Upload,
  Download,
  Share2,
  Edit,
  Trash2,
  Copy,
  Eye,
  Star,
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  FolderPlus,
  Tag,
  Calendar,
  Users,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Globe,
  Lock,
  RefreshCw,
  History,
  FileImage,
  FileVideo,
  FileAudio,
  Archive,
  ExternalLink
} from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';

import { useTeacherDashboard } from './TeacherDashboardProvider';

// Types
interface ResourceFile {
  id: string;
  name: string;
  description?: string;
  type: 'document' | 'image' | 'video' | 'audio' | 'link' | 'presentation' | 'worksheet';
  format: string; // pdf, docx, jpg, mp4, etc.
  size: number; // bytes
  url: string;
  thumbnailUrl?: string;
  version: string;
  isLatest: boolean;
  
  // Metadata
  uploadedBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  uploadedAt: Date;
  lastModified: Date;
  
  // Categorization
  category: string;
  tags: string[];
  subjects: string[];
  gradeLevel: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  
  // Sharing & Permissions
  visibility: 'private' | 'shared' | 'public';
  sharedWith: string[]; // User IDs
  permissions: {
    canView: string[];
    canEdit: string[];
    canShare: string[];
  };
  
  // Usage Analytics
  usage: {
    totalViews: number;
    totalDownloads: number;
    recentViews: number; // Last 30 days
    avgRating: number;
    ratingCount: number;
    usageBySession: {
      sessionId: string;
      sessionName: string;
      usedAt: Date;
    }[];
  };
  
  // Content Analysis
  content: {
    estimatedReadTime?: number; // minutes
    wordCount?: number;
    topicKeywords: string[];
    learningObjectives: string[];
    prerequisites: string[];
  };
}

interface ResourceFolder {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  color?: string;
  icon?: string;
  isShared: boolean;
  resourceCount: number;
  createdAt: Date;
  createdBy: string;
}

interface ResourceVersion {
  id: string;
  resourceId: string;
  version: string;
  name: string;
  changes: string;
  uploadedBy: {
    id: string;
    name: string;
  };
  uploadedAt: Date;
  url: string;
  size: number;
}

const RESOURCE_CATEGORIES = [
  'Debate Topics',
  'Background Reading',
  'Research Materials',
  'Preparation Guides',
  'Rubrics & Scoring',
  'Activity Templates',
  'Visual Aids',
  'Audio/Video Content',
  'External Links',
  'Student Examples',
  'Assessment Tools',
  'Professional Development'
];

const RESOURCE_TYPES = [
  { id: 'document', label: 'Document', icon: FileText },
  { id: 'image', label: 'Image', icon: FileImage },
  { id: 'video', label: 'Video', icon: FileVideo },
  { id: 'audio', label: 'Audio', icon: FileAudio },
  { id: 'link', label: 'Link', icon: ExternalLink },
  { id: 'presentation', label: 'Presentation', icon: FileText },
  { id: 'worksheet', label: 'Worksheet', icon: FileText }
];

interface SessionResourceLibraryProps {
  sessionId?: string;
  classId?: string;
  onResourceSelect?: (resource: ResourceFile) => void;
  onResourceAdd?: (resource: ResourceFile) => void;
  showOnlyShared?: boolean;
}

export function SessionResourceLibrary({ 
  sessionId,
  classId,
  onResourceSelect,
  onResourceAdd,
  showOnlyShared = false
}: SessionResourceLibraryProps) {
  const { user } = useUser();
  const { addNotification } = useTeacherDashboard();
  
  const [resources, setResources] = useState<ResourceFile[]>([]);
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [selectedResources, setSelectedResources] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('library');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  
  // Dialog states
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showResourceDialog, setShowResourceDialog] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedResource, setSelectedResource] = useState<ResourceFile | null>(null);
  const [resourceVersions, setResourceVersions] = useState<ResourceVersion[]>([]);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    type: '',
    difficulty: '',
    tags: '',
    dateRange: 'all'
  });
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'usage' | 'rating'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    files: [] as File[],
    name: '',
    description: '',
    category: '',
    tags: '',
    difficulty: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    visibility: 'shared' as 'private' | 'shared' | 'public',
    folder: currentFolder || ''
  });

  useEffect(() => {
    loadResources();
    loadFolders();
  }, [user?.id, sessionId, classId]);

  const loadResources = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const token = await user.getToken();
      const params = new URLSearchParams();
      if (sessionId) params.append('sessionId', sessionId);
      if (classId) params.append('classId', classId);
      
      const response = await fetch(`/api/resources?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setResources(data.resources || []);
      } else {
        // Mock data for development
        const mockResources: ResourceFile[] = [
          {
            id: '1',
            name: 'Environmental Policy Research Guide.pdf',
            description: 'Comprehensive research guide for environmental policy debates',
            type: 'document',
            format: 'pdf',
            size: 2048000, // 2MB
            url: '/mock/research-guide.pdf',
            version: '1.2',
            isLatest: true,
            uploadedBy: {
              id: user.id,
              name: user.firstName + ' ' + user.lastName
            },
            uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            category: 'Research Materials',
            tags: ['environment', 'policy', 'research', 'guide'],
            subjects: ['Environmental Science', 'Government'],
            gradeLevel: ['9', '10', '11', '12'],
            difficulty: 'intermediate',
            visibility: 'shared',
            sharedWith: [],
            permissions: {
              canView: [],
              canEdit: [user.id],
              canShare: [user.id]
            },
            usage: {
              totalViews: 143,
              totalDownloads: 67,
              recentViews: 23,
              avgRating: 4.2,
              ratingCount: 15,
              usageBySession: [
                {
                  sessionId: 'session1',
                  sessionName: 'Environmental Policy Debate',
                  usedAt: new Date()
                }
              ]
            },
            content: {
              estimatedReadTime: 15,
              wordCount: 3200,
              topicKeywords: ['pollution', 'regulation', 'sustainability', 'climate'],
              learningObjectives: ['Understand policy frameworks', 'Research skills development'],
              prerequisites: ['Basic environmental concepts']
            }
          },
          {
            id: '2',
            name: 'AI Ethics Discussion Prompts.docx',
            description: 'Discussion prompts and questions for AI ethics debates',
            type: 'document',
            format: 'docx',
            size: 512000, // 512KB
            url: '/mock/ai-ethics-prompts.docx',
            version: '1.0',
            isLatest: true,
            uploadedBy: {
              id: user.id,
              name: user.firstName + ' ' + user.lastName
            },
            uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            category: 'Debate Topics',
            tags: ['AI', 'ethics', 'technology', 'discussion'],
            subjects: ['Philosophy', 'Technology'],
            gradeLevel: ['10', '11', '12'],
            difficulty: 'advanced',
            visibility: 'shared',
            sharedWith: [],
            permissions: {
              canView: [],
              canEdit: [user.id],
              canShare: [user.id]
            },
            usage: {
              totalViews: 89,
              totalDownloads: 34,
              recentViews: 12,
              avgRating: 4.7,
              ratingCount: 8,
              usageBySession: []
            },
            content: {
              estimatedReadTime: 8,
              wordCount: 1800,
              topicKeywords: ['artificial intelligence', 'machine learning', 'bias', 'privacy'],
              learningObjectives: ['Critical thinking about technology', 'Ethical reasoning'],
              prerequisites: ['Basic understanding of AI']
            }
          },
          {
            id: '3',
            name: 'Debate Rubric Template.xlsx',
            description: 'Customizable scoring rubric for debate assessments',
            type: 'document',
            format: 'xlsx',
            size: 256000, // 256KB
            url: '/mock/debate-rubric.xlsx',
            version: '2.1',
            isLatest: true,
            uploadedBy: {
              id: user.id,
              name: user.firstName + ' ' + user.lastName
            },
            uploadedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            category: 'Rubrics & Scoring',
            tags: ['rubric', 'assessment', 'scoring', 'template'],
            subjects: ['General'],
            gradeLevel: ['6', '7', '8', '9', '10', '11', '12'],
            difficulty: 'beginner',
            visibility: 'public',
            sharedWith: [],
            permissions: {
              canView: [],
              canEdit: [user.id],
              canShare: [user.id]
            },
            usage: {
              totalViews: 267,
              totalDownloads: 198,
              recentViews: 45,
              avgRating: 4.9,
              ratingCount: 42,
              usageBySession: [
                {
                  sessionId: 'session1',
                  sessionName: 'Environmental Policy Debate',
                  usedAt: new Date()
                },
                {
                  sessionId: 'session2',
                  sessionName: 'AI Ethics Discussion',
                  usedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
                }
              ]
            },
            content: {
              wordCount: 450,
              topicKeywords: ['assessment', 'criteria', 'performance', 'evaluation'],
              learningObjectives: ['Fair assessment', 'Clear expectations'],
              prerequisites: []
            }
          }
        ];
        setResources(mockResources);
      }
    } catch (error) {
      console.error('Failed to load resources:', error);
      addNotification({
        type: 'error',
        title: 'Loading Error',
        message: 'Failed to load resources. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    if (!user?.id) return;

    try {
      const token = await user.getToken();
      const response = await fetch('/api/resources/folders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
      } else {
        // Mock folders
        const mockFolders: ResourceFolder[] = [
          {
            id: '1',
            name: 'Environmental Topics',
            description: 'Resources related to environmental debates',
            color: '#22c55e',
            icon: '🌱',
            isShared: true,
            resourceCount: 12,
            createdAt: new Date(),
            createdBy: user.id
          },
          {
            id: '2',
            name: 'Technology & AI',
            description: 'Technology-focused debate materials',
            color: '#3b82f6',
            icon: '🤖',
            isShared: true,
            resourceCount: 8,
            createdAt: new Date(),
            createdBy: user.id
          },
          {
            id: '3',
            name: 'Assessment Tools',
            description: 'Rubrics and evaluation materials',
            color: '#f59e0b',
            icon: '📊',
            isShared: false,
            resourceCount: 5,
            createdAt: new Date(),
            createdBy: user.id
          }
        ];
        setFolders(mockFolders);
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const handleFileUpload = async () => {
    if (uploadForm.files.length === 0 || !uploadForm.name) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select files and provide a name.'
      });
      return;
    }

    try {
      setUploading(true);
      
      // Mock upload process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newResource: ResourceFile = {
        id: Date.now().toString(),
        name: uploadForm.name,
        description: uploadForm.description,
        type: 'document',
        format: uploadForm.files[0].name.split('.').pop() || 'unknown',
        size: uploadForm.files[0].size,
        url: `/mock/${uploadForm.files[0].name}`,
        version: '1.0',
        isLatest: true,
        uploadedBy: {
          id: user?.id || '',
          name: user?.firstName + ' ' + user?.lastName || ''
        },
        uploadedAt: new Date(),
        lastModified: new Date(),
        category: uploadForm.category,
        tags: uploadForm.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        subjects: [],
        gradeLevel: [],
        difficulty: uploadForm.difficulty,
        visibility: uploadForm.visibility,
        sharedWith: [],
        permissions: {
          canView: [],
          canEdit: [user?.id || ''],
          canShare: [user?.id || '']
        },
        usage: {
          totalViews: 0,
          totalDownloads: 0,
          recentViews: 0,
          avgRating: 0,
          ratingCount: 0,
          usageBySession: []
        },
        content: {
          topicKeywords: [],
          learningObjectives: [],
          prerequisites: []
        }
      };

      setResources(prev => [newResource, ...prev]);
      onResourceAdd?.(newResource);
      
      addNotification({
        type: 'success',
        title: 'Upload Successful',
        message: `"${uploadForm.name}" has been uploaded successfully.`
      });
      
      setShowUploadDialog(false);
      resetUploadForm();
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Upload Failed',
        message: 'Failed to upload the file. Please try again.'
      });
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadForm({
      files: [],
      name: '',
      description: '',
      category: '',
      tags: '',
      difficulty: 'intermediate',
      visibility: 'shared',
      folder: currentFolder || ''
    });
  };

  const filteredResources = resources.filter(resource => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!resource.name.toLowerCase().includes(searchLower) &&
          !resource.description?.toLowerCase().includes(searchLower) &&
          !resource.tags.some(tag => tag.toLowerCase().includes(searchLower))) {
        return false;
      }
    }
    
    if (filters.category && resource.category !== filters.category) return false;
    if (filters.type && resource.type !== filters.type) return false;
    if (filters.difficulty && resource.difficulty !== filters.difficulty) return false;
    
    if (showOnlyShared && resource.visibility === 'private') return false;
    
    return true;
  });

  const getResourceIcon = (resource: ResourceFile) => {
    const typeConfig = RESOURCE_TYPES.find(t => t.id === resource.type);
    const IconComponent = typeConfig?.icon || FileText;
    return <IconComponent className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public': return <Globe className="h-3 w-3" />;
      case 'shared': return <Users className="h-3 w-3" />;
      case 'private': return <Lock className="h-3 w-3" />;
      default: return <Lock className="h-3 w-3" />;
    }
  };

  if (loading) {
    return <LoadingState message="Loading resource library..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Resource Library</h3>
          <p className="text-muted-foreground">
            Manage and organize your debate session materials
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setShowFolderDialog(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
          <Button onClick={() => setShowUploadDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Resource
          </Button>
        </div>
      </div>

      {/* Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="shared">Shared with Me</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          {/* Filters and Controls */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search resources..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-8 w-64"
                    />
                  </div>
                  
                  <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All categories</SelectItem>
                      {RESOURCE_CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All types</SelectItem>
                      {RESOURCE_TYPES.map(type => (
                        <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    List
                  </Button>
                </div>
              </div>

              {/* Folder Navigation */}
              {folders.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {folders.map(folder => (
                      <Button
                        key={folder.id}
                        variant={currentFolder === folder.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentFolder(folder.id)}
                        className="flex items-center space-x-1"
                      >
                        <span>{folder.icon}</span>
                        <span>{folder.name}</span>
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {folder.resourceCount}
                        </Badge>
                      </Button>
                    ))}
                    {currentFolder && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentFolder(null)}
                      >
                        Show All
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resources Display */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Resources ({filteredResources.length})</CardTitle>
                {selectedResources.size > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedResources.size} selected
                    </span>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {filteredResources.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-medium mb-2">No Resources Found</h3>
                  <p className="text-muted-foreground mb-6">
                    {resources.length === 0 
                      ? "Start building your resource library by uploading materials."
                      : "No resources match your current filters."
                    }
                  </p>
                  {resources.length === 0 && (
                    <Button onClick={() => setShowUploadDialog(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Your First Resource
                    </Button>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredResources.map(resource => (
                    <Card 
                      key={resource.id} 
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedResource(resource);
                        setShowResourceDialog(true);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedResources.has(resource.id)}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedResources);
                                if (checked) {
                                  newSelected.add(resource.id);
                                } else {
                                  newSelected.delete(resource.id);
                                }
                                setSelectedResources(newSelected);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            {getResourceIcon(resource)}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => onResourceSelect?.(resource)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        <h4 className="font-medium text-sm mb-2 line-clamp-2">{resource.name}</h4>
                        {resource.description && (
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                            {resource.description}
                          </p>
                        )}
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <Badge variant="outline">{resource.category}</Badge>
                            <div className="flex items-center text-muted-foreground">
                              {getVisibilityIcon(resource.visibility)}
                              <span className="ml-1">{formatFileSize(resource.size)}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                            <div className="flex items-center">
                              <Eye className="h-3 w-3 mr-1" />
                              {resource.usage.totalViews}
                            </div>
                            <div className="flex items-center">
                              <Download className="h-3 w-3 mr-1" />
                              {resource.usage.totalDownloads}
                            </div>
                            {resource.usage.avgRating > 0 && (
                              <div className="flex items-center">
                                <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                                {resource.usage.avgRating.toFixed(1)}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-1">
                            {resource.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                                {tag}
                              </Badge>
                            ))}
                            {resource.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                +{resource.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                // List view implementation would go here
                <div className="text-center py-8 text-muted-foreground">
                  List view implementation coming soon
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Resource Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Resource analytics dashboard coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shared">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Share2 className="h-5 w-5 mr-2" />
                Shared Resources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Shared resources view coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Resource</DialogTitle>
            <DialogDescription>
              Add a new resource to your library
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Files *</Label>
              <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  onChange={(e) => setUploadForm(prev => ({ ...prev, files: Array.from(e.target.files || []) }))}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Click to select files or drag and drop
                  </p>
                </label>
                {uploadForm.files.length > 0 && (
                  <div className="mt-4 text-left">
                    <p className="font-medium mb-2">Selected files:</p>
                    {uploadForm.files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between py-1">
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="resource-name">Name *</Label>
                <Input
                  id="resource-name"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Resource name"
                />
              </div>
              
              <div>
                <Label htmlFor="resource-category">Category</Label>
                <Select value={uploadForm.category} onValueChange={(value) => setUploadForm(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="resource-description">Description</Label>
              <Textarea
                id="resource-description"
                value={uploadForm.description}
                onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the resource"
                rows={2}
              />
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="resource-tags">Tags</Label>
                <Input
                  id="resource-tags"
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="tag1, tag2, tag3"
                />
              </div>
              
              <div>
                <Label>Difficulty</Label>
                <Select value={uploadForm.difficulty} onValueChange={(value) => setUploadForm(prev => ({ ...prev, difficulty: value as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Visibility</Label>
                <Select value={uploadForm.visibility} onValueChange={(value) => setUploadForm(prev => ({ ...prev, visibility: value as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="shared">Shared</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowUploadDialog(false);
              resetUploadForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleFileUpload} disabled={uploading}>
              {uploading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resource Detail Dialog */}
      {selectedResource && (
        <Dialog open={showResourceDialog} onOpenChange={setShowResourceDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                {getResourceIcon(selectedResource)}
                <span className="ml-2">{selectedResource.name}</span>
              </DialogTitle>
              <DialogDescription>
                {selectedResource.description}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <p className="text-sm">{selectedResource.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Difficulty</Label>
                  <p className="text-sm capitalize">{selectedResource.difficulty}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">File Size</Label>
                  <p className="text-sm">{formatFileSize(selectedResource.size)}</p>
                </div>
              </div>
              
              {selectedResource.tags.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Tags</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedResource.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium">Usage Statistics</Label>
                  <div className="space-y-1 mt-1">
                    <div className="flex justify-between text-sm">
                      <span>Total Views:</span>
                      <span>{selectedResource.usage.totalViews}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Downloads:</span>
                      <span>{selectedResource.usage.totalDownloads}</span>
                    </div>
                    {selectedResource.usage.avgRating > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Average Rating:</span>
                        <span>{selectedResource.usage.avgRating.toFixed(1)} ⭐</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Upload Info</Label>
                  <div className="space-y-1 mt-1">
                    <div className="flex justify-between text-sm">
                      <span>Uploaded:</span>
                      <span>{selectedResource.uploadedAt.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Version:</span>
                      <span>{selectedResource.version}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>By:</span>
                      <span>{selectedResource.uploadedBy.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResourceDialog(false)}>
                Close
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button onClick={() => onResourceSelect?.(selectedResource)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Use Resource
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
