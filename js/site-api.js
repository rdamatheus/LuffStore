import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, TENANT_SLUG } from './luff-config.js';

// Deliberately anonymous: an administrator visiting the storefront must see the
// same published content as a customer. Never reuse the admin auth client here.
export async function publicRows(table, params = {}) {
  const rows = [];
  for (let offset=0; ; offset+=500) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    Object.entries({...params,limit:500,offset}).forEach(([key,value])=>url.searchParams.set(key,String(value)));
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(),15000);
    let response;
    try {
      response = await fetch(url, {headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'Accept-Profile':'luff',Accept:'application/json'},signal:controller.signal,credentials:'omit'});
      if (!response.ok) throw new Error(`Não foi possível carregar ${table} (${response.status}).`);
      const page = await response.json();
      if (!Array.isArray(page)) throw new Error('Resposta de catálogo inválida.');
      rows.push(...page);
      if(page.length<500)return rows;
    } finally { clearTimeout(timer); }
  }
}
export async function publicTenant() {
  const rows=await publicRows('tenants',{select:'id',slug:`eq.${TENANT_SLUG}`});
  if(rows.length!==1)throw new Error('Loja não localizada.');
  return rows[0].id;
}
