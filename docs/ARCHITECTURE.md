# System Architecture & Technical Specification

This document provides a deep technical architectural breakdown of the **International Student Application Tracker**, detailing module boundaries, data flows, security mechanisms, database indexing, and the embedded AI diagnostic engine.

---

## 1. System Overview & Component Boundaries

The system is structured as a decoupled, modern TypeScript monorepo consisting of:
1. **Frontend Presentation Layer** (`/frontend`): Single-Page Application (SPA) built on React 18, Vite 6, and Tailwind CSS.
2. **Backend Application Layer** (`/backend`): Modular NestJS 10 REST API server enforcing dependency injection, request lifecycle validation, and JWT authentication.
3. **Data Persistence Layer**: PostgreSQL 16 managed via TypeORM with strict 3NF schema constraints, indexes, and database-level pushdown aggregations.
4. **AI Diagnostic Engine**: Gemini 3.1 Flash Lite integration orchestrating deterministic SQL aggregation tools with strict role-partitioned schemas.

```
                               ┌────────────────────────────────────────┐
                               │       Client Browser (React 18)        │
                               │  - Application Table & Filter Toolbar  │
                               │  - Application Detail & Notes Drawer   │
                               │  - Embedded AI Diagnostic Panel        │
                               └──────────────────┬─────────────────────┘
                                                  │ HTTPS / JSON REST
                                                  ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  NestJS 10 Application Server                                  │
│                                                                                                │
│  ┌────────────────────────┐  ┌────────────────────────┐  ┌───────────────────────────────────┐ │
│  │   Auth & RBAC Guards   │  │ Applications Controller│  │   AI Diagnostic Controller        │ │
│  │  - JwtAuthGuard        │  │  - CRUD & Filter Query │  │  - Post /api/ai/diagnose          │ │
│  │  - RolesGuard          │  │  - Notes Patch         │  │  - Role-Partitioned Tool Schema  │ │
│  └───────────┬────────────┘  └───────────┬────────────┘  └─────────────────┬─────────────────┘ │
│              │                           │                                 │                   │
│              ▼                           ▼                                 ▼                   │
│  ┌────────────────────────┐  ┌────────────────────────┐  ┌───────────────────────────────────┐ │
│  │      AuthService       │  │  ApplicationsService   │  │            AiService              │ │
│  │  - JWT sign / verify   │  │  - SelectQueryBuilder  │  │  - Gemini Function Calling Loop   │ │
│  │  - Bcrypt validation   │  │  - Eager Joins (No N+1)│  │  - Parameter Bounds Sanitization  │ │
│  └───────────┬────────────┘  │  - RBAC Scope Filter   │  │  - Grounded Markdown Generation   │ │
│              │               └───────────┬────────────┘  └─────────────────┬─────────────────┘ │
│              │                           │                                 │                   │
│              │                           │                                 ▼                   │
│              │                           │               ┌───────────────────────────────────┐ │
│              │                           │               │        AiSqlAggregations          │ │
│              │                           │               │  - Tier Conversion Comparison     │ │
│              │                           │               │  - Program Stage Bottlenecks      │ │
│              │                           │               │  - Agency Performance Leaderboard │ │
│              │                           │               │  - Pipeline Stage Distribution    │ │
│              │                           │               └─────────────────┬─────────────────┘ │
│              │                           │                                 │                   │
│              └───────────────────────────┼─────────────────────────────────┘                   │
│                                          │ TypeORM Data Source                                 │
└──────────────────────────────────────────┼─────────────────────────────────────────────────────┘
                                           │ SQL Connection Pool
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      PostgreSQL 16 Database                                    │
│                                                                                                │
│  ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌────────────┐  │
│  │     agents      │       │     schools     │       │    programs     │       │   users    │  │
│  └────────┬────────┘       └────────┬────────┘       └────────┬────────┘       └─────┬──────┘  │
│           │                         │                         │                      │         │
│           └─────────────────────────┼─────────────────────────┘                      │         │
│                                     ▼                                                │         │
│                            ┌─────────────────┐                                       │         │
│                            │  applications   │◄──────────────────────────────────────┘         │
│                            │  (Indexed FKs)  │  (Tenant Scoping)                               │
│                            └─────────────────┘                                                 │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Security & RBAC Isolation Model

Security is implemented using a **Dual-Layer Defense Architecture**:

```
                       ┌────────────────────────────────────────┐
                       │           HTTP Inbound Request         │
                       └───────────────────┬────────────────────┘
                                           │
                                           ▼
                       ┌────────────────────────────────────────┐
                       │ Layer 1: JwtAuthGuard & RolesGuard     │
                       │ - Verifies cryptographic JWT signature │
                       │ - Extracts User ID, Role, and Agent ID │
                       │ - Rejects unauthorized routes (401/403)│
                       └───────────────────┬────────────────────┘
                                           │
                                           ▼
                       ┌────────────────────────────────────────┐
                       │ Layer 2: Service-Level Query Scoping   │
                       │ - ApplicationsService: query.andWhere( │
                       │     'app.agentId = :scopedAgentId'     │
                       │   )                                    │
                       │ - AI Tools: forces session `agentId`   │
                       │   into SQL parameters.                 │
                       └───────────────────┬────────────────────┘
                                           │
                                           ▼
                       ┌────────────────────────────────────────┐
                       │       PostgreSQL Parameterized Query   │
                       └────────────────────────────────────────┘
```

### 1. HTTP Layer Enforcement
- `@UseGuards(JwtAuthGuard, RolesGuard)` inspects the bearer token on every private route.
- Custom decorator `@CurrentUser()` injects the validated `AuthenticatedUser` payload directly into controller handler methods.

### 2. Service & Repository Layer Scoping
Even if an attacker crafts an HTTP request attempting to manipulate IDs:
```typescript
// applications.service.ts
private applyRbacScope(
  queryBuilder: SelectQueryBuilder<Application>,
  user: AuthenticatedUser,
): SelectQueryBuilder<Application> {
  if (user.role === Role.AGENT) {
    if (!user.agentId) {
      throw new ForbiddenException('Agent user has no associated agency profile');
    }
    queryBuilder.andWhere('app.agentId = :scopedAgentId', {
      scopedAgentId: user.agentId,
    });
  }
  return queryBuilder;
}
```

### 3. AI Tool Registry Role Partitioning
Agent users are prevented from even attempting cross-tier queries because tools are dynamically filtered before being sent to the LLM:
```typescript
// tool-registry.ts
export function getToolDeclarationsForRole(role: Role): FunctionDeclaration[] {
  if (role === Role.ADMIN) {
    // Exposes: tier conversion, program bottlenecks, agent ranking, stage distribution
    return [
      TIER_CONVERSION_TOOL,
      PROGRAM_BOTTLENECK_TOOL,
      AGENT_RANKING_TOOL,
      STAGE_DISTRIBUTION_TOOL,
    ];
  }
  // Agent users ONLY receive self-scoped tools
  return [
    PROGRAM_BOTTLENECK_TOOL_AGENT_SCOPED,
    STAGE_DISTRIBUTION_TOOL_AGENT_SCOPED,
  ];
}
```

---

## 3. AI Diagnostic Engine & Zero-Hallucination Pipeline

The AI diagnostic agent adheres to **6 Grounding Guarantees**:

1. **Capability-First Tool Routing**: The model triggers an analytical tool only when the query can be fully answered with computed data.
2. **Deterministic Unsupported Sentinel (`UNSUPPORTED_DIAGNOSTIC_QUERY`)**: When asked off-domain questions (e.g. weather, sports trivia) or unsupported temporal slices, the model returns this exact sentinel token, mapped to an HTTP `400 Bad Request`.
3. **Negative Capability Boundaries**: The system prompt explicitly instructs the LLM that the database does not track historical stage transition durations (only active dwell times) or lead acquisition channels.
4. **Parameter Bounds Sanitization**: Tool arguments are validated through `ToolArgumentSanitizer` (`1 <= limit <= 50`, canonical stage string matching) before reaching the query runner.
5. **Database-Level Single-Pass Computation**: Metrics are calculated in PostgreSQL using standard aggregate functions (`COUNT()`, `AVG()`, `ROUND()`, `EXTRACT(EPOCH)`).
6. **Structured Audit Payload**: The controller returns both the generated prose *and* the exact structured table rows to the frontend for visual verification.

---

## 4. Database Schema & Entity Relationships

```
┌────────────────────────────────┐
│             agents             │
├────────────────────────────────┤
│ id: UUID (PK)                  │
│ name: VARCHAR(255)             │
│ country: VARCHAR(100)          │
│ tier: ENUM ('Bronze','Silver', │
│             'Gold')            │
│ createdAt: TIMESTAMP           │
│ updatedAt: TIMESTAMP           │
└───────────────┬────────────────┘
                │ 1
                │
                │ *
┌───────────────┴────────────────┐       ┌────────────────────────────────┐
│          applications          │       │            programs            │
├────────────────────────────────┤       ├────────────────────────────────┤
│ id: UUID (PK)                  │ *   1 │ id: UUID (PK)                  │
│ studentName: VARCHAR(255)      ├───────┤ schoolId: UUID (FK)            │
│ agentId: UUID (FK)             │       │ name: VARCHAR(255)             │
│ programId: UUID (FK)           │       │ tuitionUsd: INT                │
│ stage: ENUM ('Lead', ...)      │       │ createdAt: TIMESTAMP           │
│ stageEnteredDate: TIMESTAMP    │       │ updatedAt: TIMESTAMP           │
│ createdDate: TIMESTAMP         │       └───────────────┬────────────────┘
│ notes: TEXT (Nullable)         │                       │ *
│ createdAt: TIMESTAMP           │                       │
│ updatedAt: TIMESTAMP           │                       │ 1
└────────────────────────────────┘       ┌───────────────┴────────────────┐
                                         │            schools             │
┌────────────────────────────────┐       ├────────────────────────────────┤
│             users              │       │ id: UUID (PK)                  │
├────────────────────────────────┤       │ name: VARCHAR(255)             │
│ id: UUID (PK)                  │       │ country: VARCHAR(100)          │
│ email: VARCHAR(255) (UNIQUE)   │       │ createdAt: TIMESTAMP           │
│ passwordHash: VARCHAR(255)     │       │ updatedAt: TIMESTAMP           │
│ role: ENUM ('admin', 'agent')  │       └────────────────────────────────┘
│ agentId: UUID (FK, Nullable)   │
│ createdAt: TIMESTAMP           │
│ updatedAt: TIMESTAMP           │
└────────────────────────────────┘
```

---

## 5. Performance Optimizations & Database Indexing

### 1. Indexing Strategy
To guarantee fast lookups and efficient $O(\log N)$ joins:
- `CREATE INDEX idx_applications_agent_id ON applications(agent_id);`
- `CREATE INDEX idx_applications_program_id ON applications(program_id);`
- `CREATE INDEX idx_applications_stage ON applications(stage);`
- `CREATE INDEX idx_applications_stage_entered_date ON applications(stage_entered_date);`
- `CREATE INDEX idx_programs_school_id ON programs(school_id);`
- `CREATE UNIQUE INDEX idx_users_email ON users(email);`

### 2. Elimination of N+1 Query Overheads
When loading paginated application lists, relations are eager-loaded in a single query with joined selects:
```typescript
const qb = this.applicationRepository
  .createQueryBuilder('app')
  .leftJoinAndSelect('app.agent', 'agent')
  .leftJoinAndSelect('app.program', 'program')
  .leftJoinAndSelect('program.school', 'school');
```

### 3. Server-Side Pushdown Calculations
Analytical queries avoid loading rows into Node.js memory. For example, active dwell time calculation is performed directly in PostgreSQL:
```sql
SELECT 
  p.name AS "programName",
  s.name AS "schoolName",
  app.stage AS "stage",
  COUNT(app.id)::int AS "activeApplications",
  ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - app."stageEnteredDate")) / 86400)::numeric, 1)::float AS "avgDwellDays"
FROM applications app
JOIN programs p ON p.id = app."programId"
JOIN schools s ON s.id = p."schoolId"
WHERE app.stage NOT IN ('Enrolled', 'Withdrawn')
GROUP BY p.name, s.name, app.stage
ORDER BY "avgDwellDays" DESC;
```
