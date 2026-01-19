# AI Product Factory - Expert Context Document

**Version:** 3.0.12
**Date:** 2026-01-19
**Purpose:** Comprehensive technical reference for expert consultation, system improvement analysis, and onboarding

---

## Table of Contents

### PART I: OVERVIEW & VISION
1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Mission](#2-product-vision--mission)

### PART II: SYSTEM ARCHITECTURE
3. [System Architecture](#3-system-architecture)
4. [Complete Tech Stack](#4-complete-tech-stack)

### PART III: AI AGENT SYSTEM
5. [AI Agent System](#5-ai-agent-system)

### PART IV: WORKFLOW SYSTEM
6. [Workflow Phases](#6-workflow-phases)
7. [Workflow Files Reference](#7-workflow-files-reference)

### PART V: DASHBOARD APPLICATION
8. [Dashboard Application](#8-dashboard-application)
9. [API Reference](#9-api-reference)

### PART VI: DATA ARCHITECTURE
10. [Data Architecture](#10-data-architecture)

### PART VII: INFRASTRUCTURE & DEPLOYMENT
11. [Infrastructure & Deployment](#11-infrastructure--deployment)
12. [CI/CD Pipeline](#12-cicd-pipeline)

### PART VIII: TESTING STRATEGY
13. [Testing Strategy](#13-testing-strategy)

### PART IX: OPERATIONS
14. [Security Considerations](#14-security-considerations)
15. [Performance Optimization](#15-performance-optimization)
16. [Troubleshooting Guide](#16-troubleshooting-guide)

### PART X: REFERENCE
17. [Current Limitations & Known Issues](#17-current-limitations--known-issues)
18. [Improvement Opportunities](#18-improvement-opportunities)
19. [Version History](#19-version-history)
20. [Quick Reference](#20-quick-reference)

### APPENDICES
- [Appendix A: Environment Variables](#appendix-a-environment-variables)
- [Appendix B: Database Schema DDL](#appendix-b-database-schema-ddl)
- [Appendix C: API Endpoint Reference](#appendix-c-api-endpoint-reference)
- [Appendix D: Glossary](#appendix-d-glossary)

---

# PART I: OVERVIEW & VISION

## 1. Executive Summary

The **AI Product Factory** is an n8n-based multi-agent AI orchestration system that automatically generates professional Product Vision and Architecture documents through collaborative AI workflows. It implements human-in-the-loop governance, adversarial quality loops, and maintains knowledge context through graph and vector databases.

### Core Value Proposition

| Problem | Solution |
|---------|----------|
| Product documentation is time-consuming and inconsistent | Automated generation with quality validation |
| Technical decisions lack traceability | Decision logs with complete audit trail |
| AI outputs lack quality control | Adversarial loops with scoring thresholds |
| Knowledge is siloed in documents | Knowledge graph + vector embeddings |
| No human oversight of AI decisions | Batch governance UI for tech stack approval |
| Workflow state lost on interruption | Smart Start with S3-based resumability |
| Complex deployment orchestration | Two-phase import with rollback support |

### Key Metrics

| Metric | Value |
|--------|-------|
| **Workflow Duration** | 15-40 minutes per project |
| **Quality Threshold** | Score >= 90/100 |
| **Max Iterations** | 5 per phase |
| **Cost Per Run** | ~$0.10-0.15 (optimized) |
| **AI Agents** | 8 specialized agents |
| **Workflow Files** | 12 (8 main + 4 Titan utilities) |
| **API Endpoints** | 21 dashboard + 4 n8n webhooks |
| **Test Coverage** | 94 workflow + 79 integration + frontend tests |

### System Capabilities Matrix

| Capability | Description | Components |
|------------|-------------|------------|
| **Document Generation** | Vision & Architecture docs | Visionary, Architect agents |
| **Quality Assurance** | Scoring & fact-checking | Critic, Dr. Doom agents |
| **Iterative Refinement** | Adversarial loops | Refiner, Fixer agents |
| **Knowledge Management** | Context extraction & retrieval | Graphiti, Qdrant |
| **Human Governance** | Tech stack approval | GovernanceWidget UI |
| **State Management** | Resumable workflows | Smart Start, S3 state |
| **Real-time Progress** | Live import status | SSE streaming |
| **Registry Sync** | n8n state detection | Sync API, fix-stuck |
| **Reset Operations** | Multiple reset modes | StateManagement UI |

### Quick Start Decision Tree

```
Is this a fresh deployment?
├── YES → Run Setup Wizard (/setup/welcome)
│         └── Configure n8n → Import Workflows → Verify
└── NO → Are workflows imported?
         ├── NO → Settings → Workflows → Import
         └── YES → Create Project (/projects/new)
                   └── Upload docs → Start → Wait for Governance
```

---

## 2. Product Vision & Mission

### Mission Statement

Enable organizations to rapidly generate high-quality, validated product and architecture documentation using collaborative AI agents with human oversight.

### Target Users & Personas

| Persona | Need | Primary Use Case |
|---------|------|------------------|
| **Product Managers** | Structured Product Vision documents | Rapid vision documentation for new initiatives |
| **Solution Architects** | ARC42 architecture documentation | System design documentation with risk analysis |
| **Tech Leads** | Validated technical decisions | Technology selection with audit trails |
| **Startups** | Professional documentation quickly | MVP documentation without hiring consultants |
| **Consultants** | Repeatable documentation workflows | Client deliverables at scale |
| **Enterprise Teams** | Governance-compliant outputs | Documentation with approval workflows |

### Key Features

| Feature | Description | Version |
|---------|-------------|---------|
| **Multi-Agent Collaboration** | 8 specialized AI agents working together | v1.0.0 |
| **Adversarial Quality Loops** | Creator → Critic → Refiner iteration | v1.0.0 |
| **Human-in-the-Loop Governance** | Tech Stack Configurator widget | v2.6.0 |
| **Knowledge Management** | Graphiti (graph) + Qdrant (vector) | v2.1.0 |
| **S3-Compatible Storage** | SeaweedFS for documents and artifacts | v2.7.0 |
| **Drag-and-Drop Upload** | Presigned URL file upload | v2.5.0 |
| **ADR Viewer** | Architecture Decision Record browser | v2.6.0 |
| **Project Dashboard** | TanStack Start React application | v2.6.0 |
| **Setup Wizard** | 6-step n8n configuration wizard | v3.0.0 |
| **Two-Phase Import** | Create all → Activate all with rollback | v3.0.6 |
| **Pre-Import Validation** | Node compatibility, circular deps | v3.0.8 |
| **SSE Streaming** | Real-time import progress | v3.0.9 |
| **Dependency Visualization** | Workflow dependency graph | v3.0.10 |
| **State Management UI** | Sync, fix-stuck, reset modes | v3.0.12 |
| **State Resumability** | Smart Start for interrupted workflows | v2.8.0 |
| **CI/CD Pipeline** | GitHub Actions + Dokploy | v2.6.0 |

### Output Artifacts

| Artifact | Format | Description |
|----------|--------|-------------|
| **Product Vision** | Markdown | Problem, personas, JTBD, metrics, differentiation |
| **Architecture Vision** | Markdown | ARC42 template (12 sections) |
| **Decision Log** | Markdown | ADRs and iteration history |
| **Tech Standards** | JSON | Approved global/local standards |
| **Iteration History** | JSON/MD | Draft versions, critique feedback |

---

# PART II: SYSTEM ARCHITECTURE

## 3. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI PRODUCT FACTORY v3.0.12                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Traefik   │    │     n8n     │    │  PostgreSQL │    │    Redis    │  │
│  │   Reverse   │◄───│  Workflow   │◄───│  Database   │    │    Cache    │  │
│  │    Proxy    │    │   Engine    │    │  (x2 DBs)   │    │             │  │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘  │
│         │                  │                  │                  │          │
│  ┌──────┴──────────────────┴──────────────────┴──────────────────┴──────┐  │
│  │                         Docker Network                                │  │
│  └──────┬──────────────────┬──────────────────┬──────────────────┬──────┘  │
│         │                  │                  │                  │          │
│  ┌──────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐  │
│  │   Qdrant    │    │  Graphiti   │    │  SeaweedFS  │    │  Dashboard  │  │
│  │   Vector    │    │  Knowledge  │    │     S3      │    │   React     │  │
│  │     DB      │    │    Graph    │    │   Storage   │    │    App      │  │
│  └─────────────┘    └──────┬──────┘    └─────────────┘    └─────────────┘  │
│                            │                                                 │
│                     ┌──────┴──────┐                                         │
│                     │  FalkorDB   │                                         │
│                     │   (Graph    │                                         │
│                     │   Backend)  │                                         │
│                     └─────────────┘                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Workflow Orchestration Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WORKFLOW EXECUTION FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐           │
│  │   User      │         │  Dashboard  │         │   n8n API   │           │
│  │  Upload     │────────►│  /start-    │────────►│  Webhook    │           │
│  │  Files      │         │  project    │         │  Trigger    │           │
│  └─────────────┘         └─────────────┘         └──────┬──────┘           │
│                                                         │                   │
│                                                         ▼                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                  SMART START (Resume Check)                          │  │
│  │  • Check S3 for existing project_state.json                          │  │
│  │  • If exists: Resume from last checkpoint                            │  │
│  │  • If new: Initialize fresh state                                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      PHASE 0: CONTEXT SCAVENGING                      │  │
│  │  • Scan S3 input files                                                │  │
│  │  • Extract tech standards (Scavenger Agent)                          │  │
│  │  • Present Governance UI → Human approval                            │  │
│  │  • Store approved standards in Graphiti + Qdrant                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     PHASE 1: VISION LOOP                              │  │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐                        │  │
│  │  │Visionary │───►│  Critic  │───►│ Refiner  │◄──────┐               │  │
│  │  │(Claude)  │    │(GPT-4o)  │    │(Claude)  │       │               │  │
│  │  └──────────┘    └────┬─────┘    └──────────┘       │               │  │
│  │                       │                              │               │  │
│  │                  Score < 90? ──────────────────────►│               │  │
│  │                  Score >= 90? → SUCCESS                              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                   PHASE 2: ARCHITECTURE LOOP                          │  │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐       │  │
│  │  │Architect │───►│ Dr. Doom │───►│  Fixer   │───►│ Refiner  │       │  │
│  │  │(Claude)  │    │(GPT-4o)  │    │(Perplexi)│    │(Claude)  │       │  │
│  │  └──────────┘    └──────────┘    └──────────┘    └────┬─────┘       │  │
│  │                                                        │             │  │
│  │                                   Score < 90? ◄────────┘             │  │
│  │                                   Score >= 90? → SUCCESS              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    PHASE 3: FINALIZATION & AUDIT                      │  │
│  │  • Auditor performs final quality gate                               │  │
│  │  • Save final artifacts to S3                                        │  │
│  │  • Update project_state in PostgreSQL                                │  │
│  │  • Generate decision log with ADRs                                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    User Input                  Processing                   Storage          │
│   ───────────                 ───────────                  ─────────         │
│                                                                              │
│  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐        │
│  │  Documents  │──────────►│  Scavenger  │──────────►│  Graphiti   │        │
│  │ (PDF, MD,   │           │   Agent     │           │  (Standards)│        │
│  │  DOCX)      │           └─────────────┘           └─────────────┘        │
│  └──────┬──────┘                  │                                          │
│         │                         │                                          │
│         │                         ▼                                          │
│         │                  ┌─────────────┐           ┌─────────────┐        │
│         └─────────────────►│  AI Agents  │──────────►│   Qdrant    │        │
│                            │  (LLMs)     │           │  (Vectors)  │        │
│                            └──────┬──────┘           └─────────────┘        │
│                                   │                                          │
│  ┌─────────────┐                  │                                          │
│  │ Governance  │◄─────────────────┤                                          │
│  │  Decisions  │                  │                                          │
│  └──────┬──────┘                  │                                          │
│         │                         ▼                                          │
│         │                  ┌─────────────┐           ┌─────────────┐        │
│         └─────────────────►│ Finalization│──────────►│    S3       │        │
│                            │             │           │ (Artifacts) │        │
│                            └──────┬──────┘           └─────────────┘        │
│                                   │                                          │
│                                   ▼                                          │
│                            ┌─────────────┐           ┌─────────────┐        │
│                            │  Dashboard  │──────────►│ PostgreSQL  │        │
│                            │   Update    │           │  (State)    │        │
│                            └─────────────┘           └─────────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  EXTERNAL                                                                    │
│  ──────────                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Traefik (TLS Termination)                        │   │
│  │  • Let's Encrypt SSL certificates                                    │   │
│  │  • HTTPS enforcement                                                 │   │
│  │  • Rate limiting                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  APPLICATION                                                                 │
│  ─────────────                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Better-Auth (Google OAuth)                        │   │
│  │  • Domain restriction (ALLOWED_EMAIL_DOMAINS)                        │   │
│  │  • Session management                                                │   │
│  │  • CSRF protection                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  DATA                                                                        │
│  ──────                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Encryption & Secrets                              │   │
│  │  • API keys: AES-256-GCM encrypted in database                      │   │
│  │  • n8n credentials: Encrypted in n8n database                       │   │
│  │  • Environment variables for runtime secrets                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  NETWORK                                                                     │
│  ─────────                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Docker Network Isolation                          │   │
│  │  • Internal services on private network                              │   │
│  │  • Only Traefik exposed externally                                   │   │
│  │  • Service-to-service communication via DNS                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Complete Tech Stack

### Core Infrastructure

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Workflow Engine** | n8n | v1.82+ | Orchestration, AI agents, webhooks |
| **Database** | PostgreSQL | 18-alpine | Project state, settings, decision logs |
| **Cache** | Redis | 7.4-alpine | Session cache, rate limiting |
| **Reverse Proxy** | Traefik | v3.6.7 | SSL, routing, load balancing |
| **Object Storage** | SeaweedFS | latest | S3-compatible artifact storage |

### AI & Knowledge Services

| Component | Technology | Model/Version | Purpose |
|-----------|------------|---------------|---------|
| **LLM Provider** | OpenRouter | - | API gateway for Claude/GPT-4o |
| **Primary Model** | Claude Sonnet 3.5 | anthropic/claude-sonnet-3.5 | Creative agents (Visionary, Architect, Refiner) |
| **Critic Model** | GPT-4o | openai/gpt-4o | Analytical agents (Critic, Dr. Doom) |
| **Research Model** | Perplexity Sonar | perplexity/sonar-pro | Fact-checking, risk research |
| **Embeddings** | OpenAI | text-embedding-3-small | Vector generation for Qdrant |
| **Agent Memory** | Zep v3 | - | Conversation context |
| **Knowledge Graph** | Graphiti | standalone | Tech standards, decisions |
| **Graph Backend** | FalkorDB | latest | Redis-based graph storage |
| **Vector Database** | Qdrant | v1.16 | Semantic document search |

### Dashboard Frontend

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Framework** | TanStack Start | 1.150.0 | Full-stack React with SSR |
| **Router** | TanStack Router | 1.150.0 | File-based routing |
| **UI Framework** | React | 19.2.3 | UI library |
| **UI Components** | Shadcn/ui | new-york | Component library (20+ components) |
| **Primitives** | Radix UI | various | Accessible primitives |
| **Authentication** | Better-Auth | 1.2.8 | Google OAuth 2.0 |
| **Data Fetching** | TanStack Query | 5.67.2 | Caching, mutations |
| **Forms** | React Hook Form | 7.71.1 | Form state, validation |
| **Validation** | Zod | 3.24.2 | Schema validation |
| **Styling** | Tailwind CSS | 4.1.18 | Utility-first CSS |
| **Notifications** | Sonner | 2.0.7 | Toast notifications |
| **Icons** | Lucide React | 0.511.0 | Icon library |
| **Markdown** | react-markdown | 10.1.0 | Markdown rendering |
| **Build Tool** | Vite | 7.1.0 | Development & bundling |
| **TypeScript** | TypeScript | 5.7.3 | Static type analysis |

### Testing & DevOps

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Test Runner** | Vitest | 3.1.4 | Unit/integration testing |
| **E2E Testing** | Playwright | 1.57.0 | End-to-end tests |
| **Testing Library** | @testing-library/react | 16.2.0 | React component testing |
| **Mocking** | MSW | 2.12.7 | API mocking |
| **Linting** | ESLint | 9.21.0 | Code quality |
| **Git Hooks** | Husky | 9 | Pre-commit automation |
| **CI/CD** | GitHub Actions | - | Automated pipeline |
| **Hosting** | Dokploy | - | Self-hosted PaaS |
| **Containerization** | Docker Compose | - | Multi-service orchestration |

### Environment Variables Summary

See [Appendix A](#appendix-a-environment-variables) for complete reference.

```bash
# Core Infrastructure
DATABASE_URL=postgresql://user:pass@postgres:5432/dashboard
N8N_ENCRYPTION_KEY=<32_char_key>

# AI Services
OPENROUTER_API_KEY=<key>
OPENAI_API_KEY=<key>

# Knowledge Services
GRAPHITI_URL=http://graphiti:8000
QDRANT_URL=http://qdrant:6333

# S3 Storage
S3_ENDPOINT=http://seaweedfs:8333
S3_BUCKET=product-factory-artifacts

# Dashboard
AUTH_SECRET=<32_char_secret>
GOOGLE_CLIENT_ID=<oauth_id>
GOOGLE_CLIENT_SECRET=<oauth_secret>

# Workflow Configuration
FACTORY_MAX_ITERATIONS=5
FACTORY_SCORE_THRESHOLD=90
```

---

# PART III: AI AGENT SYSTEM

## 5. AI Agent System

### Agent Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            AI AGENT DREAM TEAM                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   PHASE 0                         PHASE 1                    PHASE 2        │
│  ┌──────────┐                   ┌──────────┐               ┌──────────┐    │
│  │SCAVENGER │                   │VISIONARY │               │ARCHITECT │    │
│  │ Claude   │                   │ Claude   │               │ Claude   │    │
│  │ T=0.2    │                   │ T=0.7    │               │ T=0.5    │    │
│  └────┬─────┘                   └────┬─────┘               └────┬─────┘    │
│       │                              │                          │           │
│       ▼                              ▼                          ▼           │
│  Extract tech                  Create Vision              Design ARC42      │
│  standards                     drafts                     architecture      │
│                                      │                          │           │
│                                      ▼                          ▼           │
│                                ┌──────────┐               ┌──────────┐     │
│                                │  CRITIC  │               │ DR. DOOM │     │
│                                │  GPT-4o  │               │  GPT-4o  │     │
│                                │  T=0.3   │               │  T=0.2   │     │
│                                └────┬─────┘               └────┬─────┘     │
│                                     │                          │            │
│                                     ▼                          ▼            │
│                                Evaluate &                 Pre-mortem        │
│                                score + fact-check         risk analysis     │
│                                     │                          │            │
│                                     │                          ▼            │
│                                     │                    ┌──────────┐       │
│                                     │                    │  FIXER   │       │
│                                     │                    │Perplexity│       │
│                                     │                    │  T=0.4   │       │
│                                     │                    └────┬─────┘       │
│                                     │                         │             │
│                                     │                    Research           │
│                                     │                    mitigations        │
│                                     ▼                         ▼             │
│                                ┌──────────┐               ┌──────────┐     │
│                                │ REFINER  │               │ REFINER  │     │
│                                │ Claude   │               │ Claude   │     │
│                                │ T=0.5    │               │ T=0.5    │     │
│                                └──────────┘               └──────────┘     │
│                                                                              │
│   FINALIZATION                                                               │
│  ┌──────────┐                                                               │
│  │ AUDITOR  │  Final quality gate                                           │
│  │ Claude   │  with tech stack verification                                 │
│  │ T=0.2    │                                                               │
│  └──────────┘                                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Agent Configuration Details

| Agent | Model | Temp | Memory | Tools | Purpose |
|-------|-------|------|--------|-------|---------|
| **Scavenger** | Claude Sonnet 3.5 | 0.2 | Simple (5 msgs) | Graphiti Search | Extract tech standards from documents |
| **Visionary** | Claude Sonnet 3.5 | 0.7 | Zep Window (8 msgs) | Graphiti Context | Create Product Vision drafts with JTBD |
| **Critic** | GPT-4o | 0.3 | Zep Window (6 msgs) | Perplexity | Evaluate, fact-check, and score with citations |
| **Refiner** (Vision) | Claude Sonnet 3.5 | 0.5 | Zep Window (10 msgs) | Graphiti | Improve Vision based on feedback |
| **Architect** | Claude Sonnet 3.5 | 0.5 | Zep Window (10 msgs) | Graphiti | Design ARC42 architecture (MUST use approved stack) |
| **Dr. Doom** | GPT-4o | 0.2 | - | - | Pre-mortem risk analysis, failure scenarios |
| **Fixer** | Perplexity Sonar | 0.4 | - | - | Research risk mitigations and best practices |
| **Refiner** (Arch) | Claude Sonnet 3.5 | 0.5 | Zep Window (10 msgs) | Graphiti | Apply architecture fixes from Fixer research |
| **Auditor** | Claude Sonnet 3.5 | 0.2 | Simple | Tech Stack Query | Final quality gate and tech stack verification |

### Scoring Criteria

**Vision Loop (0-100 scale):**

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Problem Clarity | 15% | Is the problem clearly defined with evidence? |
| Value Proposition | 25% | Is it compelling and differentiated? |
| Persona Depth | 15% | Are personas specific with Jobs-to-be-Done? |
| Differentiation | 20% | Is competitive advantage clear? |
| Metrics Quality | 10% | Are metrics SMART (Specific, Measurable, Achievable, Relevant, Time-bound)? |
| Market Validation | 15% | Is there evidence of market need? |

**Architecture Loop (0-100 scale):**

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Technical Completeness | 25% | All ARC42 sections covered adequately? |
| Tech Stack Compliance | 20% | Uses ONLY approved technologies? |
| Risk Mitigation | 20% | Are identified risks addressed with mitigations? |
| Scalability | 15% | Can the architecture grow with demand? |
| Security | 20% | Are security concerns properly addressed? |

### Memory Configuration

| Agent | Memory Type | Window Size | Session Key |
|-------|-------------|-------------|-------------|
| Scavenger | Simple | 5 messages | `{project_id}_scavenger` |
| Visionary | Zep Window | 8 messages | `{project_id}_vision` |
| Critic | Zep Window | 6 messages | `{project_id}_critic` |
| Refiner | Zep Window | 10 messages | `{project_id}_refiner` |
| Architect | Zep Window | 10 messages | `{project_id}_architect` |
| Auditor | Simple | - | `{project_id}_auditor` |

### Tool Integration

| Tool | Provider | Used By | Purpose |
|------|----------|---------|---------|
| **Graphiti Search** | Graphiti MCP | Scavenger, Visionary, Architect, Refiner | Query knowledge graph for context |
| **Graphiti Add** | Graphiti MCP | Scavenger | Store extracted tech standards |
| **Qdrant Search** | HTTP API | Agents | Semantic document search |
| **Perplexity Research** | Perplexity API | Critic, Fixer | Fact-checking and research |

### Perplexity Research Types

| Type | Description | Used By |
|------|-------------|---------|
| `fact_check` | Verify claims with citations | Critic |
| `market_research` | Market trends, key players | Critic |
| `best_practices` | Industry best practices | Fixer |
| `risk_mitigation` | Mitigation strategies and case studies | Fixer |
| `competitive_analysis` | Competitor intelligence | Critic |

### Prompt Guidelines

| Principle | Description |
|-----------|-------------|
| **Role Definition** | Each agent has a clear persona and expertise area |
| **Task Specificity** | Prompts include specific deliverables and format requirements |
| **Context Injection** | Previous iteration feedback injected into refinement prompts |
| **Constraint Enforcement** | Architect MUST use approved tech stack (hard constraint) |
| **Scoring Rubric** | Critic uses explicit scoring dimensions and weights |
| **Output Format** | JSON for machine processing, Markdown for human reading |

---

# PART IV: WORKFLOW SYSTEM

## 6. Workflow Phases

### Phase 0: Context Scavenging (2-5 minutes)

**Purpose:** Extract and govern technical standards from source documents

**Workflow:** `ai-product-factory-scavenging-subworkflow.json`

**Process:**
1. Scan documents from S3 `input/` folder
2. Scavenger Agent extracts technical patterns (languages, frameworks, databases, tools)
3. Prepare governance payload with detected standards
4. Present GovernanceWidget to user via dashboard
5. User approves/skips/selects alternatives for each item
6. Store approved standards in Graphiti (with global/local scope)
7. Generate embeddings and store in Qdrant

**Governance Payload Example:**
```json
{
  "type": "governance_request",
  "scavenging_id": "sc_abc123",
  "project_id": "myproject",
  "detected_stack": [
    {
      "id": "tech_001",
      "name": "PostgreSQL",
      "type": "technology",
      "category": "database",
      "confidence": 0.95,
      "source": "architecture.md",
      "alternatives": [
        { "name": "MySQL", "description": "Alternative RDBMS" },
        { "name": "CockroachDB", "description": "Distributed SQL" }
      ]
    }
  ]
}
```

### Phase 1: Vision Loop (5-15 minutes)

**Purpose:** Generate and refine Product Vision document

**Workflow:** `ai-product-factory-vision-loop-subworkflow.json`

**Process:**
1. Visionary creates initial draft using approved context from Graphiti
2. Critic evaluates with Perplexity fact-checking
3. Score calculated based on rubric (see Scoring Criteria)
4. If score < 90: Refiner improves based on Critic feedback
5. Loop until score >= 90 or max iterations (5)
6. Circuit breaker: If max iterations reached, proceed with best version

**Vision Document Structure:**
- Executive Summary
- Problem Statement
- Target Personas & Jobs-to-be-Done (JTBD)
- Value Proposition
- Competitive Differentiation
- Success Metrics (SMART)
- Market Validation Evidence

### Phase 2: Architecture Loop (5-15 minutes)

**Purpose:** Generate ARC42 architecture document with risk validation

**Workflow:** `ai-product-factory-architecture-loop-subworkflow.json`

**Process:**
1. Architect creates ARC42 draft (MUST use approved tech stack only)
2. Dr. Doom performs pre-mortem analysis (failure scenarios)
3. If high-severity risks identified: Fixer researches mitigations via Perplexity
4. Refiner applies fixes and addresses Dr. Doom's concerns
5. Loop until score >= 90 or max iterations (5)

**ARC42 Document Structure (12 Sections):**
1. Introduction and Goals
2. Constraints
3. Context and Scope
4. Solution Strategy
5. Building Block View
6. Runtime View
7. Deployment View
8. Cross-cutting Concepts
9. Architecture Decisions (ADRs)
10. Quality Requirements
11. Risks and Technical Debt
12. Glossary

### Phase 3: Finalization & Audit

**Purpose:** Save artifacts, perform final quality check, and complete project

**Workflows:** Main Orchestrator + Decision Logger

**Process:**
1. Auditor performs final quality gate
2. Verify all approved technologies are used
3. Save `ProductVision_FINAL.md` to S3
4. Save `Architecture_FINAL.md` to S3
5. Generate `decision_log.md` with all ADRs
6. Package iteration history via Paper Trail Packager
7. Update `project_state` in PostgreSQL
8. Set `completed_at` timestamp

### Smart Start & Resumability

**Purpose:** Enable workflow resumption after interruption

**State Persistence:**
- State saved to S3 after each phase checkpoint
- PostgreSQL maintains latest known state
- Session ID tracks iteration context

**Resume Logic:**
```
Smart Start Decision Tree:
├── Check S3 for project_state.json
│   ├── NOT FOUND → Initialize fresh state → Start Phase 0
│   └── FOUND → Parse state
│       ├── current_phase = 0, status = pending → Resume Phase 0
│       ├── current_phase = 0, status = completed → Start Phase 1
│       ├── current_phase = 1, status = in_progress → Resume Vision Loop
│       ├── current_phase = 1, status = completed → Start Phase 2
│       ├── current_phase = 2, status = in_progress → Resume Architecture Loop
│       └── current_phase = 3 → Project Complete
```

### Circuit Breaker Logic

| Condition | Action |
|-----------|--------|
| Score >= 90 | Success, proceed to next phase |
| Iteration >= MAX_ITERATIONS (5) | Accept best version, proceed with warning |
| Agent timeout | Retry up to 3 times, then fail |
| External API error | Retry with backoff, then fail |
| User governance timeout (1 hour) | Pause workflow, resume on input |

---

## 7. Workflow Files Reference

### Workflow Files (12 Total)

| Workflow File | Name | Purpose | Triggers |
|---------------|------|---------|----------|
| `ai-product-factory-main-workflow.json` | AI Product Factory - Main Orchestrator | Main orchestrator with Smart Start | Webhook |
| `ai-product-factory-api-workflow.json` | AI Product Factory - API | Dashboard webhooks | Webhooks (4) |
| `ai-product-factory-scavenging-subworkflow.json` | AI Product Factory - Scavenging | Phase 0: Context extraction | Execute Workflow |
| `ai-product-factory-vision-loop-subworkflow.json` | AI Product Factory - Vision Loop | Phase 1: Product Vision | Execute Workflow |
| `ai-product-factory-architecture-loop-subworkflow.json` | AI Product Factory - Architecture Loop | Phase 2: ARC42 Architecture | Execute Workflow |
| `ai-product-factory-perplexity-research-subworkflow.json` | AI Product Factory - Perplexity Research | Research tool | Execute Workflow |
| `ai-product-factory-decision-logger-subworkflow.json` | AI Product Factory - Decision Logger | Paper trail logging | Execute Workflow |
| `ai-product-factory-s3-subworkflow.json` | AI Product Factory - S3 Operations | S3 read/write | Execute Workflow |
| `titan-adversarial-loop-subworkflow.json` | Titan - Adversarial Agent Loop | Generic adversarial loop | Execute Workflow |
| `titan-graphiti-subworkflow.json` | Titan - Graphiti Operations | Knowledge graph ops | Execute Workflow |
| `titan-qdrant-subworkflow.json` | Titan - Qdrant Operations | Vector DB ops | Execute Workflow |
| `titan-paper-trail-packager-subworkflow.json` | Titan - Paper Trail Packager | Iteration history | Execute Workflow |

### Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          WORKFLOW DEPENDENCY GRAPH                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                           ┌──────────────────┐                              │
│                           │ Main Orchestrator│                              │
│                           └────────┬─────────┘                              │
│                                    │                                         │
│           ┌────────────────────────┼────────────────────────┐               │
│           │                        │                        │               │
│           ▼                        ▼                        ▼               │
│   ┌───────────────┐       ┌───────────────┐       ┌───────────────┐        │
│   │  Scavenging   │       │  Vision Loop  │       │ Architecture  │        │
│   │  Subworkflow  │       │  Subworkflow  │       │    Loop       │        │
│   └───────┬───────┘       └───────┬───────┘       └───────┬───────┘        │
│           │                       │                       │                 │
│           │                       │                       │                 │
│   ┌───────┴───────────────────────┴───────────────────────┴───────┐        │
│   │                                                               │        │
│   ▼                                                               ▼        │
│   ┌───────────────┐                                       ┌───────────────┐│
│   │    Graphiti   │◄──────────────────────────────────────│   Perplexity  ││
│   │   Operations  │                                       │   Research    ││
│   └───────────────┘                                       └───────────────┘│
│           │                                                                 │
│           │                                                                 │
│   ┌───────┴───────┐                                                        │
│   ▼               ▼                                                        │
│   ┌───────────────┐       ┌───────────────┐       ┌───────────────┐        │
│   │    Qdrant     │       │    S3 Ops     │       │ Decision      │        │
│   │   Operations  │       │               │       │ Logger        │        │
│   └───────────────┘       └───────────────┘       └───────┬───────┘        │
│                                                           │                 │
│                                                           ▼                 │
│                                                   ┌───────────────┐        │
│   ┌───────────────┐                               │ Paper Trail   │        │
│   │  API Workflow │ (Standalone - webhook entry)  │ Packager      │        │
│   └───────────────┘                               └───────────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Two-Phase Import System

**Phase 1: Create All Workflows**
1. Parse all workflow JSON files
2. Calculate checksums for version tracking
3. Analyze dependencies between workflows
4. Validate node compatibility with n8n instance
5. Check for circular dependencies
6. Create ALL workflows in n8n (inactive state)
7. If any creation fails: Rollback all created workflows

**Phase 2: Activate All Workflows**
1. Sort workflows by dependency order (leaves first)
2. Activate each workflow with retry logic (3 attempts)
3. Verify each activation with "publish" check
4. Wait 2 seconds between activations for n8n internal sync
5. Update registry with n8n workflow IDs and status

**Rollback on Phase 1 Failure:**
```
If creation fails for workflow N:
  1. Mark workflow N as 'failed' in registry
  2. Delete workflows 1 to N-1 from n8n
  3. Reset their registry status to 'pending'
  4. Return error with details
```

### Required Credentials

| Credential Name | Type | Purpose |
|-----------------|------|---------|
| `OpenRouter API` | OpenRouter | All LLM agents |
| `OpenAI API Header` | HTTP Header Auth | Embeddings for Qdrant |
| `Zep Api account` | Zep | Agent memory |

**Credential Creation Notes:**
- Names must match exactly (case-sensitive)
- OpenRouter API credential needs API key from openrouter.ai
- OpenAI API Header: Name=`Authorization`, Value=`Bearer YOUR_KEY`
- Zep: API key and URL from getzep.com

---

# PART V: DASHBOARD APPLICATION

## 8. Dashboard Application

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Framework** | TanStack Start 1.150.0 | SSR React with file-based routing |
| **Router** | TanStack Router 1.150.0 | Type-safe routing |
| **Auth** | Better-Auth 1.2.8 | Google OAuth 2.0 |
| **UI** | Shadcn/ui + Radix UI | Component library |
| **Data** | TanStack Query 5.67.2 | Fetching and caching |
| **Forms** | React Hook Form + Zod | Validation |
| **Toast** | Sonner 2.0.7 | Notifications |
| **Styling** | Tailwind CSS 4.1.18 | Utility-first CSS |

### All Key Features

| Feature | Component(s) | Description |
|---------|--------------|-------------|
| **Project Grid** | `ProjectList`, `ProjectCard` | Overview of all projects with status badges |
| **Project Detail** | `$projectId/index.tsx` | Tabbed view (Artifacts, Chat, History, ADRs) |
| **Artifacts Tab** | `ArtifactList`, `ArtifactViewer` | View/download generated documents |
| **ADR Viewer** | `ADRViewer`, `ADRDetail`, `ADRListItem` | Split-pane ADR browser |
| **Chat Interface** | `ChatWindow` | Workflow interaction and status updates |
| **History Timeline** | `HistoryTimeline` | Iteration history with scores |
| **Governance Widget** | `GovernanceWidget` | Tech stack approval interface |
| **File Upload** | `FileUpload` | Drag-and-drop with presigned URLs |
| **Setup Wizard** | 6 step components | n8n configuration wizard |
| **State Management** | `StateManagement` | Sync, fix-stuck, reset operations |
| **Workflow Settings** | `settings/workflows.tsx` | Import status, dependency view |
| **n8n Settings** | `settings/n8n.tsx` | API configuration |
| **User Menu** | `UserMenu` | Profile, logout |

### Route Structure (31+ Routes)

```
/                             → Redirect to /projects
├── /login                    → Login page
├── /projects                 → Project list (auth required)
│   ├── /projects/new         → Create new project
│   └── /projects/$projectId  → Project detail (tabs)
├── /setup                    → Setup wizard redirect
│   ├── /setup/welcome        → Step 1: Prerequisites
│   ├── /setup/connect        → Step 2: n8n connection
│   ├── /setup/import         → Step 3: Workflow import
│   ├── /setup/webhooks       → Step 4: Webhook detection
│   ├── /setup/verify         → Step 5: Verification
│   └── /setup/complete       → Step 6: Success
├── /settings                 → Settings redirect
│   ├── /settings/n8n         → n8n configuration
│   └── /settings/workflows   → Workflow management
└── /api                      → API routes (21 endpoints)
    ├── /api/health
    ├── /api/auth/$
    ├── /api/start-project
    ├── /api/presigned-url
    ├── /api/governance
    ├── /api/workflows/*
    ├── /api/settings/*
    └── /api/setup/*
```

### Component Library (44+ Components)

**Layout:**
- `Header` - Main navigation with user menu
- `SetupWizardLayout` - Wizard chrome

**Projects:**
- `ProjectList` - Project grid with empty state
- `ProjectCard` - Individual project card

**Artifacts:**
- `ArtifactList` - List of generated documents
- `ArtifactViewer` - Markdown viewer

**ADR:**
- `ADRViewer` - Split-pane ADR browser
- `ADRDetail` - Single ADR view
- `ADRListItem` - ADR list item

**Governance:**
- `GovernanceWidget` - Tech stack approval

**Upload:**
- `FileUpload` - Drag-and-drop uploader

**Chat:**
- `ChatWindow` - Real-time chat interface

**History:**
- `HistoryTimeline` - Iteration history

**Setup Wizard (6 steps):**
- `SetupStepWelcome`
- `SetupStepConnect`
- `SetupStepImport` (with SSE streaming, dependency viz)
- `SetupStepWebhooks`
- `SetupStepVerify`
- `SetupStepComplete`

**Settings:**
- `StateManagement` - Sync, reset operations

**Auth:**
- `UserMenu` - Avatar dropdown

**UI Primitives (Shadcn - 20+):**
- `button`, `card`, `input`, `label`, `textarea`
- `select`, `checkbox`, `radio-group`, `switch`
- `tabs`, `dialog`, `alert-dialog`, `dropdown-menu`
- `tooltip`, `badge`, `progress`, `skeleton`
- `separator`, `scroll-area`, `avatar`, `collapsible`
- `alert`, `sonner` (toast), `empty-state`

**Error Handling:**
- `RouteErrorBoundary` - Route-level error catching
- `RouteLoadingSpinner` - Loading states

### Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   /login    │────►│   Google    │────►│  Callback   │
│             │     │   OAuth     │     │  /api/auth  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Domain     │
                                        │  Validation │
                                        │(ALLOWED_    │
                                        │ EMAIL_      │
                                        │ DOMAINS)    │
                                        └──────┬──────┘
                                               │
                          ┌────────────────────┴────────────────────┐
                          │                                         │
                          ▼                                         ▼
                   ┌─────────────┐                          ┌─────────────┐
                   │  Allowed    │                          │  Rejected   │
                   │  → /projects│                          │  → /login   │
                   └─────────────┘                          │  + error    │
                                                            └─────────────┘
```

---

## 9. API Reference

### Dashboard REST API (21 Endpoints)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | No | Health check with DB connectivity |
| `/api/auth/$` | GET/POST | - | Better-Auth routes (login, callback, session) |
| `/api/start-project` | POST | Yes | Create and start project workflow |
| `/api/presigned-url` | POST | Yes | Get S3 presigned URL for upload |
| `/api/governance` | POST | Yes | Submit governance decisions |
| `/api/setup/status` | GET | No | Check setup completion status |
| `/api/setup/n8n/test-connection` | POST | Yes | Test n8n API connectivity |
| `/api/setup/n8n/save-config` | POST | Yes | Save n8n URL and API key |
| `/api/setup/workflows/list` | GET | Yes | List bundled workflows |
| `/api/setup/workflows/import` | POST | Yes | Import workflows (two-phase) |
| `/api/setup/workflows/verify` | GET | Yes | Verify workflow status |
| `/api/setup/complete` | POST | Yes | Mark setup as complete |
| `/api/setup/reset` | POST | Yes | Reset operations (soft/full/clear_config/factory) |
| `/api/settings/n8n` | GET | Yes | Get n8n settings |
| `/api/settings/n8n` | PUT | Yes | Update n8n settings |
| `/api/workflows/sync` | POST | Yes | Sync registry with n8n state |
| `/api/workflows/fix-stuck` | POST | Yes | Reset stuck imports to pending |
| `/api/workflows/export` | POST | Yes | Export workflow as sanitized JSON |
| `/api/workflows/export/commit` | POST | Yes | Export workflow and save to git |
| `/api/workflows/dependencies` | GET | Yes | Get workflow dependency graph |
| `/api/workflows/validate` | POST | Yes | Pre-import validation |
| `/api/workflows/import-stream` | POST | Yes | SSE streaming import progress |

### n8n Webhooks (4 Endpoints)

| Webhook | Method | Description |
|---------|--------|-------------|
| `/webhook/start-project` | POST | Start new project from dashboard |
| `/webhook/governance-batch` | POST | Receive governance decisions |
| `/webhook/ai-product-factory-chat` | POST | Chat messages |
| `/webhook/project-status` | GET | Get project status |

### Request/Response Schemas

**POST /api/start-project**
```json
// Request
{
  "projectName": "MyApp",
  "projectId": "myapp-123",
  "description": "A mobile app for...",
  "inputFiles": [
    { "name": "requirements.pdf", "s3Key": "projects/myapp-123/input/requirements.pdf" }
  ]
}

// Response
{
  "success": true,
  "projectId": "myapp-123",
  "sessionId": "sess_abc123",
  "n8nExecutionId": "exec_xyz789"
}
```

**POST /api/governance**
```json
// Request
{
  "projectId": "myapp-123",
  "scavengingId": "sc_abc123",
  "decisions": [
    { "id": "tech_001", "action": "approve", "scope": "local" },
    { "id": "tech_002", "action": "skip" },
    { "id": "tech_003", "action": "alternative", "alternativeName": "MySQL" }
  ]
}

// Response
{
  "success": true,
  "approved": 2,
  "skipped": 1
}
```

**POST /api/setup/reset**
```json
// Request
{
  "mode": "soft" | "full" | "clear_config" | "factory",
  "confirmation": "RESET",
  "preserveN8nConfig": false
}

// Response
{
  "success": true,
  "mode": "soft",
  "deletedFromN8n": 0,
  "clearedFromRegistry": 8,
  "settingsReset": false,
  "errors": [],
  "warnings": [],
  "canUndo": true,
  "undoToken": "undo_xyz789"
}
```

### Reset Modes

| Mode | Registry | n8n Workflows | n8n Config | Setup Wizard |
|------|----------|---------------|------------|--------------|
| `soft` | Clear | Keep | Keep | Keep |
| `full` | Clear | Delete | Keep | Keep |
| `clear_config` | Keep | Keep | Clear | Keep |
| `factory` | Clear | Delete | Clear | Reset |

### Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_REQUEST` | Missing or invalid parameters |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 403 | `FORBIDDEN` | Not authorized for this action |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource already exists |
| 500 | `INTERNAL_ERROR` | Server error |
| 503 | `SERVICE_UNAVAILABLE` | n8n or other service unavailable |

---

# PART VI: DATA ARCHITECTURE

## 10. Data Architecture

### PostgreSQL Schema (8 Tables)

The dashboard uses a separate PostgreSQL database (`dashboard`) from n8n's database (`n8n`).

**Tables:**

| Table | Category | Purpose |
|-------|----------|---------|
| `user` | Better-Auth | User information |
| `session` | Better-Auth | Authentication sessions |
| `account` | Better-Auth | OAuth provider links |
| `verification` | Better-Auth | Email verification tokens |
| `app_settings` | Setup Wizard | Key-value settings store |
| `workflow_registry` | Setup Wizard | Workflow import tracking |
| `project_state` | Project | Workflow progress tracking |
| `decision_log_entries` | Project | ADR and iteration logs |
| `chat_messages` | Project | Chat history |

### Database Functions (4)

| Function | Purpose |
|----------|---------|
| `get_setting(key)` | Retrieve setting from app_settings |
| `set_setting(key, value, ...)` | Upsert setting to app_settings |
| `is_n8n_configured()` | Check if n8n API is configured |
| `is_setup_complete()` | Check if setup wizard completed |

### Database Views (4)

| View | Purpose |
|------|---------|
| `workflow_import_summary` | Import status counts |
| `setup_status` | Current setup state |
| `project_summary` | Project list with stats |
| `recent_activity` | Latest decision log entries |

### S3 Storage Structure

```
product-factory-artifacts/
└── projects/{project_id}/
    ├── input/                      # User-uploaded documents
    │   ├── requirements.pdf
    │   ├── architecture.md
    │   └── tech-standards.docx
    ├── state/
    │   └── project_state.json      # Resumable state (Smart Start)
    ├── artifacts/
    │   ├── decision_log.md         # Complete paper trail
    │   ├── ProductVision_FINAL.md
    │   └── Architecture_FINAL.md
    ├── iterations/
    │   └── {session_timestamp}/
    │       ├── Vision_v1.md
    │       ├── Vision_v1_critique.json
    │       ├── Vision_v2.md
    │       └── Architecture_v2_FINAL.md
    └── standards/
        ├── global_standards.json   # Approved for all projects
        └── local_standards.json    # Project-specific
```

### Knowledge Graph (Graphiti)

**Purpose:** Store and query technical standards and decisions

| Group ID | Content | Scope |
|----------|---------|-------|
| `global_standards` | Approved technologies for all projects | Global |
| `{project_id}` | Project-specific standards and context | Per-project |
| `{project_id}_decisions` | Architecture decisions and ADRs | Per-project |

**Node Types:**
- `Technology` - Programming languages, frameworks, databases
- `Standard` - Technical standards and conventions
- `Decision` - Architecture Decision Records
- `Constraint` - Project constraints

### Vector Database (Qdrant)

**Purpose:** Semantic search over document chunks

| Collection | Content | Embedding Model |
|------------|---------|-----------------|
| `titan_documents` | Document chunks | text-embedding-3-small |

**Payload Fields:**
```json
{
  "project_id": "myapp-123",
  "scope": "local",
  "type": "document",
  "source": "requirements.pdf",
  "content": "...",
  "metadata": {}
}
```

### Migration System

**Automatic Migrations:**
- Migrations run automatically via init container pattern
- `Dockerfile.migrate` creates lightweight migration container
- `db-migrate.mjs` script handles idempotent table creation
- Uses `CREATE TABLE IF NOT EXISTS` for safety
- Validates database before running (detects wrong database)

**Auto-Recovery on Startup:**
- `startup-recovery.mjs` resets stuck imports
- Workflows in "importing"/"updating" status reset to "pending"
- Prevents permanent stuck state after container restart

See [Appendix B](#appendix-b-database-schema-ddl) for complete DDL.

---

# PART VII: INFRASTRUCTURE & DEPLOYMENT

## 11. Infrastructure & Deployment

### Docker Services (9 Total)

| Service | Image | Port(s) | Health Check | Start Period |
|---------|-------|---------|--------------|--------------|
| **traefik** | traefik:v3.6.7 | 80, 443, 8080 | wget /ping | 10s |
| **n8n** | n8nio/n8n:next | 5678 | wget /healthz | 30s |
| **postgres** | postgres:18-alpine | 5432 | pg_isready | 30s |
| **redis** | redis:7.4-alpine | 6379 | redis-cli ping | 5s |
| **qdrant** | qdrant/qdrant:v1.16 | 6333 | bash TCP check | 10s |
| **falkordb** | falkordb/falkordb:latest | 6379 | redis-cli ping | 10s |
| **graphiti** | zepai/knowledge-graph-mcp:standalone | 8000 | curl /health | 90s |
| **seaweedfs** | chrislusf/seaweedfs:latest | 8333, 9333 | wget /cluster/status | 30s |
| **dashboard** | Built from ./frontend | 3000 | wget /api/health | 30s |

### Docker Compose Files (4)

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Production deployment |
| `docker-compose.test.yml` | Test environment |
| `docker-compose.local-prod.yml` | Production parity testing |
| `docker-compose.override.yml` | Local development overrides |

### Health Check Configurations

```yaml
# n8n
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://127.0.0.1:5678/healthz"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 30s

# PostgreSQL
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s

# Redis
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 5s

# Qdrant (no curl/wget available)
healthcheck:
  test: ["CMD", "bash", "-c", "(echo > /dev/tcp/localhost/6333) 2>/dev/null"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 10s

# Graphiti
healthcheck:
  test: ["CMD", "curl", "-sf", "http://127.0.0.1:8000/health"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 90s

# SeaweedFS (use master port 9333, not S3 port 8333)
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://127.0.0.1:9333/cluster/status"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 30s
```

### Volume Management

| Volume | Service | Purpose |
|--------|---------|---------|
| `n8n_data` | n8n | Workflow data, credentials |
| `postgres_data` | postgres | Database files |
| `redis_data` | redis | Cache persistence |
| `qdrant_storage` | qdrant | Vector storage |
| `falkordb_data` | falkordb | Graph storage |
| `seaweedfs_data` | seaweedfs | S3 object storage |

### Network Configuration

```yaml
networks:
  traefik-public:
    external: true  # Shared across projects
  internal:
    driver: bridge  # Service-to-service communication
```

### Traefik Labels Example

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.n8n.rule=Host(`n8n.example.com`)"
  - "traefik.http.routers.n8n.entrypoints=websecure"
  - "traefik.http.routers.n8n.tls.certresolver=letsencrypt"
  - "traefik.http.services.n8n.loadbalancer.server.port=5678"
```

---

## 12. CI/CD Pipeline

### GitHub Actions (8 Jobs)

| Job | Trigger | Dependencies | Purpose |
|-----|---------|--------------|---------|
| `validate` | push, PR | - | Lint + typecheck |
| `validate-workflows` | push, PR | - | Workflow JSON validation (94 tests) |
| `frontend-tests` | push, PR | - | Frontend unit tests |
| `production-parity` | PR, manual | validate, validate-workflows, frontend-tests | Full integration tests |
| `sync-workflows` | push only | validate, validate-workflows, frontend-tests | Push workflows to n8n |
| `notify-deploy` | push only | validate, sync-workflows | Trigger Dokploy |
| `health-check` | push only | notify-deploy | Verify deployment |
| `verify-workflows` | push only | health-check | Check workflow availability |

### Pre-commit Hooks (Husky v9)

| Files Changed | Hook | Command |
|---------------|------|---------|
| `workflows/*.json` | Workflow validation | `npm run test:workflows` |
| `frontend/**/*.{ts,tsx}` | TypeScript check | `npm run typecheck` |

**Configuration:** `.husky/pre-commit`
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Check for workflow changes
if git diff --cached --name-only | grep -q "^workflows/.*\.json$"; then
  npm run test:workflows
fi

# Check for frontend changes
if git diff --cached --name-only | grep -q "^frontend/.*\\.tsx\\?$"; then
  cd frontend && npm run typecheck
fi
```

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `N8N_API_URL` | n8n instance URL (https://n8n.example.com) |
| `N8N_API_KEY` | n8n API key |
| `DOKPLOY_WEBHOOK_URL` | Dokploy deploy webhook |
| `DASHBOARD_URL` | Dashboard URL for health checks |

### Deployment Procedures

**Standard Deployment (git push to main):**
1. Push triggers GitHub Actions
2. Validate → Test → Sync Workflows
3. Notify Dokploy webhook
4. Dokploy pulls latest code, rebuilds
5. Health check verifies services

**Manual Workflow Sync:**
```bash
# From local machine
node scripts/sync-workflows.js --dry-run  # Preview
node scripts/sync-workflows.js            # Execute
```

**Manual Trigger:**
```yaml
workflow_dispatch:
  inputs:
    sync_only: boolean     # Skip deploy
    dry_run: boolean       # Workflow sync dry-run
    run_e2e: boolean       # Include E2E tests
```

### Rollback Strategies

| Scenario | Strategy |
|----------|----------|
| Dashboard deployment failed | Dokploy automatic rollback |
| Workflow sync corrupted | Use `/api/setup/reset` with mode=soft, re-import |
| Database migration failed | Restore from backup, fix migration |
| Complete failure | Factory reset via Settings → State Management |

---

# PART VIII: TESTING STRATEGY

## 13. Testing Strategy

### TDD Approach

| Phase | Focus | Tools |
|-------|-------|-------|
| Unit | Individual functions, components | Vitest, React Testing Library |
| Integration | API routes, DB operations | Vitest, MSW |
| Workflow | JSON structure, n8n compatibility | Custom validators |
| E2E | Full user flows | Playwright |
| Production Parity | Real Docker environment | docker-compose.local-prod.yml |

### Test Categories & Counts

| Category | Tests | Description |
|----------|-------|-------------|
| **Workflow Validation** | 94 | JSON structure, node validation |
| **Frontend Unit** | 50+ | Component rendering, hooks |
| **Backend Integration** | 79 | API routes, DB operations |
| **E2E** | 15+ | Full user flows |
| **Production Parity** | Variable | Docker-based integration |

### Test File Structure

```
tests/
├── backend.test.ts                   # Backend unit tests
├── workflow-import.test.ts           # Workflow file validation (94 tests)
├── n8n-integration.test.ts           # n8n API tests (mocked)
├── n8n-real-api.integration.test.ts  # n8n API tests (real instance)
├── production-parity.test.ts         # Production parity tests
├── integration/                      # Integration suite (79 tests)
│   ├── 01-file-upload.test.ts
│   ├── 02-project-creation.test.ts
│   ├── 03-governance-flow.test.ts
│   ├── 04-phase-transitions.test.ts
│   ├── 05-artifact-storage.test.ts
│   ├── 06-error-recovery.test.ts
│   └── 07-state-resumption.test.ts
└── helpers/
    ├── service-availability.ts       # Service detection
    ├── test-fixtures.ts              # Data generators
    ├── s3-helpers.ts                 # S3 operations
    ├── db-helpers.ts                 # Database operations
    └── wait-helpers.ts               # Polling utilities

frontend/tests/
├── setup.ts                          # Vitest setup with Radix UI mocks
├── GovernanceWidget.test.tsx         # 24 tests
├── request-context.test.ts           # 26 tests
└── e2e/
    ├── global-setup.ts               # Test environment setup
    ├── global-teardown.ts            # Cleanup after tests
    ├── auth-guards.spec.ts           # Authentication guard tests
    ├── setup-wizard.spec.ts          # Setup wizard flow tests
    └── workflow-management.spec.ts   # Workflow management tests

scripts/
├── setup-n8n-test-instance.sh        # Create n8n owner + API key
├── wait-for-services.sh              # Wait for Docker services
├── run-prod-parity-tests.sh          # Full test orchestrator
└── validate-production-parity.sh     # Environment validation
```

### Test Commands

| Command | Description |
|---------|-------------|
| `npm run test:all` | Full test cycle: start env → test → cleanup |
| `npm run test:backend` | Backend tests only |
| `npm run test:workflows` | Validate workflow JSON files (94 tests) |
| `npm run test:workflows:integration` | Workflow import tests (requires n8n) |
| `npm run test:frontend` | Frontend tests only |
| `npm run test:integration` | Integration tests (79 tests) |
| `npm run test:e2e` | E2E tests |
| `npm run test:e2e:prod` | E2E against production-like environment |
| `npm run test:env:up` | Start test Docker environment |
| `npm run test:env:down` | Stop test environment |
| `npm run test:prod-parity` | Full production parity suite |
| `npm run test:prod-parity:quick` | Quick mode (skips Graphiti, E2E) |
| `npm run test:prod-parity:keep` | Keep services after tests |

### Production Parity Testing

**Purpose:** Catch issues that only occur in production:
- "tags is read-only" errors during workflow import
- "workflow not published" errors during subworkflow calls
- Database migration issues
- Service communication problems

**Commands:**
```bash
npm run test:prod-parity           # Full suite
npm run test:prod-parity:quick     # Skip slow services
npm run test:prod-parity:keep      # Keep running for debugging
```

### Mocking Strategy

| Layer | Mock Type | Tool |
|-------|-----------|------|
| HTTP APIs | Request interception | MSW |
| n8n API | Server mock | Custom mock-n8n-server.ts |
| Database | Transaction rollback | Real DB with cleanup |
| S3 | Real service | LocalStack or SeaweedFS |
| External LLMs | Not mocked | Use real APIs in integration |

### Coverage Requirements

| Category | Target | Actual |
|----------|--------|--------|
| Workflow validation | 100% | 100% (94 tests) |
| API routes | 80% | ~85% |
| UI components | 70% | ~75% |
| Critical paths | 100% | 100% |

### Critical Test Scenarios

| Scenario | Tests | Priority |
|----------|-------|----------|
| Fresh instance deployment | setup-wizard.spec.ts | Critical |
| Workflow import rollback | workflow-import.test.ts | Critical |
| Governance timeout | governance-flow.test.ts | High |
| State resumption (Smart Start) | state-resumption.test.ts | High |
| Database migration | production-parity.test.ts | High |
| API error handling | error-recovery.test.ts | High |

---

# PART IX: OPERATIONS

## 14. Security Considerations

### Authentication

| Component | Method | Configuration |
|-----------|--------|---------------|
| Dashboard | Google OAuth 2.0 | Better-Auth + domain restriction |
| n8n | Basic Auth + API Key | N8N_BASIC_AUTH_* env vars |
| S3 | Access Key + Secret | S3_ACCESS_KEY, S3_SECRET_KEY |
| AI APIs | API Keys | Stored encrypted in database |

### API Key Management

| Key Type | Storage | Encryption |
|----------|---------|------------|
| n8n API Key | PostgreSQL app_settings | AES-256-GCM |
| OpenRouter API | n8n credentials | n8n encryption |
| OpenAI API | n8n credentials | n8n encryption |
| Perplexity API | n8n credentials | n8n encryption |

### Encryption Details

**AES-256-GCM for sensitive settings:**
```typescript
// Encryption flow
plaintext → IV (16 bytes) + encrypt(plaintext) → authTag (16 bytes)
stored = IV + ciphertext + authTag (base64)

// Key derivation
ENCRYPTION_KEY = ENV['ENCRYPTION_KEY'] || derived from AUTH_SECRET
```

### Input Sanitization

| Input Type | Sanitization |
|------------|--------------|
| User text | XSS prevention, HTML encoding |
| File names | Path traversal prevention |
| JSON payloads | Schema validation (Zod) |
| SQL | Parameterized queries |
| Shell commands | Not allowed (no exec) |

### Audit Logging

| Event | Logged Fields |
|-------|---------------|
| User login | user_id, timestamp, IP |
| Project creation | project_id, user_id, timestamp |
| Governance decision | project_id, decisions, timestamp |
| Workflow import | workflow_name, status, timestamp |
| Reset operation | mode, user_id, timestamp |

---

## 15. Performance Optimization

### Cost Analysis

| Phase | Duration | Cost (est.) |
|-------|----------|-------------|
| Phase 0 (Scavenger) | 2-5 min | $0.005 |
| Phase 1 (Vision) | 5-15 min | ~$0.04 |
| Phase 2 (Architecture) | 5-15 min | ~$0.05 |
| Audit | 1-3 min | $0.01 |
| **Total** | **15-40 min** | **~$0.10** |

### Model Selection Optimization

| Optimization | Savings | Trade-off |
|--------------|---------|-----------|
| Claude Haiku for Scavenger/Auditor | 40% | Slightly less nuance |
| Limit iterations from 5 to 3 | 30% | May miss quality threshold |
| Prompt caching (OpenRouter) | Up to 90% | None for repeated prompts |
| Batch embedding generation | 20% | Slightly slower |

### Caching Strategies

| Cache Type | TTL | Purpose |
|------------|-----|---------|
| Redis sessions | 24h | Auth sessions |
| Perplexity results | 1h | Research queries |
| Graphiti queries | 5min | Knowledge graph |
| API responses | Request-scoped | TanStack Query |

### Response Time Targets

| Operation | Target | Actual |
|-----------|--------|--------|
| Page load | < 2s | 1.5s |
| API response | < 500ms | 300ms |
| File upload | < 5s | 3s |
| Workflow trigger | < 2s | 1s |
| LLM response | < 60s | 30-45s |

### Context Optimization

```bash
# Enable on-demand MCP tool loading (saves ~32k tokens)
export ENABLE_EXPERIMENTAL_MCP_CLI=true
export MAX_MCP_OUTPUT_TOKENS=50000
```

| Command | Purpose |
|---------|---------|
| `/context` | View token usage |
| `/compact` | Compress history (use at 70% capacity) |
| `/clear` | Reset context (use between unrelated tasks) |

---

## 16. Troubleshooting Guide

### MCP Connection Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| "n8n-mcp server not responding" | MCP not enabled in n8n | Enable in Settings → Instance-level MCP |
| "Workflow not found" | Workflows not marked for MCP | Mark "Available in MCP" in n8n |
| "Credential not found" | Wrong credential name | Create with exact names (case-sensitive) |
| "Invalid API key" | Key expired or wrong | Regenerate in n8n Settings |

### Workflow Errors

| Problem | Cause | Solution |
|---------|-------|----------|
| "Graphiti connection refused" | Service not running | Check `GRAPHITI_URL`, verify container |
| "Qdrant authentication failed" | Missing API key | Set `QDRANT_API_KEY` or leave empty |
| "Embedding generation failed" | OpenAI credential issue | Verify `OpenAI API Header` |
| "Subworkflow returns no data" | Outdated workflow | Re-import v2.2.0+ workflows |
| "Workflow not published" | Activation race condition | Wait 2s between activations |
| "tags is read-only" | Invalid import payload | Use sanitized workflow JSON |

### Database Errors

| Problem | Cause | Solution |
|---------|-------|----------|
| `is_setup_complete() does not exist` | Old DB schema | Run migrations |
| "Foreign key violation" | Wrong database | Point `DATABASE_URL` to `dashboard` DB |
| "Connection refused" | PostgreSQL not ready | Check health, increase start_period |
| "Migration hangs" | DB not healthy | Check `docker compose ps` |

### Deployment Errors (Dokploy)

| Problem | Cause | Solution |
|---------|-------|----------|
| "Port already allocated" | Explicit port mapping | Remove, let Traefik handle |
| "Module not found" | Missing prod deps | Install in Dockerfile runner stage |
| "npm ci lock mismatch" | Lockfile conflict | `rm -rf node_modules package-lock.json && npm install` |
| "meta_aggregator errors" | SeaweedFS config | Add `-filer=false` to command |
| "Google OAuth redirect mismatch" | Wrong AUTH_URL | Set to exact dashboard domain |

### Docker Health Check Issues

| Service | Check Command | Notes |
|---------|---------------|-------|
| n8n | `wget -qO- http://127.0.0.1:5678/healthz` | Use internal port |
| PostgreSQL | `pg_isready -U ${USER} -d ${DB}` | Include database name |
| Redis | `redis-cli ping` | Simple ping |
| Qdrant | `bash -c '(echo > /dev/tcp/localhost/6333)'` | No curl/wget available |
| Graphiti | `curl -sf http://127.0.0.1:8000/health` | Use `:standalone` tag |
| SeaweedFS | `wget -qO- http://127.0.0.1:9333/cluster/status` | Use master port 9333 |

### Start Period Recommendations

| Service | Start Period | Reason |
|---------|--------------|--------|
| PostgreSQL | 30s | Database initialization |
| n8n | 30s | Initial setup, migrations |
| SeaweedFS | 30s | Volume mounting |
| Graphiti | 90s | FalkorDB connection, startup |
| Redis/Qdrant/FalkorDB | 5-10s | Fast startup |

---

# PART X: REFERENCE

## 17. Current Limitations & Known Issues

### Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| **Single project per user at a time** | Can't run parallel projects | Queue projects |
| **No partial resume within phase** | Must restart phase if interrupted | State checkpoints planned |
| **English only** | UI and generated content | Localization needed |
| **No real-time progress within phase** | User waits without granular updates | Polling-based updates |
| **Graphiti cold start** | 60-90s initialization | Use `start_period: 90s` |
| **No offline mode** | Requires internet for LLMs | N/A |

### Known Issues

| Issue | Severity | Status | Workaround |
|-------|----------|--------|------------|
| Memory overcommit warning (Redis/FalkorDB) | Low | Host-level | Adjust vm.overcommit_memory |
| Python task runner warning (n8n) | Low | Ignorable | N/A |
| Perplexity rate limits | Medium | Mitigated | 1s delay implemented |
| SSE connection dropped on long imports | Low | Monitor | Refresh page to see final status |

---

## 18. Improvement Opportunities

### High Priority

| Improvement | Benefit | Complexity |
|-------------|---------|------------|
| **Real-time progress within phases** | Better UX during long waits | Medium |
| **Multi-project parallel execution** | Higher throughput | High |
| **Caching of Perplexity results** | Reduce API costs | Low |
| **Internationalization (i18n)** | Broader audience | Medium |
| **Export to PDF** | Professional output format | Low |

### Medium Priority

| Improvement | Benefit | Complexity |
|-------------|---------|------------|
| **Template customization** | Industry-specific output | Medium |
| **Team collaboration** | Multi-user projects | High |
| **Version history for artifacts** | Track changes over time | Medium |
| **Integration with Jira/Linear** | Auto-create tasks from ADRs | Medium |
| **Slack/Teams notifications** | Workflow status updates | Low |

### Low Priority / Future

| Improvement | Benefit | Complexity |
|-------------|---------|------------|
| **Self-hosted LLM support** | Data sovereignty | High |
| **Custom agent creation UI** | User-defined workflows | High |
| **Analytics dashboard** | Usage insights | Medium |
| **API for external integrations** | Developer ecosystem | Medium |
| **Mobile-responsive dashboard** | Access from any device | Low |

### Architecture Improvements

| Area | Current | Recommended |
|------|---------|-------------|
| **State Updates** | PostgreSQL polling | WebSocket events |
| **File Processing** | Sequential | Parallel workers |
| **LLM Calls** | Direct API | Batched with queuing |
| **Monitoring** | Basic logs | OpenTelemetry + Grafana |
| **Testing** | Integration tests | Add E2E visual regression |

---

## 19. Version History

### Recent Versions (v3.0.x)

| Version | Date | Highlights |
|---------|------|------------|
| **v3.0.12** | 2026-01-19 | State Management UI: StateManagement component, reset modes (soft/full/clear_config/factory), fix-stuck API, workflow status counts |
| **v3.0.11** | 2026-01-19 | Usability: EmptyState component, status utilities, accessibility (aria-labels), GovernanceWidget performance fix |
| **v3.0.10** | 2026-01-19 | Phase B UI: Dry-run preview, dependency visualization, validation display |
| **v3.0.9** | 2026-01-19 | Dependency graph API, dry-run import mode, SSE streaming for real-time progress |
| **v3.0.8** | 2026-01-19 | Pre-import validation (node compatibility, circular dependency detection) |
| **v3.0.7** | 2026-01-19 | Workflow sync API to detect n8n changes (deletions, state changes) |
| **v3.0.6** | 2026-01-18 | Two-phase workflow import with rollback, workflow export API |
| **v3.0.5** | 2026-01-18 | Pre-commit hooks (Husky) for workflow and TypeScript validation |
| **v3.0.4** | 2026-01-18 | Workflow import tests (94 tests), fixed "tags is read-only" error |
| **v3.0.3** | 2026-01-18 | Automatic database migrations via init container pattern |
| **v3.0.2** | 2026-01-18 | Integration test suite (79 tests), EXPERT_CONTEXT.md |
| **v3.0.1** | 2026-01-16 | Resilient database queries with fallbacks |
| **v3.0.0** | 2026-01-16 | Setup wizard, encrypted API key storage, 390 tests |

### Earlier Versions (v2.x)

| Version | Date | Highlights |
|---------|------|------------|
| **v2.9.0** | 2026-01-15 | Route error boundaries, loading skeletons, toasts |
| **v2.8.x** | 2026-01-14-15 | n8n auto-bootstrap, local-prod testing, structured logging |
| **v2.7.0** | 2026-01-14 | S3-only storage (removed Google Drive) |
| **v2.6.0** | 2026-01-14 | Batch governance UI (GovernanceWidget), Dashboard MVP |
| **v2.5.0** | 2026-01-14 | File upload with presigned URLs |
| **v2.4.0** | 2026-01-13 | Production hardening, credential portability |
| **v2.3.0** | 2026-01-13 | User confirmation flow fix |
| **v2.2.0** | 2026-01-13 | Workflow connection fixes |
| **v2.1.0** | 2026-01-13 | Qdrant integration, adversarial loop fixes |
| **v2.0.0** | 2026-01-13 | AI Agent conversion |
| **v1.0.0** | 2026-01-12 | Initial release |

---

## 20. Quick Reference

### NPM Commands

```bash
# Development
npm run dev               # Start frontend dev server (port 3000)
npm run build             # Build for production
npm install               # Install deps + setup husky hooks

# Testing
npm run test:all          # All tests (Docker required)
npm run test:backend      # Backend tests
npm run test:frontend     # Frontend tests
npm run test:workflows    # Workflow validation (94 tests)
npm run test:integration  # Integration tests (79 tests)
npm run test:e2e          # E2E tests
npm run test:prod-parity  # Production parity suite

# Docker
npm run test:env:up       # Start test environment
npm run test:env:down     # Stop test environment

# Workflows
npm run sync-workflows    # Sync to n8n
npm run sync-workflows:dry-run  # Preview changes
```

### Key URLs

| Service | Local | Production |
|---------|-------|------------|
| **Dashboard** | http://localhost:3000 | https://dashboard.yourdomain.com |
| **n8n** | http://localhost:5678 | https://n8n.yourdomain.com |
| **Traefik** | http://localhost:8080 | N/A |
| **Qdrant** | http://localhost:6333 | Internal only |
| **Graphiti** | http://localhost:8000 | Internal only |
| **SeaweedFS S3** | http://localhost:8333 | Internal only |

### Important File Locations

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Quick reference for Claude Code |
| `EXPERT_CONTEXT.md` | This document |
| `workflows/README.md` | Workflow documentation |
| `frontend/package.json` | Frontend dependencies |
| `frontend/scripts/db-migrate.mjs` | Database migrations |
| `frontend/lib/workflow-importer.ts` | Import logic |
| `.github/workflows/deploy.yml` | CI/CD pipeline |
| `.husky/pre-commit` | Git hooks |

### Emergency Commands

```bash
# Fix stuck workflow imports
curl -X POST http://localhost:3000/api/workflows/fix-stuck

# Sync registry with n8n
curl -X POST http://localhost:3000/api/workflows/sync \
  -H "Content-Type: application/json" \
  -d '{"mode": "detect"}'

# Soft reset (keep n8n workflows)
curl -X POST http://localhost:3000/api/setup/reset \
  -H "Content-Type: application/json" \
  -d '{"mode": "soft", "confirmation": "RESET"}'

# Factory reset
curl -X POST http://localhost:3000/api/setup/reset \
  -H "Content-Type: application/json" \
  -d '{"mode": "factory", "confirmation": "RESET"}'
```

---

# APPENDICES

## Appendix A: Environment Variables

### Database

```bash
DATABASE_URL=postgresql://user:password@postgres:5432/dashboard
POSTGRES_USER=n8n
POSTGRES_PASSWORD=<secure_password>
POSTGRES_DB=n8n
```

### n8n Workflow Engine

```bash
N8N_ENCRYPTION_KEY=<32_char_encryption_key>
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=<password>
WEBHOOK_URL=https://n8n.yourdomain.com
```

### AI Services

```bash
OPENROUTER_API_KEY=<openrouter_key>
OPENAI_API_KEY=<openai_key>     # For embeddings
PERPLEXITY_API_KEY=<perplexity_key>
```

### Knowledge Services

```bash
GRAPHITI_URL=http://graphiti:8000
QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=<qdrant_key>     # Optional, only if auth enabled
```

### S3 Storage

```bash
S3_ENDPOINT=http://seaweedfs:8333
S3_BUCKET=product-factory-artifacts
S3_ACCESS_KEY=admin
S3_SECRET_KEY=<s3_secret>
S3_REGION=us-east-1
```

### Dashboard

```bash
AUTH_SECRET=<32_char_auth_secret>
ENCRYPTION_KEY=<32_char_encryption_key>  # For API key encryption
GOOGLE_CLIENT_ID=<oauth_client_id>
GOOGLE_CLIENT_SECRET=<oauth_client_secret>
AUTH_URL=https://dashboard.yourdomain.com
ALLOWED_EMAIL_DOMAINS=yourdomain.com
```

### Workflow Configuration

```bash
FACTORY_MAX_ITERATIONS=5
FACTORY_SCORE_THRESHOLD=90
FACTORY_BATCH_SIZE=3
FACTORY_CONFIRMATION_TIMEOUT=3600
```

### Model Configuration (OpenRouter)

```bash
MODEL_ARCHITECT=anthropic/claude-sonnet-3.5
MODEL_CRITIC=openai/gpt-4o
MODEL_REFINER=anthropic/claude-sonnet-3.5
MODEL_CONTEXT=google/gemini-1.5-pro
MODEL_RESEARCH=perplexity/sonar-pro
```

---

## Appendix B: Database Schema DDL

### Better-Auth Tables

```sql
CREATE TABLE IF NOT EXISTS "user" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
    image TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "session" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "account" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
    "refreshTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    password TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "verification" (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Setup Wizard Tables

```sql
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    setting_type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    is_sensitive BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS workflow_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_name VARCHAR(255) NOT NULL,
    workflow_file VARCHAR(255) NOT NULL UNIQUE,
    n8n_workflow_id VARCHAR(100),
    n8n_workflow_version INTEGER DEFAULT 1,
    local_version VARCHAR(50) NOT NULL,
    local_checksum VARCHAR(64),
    webhook_paths JSONB DEFAULT '[]'::JSONB,
    is_active BOOLEAN DEFAULT FALSE,
    import_status VARCHAR(50) DEFAULT 'pending',
    last_import_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Project State Tables

```sql
CREATE TABLE IF NOT EXISTS project_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(255) NOT NULL UNIQUE,
    project_name VARCHAR(255) NOT NULL,
    session_id VARCHAR(255),
    current_phase INTEGER DEFAULT 0,
    phase_status VARCHAR(50) DEFAULT 'pending',
    last_iteration_phase INTEGER,
    last_iteration_number INTEGER,
    last_iteration_score DECIMAL(5,2),
    tech_standards_global JSONB DEFAULT '[]'::JSONB,
    tech_standards_local JSONB DEFAULT '[]'::JSONB,
    artifact_vision_draft VARCHAR(500),
    artifact_vision_final VARCHAR(500),
    artifact_architecture_draft VARCHAR(500),
    artifact_architecture_final VARCHAR(500),
    artifact_decision_log VARCHAR(500),
    total_iterations INTEGER DEFAULT 0,
    total_duration_ms BIGINT DEFAULT 0,
    config JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    full_state JSONB
);

CREATE TABLE IF NOT EXISTS decision_log_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(255) NOT NULL REFERENCES project_state(project_id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    entry_type VARCHAR(50) NOT NULL,
    phase INTEGER,
    iteration INTEGER,
    content TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    agent_name VARCHAR(100),
    score DECIMAL(5,2),
    issues_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(255) NOT NULL REFERENCES project_state(project_id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    payload JSONB DEFAULT NULL,
    n8n_execution_id VARCHAR(255),
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Appendix C: API Endpoint Reference

| Endpoint | Method | Auth | Request Body | Response |
|----------|--------|------|--------------|----------|
| `/api/health` | GET | No | - | `{status, database, timestamp}` |
| `/api/start-project` | POST | Yes | `{projectName, projectId, inputFiles}` | `{success, projectId, sessionId}` |
| `/api/presigned-url` | POST | Yes | `{filename, projectId}` | `{url, key}` |
| `/api/governance` | POST | Yes | `{projectId, scavengingId, decisions}` | `{success, approved, skipped}` |
| `/api/setup/status` | GET | No | - | `{wizardCompleted, n8nConfigured}` |
| `/api/setup/n8n/test-connection` | POST | Yes | `{apiUrl, apiKey}` | `{success, version}` |
| `/api/setup/n8n/save-config` | POST | Yes | `{apiUrl, apiKey}` | `{success}` |
| `/api/setup/workflows/list` | GET | Yes | - | `{workflows: [...]}` |
| `/api/setup/workflows/import` | POST | Yes | `{clearRegistry}` | `{success, imported, failed}` |
| `/api/setup/workflows/verify` | GET | Yes | - | `{status, workflows}` |
| `/api/setup/complete` | POST | Yes | - | `{success}` |
| `/api/setup/reset` | POST | Yes | `{mode, confirmation}` | `{success, deletedFromN8n, ...}` |
| `/api/settings/n8n` | GET | Yes | - | `{apiUrl, webhookUrls}` |
| `/api/settings/n8n` | PUT | Yes | `{apiUrl, apiKey}` | `{success}` |
| `/api/workflows/sync` | POST | Yes | `{mode, includeOrphans}` | `{success, synced, deleted}` |
| `/api/workflows/fix-stuck` | POST | Yes | - | `{success, resetCount}` |
| `/api/workflows/export` | POST | Yes | `{workflowName}` | `{json, filename}` |
| `/api/workflows/export/commit` | POST | Yes | `{workflowName}` | `{success, path}` |
| `/api/workflows/dependencies` | GET | Yes | - | `{graph, order}` |
| `/api/workflows/validate` | POST | Yes | `{workflows}` | `{valid, errors}` |
| `/api/workflows/import-stream` | POST | Yes | `{clearRegistry}` | SSE stream |

---

## Appendix D: Glossary

| Term | Definition |
|------|------------|
| **ADR** | Architecture Decision Record - documented architecture decision |
| **ARC42** | Template for software architecture documentation (12 sections) |
| **Adversarial Loop** | Pattern where a Critic evaluates and a Refiner improves work |
| **Better-Auth** | Authentication library for Next.js/React |
| **Circuit Breaker** | Pattern to stop iteration after max attempts |
| **Dokploy** | Self-hosted PaaS for Docker deployment |
| **Graphiti** | Knowledge graph service from Zep |
| **Governance** | Human approval process for AI decisions |
| **JTBD** | Jobs-to-be-Done framework for understanding user needs |
| **MCP** | Model Context Protocol for tool integration |
| **OpenRouter** | API gateway for multiple LLM providers |
| **Perplexity** | AI-powered search and research tool |
| **Qdrant** | Vector database for semantic search |
| **Smart Start** | Feature enabling workflow resumption |
| **SSE** | Server-Sent Events for streaming updates |
| **TanStack** | React framework family (Router, Query, Start) |
| **Two-Phase Import** | Create all workflows first, then activate |
| **Zep** | Memory service for AI agents |

---

*Document generated: 2026-01-19*
*Version: 3.0.12*
*For quick reference, see [CLAUDE.md](CLAUDE.md)*
