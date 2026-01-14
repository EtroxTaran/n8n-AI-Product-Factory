# AI Agent Node Conversion Guide

## Overview

This guide documents the conversion of all HTTP-based AI agent calls to n8n's native AI Agent nodes with OpenAI chat models, workflow tools, and memory capabilities.

## What Changed

### Before
- Used HTTP Request nodes to call OpenRouter API
- Manual JSON parsing with Code nodes
- No memory or context preservation
- No tool capabilities

### After
- Native `@n8n/n8n-nodes-langchain.agent` nodes
- OpenAI Chat Model sub-nodes (GPT-4 and GPT-4o-mini)
- Built-in memory for context preservation
- Workflow tools for accessing Graphiti and Qdrant
- Structured output handling

## Prerequisites

### 1. OpenAI API Credential Setup

Before using the converted workflows, you **must** create an OpenAI API credential in n8n:

1. Go to **Settings** → **Credentials** in n8n
2. Click **Add Credential**
3. Select **OpenAI API**
4. Enter your OpenAI API key
5. Name it: `OpenAI API`
6. Save the credential

**Important**: The credential ID in the workflow files references `openai-api`. If you name it differently, you'll need to update the credential references in the JSON files.

## Converted Agents

### Main Workflow (`titan-main-workflow.json`)

#### 1. Scavenger Agent
- **Purpose**: Identifies technical decisions and standards from documents
- **Model**: GPT-4o-mini
- **Temperature**: 0.2
- **Memory**: Simple Memory (session-based)
- **Tools**: 
  - Graphiti Search Tool - Checks for existing standards
- **Output**: JSON array of findings

#### 2. Auditor Agent
- **Purpose**: Final quality gate for Vision + Architecture documents
- **Model**: GPT-4o-mini
- **Temperature**: 0.3
- **Memory**: Simple Memory (session-based)
- **Tools**:
  - Tech Stack Query Tool - Compares against approved tech stack
- **Output**: JSON with grade, summary, new_technologies, recommendations

### Adversarial Loop Workflow (`titan-adversarial-loop-subworkflow.json`)

#### 3. Creator Agent (Agent A)
- **Purpose**: Creates initial drafts for Vision/Architecture documents
- **Model**: GPT-4
- **Temperature**: 0.7
- **Memory**: Window Buffer Memory (3 messages)
- **Tools**:
  - Graphiti Context Tool - Retrieves relevant context
- **Output**: Comprehensive draft text

#### 4. Critic Agent (Agent B)
- **Purpose**: Evaluates drafts and provides structured feedback
- **Model**: GPT-4
- **Temperature**: 0.3
- **Memory**: Window Buffer Memory (2 messages)
- **Tools**: None (focused evaluation)
- **Output**: JSON with score, issues, strengths, recommendations

#### 5. Refiner Agent (Agent C)
- **Purpose**: Improves drafts based on critic feedback
- **Model**: GPT-4
- **Temperature**: 0.5
- **Memory**: Window Buffer Memory (5 messages for full iteration history)
- **Tools**:
  - Research Tool - Finds additional context from Graphiti
- **Output**: Refined draft text

## Memory Configuration

### Simple Memory
Used for single-shot agents (Scavenger, Auditor):
- Stores conversation in n8n instance memory
- Session key based on project ID
- Automatically cleared between projects

### Window Buffer Memory
Used for iterative agents (Creator, Critic, Refiner):
- Maintains sliding window of recent messages
- Preserves context across iterations
- Different window sizes based on agent needs:
  - **Creator**: 3 messages (current task + context)
  - **Critic**: 2 messages (draft + evaluation)
  - **Refiner**: 5 messages (full iteration history)

## Workflow Tools

### Graphiti Search Tool
- **Workflow**: Titan - Graphiti Operations
- **Purpose**: Search knowledge graph for existing standards
- **Used by**: Scavenger Agent
- **Description**: "Search the Graphiti knowledge graph for existing technical standards and decisions."

### Tech Stack Query Tool
- **Workflow**: Titan - Graphiti Operations
- **Purpose**: Query approved technology stack
- **Used by**: Auditor Agent
- **Description**: "Query the Graphiti knowledge graph for the approved technology stack."

### Graphiti Context Tool
- **Workflow**: Titan - Graphiti Operations
- **Purpose**: Retrieve relevant context for drafting
- **Used by**: Creator Agent
- **Description**: "Access the Graphiti knowledge graph to retrieve relevant context, facts, and historical information."

### Research Tool
- **Workflow**: Titan - Graphiti Operations
- **Purpose**: Find additional context for refinement
- **Used by**: Refiner Agent
- **Description**: "Research tool for finding additional context and information from the Graphiti knowledge graph."

## Output Handling

### AI Agent Output Format
AI Agent nodes output data in this format:
```json
{
  "output": "The agent's response text",
  "text": "Alternative field for response",
  "sessionId": "unique-session-id"
}
```

### Parsing Updates
All parsing Code nodes have been updated to handle AI Agent output:

**Before:**
```javascript
const content = response.choices[0].message.content;
```

**After:**
```javascript
const content = response.output || response.text || '';
```

## Benefits of AI Agent Nodes

### 1. Better Structure
- Native integration with n8n's AI ecosystem
- Visual representation of AI components
- Easier to understand and maintain

### 2. Tool Support
- Agents can call workflows as tools
- Access to calculators, code execution, web search
- Extensible with custom tools

### 3. Memory Management
- Built-in conversation context
- Automatic session management
- Configurable retention policies

### 4. Easier Debugging
- AI Agent logs tab shows full conversation
- Token usage tracking
- Error messages are more descriptive

### 5. Structured Output
- Native JSON parsing
- Better error handling
- Consistent output format

## Testing Checklist

After importing the workflows, verify:

- [ ] OpenAI API credential is configured
- [ ] Scavenger correctly identifies technical standards
- [ ] Creator generates comprehensive drafts
- [ ] Critic provides structured feedback with scores
- [ ] Refiner improves drafts based on feedback
- [ ] Auditor assigns grades and detects new technologies
- [ ] Memory persists context across iterations
- [ ] Workflow tools successfully call sub-workflows
- [ ] Error handling works correctly
- [ ] Performance is acceptable

## Performance Considerations

### Response Times
- AI Agent nodes may be slightly slower than direct HTTP calls
- Tool calling adds overhead (1-2 seconds per tool call)
- Memory operations are fast (< 100ms)

### Token Usage
- Memory increases token consumption
- Window Buffer Memory: ~100-500 tokens per message
- Simple Memory: ~50-200 tokens per session
- Monitor usage in OpenAI dashboard

### Rate Limits
- OpenAI has rate limits based on your tier
- GPT-4: Lower rate limits than GPT-4o-mini
- Consider adding retry logic for rate limit errors

## Troubleshooting

### "Credential not found" Error
- Verify OpenAI API credential exists
- Check credential name matches "OpenAI API"
- Ensure credential has valid API key

### "Tool execution failed" Error
- Verify sub-workflows exist and are active
- Check workflow names match exactly
- Ensure sub-workflows have Execute Workflow Trigger

### "Memory session not found" Error
- Memory is cleared between n8n restarts
- Session keys are based on project ID
- This is normal behavior for new sessions

### Parsing Errors
- AI Agents may return text instead of JSON
- Parsing Code nodes handle this gracefully
- Check AI Agent logs for actual output

## Migration Notes

### Perplexity Market Research
The Perplexity Market Research node remains as an HTTP Request node because:
- Perplexity provides real-time web search
- No equivalent n8n AI Agent tool available
- HTTP approach is more reliable for this use case

If you want to convert it, consider:
- Using OpenAI with web search capability
- Creating a custom tool for web search
- Using SerpAPI tool with AI Agent

### Cost Considerations
- OpenAI GPT-4: More expensive than Gemini 2.0 Flash
- GPT-4o-mini: Cost-effective alternative
- Monitor usage and adjust models as needed

### Backward Compatibility
- Old HTTP-based workflows will not work with these files
- Credential references have changed
- Output format is different

## Additional Resources

- [n8n AI Agent Documentation](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/)
- [OpenAI Chat Model Documentation](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatopenai/)
- [LangChain Memory Documentation](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorybufferwindow/)
- [Workflow Tool Documentation](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolworkflow/)

## Support

For issues or questions:
1. Check the n8n community forum
2. Review the AI Agent logs in n8n
3. Verify credential and workflow configuration
4. Check OpenAI API status and rate limits
