# AI Diagnostic Evaluation Benchmark & Assessor Test Suite

This document records the independent assessor test questions, expected model routing, database groundings, evaluation scorecards, and architectural justifications for the **Embedded AI Diagnostic Agent** in the **International Student Application Tracker**.

---

## 1. Evaluation Architecture Overview

The AI diagnostic service uses **typed tool calling with deterministic SQL aggregations** rather than unconstrained text-to-SQL generation. This ensures:
1. **Zero Hallucinations**: All statistics, stage dwell times, and rankings are computed directly by PostgreSQL.
2. **Strict Grounding**: The LLM acts as an analytical synthesizer, generating natural-language prose backed by raw `supportingData` rows.
3. **Causal Guardrails**: Clear causal disclaimers prevent attributing differences (e.g. Gold vs Bronze tier conversion) to unmeasured external factors (such as counselor skill or student academic pedigree).
4. **Clean Boundary Rejection**: Off-domain queries (weather, coding, general web queries) and unmodeled entity inquiries (e.g., specific student withdrawal reasons) are rejected with HTTP 400.

---

## 2. Assessor Test Questions, Expected Tools & Responses

### Category A: Core In-Domain Pipeline Analytics (10 Questions)

#### Q1: "Why are Gold-tier agents converting faster than Bronze?"
- **Expected Tool**: `get_tier_conversion_comparison`
- **Expected Behavior**: Compares conversion rate % and average days-to-enroll between Gold and Bronze tiers.
- **Mandatory Grounding & Disclaimer**: Must cite exact percentages/days from the database and explicitly state that the data tracks pipeline metrics only (unmeasured variables like lead quality or counselor experience are not tracked).

#### Q2: "Which program is stuck at Offer Received with the longest dwell time?"
- **Expected Tool**: `get_stage_bottlenecks_by_program`
- **Expected Behavior**: Identifies the program/school combination with the highest `avgDwellDays` at the `Offer Received` stage.
- **Grounding**: Cites the program name and the computed dwell duration in days.

#### Q3: "Top agents by enrolled students"
- **Expected Tool**: `get_agent_performance_ranking`
- **Expected Behavior**: Returns ranked agent leaderboard ordered by enrolled student count descending.
- **Grounding**: Reflects the top-performing agents from seed data.

#### Q4: "Show me the breakdown of applications across all stages"
- **Expected Tool**: `get_application_stage_distribution`
- **Expected Behavior**: Returns exact application counts across all 9 pipeline stages (`Lead`, `Shortlisted`, `Applied`, `Offer Received`, `Accepted`, `Visa Applied`, `Visa Issued`, `Enrolled`, `Withdrawn`).

#### Q5: "Which agent tier has the worst conversion rate?"
- **Expected Tool**: `get_tier_conversion_comparison`
- **Expected Behavior**: Evaluates conversion percentages across Bronze, Silver, and Gold, identifying the lowest tier.

#### Q6: "How long do applications spend at the Visa Applied stage on average?"
- **Expected Tool**: `get_stage_bottlenecks_by_program`
- **Expected Behavior**: Extracts dwell analytics specifically for the `Visa Applied` stage across programs.

#### Q7: "Who are the top 5 performing agents?"
- **Expected Tool**: `get_agent_performance_ranking`
- **Expected Behavior**: Returns the top 5 individual agents along with total applications and enrollments.

#### Q8: "How many students are currently at the Lead stage?"
- **Expected Tool**: `get_application_stage_distribution`
- **Expected Behavior**: Returns the count of applications currently in the `Lead` stage.

#### Q9: "Compare Silver and Bronze tier agent conversion speeds"
- **Expected Tool**: `get_tier_conversion_comparison`
- **Expected Behavior**: Compares the velocity (average days to enrollment) and conversion rates between Silver and Bronze tiers.

#### Q10: "Which programs have the most withdrawals or applications stuck longest?"
- **Expected Tool**: `get_stage_bottlenecks_by_program`
- **Expected Behavior**: Analyzes program bottlenecks and churn/dwell points.

---

### Category B: Off-Domain & Refusal Cases (5 Questions)

| # | Question | Expected Status | Reason / Justification |
|---|---|---|---|
| **Q11** | *"What is the weather in London today?"* | **HTTP 400 Bad Request** | Unrelated to student application tracking. |
| **Q12** | *"Write me a Python script to sort a list"* | **HTTP 400 Bad Request** | General programming assistance is out of domain. |
| **Q13** | *"What are the best universities in Australia?"* | **HTTP 400 Bad Request** | General education opinion; no database query possible. |
| **Q14** | *"How much does a student visa to Canada cost?"* | **HTTP 400 Bad Request** | Government fees are unmodeled in the database. |
| **Q15** | *"Who won the World Cup in 2022?"* | **HTTP 400 Bad Request** | Completely off-domain query. |

---

### Category C: Ambiguous & Boundary Edge Cases (5 Questions)

| # | Question | Behavior | Handling Justification |
|---|---|---|---|
| **Q16** | *"Tell me everything"* | Default Summary Tool / Refusal | Handled gracefully without crash; summarizes pipeline distribution or requests clarification. |
| **Q17** | *"Are my agents performing well?"* | `get_agent_performance_ranking` | Maps broad agent performance query to quantifiable agent ranking metrics. |
| **Q18** | *"Why did Maria withdraw from her application?"* | **HTTP 400 Refusal** | Refuses gracefully: per-student qualitative exit reasons are not modeled. |
| **Q19** | *"How many applications were created last week?"* | **HTTP 400 Refusal** | Refuses cleanly: arbitrary temporal slicing is outside the predefined tool parameters. |
| **Q20** | *"Give me a summary of the entire application pipeline"* | `get_application_stage_distribution` | Maps broad pipeline inquiry to comprehensive stage distribution metrics. |

---

## 3. Evaluation Benchmark Results

### Core Benchmark Scorecard (`npm run test:evals -w backend`)
```text
=================== EVALUATION SCORECARD ===================
- Tool Selection Accuracy: 100.0% (5/5)
- Grounding Accuracy:      100.0% (5/5)
- Average Latency:         4028ms
============================================================
Result: ALL CORE AI EVALUATIONS PASSED (100%)
```

### Extended Benchmark Runner
- Runner File: [`backend/src/evals/run-extended-evals.ts`](file:///Users/coresoftmac2022/Documents/Github/epa/backend/src/evals/run-extended-evals.ts)
- Command: `npm run test:evals:extended -w backend`
- Edge Case Graceful Handling: **100.0% (5/5)**

---

## 4. Assessment Summary & Tradeoff Analysis

1. **Deterministic vs. Free-form SQL**:
   - *Chosen Approach*: Curated PostgreSQL aggregation functions exposed as tools.
   - *Tradeoff*: Narrower query flexibility, but 100% immune to SQL injection, schema hallucination, or accidental table mutations.
2. **Dual-Payload Response Format**:
   - Every response provides structured data (`supportingData`) alongside conversational text (`prose`) so frontend components can render interactive data tables directly next to AI explanations.
3. **Robust Safety & Guardrails**:
   - Explicit refusal handling prevents the agent from fabricating external knowledge, maintaining strict grounding within the application's domain boundaries.
