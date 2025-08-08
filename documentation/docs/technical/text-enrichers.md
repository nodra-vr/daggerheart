---
title: Text Enrichers
---

### Duality Enricher
Creates clickable links for inline `/dr` commands.

### Resource Enricher
Turns resource phrases into buttons for hope/fear/stress/hp/armor.

### How it works
- Scans rendered HTML for patterns and replaces with interactive elements
- Respects exclusion phrases to avoid unintended actions

### Examples
```markdown
[[/dr trait=agility modifier=1]]{Agility Check}
spend 1 hope
clear 1 stress
```

### Tips
- Keep phrases simple for consistent detection
- Use inline commands where structured control is required
