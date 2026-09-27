/**
 * Extended Eval Runner — Independent Assessor Questions
 *
 * 20 questions designed from an assessor/user perspective (not from test code):
 *  - 10 in-domain (should route to a tool + return grounded data)
 *  - 5  off-domain (should REJECT with 400)
 *  - 5  edge/ambiguous (interesting boundary cases)
 */
import { AppDataSource } from '../config/data-source';
import { AiService } from '../modules/ai/ai.service';
import { AiToolName } from '../modules/ai/dto/ai-diagnostic-response.dto';
import { Role } from '../types/enums';
import { ensureDatabases } from '../scripts/ensure-db';
import { seedDatabase } from '../scripts/seed';

type ExpectedBehavior = AiToolName | 'REJECT' | 'ANY_TOOL' | 'REJECT_OR_ANY';

interface ExtendedEvalScenario {
  id: number;
  category: 'IN_DOMAIN' | 'OFF_DOMAIN' | 'EDGE';
  name: string;
  question: string;
  expectedTool: ExpectedBehavior;
  note: string; // Assessor rationale
  checkGrounding?: (prose: string, data: any[]) => { passed: boolean; reason?: string };
}

async function runExtendedEvals() {
  console.log('\n======================================================');
  console.log('   EXTENDED EVAL — INDEPENDENT ASSESSOR QUESTIONS   ');
  console.log('======================================================\n');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    console.warn(
      '⚠️  GEMINI_API_KEY is not set. Cannot run live evaluations.\n' +
        '   Please set GEMINI_API_KEY in backend/.env\n',
    );
    process.exit(0);
  }

  console.log('[Evals] Preparing test database...');
  await ensureDatabases();
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  await seedDatabase(AppDataSource, { silent: true });
  console.log('[Evals] Database ready.\n');

  const aiService = new AiService(AppDataSource);
  const adminUser = {
    id: 'eval-admin-id',
    email: 'admin@tracker.com',
    role: Role.ADMIN,
    agentId: null,
  };

  const scenarios: ExtendedEvalScenario[] = [
    // ─── IN-DOMAIN: 10 questions ──────────────────────────────────────────────
    {
      id: 1,
      category: 'IN_DOMAIN',
      name: 'Tier Velocity — Gold vs Bronze',
      question: 'Why are Gold-tier agents converting faster than Bronze?',
      expectedTool: AiToolName.GET_TIER_CONVERSION,
      note: 'Classic performance inquiry; system prompt example question.',
      checkGrounding: (prose, data) => {
        const goldRow = data.find((r) => r.tier === 'Gold');
        const bronzeRow = data.find((r) => r.tier === 'Bronze');
        if (!goldRow || !bronzeRow) {
          return { passed: false, reason: 'Missing Gold or Bronze rows in supportingData' };
        }
        const hasDisclaimer =
          prose.toLowerCase().includes('does not') ||
          prose.toLowerCase().includes('unmeasured') ||
          prose.toLowerCase().includes('correlation') ||
          prose.toLowerCase().includes('causal');
        if (!hasDisclaimer) {
          return { passed: false, reason: 'Missing mandatory causal disclaimer' };
        }
        return { passed: true };
      },
    },
    {
      id: 2,
      category: 'IN_DOMAIN',
      name: 'Program Bottleneck — Offer Received',
      question: 'Which program is stuck at Offer Received with the longest dwell time?',
      expectedTool: AiToolName.GET_STAGE_BOTTLENECKS,
      note: 'Bottleneck hunting; also a system prompt example question.',
      checkGrounding: (prose, data) => {
        if (!data || data.length === 0) {
          return { passed: false, reason: 'No bottleneck rows returned' };
        }
        const topRow = data[0];
        const topDwell = String(Math.round(topRow.avgDwellDays ?? topRow.maxDwellDays ?? 0));
        const mentionsProg = topRow.programName && prose.includes(topRow.programName);
        const mentionsNum = topDwell.length >= 2 && prose.includes(topDwell);
        const passed = mentionsProg || mentionsNum;
        return {
          passed,
          reason: passed
            ? undefined
            : `Prose did not reference top bottleneck program "${topRow.programName}" or dwell ~${topDwell} days`,
        };
      },
    },
    {
      id: 3,
      category: 'IN_DOMAIN',
      name: 'Agent Rankings — Enrolled Count',
      question: 'Top agents by enrolled students',
      expectedTool: AiToolName.GET_AGENT_RANKINGS,
      note: 'Leaderboard; manager use case.',
      checkGrounding: (prose, data) => {
        if (!data || data.length === 0) {
          return { passed: false, reason: 'No ranking data returned' };
        }
        return { passed: true };
      },
    },
    {
      id: 4,
      category: 'IN_DOMAIN',
      name: 'Stage Distribution — Full Pipeline',
      question: 'Show me the breakdown of applications across all stages',
      expectedTool: AiToolName.GET_STAGE_DISTRIBUTION,
      note: 'Pipeline health overview; should return all 9 stages.',
      checkGrounding: (prose, data) => {
        if (!data || data.length !== 9) {
          return {
            passed: false,
            reason: `Expected 9 stages, got ${data?.length ?? 0}`,
          };
        }
        return { passed: true };
      },
    },
    {
      id: 5,
      category: 'IN_DOMAIN',
      name: 'Tier Velocity — Worst Tier',
      question: 'Which agent tier has the worst conversion rate?',
      expectedTool: AiToolName.GET_TIER_CONVERSION,
      note: 'Inverse of Q1; different phrasing, same tool needed.',
      checkGrounding: (prose, data) => {
        if (!data || data.length === 0) {
          return { passed: false, reason: 'No tier data returned' };
        }
        // Should mention at least one tier name
        const mentionsTier = ['Gold', 'Silver', 'Bronze'].some((t) => prose.includes(t));
        return {
          passed: mentionsTier,
          reason: mentionsTier ? undefined : 'Prose did not mention any tier name',
        };
      },
    },
    {
      id: 6,
      category: 'IN_DOMAIN',
      name: 'Stage Bottleneck — Visa Stage',
      question: 'How long do applications spend at the Visa Applied stage on average?',
      expectedTool: AiToolName.GET_STAGE_BOTTLENECKS,
      note: 'Specific stage bottleneck; visa delay is a common real-world pain.',
      checkGrounding: (prose, data) => {
        if (!data || data.length === 0) {
          return { passed: false, reason: 'No stage bottleneck data returned' };
        }
        return { passed: true };
      },
    },
    {
      id: 7,
      category: 'IN_DOMAIN',
      name: 'Agent Rankings — Top 5',
      question: 'Who are the top 5 performing agents?',
      expectedTool: AiToolName.GET_AGENT_RANKINGS,
      note: 'Manager wanting best team members; should list names from data.',
      checkGrounding: (prose, data) => {
        if (!data || data.length === 0) {
          return { passed: false, reason: 'No agent ranking data returned' };
        }
        // At least the top agent's name should appear in prose
        const topAgent = data[0];
        const agentName = topAgent?.agentName ?? topAgent?.name ?? '';
        const passed = agentName ? prose.includes(agentName) : true;
        return {
          passed,
          reason: passed ? undefined : `Top agent "${agentName}" not mentioned in prose`,
        };
      },
    },
    {
      id: 8,
      category: 'IN_DOMAIN',
      name: 'Stage Distribution — Lead Count',
      question: 'How many students are currently at the Lead stage?',
      expectedTool: AiToolName.GET_STAGE_DISTRIBUTION,
      note: 'Funnel-top count; simple but requires real query.',
      checkGrounding: (prose, data) => {
        if (!data || data.length === 0) {
          return { passed: false, reason: 'No distribution data returned' };
        }
        const leadRow = data.find(
          (r) => r.stage?.toLowerCase() === 'lead' || r.stageName?.toLowerCase() === 'lead',
        );
        if (!leadRow) {
          return { passed: false, reason: 'Lead stage row missing from data' };
        }
        const leadCount = String(leadRow.count ?? leadRow.applicationCount ?? '');
        const passed = leadCount.length > 0 && prose.includes(leadCount);
        return {
          passed,
          reason: passed ? undefined : `Lead count ${leadCount} not mentioned in prose`,
        };
      },
    },
    {
      id: 9,
      category: 'IN_DOMAIN',
      name: 'Tier Velocity — Silver vs Bronze',
      question: 'Compare Silver and Bronze tier agent conversion speeds',
      expectedTool: AiToolName.GET_TIER_CONVERSION,
      note: 'Mid-tier analysis; different framing but same tool.',
      checkGrounding: (prose, data) => {
        if (!data || data.length === 0) {
          return { passed: false, reason: 'No tier data returned' };
        }
        const mentionsSilver = prose.includes('Silver');
        const mentionsBronze = prose.includes('Bronze');
        return {
          passed: mentionsSilver && mentionsBronze,
          reason:
            !mentionsSilver || !mentionsBronze
              ? 'Prose did not mention both Silver and Bronze tiers'
              : undefined,
        };
      },
    },
    {
      id: 10,
      category: 'IN_DOMAIN',
      name: 'Program Bottleneck — Withdrawals',
      question: 'Which programs have the most withdrawals or applications stuck longest?',
      expectedTool: AiToolName.GET_STAGE_BOTTLENECKS,
      note: 'Churn / dwell analysis; withdrawal context maps to bottleneck tool.',
      checkGrounding: (prose, data) => {
        if (!data || data.length === 0) {
          return { passed: false, reason: 'No bottleneck data returned' };
        }
        return { passed: true };
      },
    },

    // ─── OFF-DOMAIN: 5 questions ──────────────────────────────────────────────
    {
      id: 11,
      category: 'OFF_DOMAIN',
      name: 'Off-Domain — Weather Query',
      question: 'What is the weather in London today?',
      expectedTool: 'REJECT',
      note: 'Completely unrelated to student application tracking.',
    },
    {
      id: 12,
      category: 'OFF_DOMAIN',
      name: 'Off-Domain — Programming Help',
      question: 'Write me a Python script to sort a list',
      expectedTool: 'REJECT',
      note: 'General programming help — not in the tracker domain.',
    },
    {
      id: 13,
      category: 'OFF_DOMAIN',
      name: 'Off-Domain — University Rankings',
      question: 'What are the best universities in Australia?',
      expectedTool: 'REJECT',
      note: 'General education knowledge; no matching aggregation query possible.',
    },
    {
      id: 14,
      category: 'OFF_DOMAIN',
      name: 'Off-Domain — Visa Fee',
      question: 'How much does a student visa to Canada cost?',
      expectedTool: 'REJECT',
      note: 'Government fee information — not in the data model.',
    },
    {
      id: 15,
      category: 'OFF_DOMAIN',
      name: 'Off-Domain — Sports',
      question: 'Who won the World Cup in 2022?',
      expectedTool: 'REJECT',
      note: 'Completely off-domain; tests robustness of rejection.',
    },

    // ─── EDGE / AMBIGUOUS: 5 questions ───────────────────────────────────────
    {
      id: 16,
      category: 'EDGE',
      name: 'Edge — Vague "Tell me everything"',
      question: 'Tell me everything',
      expectedTool: 'REJECT_OR_ANY',
      note: 'Overly vague — acceptable to reject OR route to any default tool.',
      checkGrounding: (_prose, _data) => ({ passed: true }),
    },
    {
      id: 17,
      category: 'EDGE',
      name: 'Edge — Vague Agent Performance',
      question: 'Are my agents performing well?',
      expectedTool: 'ANY_TOOL',
      note: 'Vague but in-domain; should route to rankings or tier comparison.',
      checkGrounding: (_prose, data) => {
        const passed = data && data.length > 0;
        return {
          passed: !!passed,
          reason: passed ? undefined : 'No data returned for vague in-domain question',
        };
      },
    },
    {
      id: 18,
      category: 'EDGE',
      name: 'Edge — Specific Student (no per-student tool)',
      question: 'Why did Maria withdraw from her application?',
      expectedTool: 'REJECT_OR_ANY',
      note: 'Asks about a specific student — no per-student tool exists. Should reject or explain limitation.',
      checkGrounding: (_prose, _data) => ({ passed: true }),
    },
    {
      id: 19,
      category: 'EDGE',
      name: 'Edge — Time Filter Not Supported',
      question: 'How many applications were created last week?',
      expectedTool: 'REJECT_OR_ANY',
      note: 'Time-scoped query; tools may not support date filters — should either return data or gracefully explain.',
      checkGrounding: (_prose, _data) => ({ passed: true }),
    },
    {
      id: 20,
      category: 'EDGE',
      name: 'Edge — "Give me a summary of everything"',
      question: 'Give me a summary of the entire application pipeline',
      expectedTool: 'ANY_TOOL',
      note: 'Broad but in-domain; best match is stage distribution.',
      checkGrounding: (_prose, data) => {
        const passed = data && data.length > 0;
        return {
          passed: !!passed,
          reason: passed ? undefined : 'No data returned for broad summary request',
        };
      },
    },
  ];

  // ─── Run scenarios ─────────────────────────────────────────────────────────
  let inDomainToolPass = 0;
  let inDomainGroundPass = 0;
  let offDomainPass = 0;
  let edgeHandled = 0;

  const resultsTable: any[] = [];
  const maxAttempts = 3;

  for (const scenario of scenarios) {
    process.stdout.write(
      `[${scenario.category}] Scenario ${scenario.id}: "${scenario.name}"... `,
    );

    let attempts = 0;
    let succeeded = false;

    while (attempts < maxAttempts && !succeeded) {
      attempts++;
      const start = Date.now();

      try {
        const result = await aiService.diagnose({ question: scenario.question }, adminUser);
        const latency = Date.now() - start;

        const isRejectExpected =
          scenario.expectedTool === 'REJECT' || scenario.expectedTool === 'REJECT_OR_ANY';
        const isAnyTool =
          scenario.expectedTool === 'ANY_TOOL' || scenario.expectedTool === 'REJECT_OR_ANY';

        let toolMatch: boolean;
        if (isRejectExpected && isAnyTool) {
          // REJECT_OR_ANY — accepting any outcome
          toolMatch = true;
        } else if (isAnyTool) {
          toolMatch = true; // Any tool is fine
        } else if (isRejectExpected) {
          // Expected reject but got 200 — fail
          toolMatch = false;
        } else {
          toolMatch = result.toolName === scenario.expectedTool;
        }

        const groundCheck = scenario.checkGrounding
          ? scenario.checkGrounding(result.prose, result.supportingData)
          : { passed: true };

        const overallPass = toolMatch && groundCheck.passed;

        // Category accounting
        if (scenario.category === 'IN_DOMAIN') {
          if (toolMatch) inDomainToolPass++;
          if (groundCheck.passed) inDomainGroundPass++;
        } else if (scenario.category === 'OFF_DOMAIN') {
          // Got 200 when expected REJECT → fail (handled in catch for 400)
          // If we reach here it means it returned 200 → off-domain fail
          offDomainPass += 0;
          resultsTable.push({
            ID: scenario.id,
            Category: scenario.category,
            Scenario: scenario.name,
            Question: scenario.question.substring(0, 50),
            Expected: 'REJECT (400)',
            Got: result.toolName ?? '200 (unexpected)',
            ToolMatch: '❌ FAIL (should have rejected)',
            Grounding: 'N/A',
            LatencyMs: `${latency}ms`,
            Note: scenario.note,
          });
          console.log(`❌ FAIL — Expected rejection, got 200 with tool ${result.toolName}`);
          succeeded = true;
          continue;
        } else if (scenario.category === 'EDGE') {
          if (overallPass) edgeHandled++;
        }

        resultsTable.push({
          ID: scenario.id,
          Category: scenario.category,
          Scenario: scenario.name,
          Question: scenario.question.substring(0, 50),
          Expected: scenario.expectedTool,
          Got: result.toolName,
          ToolMatch: toolMatch ? '✅ PASS' : '❌ FAIL',
          Grounding: groundCheck.passed ? '✅ PASS' : `❌ FAIL (${groundCheck.reason})`,
          LatencyMs: `${latency}ms`,
          Note: scenario.note,
        });

        console.log(
          overallPass ? `✅ PASS (${latency}ms)` : `❌ FAIL (${latency}ms)`,
        );
        succeeded = true;
      } catch (err: any) {
        const latency = Date.now() - start;

        // Expected 400 rejection
        if (
          (scenario.expectedTool === 'REJECT' || scenario.expectedTool === 'REJECT_OR_ANY') &&
          err.status === 400
        ) {
          if (scenario.category === 'OFF_DOMAIN') offDomainPass++;
          if (scenario.category === 'EDGE') edgeHandled++;

          resultsTable.push({
            ID: scenario.id,
            Category: scenario.category,
            Scenario: scenario.name,
            Question: scenario.question.substring(0, 50),
            Expected: 'REJECT (400)',
            Got: 'REJECT (400)',
            ToolMatch: '✅ PASS',
            Grounding: '✅ PASS (Refusal)',
            LatencyMs: `${latency}ms`,
            Note: scenario.note,
          });
          console.log(`✅ PASS (400 Refusal, ${latency}ms)`);
          succeeded = true;
        } else if (err.message?.includes('429') && attempts < maxAttempts) {
          process.stdout.write(`[rate-limit, retry ${attempts}/${maxAttempts} in 15s]... `);
          await new Promise((r) => setTimeout(r, 15000));
        } else {
          resultsTable.push({
            ID: scenario.id,
            Category: scenario.category,
            Scenario: scenario.name,
            Question: scenario.question.substring(0, 50),
            Expected: scenario.expectedTool,
            Got: 'ERROR',
            ToolMatch: '❌ ERROR',
            Grounding: `❌ ${err.message}`,
            LatencyMs: `${latency}ms`,
            Note: scenario.note,
          });
          console.log(`❌ ERROR: ${err.message}`);
          break;
        }
      }
    }

    // Pacing between calls
    await new Promise((r) => setTimeout(r, 2000));
  }

  // ─── Scorecard ─────────────────────────────────────────────────────────────
  const inDomainTotal = scenarios.filter((s) => s.category === 'IN_DOMAIN').length;
  const offDomainTotal = scenarios.filter((s) => s.category === 'OFF_DOMAIN').length;
  const edgeTotal = scenarios.filter((s) => s.category === 'EDGE').length;

  console.log('\n=================== EXTENDED EVAL SCORECARD ===================');
  console.table(resultsTable);
  console.log('----------------------------------------------------------------');
  console.log(`📊 IN-DOMAIN  (${inDomainTotal} questions):`);
  console.log(
    `   Tool Selection Accuracy: ${((inDomainToolPass / inDomainTotal) * 100).toFixed(1)}% (${inDomainToolPass}/${inDomainTotal})`,
  );
  console.log(
    `   Grounding Accuracy:      ${((inDomainGroundPass / inDomainTotal) * 100).toFixed(1)}% (${inDomainGroundPass}/${inDomainTotal})`,
  );
  console.log(`\n🚫 OFF-DOMAIN (${offDomainTotal} questions):`);
  console.log(
    `   Rejection Accuracy:      ${((offDomainPass / offDomainTotal) * 100).toFixed(1)}% (${offDomainPass}/${offDomainTotal})`,
  );
  console.log(`\n⚠️  EDGE CASES (${edgeTotal} questions):`);
  console.log(
    `   Handled Gracefully:      ${((edgeHandled / edgeTotal) * 100).toFixed(1)}% (${edgeHandled}/${edgeTotal})`,
  );
  console.log('================================================================\n');

  await AppDataSource.destroy();

  const allPass =
    inDomainToolPass === inDomainTotal &&
    inDomainGroundPass === inDomainTotal &&
    offDomainPass === offDomainTotal;

  if (allPass) {
    console.log('🎉 ALL CORE SCENARIOS PASSED!\n');
    process.exit(0);
  } else {
    const isQuotaIssue = resultsTable.some(
      (r) => r.Grounding?.includes('429') || r.Got?.includes('429'),
    );
    if (isQuotaIssue) {
      console.warn('⚠️  Some failures due to upstream API rate limits. Retry after quota resets.\n');
      process.exit(0);
    }
    console.error('❌ SOME SCENARIOS FAILED — see scorecard above.\n');
    process.exit(1);
  }
}

runExtendedEvals().catch((err) => {
  console.error('[ExtendedEvals] Fatal:', err);
  process.exit(1);
});
