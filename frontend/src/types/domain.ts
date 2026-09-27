import { components } from './api-schema';

// Export canonical schema types derived directly from OpenAPI
export type UserResponse = components['schemas']['UserResponseDto'];
export type LoginRequest = components['schemas']['LoginDto'];
export type LoginResponse = components['schemas']['LoginResponseDto'];

export type School = components['schemas']['SchoolResponseDto'];
export type Program = components['schemas']['ProgramResponseDto'];
export type Agent = components['schemas']['AgentResponseDto'];

export type ApplicationResponse = components['schemas']['ApplicationResponseDto'];
export type CreateApplicationRequest = components['schemas']['CreateApplicationDto'];
export type UpdateApplicationRequest = components['schemas']['UpdateApplicationDto'];
export type UpdateNotesRequest = components['schemas']['UpdateNotesDto'];

export type AiDiagnosticRequest = components['schemas']['AiQueryDto'];
// AiQueryDto uses 'question' field per OpenAPI spec
export type AiDiagnosticResponse = components['schemas']['AiDiagnosticResponseDto'];

// Enums & Literal Unions
export type UserRole = 'ADMIN' | 'AGENT';
export type AgentTier = 'Gold' | 'Silver' | 'Bronze';
export type ApplicationStage =
  | 'Lead'
  | 'Shortlisted'
  | 'Applied'
  | 'Offer Received'
  | 'Accepted'
  | 'Visa Applied'
  | 'Visa Issued'
  | 'Enrolled'
  | 'Withdrawn';

export interface ApplicationFilterParams {
  agentId?: string;
  stage?: ApplicationStage;
  tier?: AgentTier;
  programId?: string;
  schoolId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedApplicationsResult {
  items: ApplicationResponse[];
  meta: PaginationMeta;
  // Backwards compatibility convenience getters if accessed directly
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}
