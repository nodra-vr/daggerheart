import { DaggerheartMeasuredTemplate } from "../data/range-measurement.js";

let isInitialized = false;

function getFirstControlledToken() {
  const controlled = canvas?.tokens?.controlled || [];
  return controlled.length > 0 ? controlled[0] : null;
}

function isEnabled() {
  const globalEnabled = game.settings.get("daggerheart-unofficial", "rangeMeasurementEnabled");
  const sceneDisabled = canvas?.scene?.getFlag("daggerheart-unofficial", "disableNarrativeMeasurement") === true;
  return globalEnabled && !sceneDisabled;
}

function measureCenterDistance(origin, target) {
  // Get horizontal distance using grid measurement
  const path = [origin.center, target.center];
  const result = canvas.grid.measurePath(path, { gridSpaces: true });
  const horizontalDistance = typeof result?.distance?.toNearest === "function" ? 
    result.distance.toNearest(0.01) : Number(result?.distance ?? 0);
  
  // Get elevations
  const elevation1 = origin.document.elevation || 0;
  const elevation2 = target.document.elevation || 0;
  const verticalDistance = Math.abs(elevation1 - elevation2);
  
  // If there's no vertical difference, just return horizontal distance
  if (verticalDistance === 0) {
    return horizontalDistance;
  }
  
  // Calculate 3D Euclidean distance
  const totalDistance = Math.sqrt(
    horizontalDistance * horizontalDistance + 
    verticalDistance * verticalDistance
  );
  
  return totalDistance;
}

function getLabelForDistance(distance) {
  return DaggerheartMeasuredTemplate.getDistanceLabel(distance) || "";
}

function ensureContainer(token) {
  if (!token.hoverDistanceContainer) {
    token.hoverDistanceContainer = new PIXI.Container();
    token.sortableChildren = true;
    token.addChild(token.hoverDistanceContainer);
    if (token.parent) token.parent.sortableChildren = true;
    token.hoverDistanceContainer.zIndex = 999999;
  }
  return token.hoverDistanceContainer;
}

function clearContainer(token) {
  if (token?.hoverDistanceContainer) {
    token.hoverDistanceContainer.removeChildren();
  }
}

function drawTooltip(token, text) {
  const container = ensureContainer(token);
  container.removeChildren();
  const fontSize = Math.max(10, Math.floor((canvas?.dimensions?.size || 100) / 4));
  const darkBlue = 0x050a14;
  const offWhite = 0xF2F3F4;
  const TextClass = globalThis.PreciseText ?? PIXI.Text;
  const textStyle = new PIXI.TextStyle({ fill: offWhite, fontSize, fontFamily: "Signika, sans-serif", stroke: 0x000000, strokeThickness: 2, align: "center" });
  const label = new TextClass(text, textStyle);
  const baseRes = canvas?.app?.renderer?.resolution || window.devicePixelRatio || 1;
  const zoom = canvas?.stage?.scale?.x || 1;
  label.resolution = Math.max(1, Math.floor(baseRes * zoom));
  if (typeof label.updateText === 'function') label.updateText();
  const padX = Math.floor(fontSize * 0.6);
  const padY = Math.floor(fontSize * 0.4);
  const bgW = Math.ceil(label.width + padX * 2);
  const bgH = Math.ceil(label.height + padY * 2);
  const bg = new PIXI.Graphics();
  bg.beginFill(darkBlue, 0.7);
  bg.drawRoundedRect(0, 0, bgW, bgH, Math.min(10, Math.floor(fontSize * 0.6)));
  bg.endFill();
  label.x = Math.floor((bgW - label.width) / 2);
  label.y = Math.floor((bgH - label.height) / 2);
  container.addChild(bg);
  container.addChild(label);
  const offset = Math.max(10, Math.floor(fontSize * 0.35));
  container.x = Math.round((token.w - bgW) / 2);
  container.y = Math.round(-bgH - offset);
  container.roundPixels = true;
}

function handleHover(token, hovered) {
  if (!isEnabled()) {
    clearContainer(token);
    if (token?.tooltip) token.tooltip.visible = true;
    return;
  }
  if (!hovered) {
    clearContainer(token);
    if (token?.tooltip) token.tooltip.visible = true;
    return;
  }
  const origin = getFirstControlledToken();
  if (!origin) {
    clearContainer(token);
    if (token?.tooltip) token.tooltip.visible = true;
    return;
  }
  if (origin.id === token.id) {
    clearContainer(token);
    if (token?.tooltip) token.tooltip.visible = true;
    return;
  }
  const distance = measureCenterDistance(origin, token);
  const label = getLabelForDistance(distance);
  if (!label) {
    clearContainer(token);
    if (token?.tooltip) token.tooltip.visible = true;
    return;
  }
  if (token?.tooltip) token.tooltip.visible = false;
  drawTooltip(token, label);
}

function handleControlToken() {
  canvas.tokens.placeables.forEach(t => {
    if (t?.hoverDistanceContainer) t.hoverDistanceContainer.removeChildren();
    if (t?.tooltip) t.tooltip.visible = true;
  });
}

function handleHighlight(highlighted) {
  if (!isEnabled()) {
    canvas.tokens.placeables.forEach(t => {
      if (t?.hoverDistanceContainer) t.hoverDistanceContainer.removeChildren();
      if (t?.tooltip) t.tooltip.visible = true;
    });
    return;
  }

  const origin = getFirstControlledToken();
  if (!highlighted || !origin) {
    canvas.tokens.placeables.forEach(t => {
      if (t?.hoverDistanceContainer) t.hoverDistanceContainer.removeChildren();
      if (t?.tooltip) t.tooltip.visible = true;
    });
    return;
  }

  canvas.tokens.placeables.forEach(t => {
    if (t?.id === origin.id) {
      if (t?.hoverDistanceContainer) t.hoverDistanceContainer.removeChildren();
      if (t?.tooltip) t.tooltip.visible = true;
      return;
    }
    const distance = measureCenterDistance(origin, t);
    const label = getLabelForDistance(distance);
    if (label) {
      if (t?.tooltip) t.tooltip.visible = false;
      drawTooltip(t, label);
    } else {
      if (t?.hoverDistanceContainer) t.hoverDistanceContainer.removeChildren();
      if (t?.tooltip) t.tooltip.visible = true;
    }
  });
}

export function initializeHoverDistance() {
  if (isInitialized) return;
  isInitialized = true;
  Hooks.on("hoverToken", handleHover);
  Hooks.on("controlToken", handleControlToken);
  Hooks.on("highlightObjects", handleHighlight);
}


