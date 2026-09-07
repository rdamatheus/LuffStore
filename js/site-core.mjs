// Public presentation helpers. No administrative session or write operations.
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeURL(value, base = 'https://rdamatheus.github.io/LuffStore/') {
  if (typeof value !== 'string' || !value.trim() || /[\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value.trim(), base);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}
export function routeURL(type, value) { return `#${type}/${encodeURIComponent(value)}`; }
export function parseRoute(hash) {
  try {
    const [type, ...rest] = hash.replace(/^#/, '').split('/');
    return { type: type || 'inicio', slug: decodeURIComponent(rest.join('/')) };
  } catch { return {type:'invalid',slug:''}; }
}
export function money(value) {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) || Number(value) < 0) return null;
  return new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(Number(value));
}
export function inWindow(item, now = Date.now()) {
  const start = item.starts_at ? Date.parse(item.starts_at) : -Infinity;
  const end = item.ends_at ? Date.parse(item.ends_at) : Infinity;
  return start <= now && end >= now;
}
export function publicTaxonomy(families, categories) {
  const visibleFamilies = families.filter(f => f.is_active && f.show_on_site);
  const familyIds = new Set(visibleFamilies.map(f => f.id));
  const candidates = categories.filter(c => c.is_active && c.show_on_site && familyIds.has(c.family_id));
  const map = new Map(candidates.map(c => [c.id,c]));
  function valid(c, seen = new Set()) {
    if (seen.has(c.id)) return false;
    if (!c.parent_id) return true;
    seen.add(c.id);
    const parent = map.get(c.parent_id);
    return !!parent && parent.family_id === c.family_id && valid(parent,seen);
  }
  const sort = (a,b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name,'pt-BR');
  return {families:visibleFamilies.sort(sort), categories:candidates.filter(c=>valid(c)).sort(sort)};
}
export function categoryIds(categoryId, categories) {
  const result = new Set([categoryId]);
  let previous;
  do { previous=result.size; categories.forEach(c=>{if(result.has(c.parent_id))result.add(c.id);}); } while(result.size>previous);
  return result;
}
export function selectProducts(products, filter, categories) {
  const ids = filter.category ? categoryIds(filter.category,categories) : null;
  return products.filter(p => (!ids || ids.has(p.category_id)) && (!filter.family || p.family_id===filter.family || categories.some(c=>c.id===p.category_id&&c.family_id===filter.family)) && (!filter.featured || p.is_featured) && (!filter.new || p.is_new));
}
export function whatsappURL(number, message) {
  const digits = String(number ?? '').replace(/\D/g,'');
  if (!/^\d{10,15}$/.test(digits)) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
