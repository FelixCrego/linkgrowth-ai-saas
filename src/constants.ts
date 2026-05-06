import { AppView, Post, Lead, Trend } from './types';

export const INITIAL_POSTS: Post[] = [
  { id: '1', content: 'The shift towards specialized AI agents is accelerating. Here is why your business should care...', engagement: 1240, date: '2024-05-01', topic: 'AI Trends' },
  { id: '2', content: 'Remote work isn\'t just about location, it\'s about asynchronous autonomy. Thoughts?', engagement: 856, date: '2024-05-02', topic: 'Remote Work' },
  { id: '3', content: 'Why I am betting big on LinkedIn as the primary lead generation channel in 2024.', engagement: 2100, date: '2024-05-03', topic: 'Marketing' },
];

export const INITIAL_LEADS: Lead[] = [
  { id: 'L1', name: 'Sarah Jenkins', role: 'Head of Growth', company: 'TechNova', lastContact: '2 days ago', status: 'warm' },
  { id: 'L2', name: 'Mark Chen', role: 'CTO', company: 'DataSphere', lastContact: '5 days ago', status: 'connected' },
  { id: 'L3', name: 'Elena Rodriguez', role: 'Founder', company: 'GreenScale', lastContact: 'Today', status: 'hot' },
];

export const INITIAL_TRENDS: Trend[] = [
  { 
    topic: 'Generative UI', 
    sentiment: 'Positive', 
    reach: '200K+', 
    relevance: 95,
    explanation: 'As LLMs become more integrated into apps, the need for interfaces that adapt in real-time to user intent is exploding.'
  },
  { 
    topic: 'Asynchronous Auth', 
    sentiment: 'Neutral', 
    reach: '50K+', 
    relevance: 70,
    explanation: 'A growing shift away from traditional OAuth popups towards silent, background-verified identity sessions.'
  },
  { 
    topic: 'Server-Side Rendering', 
    sentiment: 'Mixed', 
    reach: '1.2M+', 
    relevance: 85,
    explanation: 'Continuing resurgence as performance metrics (Core Web Vitals) become more critical for SEO and conversion.'
  },
];
