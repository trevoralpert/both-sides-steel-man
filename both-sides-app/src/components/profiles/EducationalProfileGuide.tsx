'use client';

import { useState } from 'react';

import { IdeologyScores } from '@/types/profile';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen,
  Users,
  TrendingUp,
  Target,
  Lightbulb,
  Award,
  ChevronDown,
  ChevronRight,
  Info,
  ExternalLink,
  Play,
  Brain,
  Compass,
  Scale,
  Globe,
  Leaf,
  Heart
} from 'lucide-react';

interface EducationalProfileGuideProps {
  ideologyScores: IdeologyScores;
  opinionPlasticity: number;
  className?: string;
  showPersonalizedContent?: boolean;
}

// Educational content for different ideology dimensions
const IDEOLOGY_EDUCATION = {
  economic: {
    title: 'Economic Views',
    icon: Scale,
    description: 'How you think society should organize economic systems and distribute wealth',
    spectrum: {
      left: {
        label: 'Progressive/Left',
        description: 'Believes government should actively address economic inequality',
        characteristics: [
          'Support for social safety nets',
          'Progressive taxation',
          'Government regulation of markets',
          'Worker rights and unions',
          'Universal basic services'
        ],
        historicalFigures: ['Franklin D. Roosevelt', 'Bernie Sanders', 'Elizabeth Warren'],
        modernExample: 'Supporting universal healthcare and free college education'
      },
      right: {
        label: 'Conservative/Right', 
        description: 'Emphasizes free markets and individual economic responsibility',
        characteristics: [
          'Lower taxes and government spending',
          'Free market capitalism',
          'Reduced business regulation',
          'Individual responsibility',
          'Private property rights'
        ],
        historicalFigures: ['Ronald Reagan', 'Milton Friedman', 'Margaret Thatcher'],
        modernExample: 'Supporting tax cuts and deregulation to stimulate business growth'
      }
    },
    learningResources: [
      { title: 'Economic Systems Explained', type: 'video', url: '#' },
      { title: 'The Political Compass Economic Test', type: 'quiz', url: '#' },
      { title: 'Left vs Right Economics', type: 'article', url: '#' }
    ]
  },
  social: {
    title: 'Social Authority',
    icon: Users,
    description: 'Your views on individual freedom versus collective social order',
    spectrum: {
      left: {
        label: 'Authoritarian',
        description: 'Values social order, tradition, and collective responsibility',
        characteristics: [
          'Strong law and order',
          'Traditional values',
          'Social cohesion over individual rights',
          'Respect for authority',
          'Community standards'
        ],
        historicalFigures: ['Lee Kuan Yew', 'Charles de Gaulle'],
        modernExample: 'Supporting mandatory community service and strong law enforcement'
      },
      right: {
        label: 'Libertarian',
        description: 'Prioritizes individual freedom and personal choice',
        characteristics: [
          'Personal liberty and privacy',
          'Minimal government interference',
          'Individual rights over collective needs',
          'Social tolerance and diversity',
          'Freedom of expression'
        ],
        historicalFigures: ['John Stuart Mill', 'Ron Paul', 'Gary Johnson'],
        modernExample: 'Supporting drug decriminalization and marriage equality'
      }
    },
    learningResources: [
      { title: 'Authoritarian vs Libertarian Values', type: 'video', url: '#' },
      { title: 'Social Freedom Quiz', type: 'quiz', url: '#' },
      { title: 'Civil Liberties Debate Guide', type: 'article', url: '#' }
    ]
  },
  tradition: {
    title: 'Cultural Change',
    icon: Heart,
    description: 'How you approach tradition versus progressive social change',
    spectrum: {
      left: {
        label: 'Progressive',
        description: 'Embraces social change and challenges established norms',
        characteristics: [
          'Social justice and equality',
          'Challenging traditional power structures',
          'Cultural diversity and inclusion',
          'Questioning established institutions',
          'Embracing new social arrangements'
        ],
        historicalFigures: ['Martin Luther King Jr.', 'Susan B. Anthony', 'Harvey Milk'],
        modernExample: 'Supporting LGBTQ+ rights and racial justice movements'
      },
      right: {
        label: 'Traditional',
        description: 'Values established customs and gradual, careful change',
        characteristics: [
          'Respect for cultural heritage',
          'Gradual rather than radical change',
          'Proven institutions and practices',
          'Intergenerational wisdom',
          'Stability and continuity'
        ],
        historicalFigures: ['Edmund Burke', 'Russell Kirk', 'William F. Buckley Jr.'],
        modernExample: 'Preserving cultural traditions while adapting gradually to modern needs'
      }
    },
    learningResources: [
      { title: 'Progressive vs Traditional Values', type: 'video', url: '#' },
      { title: 'Cultural Change Timeline', type: 'interactive', url: '#' },
      { title: 'Sociology of Social Change', type: 'article', url: '#' }
    ]
  },
  globalism: {
    title: 'Global Perspective',
    icon: Globe,
    description: 'How you balance national interests with international cooperation',
    spectrum: {
      left: {
        label: 'Nationalist',
        description: 'Prioritizes national sovereignty and local control',
        characteristics: [
          'National sovereignty over global governance',
          'Protecting domestic industries and workers',
          'Strong borders and immigration control',
          'Skeptical of international organizations',
          'America First / [Country] First policies'
        ],
        historicalFigures: ['Charles de Gaulle', 'Donald Trump', 'Marine Le Pen'],
        modernExample: 'Withdrawing from international agreements to protect national interests'
      },
      right: {
        label: 'Globalist',
        description: 'Supports international cooperation and global solutions',
        characteristics: [
          'International cooperation on global challenges',
          'Free trade and open borders',
          'Multilateral institutions and treaties',
          'Global citizenship and cosmopolitanism',
          'Collective action on global problems'
        ],
        historicalFigures: ['Woodrow Wilson', 'Jean Monnet', 'Kofi Annan'],
        modernExample: 'Supporting international climate agreements and free trade deals'
      }
    },
    learningResources: [
      { title: 'Nationalism vs Globalism Explained', type: 'video', url: '#' },
      { title: 'International Relations Basics', type: 'course', url: '#' },
      { title: 'Global Governance Debate', type: 'article', url: '#' }
    ]
  },
  environment: {
    title: 'Environmental Priority',
    icon: Leaf,
    description: 'How you balance environmental protection with economic development',
    spectrum: {
      left: {
        label: 'Economy-Focused',
        description: 'Prioritizes economic growth and development',
        characteristics: [
          'Job creation and economic growth',
          'Market-based environmental solutions',
          'Gradual transition to sustainability',
          'Balancing environmental and economic costs',
          'Technological innovation over regulation'
        ],
        historicalFigures: ['Business leaders', 'Pro-growth politicians'],
        modernExample: 'Supporting natural gas as a bridge fuel while developing renewable energy'
      },
      right: {
        label: 'Environment-Focused',
        description: 'Prioritizes environmental protection and sustainability',
        characteristics: [
          'Climate change as existential threat',
          'Rapid transition to renewable energy',
          'Strong environmental regulations',
          'Green New Deal type policies',
          'Sacrifice economic growth if necessary'
        ],
        historicalFigures: ['Rachel Carson', 'Al Gore', 'Greta Thunberg'],
        modernExample: 'Supporting immediate fossil fuel phase-out despite economic disruption'
      }
    },
    learningResources: [
      { title: 'Environmental Economics 101', type: 'video', url: '#' },
      { title: 'Climate Policy Options', type: 'interactive', url: '#' },
      { title: 'Green Growth vs Degrowth Debate', type: 'article', url: '#' }
    ]
  }
};

const PLASTICITY_EDUCATION = {
  title: 'Opinion Flexibility',
  description: 'How open you are to changing your mind when presented with new information',
  levels: {
    veryFirm: {
      range: '0-20%',
      description: 'You have strong, well-formed beliefs that rarely change',
      strengths: ['Principled decision-making', 'Consistent worldview', 'Strong convictions'],
      challenges: ['May miss new information', 'Difficulty adapting to change', 'Potential for dogmatism'],
      debateStyle: 'You\'ll engage best with partners who respect your convictions while presenting well-researched alternative viewpoints',
      improvementTips: ['Practice asking "What would change my mind?"', 'Seek out high-quality opposing arguments', 'Focus on areas where you feel less certain']
    },
    firm: {
      range: '21-40%',
      description: 'You hold strong views but can be persuaded with exceptional evidence',
      strengths: ['Thoughtful conviction', 'Resistance to manipulation', 'Stable worldview'],
      challenges: ['Slow to adapt to new information', 'May require overwhelming evidence', 'Risk of confirmation bias'],
      debateStyle: 'You work well with patient partners who can present systematic, evidence-based arguments',
      improvementTips: ['Set specific criteria for changing your mind', 'Regularly review your assumptions', 'Practice steel-manning opposing arguments']
    },
    moderate: {
      range: '41-60%',
      description: 'You balance conviction with openness to new perspectives',
      strengths: ['Balanced thinking', 'Adaptive to new information', 'Open to compromise'],
      challenges: ['May appear inconsistent', 'Difficulty with rapid decisions', 'Potential for overthinking'],
      debateStyle: 'You thrive with partners who can engage in nuanced discussions and explore complexity',
      improvementTips: ['Practice taking clear positions', 'Develop frameworks for decision-making', 'Don\'t let openness become paralysis']
    },
    flexible: {
      range: '61-80%',
      description: 'You are open to changing your mind when presented with good evidence',
      strengths: ['Intellectual humility', 'Quick learning', 'Collaborative approach'],
      challenges: ['May change positions too quickly', 'Difficulty maintaining consistent positions', 'Potential for being swayed by rhetoric'],
      debateStyle: 'You excel with partners who can present well-reasoned arguments while helping you explore implications',
      improvementTips: ['Take time to fully evaluate new information', 'Develop core principles that guide changes', 'Practice defending positions you believe in']
    },
    veryFlexible: {
      range: '81-100%',
      description: 'You are extremely open to new perspectives and readily consider alternatives',
      strengths: ['Intellectual curiosity', 'Rapid adaptation', 'Empathetic understanding'],
      challenges: ['May lack firm convictions', 'Difficulty making decisive choices', 'Risk of being influenced by poor arguments'],
      debateStyle: 'You benefit from partners who can help you develop and test your own positions systematically',
      improvementTips: ['Identify your core values and principles', 'Practice defending important beliefs', 'Learn to distinguish good from poor evidence']
    }
  }
};

export function EducationalProfileGuide({
  ideologyScores,
  opinionPlasticity,
  showPersonalizedContent = true,
  className = ''
}: EducationalProfileGuideProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [selectedTab, setSelectedTab] = useState('ideology');

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getPlasticityLevel = (plasticity: number): keyof typeof PLASTICITY_EDUCATION.levels => {
    if (plasticity >= 0.8) return 'veryFlexible';
    if (plasticity >= 0.6) return 'flexible';  
    if (plasticity >= 0.4) return 'moderate';
    if (plasticity >= 0.2) return 'firm';
    return 'veryFirm';
  };

  const plasticityLevel = getPlasticityLevel(opinionPlasticity);
  const plasticityInfo = PLASTICITY_EDUCATION.levels[plasticityLevel];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-6 w-6 mr-2" />
            Understanding Your Political Profile
          </CardTitle>
          <CardDescription>
            Learn about your beliefs, discover different perspectives, and become a better debater
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ideology">Ideology Guide</TabsTrigger>
          <TabsTrigger value="flexibility">Flexibility</TabsTrigger>
          <TabsTrigger value="comparison">Compare Views</TabsTrigger>
          <TabsTrigger value="resources">Learn More</TabsTrigger>
        </TabsList>

        {/* Ideology Education Tab */}
        <TabsContent value="ideology" className="space-y-6">
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Your political beliefs exist along multiple dimensions. Understanding these helps you engage 
              in more nuanced political discussions and better understand others' perspectives.
            </AlertDescription>
          </Alert>

          {Object.entries(IDEOLOGY_EDUCATION).map(([key, dimension]) => {
            const IconComponent = dimension.icon;
            const userScore = ideologyScores[key as keyof IdeologyScores];
            const isPersonalized = showPersonalizedContent && userScore !== undefined;
            
            return (
              <Card key={key}>
                <CardHeader>
                  <Collapsible 
                    open={openSections[key]} 
                    onOpenChange={() => toggleSection(key)}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <IconComponent className="h-5 w-5 mr-3" />
                        <div className="text-left">
                          <CardTitle className="text-lg">{dimension.title}</CardTitle>
                          <CardDescription>{dimension.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isPersonalized && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            Your Position: {userScore! > 0.1 ? dimension.spectrum.right.label : 
                                          userScore! < -0.1 ? dimension.spectrum.left.label : 'Moderate'}
                          </Badge>
                        )}
                        {openSections[key] ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="mt-4">
                      <div className="space-y-6">
                        {/* Visual spectrum */}
                        {isPersonalized && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span>{dimension.spectrum.left.label}</span>
                              <span>Moderate</span>
                              <span>{dimension.spectrum.right.label}</span>
                            </div>
                            <div className="relative">
                              <Progress value={50} className="h-2 opacity-30" />
                              <div 
                                className="absolute top-0 w-3 h-3 bg-blue-600 rounded-full border-2 border-white transform -translate-y-0.5"
                                style={{ left: `calc(${((userScore! + 1) / 2) * 100}% - 6px)` }}
                              />
                            </div>
                            <div className="text-center mt-2">
                              <Badge variant="outline">
                                {Math.abs(userScore!) < 0.1 ? 'Moderate' : 
                                 userScore! < 0 ? `${dimension.spectrum.left.label} (${Math.abs(Math.round(userScore! * 100))}%)` :
                                 `${dimension.spectrum.right.label} (${Math.round(userScore! * 100)}%)`
                                }
                              </Badge>
                            </div>
                          </div>
                        )}

                        {/* Spectrum explanations */}
                        <div className="grid md:grid-cols-2 gap-6">
                          <Card className="border-l-4 border-l-blue-500">
                            <CardHeader>
                              <CardTitle className="text-base">{dimension.spectrum.left.label}</CardTitle>
                              <CardDescription>{dimension.spectrum.left.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <h5 className="font-medium text-sm mb-2">Key Characteristics:</h5>
                                <ul className="text-sm space-y-1">
                                  {dimension.spectrum.left.characteristics.map((char, i) => (
                                    <li key={i} className="flex items-start">
                                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0" />
                                      {char}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h5 className="font-medium text-sm mb-1">Example:</h5>
                                <p className="text-sm text-muted-foreground">{dimension.spectrum.left.modernExample}</p>
                              </div>
                            </CardContent>
                          </Card>

                          <Card className="border-l-4 border-l-red-500">
                            <CardHeader>
                              <CardTitle className="text-base">{dimension.spectrum.right.label}</CardTitle>
                              <CardDescription>{dimension.spectrum.right.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <h5 className="font-medium text-sm mb-2">Key Characteristics:</h5>
                                <ul className="text-sm space-y-1">
                                  {dimension.spectrum.right.characteristics.map((char, i) => (
                                    <li key={i} className="flex items-start">
                                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 mr-2 flex-shrink-0" />
                                      {char}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h5 className="font-medium text-sm mb-1">Example:</h5>
                                <p className="text-sm text-muted-foreground">{dimension.spectrum.right.modernExample}</p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Learning resources */}
                        <div className="border-t pt-4">
                          <h5 className="font-medium text-sm mb-3">Learn More About {dimension.title}</h5>
                          <div className="flex flex-wrap gap-2">
                            {dimension.learningResources.map((resource, i) => (
                              <Button key={i} variant="outline" size="sm" className="h-8">
                                <Play className="h-3 w-3 mr-1" />
                                {resource.title}
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardHeader>
              </Card>
            );
          })}
        </TabsContent>

        {/* Flexibility Education Tab */}
        <TabsContent value="flexibility" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Your Opinion Flexibility: {Math.round(opinionPlasticity * 100)}%
              </CardTitle>
              <CardDescription>
                Understanding your openness to changing your mind
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Flexibility visualization */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{plasticityInfo.range}</span>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {plasticityLevel === 'veryFirm' ? 'Very Firm' :
                     plasticityLevel === 'firm' ? 'Firm' :
                     plasticityLevel === 'moderate' ? 'Moderate' :
                     plasticityLevel === 'flexible' ? 'Flexible' : 'Very Flexible'}
                  </Badge>
                </div>
                <Progress value={opinionPlasticity * 100} className="h-4" />
                <p className="text-sm text-muted-foreground">{plasticityInfo.description}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Strengths */}
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-base text-green-800">Your Strengths</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {plasticityInfo.strengths.map((strength, i) => (
                        <li key={i} className="flex items-start text-sm">
                          <Award className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Challenges */}
                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader>
                    <CardTitle className="text-base text-orange-800">Watch Out For</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {plasticityInfo.challenges.map((challenge, i) => (
                        <li key={i} className="flex items-start text-sm">
                          <TrendingUp className="h-4 w-4 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
                          {challenge}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Debate style */}
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-base text-blue-800 flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Your Ideal Debate Style
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-blue-700">{plasticityInfo.debateStyle}</p>
                </CardContent>
              </Card>

              {/* Improvement tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Tips for Growth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plasticityInfo.improvementTips.map((tip, i) => (
                      <li key={i} className="flex items-start text-sm">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                          <span className="text-blue-600 font-medium text-xs">{i + 1}</span>
                        </div>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Compass className="h-5 w-5 mr-2" />
                How Your Views Compare
              </CardTitle>
              <CardDescription>
                See how your beliefs relate to different political movements and philosophies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="border-blue-200 bg-blue-50 mb-6">
                <Brain className="h-4 w-4" />
                <AlertDescription>
                  Remember: Political beliefs are complex and personal. These comparisons are educational tools, 
                  not labels that define you.
                </AlertDescription>
              </Alert>

              {/* This would show comparisons with political movements, historical figures, etc. */}
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Comparison features coming soon!</p>
                <p className="text-sm">Compare your profile with political movements, historical figures, and peer groups.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Resource categories */}
            {[
              { title: 'Political Philosophy', icon: Brain, description: 'Learn about different political theories and thinkers' },
              { title: 'Debate Skills', icon: Users, description: 'Improve your ability to discuss politics respectfully' },
              { title: 'Media Literacy', icon: Info, description: 'Learn to evaluate news sources and identify bias' },
              { title: 'Civic Engagement', icon: Target, description: 'Find ways to participate in your community and democracy' },
              { title: 'Historical Context', icon: BookOpen, description: 'Understand how current issues developed over time' },
              { title: 'Global Perspectives', icon: Globe, description: 'See how other countries approach similar challenges' }
            ].map((category, i) => (
              <Card key={i} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    <category.icon className="h-5 w-5 mr-2" />
                    {category.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {category.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" className="w-full">
                    Explore Resources
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
