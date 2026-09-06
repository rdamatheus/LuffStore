import { supabase, TENANT_SLUG } from './luff-supabase.js';

const WHATSAPP = '553235124993';
const fallbackCategories = [
  ['Camisas','./assets/editorial/hero.webp'],['Polos','./assets/editorial/hero.webp'],['Camisetas','./assets/editorial/hero.webp'],['Calças','./assets/editorial/hero.webp'],['Bermudas','./assets/editorial/hero.webp'],['Jaquetas','./assets/editorial/hero.webp'],['Calçados','./assets/editorial/shoe.webp'],['Acessórios','./assets/editorial/hero.webp']
];
const fallbackProducts = [
  ['Novidades LUFF','Peças selecionadas em breve','./assets/editorial/hero.webp'],['Essenciais masculinos','Consulte cores e tamanhos','./assets/editorial/hero.webp'],['Looks completos','Atendimento personalizado','./assets/editorial/hero.webp'],['Calçados e acessórios','Consulte disponibilidade','./assets/editorial/shoe.webp']
];

const money = value => value == null ? null : new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value));
const waLink = name => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Olá, vi ${name} no site da LUFF Store e quero saber disponibilidade, cores e tamanhos.`)}`;

function renderCategories(items){
  const grid=document.querySelector('#categoryGrid');
  grid.innerHTML=items.map((item,i)=>{
    const name=item.name||item[0];
    const image=item.image_url||fallbackCategories[i%fallbackCategories.length][1];
    return `<a class="category-card" href="#destaques"><img src="${image}" alt="${name}" loading="lazy"><strong>${name}</strong></a>`;
  }).join('');
}
function renderProducts(items){
  const grid=document.querySelector('#productGrid');
  grid.innerHTML=items.map((p,i)=>{
    const name=p.commercial_name||p.name||p[0];
    const desc=p.short_description||p[1]||'Fale com a equipe LUFF para consultar disponibilidade.';
    const image=p.primary_image||p[2]||fallbackProducts[i%fallbackProducts.length][2];
    const price=money(p.price);
    return `<article class="product-card"><img src="${image}" alt="${name}" loading="lazy"><div class="product-info"><h3>${name}</h3>${price?`<div class="price">${price}</div>`:`<div class="muted">${desc}</div>`}<a class="btn btn-outline" target="_blank" rel="noopener" href="${waLink(name)}">Ver no WhatsApp</a></div></article>`;
  }).join('');
}
async function loadCatalog(){
  renderCategories(fallbackCategories);
  renderProducts(fallbackProducts);
  try{
    const {data:tenant}=await supabase.from('tenants').select('id').eq('slug',TENANT_SLUG).maybeSingle();
    if(!tenant?.id)return;
    const [{data:categories},{data:products}]=await Promise.all([
      supabase.from('catalog_categories').select('id,name,slug,image_url,sort_order').eq('tenant_id',tenant.id).is('parent_id',null).eq('is_active',true).eq('show_on_site',true).order('sort_order').limit(12),
      supabase.from('products').select('id,name,commercial_name,short_description,price,slug').eq('tenant_id',tenant.id).eq('published',true).eq('status','active').order('is_featured',{ascending:false}).limit(8)
    ]);
    if(categories?.length)renderCategories(categories);
    if(products?.length){
      const ids=products.map(p=>p.id);
      const {data:media}=await supabase.from('product_media').select('product_id,url,is_primary,sort_order').in('product_id',ids).order('is_primary',{ascending:false}).order('sort_order');
      const imageByProduct={};
      (media||[]).forEach(m=>{if(!imageByProduct[m.product_id])imageByProduct[m.product_id]=m.url});
      renderProducts(products.map(p=>({...p,primary_image:imageByProduct[p.id]})));
    }
  }catch(error){console.warn('LUFF catálogo: usando conteúdo editorial de contingência.',error)}
}

document.querySelector('.menu-toggle')?.addEventListener('click',e=>{const nav=document.querySelector('.main-nav');nav.classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',String(nav.classList.contains('open')))});
document.querySelectorAll('.main-nav a').forEach(a=>a.addEventListener('click',()=>document.querySelector('.main-nav')?.classList.remove('open')));
loadCatalog();
