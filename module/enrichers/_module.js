import DhDualityRollEnricher from './duality-roll-enricher.js';

Hooks.once('setup', () => {
    CONFIG.TextEditor.enrichers.push({
        pattern: /\[\[\/dr\s?(.*?)\]\]({.*})?/g,
        enricher: DhDualityRollEnricher
    });
});
