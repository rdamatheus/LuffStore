import { supabase, TENANT_SLUG } from './luff-supabase.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (v = '') => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const slugify = (v = '') => v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const money = v => v == null ? '—' : Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dateBR = v => v ? new Date(v).toLocaleDateString('pt-BR') : '—';
const dtBR = v => v ? new Date(v).toLocaleString('pt-BR') : '—';
const roleLabels = { owner:'Owner', manager:'Manager', staff:'Staff' };
const statusLabels = { active:'Ativo', inactive:'Inativo', archived:'Arquivado', draft:'Rascunho', planned:'Planejado', paused:'Pausado', completed:'Concluído', idea:'Ideia', production:'Produção', ready:'Pronto', scheduled:'Agendado', published:'Publicado', suspended:'Suspenso', not_configured:'Não configurado', configured:'Configurado', error:'Erro', synced:'Sincronizado' };

const state = { session:null, tenant:null, member:null, view:'dashboard', families:[], categories:[], brands:[], attributes:[], attributeValues:[], products:[], collections:[], looks:[] };
const views = ['dashboard','taxonomy','products','brands','attributes','collections','looks','site','marketing','clients','indicators','integrations','team','logs'];
const viewMeta = {
  dashboard:['LUFF Digital','Visão geral'], taxonomy:['Catálogo','Famílias e categorias'], products:['Catálogo','Produtos'], brands:['Catálogo','Marcas'], attributes:['Catálogo','Atributos'], collections:['Catálogo','Coleções'], looks:['Catálogo','Looks'], site:['Presença digital','Site'], marketing:['Negócio','Marketing'], clients:['Negócio','Clientes'], indicators:['Negócio','Indicadores'], integrations:['Sistema','Integrações'], team:['Administração','Equipe'], logs:['Administração','Logs']
};

const content = $('#content');
const loginView = $('#loginView');
const app = $('#app');
const loginForm = $('#loginForm');
const loginError = $('#loginError');
const dialog = $('#entityDialog');
const entityForm = $('#entityForm');
const dialogFields = $('#dialogFields');
const dialogError = $('#dialogError');
let dialogSubmit = null;

const canManage = () => ['owner','manager'].includes(state.member?.role);
const isOwner = () => state.member?.role === 'owner';
const routeFromHash = () => {
  const v = location.hash.replace(/^#/,'').split('?')[0];
  return views.includes(v) ? v : 'dashboard';
};

function loading(msg='Carregando…'){ content.innerHTML = `<div class="loading">${esc(msg)}</div>`; }
function flash(msg, kind='success'){
  const el = document.createElement('div');
  el.className = `flash ${kind}`;
  el.textContent = msg;
  content.prepend(el);
  setTimeout(()=>el.remove(), 3500);
}
function showError(error, fallback='Não foi possível concluir a operação.'){
  console.error(error);
  const msg = error?.message || fallback;
  const el = document.createElement('div');
  el.className='flash danger'; el.textContent=msg; content.prepend(el);
}

async function audit(action, entityType, entityId=null, metadata={}){
  if(!state.tenant || !state.session) return;
  await supabase.from('audit_logs').insert({tenant_id:state.tenant.id,actor_user_id:state.session.user.id,action,entity_type:entityType,entity_id:entityId,metadata});
}

async function bootstrapSession(){
  const {data:{session},error}=await supabase.auth.getSession();
  if(error || !session) return showLogin();
  try { await authorize(session); } catch(e){ console.error(e); await supabase.auth.signOut(); showLogin('Sua conta não possui acesso ativo ao painel LUFF.'); }
}

async function authorize(session){
  state.session=session;
  const {data:tenant,error:te}=await supabase.from('tenants').select('*').eq('slug',TENANT_SLUG).single();
  if(te) throw te;
  const {data:member,error:me}=await supabase.from('members').select('*').eq('tenant_id',tenant.id).eq('user_id',session.user.id).eq('status','active').single();
  if(me || !member) throw me || new Error('Conta sem acesso.');
  state.tenant=tenant; state.member=member;
  showApp();
  await refreshIntegrationBadge();
  navigate(routeFromHash(), true);
}

function showLogin(message=''){
  app.hidden=true; loginView.hidden=false; loginError.textContent=message;
  if(location.hash) history.replaceState(null,'',location.pathname+location.search);
}
function showApp(){
  loginView.hidden=true; app.hidden=false;
  $('#userEmail').textContent=state.member?.email || state.session?.user?.email || '';
  $('#userRole').textContent=roleLabels[state.member?.role] || state.member?.role || '';
  $$('.owner-only').forEach(el=>el.hidden=!isOwner());
}
function navigate(view, replace=false){
  if(view==='logs' && !isOwner()) view='dashboard';
  const hash=`#${view}`;
  if(replace) history.replaceState(null,'',`${location.pathname}${location.search}${hash}`);
  else if(location.hash!==hash) history.pushState(null,'',`${location.pathname}${location.search}${hash}`);
  renderView(view);
}

loginForm.addEventListener('submit', async e=>{
  e.preventDefault(); loginError.textContent='';
  const btn=$('button[type="submit"]',loginForm); btn.disabled=true; btn.textContent='Entrando…';
  try{
    const {data,error}=await supabase.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});
    if(error) throw error;
    if(!data.session) throw new Error('Sessão não foi criada.');
    await authorize(data.session);
    history.replaceState(null,'',`${location.pathname}${location.search}#dashboard`);
    await renderView('dashboard');
  }catch(error){
    console.error(error);
    loginError.textContent=error?.message==='Invalid login credentials'?'E-mail ou senha inválidos.':(error?.message||'Não foi possível entrar.');
  }finally{ btn.disabled=false; btn.textContent='Entrar'; }
});

$('#logoutBtn').addEventListener('click', async()=>{ await supabase.auth.signOut(); showLogin(); });
$$('.nav-item').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.view)));
window.addEventListener('popstate',()=>state.session&&renderView(routeFromHash()));

async function renderView(view){
  if(view==='logs'&&!isOwner()) view='dashboard'; state.view=view;
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  const [eyebrow,title]=viewMeta[view]||['LUFF Digital','Painel'];
  $('#sectionEyebrow').textContent=eyebrow; $('#sectionTitle').textContent=title; loading();
  try{
    const renderers={dashboard:renderDashboard,taxonomy:renderTaxonomy,products:renderProducts,brands:renderBrands,attributes:renderAttributes,collections:renderCollections,looks:renderLooks,site:renderSite,marketing:renderMarketing,clients:renderClients,indicators:renderIndicators,integrations:renderIntegrations,team:renderTeam,logs:renderLogs};
    await renderers[view]();
  }catch(error){ content.innerHTML='<div class="empty">Não foi possível carregar esta área.</div>'; showError(error); }
}

async function refreshIntegrationBadge(){
  const {data}=await supabase.from('integration_connections').select('provider,status,last_synced_at').eq('tenant_id',state.tenant.id).eq('provider','velo').maybeSingle();
  const b=$('#syncBadge');
  if(!data||data.status==='not_configured'){b.className='status neutral';b.textContent='Velo não configurado';return;}
  b.className=`status ${data.status==='active'?'success':data.status==='error'?'danger':'warning'}`; b.textContent=`Velo · ${statusLabels[data.status]||data.status}`;
}

async function count(table, fn=q=>q){ let q=supabase.from(table).select('id',{count:'exact',head:true}).eq('tenant_id',state.tenant.id); q=fn(q); const {count,error}=await q; if(error)throw error; return count||0; }
function metric(label,value,small){return `<div class="metric"><span>${esc(label)}</span><strong>${typeof value==='number'?value.toLocaleString('pt-BR'):esc(value)}</strong><small>${esc(small)}</small></div>`;}

async function renderDashboard(){
  const [products,categories,collections,looks,campaigns,clients,banners,published]=await Promise.all([count('products'),count('catalog_categories'),count('collections'),count('looks'),count('marketing_campaigns'),count('customers'),count('site_banners'),count('products',q=>q.eq('published',true))]);
  const {data:sales}=await supabase.from('sales_daily').select('*').eq('tenant_id',state.tenant.id).order('sale_date',{ascending:false}).limit(1);
  const latest=sales?.[0];
  content.innerHTML=`<section class="hero-card"><div><span class="eyebrow">LUFF Store</span><h2>Operação digital</h2><p>Catálogo, site, marketing, clientes, equipe e integração em uma única operação.</p></div><span class="badge gold">v0.3 · Operacional</span></section>
  <div class="metric-grid">${metric('Produtos',products,`${published} publicados`)}${metric('Categorias',categories,'Taxonomia LUFF')}${metric('Clientes',clients,'CRM interno')}${metric('Campanhas',campaigns,'Marketing')}</div>
  <div class="split"><section class="panel"><div class="panel-head"><div><h2>Prontidão</h2><p>Estado atual dos módulos.</p></div></div><div class="mini-list"><div class="mini-item"><span>Taxonomia</span><span class="badge green">Ativa</span></div><div class="mini-item"><span>Banners</span><strong>${banners}</strong></div><div class="mini-item"><span>Coleções</span><strong>${collections}</strong></div><div class="mini-item"><span>Looks</span><strong>${looks}</strong></div><div class="mini-item"><span>RLS e permissões</span><span class="badge green">Ativas</span></div></div></section>
  <section class="panel"><div class="panel-head"><div><h2>Indicador mais recente</h2><p>Será alimentado pelo Velo.</p></div></div>${latest?`<div class="mini-list"><div class="mini-item"><span>Data</span><strong>${dateBR(latest.sale_date)}</strong></div><div class="mini-item"><span>Venda líquida</span><strong>${money(latest.net_sales)}</strong></div><div class="mini-item"><span>Pedidos</span><strong>${latest.orders_count}</strong></div></div>`:'<div class="empty compact">Sem dados de vendas ainda. A estrutura já está pronta para a sincronização do Velo.</div>'}</section></div>`;
}

async function loadTaxonomy(){
  const [{data:f,error:fe},{data:c,error:ce}]=await Promise.all([supabase.from('catalog_families').select('*').eq('tenant_id',state.tenant.id).order('sort_order'),supabase.from('catalog_categories').select('*').eq('tenant_id',state.tenant.id).order('sort_order')]); if(fe)throw fe;if(ce)throw ce;state.families=f||[];state.categories=c||[];
}
function categoryTreeRow(c){ const kids=state.categories.filter(x=>x.parent_id===c.id); return `<div class="tree-row"><div class="tree-name"><strong>${esc(c.name)}</strong><div class="subtle">/${esc(c.slug)}</div></div><span class="subtle">${c.show_on_site?'No site':'Interna'}</span>${canManage()?`<button class="btn small secondary" data-action="edit-category" data-id="${c.id}">Editar</button>`:''}</div>${kids.map(k=>`<div class="tree-row child"><div class="tree-name">${esc(k.name)}<div class="subtle">/${esc(k.slug)}</div></div><span class="subtle">Subcategoria</span>${canManage()?`<button class="btn small secondary" data-action="edit-category" data-id="${k.id}">Editar</button>`:''}</div>`).join('')}`; }
async function renderTaxonomy(){ await loadTaxonomy(); const actions=canManage()?'<button class="btn primary" data-action="new-category">Nova categoria</button><button class="btn secondary" data-action="new-family">Nova família</button>':''; content.innerHTML=`<section class="panel"><div class="panel-head"><div><h2>Central de taxonomia</h2><p>Família → Categoria → Subcategoria.</p></div><div class="toolbar">${actions}</div></div><div class="tree">${state.families.map(f=>{const top=state.categories.filter(c=>c.family_id===f.id&&!c.parent_id);return `<div class="tree-family"><div class="tree-family-head"><div><strong>${esc(f.name)}</strong> <span class="badge ${f.is_active?'green':''}">${f.is_active?'Ativa':'Inativa'}</span><div class="subtle">${top.length} categorias principais</div></div>${canManage()?`<button class="btn small secondary" data-action="edit-family" data-id="${f.id}">Editar</button>`:''}</div><div class="tree-rows">${top.map(categoryTreeRow).join('')||'<div class="empty compact">Sem categorias.</div>'}</div></div>`}).join('')}</div></section>`; }

async function renderProducts(){
  const [{data:p,error},{data:c},{data:b}]=await Promise.all([supabase.from('products').select('*').eq('tenant_id',state.tenant.id).order('updated_at',{ascending:false}).limit(500),supabase.from('catalog_categories').select('id,name').eq('tenant_id',state.tenant.id),supabase.from('brands').select('id,name').eq('tenant_id',state.tenant.id)]); if(error)throw error; state.products=p||[]; state.categories=c||[]; state.brands=b||[];
  const cm=Object.fromEntries(state.categories.map(x=>[x.id,x.name])), bm=Object.fromEntries(state.brands.map(x=>[x.id,x.name]));
  const rows=state.products.map(x=>`<tr data-filter-row="${esc(`${x.name} ${x.commercial_name||''} ${x.sku_base||''}`.toLowerCase())}"><td><strong>${esc(x.commercial_name||x.name)}</strong><div class="subtle">${esc(x.sku_base||x.external_reference||'Sem SKU')}</div></td><td>${esc(cm[x.category_id]||'—')}</td><td>${esc(bm[x.brand_id]||'—')}</td><td>${money(x.price)}</td><td><span class="badge ${x.published?'green':''}">${x.published?'Publicado':statusLabels[x.status]||x.status}</span></td><td>${canManage()?`<button class="btn small secondary" data-action="edit-product" data-id="${x.id}">Editar digital</button>`:''}</td></tr>`).join('');
  content.innerHTML=`<div class="callout"><strong>Regra:</strong> preço, estoque, SKU e variações serão sincronizados pelo Velo. O painel edita somente a camada digital e editorial.</div><section class="panel"><div class="panel-head"><div><h2>Produtos</h2><p>Catálogo canônico da LUFF.</p></div><input class="search" data-filter-input placeholder="Buscar produto…"></div>${rows?`<div class="table-wrap"><table><thead><tr><th>Produto</th><th>Categoria</th><th>Marca</th><th>Preço</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="empty">Nenhum produto sincronizado ainda. A tela ficará ativa automaticamente quando o Velo for conectado.</div>'}</section>`;
}

async function renderBrands(){ const {data,error}=await supabase.from('brands').select('*').eq('tenant_id',state.tenant.id).order('name');if(error)throw error;state.brands=data||[];const rows=state.brands.map(x=>`<tr><td><strong>${esc(x.name)}</strong><div class="subtle">/${esc(x.slug)}</div></td><td>${x.is_active?'Ativa':'Inativa'}</td><td>${canManage()?`<button class="btn small secondary" data-action="edit-brand" data-id="${x.id}">Editar</button>`:''}</td></tr>`).join('');content.innerHTML=`<section class="panel"><div class="panel-head"><div><h2>Marcas</h2><p>Marcas permanecem separadas da taxonomia.</p></div>${canManage()?'<button class="btn primary" data-action="new-brand">Nova marca</button>':''}</div>${rows?`<div class="table-wrap"><table><thead><tr><th>Marca</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="empty">Nenhuma marca cadastrada.</div>'}</section>`; }

async function renderAttributes(){ const [{data:a,error},{data:v}]=await Promise.all([supabase.from('attributes').select('*').eq('tenant_id',state.tenant.id).order('sort_order'),supabase.from('attribute_values').select('*').eq('tenant_id',state.tenant.id).order('sort_order')]);if(error)throw error;state.attributes=a||[];state.attributeValues=v||[];content.innerHTML=`<section class="panel"><div class="panel-head"><div><h2>Atributos de moda</h2><p>Cor, tamanho, modelagem, material e ocasião.</p></div></div><div class="planned-grid">${state.attributes.map(x=>{const vals=state.attributeValues.filter(v=>v.attribute_id===x.id);return `<div class="planned-card"><span class="kicker">${x.is_variant?'Variação':'Editorial'}</span><h3>${esc(x.name)}</h3><p>${vals.slice(0,12).map(v=>esc(v.label)).join(' · ')||'Sem valores'}</p></div>`}).join('')}</div></section>`; }

async function renderCollections(){ const {data,error}=await supabase.from('collections').select('*').eq('tenant_id',state.tenant.id).order('updated_at',{ascending:false});if(error)throw error;state.collections=data||[];const rows=state.collections.map(x=>`<tr><td><strong>${esc(x.name)}</strong><div class="subtle">/${esc(x.slug)}</div></td><td>${statusLabels[x.status]||x.status}</td><td>${x.show_on_site?'Sim':'Não'}</td><td>${canManage()?`<div class="row-actions"><button class="btn small secondary" data-action="edit-collection" data-id="${x.id}">Editar</button><button class="btn small secondary" data-action="collection-items" data-id="${x.id}">Produtos</button></div>`:''}</td></tr>`).join('');content.innerHTML=`<section class="panel"><div class="panel-head"><div><h2>Coleções</h2><p>Curadorias independentes das categorias.</p></div>${canManage()?'<button class="btn primary" data-action="new-collection">Nova coleção</button>':''}</div>${rows?`<div class="table-wrap"><table><thead><tr><th>Coleção</th><th>Status</th><th>No site</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="empty">Nenhuma coleção cadastrada.</div>'}</section>`; }

async function renderLooks(){ const {data,error}=await supabase.from('looks').select('*').eq('tenant_id',state.tenant.id).order('updated_at',{ascending:false});if(error)throw error;state.looks=data||[];const rows=state.looks.map(x=>`<tr><td><strong>${esc(x.name)}</strong><div class="subtle">${esc(x.occasion||'Sem ocasião')}</div></td><td>${statusLabels[x.status]||x.status}</td><td>${x.published?'Sim':'Não'}</td><td>${canManage()?`<div class="row-actions"><button class="btn small secondary" data-action="edit-look" data-id="${x.id}">Editar</button><button class="btn small secondary" data-action="look-items" data-id="${x.id}">Produtos</button></div>`:''}</td></tr>`).join('');content.innerHTML=`<section class="panel"><div class="panel-head"><div><h2>Looks</h2><p>Combinações comerciais reutilizáveis no site e atendimento.</p></div>${canManage()?'<button class="btn primary" data-action="new-look">Novo look</button>':''}</div>${rows?`<div class="table-wrap"><table><thead><tr><th>Look</th><th>Status</th><th>Publicado</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="empty">Nenhum look cadastrado.</div>'}</section>`; }

async function renderSite(){
  const [{data:settings,error},{data:banners},{data:sections}]=await Promise.all([supabase.from('site_settings').select('*').eq('tenant_id',state.tenant.id).maybeSingle(),supabase.from('site_banners').select('*').eq('tenant_id',state.tenant.id).order('sort_order'),supabase.from('site_sections').select('*').eq('tenant_id',state.tenant.id).order('sort_order')]);if(error)throw error;
  content.innerHTML=`<div class="split"><section class="panel"><div class="panel-head"><div><h2>Configurações do site</h2><p>Identidade, contato e SEO.</p></div>${canManage()?'<button class="btn primary" data-action="edit-site-settings">Editar</button>':''}</div><div class="mini-list"><div class="mini-item"><span>Marca</span><strong>${esc(settings?.brand_name||'LUFF Store')}</strong></div><div class="mini-item"><span>Slogan</span><strong>${esc(settings?.slogan||'—')}</strong></div><div class="mini-item"><span>WhatsApp</span><strong>${esc(settings?.whatsapp||'—')}</strong></div><div class="mini-item"><span>Instagram</span><strong>${esc(settings?.instagram||'—')}</strong></div><div class="mini-item"><span>Publicação</span><span class="badge ${settings?.is_published?'green':''}">${settings?.is_published?'Publicada':'Rascunho'}</span></div></div></section>
  <section class="panel"><div class="panel-head"><div><h2>Seções da Home</h2><p>Ordem editorial.</p></div></div><div class="mini-list">${(sections||[]).map(s=>`<div class="mini-item"><span>${esc(s.title)}</span><span class="badge ${s.is_active?'green':''}">${s.is_active?'Ativa':'Inativa'}</span></div>`).join('')}</div></section></div>
  <section class="panel"><div class="panel-head"><div><h2>Banners</h2><p>Campanhas e destaques visuais da Home.</p></div>${canManage()?'<button class="btn primary" data-action="new-banner">Novo banner</button>':''}</div>${(banners||[]).length?`<div class="table-wrap"><table><thead><tr><th>Título</th><th>CTA</th><th>Ordem</th><th>Status</th><th></th></tr></thead><tbody>${banners.map(b=>`<tr><td><strong>${esc(b.title)}</strong><div class="subtle">${esc(b.subtitle||'')}</div></td><td>${esc(b.cta_label||'—')}</td><td>${b.sort_order}</td><td>${b.is_active?'Ativo':'Inativo'}</td><td>${canManage()?`<button class="btn small secondary" data-action="edit-banner" data-id="${b.id}">Editar</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Nenhum banner cadastrado.</div>'}</section>`;
}

async function renderMarketing(){
  const [{data:campaigns,error},{data:items}]=await Promise.all([supabase.from('marketing_campaigns').select('*').eq('tenant_id',state.tenant.id).order('updated_at',{ascending:false}),supabase.from('marketing_content').select('*').eq('tenant_id',state.tenant.id).order('scheduled_at',{ascending:true})]);if(error)throw error;
  content.innerHTML=`<div class="split"><section class="panel"><div class="panel-head"><div><h2>Campanhas</h2><p>Planejamento de ações comerciais.</p></div>${canManage()?'<button class="btn primary" data-action="new-campaign">Nova campanha</button>':''}</div>${(campaigns||[]).length?`<div class="mini-list">${campaigns.map(c=>`<div class="mini-item"><div><strong>${esc(c.name)}</strong><div class="subtle">${esc(c.channel||'Multicanal')} · ${dateBR(c.starts_at)}</div></div><div class="row-actions"><span class="badge">${esc(statusLabels[c.status]||c.status)}</span>${canManage()?`<button class="btn small secondary" data-action="edit-campaign" data-id="${c.id}">Editar</button>`:''}</div></div>`).join('')}</div>`:'<div class="empty compact">Nenhuma campanha.</div>'}</section>
  <section class="panel"><div class="panel-head"><div><h2>Conteúdo</h2><p>Ideia → produção → publicação.</p></div>${canManage()?'<button class="btn primary" data-action="new-content">Novo conteúdo</button>':''}</div>${(items||[]).length?`<div class="mini-list">${items.map(i=>`<div class="mini-item"><div><strong>${esc(i.title)}</strong><div class="subtle">${esc(i.channel)} · ${esc(i.content_type)} · ${i.scheduled_at?dtBR(i.scheduled_at):'sem data'}</div></div><div class="row-actions"><span class="badge">${esc(statusLabels[i.status]||i.status)}</span>${canManage()?`<button class="btn small secondary" data-action="edit-content" data-id="${i.id}">Editar</button>`:''}</div></div>`).join('')}</div>`:'<div class="empty compact">Nenhum conteúdo.</div>'}</section></div>`;
}

async function renderClients(){ const {data,error}=await supabase.from('customers').select('*').eq('tenant_id',state.tenant.id).order('updated_at',{ascending:false}).limit(500);if(error)throw error;const rows=(data||[]).map(c=>`<tr data-filter-row="${esc(`${c.name} ${c.phone||''} ${c.email||''}`.toLowerCase())}"><td><strong>${esc(c.name)}</strong><div class="subtle">${esc(c.phone||c.email||'Sem contato')}</div></td><td>${esc(c.clothing_size||'—')}</td><td>${esc(c.pants_size||'—')}</td><td>${esc(c.shoe_size||'—')}</td><td>${c.marketing_consent?'Sim':'Não'}</td><td>${canManage()?`<button class="btn small secondary" data-action="edit-client" data-id="${c.id}">Editar</button>`:''}</td></tr>`).join('');content.innerHTML=`<section class="panel"><div class="panel-head"><div><h2>Clientes</h2><p>CRM, tamanhos e preferências.</p></div><div class="toolbar"><input class="search" data-filter-input placeholder="Buscar cliente…">${canManage()?'<button class="btn primary" data-action="new-client">Novo cliente</button>':''}</div></div>${rows?`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Roupa</th><th>Calça</th><th>Calçado</th><th>Marketing</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="empty">Nenhum cliente cadastrado. Quando o Velo for integrado, o CRM poderá ser sincronizado.</div>'}</section>`; }

async function renderIndicators(){ const {data,error}=await supabase.from('sales_daily').select('*').eq('tenant_id',state.tenant.id).order('sale_date',{ascending:false}).limit(90);if(error)throw error;const rows=data||[];const total=rows.reduce((a,x)=>a+Number(x.net_sales||0),0), orders=rows.reduce((a,x)=>a+Number(x.orders_count||0),0), items=rows.reduce((a,x)=>a+Number(x.items_count||0),0);const ticket=orders?total/orders:0, ipp=orders?items/orders:0;content.innerHTML=`<div class="metric-grid">${metric('Venda líquida',money(total),'Período carregado')}${metric('Pedidos',orders,'Período carregado')}${metric('Ticket médio',money(ticket),'Venda líquida ÷ pedidos')}${metric('Itens por pedido',ipp.toFixed(2).replace('.',','),'Peças por atendimento')}</div><section class="panel"><div class="panel-head"><div><h2>Histórico diário</h2><p>Fonte prevista: Velo.</p></div></div>${rows.length?`<div class="table-wrap"><table><thead><tr><th>Data</th><th>Venda líquida</th><th>Pedidos</th><th>Itens</th><th>Clientes</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${dateBR(x.sale_date)}</td><td>${money(x.net_sales)}</td><td>${x.orders_count}</td><td>${x.items_count}</td><td>${x.customers_count}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Ainda não existem dados de venda. O módulo está pronto para receber os indicadores quando o Velo for homologado.</div>'}</section>`; }

async function renderIntegrations(){ const {data,error}=await supabase.from('integration_connections').select('*').eq('tenant_id',state.tenant.id).order('provider');if(error)throw error;content.innerHTML=`<section class="panel"><div class="panel-head"><div><h2>Integrações</h2><p>Conectores externos isolados do catálogo canônico.</p></div></div>${(data||[]).map(i=>`<div class="planned-card"><span class="kicker">ERP</span><h3>${esc(i.provider.toUpperCase())}</h3><p>Status: <strong>${esc(statusLabels[i.status]||i.status)}</strong></p><p>${esc(i.config?.notes||'')}</p><div style="margin-top:14px"><span class="badge ${i.status==='active'?'green':'gold'}">${esc(i.status)}</span></div></div>`).join('')||'<div class="empty">Nenhuma integração.</div>'}</section>`; }

async function invokeUsers(body){ const {data,error}=await supabase.functions.invoke('luff-admin-users',{body}); if(error)throw error; if(data?.error)throw new Error(data.error); return data; }
async function renderTeam(){
  if(!isOwner()){
    const {data,error}=await supabase.from('members').select('*').eq('tenant_id',state.tenant.id).order('created_at');if(error)throw error;content.innerHTML=`<section class="panel"><div class="panel-head"><div><h2>Equipe</h2><p>Consulta de usuários autorizados.</p></div></div><div class="mini-list">${(data||[]).map(m=>`<div class="mini-item"><span>${esc(m.display_name||m.email||m.user_id)}</span><span class="badge dark">${esc(roleLabels[m.role]||m.role)}</span></div>`).join('')}</div></section>`;return;
  }
  const data=await invokeUsers({action:'list'}); const users=data.users||[];
  content.innerHTML=`<div class="callout"><strong>Acesso interno:</strong> não existe cadastro público. Somente o Owner cria contas e define permissões.</div><section class="panel"><div class="panel-head"><div><h2>Equipe e permissões</h2><p>Owner, Manager e Staff.</p></div><button class="btn primary" data-action="new-user">Novo usuário</button></div><div class="table-wrap"><table><thead><tr><th>Usuário</th><th>E-mail</th><th>Papel</th><th>Status</th><th>Último acesso</th><th></th></tr></thead><tbody>${users.map(u=>`<tr><td><strong>${esc(u.display_name)}</strong></td><td>${esc(u.email||'—')}</td><td><span class="badge dark">${esc(roleLabels[u.role]||u.role)}</span></td><td>${esc(statusLabels[u.status]||u.status)}</td><td>${dtBR(u.last_sign_in_at)}</td><td><div class="row-actions"><button class="btn small secondary" data-action="edit-user" data-id="${u.user_id}" data-json="${esc(JSON.stringify(u))}">Editar</button><button class="btn small secondary" data-action="password-user" data-id="${u.user_id}">Senha</button></div></td></tr>`).join('')}</tbody></table></div></section>`;
}

async function renderLogs(){ const {data,error}=await supabase.from('audit_logs').select('*').eq('tenant_id',state.tenant.id).order('created_at',{ascending:false}).limit(200);if(error)throw error;content.innerHTML=`<section class="panel"><div class="panel-head"><div><h2>Auditoria</h2><p>Últimas 200 ações registradas.</p></div></div>${(data||[]).length?`<div class="table-wrap"><table><thead><tr><th>Data</th><th>Ação</th><th>Entidade</th><th>Usuário</th></tr></thead><tbody>${data.map(l=>`<tr><td>${dtBR(l.created_at)}</td><td><strong>${esc(l.action)}</strong></td><td>${esc(l.entity_type)}</td><td>${esc(l.actor_user_id||'Sistema')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Nenhum log.</div>'}</section>`; }

function fieldHtml(f,v){
  const val=v?.[f.name]; const cls=f.wide?'wide':'';
  if(f.type==='checkbox') return `<label class="check ${cls}"><input name="${f.name}" type="checkbox" ${val?'checked':''}> <span>${esc(f.label)}</span></label>`;
  if(f.type==='textarea') return `<label class="${cls}">${esc(f.label)}<textarea name="${f.name}" rows="${f.rows||4}" ${f.required?'required':''}>${esc(val||'')}</textarea></label>`;
  if(f.type==='select') return `<label class="${cls}">${esc(f.label)}<select name="${f.name}" ${f.required?'required':''}><option value="">${esc(f.placeholder||'Selecione')}</option>${(f.options||[]).map(o=>`<option value="${esc(o.value)}" ${String(val??'')===String(o.value)?'selected':''}>${esc(o.label)}</option>`).join('')}</select></label>`;
  if(f.type==='multiselect') { const selected=new Set(f.value||[]); return `<label class="${cls}">${esc(f.label)}<select name="${f.name}" multiple size="${f.size||8}">${(f.options||[]).map(o=>`<option value="${esc(o.value)}" ${selected.has(o.value)?'selected':''}>${esc(o.label)}</option>`).join('')}</select><span class="subtle">Use Ctrl/Cmd para selecionar vários.</span></label>`; }
  return `<label class="${cls}">${esc(f.label)}<input name="${f.name}" type="${f.type||'text'}" value="${esc(val??'')}" ${f.required?'required':''} ${f.min!=null?`min="${f.min}"`:''} ${f.step?`step="${f.step}"`:''}></label>`;
}
function openDialog({title,eyebrow='Cadastro',fields,values={},onSubmit}){ $('#dialogEyebrow').textContent=eyebrow;$('#dialogTitle').textContent=title;dialogError.textContent='';dialogFields.innerHTML=fields.map(f=>fieldHtml(f,values)).join('');dialogSubmit=async fd=>onSubmit(fd);dialog.showModal(); }
function closeDialog(){dialog.close();dialogSubmit=null;}
$('#dialogClose').onclick=closeDialog; $('#dialogCancel').onclick=closeDialog;
entityForm.addEventListener('submit',async e=>{e.preventDefault();if(!dialogSubmit)return;const btn=$('button[type="submit"]',entityForm);btn.disabled=true;dialogError.textContent='';try{const fd=new FormData(entityForm);await dialogSubmit(fd);closeDialog();await renderView(state.view);flash('Alteração salva.');}catch(error){console.error(error);dialogError.textContent=error?.message||'Não foi possível salvar.';}finally{btn.disabled=false;}});
const val=(fd,n)=>String(fd.get(n)||'').trim(); const bool=(fd,n)=>fd.get(n)==='on'; const num=(fd,n)=>{const x=val(fd,n);return x===''?null:Number(x)};

async function save(table,payload,id){ let q=id?supabase.from(table).update(payload).eq('tenant_id',state.tenant.id).eq('id',id):supabase.from(table).insert({tenant_id:state.tenant.id,...payload});const {data,error}=await q.select('*').single();if(error)throw error;await audit(id?'update':'create',table,data.id);return data; }

function openFamily(item={}){openDialog({title:item.id?'Editar família':'Nova família',fields:[{name:'name',label:'Nome',required:true},{name:'slug',label:'Slug'},{name:'sort_order',label:'Ordem',type:'number'},{name:'is_active',label:'Ativa',type:'checkbox'},{name:'show_on_site',label:'Exibir no site',type:'checkbox'}],values:{sort_order:0,is_active:true,...item},onSubmit:fd=>save('catalog_families',{name:val(fd,'name'),slug:val(fd,'slug')||slugify(val(fd,'name')),sort_order:num(fd,'sort_order')||0,is_active:bool(fd,'is_active'),show_on_site:bool(fd,'show_on_site')},item.id)});}
function openCategory(item={}){const familyOpts=state.families.map(x=>({value:x.id,label:x.name}));const parentOpts=state.categories.filter(x=>!x.parent_id&&x.id!==item.id).map(x=>({value:x.id,label:x.name}));openDialog({title:item.id?'Editar categoria':'Nova categoria',fields:[{name:'name',label:'Nome',required:true},{name:'slug',label:'Slug'},{name:'family_id',label:'Família',type:'select',options:familyOpts,required:true},{name:'parent_id',label:'Categoria-pai',type:'select',options:parentOpts},{name:'sort_order',label:'Ordem',type:'number'},{name:'description',label:'Descrição',type:'textarea',wide:true},{name:'is_active',label:'Ativa',type:'checkbox'},{name:'show_on_site',label:'Exibir no site',type:'checkbox'},{name:'show_in_menu',label:'Exibir no menu',type:'checkbox'},{name:'is_featured',label:'Destaque',type:'checkbox'}],values:{sort_order:0,is_active:true,...item},onSubmit:fd=>save('catalog_categories',{name:val(fd,'name'),slug:val(fd,'slug')||slugify(val(fd,'name')),family_id:val(fd,'family_id'),parent_id:val(fd,'parent_id')||null,sort_order:num(fd,'sort_order')||0,description:val(fd,'description')||null,is_active:bool(fd,'is_active'),show_on_site:bool(fd,'show_on_site'),show_in_menu:bool(fd,'show_in_menu'),is_featured:bool(fd,'is_featured')},item.id)});}
function openBrand(item={}){openDialog({title:item.id?'Editar marca':'Nova marca',fields:[{name:'name',label:'Nome',required:true},{name:'slug',label:'Slug'},{name:'logo_url',label:'Logo URL',type:'url'},{name:'description',label:'Descrição',type:'textarea',wide:true},{name:'is_active',label:'Ativa',type:'checkbox'}],values:{is_active:true,...item},onSubmit:fd=>save('brands',{name:val(fd,'name'),slug:val(fd,'slug')||slugify(val(fd,'name')),logo_url:val(fd,'logo_url')||null,description:val(fd,'description')||null,is_active:bool(fd,'is_active')},item.id)});}
async function openProduct(item){const {data:media}=await supabase.from('product_media').select('*').eq('tenant_id',state.tenant.id).eq('product_id',item.id).eq('is_primary',true).order('sort_order').limit(1).maybeSingle();openDialog({title:`Editar ${item.commercial_name||item.name}`,eyebrow:'Camada digital',fields:[{name:'commercial_name',label:'Nome comercial'},{name:'category_id',label:'Categoria',type:'select',options:state.categories.map(x=>({value:x.id,label:x.name}))},{name:'brand_id',label:'Marca',type:'select',options:state.brands.map(x=>({value:x.id,label:x.name}))},{name:'short_description',label:'Descrição curta',type:'textarea',wide:true},{name:'description',label:'Descrição completa',type:'textarea',wide:true,rows:6},{name:'primary_image_url',label:'Imagem principal URL',type:'url',wide:true},{name:'seo_title',label:'SEO title',wide:true},{name:'seo_description',label:'SEO description',type:'textarea',wide:true},{name:'published',label:'Publicado',type:'checkbox'},{name:'is_featured',label:'Destaque',type:'checkbox'},{name:'is_new',label:'Novidade',type:'checkbox'}],values:{...item,primary_image_url:media?.url||''},onSubmit:async fd=>{const updated=await save('products',{commercial_name:val(fd,'commercial_name')||null,category_id:val(fd,'category_id')||null,brand_id:val(fd,'brand_id')||null,short_description:val(fd,'short_description')||null,description:val(fd,'description')||null,seo_title:val(fd,'seo_title')||null,seo_description:val(fd,'seo_description')||null,published:bool(fd,'published'),is_featured:bool(fd,'is_featured'),is_new:bool(fd,'is_new')},item.id);const url=val(fd,'primary_image_url');if(url){if(media){const {error}=await supabase.from('product_media').update({url,alt_text:updated.commercial_name||updated.name}).eq('tenant_id',state.tenant.id).eq('id',media.id);if(error)throw error;}else{const {error}=await supabase.from('product_media').insert({tenant_id:state.tenant.id,product_id:item.id,url,alt_text:updated.commercial_name||updated.name,is_primary:true,sort_order:0});if(error)throw error;}}}});}
function openCollection(item={}){openDialog({title:item.id?'Editar coleção':'Nova coleção',fields:[{name:'name',label:'Nome',required:true},{name:'slug',label:'Slug'},{name:'description',label:'Descrição',type:'textarea',wide:true},{name:'cover_url',label:'Capa URL',type:'url',wide:true},{name:'status',label:'Status',type:'select',required:true,options:['active','inactive','archived'].map(x=>({value:x,label:statusLabels[x]}))},{name:'show_on_site',label:'Exibir no site',type:'checkbox'},{name:'starts_at',label:'Início',type:'datetime-local'},{name:'ends_at',label:'Fim',type:'datetime-local'}],values:{status:'active',...item,starts_at:item.starts_at?.slice?.(0,16)||'',ends_at:item.ends_at?.slice?.(0,16)||''},onSubmit:fd=>save('collections',{name:val(fd,'name'),slug:val(fd,'slug')||slugify(val(fd,'name')),description:val(fd,'description')||null,cover_url:val(fd,'cover_url')||null,status:val(fd,'status'),show_on_site:bool(fd,'show_on_site'),starts_at:val(fd,'starts_at')||null,ends_at:val(fd,'ends_at')||null},item.id)});}
function openLook(item={}){openDialog({title:item.id?'Editar look':'Novo look',fields:[{name:'name',label:'Nome',required:true},{name:'slug',label:'Slug'},{name:'occasion',label:'Ocasião'},{name:'description',label:'Descrição',type:'textarea',wide:true},{name:'cover_url',label:'Capa URL',type:'url',wide:true},{name:'status',label:'Status',type:'select',required:true,options:['draft','active','inactive','archived'].map(x=>({value:x,label:statusLabels[x]}))},{name:'published',label:'Publicado',type:'checkbox'}],values:{status:'draft',...item},onSubmit:fd=>save('looks',{name:val(fd,'name'),slug:val(fd,'slug')||slugify(val(fd,'name')),occasion:val(fd,'occasion')||null,description:val(fd,'description')||null,cover_url:val(fd,'cover_url')||null,status:val(fd,'status'),published:bool(fd,'published')},item.id)});}
async function openCollectionItems(item){const [{data:p},{data:links}]=await Promise.all([supabase.from('products').select('id,name,commercial_name').eq('tenant_id',state.tenant.id).order('name'),supabase.from('collection_products').select('product_id').eq('tenant_id',state.tenant.id).eq('collection_id',item.id)]);openDialog({title:`Produtos · ${item.name}`,fields:[{name:'products',label:'Produtos',type:'multiselect',wide:true,size:12,options:(p||[]).map(x=>({value:x.id,label:x.commercial_name||x.name})),value:(links||[]).map(x=>x.product_id)}],onSubmit:async fd=>{const selected=fd.getAll('products').map(String);const {error:de}=await supabase.from('collection_products').delete().eq('tenant_id',state.tenant.id).eq('collection_id',item.id);if(de)throw de;if(selected.length){const {error}=await supabase.from('collection_products').insert(selected.map((product_id,i)=>({tenant_id:state.tenant.id,collection_id:item.id,product_id,sort_order:i})));if(error)throw error;}await audit('update_items','collections',item.id,{count:selected.length});}});}
async function openLookItems(item){const [{data:p},{data:links}]=await Promise.all([supabase.from('products').select('id,name,commercial_name').eq('tenant_id',state.tenant.id).order('name'),supabase.from('look_items').select('product_id').eq('tenant_id',state.tenant.id).eq('look_id',item.id)]);openDialog({title:`Produtos · ${item.name}`,fields:[{name:'products',label:'Produtos',type:'multiselect',wide:true,size:12,options:(p||[]).map(x=>({value:x.id,label:x.commercial_name||x.name})),value:(links||[]).map(x=>x.product_id)}],onSubmit:async fd=>{const selected=fd.getAll('products').map(String);const {error:de}=await supabase.from('look_items').delete().eq('tenant_id',state.tenant.id).eq('look_id',item.id);if(de)throw de;if(selected.length){const {error}=await supabase.from('look_items').insert(selected.map((product_id,i)=>({tenant_id:state.tenant.id,look_id:item.id,product_id,sort_order:i})));if(error)throw error;}await audit('update_items','looks',item.id,{count:selected.length});}});}

async function openSiteSettings(){const {data:item}=await supabase.from('site_settings').select('*').eq('tenant_id',state.tenant.id).single();openDialog({title:'Configurações do site',fields:[{name:'brand_name',label:'Marca',required:true},{name:'slogan',label:'Slogan',wide:true},{name:'whatsapp',label:'WhatsApp'},{name:'instagram',label:'Instagram'},{name:'address',label:'Endereço',wide:true},{name:'map_url',label:'Mapa URL',type:'url',wide:true},{name:'seo_title',label:'SEO title',wide:true},{name:'seo_description',label:'SEO description',type:'textarea',wide:true},{name:'is_published',label:'Publicar configurações',type:'checkbox'}],values:item||{},onSubmit:async fd=>{const {error}=await supabase.from('site_settings').update({brand_name:val(fd,'brand_name'),slogan:val(fd,'slogan')||null,whatsapp:val(fd,'whatsapp')||null,instagram:val(fd,'instagram')||null,address:val(fd,'address')||null,map_url:val(fd,'map_url')||null,seo_title:val(fd,'seo_title')||null,seo_description:val(fd,'seo_description')||null,is_published:bool(fd,'is_published')}).eq('tenant_id',state.tenant.id);if(error)throw error;await audit('update','site_settings',null);}});}
async function openBanner(item={}){openDialog({title:item.id?'Editar banner':'Novo banner',fields:[{name:'title',label:'Título',required:true},{name:'subtitle',label:'Subtítulo',wide:true},{name:'image_url',label:'Imagem URL',type:'url',wide:true},{name:'cta_label',label:'Texto do botão'},{name:'cta_url',label:'URL do botão',type:'url'},{name:'sort_order',label:'Ordem',type:'number'},{name:'starts_at',label:'Início',type:'datetime-local'},{name:'ends_at',label:'Fim',type:'datetime-local'},{name:'is_active',label:'Ativo',type:'checkbox'}],values:{sort_order:0,is_active:true,...item,starts_at:item.starts_at?.slice?.(0,16)||'',ends_at:item.ends_at?.slice?.(0,16)||''},onSubmit:fd=>save('site_banners',{title:val(fd,'title'),subtitle:val(fd,'subtitle')||null,image_url:val(fd,'image_url')||null,cta_label:val(fd,'cta_label')||null,cta_url:val(fd,'cta_url')||null,sort_order:num(fd,'sort_order')||0,starts_at:val(fd,'starts_at')||null,ends_at:val(fd,'ends_at')||null,is_active:bool(fd,'is_active')},item.id)});}
async function openCampaign(item={}){openDialog({title:item.id?'Editar campanha':'Nova campanha',fields:[{name:'name',label:'Nome',required:true},{name:'objective',label:'Objetivo',wide:true},{name:'channel',label:'Canal'},{name:'status',label:'Status',type:'select',required:true,options:['draft','planned','active','paused','completed','archived'].map(x=>({value:x,label:statusLabels[x]}))},{name:'starts_at',label:'Início',type:'datetime-local'},{name:'ends_at',label:'Fim',type:'datetime-local'},{name:'budget',label:'Orçamento',type:'number',step:'0.01'},{name:'notes',label:'Observações',type:'textarea',wide:true}],values:{status:'draft',...item,starts_at:item.starts_at?.slice?.(0,16)||'',ends_at:item.ends_at?.slice?.(0,16)||''},onSubmit:fd=>save('marketing_campaigns',{name:val(fd,'name'),objective:val(fd,'objective')||null,channel:val(fd,'channel')||null,status:val(fd,'status'),starts_at:val(fd,'starts_at')||null,ends_at:val(fd,'ends_at')||null,budget:num(fd,'budget'),notes:val(fd,'notes')||null},item.id)});}
async function openContent(item={}){const {data:campaigns}=await supabase.from('marketing_campaigns').select('id,name').eq('tenant_id',state.tenant.id).order('name');openDialog({title:item.id?'Editar conteúdo':'Novo conteúdo',fields:[{name:'title',label:'Título interno',required:true},{name:'campaign_id',label:'Campanha',type:'select',options:(campaigns||[]).map(x=>({value:x.id,label:x.name}))},{name:'channel',label:'Canal',required:true},{name:'content_type',label:'Tipo',type:'select',required:true,options:['post','reel','story','email','whatsapp','other'].map(x=>({value:x,label:x}))},{name:'status',label:'Status',type:'select',required:true,options:['idea','planned','production','ready','scheduled','published','archived'].map(x=>({value:x,label:statusLabels[x]}))},{name:'scheduled_at',label:'Agendamento',type:'datetime-local'},{name:'media_url',label:'Mídia URL',type:'url',wide:true},{name:'caption',label:'Legenda / texto',type:'textarea',wide:true,rows:6}],values:{channel:'instagram',content_type:'post',status:'idea',...item,scheduled_at:item.scheduled_at?.slice?.(0,16)||''},onSubmit:fd=>save('marketing_content',{title:val(fd,'title'),campaign_id:val(fd,'campaign_id')||null,channel:val(fd,'channel'),content_type:val(fd,'content_type'),status:val(fd,'status'),scheduled_at:val(fd,'scheduled_at')||null,media_url:val(fd,'media_url')||null,caption:val(fd,'caption')||null,published_at:val(fd,'status')==='published'?(item.published_at||new Date().toISOString()):item.published_at||null},item.id)});}
async function openClient(item={}){openDialog({title:item.id?'Editar cliente':'Novo cliente',fields:[{name:'name',label:'Nome',required:true},{name:'phone',label:'Telefone'},{name:'email',label:'E-mail',type:'email'},{name:'birthday',label:'Aniversário',type:'date'},{name:'clothing_size',label:'Tamanho roupa'},{name:'pants_size',label:'Tamanho calça'},{name:'shoe_size',label:'Tamanho calçado'},{name:'preferred_colors',label:'Cores preferidas (separadas por vírgula)',wide:true},{name:'preferred_styles',label:'Estilos preferidos (separados por vírgula)',wide:true},{name:'notes',label:'Observações',type:'textarea',wide:true},{name:'marketing_consent',label:'Consentiu receber comunicações',type:'checkbox'}],values:{...item,preferred_colors:(item.preferred_colors||[]).join(', '),preferred_styles:(item.preferred_styles||[]).join(', ')},onSubmit:fd=>save('customers',{name:val(fd,'name'),phone:val(fd,'phone')||null,email:val(fd,'email')||null,birthday:val(fd,'birthday')||null,clothing_size:val(fd,'clothing_size')||null,pants_size:val(fd,'pants_size')||null,shoe_size:val(fd,'shoe_size')||null,preferred_colors:val(fd,'preferred_colors')?val(fd,'preferred_colors').split(',').map(x=>x.trim()).filter(Boolean):null,preferred_styles:val(fd,'preferred_styles')?val(fd,'preferred_styles').split(',').map(x=>x.trim()).filter(Boolean):null,notes:val(fd,'notes')||null,marketing_consent:bool(fd,'marketing_consent')},item.id)});}
function openNewUser(){openDialog({title:'Novo usuário interno',eyebrow:'Equipe',fields:[{name:'display_name',label:'Nome',required:true},{name:'email',label:'E-mail',type:'email',required:true},{name:'password',label:'Senha inicial',type:'password',required:true},{name:'role',label:'Papel',type:'select',required:true,options:['owner','manager','staff'].map(x=>({value:x,label:roleLabels[x]}))}],values:{role:'staff'},onSubmit:async fd=>{await invokeUsers({action:'create',display_name:val(fd,'display_name'),email:val(fd,'email'),password:val(fd,'password'),role:val(fd,'role')});await audit('create_user','members',null,{email:val(fd,'email'),role:val(fd,'role')});}});}
function openEditUser(u){openDialog({title:`Editar ${u.display_name}`,eyebrow:'Equipe',fields:[{name:'display_name',label:'Nome',required:true},{name:'role',label:'Papel',type:'select',required:true,options:['owner','manager','staff'].map(x=>({value:x,label:roleLabels[x]}))},{name:'status',label:'Status',type:'select',required:true,options:[{value:'active',label:'Ativo'},{value:'suspended',label:'Suspenso'}]}],values:u,onSubmit:async fd=>{await invokeUsers({action:'update_member',user_id:u.user_id,display_name:val(fd,'display_name'),role:val(fd,'role'),status:val(fd,'status')});await audit('update_user','members',null,{user_id:u.user_id,role:val(fd,'role'),status:val(fd,'status')});}});}
function openPasswordUser(id){openDialog({title:'Definir nova senha',eyebrow:'Equipe',fields:[{name:'password',label:'Nova senha',type:'password',required:true}],onSubmit:async fd=>{await invokeUsers({action:'set_password',user_id:id,password:val(fd,'password')});await audit('set_password','members',null,{user_id:id});}});}

content.addEventListener('input',e=>{const input=e.target.closest('[data-filter-input]');if(!input)return;const q=input.value.trim().toLowerCase();$$('[data-filter-row]',content).forEach(r=>r.hidden=!r.dataset.filterRow.includes(q));});
content.addEventListener('click',async e=>{
  const b=e.target.closest('[data-action]');if(!b)return;const {action,id}=b.dataset;
  try{
    if(action==='new-family')openFamily();
    else if(action==='edit-family')openFamily(state.families.find(x=>x.id===id));
    else if(action==='new-category')openCategory();
    else if(action==='edit-category')openCategory(state.categories.find(x=>x.id===id));
    else if(action==='new-brand')openBrand();
    else if(action==='edit-brand')openBrand(state.brands.find(x=>x.id===id));
    else if(action==='edit-product')await openProduct(state.products.find(x=>x.id===id));
    else if(action==='new-collection')openCollection();
    else if(action==='edit-collection')openCollection(state.collections.find(x=>x.id===id));
    else if(action==='collection-items')await openCollectionItems(state.collections.find(x=>x.id===id));
    else if(action==='new-look')openLook();
    else if(action==='edit-look')openLook(state.looks.find(x=>x.id===id));
    else if(action==='look-items')await openLookItems(state.looks.find(x=>x.id===id));
    else if(action==='edit-site-settings')await openSiteSettings();
    else if(action==='new-banner')await openBanner();
    else if(action==='edit-banner'){const {data}=await supabase.from('site_banners').select('*').eq('tenant_id',state.tenant.id).eq('id',id).single();await openBanner(data);}
    else if(action==='new-campaign')await openCampaign();
    else if(action==='edit-campaign'){const {data}=await supabase.from('marketing_campaigns').select('*').eq('tenant_id',state.tenant.id).eq('id',id).single();await openCampaign(data);}
    else if(action==='new-content')await openContent();
    else if(action==='edit-content'){const {data}=await supabase.from('marketing_content').select('*').eq('tenant_id',state.tenant.id).eq('id',id).single();await openContent(data);}
    else if(action==='new-client')await openClient();
    else if(action==='edit-client'){const {data}=await supabase.from('customers').select('*').eq('tenant_id',state.tenant.id).eq('id',id).single();await openClient(data);}
    else if(action==='new-user')openNewUser();
    else if(action==='edit-user')openEditUser(JSON.parse(b.dataset.json));
    else if(action==='password-user')openPasswordUser(id);
  }catch(error){showError(error);}
});

supabase.auth.onAuthStateChange((event,session)=>{
  if(event==='SIGNED_OUT') showLogin();
  if(event==='TOKEN_REFRESHED'&&session) state.session=session;
});

bootstrapSession();
