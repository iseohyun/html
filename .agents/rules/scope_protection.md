---
description: Guardrails for sub-project scope verification, branch isolation, and protected workspace paths.
---

# Scope & Branch Protection Directives

## 1. Sub-project Scope & Branch Verification
When working on any sub-project (`small-project/*`), the AI MUST verify the following before starting work:
- **Scope Boundary**: What is the exact scope and boundary of the current sub-project?
- **Branch Isolation**: What is the active git branch for this sub-project? **Sub-project development MUST NOT occur directly on the `main` branch**.

## 2. Restricted Sub-projects
- Do NOT modify `small-project/janggi/` unless explicitly requested by the user.
