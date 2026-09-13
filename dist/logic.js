export function filterCards(cards, mode, tags, match, effect='include') {
 return cards.filter(c => (mode !== 'identification' || c.tags.includes('Identification')) && (!tags.length || (effect==='exclude' ? !tags.some(t=>c.tags.includes(t)) : (match === 'all' ? tags.every(t => c.tags.includes(t)) : tags.some(t => c.tags.includes(t))))));
}
export function makeRun(cards, random = false, rng = Math.random) {
 const run = [...cards];
 if (random) for (let i = run.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [run[i], run[j]] = [run[j], run[i]]; }
 return run;
}
export function structureFor(card, cards) {
 return cards.find(c => c.section === card.section && JSON.stringify(c.path) === JSON.stringify(card.path) && c.tags.includes('Identification'))?.answer || '';
}
