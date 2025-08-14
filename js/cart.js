// رقم الواتساب المعتمد
export const WA_NUM = '966552794082';
export const CART_KEY = 'waai_kids_cart_v1';

// سلة بسيطة على localStorage
export const Cart = {
  get(){ try{ return JSON.parse(localStorage.getItem(CART_KEY)) || []; }catch{ return []; } },
  set(items){ localStorage.setItem(CART_KEY, JSON.stringify(items)); this.renderBadge(); },
  upsert(item){
    const it=this.get();
    const i=it.findIndex(x=>x.sku===item.sku);
    if(i>-1) it[i]={...it[i],...item}; else it.push(item);
    this.set(it);
  },
  getLast(){ const it=this.get(); return it[it.length-1]; },
  count(){ return this.get().length; },
  total(){ return this.get().reduce((s,x)=>s+x.price*x.qty,0); },
  renderBadge(){ const el=document.querySelector('[data-cart-count]'); if(el) el.textContent=this.count(); }
};

// حركة ظهور
export function initReveal(){
  const fire=()=>document.querySelectorAll('[data-reveal]').forEach(e=>{
    const r=e.getBoundingClientRect(); if(r.top<innerHeight-80) e.classList.add('visible');
  });
  addEventListener('scroll',fire); addEventListener('load',fire); fire();
}

document.addEventListener('DOMContentLoaded',()=>Cart.renderBadge());