---
title: Hope, Fear & Stress
---

### What it is
Hope helps players, Fear helps the GM, Stress marks strain. Rolls automatically adjust these values when appropriate.

### Getting started
1. Roll using Duality; outcomes apply resources automatically
2. Adjust manually with the Token Counter UI
3. Use resource buttons in chat or text via Resource Enrichment

### Automatic from rolls
- Critical: +1 Hope and clear 1 Stress (characters)
- Hope: +1 Hope (characters)
- Fear: GM gains 1 Fear

### Examples
![Fear increase from roll](https://github.com/user-attachments/assets/ed12d59e-3101-4637-803e-4f44a2dc0e26)

![Hope increase from roll](https://github.com/user-attachments/assets/da0d520c-9201-4f51-9a41-c7d25002ce41)

### Manual controls
- Use the Token Counter UI on the selected token
- Click resource buttons in chat or item text (see Resource Enrichment)

### Tips
- Hope and Stress are per-character; Fear is a GM/party-level resource
- Some critical outcomes clear Stress automatically
- Coordinate Fear adjustments with the GM to avoid duplicates

### Related
- [Resource Enrichment](./resource-enrichment.md)
- [Duality Rolls](../rolling/duality-rolls.md)
- [Token Counter UI](../../ui/token-counter-ui.md)
- [Top Bar UI](../../ui/top-bar-ui.md)

### For power users
```javascript
await spendHope(actor, 1)
await gainFear(1)
await clearStress(actor, 1)
```

