export enum SubscriptionTier {
  STARTER = 'starter',
  PRO = 'pro',
  ELITE = 'elite'
}

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  tier: SubscriptionTier;
}

export enum AppView {
  DASHBOARD = 'dashboard',
  RESEARCH = 'research',
  COMPOSER = 'composer',
  NETWORK = 'network',
  ONBOARDING = 'onboarding',
  PRICING = 'pricing',
  HOME = 'home',
  AUTH = 'auth',
  VOICE_LAB = 'voice_lab'
}

export interface VoiceProfile {
  tone: string;
  style: string;
  frequentWords: string[];
  lastUpdated: string;
}

export interface Post {
  id: string;
  content: string;
  engagement: number;
  date: string;
  topic: string;
}

export interface Lead {
  id: string;
  name: string;
  role: string;
  company: string;
  lastContact: string;
  status: 'cold' | 'warm' | 'hot' | 'connected';
}

export interface Trend {
  topic: string;
  sentiment: string;
  reach: string;
  relevance: number;
  explanation: string;
}

export interface UserPreferences {
  niche: string;
  industry: string;
  targetAudience: string;
  tone: string;
  frequency: string;
}

export interface ConnectionSuggestion {
  id: string;
  name: string;
  role: string;
  company: string;
  reason: string;
  matchScore: number;
}
