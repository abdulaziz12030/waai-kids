const CART_KEY = 'waai_kids_cart_v1';
const WA_NUM = '966552794082';

export const Cart = {
  get(){ try{ return JSON.parse(localStorage.getItem(CART_KEY)) || []; }catch(_){ return []; } },
  set(items){ localStorage.setItem(CART_KEY, JSON.stringify(items)); Cart.renderBadge(); },
  add(item){ const items = Cart.get(); items.push(item); Cart.set(items); },
  upsert(item){
    const items = Cart.get();
    const idx = items.findIndex(x=>x.sku===item.sku);
    if(idx>-1) items[idx] = {...items[idx], ...item};
    else items.push(item);
    Cart.set(items);
  },
  update(i,patch){ const items = Cart.get(); items[i] = {...items[i], ...patch}; Cart.set(items); },
  remove(i){ const items = Cart.get(); items.splice(i,1); Cart.set(items); },
  clear(){ Cart.set([]); },
  count(){ return Cart.get().length; },
  total(){ return Cart.get().reduce((s,x)=> s + x.price*x.qty, 0); },
  renderBadge(){
    const el = document.querySelector('[data-cart-count]');
    if(el) el.textContent = Cart.count();
  },
  waLink(msg){ return 'https://wa.me/'+WA_NUM+'?text='+encodeURIComponent(msg); }
};
document.addEventListener('DOMContentLoaded', Cart.renderBadge);

// reveal on scroll
export function initReveal(){
  const rev = () => document.querySelectorAll('[data-reveal]').forEach(el=>{
    const r = el.getBoundingClientRect();
    if(r.top < window.innerHeight - 80) el.classList.add('visible');
  });
  window.addEventListener('scroll',rev); window.addEventListener('load',rev); rev();
}
