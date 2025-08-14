// Main profile components
export { ProfileCard } from './ProfileCard';
export { ProfileView } from './ProfileView';
export { ProfileEditForm } from './ProfileEditForm';
export { ProfileSearch } from './ProfileSearch';
export { ProfileDashboard } from './ProfileDashboard';
export { BeliefProfileVisualization } from './BeliefProfileVisualization';
export { ProfileConfirmation } from './ProfileConfirmation';
export { ResponseEditor } from './ResponseEditor';
export { EducationalProfileGuide } from './EducationalProfileGuide';
export { ProfilePrivacyManager } from './ProfilePrivacyManager';

// Navigation components
export { 
  ProfileNavigation,
  ProfileBreadcrumb,
  ProfileActions,
  BackButton,
  ProfilePageHeader,
  ProfileRoutes,
  useProfileNavigation
} from './ProfileNavigation';

// Types
export type { ProfileVariant } from '@/types/profile';

// Re-export types for convenience
export type { 
  Profile, 
  User, 
  IdeologyScores, 
  SurveyResponses, 
  ProfileInsights, 
  ProfileStats, 
  CreateProfileRequest, 
  UpdateProfileRequest, 
  ApiResponse 
} from '@/types/profile';
