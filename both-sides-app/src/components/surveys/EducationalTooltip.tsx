/**
 * Phase 3 Task 3.3.1.4: Educational Context and Explanations
 * Tooltips and explanations for complex political concepts
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  HelpCircle,
  X,
  BookOpen,
  ExternalLink,
  Lightbulb
} from 'lucide-react';

interface EducationalTooltipProps {
  term: string;
  definition: string;
  explanation?: string;
  examples?: string[];
  relatedConcepts?: string[];
  resources?: { title: string; url: string }[];
  className?: string;
}

interface ConceptExplanation {
  term: string;
  shortDefinition: string;
  fullExplanation: string;
  examples: string[];
  relatedConcepts: string[];
  resources: { title: string; url: string }[];
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

// Educational content database
const CONCEPT_DATABASE: Record<string, ConceptExplanation> = {
  'economic_liberalism': {
    term: 'Economic Liberalism',
    shortDefinition: 'Support for free markets and limited government intervention in the economy',
    fullExplanation: `Economic liberalism emphasizes the benefits of free markets, private property, and minimal government regulation of business. Supporters believe that market forces, competition, and individual choice lead to the best economic outcomes for society. This includes support for lower taxes, reduced government spending, and deregulation of industries.`,
    examples: [
      'Supporting lower corporate tax rates to encourage business investment',
      'Preferring private healthcare systems over government-run healthcare',
      'Favoring deregulation of industries to increase competition'
    ],
    relatedConcepts: ['free_market', 'capitalism', 'deregulation', 'privatization'],
    resources: [
      { title: 'Khan Academy: Economic Systems', url: '#' },
      { title: 'Introduction to Economic Principles', url: '#' }
    ],
    difficulty: 'intermediate'
  },

  'social_liberalism': {
    term: 'Social Liberalism',
    shortDefinition: 'Support for individual freedoms and equal rights in social matters',
    fullExplanation: `Social liberalism focuses on protecting individual rights and freedoms, promoting equality, and ensuring that all people can participate fully in society regardless of their background. This includes support for civil rights, religious freedom, gender equality, and protection of minority rights. Social liberals typically oppose discrimination and support policies that promote inclusion.`,
    examples: [
      'Supporting marriage equality for LGBTQ+ individuals',
      'Advocating for equal pay regardless of gender or race',
      'Protecting freedom of religion and expression'
    ],
    relatedConcepts: ['civil_rights', 'equality', 'individual_liberty', 'diversity'],
    resources: [
      { title: 'Civil Rights Movement History', url: '#' },
      { title: 'Understanding Individual Rights', url: '#' }
    ],
    difficulty: 'basic'
  },

  'authoritarianism': {
    term: 'Authoritarianism',
    shortDefinition: 'Support for strong government control and less individual freedom',
    fullExplanation: `Authoritarianism favors strong, centralized government authority and may prioritize order, security, and traditional values over individual freedoms. This can include support for strict law enforcement, limitations on certain civil liberties in favor of collective security, and belief that strong leadership is sometimes necessary to maintain social order.`,
    examples: [
      'Supporting enhanced security measures even if they limit some privacy',
      'Believing strong leadership is needed during times of crisis',
      'Prioritizing public order over some individual rights'
    ],
    relatedConcepts: ['law_and_order', 'security', 'traditional_values', 'strong_leadership'],
    resources: [
      { title: 'Political Systems Overview', url: '#' },
      { title: 'Government Types Explained', url: '#' }
    ],
    difficulty: 'intermediate'
  },

  'libertarianism': {
    term: 'Libertarianism',
    shortDefinition: 'Maximum individual freedom and minimal government interference',
    fullExplanation: `Libertarianism emphasizes individual freedom, personal responsibility, and minimal government intervention in both economic and social matters. Libertarians generally want government to be limited to protecting people's rights and providing essential services, while allowing maximum freedom for individuals to make their own choices.`,
    examples: [
      'Opposing most government regulations on personal choices',
      'Supporting both economic freedom and social freedom',
      'Believing people should be free to make their own decisions as long as they don\'t harm others'
    ],
    relatedConcepts: ['individual_freedom', 'personal_responsibility', 'limited_government', 'non_aggression'],
    resources: [
      { title: 'Philosophy of Individual Freedom', url: '#' },
      { title: 'Limited Government Principles', url: '#' }
    ],
    difficulty: 'intermediate'
  },

  'progressivism': {
    term: 'Progressivism',
    shortDefinition: 'Support for social reform and using government to solve societal problems',
    fullExplanation: `Progressivism advocates for using government and social institutions to address inequality, injustice, and societal problems. Progressives typically support reforms that they believe will improve society, such as expanding access to education and healthcare, protecting the environment, and reducing economic inequality. They often favor active government involvement in addressing social issues.`,
    examples: [
      'Supporting government programs to reduce income inequality',
      'Advocating for environmental protection laws',
      'Promoting universal healthcare or education access'
    ],
    relatedConcepts: ['social_reform', 'government_intervention', 'equality', 'environmental_protection'],
    resources: [
      { title: 'History of Progressive Movements', url: '#' },
      { title: 'Social Reform in Democracy', url: '#' }
    ],
    difficulty: 'basic'
  },

  'conservatism': {
    term: 'Conservatism',
    shortDefinition: 'Preference for traditional values and gradual change',
    fullExplanation: `Conservatism values traditional institutions, practices, and values while being cautious about rapid social change. Conservatives often believe that established systems and traditions have value and should be preserved or changed slowly and carefully. This includes respect for established institutions like family, religion, and long-standing cultural practices.`,
    examples: [
      'Valuing traditional family structures and relationships',
      'Respecting established religious and cultural practices',
      'Preferring gradual reform over rapid social change'
    ],
    relatedConcepts: ['tradition', 'stability', 'established_institutions', 'gradual_change'],
    resources: [
      { title: 'Understanding Political Traditions', url: '#' },
      { title: 'Role of Institutions in Society', url: '#' }
    ],
    difficulty: 'basic'
  }
};

export function EducationalTooltip({
  term,
  definition,
  explanation,
  examples,
  relatedConcepts,
  resources,
  className = ''
}: EducationalTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Try to get enhanced definition from database
  const enhancedConcept = CONCEPT_DATABASE[term.toLowerCase().replace(/\s+/g, '_')];

  return (
    <div className={`relative inline-block ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        className="p-1 h-auto text-blue-600 hover:text-blue-800 hover:bg-blue-50"
        onClick={() => setIsOpen(true)}
        aria-label={`Learn more about ${term}`}
      >
        <HelpCircle className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <Card className="max-w-2xl max-h-[90vh] overflow-auto shadow-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    {enhancedConcept?.term || term}
                  </CardTitle>
                  {enhancedConcept?.difficulty && (
                    <Badge 
                      variant="secondary" 
                      className="mt-2"
                    >
                      {enhancedConcept.difficulty} level
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Short Definition */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Quick Definition
                </h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {enhancedConcept?.shortDefinition || definition}
                </p>
              </div>

              {/* Full Explanation */}
              {(enhancedConcept?.fullExplanation || explanation) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Detailed Explanation
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {enhancedConcept?.fullExplanation || explanation}
                  </p>
                </div>
              )}

              {/* Examples */}
              {(enhancedConcept?.examples || examples) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Examples
                  </h3>
                  <ul className="space-y-2">
                    {(enhancedConcept?.examples || examples || []).map((example, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-blue-500 font-bold">•</span>
                        {example}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Related Concepts */}
              {(enhancedConcept?.relatedConcepts || relatedConcepts) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Related Concepts
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(enhancedConcept?.relatedConcepts || relatedConcepts || []).map((concept, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {concept.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Educational Resources */}
              {(enhancedConcept?.resources || resources) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Learn More
                  </h3>
                  <div className="space-y-2">
                    {(enhancedConcept?.resources || resources || []).map((resource, index) => (
                      <a
                        key={index}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {resource.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Educational Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Remember:</strong> These are general descriptions of political concepts. 
                  Real people often have nuanced views that don't fit perfectly into any category. 
                  The goal is understanding, not labeling.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Convenient wrapper for inline educational tooltips
export function InlineEducationalTooltip({ 
  children, 
  term 
}: { 
  children: React.ReactNode;
  term: string;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <EducationalTooltip
        term={term}
        definition=""
        className="inline-block"
      />
    </span>
  );
}

// Hook for managing educational content
export function useEducationalContent() {
  const [viewedConcepts, setViewedConcepts] = useState<Set<string>>(new Set());

  const markConceptViewed = (concept: string) => {
    setViewedConcepts(prev => new Set(prev.add(concept)));
  };

  const getRecommendedConcepts = (currentConcept: string) => {
    const concept = CONCEPT_DATABASE[currentConcept.toLowerCase().replace(/\s+/g, '_')];
    return concept?.relatedConcepts || [];
  };

  return {
    viewedConcepts,
    markConceptViewed,
    getRecommendedConcepts,
    conceptDatabase: CONCEPT_DATABASE
  };
}
