---
title: Chat Commands
---

### /dr Duality Command
Intercepted in chat and processed via unified duality processor.

### Inline
`[[/dr trait=agility]]{Agility Check}`

### Help
Renders a help card via `showDualityRollHelp()`.

### Usage
- `/dr`
- `/dr trait=strength modifier=2`
- `/dr hope=d8 fear=d10 advantage=2d6`

### Integration
- Parsed by the command parser and routed to the duality processor
- Enriched inline via the duality text enricher

### Tips
- Use inline syntax in journals and item text for quick rolls
- Pass `reaction=true` for reaction rolls
