# Technical Take-Home Project Write-Up

**Candidate**: Amit Lekhak  
**Project**: International Student Application Tracker — with an Embedded AI Diagnostic Agent  
**Date**: September 2026  
**Repository**: [International Student Application Tracker](./README.md)

---

## 1. Executive Overview

This submission delivers an enterprise-grade full-stack solution for tracking international student applications across education agencies, schools, and academic programs. It features:
- A high-performance **NestJS + TypeORM + PostgreSQL** backend with strict REST APIs, OpenAPI/Swagger contracts, and automated database bootstrapping.
- A clean, responsive **React 18 + Vite + Tailwind CSS** frontend featuring instant multi-dimensional filtering, detail drawer views, inline note updates, and an embedded AI Diagnostic Chat drawer.
- A **Grounded AI Diagnostic Agent** powered by Gemini 3.1 Flash Lite function calling, executing parameterized SQL aggregations directly against PostgreSQL to guarantee zero hallucination.
- A mathematically calibrated **Deterministic Seed Synthesis Engine** expanding 150 base CSV applications to 226 validated records with realistic statistical variance across Gold, Silver, and Bronze tiers.

---

## 2. Key Assumptions Made

When interpreting the project brief, the following architectural assumptions were made to build a robust, scalable system without speculative ambiguity:

1. **State Transition Modeling & Stage Dwell Time**:
   - The brief specifies `stage` and `stage_entered_date` on the application record. Because historical stage audit logs were not modeled in the core CSV structure, `stage_entered_date` represents the timestamp when the application transitioned into its *current* active stage.
   - Consequently, **active dwell time** is computed as `NOW() - stage_entered_date`, while **conversion velocity** (days to enrollment) is computed as `stage_entered_date - created_date` specifically for applications in the terminal `Enrolled` stage.
2. **Role-Based Access Control (RBAC) Hierarchy**:
   - **Admin**: Internal operations team member. Holds global visibility across all applications, all agencies, all schools, and can run cross-tier comparative diagnostics.
   - **Agent**: Authorized staff member representing a single education agency. Restricted exclusively to applications where `application.agent_id == user.agent_id`. Cannot view peer agency metrics or invoke global ranking tools.
3. **Seed Data Ingestion & Determinism**:
   - Evaluators running the application need consistent, repeatable results. Rather than generating unseeded random noise, dataset generation uses a deterministic Mulberry32 PRNG with fixed seeds (Seed `2026`), guaranteeing 100% reproducible statistical distributions on every machine.
4. **AI Causal Disclaimer**:
   - When asked *"Why are Gold-tier agents converting faster than Bronze?"*, the AI must compute the real conversion metrics (~72% vs ~25%) and days-to-enroll velocity, but must explicitly distinguish observed statistical correlation from unrecorded causal factors (e.g., student GPA, counselor experience) to prevent algorithmic bias.

---

## 3. Data Modeling Decisions

The schema was designed with third-normal-form (3NF) normalization, strict foreign key constraints, and performance indexes:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     Schools     │◄──────│    Programs     │◄──────│  Applications   │
│─────────────────│1     *│─────────────────│1     *│─────────────────│
│ id (UUID, PK)   │       │ id (UUID, PK)   │       │ id (UUID, PK)   │
│ name (VARCHAR)  │       │ school_id (FK)  │       │ student_name    │
│ country         │       │ name (VARCHAR)  │       │ agent_id (FK)   │
└─────────────────┘       │ tuition_usd     │       │ program_id (FK) │
                          └─────────────────┘       │ stage (ENUM)    │
                                                    │ stage_entered   │
┌─────────────────┐       ┌─────────────────┐       │ created_date    │
│     Agents      │◄──────│      Users      │       │ notes (TEXT)    │
│─────────────────│1     *│─────────────────│       └────────┬────────┘
│ id (UUID, PK)   │       │ id (UUID, PK)   │                │
│ name (VARCHAR)  │       │ email (UNIQUE)  │                │
│ country         │       │ password_hash   │                │
│ tier (ENUM)     │       │ role (ENUM)     │◄───────────────┘
└─────────────────┘       │ agent_id (FK)   │  (RBAC Scope)
                          └─────────────────┘
```

### Rationale Behind Key Decisions:
1. **UUIDs for Primary & Foreign Keys**:
   - CSV inputs use integer-like string IDs (`ag_01`, `sch_01`). During seed ingestion, these are converted to cryptographically secure UUIDv4 identifiers in PostgreSQL. This mirrors enterprise multi-tenant systems and prevents ID enumeration attacks.
2. **Strict Canonical Enums**:
   - `ApplicationStage`: `Lead` $\to$ `Shortlisted` $\to$ `Applied` $\to$ `Offer Received` $\to$ `Accepted` $\to$ `Visa Applied` $\to$ `Visa Issued` $\to$ `Enrolled`, plus `Withdrawn`.
   - `AgentTier`: `Bronze`, `Silver`, `Gold`.
   - `Role`: `admin`, `agent`.
3. **Database-Level Foreign Keys & Cascading Rules**:
   - `ON DELETE RESTRICT` on Schools and Programs prevents orphan applications.
   - `ON DELETE SET NULL` on `User.agent_id` preserves audit records if an agency record is modified.
4. **Indexing Strategy**:
   - B-Tree indexes on `applications(agent_id)`, `applications(program_id)`, `applications(stage)`, and `applications(stage_entered_date)` ensure $O(\log N)$ filtering and rapid analytical grouping.

---

## 4. AI Diagnostic Agent & Prompt Design Approach

The AI Diagnostic Agent is built on a **Deterministic Tool Calling Architecture** rather than unrestricted Text-to-SQL or raw prompt stuffing:

```
 ┌──────────────┐     1. User Query (HTTP POST)       ┌────────────────────────┐
 │   Frontend   │ ──────────────────────────────────► │     NestJS Backend     │
 │  Chat Panel  │ ◄────────────────────────────────── │      (AiService)       │
 └──────────────┘     6. Grounded Answer + Table      └───────┬────────▲───────┘
                                                              │        │
                                          2. Prompt + Tools   │        │ 5. Grounded Prose
                                                              ▼        │
                                                      ┌────────────────────────┐
                                                      │  Gemini 3.1 Flash Lite │
                                                      │   (Function Calling)   │
                                                      └───────┬────────▲───────┘
                                                              │        │
                                            3. Tool Selection │        │ 4. SQL JSON Results
                                                              ▼        │
                                                      ┌────────────────────────┐
                                                      │   PostgreSQL Engine    │
                                                      │  (AiSqlAggregations)   │
                                                      └────────────────────────┘
```

### Core Design Principles:
1. **Zero Hallucination via Parameterized Tool Execution**:
   - The LLM never touches raw database credentials or executes arbitrary SQL. It selects from 4 strictly typed analytical tools:
     1. `get_tier_conversion_comparison`: Aggregates conversion rate (%) and days-to-enroll across tiers.
     2. `get_stage_bottlenecks_by_program`: Computes average and max dwell days per program for non-terminal stages.
     3. `get_agent_performance_ranking`: Ranks agencies by enrolled count and conversion efficiency.
     4. `get_application_stage_distribution`: Computes the full 9-stage pipeline breakdown.
2. **Server-Side Tenant Scoping**:
   - When an **Agent user** issues a diagnostic query, the tool declaration schema automatically hides global ranking and cross-tier tools.
   - For allowed tools (`stage bottlenecks`, `stage distribution`), the backend strips any requested `agentId` in the LLM argument payload and forcefully binds `user.agentId` into the SQL query runner. An agent user *cannot* bypass tenant isolation even with clever prompt engineering.
3. **Dual-Layer Fallback & Off-Domain Shielding**:
   - Off-domain questions (e.g., *"What is the weather in London?"* or *"Write a Python script"*) are detected via model instruction boundaries and rejected with a clean `400 Bad Request` / `UNSUPPORTED_DIAGNOSTIC_QUERY` response rather than generating confabulated output.
4. **Visual Data Grounding (Table + Prose)**:
   - The frontend renders both the conversational LLM explanation *and* an interactive data table directly from the tool's raw returned JSON payload, giving the user immediate visual auditability.

---

## 5. What I'd Change with More Time

If developing this project for enterprise production deployment over a multi-month sprint:

1. **Historical Stage Transition Ledger (Audit Table)**:
   - Introduce an `application_stage_history` table (`application_id`, `from_stage`, `to_stage`, `transition_date`, `changed_by_user_id`). This would unlock true survival analysis, stage-to-stage conversion drop-off curves, and historical time-in-stage metrics.
2. **WebSocket / SSE Streaming for AI Responses**:
   - Implement Server-Sent Events (SSE) for streaming AI diagnostic explanations token-by-token, improving perceived latency on slower cellular networks.
3. **Document Attachment & PDF Processing**:
   - Add secure S3 document uploads (transcripts, passports, SOPs) with an embedded RAG (Retrieval-Augmented Generation) pipeline for automated visa document verification.
4. **Comprehensive Automated CI/CD Pipeline**:
   - Add GitHub Actions for automated linting, TypeORM migration validation, Jest unit/E2E testing against transient PostgreSQL test containers, and bundle size monitoring.

---

## 6. Stretch Goal 1: Multi-Tenant Architecture Design

> **Question**: *If this tracker had to support several independent agencies on one shared platform — sharing the same pool of schools and programs, but each with their own terms, and unable to see each other's data — what would you change about the data model and access rules?*

### Proposed Data Model Changes:

To support a multi-agency SaaS architecture while sharing educational institutions:

```
┌─────────────────┐       ┌───────────────────────────────┐       ┌─────────────────┐
│     Schools     │◄──────│    AgencySchoolAgreements     │──────►│    Agencies     │
│─────────────────│1     *│───────────────────────────────│*     1│─────────────────│
│ id (UUID, PK)   │       │ id (UUID, PK)                 │       │ id (UUID, PK)   │
│ name (VARCHAR)  │       │ agency_id (FK)                │       │ name, tier      │
│ country         │       │ school_id (FK)                │       │ subdomain       │
└─────────────────┘       │ commission_rate_pct (NUMERIC) │       │ status (ACTIVE) │
                          │ agreement_terms (TEXT)        │       └────────┬────────┘
                          │ contract_valid_until (DATE)   │                │1
                          └───────────────────────────────┘                │
                                                                           │*
┌─────────────────────────┐       ┌───────────────────────────────┐        │
│  AgencyProgramOverrides │◄──────│         Applications          │◄───────┘
│─────────────────────────│1     *│───────────────────────────────│
│ id (UUID, PK)           │       │ id (UUID, PK)                 │ (tenant_id)
│ agency_id (FK)          │       │ tenant_id (FK -> Agency)      │
│ program_id (FK)         │       │ student_name                  │
│ negotiated_tuition_usd  │       │ agent_user_id (FK)            │
│ custom_requirements     │       │ program_id (FK)               │
└─────────────────────────┘       │ stage, stage_entered, notes   │
                                  └───────────────────────────────┘
```

### Key Architectural & Access Control Enhancements:

1. **Shared Master Catalog with Tenant Overrides**:
   - `Schools` and `Programs` remain global entities.
   - `AgencySchoolAgreements` tracks commercial terms (commission %, contract expiration, agreement PDF links) on an agency-by-school basis.
   - `AgencyProgramOverrides` allows specific agencies to record exclusive scholarship rates or negotiated tuition fees without mutating the global catalog.
2. **PostgreSQL Row-Level Security (RLS)**:
   - Enable PostgreSQL RLS on all tenant-owned tables (`applications`, `notes`, `student_documents`).
   - Every database connection sets a session context variable: `SET LOCAL app.current_tenant_id = 'ag_uuid_123';`.
   - RLS policy: `CREATE POLICY tenant_isolation ON applications USING (tenant_id = current_setting('app.current_tenant_id')::uuid);`.
   - This provides defense-in-depth: even if application code forgets a `WHERE tenant_id = ...` clause, the database kernel automatically restricts query results.
3. **Subdomain-Based Tenant Routing**:
   - Multi-tenant routing via subdomains (`agency-a.tracker.com` vs `agency-b.tracker.com`) with automated tenant identification middleware and isolated branding themes.
4. **Isolated AI Context Execution**:
   - The AI Diagnostic engine dynamically compiles tenant metadata into tool scopes, ensuring analytical aggregations strictly inherit the active tenant's RLS boundaries.

---

## 7. Stretch Goal 2: Framework Flexibility (Frappe / ERPNext)

As part of the framework exploration, I spent ~1 hour testing **Frappe / ERPNext on Frappe Cloud** and built a custom **`Project Request`** DocType with 4 fields:
- **Request title** (Data, Mandatory)
- **Requester** (Data, Mandatory)
- **Options** (Select: Low / Medium / High priority)
- **Description** (Text Editor)

*(Screenshot: [./screenshots/frappe_custom_doctype.png](./screenshots/frappe_custom_doctype.png))*

### Key Observations & Differences from Custom Stack:
- **Metadata-Driven Speed**: Defining fields in the DocType builder automatically generates the database schema, form validation, and admin Desk view instantly without writing boilerplate code.
- **Opinionated Structure**: Compared to an explicit TypeScript / NestJS / React stack, Frappe's unified ecosystem feels very different — it takes time to navigate the Desk interface and understand where custom business logic, client scripts, and permissions live.
- **Takeaway**: Frappe is convenient for standard back-office CRUD and out-of-the-box ERP forms, but a decoupled NestJS + React stack offers much more direct control and transparency when building tailored user experiences and custom AI agent workflows.
