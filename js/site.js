import { supabase, TENANT_SLUG } from './luff-supabase.js';
import {
  escapeHTML, safeURL, money, routeURL, parseRoute, whatsappURL,
  publicTaxonomy, selectProducts, inWindow
} from './site-core.mjs';

const WA_FALLBACK = '553235124993';
const ASSETS = './assets/editorial/';

const categoryImage = {
  camisetas:'camisetas.jpg',
  calcas:'calcas.jpg',
  'bermudas-shorts':'bermudas.jpg',
  tenis:'tenis.jpg'
};

const state = {
  tenant:null,
  settings:null,
  families:[],
  categories:[],
  products:[],
  media:[],
  collections:[],
  collectionItems:[],
  looks:[],
  banners:[]
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const wa = (message, number = WA_FALLBACK) =>
  whatsappURL(number, message) || `https://wa.me/${WA_FALLBACK}?text=${encodeURIComponent(message)}`;

function primaryImage(product){
  return state.media.find(m=>m.product_id===product.id && m.is_primary)?.url
    || state.media.find(m=>m.product_id===product.id)?.url
    || null;
}

function productMedia(productId){
  return state.media.filter(m=>m.product_id===productId)
    .sort((a,b)=>Number(b.is_primary)-Number(a.is_primary) || (a.sort_order??0)-(b.sort_order??0));
}

function categoryImageURL(category){
  const direct = safeURL(category.image_url);
  if(direct) return direct;
  const mapped = categoryImage[category.slug];
  return mapped ? `${ASSETS}${mapped}` : null;
}

function renderLink(url,label,className='btn'){
  return `<a class="${className}" href="${escapeHTML(url)}" target="_blank" rel="noopener">${escapeHTML(label)}</a>`;
}

function renderFamilyNav(){
  const host = $('#familyNav');
  if(!host) return;
  host.innerHTML = state.families.map(f =>
    `<a href="${routeURL('familia',f.slug)}">${escapeHTML(f.name)}</a>`
  ).join('');
}

function renderCategoryCards(categories){
  return categories.map(c=>{
    const img = categoryImageURL(c);
    const family = state.families.find(f=>f.id===c.family_id)?.name || 'LUFF';
    return `<a class="category-card ${img?'':'category-text'}" href="${routeURL('categoria',c.slug)}" aria-label="Explorar ${escapeHTML(c.name)}">
      <div class="category-photo">
        ${img
          ? `<img src="${escapeHTML(img)}" alt="${escapeHTML(c.name)}" loading="lazy">`
          : `<span class="eyebrow">${escapeHTML(family)}</span>`
        }
      </div>
      <div class="category-label">
        <strong>${escapeHTML(c.name)}</strong>
        <span class="category-arrow" aria-hidden="true">↗</span>
      </div>
    </a>`;
  }).join('');
}

function productCard(product){
  const name = product.commercial_name || product.name;
  const img = primaryImage(product);
  const price = money(product.price);
  const productHref = routeURL('produto',product.slug);

  return `<article class="product-card">
    <a class="product-card-link" href="${productHref}" aria-label="Abrir ${escapeHTML(name)}">
      <div class="product-image">
        ${img
          ? `<img src="${escapeHTML(img)}" alt="${escapeHTML(name)}" loading="lazy">`
          : '<span>Foto em preparação</span>'
        }
      </div>
    </a>
    <div class="product-info">
      <h3><a href="${productHref}">${escapeHTML(name)}</a></h3>
      ${product.short_description?`<p>${escapeHTML(product.short_description)}</p>`:''}
      ${price?`<div class="price">${price}</div>`:''}
      ${renderLink(
        wa(`Olá, vi ${name} no site da LUFF Store e quero saber disponibilidade, cores e tamanhos.`),
        'Consultar disponibilidade'
      )}
    </div>
  </article>`;
}

function renderProductCards(products){
  if(!products.length){
    return `<div class="consultation">
      <div>
        <h3>Essa seleção ainda está sendo preparada.</h3>
        <p>Fale com a equipe LUFF para consultar o que está disponível na loja, além de cores e tamanhos.</p>
      </div>
      ${renderLink(wa('Olá, quero consultar as peças disponíveis na LUFF Store.'),'Consultar pelo WhatsApp')}
    </div>`;
  }
  return `<div class="product-grid">${products.map(productCard).join('')}</div>`;
}

function validBanners(){
  return state.banners.filter(b=>inWindow(b));
}

function renderCampaigns(){
  const banners = validBanners();

  if(!banners.length){
    return `<section class="campaigns" id="novidades">
      <div class="campaign">
        <div class="campaign-copy">
          <p class="eyebrow">COLEÇÃO DE VERÃO · EM BREVE</p>
          <h2>Uma nova temporada está chegando.</h2>
          <p>Novidades em moda masculina estão a caminho da LUFF. Fale com a equipe para acompanhar os próximos lançamentos.</p>
        </div>
        ${renderLink(
          wa('Olá, quero receber novidades sobre a coleção de verão da LUFF Store.'),
          'Quero receber novidades',
          'btn btn-gold'
        )}
      </div>
    </section>`;
  }

  return `<section class="campaigns" id="novidades">
    ${banners.map(b=>{
      const image = safeURL(b.image_url);
      const cta = safeURL(b.cta_url);
      return `<article class="campaign ${image?'has-image':''}">
        ${image?`<img src="${escapeHTML(image)}" alt="" loading="lazy">`:''}
        <div class="campaign-copy">
          <p class="eyebrow">NOVIDADES LUFF</p>
          <h2>${escapeHTML(b.title)}</h2>
          ${b.subtitle?`<p>${escapeHTML(b.subtitle)}</p>`:''}
        </div>
        ${cta?`<a class="btn btn-gold" href="${escapeHTML(cta)}" target="_blank" rel="noopener">${escapeHTML(b.cta_label||'Ver novidade')}</a>`:''}
      </article>`;
    }).join('')}
  </section>`;
}

function renderLookCard(look){
  const cover = safeURL(look.cover_url);
  return `<article class="editorial-card">
    ${cover?`<img src="${escapeHTML(cover)}" alt="${escapeHTML(look.name)}" loading="lazy">`:''}
    <div>
      <h3>${escapeHTML(look.name)}</h3>
      <p>${escapeHTML(look.description||look.occasion||'Combinação LUFF')}</p>
      ${renderLink(wa(`Olá, quero conhecer o look ${look.name} da LUFF Store.`),'Consultar look')}
    </div>
  </article>`;
}

function renderHomeSections(){
  const featured = selectProducts(state.products,{featured:true},state.categories);
  const recent = selectProducts(state.products,{new:true},state.categories);

  const familyGroups = state.families.map(f=>{
    const categories = state.categories.filter(c=>
      c.family_id===f.id && !c.parent_id && c.is_active && c.show_on_site
    );
    if(!categories.length) return '';
    return `<section class="family-group" aria-labelledby="family-${f.id}">
      <h3 id="family-${f.id}" class="family-group-title">${escapeHTML(f.name)}</h3>
      <div class="category-grid">${renderCategoryCards(categories)}</div>
    </section>`;
  }).join('');

  $('#homeSections').innerHTML = `
    ${renderCampaigns()}

    <section class="section" id="catalogo">
      <div class="section-head">
        <div>
          <p class="eyebrow">CATÁLOGO</p>
          <h2>Explore o universo LUFF.</h2>
          <p>Roupas, calçados, acessórios e básicos organizados para facilitar sua escolha.</p>
        </div>
      </div>
      <div class="family-groups">
        ${familyGroups || `<div class="consultation"><div><h3>O catálogo está sendo organizado.</h3><p>Consulte a seleção disponível diretamente com a equipe LUFF.</p></div>${renderLink(wa('Olá, quero conhecer o catálogo da LUFF Store.'),'Consultar catálogo')}</div>`}
      </div>
    </section>

    <section class="section" id="destaques">
      <div class="section-head">
        <div>
          <p class="eyebrow">SELEÇÃO LUFF</p>
          <h2>Peças em destaque.</h2>
          <p>Somente produtos publicados no painel aparecem como itens disponíveis no site.</p>
        </div>
      </div>
      ${renderProductCards(featured.length ? featured : state.products.slice(0,8))}
    </section>

    ${recent.length?`<section class="section" id="recem-chegados">
      <div class="section-head">
        <div>
          <p class="eyebrow">RECÉM-CHEGADOS</p>
          <h2>Novidades.</h2>
        </div>
      </div>
      ${renderProductCards(recent.slice(0,8))}
    </section>`:''}

    <section class="section" id="looks">
      <div class="section-head">
        <div>
          <p class="eyebrow">INSPIRAÇÃO</p>
          <h2>Looks para diferentes momentos.</h2>
          <p>Os looks publicados no painel aparecem aqui sem reutilizar imagens de outras seções.</p>
        </div>
      </div>
      ${state.looks.length
        ? `<div class="look-grid">${state.looks.slice(0,6).map(renderLookCard).join('')}</div>`
        : `<div class="consultation"><div><h3>Monte seu look com a equipe LUFF.</h3><p>Conte a ocasião, seu tamanho e o estilo que procura.</p></div>${renderLink(wa('Olá, quero ajuda para montar um look na LUFF Store.'),'Montar meu look')}</div>`
      }
    </section>
  `;
}

function breadcrumbs(items){
  return `<nav class="breadcrumbs" aria-label="Você está aqui">
    ${items.map((item,index)=>index===items.length-1
      ? `<span>${escapeHTML(item[0])}</span>`
      : `<a href="${escapeHTML(item[1])}">${escapeHTML(item[0])}</a>`
    ).join('<span aria-hidden="true">/</span>')}
  </nav>`;
}

function renderProductDetail(product){
  const route = $('#routeView');
  const name = product.commercial_name || product.name;
  const media = productMedia(product.id);
  const price = money(product.price);
  const family = state.families.find(f=>f.id===product.family_id);
  const category = state.categories.find(c=>c.id===product.category_id);

  route.innerHTML = `
    ${breadcrumbs([
      ['Início','#inicio'],
      [family?.name||'Catálogo', family?routeURL('familia',family.slug):'#catalogo'],
      [category?.name||'Produto', category?routeURL('categoria',category.slug):'#catalogo'],
      [name,routeURL('produto',product.slug)]
    ])}
    <div class="detail-grid">
      <div class="detail-media">
        ${media[0]?.url
          ? `<img id="detailPrimaryImage" src="${escapeHTML(media[0].url)}" alt="${escapeHTML(name)}">`
          : `<div class="product-image"><span>Foto em preparação</span></div>`
        }
        ${media.length>1?`<div class="gallery" aria-label="Galeria de imagens">
          ${media.map((m,i)=>`<button type="button" data-gallery="${escapeHTML(m.url)}" aria-pressed="${i===0?'true':'false'}"><img src="${escapeHTML(m.url)}" alt=""></button>`).join('')}
        </div>`:''}
      </div>
      <div class="detail-copy">
        <p class="eyebrow">LUFF STORE</p>
        <h1 class="route-heading">${escapeHTML(name)}</h1>
        ${price?`<div class="price">${price}</div>`:''}
        ${product.short_description?`<p class="route-intro">${escapeHTML(product.short_description)}</p>`:''}
        ${product.description?`<div class="detail-description">${escapeHTML(product.description)}</div>`:''}
        ${renderLink(
          wa(`Olá, vi ${name} no site da LUFF Store e quero consultar disponibilidade, cores e tamanhos.`),
          'Consultar no WhatsApp',
          'btn btn-gold'
        )}
      </div>
    </div>
  `;

  route.querySelectorAll('[data-gallery]').forEach(button=>{
    button.addEventListener('click',()=>{
      const image = $('#detailPrimaryImage');
      if(image) image.src = button.dataset.gallery;
      route.querySelectorAll('[data-gallery]').forEach(b=>b.setAttribute('aria-pressed','false'));
      button.setAttribute('aria-pressed','true');
    });
  });
}

function renderCollectionsRoute(){
  const route = $('#routeView');
  route.innerHTML = `
    ${breadcrumbs([['Início','#inicio'],['Novidades','#colecoes']])}
    <p class="eyebrow">COLEÇÕES</p>
    <h1 class="route-heading">Novidades e coleções.</h1>
    ${state.collections.length
      ? `<div class="collection-grid">${state.collections.map(c=>{
          const cover = safeURL(c.cover_url);
          return `<article class="editorial-card">
            ${cover?`<img src="${escapeHTML(cover)}" alt="${escapeHTML(c.name)}" loading="lazy">`:''}
            <div>
              <h3>${escapeHTML(c.name)}</h3>
              <p>${escapeHTML(c.description||'Seleção LUFF')}</p>
              <a class="btn" href="${routeURL('colecao',c.slug)}">Explorar ↗</a>
            </div>
          </article>`;
        }).join('')}</div>`
      : `<div class="consultation"><div><h3>Nenhuma coleção publicada ainda.</h3><p>Consulte as novidades diretamente com a equipe.</p></div>${renderLink(wa('Olá, quero saber das novidades da LUFF Store.'),'Consultar novidades')}</div>`
    }
  `;
}

function renderNotFound(){
  $('#routeView').innerHTML = `
    <p class="eyebrow">LUFF STORE</p>
    <h1 class="route-heading">Página não encontrada.</h1>
    <p class="route-intro">Volte ao catálogo ou fale com a equipe.</p>
    <a class="btn" href="#inicio">Voltar ao início</a>
  `;
}

const homeAnchors = new Set(['inicio','catalogo','destaques','novidades','recem-chegados','sobre','contato']);

function renderRoute(){
  const route = $('#routeView');
  const home = $('#homeView');
  const {type,slug} = parseRoute(location.hash);

  if(!location.hash || location.hash==='#' || homeAnchors.has(type)){
    home.hidden = false;
    route.hidden = true;
    if(type && type!=='inicio'){
      requestAnimationFrame(()=>document.getElementById(type)?.scrollIntoView({block:'start'}));
    }
    return;
  }

  home.hidden = true;
  route.hidden = false;
  window.scrollTo({top:0,behavior:'instant'});

  if(type==='familia'){
    const family = state.families.find(f=>f.slug===slug);
    if(!family) return renderNotFound();
    const categories = state.categories.filter(c=>c.family_id===family.id && !c.parent_id);
    const products = selectProducts(state.products,{family:family.id},state.categories);
    route.innerHTML = `
      ${breadcrumbs([['Início','#inicio'],[family.name,routeURL('familia',family.slug)]])}
      <p class="eyebrow">FAMÍLIA</p>
      <h1 class="route-heading">${escapeHTML(family.name)}</h1>
      <p class="route-intro">${escapeHTML(family.description||'Explore as categorias desta família.')}</p>
      ${categories.length?`<div class="category-grid">${renderCategoryCards(categories)}</div>`:''}
      <div class="route-view-products"><h2>Produtos publicados</h2>${renderProductCards(products)}</div>
    `;
    return;
  }

  if(type==='categoria'){
    const category = state.categories.find(c=>c.slug===slug);
    if(!category) return renderNotFound();
    const family = state.families.find(f=>f.id===category.family_id);
    const children = state.categories.filter(c=>c.parent_id===category.id);
    const products = selectProducts(state.products,{category:category.id},state.categories);
    route.innerHTML = `
      ${breadcrumbs([
        ['Início','#inicio'],
        [family?.name||'Catálogo',family?routeURL('familia',family.slug):'#catalogo'],
        [category.name,routeURL('categoria',category.slug)]
      ])}
      <p class="eyebrow">CATEGORIA</p>
      <h1 class="route-heading">${escapeHTML(category.name)}</h1>
      <p class="route-intro">${escapeHTML(category.description||'Consulte as opções publicadas na LUFF Store.')}</p>
      ${children.length?`<div class="chips">${children.map(c=>`<a class="chip" href="${routeURL('categoria',c.slug)}">${escapeHTML(c.name)}</a>`).join('')}</div>`:''}
      ${renderProductCards(products)}
    `;
    return;
  }

  if(type==='produto'){
    const product = state.products.find(p=>p.slug===slug);
    if(!product) return renderNotFound();
    renderProductDetail(product);
    return;
  }

  if(type==='colecoes'){
    renderCollectionsRoute();
    return;
  }

  if(type==='colecao'){
    const collection = state.collections.find(c=>c.slug===slug);
    if(!collection) return renderNotFound();
    const ids = new Set(state.collectionItems.filter(x=>x.collection_id===collection.id).map(x=>x.product_id));
    const products = state.products.filter(p=>ids.has(p.id));
    route.innerHTML = `
      ${breadcrumbs([['Início','#inicio'],['Coleções','#colecoes'],[collection.name,routeURL('colecao',collection.slug)]])}
      <p class="eyebrow">COLEÇÃO</p>
      <h1 class="route-heading">${escapeHTML(collection.name)}</h1>
      <p class="route-intro">${escapeHTML(collection.description||'Seleção LUFF para a temporada.')}</p>
      ${renderProductCards(products)}
    `;
    return;
  }

  if(type==='looks'){
    route.innerHTML = `
      ${breadcrumbs([['Início','#inicio'],['Looks','#looks']])}
      <p class="eyebrow">INSPIRAÇÃO</p>
      <h1 class="route-heading">Looks LUFF.</h1>
      ${state.looks.length
        ? `<div class="look-grid">${state.looks.map(renderLookCard).join('')}</div>`
        : `<div class="consultation"><div><h3>Os looks estão sendo preparados.</h3><p>Fale com a equipe para montar uma combinação.</p></div>${renderLink(wa('Olá, quero montar um look na LUFF Store.'),'Falar com a equipe')}</div>`
      }
    `;
    return;
  }

  renderNotFound();
}

function updateContact(settings){
  if(!settings) return;
  const number = String(settings.whatsapp||WA_FALLBACK).replace(/\D/g,'') || WA_FALLBACK;

  $$('[data-wa]').forEach(link=>{
    link.href = wa(link.dataset.wa,number);
  });

  if(settings.instagram){
    $$('[data-instagram]').forEach(link=>link.href=settings.instagram);
  }

  if(settings.address){
    $$('[data-address]').forEach(el=>{
      el.innerHTML = escapeHTML(settings.address).replace(/\n/g,'<br>');
    });
  }

  if(settings.map_url){
    const map = safeURL(settings.map_url);
    if(map) $$('[data-map]').forEach(link=>link.href=map);
  }

  if(settings.slogan){
    $$('[data-slogan]').forEach(el=>el.textContent=settings.slogan.toUpperCase());
  }

  if(settings.seo_title) document.title = settings.seo_title;
  if(settings.seo_description){
    document.querySelector('meta[name="description"]')?.setAttribute('content',settings.seo_description);
  }
}

async function loadCatalog(){
  const status = $('#catalogStatus');
  status.textContent = 'Carregando catálogo…';

  try{
    const {data:tenant,error:tenantError} = await supabase
      .from('tenants')
      .select('id')
      .eq('slug',TENANT_SLUG)
      .maybeSingle();

    if(tenantError) throw tenantError;
    if(!tenant?.id) throw new Error('Tenant LUFF não encontrado.');

    const tenantId = tenant.id;

    const [
      {data:families,error:familiesError},
      {data:categories,error:categoriesError},
      {data:products,error:productsError},
      {data:media,error:mediaError},
      {data:settings},
      {data:collections},
      {data:collectionItems},
      {data:looks},
      {data:banners}
    ] = await Promise.all([
      supabase.from('catalog_families').select('*').eq('tenant_id',tenantId).order('sort_order'),
      supabase.from('catalog_categories').select('*').eq('tenant_id',tenantId).order('sort_order'),
      supabase.from('products').select('*').eq('tenant_id',tenantId).eq('published',true).eq('status','active').order('is_featured',{ascending:false}).order('updated_at',{ascending:false}).limit(100),
      supabase.from('product_media').select('product_id,url,is_primary,sort_order').eq('tenant_id',tenantId).order('is_primary',{ascending:false}).order('sort_order'),
      supabase.from('site_settings').select('*').eq('tenant_id',tenantId).maybeSingle(),
      supabase.from('collections').select('*').eq('tenant_id',tenantId).eq('status','active').eq('show_on_site',true).order('starts_at',{ascending:false}),
      supabase.from('collection_products').select('collection_id,product_id,sort_order').eq('tenant_id',tenantId).order('sort_order'),
      supabase.from('looks').select('*').eq('tenant_id',tenantId).eq('status','active').eq('published',true).order('updated_at',{ascending:false}),
      supabase.from('site_banners').select('*').eq('tenant_id',tenantId).eq('is_active',true).order('sort_order')
    ]);

    if(familiesError||categoriesError||productsError||mediaError){
      throw familiesError||categoriesError||productsError||mediaError;
    }

    const taxonomy = publicTaxonomy(families||[],categories||[]);

    Object.assign(state,{
      tenant,
      settings:settings||null,
      families:taxonomy.families,
      categories:taxonomy.categories,
      products:products||[],
      media:media||[],
      collections:collections||[],
      collectionItems:collectionItems||[],
      looks:looks||[],
      banners:banners||[]
    });

    renderFamilyNav();
    renderHomeSections();
    updateContact(state.settings);
    status.textContent = '';
    renderRoute();
  }catch(error){
    console.warn('LUFF catálogo:',error);
    Object.assign(state,{
      families:[],
      categories:[],
      products:[],
      media:[],
      collections:[],
      collectionItems:[],
      looks:[],
      banners:[]
    });
    renderFamilyNav();
    renderHomeSections();
    status.innerHTML = `Não foi possível carregar o catálogo agora. <button class="text-link" type="button" id="retryCatalog">Tentar novamente</button>`;
  }
}

const nav = $('#mainNav');
const menuToggle = $('.menu-toggle');

menuToggle?.addEventListener('click',()=>{
  const open = nav?.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded',String(Boolean(open)));
  menuToggle.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');
});

nav?.addEventListener('click',()=>{
  nav.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded','false');
  menuToggle?.setAttribute('aria-label','Abrir menu');
});

document.addEventListener('click',event=>{
  const retry = event.target.closest('#retryCatalog');
  if(retry){
    loadCatalog();
    return;
  }

  const link = event.target.closest('[data-home-target]');
  if(!link) return;

  const target = link.dataset.homeTarget;
  if(!target) return;

  event.preventDefault();
  history.replaceState(null,'','#inicio');
  renderRoute();
  requestAnimationFrame(()=>document.getElementById(target)?.scrollIntoView({behavior:'smooth',block:'start'}));
});

window.addEventListener('hashchange',renderRoute);
loadCatalog();
