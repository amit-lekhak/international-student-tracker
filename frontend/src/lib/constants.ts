import { ApplicationStage, AgentTier } from '../types/domain';

export const APPLICATION_STAGES: ApplicationStage[] = [
  'Lead',
  'Shortlisted',
  'Applied',
  'Offer Received',
  'Accepted',
  'Visa Applied',
  'Visa Issued',
  'Enrolled',
  'Withdrawn',
];

export const STAGE_CONFIG: Record<
  ApplicationStage,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    dot: string;
    description: string;
  }
> = {
  Lead: {
    label: 'Lead',
    bg: 'bg-slate-100 dark:bg-slate-800/60',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
    description: 'Initial prospective student inquiry registered.',
  },
  Shortlisted: {
    label: 'Shortlisted',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800',
    dot: 'bg-sky-500',
    description: 'Candidate shortlisted by admissions counselor.',
  },
  Applied: {
    label: 'Applied',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
    description: 'Application package submitted to institution.',
  },
  'Offer Received': {
    label: 'Offer Received',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
    dot: 'bg-orange-500',
    description: 'Unconditional admission letter received. Awaiting deposit.',
  },
  Accepted: {
    label: 'Accepted',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    dot: 'bg-purple-500',
    description: 'Student accepted and deposit confirmed.',
  },
  'Visa Applied': {
    label: 'Visa Applied',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
    dot: 'bg-indigo-500',
    description: 'Student visa application submitted to immigration.',
  },
  'Visa Issued': {
    label: 'Visa Issued',
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800',
    dot: 'bg-teal-500',
    description: 'Visa granted. Student ready to depart.',
  },
  Enrolled: {
    label: 'Enrolled',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
    description: 'Student enrolled and attending classes.',
  },
  Withdrawn: {
    label: 'Withdrawn',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    dot: 'bg-rose-500',
    description: 'Application withdrawn by student or rejected.',
  },
};

export const TIER_CONFIG: Record<
  AgentTier,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
  }
> = {
  Gold: {
    label: 'Gold Tier',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700',
    badgeBg: 'bg-amber-400 text-amber-950',
  },
  Silver: {
    label: 'Silver Tier',
    bg: 'bg-slate-100 dark:bg-slate-800/60',
    text: 'text-slate-800 dark:text-slate-200',
    border: 'border-slate-300 dark:border-slate-600',
    badgeBg: 'bg-slate-300 text-slate-800',
  },
  Bronze: {
    label: 'Bronze Tier',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-800 dark:text-orange-300',
    border: 'border-orange-300 dark:border-orange-700',
    badgeBg: 'bg-orange-300 text-orange-900',
  },
};

export interface QuickSwitchPreset {
  id: string;
  label: string;
  email: string;
  role: 'ADMIN' | 'AGENT';
  tier?: AgentTier;
  agencyName?: string;
  description: string;
}

export const QUICK_SWITCH_PRESETS: QuickSwitchPreset[] = [
  {
    id: 'admin',
    label: 'Admissions Director (Admin)',
    email: 'admin@tracker.com',
    role: 'ADMIN',
    description: 'Full organizational visibility (All 226 apps + All AI diagnostic tools)',
  },
  {
    id: 'agent1',
    label: 'Agent 1 (Gold Agency)',
    email: 'agent1@tracker.com',
    role: 'AGENT',
    tier: 'Gold',
    agencyName: 'Global Pathways Consultancy',
    description: 'Scoped counselor view (Only assigned applications)',
  },
  {
    id: 'agent2',
    label: 'Agent 2 (Silver Agency)',
    email: 'agent2@tracker.com',
    role: 'AGENT',
    tier: 'Silver',
    agencyName: 'BrightFuture Education',
    description: 'Scoped counselor view (Only assigned applications)',
  },
  {
    id: 'agent3',
    label: 'Agent 3 (Bronze Agency)',
    email: 'agent4@tracker.com',
    role: 'AGENT',
    tier: 'Bronze',
    agencyName: 'NextStep Overseas',
    description: 'Scoped counselor view (Only assigned applications)',
  },
];

export const SUGGESTED_AI_PROMPTS = {
  ADMIN: [
    {
      title: 'Tier Conversion Velocity',
      prompt: 'Why are Gold-tier agents converting faster than Bronze?',
      tool: 'get_tier_conversion_comparison',
    },
    {
      title: 'Program Bottlenecks',
      prompt: 'Which program is stuck at Offer Received?',
      tool: 'get_stage_bottlenecks_by_program',
    },
    {
      title: 'Top Agent Rankings',
      prompt: 'Show me the top performing agents by enrolled student volume and conversion rate.',
      tool: 'get_agent_performance_ranking',
    },
    {
      title: 'Stage Distribution Breakdown',
      prompt: 'Show me the breakdown of applications across all pipeline stages.',
      tool: 'get_application_stage_distribution',
    },
  ],
  AGENT: [
    {
      title: 'My Program Bottlenecks',
      prompt: 'Where are my student applications experiencing the longest dwell times?',
      tool: 'get_stage_bottlenecks_by_program',
    },
    {
      title: 'My Stage Breakdown',
      prompt: 'What is the current distribution of my applications across stages?',
      tool: 'get_application_stage_distribution',
    },
  ],
};
