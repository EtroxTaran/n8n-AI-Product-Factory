# Titan Workflow Testing Checklist - v2.1.0

This checklist covers testing all the improvements made in v2.1.0.

## Pre-Testing Setup

### 1. Credentials Verification
- [ ] OpenAI API credential exists and is named `OpenAI API`
- [ ] OpenAI API Header credential exists and is named `OpenAI API Header`
- [ ] Google Drive OAuth2 credential is configured
- [ ] Perplexity API credential is configured (HTTP Header Auth)

### 2. Sub-Workflow Activation
- [ ] "Titan - Graphiti Operations" is ACTIVE
- [ ] "Titan - Qdrant Operations" is ACTIVE
- [ ] "Titan - Adversarial Agent Loop" is ACTIVE

### 3. Environment Variables (Optional)
- [ ] `GRAPHITI_URL` is set (or using default)
- [ ] `QDRANT_URL` is set (or using default)
- [ ] `OPENAI_API_URL` is set (or using default)

---

## Critical Fixes Testing

### Test 1: Input Validation

**Test Case 1.1: Missing folder ID**
```json
{
  "project_id": "test-project",
  "description": "Test without folder ID"
}
```
- [ ] Workflow returns user-friendly error message
- [ ] Error message explains how to find folder ID
- [ ] Workflow does NOT proceed to Google Drive operations

**Test Case 1.2: Valid JSON input**
```json
{
  "project_id": "valid-test",
  "drive_folder_id": "1abc123def456",
  "description": "Valid test project"
}
```
- [ ] Input is parsed correctly
- [ ] project_id is extracted
- [ ] drive_folder_id is extracted
- [ ] Workflow proceeds to Phase 0

**Test Case 1.3: Plain text input with folder**
```
project: my-project, folder: 1abc123def456
```
- [ ] Regex fallback extracts values
- [ ] Workflow proceeds

---

### Test 2: Qdrant Integration (Embedding Generation)

**Test Case 2.1: Upsert with content**
Execute Qdrant workflow directly with:
```json
{
  "operation": "upsert",
  "content": "Test content for embedding generation",
  "type": "test",
  "scope": "local"
}
```
- [ ] Embedding is generated (1536 dimensions)
- [ ] Point is upserted to Qdrant
- [ ] Response includes `tokens_used`
- [ ] Response includes generated `id`

**Test Case 2.2: Search with query**
```json
{
  "operation": "search",
  "query": "test content",
  "limit": 5
}
```
- [ ] Search embedding is generated
- [ ] Search returns results (if data exists)
- [ ] Response includes `count` and `results`

**Test Case 2.3: Collection creation**
```json
{
  "operation": "create_collection"
}
```
- [ ] Collection is created (or already exists message)
- [ ] No error thrown

---

### Test 3: Adversarial Loop Iteration

**Test Case 3.1: Session ID uniqueness**
Run the adversarial loop twice with the same task:
```json
{
  "task": "Test task for session isolation",
  "context": "Test context",
  "creator_prompt": "Create a short document.",
  "critic_prompt": "Evaluate the document. Score 10 if acceptable.",
  "refiner_prompt": "Improve the document.",
  "max_iterations": 2,
  "score_threshold": 10
}
```
- [ ] Each run has a unique `session_id`
- [ ] Memory is NOT shared between runs
- [ ] First run's context doesn't leak into second run

**Test Case 3.2: Iteration history tracking**
- [ ] Output includes `iteration_history` array
- [ ] Each iteration has `action`, `timestamp`, `score`
- [ ] `telemetry` includes `duration_formatted`

**Test Case 3.3: Max iterations reached**
Run with impossible score threshold:
```json
{
  "task": "Test max iterations",
  "score_threshold": 999,
  "max_iterations": 2
}
```
- [ ] Workflow exits after max_iterations
- [ ] Status is "max_iterations_reached"
- [ ] Message explains the situation

---

## High Priority Testing

### Test 4: Error Handling & Retry

**Test Case 4.1: Graphiti retry**
- [ ] Simulate network error (stop Graphiti temporarily)
- [ ] Verify workflow retries 3 times
- [ ] Verify 1-2s delay between retries
- [ ] After 3 failures, proper error is shown

**Test Case 4.2: Qdrant retry**
- [ ] Similar test for Qdrant operations
- [ ] Verify retry behavior

**Test Case 4.3: Perplexity rate limit**
- [ ] Make rapid consecutive requests
- [ ] Verify 1s delay is applied
- [ ] Verify retry with backoff works

---

### Test 5: Environment Variables

**Test Case 5.1: Custom Graphiti URL**
Set `GRAPHITI_URL=http://custom-graphiti:9090`
- [ ] Requests go to custom URL
- [ ] No hardcoded URL used

**Test Case 5.2: Default URLs**
Remove environment variables
- [ ] Workflow uses default URLs
- [ ] No errors from missing env vars

---

### Test 6: Response Validation

**Test Case 6.1: Graphiti error handling**
Send invalid operation to Graphiti:
```json
{
  "operation": "invalid_operation"
}
```
- [ ] Error is caught by validation node
- [ ] Clear error message is returned
- [ ] Workflow doesn't fail silently

**Test Case 6.2: Qdrant error handling**
Send search without vector:
- [ ] Error is caught
- [ ] Message explains the issue

---

## Medium Priority Testing

### Test 7: Rate Limiting

**Test Case 7.1: Perplexity delay**
- [ ] Check execution timing
- [ ] Verify 1s delay before Perplexity call
- [ ] Verify retry waits 5s between attempts

---

### Test 8: Checkpoints

**Test Case 8.1: Phase 0 checkpoint**
- [ ] Checkpoint node captures state after Phase 0
- [ ] State includes: project_id, drive_folder_id, timestamps

**Test Case 8.2: Phase 1 checkpoint**
- [ ] Checkpoint captures vision score and iterations
- [ ] State can be used for debugging

---

### Test 9: Parallel Operations

**Test Case 9.1: Graphiti parallel queries**
- [ ] "Get Tech Stack" and "Get Historical Failures" run in parallel
- [ ] Both complete before Architecture loop starts
- [ ] Total time is ~max(query1, query2), not sum

---

### Test 10: Telemetry

**Test Case 10.1: Duration tracking**
Complete a full workflow and verify:
- [ ] `telemetry.start_time` is set
- [ ] `telemetry.end_time` is set
- [ ] `telemetry.duration_ms` is accurate
- [ ] `telemetry.duration_formatted` is readable (e.g., "5m 23s")

**Test Case 10.2: Iteration history**
- [ ] Each agent action is logged
- [ ] Timestamps are accurate
- [ ] Score changes are tracked

---

## Lower Priority Testing

### Test 11: Input Sanitization

**Test Case 11.1: Template injection**
```json
{
  "project_id": "test",
  "drive_folder_id": "123",
  "description": "Test {{ $env.SECRET }} injection"
}
```
- [ ] `{{` is converted to `{ {`
- [ ] No template execution occurs
- [ ] Content is safely passed to agents

**Test Case 11.2: Code injection**
```json
{
  "description": "$(rm -rf /)"
}
```
- [ ] `$(` is converted to `$ (`
- [ ] No code execution
- [ ] Safely handled

---

## Integration Tests

### Test 12: Full End-to-End Run

**Test Case 12.1: Complete workflow**
Provide valid inputs with documents in Google Drive:
```json
{
  "project_id": "e2e-test",
  "drive_folder_id": "valid-folder-id",
  "description": "E2E test project"
}
```
- [ ] Phase 0 completes (Scavenger)
- [ ] New standards are prompted for confirmation
- [ ] Standards are added to both Graphiti AND Qdrant
- [ ] Phase 1 completes (Vision)
- [ ] Vision document is saved to Drive
- [ ] Phase 2 completes (Architecture)
- [ ] Architecture document is saved to Drive
- [ ] Phase 3 completes (Audit)
- [ ] Final response includes all telemetry
- [ ] Grade and recommendations are provided

### Test 13: Empty Folder Test

**Test Case 13.1: No documents in folder**
- [ ] Workflow gracefully skips document processing
- [ ] Proceeds to Phase 1 with user input only
- [ ] No errors thrown

---

## Performance Tests

### Test 14: Response Times

| Phase | Expected | Actual | Pass? |
|-------|----------|--------|-------|
| Input Validation | <1s | ___ | [ ] |
| Phase 0 (with docs) | 2-5m | ___ | [ ] |
| Phase 1 (Vision) | 5-15m | ___ | [ ] |
| Phase 2 (Arch) | 5-15m | ___ | [ ] |
| Phase 3 (Audit) | 1-3m | ___ | [ ] |
| **Total** | 15-40m | ___ | [ ] |

### Test 15: Token Usage

- [ ] Track OpenAI token usage during full run
- [ ] Verify embedding tokens are minimal
- [ ] Verify agent tokens are within limits

---

## Rollback Verification

### Test 16: Rollback Test
If critical issues found:
- [ ] Git revert works
- [ ] Previous workflow version loads
- [ ] Old execution continues

---

## Sign-Off

| Category | Tests Passed | Total |
|----------|-------------|-------|
| Critical Fixes | ___ | 9 |
| High Priority | ___ | 7 |
| Medium Priority | ___ | 5 |
| Lower Priority | ___ | 2 |
| Integration | ___ | 2 |
| Performance | ___ | 2 |

**Overall Status**: [ ] PASS / [ ] FAIL

**Tested By**: _______________

**Date**: _______________

**Notes**:
```
(Add any observations, issues, or recommendations)
```
