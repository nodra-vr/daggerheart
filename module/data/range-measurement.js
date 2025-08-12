/**
 * Daggerheart Range Measurement System
 * Consolidated module containing all range measurement functionality
 */

// ============================================
// CONFIGURATION
// ============================================

export const RANGE_CONFIG = {
    self: {
        id: 'self',
        short: 's',
        label: 'DAGGERHEART.CONFIG.Range.self.name',
        description: 'DAGGERHEART.CONFIG.Range.self.description',
        distance: 0
    },
    melee: {
        id: 'melee',
        short: 'm',
        label: 'DAGGERHEART.CONFIG.Range.melee.name',
        description: 'DAGGERHEART.CONFIG.Range.melee.description',
        distance: 1
    },
    veryClose: {
        id: 'veryClose',
        short: 'vc',
        label: 'DAGGERHEART.CONFIG.Range.veryClose.name',
        description: 'DAGGERHEART.CONFIG.Range.veryClose.description',
        distance: 3
    },
    close: {
        id: 'close',
        short: 'c',
        label: 'DAGGERHEART.CONFIG.Range.close.name',
        description: 'DAGGERHEART.CONFIG.Range.close.description',
        distance: 10
    },
    far: {
        id: 'far',
        short: 'f',
        label: 'DAGGERHEART.CONFIG.Range.far.name',
        description: 'DAGGERHEART.CONFIG.Range.far.description',
        distance: 20
    },
    veryFar: {
        id: 'veryFar',
        short: 'vf',
        label: 'DAGGERHEART.CONFIG.Range.veryFar.name',
        description: 'DAGGERHEART.CONFIG.Range.veryFar.description',
        distance: 30
    }
};

export const TEMPLATE_TYPES = {
    CIRCLE: 'circle',
    CONE: 'cone',
    RECT: 'rect',
    RAY: 'ray',
    EMANATION: 'emanation',
    INFRONT: 'inFront'
};



// ============================================
// CANVAS CLASSES
// ============================================

export class DaggerheartMeasuredTemplate extends foundry.canvas.placeables.MeasuredTemplate {

    _refreshRulerText() {
        super._refreshRulerText();

        const enabled = game.settings.get('daggerheart-unofficial', 'rangeMeasurementEnabled');
        if (enabled) {
            const splitRulerText = this.ruler.text.split(' ');
            if (splitRulerText.length > 0) {
                const rulerValue = Number(splitRulerText[0]);
                const vagueLabel = this.constructor.getDistanceLabel(rulerValue);
                if (vagueLabel) {
                    this.ruler.text = vagueLabel;
                }
            }
        }
    }

    /**
     * Convert a numeric distance to a narrative range label
     * @param {number} distance - The distance in grid units
     * @returns {string} The localized range label
     */
    static getDistanceLabel(distance) {
        const melee = game.settings.get('daggerheart-unofficial', 'rangeMeasurementMelee');
        const veryClose = game.settings.get('daggerheart-unofficial', 'rangeMeasurementVeryClose');
        const close = game.settings.get('daggerheart-unofficial', 'rangeMeasurementClose');
        const far = game.settings.get('daggerheart-unofficial', 'rangeMeasurementFar');
        const veryFar = game.settings.get('daggerheart-unofficial', 'rangeMeasurementVeryFar');
        if ((canvas.grid.units == 'mi' || canvas.grid.units == 'km' 
            || canvas.grid.units == 'miles' || canvas.grid.units == 'kilometers' 
            || canvas.grid.units == 'miile' || canvas.grid.units == 'kilometer')){
            return ''
        }
        if (distance <= melee) {
            return game.i18n.localize('DAGGERHEART.CONFIG.Range.melee.name');
        }
        if (distance <= veryClose) {
            return game.i18n.localize('DAGGERHEART.CONFIG.Range.veryClose.name');
        }
        if (distance <= close) {
            return game.i18n.localize('DAGGERHEART.CONFIG.Range.close.name');
        }
        if (distance <= far) {
            return game.i18n.localize('DAGGERHEART.CONFIG.Range.far.name');
        }
        if (distance <= veryFar) {
            return game.i18n.localize('DAGGERHEART.CONFIG.Range.veryFar.name');
        }

        return game.i18n.localize('DAGGERHEART.CONFIG.Range.outOfRange.name');
    }
}

export class DaggerheartRuler extends foundry.canvas.interaction.Ruler {

    _getWaypointLabelContext(waypoint, state) {
        const context = super._getWaypointLabelContext(waypoint, state);
        if (!context) return;

        const enabled = game.settings.get('daggerheart-unofficial', 'rangeMeasurementEnabled');

        if (enabled) {
            const distance = DaggerheartMeasuredTemplate.getDistanceLabel(
                waypoint.measurement.distance.toNearest(0.01)
            );
            if (distance) {
                context.cost = { total: distance, units: null };
                context.distance = { total: distance, units: null };
            }
        }

        return context;
    }
}

export class DaggerheartTokenRuler extends foundry.canvas.placeables.tokens.TokenRuler {

    _getWaypointLabelContext(waypoint, state) {
        const context = super._getWaypointLabelContext(waypoint, state);
        if (!context) return;

        const enabled = game.settings.get('daggerheart-unofficial', 'rangeMeasurementEnabled');

        if (enabled) {
            const distance = DaggerheartMeasuredTemplate.getDistanceLabel(
                waypoint.measurement.distance.toNearest(0.01)
            );
            if (distance) {
                context.cost = { total: distance, units: null };
                context.distance = { total: distance, units: null };
            }
        }

        return context;
    }
}

// ============================================
// TEMPLATE ENRICHER
// ============================================

/**
 * Template enricher for creating measurement templates from chat
 * Usage: @Template[type:circle|range:close]
 */
export function DaggerheartTemplateEnricher(match, _options) {
    const parts = match[1].split('|').map(x => x.trim());

    let type = null;
    let range = null;

    parts.forEach(part => {
        const split = part.split(':').map(x => x.toLowerCase().trim());
        if (split.length === 2) {
            switch (split[0]) {
                case 'type':
                    const matchedType = Object.values(TEMPLATE_TYPES).find(
                        x => x.toLowerCase() === split[1]
                    );
                    type = matchedType;
                    break;
                case 'range':
                    const matchedRange = Object.values(RANGE_CONFIG).find(
                        x => x.id.toLowerCase() === split[1] || x.short === split[1]
                    );
                    range = matchedRange?.id;
                    break;
            }
        }
    });

    if (!type || !range) return match[0];

    const label = game.i18n.localize(`DAGGERHEART.CONFIG.TemplateTypes.${type}`);
    const rangeLabel = game.i18n.localize(`DAGGERHEART.CONFIG.Range.${range}.name`);

    const templateElement = document.createElement('span');
    templateElement.innerHTML = `
    <button class="measured-template-button" data-type="${type}" data-range="${range}">
      <i class="fa-solid fa-ruler-combined"></i>
      ${label} - ${rangeLabel}
    </button>
  `;

    return templateElement;
}

/**
 * Render a measured template from a button click
 */
export const renderMeasuredTemplate = async (event) => {
    const button = event.currentTarget;
    const type = button.dataset.type;
    const range = button.dataset.range;

    if (!type || !range || !game.canvas.scene) return;

    const usedType = type === 'inFront' ? 'cone' : type === 'emanation' ? 'circle' : type;
    const angle = type === TEMPLATE_TYPES.CONE
        ? CONFIG.MeasuredTemplate.defaults.angle
        : type === TEMPLATE_TYPES.INFRONT
            ? 180
            : undefined;

    const baseDistance = game.settings.get('daggerheart-unofficial', `rangeMeasurement${range.charAt(0).toUpperCase() + range.slice(1)}`);
    const distance = type === TEMPLATE_TYPES.EMANATION ? baseDistance + 2.5 : baseDistance;

    const { width, height } = game.canvas.scene.dimensions;

    await canvas.scene.createEmbeddedDocuments('MeasuredTemplate', [{
        x: width / 2,
        y: height / 2,
        t: usedType,
        distance: distance,
        width: type === TEMPLATE_TYPES.RAY ? 5 : undefined,
        angle: angle,
        fillColor: game.user.color || '#FF0000'
    }]);
};

// ============================================
// ADVANCED DISTANCE MEASUREMENT
// ============================================

/**
 * Advanced measurement utility for volume-to-volume distance calculation
 * with vertical distance support and performance optimization
 */
export class AdvancedDistanceMeasurement {

    /**
     * Measure minimum distance between two tokens with advanced options
     * @param {Token} token1 - First token (origin)
     * @param {Token} token2 - Second token (target)
     * @returns {number} Minimum distance between token volumes
     */
    static measureMinTokenDistance(token1, token2) {
        if (!token1 || !token2) return 0;

        const verticalMode = game.settings.get('daggerheart-unofficial', 'hoverDistanceVerticalMode');
        const complexityThreshold = game.settings.get('daggerheart-unofficial', 'hoverDistanceComplexityThreshold');
        const roundingMode = game.settings.get('daggerheart-unofficial', 'hoverDistanceRounding');

        const complexity = token1.document.width * token2.document.width + token1.document.height * token2.document.height;
        
        let distance;
        if (complexity > complexityThreshold) {
            distance = this._measureCenterToCenter(token1, token2, verticalMode);
        } else {
            distance = this._measureVolumeToVolume(token1, token2, verticalMode);
        }

        return this._applyRounding(distance, roundingMode);
    }

    /**
     * Simple center-to-center measurement for performance
     */
    static _measureCenterToCenter(token1, token2, verticalMode) {
        const elevation1 = token1.document.elevation || 0;
        const elevation2 = token2.document.elevation || 0;

        const path = [token1.center, token2.center];
        
        let horizontalDistance = 0;
        try {
            const result = canvas.grid.measurePath(path, { gridSpaces: true });
            horizontalDistance = result?.distance ?? 0;
        } catch (error) {
            console.warn('Error measuring horizontal distance, using Euclidean fallback:', error);
            const dx = token1.center.x - token2.center.x;
            const dy = token1.center.y - token2.center.y;
            horizontalDistance = Math.sqrt(dx * dx + dy * dy) / canvas.grid.size * canvas.grid.distance;
        }

        return this._combineDistances(horizontalDistance, elevation1, elevation2, verticalMode);
    }

    /**
     * Detailed volume-to-volume measurement
     */
    static _measureVolumeToVolume(token1, token2, verticalMode) {
        const gridSize = canvas.grid.size;
        const gridDistance = canvas.grid.distance;
        
        const points1 = this._sampleTokenPoints(token1);
        const points2 = this._sampleTokenPoints(token2);
        
        let minDistance = Infinity;

        for (const point1 of points1) {
            for (const point2 of points2) {
                const path = [point1, point2];
                
                let horizontalDistance = 0;
                try {
                    const result = canvas.grid.measurePath(path, { gridSpaces: true });
                    horizontalDistance = result?.distance ?? 0;
                } catch (error) {
                    const dx = point1.x - point2.x;
                    const dy = point1.y - point2.y;
                    horizontalDistance = Math.sqrt(dx * dx + dy * dy) / gridSize * gridDistance;
                }

                const combinedDistance = this._combineDistances(
                    horizontalDistance, 
                    point1.z || 0, 
                    point2.z || 0, 
                    verticalMode
                );

                minDistance = Math.min(minDistance, combinedDistance);
            }
        }

        return minDistance === Infinity ? 0 : minDistance;
    }

    /**
     * Sample points across a token's footprint and vertical extent
     */
    static _sampleTokenPoints(token) {
        const document = token.document;
        const elevation = document.elevation || 0;
        const losHeight = document.losHeight || 0;
        const gridSize = canvas.grid.size;
        const gridDistance = canvas.grid.distance;

        const points = [];
        
        const tokenWidth = document.width;
        const tokenHeight = document.height;
        
        const startX = token.x;
        const startY = token.y;
        const endX = startX + tokenWidth * gridSize;
        const endY = startY + tokenHeight * gridSize;

        const xSteps = Math.max(1, tokenWidth);
        const ySteps = Math.max(1, tokenHeight);

        let zSteps = 1;
        if (losHeight > 0) {
            zSteps = Math.max(1, Math.ceil(losHeight / gridDistance));
        }

        for (let xi = 0; xi <= xSteps; xi++) {
            for (let yi = 0; yi <= ySteps; yi++) {
                for (let zi = 0; zi < zSteps; zi++) {
                    const x = startX + (xi / xSteps) * (endX - startX);
                    const y = startY + (yi / ySteps) * (endY - startY);
                    const z = elevation + (zi / Math.max(1, zSteps - 1)) * losHeight;
                    
                    points.push({ x, y, z });
                }
            }
        }

        if (points.length === 0) {
            points.push({ 
                x: token.center.x, 
                y: token.center.y, 
                z: elevation 
            });
        }

        return points;
    }

    /**
     * Combine horizontal and vertical distances based on mode
     */
    static _combineDistances(horizontalDistance, elevation1, elevation2, verticalMode) {
        const verticalDelta = Math.abs(elevation1 - elevation2);

        switch (verticalMode) {
            case 'useCoreRuler':
                try {
                    const path = [
                        { x: 0, y: 0, z: elevation1 },
                        { x: horizontalDistance * canvas.grid.size / canvas.grid.distance, y: 0, z: elevation2 }
                    ];
                    const result = canvas.grid.measurePath(path, { gridSpaces: true });
                    return result?.distance ?? horizontalDistance;
                } catch (error) {
                    return Math.sqrt(horizontalDistance * horizontalDistance + verticalDelta * verticalDelta);
                }
            
            case 'euclidean':
                return Math.sqrt(horizontalDistance * horizontalDistance + verticalDelta * verticalDelta);
            
            case 'useHighest':
                return Math.max(horizontalDistance, verticalDelta);
            
            case 'ignore':
            default:
                return horizontalDistance;
        }
    }

    /**
     * Apply rounding based on settings
     */
    static _applyRounding(distance, roundingMode) {
        if (!roundingMode || roundingMode <= 0) {
            return Math.floor(distance);
        }

        const rounded = Math.round(distance / roundingMode) * roundingMode;
        return Math.round(rounded * 1000000) / 1000000;
    }

    /**
     * Get distance label using existing system
     */
    static getDistanceLabel(distance) {
        return DaggerheartMeasuredTemplate.getDistanceLabel(distance);
    }
}