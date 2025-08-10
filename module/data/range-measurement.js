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