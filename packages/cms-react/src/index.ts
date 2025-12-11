export { PageDataProvider, usePageData } from './contexts/PageDataContext';
export { ContentRenderer } from './components/ContentRenderer';
export { PageTransition } from './components/PageTransition';
export { useLanguage } from './hooks/useLanguage';
export { useNavigation } from './hooks/useNavigation';
export { default as useAuthentication } from './hooks/useAuthentication';

// Types
export type {
  User,
  LoginCredentials,
  SignupCredentials,
  LoginResponse,
  UseAuthenticationConfig,
  UseAuthenticationReturn,
} from './hooks/useAuthentication';
