export class SimpleTokenDocument extends TokenDocument {
  getBarAttribute(barName, {alternative}={}) {
    const data = super.getBarAttribute(barName, {alternative});
    const attr = alternative || this[barName]?.attribute;
    if ( !data || !attr || !this.actor ) return data;
    const current = foundry.utils.getProperty(this.actor.system, attr);
    if ( current?.dtype === "Resource" ) data.min = parseInt(current.min || 0);
    data.editable = true;
    return data;
  }
  static getTrackedAttributes(data, _path=[]) {
    if ( data || _path.length ) return super.getTrackedAttributes(data, _path);
    data = {};
    if (!game?.system?.model?.Actor) {
      return super.getTrackedAttributes(data);
    }
    for ( const model of Object.values(game.system.model.Actor) ) {
      foundry.utils.mergeObject(data, model);
    }
    for ( const actor of game.actors ) {
      if ( actor.isTemplate ) foundry.utils.mergeObject(data, actor.toObject());
    }
    return super.getTrackedAttributes(data);
  }
}
export class SimpleToken extends foundry.canvas.placeables.Token {
  _drawBar(number, bar, data) {
    if ( "min" in data ) {
    data = {...data};
      data.value -= data.min;
      data.max -= data.min;
    }
    return super._drawBar(number, bar, data);
  }
}
