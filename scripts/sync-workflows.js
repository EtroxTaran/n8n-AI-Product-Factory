#!/usr/bin/env node

/**
 * n8n Workflow Sync Script
 *
 * Syncs local workflow JSON files from the workflows/ directory to an n8n instance.
 * Uses the n8n REST API to create or update workflows by matching on name.
 *
 * Usage:
 *   node scripts/sync-workflows.js [options]
 *
 * Options:
 *   --dry-run    Preview changes without making modifications
 *   --force      Overwrite workflows even if they appear unchanged
 *   --activate   Activate workflows after creating/updating
 *   --verbose    Show detailed output
 *
 * Environment Variables:
 *   N8N_API_URL  - Base URL of the n8n instance (required)
 *   N8N_API_KEY  - API key for authentication (required)
 *
 * Example:
 *   N8N_API_URL=https://n8n.example.com N8N_API_KEY=xxx node scripts/sync-workflows.js
 */

const fs = require("fs");
const path = require("path");

// Configuration
const N8N_API_URL = process.env.N8N_API_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;
const WORKFLOWS_DIR = path.join(__dirname, "..", "workflows");

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");
const ACTIVATE = args.includes("--activate");
const VERBOSE = args.includes("--verbose");

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "") {
  console.log(`${color}${message}${colors.reset}`);
}

function logVerbose(message) {
  if (VERBOSE) {
    console.log(`  ${colors.cyan}[verbose]${colors.reset} ${message}`);
  }
}

async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      logVerbose(`Request failed, retrying (${i + 1}/${retries})...`);
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function fetchExistingWorkflows() {
  logVerbose("Fetching existing workflows from n8n...");

  const response = await fetchWithRetry(`${N8N_API_URL}/api/v1/workflows`, {
    method: "GET",
    headers: {
      "X-N8N-API-KEY": N8N_API_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch workflows: ${response.status} - ${text}`);
  }

  const data = await response.json();
  return data.data || [];
}

async function createWorkflow(workflow) {
  logVerbose(`Creating workflow: ${workflow.name}`);

  // Remove ID if present (n8n will generate new one)
  const { id, ...workflowData } = workflow;

  const response = await fetchWithRetry(`${N8N_API_URL}/api/v1/workflows`, {
    method: "POST",
    headers: {
      "X-N8N-API-KEY": N8N_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...workflowData,
      active: ACTIVATE,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create workflow: ${response.status} - ${text}`);
  }

  return response.json();
}

async function updateWorkflow(id, workflow) {
  logVerbose(`Updating workflow ID ${id}: ${workflow.name}`);

  // Remove local ID, use the n8n instance ID
  const { id: localId, ...workflowData } = workflow;

  const response = await fetchWithRetry(
    `${N8N_API_URL}/api/v1/workflows/${id}`,
    {
      method: "PUT",
      headers: {
        "X-N8N-API-KEY": N8N_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...workflowData,
        active: ACTIVATE ? true : workflowData.active,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to update workflow: ${response.status} - ${text}`);
  }

  return response.json();
}

function readLocalWorkflows() {
  logVerbose(`Reading workflows from ${WORKFLOWS_DIR}`);

  if (!fs.existsSync(WORKFLOWS_DIR)) {
    throw new Error(`Workflows directory not found: ${WORKFLOWS_DIR}`);
  }

  const files = fs
    .readdirSync(WORKFLOWS_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("."));

  logVerbose(`Found ${files.length} workflow files`);

  const workflows = [];
  for (const file of files) {
    const filePath = path.join(WORKFLOWS_DIR, file);
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const workflow = JSON.parse(content);
      workflows.push({
        ...workflow,
        _sourceFile: file,
      });
    } catch (error) {
      log(`  Warning: Failed to parse ${file}: ${error.message}`, colors.yellow);
    }
  }

  return workflows;
}

async function main() {
  console.log();
  log("n8n Workflow Sync", colors.bright);
  log("=================");
  console.log();

  // Validate environment
  if (!N8N_API_URL) {
    log("Error: N8N_API_URL environment variable is required", colors.red);
    process.exit(1);
  }

  if (!N8N_API_KEY) {
    log("Error: N8N_API_KEY environment variable is required", colors.red);
    process.exit(1);
  }

  log(`Target: ${N8N_API_URL}`, colors.blue);

  if (DRY_RUN) {
    log("Mode: DRY RUN (no changes will be made)", colors.yellow);
  } else {
    log("Mode: LIVE (changes will be applied)", colors.green);
  }

  console.log();

  try {
    // Fetch existing workflows from n8n
    const existingWorkflows = await fetchExistingWorkflows();
    log(`Found ${existingWorkflows.length} existing workflows in n8n`);

    // Create lookup map by name
    const existingByName = new Map();
    for (const wf of existingWorkflows) {
      existingByName.set(wf.name, wf);
    }

    // Read local workflows
    const localWorkflows = readLocalWorkflows();
    log(`Found ${localWorkflows.length} local workflow files`);

    console.log();

    // Track statistics
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Process each local workflow
    for (const workflow of localWorkflows) {
      const existing = existingByName.get(workflow.name);

      try {
        if (existing) {
          // Update existing workflow
          if (DRY_RUN) {
            log(
              `[UPDATE] ${workflow.name} (ID: ${existing.id})`,
              colors.yellow
            );
            log(`         Source: ${workflow._sourceFile}`);
          } else {
            await updateWorkflow(existing.id, workflow);
            log(
              `[UPDATE] ${workflow.name} (ID: ${existing.id})`,
              colors.yellow
            );
          }
          updated++;
        } else {
          // Create new workflow
          if (DRY_RUN) {
            log(`[CREATE] ${workflow.name}`, colors.green);
            log(`         Source: ${workflow._sourceFile}`);
          } else {
            const result = await createWorkflow(workflow);
            log(`[CREATE] ${workflow.name} (ID: ${result.id})`, colors.green);
          }
          created++;
        }
      } catch (error) {
        log(`[ERROR]  ${workflow.name}: ${error.message}`, colors.red);
        errors++;
      }
    }

    // Summary
    console.log();
    log("Summary", colors.bright);
    log("-------");
    log(`  Created: ${created}`, colors.green);
    log(`  Updated: ${updated}`, colors.yellow);
    log(`  Skipped: ${skipped}`, colors.blue);
    if (errors > 0) {
      log(`  Errors:  ${errors}`, colors.red);
    }

    console.log();

    if (DRY_RUN) {
      log("Dry run complete. Run without --dry-run to apply changes.", colors.cyan);
    } else {
      log("Sync complete!", colors.green);
    }

    // Exit with error code if there were failures
    if (errors > 0) {
      process.exit(1);
    }
  } catch (error) {
    log(`Fatal error: ${error.message}`, colors.red);
    if (VERBOSE) {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
