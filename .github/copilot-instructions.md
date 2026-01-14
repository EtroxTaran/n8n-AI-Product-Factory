# Copilot Instructions — Titan Workflow Suite

Purpose: Give AI coding agents the minimal, actionable context needed to be productive in this repo.

- **Big picture**: This repository contains n8n workflows that implement the "Titan" AI orchestration (main orchestrator + 3 subworkflows: adversarial loop, Graphiti, Qdrant). See `workflows/README.md` and `claude.md` for architecture diagrams and agent roles.

- **Key files**:
  - `workflows/titan-main-workflow.json` — main orchestrator
  - `workflows/titan-adversarial-loop-subworkflow.json` — Creator→Critic→Refiner loop
  - `workflows/titan-graphiti-subworkflow.json` — knowledge graph ops
  - `workflows/titan-qdrant-subworkflow.json` — vector DB ops and embeddings
  - `workflows/README.md` and `claude.md` — authoritative docs for flows, timings, and MCP setup

- **Primary patterns to follow**:
  - Adversarial loop: Creator → Critic → Refiner pattern with iteration history and a score threshold (stop when score ≥ 9.0 or max iterations reached).
  - All subworkflows must return outputs via Merge Output nodes — prior versions had dead-end nodes (see `workflows/README.md`).
  - External HTTP nodes use `neverError` mode and central validation nodes; preserve this error-capture pattern when editing flows.

- **Credentials & naming conventions** (must match n8n exactly):
  - `OpenAI API` — main OpenAI credential for agents
  - `OpenAI API Header` — HTTP header credential for embedding calls
  - Environment names used in docs: `GRAPHITI_URL`, `QDRANT_URL`, `QDRANT_API_KEY`, `OPENAI_API_URL`

- **Integration notes**:
  - Qdrant expects an `api-key` header (not `Authorization`) and UUIDv4 point IDs.
  - Graphiti is used as the canonical knowledge graph; code/workflows consult Graphiti before generating or refining content.
  - MCP servers (n8n-mcp, context7, etc.) are configured via `.mcp.json` or user-scoped `~/.claude.json` — changes here affect how Claude/agents call workflows.

- **Developer workflows (how to test & validate changes)**:
  - Import subworkflows in this order: `titan-graphiti-subworkflow.json`, `titan-qdrant-subworkflow.json`, `titan-adversarial-loop-subworkflow.json`, `titan-main-workflow.json`.
  - Activate subworkflows first; keep the main workflow inactive during config changes.
  - Quick local checks (PowerShell examples from docs):
    ```powershell
    Invoke-WebRequest -Uri "https://c3po.etrox.de" -Method GET
    # Test MCP endpoint (replace token)
    $headers = @{ authorization = "Bearer YOUR_TOKEN"; 'Content-Type'='application/json' }
    $body = '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
    Invoke-WebRequest -Uri "https://c3po.etrox.de/mcp-server/http" -Method POST -Headers $headers -Body $body
    ```

- **Common pitfalls to avoid**:
  - Do not rename credentials; the workflows reference credentials by exact name.
  - Preserve `neverError` handling and Merge Output connections — removing them caused silent failures in prior releases.
  - When changing Qdrant code paths, ensure point IDs remain UUIDv4 and `api-key` header is used.

- **Where to add tests / verification**:
  - Use `workflows/TESTING_CHECKLIST.md` for step-by-step validation; run sample inputs via n8n UI Execute Workflow and confirm outputs (vision + architecture docs, iteration history, scores).

- **When in doubt**: consult `claude.md` for the intended agent roles, expected timings, and MCP configuration examples. If making infra or secret-related changes, update `.mcp.json` examples and note sensitive values must remain out of git.

If any section is unclear or you want me to include more examples (sample inputs, or a minimal `.mcp.json` template), tell me which part to expand.
