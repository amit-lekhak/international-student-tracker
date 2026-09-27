export enum Role {
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
}

export enum AgentTier {
  BRONZE = 'Bronze',
  SILVER = 'Silver',
  GOLD = 'Gold',
}

export enum ApplicationStage {
  LEAD = 'Lead',
  SHORTLISTED = 'Shortlisted',
  APPLIED = 'Applied',
  OFFER_RECEIVED = 'Offer Received',
  ACCEPTED = 'Accepted',
  VISA_APPLIED = 'Visa Applied',
  VISA_ISSUED = 'Visa Issued',
  ENROLLED = 'Enrolled',
  WITHDRAWN = 'Withdrawn',
}

export const APPLICATION_STAGES: ApplicationStage[] = [
  ApplicationStage.LEAD,
  ApplicationStage.SHORTLISTED,
  ApplicationStage.APPLIED,
  ApplicationStage.OFFER_RECEIVED,
  ApplicationStage.ACCEPTED,
  ApplicationStage.VISA_APPLIED,
  ApplicationStage.VISA_ISSUED,
  ApplicationStage.ENROLLED,
  ApplicationStage.WITHDRAWN,
];

export const FUNNEL_STAGES: ApplicationStage[] = [
  ApplicationStage.LEAD,
  ApplicationStage.SHORTLISTED,
  ApplicationStage.APPLIED,
  ApplicationStage.OFFER_RECEIVED,
  ApplicationStage.ACCEPTED,
  ApplicationStage.VISA_APPLIED,
  ApplicationStage.VISA_ISSUED,
  ApplicationStage.ENROLLED,
];

export function isApplicationStage(value: any): value is ApplicationStage {
  return Object.values(ApplicationStage).includes(value);
}

export function isAgentTier(value: any): value is AgentTier {
  return Object.values(AgentTier).includes(value);
}

export function isRole(value: any): value is Role {
  return Object.values(Role).includes(value);
}
