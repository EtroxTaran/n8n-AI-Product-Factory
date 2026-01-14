#!/usr/bin/env node
/**
 * AI Product Factory - Pre-Mortem Diagnostic Audit
 *
 * This script performs static analysis on n8n workflow JSON files to identify:
 * 1. Google Drive nodes (should be migrated to S3)
 * 2. Infrastructure URL issues (localhost/127.0.0.1 instead of Docker service names)
 * 3. Generative UI handshake issues (Wait node patterns)
 * 4. Missing error handling (retry, loop limits, error triggers)
 * 5. State persistence issues (S3 storage patterns)
 *
 * Usage: node scripts/diagnostic_audit.js
 *
 * Output: Generates PRE_MORTEM_REPORT.md
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const WORKFLOWS_DIR = path.join(__dirname, '..', 'workflows');
const OUTPUT_FILE = path.join(__dirname, '..', 'PRE_MORTEM_REPORT.md');

// Expected Docker service URLs
const EXPECTED_URLS = {
  GRAPHITI: 'http://graphiti:8000',
  QDRANT: 'http://qdrant:6333',
  S3_ENDPOINT: 'http://seaweedfs:8333',
  DASHBOARD: 'http://dashboard:3000'
};

// Forbidden patterns (localhost/direct IPs)
const FORBIDDEN_URL_PATTERNS = [
  /localhost/i,
  /127\.0\.0\.1/,
  /0\.0\.0\.0/,
  /host\.docker\.internal/i
];

// ============================================================================
// AUDIT RESULT STRUCTURES
// ============================================================================

class AuditResult {
  constructor() {
    this.score = 100;
    this.criticalBlockers = [];
    this.deprecatedNodes = [];
    this.infrastructureIssues = [];
    this.governanceIssues = [];
    this.resilienceIssues = [];
    this.premortemRisks = [];
    this.workflowStats = {};
    this.timestamp = new Date().toISOString();
  }

  addCritical(issue) {
    this.criticalBlockers.push(issue);
    this.score -= 15; // Critical issues have high impact
  }

  addDeprecated(issue) {
    this.deprecatedNodes.push(issue);
    this.score -= 10; // Deprecated patterns should be fixed
  }

  addInfrastructure(issue) {
    this.infrastructureIssues.push(issue);
    this.score -= 5;
  }

  addGovernance(issue) {
    this.governanceIssues.push(issue);
    this.score -= 8;
  }

  addResilience(issue) {
    this.resilienceIssues.push(issue);
    this.score -= 5;
  }

  addPremortemRisk(risk) {
    this.premortemRisks.push(risk);
    // Risks don't directly impact score but are tracked
  }

  finalizeScore() {
    this.score = Math.max(0, Math.min(100, this.score));
    return this.score;
  }
}

// ============================================================================
// WORKFLOW ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Load all workflow JSON files from the workflows directory
 */
function loadWorkflows() {
  const workflows = [];
  const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const filepath = path.join(WORKFLOWS_DIR, file);
      const content = fs.readFileSync(filepath, 'utf8');
      const workflow = JSON.parse(content);
      workflows.push({
        filename: file,
        filepath,
        data: workflow,
        nodes: workflow.nodes || [],
        connections: workflow.connections || {}
      });
    } catch (error) {
      console.error(`Failed to parse ${file}: ${error.message}`);
    }
  }

  return workflows;
}

/**
 * Check for Google Drive nodes (CRITICAL - must be migrated to S3)
 */
function checkGoogleDriveNodes(workflow, result) {
  const driveNodes = workflow.nodes.filter(node =>
    node.type === 'n8n-nodes-base.googleDrive' ||
    node.type?.includes('googleDrive')
  );

  for (const node of driveNodes) {
    result.addCritical({
      workflow: workflow.filename,
      node: node.name || node.id,
      nodeType: node.type,
      message: 'Google Drive node found - must be migrated to S3/SeaweedFS',
      line: `Node ID: ${node.id}`,
      severity: 'CRITICAL',
      remediation: 'Replace with AI Product Factory - S3 Storage Operations subworkflow'
    });

    result.addDeprecated({
      workflow: workflow.filename,
      node: node.name || node.id,
      nodeType: node.type,
      reason: 'Google Drive storage is deprecated in favor of S3-compatible SeaweedFS'
    });
  }

  return driveNodes.length;
}

/**
 * Check HTTP Request nodes for infrastructure URL issues
 */
function checkInfrastructureURLs(workflow, result) {
  const httpNodes = workflow.nodes.filter(node =>
    node.type === 'n8n-nodes-base.httpRequest'
  );

  let issueCount = 0;

  for (const node of httpNodes) {
    const url = node.parameters?.url || '';

    // Check for forbidden localhost patterns
    for (const pattern of FORBIDDEN_URL_PATTERNS) {
      if (pattern.test(url)) {
        result.addInfrastructure({
          workflow: workflow.filename,
          node: node.name || node.id,
          url: url,
          message: `Forbidden URL pattern found: ${pattern}`,
          severity: 'HIGH',
          remediation: 'Use Docker service names (e.g., graphiti:8000, qdrant:6333)'
        });
        issueCount++;
      }
    }

    // Check for correct Graphiti URL pattern
    if (url.includes('graphiti') || url.includes('GRAPHITI')) {
      if (!url.includes('$env.GRAPHITI_URL') && !url.includes('graphiti:8000')) {
        result.addInfrastructure({
          workflow: workflow.filename,
          node: node.name || node.id,
          url: url,
          message: 'Graphiti URL should use $env.GRAPHITI_URL or http://graphiti:8000',
          severity: 'MEDIUM',
          remediation: `Use: ($env.GRAPHITI_URL || '${EXPECTED_URLS.GRAPHITI}')`
        });
        issueCount++;
      }
    }

    // Check for correct Qdrant URL pattern
    if (url.includes('qdrant') || url.includes('QDRANT')) {
      if (!url.includes('$env.QDRANT_URL') && !url.includes('qdrant:6333')) {
        result.addInfrastructure({
          workflow: workflow.filename,
          node: node.name || node.id,
          url: url,
          message: 'Qdrant URL should use $env.QDRANT_URL or http://qdrant:6333',
          severity: 'MEDIUM',
          remediation: `Use: ($env.QDRANT_URL || '${EXPECTED_URLS.QDRANT}')`
        });
        issueCount++;
      }
    }

    // Check for S3/SeaweedFS URL pattern
    if (url.includes('S3_ENDPOINT') || url.includes('seaweedfs')) {
      if (!url.includes('$env.S3_ENDPOINT')) {
        result.addInfrastructure({
          workflow: workflow.filename,
          node: node.name || node.id,
          url: url,
          message: 'S3 URL should use $env.S3_ENDPOINT',
          severity: 'MEDIUM',
          remediation: `Use: ($env.S3_ENDPOINT || '${EXPECTED_URLS.S3_ENDPOINT}')`
        });
        issueCount++;
      }
    }

    // Check retry configuration on HTTP nodes
    const hasRetry = node.parameters?.options?.retry?.enabled === true;
    if (!hasRetry && (url.includes('graphiti') || url.includes('qdrant') || url.includes('S3'))) {
      result.addResilience({
        workflow: workflow.filename,
        node: node.name || node.id,
        message: 'HTTP Request node lacks retry configuration for critical service',
        severity: 'MEDIUM',
        remediation: 'Enable retry with: { enabled: true, maxTries: 3, retryInterval: 1000 }'
      });
    }
  }

  return issueCount;
}

/**
 * Check for Generative UI handshake pattern in Phase 0 (Scavenger)
 */
function checkGenerativeUIHandshake(workflow, result) {
  if (!workflow.filename.includes('scavenging')) {
    return { hasCorrectPattern: true, issues: 0 };
  }

  const waitNodes = workflow.nodes.filter(node =>
    node.type === 'n8n-nodes-base.wait'
  );

  const webhookWaitNodes = waitNodes.filter(node =>
    node.parameters?.resume === 'webhook'
  );

  const chatWaitNodes = waitNodes.filter(node =>
    node.parameters?.resume === 'chat' ||
    !node.parameters?.resume // Legacy text-based
  );

  let issues = 0;

  // Check for old text-based Wait for Chat Trigger
  if (chatWaitNodes.length > 0) {
    result.addGovernance({
      workflow: workflow.filename,
      message: 'Found legacy "Wait for Chat" trigger - should use "Wait for Webhook" for Generative UI',
      nodes: chatWaitNodes.map(n => n.name || n.id),
      severity: 'HIGH',
      remediation: 'Replace with Wait for Webhook (resume: "webhook") for batch governance UI'
    });
    issues++;
  }

  // Verify webhook Wait exists
  if (webhookWaitNodes.length === 0) {
    result.addGovernance({
      workflow: workflow.filename,
      message: 'Missing "Wait for Webhook" node required for Generative UI batch governance',
      severity: 'CRITICAL',
      remediation: 'Add Wait node with resume: "webhook" and webhookSuffix for governance-batch callbacks'
    });
    result.addCritical({
      workflow: workflow.filename,
      node: 'N/A',
      message: 'Scavenging workflow missing webhook Wait node for Generative UI',
      severity: 'CRITICAL',
      remediation: 'Implement Wait for Webhook pattern for GovernanceWidget integration'
    });
    issues++;
  }

  // Check for GovernancePayloadSchema structure in Code nodes
  const codeNodes = workflow.nodes.filter(node =>
    node.type === 'n8n-nodes-base.code'
  );

  let hasGovernancePayload = false;
  for (const node of codeNodes) {
    const jsCode = node.parameters?.jsCode || '';
    if (jsCode.includes('governance_request') ||
        jsCode.includes('GovernancePayload') ||
        jsCode.includes('detected_stack')) {
      hasGovernancePayload = true;
      break;
    }
  }

  if (!hasGovernancePayload) {
    result.addGovernance({
      workflow: workflow.filename,
      message: 'Missing GovernancePayloadSchema structure in agent output',
      severity: 'HIGH',
      remediation: 'Ensure agent outputs JSON with: { type: "governance_request", scavenging_id, project_id, detected_stack: [...], webhook_url }'
    });
    issues++;
  }

  return { hasCorrectPattern: issues === 0, issues };
}

/**
 * Check for adversarial loop safeguards (iteration limits, error handling)
 */
function checkLoopSafeguards(workflow, result) {
  if (!workflow.filename.includes('loop') && !workflow.filename.includes('adversarial')) {
    return { hasProperSafeguards: true, issues: 0 };
  }

  let issues = 0;

  // Check for iteration limit logic
  const codeNodes = workflow.nodes.filter(node =>
    node.type === 'n8n-nodes-base.code'
  );

  let hasIterationLimit = false;
  let hasCircuitBreaker = false;

  for (const node of codeNodes) {
    const jsCode = node.parameters?.jsCode || '';
    if (jsCode.includes('max_iterations') || jsCode.includes('maxIterations')) {
      hasIterationLimit = true;
    }
    if (jsCode.includes('circuit') || jsCode.includes('escalation')) {
      hasCircuitBreaker = true;
    }
  }

  // Check for If nodes that gate on iteration count
  const ifNodes = workflow.nodes.filter(node =>
    node.type === 'n8n-nodes-base.if'
  );

  let hasIterationGate = false;
  for (const node of ifNodes) {
    const leftValue = node.parameters?.conditions?.conditions?.[0]?.leftValue || '';
    if (leftValue.includes('iteration')) {
      hasIterationGate = true;
    }
  }

  if (!hasIterationLimit || !hasIterationGate) {
    result.addResilience({
      workflow: workflow.filename,
      message: 'Adversarial loop may lack proper iteration limit safeguards',
      severity: 'HIGH',
      remediation: 'Implement max_iterations check (default: 5) with If node gate'
    });
    issues++;
  }

  if (!hasCircuitBreaker) {
    result.addResilience({
      workflow: workflow.filename,
      message: 'Missing circuit breaker pattern for human escalation',
      severity: 'MEDIUM',
      remediation: 'Add Wait for Webhook node for human guidance when max iterations reached'
    });
    issues++;
  }

  // Check for error triggers
  const errorTriggers = workflow.nodes.filter(node =>
    node.type === 'n8n-nodes-base.errorTrigger'
  );

  if (errorTriggers.length === 0) {
    result.addResilience({
      workflow: workflow.filename,
      message: 'No Error Trigger node found for handling workflow failures',
      severity: 'LOW',
      remediation: 'Consider adding Error Trigger for centralized error handling'
    });
  }

  return { hasProperSafeguards: issues === 0, issues };
}

/**
 * Check for state persistence patterns (S3 project_state.json)
 */
function checkStatePersistence(workflow, result) {
  if (!workflow.filename.includes('main')) {
    return { hasProperPersistence: true, issues: 0 };
  }

  let issues = 0;

  // Check for executeWorkflow nodes calling S3 operations
  const executeNodes = workflow.nodes.filter(node =>
    node.type === 'n8n-nodes-base.executeWorkflow'
  );

  let hasS3StateCall = false;
  for (const node of executeNodes) {
    const workflowName = node.parameters?.workflowId?.value || '';
    if (workflowName.includes('S3') || workflowName.includes('Storage')) {
      hasS3StateCall = true;
    }
  }

  // Check code nodes for state handling
  const codeNodes = workflow.nodes.filter(node =>
    node.type === 'n8n-nodes-base.code'
  );

  let hasProjectState = false;
  for (const node of codeNodes) {
    const jsCode = node.parameters?.jsCode || '';
    if (jsCode.includes('project_state') || jsCode.includes('projectState')) {
      hasProjectState = true;
    }
  }

  if (!hasS3StateCall && workflow.filename.includes('ai-product-factory')) {
    result.addPremortemRisk({
      scenario: 'The Amnesia Bug',
      workflow: workflow.filename,
      description: 'User uploads 50 PDFs, then closes the browser tab',
      check: 'Does project_state.json save "Scavenging Complete" state before UI interaction?',
      status: hasProjectState ? 'PARTIAL' : 'FAIL',
      severity: 'HIGH',
      canResume: hasS3StateCall ? 'Yes - S3 state calls detected' : 'Unknown - no S3 calls detected'
    });
    issues++;
  }

  return { hasProperPersistence: issues === 0, issues };
}

/**
 * Check for S3 operation retry configuration
 */
function checkS3Resilience(workflow, result) {
  if (!workflow.filename.includes('s3') && !workflow.filename.includes('S3')) {
    return { hasRetry: true, issues: 0 };
  }

  let issues = 0;

  const httpNodes = workflow.nodes.filter(node =>
    node.type === 'n8n-nodes-base.httpRequest'
  );

  for (const node of httpNodes) {
    const hasRetry = node.parameters?.options?.retry?.enabled === true;
    const hasNeverError = node.parameters?.options?.response?.response?.neverError === true;

    if (!hasRetry) {
      result.addPremortemRisk({
        scenario: 'The S3 Blackout',
        workflow: workflow.filename,
        node: node.name || node.id,
        description: 'SeaweedFS is temporarily down',
        check: 'Does node have "Retry on Fail" enabled?',
        status: 'FAIL',
        severity: 'MEDIUM',
        hasNeverError: hasNeverError ? 'Yes - neverError prevents crashes' : 'No - may cause workflow failure'
      });
      issues++;
    }
  }

  return { hasRetry: issues === 0, issues };
}

/**
 * Check for JSON validation in adversarial loops (Hallucination Loop bug)
 */
function checkJSONValidation(workflow, result) {
  if (!workflow.filename.includes('loop')) {
    return { hasValidation: true, issues: 0 };
  }

  let issues = 0;

  const codeNodes = workflow.nodes.filter(node =>
    node.type === 'n8n-nodes-base.code'
  );

  let hasJsonParsing = false;
  let hasParseErrorHandling = false;

  for (const node of codeNodes) {
    const jsCode = node.parameters?.jsCode || '';
    if (jsCode.includes('JSON.parse')) {
      hasJsonParsing = true;
    }
    if (jsCode.includes('try') && jsCode.includes('catch') &&
        (jsCode.includes('JSON.parse') || jsCode.includes('parse'))) {
      hasParseErrorHandling = true;
    }
  }

  if (hasJsonParsing && !hasParseErrorHandling) {
    result.addPremortemRisk({
      scenario: 'The Hallucination Loop',
      workflow: workflow.filename,
      description: 'Refiner Agent keeps producing bad JSON that fails Schema Validation',
      check: 'Is there Error Trigger or Loop Limit on validation node?',
      status: 'WARN',
      severity: 'HIGH',
      detail: 'JSON.parse found without try/catch error handling'
    });
    issues++;
  }

  // Check if there's multi-strategy JSON parsing
  let hasMultiStrategyParsing = false;
  for (const node of codeNodes) {
    const jsCode = node.parameters?.jsCode || '';
    if ((jsCode.includes('Strategy 1') && jsCode.includes('Strategy 2')) ||
        (jsCode.includes('jsonMatch') && jsCode.includes('objMatch')) ||
        (jsCode.includes('code_block') && jsCode.includes('regex_extract'))) {
      hasMultiStrategyParsing = true;
    }
  }

  if (hasJsonParsing && !hasMultiStrategyParsing) {
    result.addResilience({
      workflow: workflow.filename,
      message: 'JSON parsing may lack multi-strategy fallbacks for LLM output variability',
      severity: 'MEDIUM',
      remediation: 'Implement fallback parsing: direct JSON → code block extraction → regex extraction → text patterns'
    });
    issues++;
  }

  return { hasValidation: issues === 0, issues };
}

/**
 * Collect workflow statistics
 */
function collectWorkflowStats(workflows, result) {
  const stats = {
    totalWorkflows: workflows.length,
    sharedSubworkflows: 0,
    aiProductFactoryWorkflows: 0,
    totalNodes: 0,
    nodeTypes: {},
    googleDriveNodes: 0,
    httpRequestNodes: 0,
    waitNodes: 0,
    codeNodes: 0,
    agentNodes: 0
  };

  for (const workflow of workflows) {
    if (workflow.filename.includes('titan')) {
      stats.sharedSubworkflows++; // Titan subworkflows (Graphiti, Qdrant, etc.) are shared utilities
    }
    if (workflow.filename.includes('ai-product-factory')) {
      stats.aiProductFactoryWorkflows++;
    }

    stats.totalNodes += workflow.nodes.length;

    for (const node of workflow.nodes) {
      const nodeType = node.type || 'unknown';
      stats.nodeTypes[nodeType] = (stats.nodeTypes[nodeType] || 0) + 1;

      if (nodeType.includes('googleDrive')) stats.googleDriveNodes++;
      if (nodeType === 'n8n-nodes-base.httpRequest') stats.httpRequestNodes++;
      if (nodeType === 'n8n-nodes-base.wait') stats.waitNodes++;
      if (nodeType === 'n8n-nodes-base.code') stats.codeNodes++;
      if (nodeType.includes('agent')) stats.agentNodes++;
    }
  }

  result.workflowStats = stats;
  return stats;
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateReport(result) {
  const score = result.finalizeScore();
  const scoreEmoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : score >= 40 ? '🟠' : '🔴';

  let report = `# Pre-Mortem Diagnostic Report

**Generated:** ${result.timestamp}
**System Health Score:** ${scoreEmoji} **${score}%**

---

## Executive Summary

This diagnostic audit analyzed the n8n workflow codebase to identify architectural drift, broken paths, and violations before production deployment.

| Category | Issues Found | Impact |
|----------|-------------|--------|
| Critical Blockers | ${result.criticalBlockers.length} | 🔴 Must fix before launch |
| Deprecated Nodes | ${result.deprecatedNodes.length} | 🟠 Should migrate |
| Infrastructure Issues | ${result.infrastructureIssues.length} | 🟡 May cause failures |
| Governance Issues | ${result.governanceIssues.length} | 🟡 UI/UX impact |
| Resilience Issues | ${result.resilienceIssues.length} | 🟡 Reliability risk |
| Pre-Mortem Risks | ${result.premortemRisks.length} | ⚠️ Scenario analysis |

---

## Section 1: Critical Blockers (Must Fix)

`;

  if (result.criticalBlockers.length === 0) {
    report += `✅ **No critical blockers found.**\n\n`;
  } else {
    for (const blocker of result.criticalBlockers) {
      report += `### 🔴 ${blocker.message}

- **Workflow:** \`${blocker.workflow}\`
- **Node:** ${blocker.node}
- **Type:** ${blocker.nodeType || 'N/A'}
- **Severity:** ${blocker.severity}
- **Remediation:** ${blocker.remediation}

`;
    }
  }

  report += `---

## Section 2: Deprecated Nodes Found

`;

  if (result.deprecatedNodes.length === 0) {
    report += `✅ **No deprecated nodes found.**\n\n`;
  } else {
    report += `| Workflow | Node | Type | Reason |
|----------|------|------|--------|
`;
    for (const dep of result.deprecatedNodes) {
      report += `| ${dep.workflow} | ${dep.node} | ${dep.nodeType} | ${dep.reason} |\n`;
    }
    report += '\n';
  }

  report += `---

## Section 3: Infrastructure Issues

`;

  if (result.infrastructureIssues.length === 0) {
    report += `✅ **No infrastructure issues found.**\n\n`;
  } else {
    for (const issue of result.infrastructureIssues) {
      report += `### ${issue.severity === 'HIGH' ? '🔴' : '🟡'} ${issue.message}

- **Workflow:** \`${issue.workflow}\`
- **Node:** ${issue.node}
- **URL:** \`${issue.url || 'N/A'}\`
- **Remediation:** ${issue.remediation}

`;
    }
  }

  report += `---

## Section 4: Generative UI Governance Issues

`;

  if (result.governanceIssues.length === 0) {
    report += `✅ **No governance issues found.** The Generative UI handshake pattern is correctly implemented.\n\n`;
  } else {
    for (const issue of result.governanceIssues) {
      report += `### ${issue.severity === 'CRITICAL' ? '🔴' : '🟡'} ${issue.message}

- **Workflow:** \`${issue.workflow}\`
- **Affected Nodes:** ${issue.nodes ? issue.nodes.join(', ') : 'N/A'}
- **Severity:** ${issue.severity}
- **Remediation:** ${issue.remediation}

`;
    }
  }

  report += `---

## Section 5: Resilience Issues

`;

  if (result.resilienceIssues.length === 0) {
    report += `✅ **No resilience issues found.** Error handling and retry logic are properly configured.\n\n`;
  } else {
    for (const issue of result.resilienceIssues) {
      report += `### ${issue.severity === 'HIGH' ? '🟠' : '🟡'} ${issue.message}

- **Workflow:** \`${issue.workflow}\`
- **Node:** ${issue.node || 'N/A'}
- **Severity:** ${issue.severity}
- **Remediation:** ${issue.remediation}

`;
    }
  }

  report += `---

## Section 6: Pre-Mortem Risk Assessment

These scenarios were mentally simulated to assess the system's ability to handle edge cases.

`;

  if (result.premortemRisks.length === 0) {
    report += `✅ **All pre-mortem scenarios pass.**\n\n`;
  } else {
    for (const risk of result.premortemRisks) {
      const statusEmoji = risk.status === 'FAIL' ? '🔴' : risk.status === 'WARN' ? '🟡' : '🟢';
      report += `### ${statusEmoji} Scenario: "${risk.scenario}"

- **Description:** ${risk.description}
- **Check:** ${risk.check}
- **Status:** **${risk.status}**
- **Severity:** ${risk.severity}
${risk.canResume ? `- **Can Resume:** ${risk.canResume}` : ''}
${risk.detail ? `- **Detail:** ${risk.detail}` : ''}
${risk.hasNeverError ? `- **Error Handling:** ${risk.hasNeverError}` : ''}
- **Workflow:** \`${risk.workflow}\`
${risk.node ? `- **Node:** ${risk.node}` : ''}

`;
    }
  }

  report += `---

## Section 7: Workflow Statistics

| Metric | Value |
|--------|-------|
| Total Workflows | ${result.workflowStats.totalWorkflows} |
| AI Product Factory Workflows | ${result.workflowStats.aiProductFactoryWorkflows} |
| Shared Utility Subworkflows | ${result.workflowStats.sharedSubworkflows} |
| Total Nodes | ${result.workflowStats.totalNodes} |
| Google Drive Nodes | ${result.workflowStats.googleDriveNodes} |
| HTTP Request Nodes | ${result.workflowStats.httpRequestNodes} |
| Wait Nodes | ${result.workflowStats.waitNodes} |
| Code Nodes | ${result.workflowStats.codeNodes} |
| AI Agent Nodes | ${result.workflowStats.agentNodes} |

### Node Type Distribution

`;

  const sortedNodeTypes = Object.entries(result.workflowStats.nodeTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  report += `| Node Type | Count |
|-----------|-------|
`;
  for (const [type, count] of sortedNodeTypes) {
    report += `| \`${type}\` | ${count} |\n`;
  }

  report += `

---

## Section 8: Recommendations

### Immediate Actions (Before Launch)

`;

  if (result.criticalBlockers.length > 0) {
    report += `1. **Migrate Google Drive nodes to S3** - ${result.criticalBlockers.filter(b => b.nodeType?.includes('googleDrive')).length} nodes require migration
`;
  }

  if (result.governanceIssues.some(i => i.severity === 'CRITICAL')) {
    report += `2. **Fix Generative UI handshake** - Ensure Wait for Webhook pattern is implemented in Scavenging workflow
`;
  }

  if (result.infrastructureIssues.some(i => i.severity === 'HIGH')) {
    report += `3. **Update hardcoded URLs** - Replace localhost/IP addresses with Docker service names
`;
  }

  report += `
### Short-Term Improvements

`;

  if (result.resilienceIssues.length > 0) {
    report += `1. **Add retry configuration** to HTTP Request nodes for critical services
2. **Implement circuit breaker patterns** in adversarial loops
3. **Add multi-strategy JSON parsing** for LLM output handling
`;
  }

  report += `
### Architecture Validation Checklist

\`\`\`
[${result.criticalBlockers.filter(b => b.nodeType?.includes('googleDrive')).length === 0 ? 'x' : ' '}] All Google Drive nodes migrated to S3
[${result.governanceIssues.filter(i => i.severity === 'CRITICAL').length === 0 ? 'x' : ' '}] Generative UI handshake implemented correctly
[${result.infrastructureIssues.filter(i => i.url?.includes('localhost')).length === 0 ? 'x' : ' '}] No localhost/127.0.0.1 URLs in production workflows
[${result.infrastructureIssues.filter(i => i.message.includes('Graphiti')).length === 0 ? 'x' : ' '}] Graphiti URLs use Docker service names
[${result.infrastructureIssues.filter(i => i.message.includes('Qdrant')).length === 0 ? 'x' : ' '}] Qdrant URLs use Docker service names
[${result.resilienceIssues.filter(i => i.message.includes('retry')).length === 0 ? 'x' : ' '}] HTTP nodes have retry configuration
[${result.premortemRisks.filter(r => r.status === 'FAIL').length === 0 ? 'x' : ' '}] Pre-mortem scenarios pass
\`\`\`

---

## Conclusion

`;

  if (score >= 80) {
    report += `The system is in **good health** (${score}%) and ready for production deployment with minor improvements recommended.\n`;
  } else if (score >= 60) {
    report += `The system requires **attention** (${score}%). Address the critical blockers and high-severity issues before production deployment.\n`;
  } else if (score >= 40) {
    report += `The system has **significant issues** (${score}%). Critical blockers must be resolved before deployment.\n`;
  } else {
    report += `The system is **not ready for production** (${score}%). Multiple critical issues require immediate attention.\n`;
  }

  report += `
---

*Report generated by AI Product Factory Diagnostic Audit Tool v1.0*
`;

  return report;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

function main() {
  console.log('🔍 AI Product Factory - Pre-Mortem Diagnostic Audit');
  console.log('=' .repeat(50));
  console.log(`📂 Scanning workflows in: ${WORKFLOWS_DIR}`);
  console.log();

  const result = new AuditResult();

  // Load all workflows
  const workflows = loadWorkflows();
  console.log(`📄 Loaded ${workflows.length} workflow files`);
  console.log();

  // Run all audit checks
  console.log('🔍 Running audit checks...');

  for (const workflow of workflows) {
    console.log(`  → Analyzing: ${workflow.filename}`);

    // Check 1: Google Drive nodes
    const driveCount = checkGoogleDriveNodes(workflow, result);
    if (driveCount > 0) {
      console.log(`    ⚠️  Found ${driveCount} Google Drive node(s)`);
    }

    // Check 2: Infrastructure URLs
    const infraIssues = checkInfrastructureURLs(workflow, result);
    if (infraIssues > 0) {
      console.log(`    ⚠️  Found ${infraIssues} infrastructure URL issue(s)`);
    }

    // Check 3: Generative UI handshake
    const governance = checkGenerativeUIHandshake(workflow, result);
    if (governance.issues > 0) {
      console.log(`    ⚠️  Found ${governance.issues} governance issue(s)`);
    }

    // Check 4: Loop safeguards
    const loops = checkLoopSafeguards(workflow, result);
    if (loops.issues > 0) {
      console.log(`    ⚠️  Found ${loops.issues} loop safeguard issue(s)`);
    }

    // Check 5: State persistence
    const persistence = checkStatePersistence(workflow, result);
    if (persistence.issues > 0) {
      console.log(`    ⚠️  Found ${persistence.issues} state persistence issue(s)`);
    }

    // Check 6: S3 resilience
    const s3Resilience = checkS3Resilience(workflow, result);
    if (s3Resilience.issues > 0) {
      console.log(`    ⚠️  Found ${s3Resilience.issues} S3 resilience issue(s)`);
    }

    // Check 7: JSON validation
    const jsonValidation = checkJSONValidation(workflow, result);
    if (jsonValidation.issues > 0) {
      console.log(`    ⚠️  Found ${jsonValidation.issues} JSON validation issue(s)`);
    }
  }

  // Collect statistics
  console.log();
  console.log('📊 Collecting workflow statistics...');
  collectWorkflowStats(workflows, result);

  // Finalize score
  const finalScore = result.finalizeScore();
  console.log();
  console.log('=' .repeat(50));
  console.log(`📈 Final Health Score: ${finalScore}%`);
  console.log(`   Critical Blockers: ${result.criticalBlockers.length}`);
  console.log(`   Deprecated Nodes: ${result.deprecatedNodes.length}`);
  console.log(`   Infrastructure Issues: ${result.infrastructureIssues.length}`);
  console.log(`   Governance Issues: ${result.governanceIssues.length}`);
  console.log(`   Resilience Issues: ${result.resilienceIssues.length}`);
  console.log(`   Pre-Mortem Risks: ${result.premortemRisks.length}`);

  // Generate report
  console.log();
  console.log('📝 Generating Pre-Mortem Report...');
  const report = generateReport(result);

  // Save report
  fs.writeFileSync(OUTPUT_FILE, report, 'utf8');
  console.log(`✅ Report saved to: ${OUTPUT_FILE}`);

  // Return result for programmatic use
  return {
    score: finalScore,
    result,
    reportPath: OUTPUT_FILE
  };
}

// Run if executed directly
if (require.main === module) {
  try {
    const { score } = main();
    process.exit(score >= 60 ? 0 : 1);
  } catch (error) {
    console.error('❌ Diagnostic audit failed:', error.message);
    process.exit(1);
  }
}

module.exports = { main, AuditResult, loadWorkflows };
