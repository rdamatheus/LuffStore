import { supabase, TENANT_SLUG } from './luff-supabase.js';
import { escapeHTML, money, routeURL, parseRoute, whatsappURL, publicTaxonomy, categoryIds, selectProducts } from './site-core.mjs';

const WA_FALLBACK = '553235124993';
const assets = './assets/editorial/';
const categoryImage = {
  camisetas:'camisetas.jpg', camisas:'camisetas.jpg', polos:'camisetas.jpg', calcas:'calcas.jpg',
  'bermudas-shorts':'bermudas.jpg', tenis:'tenis.jpg'
};
const editorial = {
  hero: `${assets}look-loja.jpg`, store: `${assets}loja.jpg`,
  looks: [`${assets}look-loja.jpg`,`${assets}calcas.jpg`,`${assets}tenis.jpg`]
};
let state = {tenant:null,settings:null,families:[],categories:[],products:[],media:[],collections:[],collectionItems:[],looks:[],banners:[],filter:{}};
const $ = selector => document.querySelector(selector);
const wa = (message, number = WA_FALLBACK) => whatsappURL(number, message) || `https://wa.me/${WA_FALLBACK}?text=${encodeURIComponent(message)}`;
const categoryLabel = c => c.parent_id ? `${state.categories.find(p=>p.id===c.parent_id)?.name || ''} · ${c.name}` : c.name;
function categoryImageURL(c) { return c.image_url || (categoryImage[c.slug] ? `${assets}${categoryImage[c.slug]}` : null); }
function primaryImage(product) { return state.media.find(m=>m.product_id===product.id && m.is_primary)?.url || state.media.find(m=>m.product_id===product.id)?.url || null; }
function mediaError(){ return 'Não foi possível carregar o catálogo agora.'; }
function renderLink(url,label,className='btn'){ return `<a class="${className}" href="${escapeHTML(url)}" target="_blank" rel="noopener">${escapeHTML(label)}</a>`; }
function renderFamilyNav(){
  const visible=state.families.filter(f=>f.is_active&&f.show_on_site);
  $('#familyNav').innerHTML=visible.map(f=>`<a href="${routeURL('familia',f.slug)}">${escapeHTML(f.name)}</a>`).join('');
}
function renderCategoryCards(categories, compact=false){
  return categories.map(c=>{
    const img=categoryImageURL(c);
    const hasImage=!!img;
    return `<a class="category-card ${hasImage?'':'category-text'}" href="${routeURL('categoria',c.slug)}" aria-label="Explorar ${escapeHTML(c.name)}"><div class="category-photo">${hasImage?`<img src="${escapeHTML(img)}" alt="${escapeHTML(c.name)}" loading="lazy">`:`<span class="eyebrow">${escapeHTML(state.families.find(f=>f.id===c.family_id)?.name||'LUFF')}</span>`}</div><div class="category-label"><strong>${escapeHTML(c.name)}</strong><span class="category-arrow" aria-hidden="true">↗</span></div></a>`;
  }).join('');
}
function renderProductCards(products){
  if(!products.length) return `<div class="consultation"><div><h3>Essa seleção ainda está sendo preparada.</h3><p>Fale com a equipe LUFF para consultar disponibilidade, cores e tamanhos.</p></div>${renderLink(wa('Olá, quero consultar as peças disponíveis na LUFF Store.'),'Consultar pelo WhatsApp')}</div>`;
  return `<div class="product-grid">${products.map(p=>{const name=p.commercial_name||p.name; const img=primaryImage(p); const price=money(p.price); return `<article class="product-card"><div class="product-image">${img?`<img src="${escapeHTML(img)}" alt="${escapeHTML(name)}" loading="lazy">`:'<span>Foto em preparação</span>'}</div><div class="product-info"><h3>${escapeHTML(name)}</h3>${p.short_description?`<p>${escapeHTML(p.short_description)}</p>`:''}${price?`<div class="price">${price}</div>`:''}${renderLink(wa(`Olá, vi ${name} no site da LUFF Store e quero saber disponibilidade, cores e tamanhos.`),'Consultar disponibilidade')}</div></article>`}).join('')}</div>`;
}
function renderHomeSections(){
  const visible=state.categories.filter(c=>!c.parent_id);
  const featured=selectProducts(state.products,{featured:true},state.categories);
  const recent=selectProducts(state.products,{new:true},state.categories);
  $('#homeSections').innerHTML=`<section class="campaigns" id="novidades"><div class="campaign has-image"><img src="${editorial.store}" alt="Entrada da loja LUFF Store" loading="lazy"><div><p class="eyebrow">NOVIDADES LUFF</p><h2>Peças escolhidas para o seu momento.</h2><p>O catálogo online está sendo atualizado. Enquanto isso, fale com a equipe e consulte o que está disponível na loja.</p></div>${renderLink(wa('Olá, quero conhecer as novidades disponíveis na LUFF Store.'),'Ver novidades')}</div></section><section class="section" id="catalogo"><div class="section-head"><div><p class="eyebrow">CATÁLOGO</p><h2>Escolha por família</h2><p>Encontre roupas, calçados, acessórios e básicos de forma simples.</p></div><a class="text-link" href="#catalogo">Ver categorias ↗</a></div><div class="family-groups">${state.families.filter(f=>f.is_active&&f.show_on_site).map(f=>{const cs=state.categories.filter(c=>c.family_id===f.id&&!c.parent_id&&c.is_active&&c.show_on_site);return cs.length?`<section class="family-group" aria-labelledby="family-${f.id}"><h3 id="family-${f.id}" class="family-group-title">${escapeHTML(f.name)}</h3><div class="category-grid">${renderCategoryCards(cs)}</div></section>`:''}).join('')}</div></section><section class="section" id="destaques"><div class="section-head"><div><p class="eyebrow">SELEÇÃO LUFF</p><h2>Disponibilidade no momento</h2><p>Os produtos aparecem aqui quando forem publicados no painel.</p></div></div>${renderProductCards(featured.length?featured:state.products)}</section>${recent.length?`<section class="section"><div class="section-head"><div><p class="eyebrow">RECÉM-CHEGADOS</p><h2>Novidades</h2></div></div>${renderProductCards(recent)}</section>`:''}<section class="section" id="looks"><div class="section-head"><div><p class="eyebrow">INSPIRAÇÃO</p><h2>Looks para diferentes momentos</h2><p>Quando os looks forem publicados, você poderá abrir cada combinação e consultar as peças.</p></div></div>${state.looks.length?`<div class="look-grid">${state.looks.map(renderLookCard).join('')}</div>`:`<div class="consultation"><div><h3>Monte seu look com a equipe LUFF.</h3><p>Conte a ocasião, seu tamanho e o estilo que procura.</p></div>${renderLink(wa('Olá, quero ajuda para montar um look na LUFF Store.'),'Montar meu look')}</div>`}</section>`;
}
function renderLookCard(l){ return `<article class="editorial-card"><div class="product-image">${l.cover_url?`<img src="${escapeHTML(l.cover_url)}" alt="${escapeHTML(l.name)}" loading="lazy">`:'<span>Foto em preparação</span>'}</div><div><h3>${escapeHTML(l.name)}</h3><p>${escapeHTML(l.description||l.occasion||'Combinação LUFF')}</p>${renderLink(wa(`Olá, quero conhecer o look ${l.name} da LUFF Store.`),'Consultar look')}</div></article>`; }
function renderRoute(){
  const {type,slug}=parseRoute(location.hash); const route=$('#routeView'); const home=$('#homeView');
  if(type==='inicio'||!location.hash||location.hash==='#'){home.hidden=false;route.hidden=true;return;}
  home.hidden=true;route.hidden=false;
  if(type==='familia'){const f=state.families.find(x=>x.slug===slug); if(!f)return renderNotFound(); const cats=state.categories.filter(c=>c.family_id===f.id&&c.is_active&&c.show_on_site); const products=selectProducts(state.products,{family:f.id},state.categories); route.innerHTML=`${breadcrumbs([['Início','#inicio'],[f.name,routeURL('familia',f.slug)]])}<p class="eyebrow">FAMÍLIA</p><h1 class="route-heading">${escapeHTML(f.name)}</h1><p class="route-intro">${escapeHTML(f.description||'Explore as categorias desta família.')}</p><div class="category-grid">${renderCategoryCards(cats)}</div><div class="route-view-products"><h2>Produtos publicados</h2>${renderProductCards(products)}</div>`;return;}
  if(type==='categoria'){const c=state.categories.find(x=>x.slug===slug); if(!c)return renderNotFound(); const products=selectProducts(state.products,{category:c.id},state.categories); const children=state.categories.filter(x=>x.parent_id===c.id&&x.is_active&&x.show_on_site); route.innerHTML=`${breadcrumbs([['Início','#inicio'],[state.families.find(f=>f.id===c.family_id)?.name||'Catálogo',routeURL('familia',state.families.find(f=>f.id===c.family_id)?.slug||'')],[c.name,routeURL('categoria',c.slug)]])}<p class="eyebrow">CATEGORIA</p><h1 class="route-heading">${escapeHTML(c.name)}</h1><p class="route-intro">${escapeHTML(c.description||'Consulte as opções disponíveis na LUFF Store.')}</p>${children.length?`<div class="chips">${children.map(x=>`<a class="chip" href="${routeURL('categoria',x.slug)}">${escapeHTML(x.name)}</a>`).join('')}</div>`:''}${renderProductCards(products)}`;return;}
  if(type==='colecoes'){return renderCollectionsRoute();}
  if(type==='colecao'){const c=state.collections.find(x=>x.slug===slug); if(!c)return renderNotFound(); const ids=new Set(state.collectionItems.filter(x=>x.collection_id===c.id).map(x=>x.product_id)); const products=state.products.filter(p=>ids.has(p.id)); route.innerHTML=`${breadcrumbs([['Início','#inicio'],['Novidades','#novidades'],[c.name,routeURL('colecao',c.slug)]])}<p class="eyebrow">COLEÇÃO</p><h1 class="route-heading">${escapeHTML(c.name)}</h1><p class="route-intro">${escapeHTML(c.description||'Seleção LUFF para a temporada.')}</p>${renderProductCards(products)}`;return;}
  if(type==='looks'){route.innerHTML=`${breadcrumbs([['Início','#inicio'],['Looks','#looks']])}<p class="eyebrow">INSPIRAÇÃO</p><h1 class="route-heading">Looks LUFF</h1><div class="look-grid">${state.looks.length?state.looks.map(renderLookCard).join(''):`<div class="consultation"><div><h3>Os looks estão sendo preparados.</h3><p>Fale com a equipe para montar uma combinação.</p></div>${renderLink(wa('Olá, quero montar um look na LUFF Store.'),'Falar com a equipe')}</div>`}</div>`;return;}
  renderNotFound();
}
function renderCollectionsRoute(){const route=$('#routeView');route.innerHTML=`${breadcrumbs([['Início','#inicio'],['Novidades','#novidades']])}<p class="eyebrow">COLEÇÕES</p><h1 class="route-heading">Novidades e coleções</h1>${state.collections.length?`<div class="collection-grid">${state.collections.map(c=>`<article class="editorial-card">${c.cover_url?`<img src="${escapeHTML(c.cover_url)}" alt="${escapeHTML(c.name)}" loading="lazy">`:''}<div><h3>${escapeHTML(c.name)}</h3><p>${escapeHTML(c.description||'Seleção LUFF')}</p><a class="btn" href="${routeURL('colecao',c.slug)}">Explorar ↗</a></div></article>`).join('')}</div>`:`<div class="consultation"><div><h3>Nenhuma coleção publicada ainda.</h3><p>Consulte as novidades diretamente com a equipe.</p></div>${renderLink(wa('Olá, quero saber das novidades da LUFF Store.'),'Consultar novidades')}</div>`}`;}
function breadcrumbs(items){return `<nav class="breadcrumbs" aria-label="Você está aqui">${items.map((x,i)=>i===items.length-1?`<span>${escapeHTML(x[0])}</span>`:`<a href="${escapeHTML(x[1])}">${escapeHTML(x[0])}</a>`).join('<span aria-hidden="true">/</span>')}</nav>`;}
function renderNotFound(){ $('#routeView').innerHTML=`<p class="eyebrow">LUFF STORE</p><h1 class="route-heading">Página não encontrada</h1><p class="route-intro">Volte ao catálogo ou fale com a equipe.</p><a class="btn" href="#inicio">Voltar ao início</a>`; }
function updateContact(settings){if(!settings)return;const number=String(settings.whatsapp||WA_FALLBACK).replace(/\D/g,'')||WA_FALLBACK; document.querySelectorAll('[data-wa]').forEach(a=>{const msg=a.dataset.wa;a.href=wa(msg,number)}); if(settings.instagram){document.querySelectorAll('[data-instagram]').forEach(a=>a.href=settings.instagram)} if(settings.address){document.querySelectorAll('[data-address]').forEach(e=>e.innerHTML=escapeHTML(settings.address).replace(/\n/g,'<br>'))} if(settings.slogan){document.querySelectorAll('[data-slogan]').forEach(e=>e.textContent=settings.slogan.toUpperCase())} if(settings.seo_title)document.title=settings.seo_title; if(settings.seo_description)document.querySelector('meta[name=description]')?.setAttribute('content',settings.seo_description); $('#catalogStatus').textContent='';}
async function loadCatalog(){
  $('#catalogStatus').textContent='Carregando catálogo…';
  try{
    const [{data:tenant,error:te},{data:fam,error:fe},{data:cat,error:ce},{data:products,error:pe},{data:media,error:me},{data:settings},{data:collections},{data:looks},{data:banners}]=await Promise.all([
      supabase.from('tenants').select('id').eq('slug',TENANT_SLUG).maybeSingle(),
      supabase.from('catalog_families').select('*').order('sort_order'),
      supabase.from('catalog_categories').select('*').order('sort_order'),
      supabase.from('products').select('*').eq('published',true).eq('status','active').order('is_featured',{ascending:false}).order('updated_at',{ascending:false}).limit(100),
      supabase.from('product_media').select('product_id,url,is_primary,sort_order').order('is_primary',{ascending:false}).order('sort_order'),
      supabase.from('site_settings').select('*').maybeSingle(),
      supabase.from('collections').select('*').eq('status','active').eq('show_on_site',true).order('starts_at',{ascending:false}),
      supabase.from('looks').select('*').eq('status','active').eq('published',true).order('updated_at',{ascending:false}),
      supabase.from('site_banners').select('*').eq('is_active',true).order('sort_order')
    ]);
    if(te||fe||ce||pe||me)throw te||fe||ce||pe||me;
    state={...state,tenant:tenant,families:fam||[],categories:cat||[],products:products||[],media:media||[],settings:settings,collections:collections||[],collectionItems:[],looks:looks||[],banners:banners||[]};
    const taxonomy=publicTaxonomy(state.families,state.categories); state.families=taxonomy.families; state.categories=taxonomy.categories;
    renderFamilyNav(); renderHomeSections(); updateContact(settings); renderRoute();
  }catch(error){console.warn(error); $('#catalogStatus').innerHTML=`${mediaError()} <button class="text-link" type="button" id="retryCatalog">Tentar novamente</button>`; renderFamilyNav(); renderHomeSections();}
}
const nav=$('.main-nav');
$('.menu-toggle')?.addEventListener('click',e=>{const open=nav.classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',String(open));e.currentTarget.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');});
nav?.addEventListener('click',()=>{nav.classList.remove('open');$('.menu-toggle')?.setAttribute('aria-expanded','false');$('.menu-toggle')?.setAttribute('aria-label','Abrir menu');});
document.addEventListener('click',e=>{if(e.target.id==='retryCatalog')loadCatalog();});
window.addEventListener('hashchange',renderRoute);
loadCatalog();
