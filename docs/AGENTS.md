# AGENTS.md

**Superseded by [AGENT_ARCHITECTURE.md](./AGENT_ARCHITECTURE.md).**

This file is kept for links; edit AGENT_ARCHITECTURE.md going forward.

## LLM note

Agents are vendor-agnostic. Use `ctx.llm` only. Configure via:

- Env: `LLM_PROVIDER=openai|anthropic|gemini|grok|local|mock`
- Or agent config: `{ "llmProvider": "gemini", "llmModel": "gemini-2.0-flash" }`
