/**
 * Create a Macro from an attribute drop.
 * Get an existing daggerheart macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
export async function createDaggerheartMacro(data, slot) {
  // Handle Item drops - create macro to send item to chat as card
  if (data.type === "Item") {
    const item = await fromUuid(data.uuid);
    if (!item) return false;
    
    // Create a simple macro command that matches the existing image click functionality
    const command = `// Send item to chat as card
const item = await fromUuid("${data.uuid}");
if (!item) {
  ui.notifications.warn("Item not found!");
  return;
}

const itemData = item.system;
const description = await TextEditor.enrichHTML(itemData.description, {secrets: item.isOwner, async: true});
const chatCard = \`
<div class="item-card-chat" data-item-id="\${item.id}" data-actor-id="\${item.parent?.id || ''}">
    <div class="card-image-container" style="background-image: url('\${item.img}')">
        <div class="card-header-text">
            <h3>\${item.name}</h3>
        </div>
    </div>
    <div class="card-content">
        <div class="card-subtitle">
            <span>\${itemData.category || ''} - \${itemData.rarity || ''}</span>
        </div>
        <div class="card-description">
            \${description}
        </div>
    </div>
</div>
\`;

ChatMessage.create({
    user: game.user.id,
    speaker: item.parent ? ChatMessage.getSpeaker({ actor: item.parent }) : ChatMessage.getSpeaker(),
    content: chatCard
});`;

    // Create the macro
    const macroName = `${item.name}`;
    let macro = game.macros.find(m => (m.name === macroName) && (m.command === command));
    
    if (!macro) {
      macro = await Macro.create({
        name: macroName,
        type: "script",
        img: item.img,
        command: command,
        flags: { "daggerheart.itemMacro": true }
      });
    }
    
    game.user.assignHotbarMacro(macro, slot);
    return false;
  }
  
    // Handle attribute roll drops (existing functionality)  
  if ( !data.roll || !data.label ) return false;
  const command = `const roll = new Roll("${data.roll}", actor ? actor.getRollData() : {});
  roll.toMessage({speaker, flavor: "${data.label}"});`;
  let macro = game.macros.find(m => (m.name === data.label) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: data.label,
      type: "script",
      command: command,
      flags: { "daggerheart.attrMacro": true }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}
