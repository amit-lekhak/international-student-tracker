# REST API & AI Tool Registry Reference

This document provides complete technical documentation for all REST API endpoints, DTO contracts, authentication headers, error codes, and AI Tool declarations.

---

## 1. Authentication & Security

All private endpoints require a Bearer JSON Web Token (JWT) supplied in the `Authorization` header:

```http
Authorization: Bearer <jwt-token>
```

### Response Status Codes
*   `200 OK`: Successful retrieval / update.
*   `201 Created`: Resource successfully created.
*   `400 Bad Request`: Validation failure or invalid question payload.
*   `401 Unauthorized`: Missing, expired, or invalid JWT token.
*   `403 Forbidden`: Authenticated user lacks sufficient permissions (RBAC violation).
*   `404 Not Found`: Resource does not exist or is out of scope for the authenticated agent.

---

## 2. Authentication Endpoints

### `POST /api/auth/login`
Authenticates user credentials and returns a signed JWT token.

*   **Request Body**:
    ```json
    {
      "email": "admin@tracker.com",
      "password": "password123"
    }
    ```
*   **Response (`200 OK`)**:
    ```json
    {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI...",
      "user": {
        "id": "7b8f9e61-3a1b-4f9e-8c5d-2e1f4a9b6c8d",
        "email": "admin@tracker.com",
        "role": "admin",
        "agentId": null,
        "agentName": null
      }
    }
    ```

### `GET /api/auth/me`
Returns the profile and agency linkage of the currently authenticated user.

*   **Headers**: `Authorization: Bearer <token>`
*   **Response (`200 OK`)**:
    ```json
    {
      "id": "e3a891f4-5b2c-4d3e-9a1b-8f7c6e5d4a3b",
      "email": "agent1@tracker.com",
      "role": "agent",
      "agentId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
      "agentName": "Global Pathways"
    }
    ```

---

## 3. Applications API

### `GET /api/applications`
Retrieves a paginated and filtered list of applications.
*   **RBAC Scope**: Admins receive all matching applications; Agents receive only applications where `agentId == user.agentId`.
*   **Query Parameters**:
    *   `page` (optional, default: `1`): Page number.
    *   `limit` (optional, default: `20`, max: `100`): Items per page.
    *   `agentId` (optional, Admin only): Filter by agency UUID.
    *   `schoolId` (optional): Filter by school UUID.
    *   `stage` (optional): Filter by canonical stage string (`Lead`, `Shortlisted`, `Applied`, `Offer Received`, `Accepted`, `Visa Applied`, `Visa Issued`, `Enrolled`, `Withdrawn`).
    *   `search` (optional): Case-insensitive search on `studentName`.

*   **Response (`200 OK`)**:
    ```json
    {
      "data": [
        {
          "id": "d1c2b3a4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          "studentName": "Aarav Sharma",
          "agentId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
          "programId": "8f7e6d5c-4b3a-2f1e-0d9c-8b7a6f5e4d3c",
          "stage": "Offer Received",
          "stageEnteredDate": "2026-05-18T10:30:00.000Z",
          "createdDate": "2026-03-01T08:00:00.000Z",
          "notes": "Verified English proficiency scores.",
          "createdAt": "2026-03-01T08:00:00.000Z",
          "updatedAt": "2026-05-18T10:30:00.000Z",
          "agent": {
            "id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
            "name": "Global Pathways",
            "country": "India",
            "tier": "Gold"
          },
          "program": {
            "id": "8f7e6d5c-4b3a-2f1e-0d9c-8b7a6f5e4d3c",
            "schoolId": "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
            "name": "MSc Computer Science",
            "tuitionUsd": 28000,
            "school": {
              "id": "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
              "name": "University of Melbourne",
              "country": "Australia"
            }
          }
        }
      ],
      "total": 226,
      "page": 1,
      "limit": 20,
      "totalPages": 12
    }
    ```

### `GET /api/applications/:id`
Retrieves a single application by UUID. Returns `404 Not Found` if the record does not exist or belongs to another agency when requested by an Agent user.

### `PATCH /api/applications/:id/notes`
Updates the internal counselor notes on an application record.

*   **Request Body**:
    ```json
    {
      "notes": "Student submitted bank statements for financial check."
    }
    ```
*   **Response (`200 OK`)**: Returns updated application object.

---

## 4. Master Lookups API

### `GET /api/agents`
Returns list of all registered education agencies.
*   **Response**: `[{ "id": "uuid", "name": "Global Pathways", "country": "India", "tier": "Gold" }, ...]`

### `GET /api/schools`
Returns list of all partner universities.
*   **Response**: `[{ "id": "uuid", "name": "University of Melbourne", "country": "Australia" }, ...]`

### `GET /api/programs`
Returns list of all academic degree programs.
*   **Query Parameters**: `schoolId` (optional).
*   **Response**: `[{ "id": "uuid", "schoolId": "uuid", "name": "MSc Computer Science", "tuitionUsd": 28000 }, ...]`

---

## 5. AI Diagnostic API

### `POST /api/ai/diagnose`
Executes an analytical question against the grounded PostgreSQL aggregation engine.

*   **Request Body**:
    ```json
    {
      "question": "Why are Gold-tier agents converting faster than Bronze?"
    }
    ```

*   **Response (`200 OK`)**:
    ```json
    {
      "answer": "**Gold-tier agents achieve a 72.4% conversion rate**, averaging 45.2 days to enrollment. In comparison, **Bronze-tier agents convert at 24.1%** with an average velocity of 88.6 days.\n\n*Note: These figures represent observed pipeline metrics. Unmeasured factors such as student academic qualifications or counselor experience cannot be determined from the database.*",
      "toolUsed": "get_tier_conversion_comparison",
      "toolArguments": {},
      "table": [
        {
          "tier": "Gold",
          "totalApplications": 58,
          "enrolledCount": 42,
          "conversionRatePct": 72.4,
          "avgDaysToEnroll": 45.2
        },
        {
          "tier": "Silver",
          "totalApplications": 94,
          "enrolledCount": 48,
          "conversionRatePct": 51.1,
          "avgDaysToEnroll": 62.4
        },
        {
          "tier": "Bronze",
          "totalApplications": 74,
          "enrolledCount": 18,
          "conversionRatePct": 24.3,
          "avgDaysToEnroll": 88.6
        }
      ]
    }
    ```

---

## 6. AI Tool Registry Declarations

The following analytical tools are registered in `backend/src/modules/ai/tools/tool-registry.ts`:

### 1. `get_tier_conversion_comparison` *(Admin Only)*
Compares conversion percentages and days-to-enroll velocity across Gold, Silver, and Bronze tiers.
*   **Parameters**: None.

### 2. `get_stage_bottlenecks_by_program` *(Admin & Agent Scoped)*
Identifies programs and stages with highest average active dwell times.
*   **Parameters**:
    *   `stage` (string, optional): Filter by stage name (e.g., `"Offer Received"`, `"Visa Applied"`).
    *   `programId` (string, optional): Filter by program UUID.
    *   `limit` (integer, optional, default: `10`, range: `1–50`).

### 3. `get_agent_performance_ranking` *(Admin Only)*
Ranks education agencies by enrolled students and conversion rate.
*   **Parameters**:
    *   `tier` (string, optional): `"Gold"`, `"Silver"`, `"Bronze"`.
    *   `sortBy` (string, optional): `"enrolledCount"` or `"conversionRatePct"`.
    *   `limit` (integer, optional, default: `10`).

### 4. `get_application_stage_distribution` *(Admin & Agent Scoped)*
Returns pipeline volume counts and percentages across all 9 canonical stages.
*   **Parameters**:
    *   `programId` (string, optional): Filter by program UUID.
    *   `agentId` (string, optional, Admin only): Filter by agent UUID.
