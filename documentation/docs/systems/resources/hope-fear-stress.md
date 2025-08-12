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

![[resource-automation-fear.gif|Fear generation from roll]]

![[resource-automation-hope.gif|Hope increase from roll]]

### Manual controls

- Use the Token Counter UI on the selected token
- Click resource buttons in chat or item text (see Resource Enrichment)

### Rest results in chat

Long Rest selections post clear summaries to chat, including healing, stress clearing, armor repair, and preparation results.
![Long Rest chat summary](https://github.com/user-attachments/assets/927a8b9e-8dc8-480f-af03-839f77e64fb4)

Short Rest selections show the chosen options and the applied amounts for healing, stress clearing, and armor repair.
![Short Rest chat summary](https://github.com/user-attachments/assets/11b7ccfc-5404-4058-a5d3-c064345955e2)

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
await spendHope(actor, 1);
await gainFear(1);
await clearStress(actor, 1);
```
