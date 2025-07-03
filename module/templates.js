export const preloadHandlebarsTemplates = async function() {
  const templatePaths = [
  "systems/daggerheart/templates/parts/sheet-attributes.html",
    "systems/daggerheart/templates/parts/sheet-groups.html"
  ];
  return foundry.applications.handlebars.loadTemplates(templatePaths);
};
