'use client';

/**
 * Phase 6 Task 6.4.3: Integration with Phase 4 Preparation Materials
 * 
 * Hook to connect evidence system with preparation materials from Phase 4
 */

import { useState, useEffect, useCallback } from 'react';

import { EvidenceSource, EvidenceSuggestion } from '@/components/debate-room/EvidencePanel';

export interface PreparationMaterial {
  id: string;
  topicId: string;
  type: 'research' | 'outline' | 'evidence' | 'counter_argument' | 'source';
  title: string;
  content: string;
  sources?: EvidenceSource[];
  tags: string[];
  position: 'PRO' | 'CON' | 'NEUTRAL';
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
}

export interface PreparationMaterialsHookProps {
  topicId: string;
  userId: string;
  enabled?: boolean;
}

export interface PreparationMaterialsState {
  materials: PreparationMaterial[];
  evidence: EvidenceSource[];
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;
}

// Mock preparation materials that would come from Phase 4
const mockPreparationMaterials: PreparationMaterial[] = [
  {
    id: 'prep-1',
    topicId: 'climate-change-debate',
    type: 'evidence',
    title: 'Climate Data Collection',
    content: 'Comprehensive analysis of global temperature trends and their impacts on various sectors.',
    sources: [
      {
        id: 'prep-source-1',
        title: 'IPCC Sixth Assessment Report',
        author: 'Intergovernmental Panel on Climate Change',
        publication: 'IPCC',
        publishDate: new Date('2023-03-20'),
        url: 'https://ipcc.ch/report/ar6/wg2/',
        excerpt: 'Climate change is affecting ecosystems, biodiversity, and human systems across all regions.',
        credibilityScore: 0.98,
        sourceType: 'government',
        relevanceScore: 0.95,
        position: 'NEUTRAL',
        tags: ['climate', 'ipcc', 'assessment', 'official'],
        verified: true,
        lastVerified: new Date('2023-04-01')
      },
      {
        id: 'prep-source-2',
        title: 'Global Carbon Budget 2023',
        author: 'Global Carbon Project',
        publication: 'Earth System Science Data',
        publishDate: new Date('2023-12-05'),
        url: 'https://globalcarbonbudget.org/',
        excerpt: 'Global CO2 emissions from fossil fuels are projected to rise by 1.1% in 2023.',
        credibilityScore: 0.94,
        sourceType: 'academic',
        relevanceScore: 0.92,
        position: 'NEUTRAL',
        tags: ['carbon', 'emissions', 'budget', 'global'],
        verified: true,
        lastVerified: new Date('2023-12-10')
      }
    ],
    tags: ['climate', 'data', 'temperature', 'evidence'],
    position: 'NEUTRAL',
    createdAt: new Date('2023-10-15'),
    lastUsed: new Date('2023-11-20'),
    usageCount: 8
  },
  {
    id: 'prep-2',
    topicId: 'climate-change-debate',
    type: 'research',
    title: 'Economic Arguments for Climate Action',
    content: 'Research compilation on economic benefits and costs of climate change mitigation strategies.',
    sources: [
      {
        id: 'prep-source-3',
        title: 'The Economics of Climate Change',
        author: 'Nicholas Stern',
        publication: 'Cambridge University Press',
        publishDate: new Date('2022-08-15'),
        url: 'https://cambridge.org/stern-review-economics-climate-change',
        excerpt: 'The benefits of strong and early action on climate change outweigh the economic costs.',
        credibilityScore: 0.91,
        sourceType: 'academic',
        relevanceScore: 0.89,
        position: 'PRO',
        tags: ['economics', 'climate', 'stern', 'policy'],
        verified: true,
        lastVerified: new Date('2022-09-01')
      }
    ],
    tags: ['economics', 'policy', 'costs', 'benefits'],
    position: 'PRO',
    createdAt: new Date('2023-10-10'),
    lastUsed: new Date('2023-11-18'),
    usageCount: 5
  },
  {
    id: 'prep-3',
    topicId: 'climate-change-debate',
    type: 'counter_argument',
    title: 'Economic Concerns about Climate Policies',
    content: 'Analysis of potential economic drawbacks and implementation challenges of climate policies.',
    sources: [
      {
        id: 'prep-source-4',
        title: 'Climate Policy Economic Analysis',
        author: 'Energy Research Institute',
        publication: 'Policy Economics Journal',
        publishDate: new Date('2023-09-12'),
        url: 'https://energyresearch.org/policy-analysis-2023',
        excerpt: 'Rapid implementation of climate policies may cause short-term economic disruption in certain sectors.',
        credibilityScore: 0.78,
        sourceType: 'organization',
        relevanceScore: 0.85,
        position: 'CON',
        tags: ['economics', 'policy', 'challenges', 'implementation'],
        verified: true,
        lastVerified: new Date('2023-09-20')
      }
    ],
    tags: ['economics', 'challenges', 'implementation', 'concerns'],
    position: 'CON',
    createdAt: new Date('2023-10-12'),
    lastUsed: new Date('2023-11-15'),
    usageCount: 3
  }
];

export function usePreparationMaterials({
  topicId,
  userId,
  enabled = true
}: PreparationMaterialsHookProps) {
  const [state, setState] = useState<PreparationMaterialsState>({
    materials: [],
    evidence: [],
    isLoading: false,
    error: null,
    lastSync: null
  });

  // Fetch preparation materials
  const fetchPreparationMaterials = useCallback(async () => {
    if (!enabled || !topicId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // TODO: Replace with actual API call to Phase 4 backend
      // const response = await fetch(`/api/preparation/materials`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ topicId, userId })
      // });
      
      // if (!response.ok) {
      //   throw new Error('Failed to fetch preparation materials');
      // }
      
      // const data = await response.json();

      // Mock implementation for development
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const materials = mockPreparationMaterials.filter(m => m.topicId === topicId);
      const evidence = materials.flatMap(m => m.sources || []);

      setState(prev => ({
        ...prev,
        materials,
        evidence,
        isLoading: false,
        lastSync: new Date(),
        error: null
      }));

    } catch (error) {
      console.error('Error fetching preparation materials:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load preparation materials'
      }));
    }
  }, [topicId, userId, enabled]);

  // Update material usage
  const updateMaterialUsage = useCallback(async (materialId: string) => {
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/preparation/materials/${materialId}/usage`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ userId })
      // });

      // Update local state
      setState(prev => ({
        ...prev,
        materials: prev.materials.map(material => 
          material.id === materialId 
            ? { 
                ...material, 
                usageCount: material.usageCount + 1,
                lastUsed: new Date() 
              }
            : material
        )
      }));

    } catch (error) {
      console.error('Error updating material usage:', error);
    }
  }, []);

  // Get evidence by position
  const getEvidenceByPosition = useCallback((position: 'PRO' | 'CON' | 'NEUTRAL') => {
    return state.evidence.filter(evidence => evidence.position === position);
  }, [state.evidence]);

  // Get materials by type
  const getMaterialsByType = useCallback((type: PreparationMaterial['type']) => {
    return state.materials.filter(material => material.type === type);
  }, [state.materials]);

  // Get recently used materials
  const getRecentlyUsedMaterials = useCallback((limit: number = 5) => {
    return state.materials
      .filter(material => material.lastUsed)
      .sort((a, b) => (b.lastUsed?.getTime() || 0) - (a.lastUsed?.getTime() || 0))
      .slice(0, limit);
  }, [state.materials]);

  // Search materials
  const searchMaterials = useCallback((query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return state.materials.filter(material => 
      material.title.toLowerCase().includes(lowercaseQuery) ||
      material.content.toLowerCase().includes(lowercaseQuery) ||
      material.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }, [state.materials]);

  // Convert preparation material to evidence suggestion
  const convertToEvidenceSuggestion = useCallback((material: PreparationMaterial): EvidenceSuggestion[] => {
    if (!material.sources || material.sources.length === 0) return [];

    return material.sources.map((source, index) => ({
      id: `${material.id}-evidence-${index}`,
      type: material.type === 'evidence' ? 'study' : 
            material.type === 'research' ? 'example' : 'comparison',
      title: material.title,
      description: `From preparation materials: ${material.content.substring(0, 100)}...`,
      content: material.content,
      source,
      strength: source.credibilityScore > 0.9 ? 'high' as const : 
                source.credibilityScore > 0.7 ? 'medium' as const : 'low' as const,
      contextRelevance: source.relevanceScore,
      citations: [`${source.author}. (${source.publishDate.getFullYear()}). ${source.title}. ${source.publication}.`],
      tags: material.tags,
      lastUpdated: material.createdAt
    }));
  }, []);

  // Auto-fetch materials when conditions change
  useEffect(() => {
    if (enabled && topicId) {
      fetchPreparationMaterials();
    }
  }, [fetchPreparationMaterials, enabled, topicId]);

  return {
    // State
    materials: state.materials,
    evidence: state.evidence,
    isLoading: state.isLoading,
    error: state.error,
    lastSync: state.lastSync,
    
    // Actions
    refreshMaterials: fetchPreparationMaterials,
    updateMaterialUsage,
    
    // Utilities
    getEvidenceByPosition,
    getMaterialsByType,
    getRecentlyUsedMaterials,
    searchMaterials,
    convertToEvidenceSuggestion,
    
    // Computed values
    hasPreparationData: state.materials.length > 0,
    evidenceCount: state.evidence.length,
    materialsByPosition: {
      PRO: state.materials.filter(m => m.position === 'PRO'),
      CON: state.materials.filter(m => m.position === 'CON'),
      NEUTRAL: state.materials.filter(m => m.position === 'NEUTRAL')
    }
  };
}

export default usePreparationMaterials;
