import { supabase, TENANT_SLUG } from './luff-supabase.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = (value = '') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const slugify = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const roleLabels = { owner:'Owner', manager:'Manager', staff:'Staff' };
const statusLabels = { active:'Ativo', inactive:'Inativo', archived:'Arquivado', draft:'Rascunho', not_configured:'Não configurado', configured:'Configurado', paused:'Pausado', error:'Erro', synced:'Sincronizado' };

const state = {
  session: null,
  tenant: null,
  member: null,
  view: 'dashboard',
  families: [],
  categories: [],
  brands: [],
  attributes: [],
  attributeValues: [],
  collections: [],
  looks: []
};

const viewMeta = {
  dashboard: ['LUFF Digital','Visão geral'],
  taxonomy: ['Catálogo','Famílias e categorias'],
  products: ['Catálogo','Produtos'],
  brands: ['Catálogo','Marcas'],
  attributes: ['Catálogo','Atributos'],
  collections: ['Catálogo','Coleções'],
  looks: ['Catálogo','Looks'],
  site: ['Presença digital','Site'],
  marketing: ['Negócio','Marketing'],
  clients: ['Negócio','Clientes'],
  indicators: ['Negócio','Indicadores'],
  integrations: ['Sistema','Integrações'],
  team: ['Administração','Equipe'],
  logs: ['Administração','Logs']
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

function canManage(){ return ['owner','manager'].includes(state.member?.role); }
function isOwner(){ return state.member?.role === 'owner'; }

function loading(message='Carregando…'){
  content.innerHTML = `<div class="loading">${esc(message)}</div>`;
}

function notifyError(error, fallback='Não foi possível concluir a operação.'){
  console.error(error);
  content.insertAdjacentHTML('afterbegin', `<div class="callout" style="border-color:#a33d3d;background:#f4e3e3;color:#7c3333">${esc(error?.message || fallback)}</div>`);
}

async function audit(action, entityType, entityId = null, metadata = {}){
  if (!state.tenant || !state.session) return;
  await supabase.from('audit_logs').insert({
    tenant_id: state.tenant.id,
    actor_user_id: state.session.user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata
  });
}

async function bootstrapSession(){
  const { data:{ session } } = await supabase.auth.getSession();
  if (!session) return showLogin();
  try { await authorize(session); } catch (error) { console.error(error); await supabase.auth.signOut(); showLogin('Sua conta não possui acesso ao painel LUFF.'); }
}

async function authorize(session){
  state.session = session;
  const { data: tenant, error: tenantError } = await supabase.from('tenants').select('*').eq('slug', TENANT_SLUG).single();
  if (tenantError) throw tenantError;
  state.tenant = tenant;
  const { data: member, error: memberError } = await supabase.from('members').select('*').eq('tenant_id', tenant.id).eq('user_id', session.user.id).eq('status','active').single();
  if (memberError || !member) throw memberError || new Error('Conta sem acesso.');
  state.member = member;
  showApp();
  await refreshIntegrationBadge();
  await renderView('dashboard');
}

function showLogin(message=''){
  app.hidden = true;
  loginView.hidden = false;
  loginError.textContent = message;
}

function showApp(){
  loginView.hidden = true;
  app.hidden = false;
  $('#userEmail').textContent = state.session.user.email || '';
  $('#userRole').textContent = roleLabels[state.member.role] || state.member.role;
  $$('.owner-only').forEach(el => el.hidden = !isOwner());
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  loginError.textContent = '';
  const button = $('button[type="submit"]', loginForm);
  button.disabled = true;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: $('#email').value.trim(), password: $('#password').value });
    if (error) throw error;
    await authorize(data.session);
  } catch (error) {
    loginError.textContent = error?.message === 'Invalid login credentials' ? 'E-mail ou senha inválidos.' : (error?.message || 'Não foi possível entrar.');
  } finally { button.disabled = false; }
});

$('#logoutBtn').addEventListener('click', async () => { await supabase.auth.signOut(); location.reload(); });

$$('.nav-item').forEach(button => button.addEventListener('click', () => renderView(button.dataset.view)));

async function renderView(view){
  if (view === 'logs' && !isOwner()) view = 'dashboard';
  state.view = view;
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  const [eyebrow,title] = viewMeta[view] || ['LUFF Digital','Painel'];
  $('#sectionEyebrow').textContent = eyebrow;
  $('#sectionTitle').textContent = title;
  loading();
  try {
    const renderers = {
      dashboard: renderDashboard,
      taxonomy: renderTaxonomy,
      products: renderProducts,
      brands: renderBrands,
      attributes: renderAttributes,
      collections: renderCollections,
      looks: renderLooks,
      integrations: renderIntegrations,
      team: renderTeam,
      logs: renderLogs,
      site: () => renderPlanned('Site', ['Home e banners','Menus e navegação','Destaques editoriais','Páginas institucionais','SEO e loja física']),
      marketing: () => renderPlanned('Marketing', ['Calendário editorial','Conteúdos e campanhas','Banco de mídia','Reels e Stories','Resultados']),
      clients: () => renderPlanned('Clientes', ['CRM','Preferências e tamanhos','Histórico de compras','Aniversários','Consentimento de comunicação']),
      indicators: () => renderPlanned('Indicadores', ['Vendas do dia','Ticket médio','Itens por venda','Produtos e categorias líderes','Estoque e recorrência'])
    };
    await renderers[view]();
  } catch (error) {
    content.innerHTML = '<div class="empty">Não foi possível carregar esta área.</div>';
    notifyError(error);
  }
}

async function refreshIntegrationBadge(){
  const { data } = await supabase.from('integration_connections').select('provider,status,last_synced_at').eq('tenant_id',state.tenant.id).eq('provider','velo').maybeSingle();
  const badge = $('#syncBadge');
  if (!data || data.status === 'not_configured') { badge.className='status neutral'; badge.textContent='Velo não configurado'; return; }
  badge.className = `status ${data.status === 'active' ? 'success' : data.status === 'error' ? 'danger' : 'warning'}`;
  badge.textContent = `Velo · ${statusLabels[data.status] || data.status}`;
}

async function count(table, apply = q => q){
  let query = supabase.from(table).select('id',{count:'exact',head:true}).eq('tenant_id',state.tenant.id);
  query = apply(query);
  const { count: total, error } = await query;
  if (error) throw error;
  return total || 0;
}

async function renderDashboard(){
  const [products,categories,collections,looks,published,mediaMissing] = await Promise.all([
    count('products'), count('catalog_categories'), count('collections'), count('looks'),
    count('products',q=>q.eq('published',true)),
    count('products',q=>q.eq('published',false))
  ]);
  const { data: integration } = await supabase.from('integration_connections').select('*').eq('tenant_id',state.tenant.id).eq('provider','velo').maybeSingle();
  content.innerHTML = `
    <section class="hero-card"><div><span class="eyebrow">LUFF Store</span><h2>Centro de gestão digital</h2><p>Catálogo, conteúdo, integração e evolução do canal digital em uma única estrutura.</p></div><span class="badge gold">v0.2 · Fundação do painel</span></section>
    <div class="metric-grid">
      ${metric('Produtos',products,'Base atual')}${metric('Categorias',categories,'Famílias + categorias + subcategorias')}${metric('Coleções',collections,'Curadorias editoriais')}${metric('Looks',looks,'Combinações comerciais')}
    </div>
    <div class="split">
      <section class="panel"><div class="panel-head"><div><h2>Prontidão do catálogo</h2><p>Indicadores para a publicação do site.</p></div></div><div class="mini-list"><div class="mini-item"><span>Produtos publicados</span><strong>${published}</strong></div><div class="mini-item"><span>Produtos ainda não publicados</span><strong>${mediaMissing}</strong></div><div class="mini-item"><span>Taxonomia estruturada</span><span class="badge green">Pronta</span></div><div class="mini-item"><span>Permissões e RLS</span><span class="badge green">Ativas</span></div></div></section>
      <section class="panel"><div class="panel-head"><div><h2>Integração Velo</h2><p>Fonte operacional futura de produtos, preços e estoque.</p></div></div><div class="callout"><strong>Status:</strong> ${esc(statusLabels[integration?.status] || integration?.status || 'Não configurado')}<br><span class="subtle">A arquitetura está preparada; a conexão real será homologada quando houver acesso ao ERP.</span></div></section>
    </div>`;
}

function metric(label,value,small){ return `<div class="metric"><span>${esc(label)}</span><strong>${Number(value).toLocaleString('pt-BR')}</strong><small>${esc(small)}</small></div>`; }

async function loadTaxonomy(){
  const [{data:families,error:fe},{data:categories,error:ce}] = await Promise.all([
    supabase.from('catalog_families').select('*').eq('tenant_id',state.tenant.id).order('sort_order'),
    supabase.from('catalog_categories').select('*').eq('tenant_id',state.tenant.id).order('sort_order')
  ]);
  if (fe) throw fe; if (ce) throw ce;
  state.families = families || []; state.categories = categories || [];
}

async function renderTaxonomy(){
  await loadTaxonomy();
  const button = canManage() ? '<button class="btn primary" data-action="new-category">Nova categoria</button><button class="btn secondary" data-action="new-family">Nova família</button>' : '';
  const familiesHtml = state.families.map(f => {
    const top = state.categories.filter(c => c.family_id === f.id && !c.parent_id);
    return `<div class="tree-family"><div class="tree-family-head"><div><strong>${esc(f.name)}</strong> <span class="badge ${f.is_active?'green':''}">${f.is_active?'Ativa':'Inativa'}</span><div class="subtle">${top.length} categorias principais</div></div>${canManage()?`<button class="btn small secondary" data-action="edit-family" data-id="${f.id}">Editar</button>`:''}</div><div class="tree-rows">${top.map(c=>categoryTreeRow(c)).join('') || '<div class="empty">Nenhuma categoria nesta família.</div>'}</div></div>`;
  }).join('');
  content.innerHTML = `<section class="panel"><div class="panel-head"><div><h2>Central de taxonomia</h2><p>Família → Categoria → Subcategoria. Marca, cor, tamanho e material ficam fora desta árvore.</p></div><div class="toolbar">${button}</div></div><div class="tree">${familiesHtml}</div></section>`;
}

function categoryTreeRow(category){
  const children = state.categories.filter(c => c.parent_id === category.id);
  const action = canManage()?`<button class="btn small secondary" data-action="edit-category" data-id="${category.id}">Editar</button>`:'';
  return `<div class="tree-row"><div class="tree-name"><strong>${esc(category.name)}</strong><div class="subtle">/${esc(category.slug)}</div></div><span class="subtle">${category.show_on_site?'No site':'Interna'}</span>${action}</div>${children.map(c=>`<div class="tree-row child"><div class="tree-name">${esc(c.name)}<div class="subtle">/${esc(c.slug)}</div></div><span class="subtle">Subcategoria</span>${canManage()?`<button class="btn small secondary" data-action="edit-category" data-id="${c.id}">Editar</button>`:''}</div>`).join('')}`;
}

async function renderProducts(){
  const [{data:products,error},{data:categories},{data:brands}] = await Promise.all([
    supabase.from('products').select('*').eq('tenant_id',state.tenant.id).order('updated_at',{ascending:false}).limit(500),
    supabase.from('catalog_categories').select('id,name').eq('tenant_id',state.tenant.id),
    supabase.from('brands').select('id,name').eq('tenant_id',state.tenant.id)
  ]);
  if (error) throw error;
  const cat = Object.fromEntries((categories||[]).map(x=>[x.id,x.name]));
  const brand = Object.fromEntries((brands||[]).map(x=>[x.id,x.name]));
  const rows = (products||[]).map(p=>`<tr data-product-row><td><strong>${esc(p.commercial_name || p.name)}</strong><div class="subtle">${esc(p.sku_base||p.external_reference||'Sem SKU')}</div></td><td>${esc(cat[p.category_id]||'—')}</td><td>${esc(brand[p.brand_id]||'—')}</td><td>${p.price==null?'—':p.price.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td><span class="badge ${p.published?'green':''}">${p.published?'Publicado':statusLabels[p.status]||p.status}</span></td><td>${esc(p.source_system)}</td></tr>`).join('');
  content.innerHTML = `<div class="callout"><strong>Fonte operacional:</strong> Velo. Até a homologação da integração, o painel não cria produtos comerciais paralelos para evitar divergência de preço e estoque.</div><section class="panel"><div class="panel-head"><div><h2>Produtos</h2><p>Catálogo canônico da LUFF e enriquecimento editorial.</p></div><div class="toolbar"><input id="productSearch" class="search" placeholder="Buscar produto…"></div></div>${rows?`<div class="table-wrap"><table><thead><tr><th>Produto</th><th>Categoria</th><th>Marca</th><th>Preço</th><th>Status</th><th>Origem</th></tr></thead><tbody id="productRows">${rows}</tbody></table></div>`:'<div class="empty">Nenhum produto importado ainda. A estrutura está pronta para receber o Velo.</div>'}</section>`;
  $('#productSearch')?.addEventListener('input',e=>{ const term=e.target.value.toLowerCase(); $$('[data-product-row]').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(term)); });
}

async function renderBrands(){
  const { data, error } = await supabase.from('brands').select('*').eq('tenant_id',state.tenant.id).order('name');
  if (error) throw error; state.brands=data||[];
  const rows=state.brands.map(b=>`<tr><td><strong>${esc(b.name)}</strong><div class="subtle">/${esc(b.slug)}</div></td><td><span class="badge ${b.is_active?'green':''}">${b.is_active?'Ativa':'Inativa'}</span></td><td>${canManage()?`<button class="btn small secondary" data-action="edit-brand" data-id="${b.id}">Editar</button>`:''}</td></tr>`).join('');
  content.innerHTML=`<section class="panel"><div class="panel-head"><div><h2>Marcas</h2><p>Marcas são atributos comerciais e não categorias.</p></div>${canManage()?'<button class="btn primary" data-action="new-brand">Nova marca</button>':''}</div>${rows?`<div class="table-wrap"><table><thead><tr><th>Marca</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="empty">Nenhuma marca cadastrada.</div>'}</section>`;
}

async function renderAttributes(){
  const [{data:attributes,error},{data:values}] = await Promise.all([
    supabase.from('attributes').select('*').eq('tenant_id',state.tenant.id).order('sort_order'),
    supabase.from('attribute_values').select('*').eq('tenant_id',state.tenant.id).order('sort_order')
  ]);
  if (error) throw error; state.attributes=attributes||[]; state.attributeValues=values||[];
  content.innerHTML=`<section class="panel"><div class="panel-head"><div><h2>Atributos de moda</h2><p>Cor, tamanhos, modelagem, material e ocasião. Atributos evitam transformar filtros em categorias.</p></div></div><div class="planned-grid">${state.attributes.map(a=>`<div class="planned-card"><span class="kicker">${a.is_variant?'Variação':'Atributo editorial'}</span><h3>${esc(a.name)}</h3><p>${state.attributeValues.filter(v=>v.attribute_id===a.id).map(v=>esc(v.label)).join(' · ') || 'Sem valores cadastrados'}</p></div>`).join('')}</div></section>`;
}

async function renderCollections(){
  const {data,error}=await supabase.from('collections').select('*').eq('tenant_id',state.tenant.id).order('updated_at',{ascending:false}); if(error)throw error; state.collections=data||[];
  const rows=state.collections.map(c=>`<tr><td><strong>${esc(c.name)}</strong><div class="subtle">/${esc(c.slug)}</div></td><td>${statusLabels[c.status]||c.status}</td><td>${c.show_on_site?'Sim':'Não'}</td><td>${canManage()?`<button class="btn small secondary" data-action="edit-collection" data-id="${c.id}">Editar</button>`:''}</td></tr>`).join('');
  content.innerHTML=`<section class="panel"><div class="panel-head"><div><h2>Coleções</h2><p>Curadorias temporárias ou permanentes independentes das categorias.</p></div>${canManage()?'<button class="btn primary" data-action="new-collection">Nova coleção</button>':''}</div>${rows?`<div class="table-wrap"><table><thead><tr><th>Coleção</th><th>Status</th><th>No site</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="empty">Nenhuma coleção criada.</div>'}</section>`;
}

async function renderLooks(){
  const {data,error}=await supabase.from('looks').select('*').eq('tenant_id',state.tenant.id).order('updated_at',{ascending:false}); if(error)throw error; state.looks=data||[];
  const rows=state.looks.map(l=>`<tr><td><strong>${esc(l.name)}</strong><div class="subtle">${esc(l.occasion||'Sem ocasião')}</div></td><td>${statusLabels[l.status]||l.status}</td><td>${l.published?'Sim':'Não'}</td><td>${canManage()?`<button class="btn small secondary" data-action="edit-look" data-id="${l.id}">Editar</button>`:''}</td></tr>`).join('');
  content.innerHTML=`<section class="panel"><div class="panel-head"><div><h2>Looks</h2><p>Combinações que poderão alimentar site, Instagram, WhatsApp e recomendações futuras.</p></div>${canManage()?'<button class="btn primary" data-action="new-look">Novo look</button>':''}</div>${rows?`<div class="table-wrap"><table><thead><tr><th>Look</th><th>Status</th><th>Publicado</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="empty">Nenhum look criado.</div>'}</section>`;
}

async function renderIntegrations(){
  const {data,error}=await supabase.from('integration_connections').select('*').eq('tenant_id',state.tenant.id).order('provider'); if(error)throw error;
  content.innerHTML=`<section class="panel"><div class="panel-head"><div><h2>Integrações</h2><p>Conectores externos ficam isolados do catálogo canônico da LUFF.</p></div></div>${(data||[]).map(i=>`<div class="planned-card"><span class="kicker">ERP</span><h3>${esc(i.provider.toUpperCase())}</h3><p>Status: <strong>${esc(statusLabels[i.status]||i.status)}</strong></p><p>${esc(i.config?.notes||'')}</p><div style="margin-top:14px"><span class="badge ${i.status==='active'?'green':'gold'}">${esc(i.status)}</span></div></div>`).join('')||'<div class="empty">Nenhuma integração cadastrada.</div>'}</section>`;
}

async function renderTeam(){
  const {data,error}=await supabase.from('members').select('*').eq('tenant_id',state.tenant.id).order('created_at'); if(error)throw error;
  const rows=(data||[]).map(m=>`<tr><td><strong>${m.user_id===state.session.user.id?esc(state.session.user.email):esc(m.user_id)}</strong></td><td><span class="badge dark">${esc(roleLabels[m.role]||m.role)}</span></td><td>${esc(statusLabels[m.status]||m.status)}</td></tr>`).join('');
  content.innerHTML=`<div class="callout">Convites de novos usuários serão implementados por uma função segura de backend. O navegador nunca receberá chave administrativa do Supabase.</div><section class="panel"><div class="panel-head"><div><h2>Equipe e permissões</h2><p>Owner, Manager e Staff.</p></div></div><div class="table-wrap"><table><thead><tr><th>Usuário</th><th>Papel</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

async function renderLogs(){
  const {data,error}=await supabase.from('audit_logs').select('*').eq('tenant_id',state.tenant.id).order('created_at',{ascending:false}).limit(100); if(error)throw error;
  const rows=(data||[]).map(l=>`<tr><td>${new Date(l.created_at).toLocaleString('pt-BR')}</td><td>${esc(l.action)}</td><td>${esc(l.entity_type)}</td><td class="subtle">${esc(l.entity_id||'—')}</td></tr>`).join('');
  content.innerHTML=`<section class="panel"><div class="panel-head"><div><h2>Auditoria</h2><p>Últimas ações relevantes feitas no painel.</p></div></div>${rows?`<div class="table-wrap"><table><thead><tr><th>Quando</th><th>Ação</th><th>Entidade</th><th>ID</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="empty">Nenhum evento registrado.</div>'}</section>`;
}

function renderPlanned(name,items){
  content.innerHTML=`<div class="callout"><strong>${esc(name)}:</strong> módulo previsto na arquitetura e ainda não ativado nesta entrega. A navegação já reserva o espaço para evolução sem reorganizar o painel.</div><section class="panel"><div class="panel-head"><div><h2>Estrutura prevista</h2><p>Escopo preparado para as próximas fases.</p></div></div><div class="planned-grid">${items.map(x=>`<div class="planned-card"><span class="kicker">Planejado</span><h3>${esc(x)}</h3><p>Será conectado ao banco e aos fluxos da LUFF na etapa correspondente.</p></div>`).join('')}</div></section>`;
}

content.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]'); if(!button) return;
  const {action,id}=button.dataset;
  try {
    if(action==='new-family') openFamily();
    if(action==='edit-family') openFamily(state.families.find(x=>x.id===id));
    if(action==='new-category') openCategory();
    if(action==='edit-category') openCategory(state.categories.find(x=>x.id===id));
    if(action==='new-brand') openBrand();
    if(action==='edit-brand') openBrand(state.brands.find(x=>x.id===id));
    if(action==='new-collection') openCollection();
    if(action==='edit-collection') openCollection(state.collections.find(x=>x.id===id));
    if(action==='new-look') openLook();
    if(action==='edit-look') openLook(state.looks.find(x=>x.id===id));
  } catch(error){ notifyError(error); }
});

function option(value,label,selected){ return `<option value="${esc(value)}" ${selected?'selected':''}>${esc(label)}</option>`; }
function field(name,label,type='text',value='',extra=''){ return `<label class="${extra.includes('wide')?'wide':''}">${esc(label)}<input name="${esc(name)}" type="${esc(type)}" value="${esc(value??'')}" ${extra.replace('wide','')}></label>`; }
function checkbox(name,label,checked){ return `<label class="check"><input name="${esc(name)}" type="checkbox" ${checked?'checked':''}><span>${esc(label)}</span></label>`; }
function selectField(name,label,options,value='',wide=false){ return `<label class="${wide?'wide':''}">${esc(label)}<select name="${esc(name)}">${options.map(o=>option(o.value,o.label,String(o.value)===String(value))).join('')}</select></label>`; }

function showDialog(title,eyebrow,fields,onSubmit){
  $('#dialogTitle').textContent=title; $('#dialogEyebrow').textContent=eyebrow; dialogFields.innerHTML=fields; dialogError.textContent=''; dialogSubmit=onSubmit; dialog.showModal();
}
$('#dialogClose').addEventListener('click',()=>dialog.close()); $('#dialogCancel').addEventListener('click',()=>dialog.close());
entityForm.addEventListener('submit',async event=>{event.preventDefault();dialogError.textContent='';const submit=$('button[type="submit"]',entityForm);submit.disabled=true;try{const fd=new FormData(entityForm);await dialogSubmit(fd);dialog.close();await renderView(state.view);}catch(error){console.error(error);dialogError.textContent=error?.message||'Não foi possível salvar.';}finally{submit.disabled=false;}});

function openFamily(item={}){
  showDialog(item.id?'Editar família':'Nova família','Taxonomia',`${field('name','Nome','text',item.name,'required wide')}${field('slug','Slug','text',item.slug,'wide')}${field('sort_order','Ordem','number',item.sort_order??0,'min="0"')}${checkbox('is_active','Ativa',item.is_active!==false)}${checkbox('show_on_site','Exibir no site',item.show_on_site===true)}`,async fd=>{
    const payload={tenant_id:state.tenant.id,name:fd.get('name').trim(),slug:slugify(fd.get('slug')||fd.get('name')),sort_order:Number(fd.get('sort_order')||0),is_active:fd.get('is_active')==='on',show_on_site:fd.get('show_on_site')==='on'};
    const query=item.id?supabase.from('catalog_families').update(payload).eq('id',item.id):supabase.from('catalog_families').insert(payload).select('id').single(); const {data,error}=await query;if(error)throw error;await audit(item.id?'family.updated':'family.created','catalog_family',item.id||data?.id,{name:payload.name});
  });
}

function openCategory(item={}){
  const familyOptions=[{value:'',label:'Selecione…'},...state.families.map(f=>({value:f.id,label:f.name}))];
  const parentOptions=[{value:'',label:'Nenhuma — categoria principal'},...state.categories.filter(c=>!c.parent_id&&c.id!==item.id).map(c=>({value:c.id,label:c.name}))];
  showDialog(item.id?'Editar categoria':'Nova categoria','Taxonomia',`${selectField('family_id','Família',familyOptions,item.family_id,true)}${selectField('parent_id','Categoria-pai',parentOptions,item.parent_id||'',true)}${field('name','Nome','text',item.name,'required wide')}${field('slug','Slug','text',item.slug,'wide')}${field('sort_order','Ordem','number',item.sort_order??0,'min="0"')}${checkbox('is_active','Ativa',item.is_active!==false)}${checkbox('show_on_site','Exibir no site',item.show_on_site===true)}${checkbox('show_in_menu','Exibir no menu',item.show_in_menu===true)}${checkbox('is_featured','Destaque',item.is_featured===true)}`,async fd=>{
    const payload={tenant_id:state.tenant.id,family_id:fd.get('family_id')||null,parent_id:fd.get('parent_id')||null,name:fd.get('name').trim(),slug:slugify(fd.get('slug')||fd.get('name')),sort_order:Number(fd.get('sort_order')||0),is_active:fd.get('is_active')==='on',show_on_site:fd.get('show_on_site')==='on',show_in_menu:fd.get('show_in_menu')==='on',is_featured:fd.get('is_featured')==='on'};
    if(!payload.family_id)throw new Error('Selecione uma família.');
    const query=item.id?supabase.from('catalog_categories').update(payload).eq('id',item.id):supabase.from('catalog_categories').insert(payload).select('id').single();const{data,error}=await query;if(error)throw error;await audit(item.id?'category.updated':'category.created','catalog_category',item.id||data?.id,{name:payload.name});
  });
}

function openBrand(item={}){
  showDialog(item.id?'Editar marca':'Nova marca','Catálogo',`${field('name','Nome','text',item.name,'required wide')}${field('slug','Slug','text',item.slug,'wide')}${checkbox('is_active','Ativa',item.is_active!==false)}`,async fd=>{const payload={tenant_id:state.tenant.id,name:fd.get('name').trim(),slug:slugify(fd.get('slug')||fd.get('name')),is_active:fd.get('is_active')==='on'};const query=item.id?supabase.from('brands').update(payload).eq('id',item.id):supabase.from('brands').insert(payload).select('id').single();const{data,error}=await query;if(error)throw error;await audit(item.id?'brand.updated':'brand.created','brand',item.id||data?.id,{name:payload.name});});
}

function openCollection(item={}){
  showDialog(item.id?'Editar coleção':'Nova coleção','Curadoria',`${field('name','Nome','text',item.name,'required wide')}${field('slug','Slug','text',item.slug,'wide')}${selectField('status','Status',[{value:'active',label:'Ativa'},{value:'inactive',label:'Inativa'},{value:'archived',label:'Arquivada'}],item.status||'active')}${checkbox('show_on_site','Exibir no site',item.show_on_site===true)}`,async fd=>{const payload={tenant_id:state.tenant.id,name:fd.get('name').trim(),slug:slugify(fd.get('slug')||fd.get('name')),status:fd.get('status'),show_on_site:fd.get('show_on_site')==='on'};const query=item.id?supabase.from('collections').update(payload).eq('id',item.id):supabase.from('collections').insert(payload).select('id').single();const{data,error}=await query;if(error)throw error;await audit(item.id?'collection.updated':'collection.created','collection',item.id||data?.id,{name:payload.name});});
}

function openLook(item={}){
  showDialog(item.id?'Editar look':'Novo look','Estilo',`${field('name','Nome','text',item.name,'required wide')}${field('slug','Slug','text',item.slug,'wide')}${field('occasion','Ocasião','text',item.occasion,'wide')}${selectField('status','Status',[{value:'draft',label:'Rascunho'},{value:'active',label:'Ativo'},{value:'inactive',label:'Inativo'},{value:'archived',label:'Arquivado'}],item.status||'draft')}${checkbox('published','Publicado',item.published===true)}`,async fd=>{const payload={tenant_id:state.tenant.id,name:fd.get('name').trim(),slug:slugify(fd.get('slug')||fd.get('name')),occasion:fd.get('occasion')||null,status:fd.get('status'),published:fd.get('published')==='on'};const query=item.id?supabase.from('looks').update(payload).eq('id',item.id):supabase.from('looks').insert(payload).select('id').single();const{data,error}=await query;if(error)throw error;await audit(item.id?'look.updated':'look.created','look',item.id||data?.id,{name:payload.name});});
}

await bootstrapSession();
