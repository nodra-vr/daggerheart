---
title: Hover Distance
---

### Overview
Shows a compact distance label when you hover a token. The label uses the system’s gold-and-dark-blue style and the same narrative range categories as the ruler and templates.

### Getting started
1. Open Game Settings → Configure Settings → Daggerheart
2. Ensure Range Measurement is enabled
3. Optionally toggle the scene flag “Disable Narrative Measurement” in the Scene Config grid tab
4. Select a token and hover another token to see the label

### Features
- Uses narrative ranges (Melee, Very Close, Close, Far, Very Far)
- Renders above the hovered token with readable styling
- Respects system setting `Range Measurement Enabled`
- Respects scene flag `Disable Narrative Measurement`

### Behavior
- The first controlled token is the origin
- Distance is measured center-to-center through the scene grid
- The text displays the narrative label for the measured distance

### Notes
- Colors follow `--dh-color-gold`, `--dh-color-dark-blue`, and `--dh-color-off-white`
- Integrates with the existing range measurement so labels remain consistent

### Related
- Range Measurement: ../../mechanics/range-measurement.md

