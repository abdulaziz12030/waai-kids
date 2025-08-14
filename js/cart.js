export const WA_NUM = '966552794082';
export const CART_KEY = 'waai_kids_cart_v1';
export const REVIEWS_KEY = 'waai_kids_reviews_v1';

export const Cart = {
  get(){ try{ return JSON.parse(localStorage.getItem(CART_KEY)) || []; }catch{ return []; } },
  set(items){ localStorage.setItem(CART_KEY, JSON.stringify(items)); this.renderBadge(); },
  upsert(item){
    const it=this.get(); const i=it.findIndex(x=>x.sku===item.sku);
    if(i>-1) it[i]={...it[i],...item}; else it.push(item);
    this.set(it);
  },
  count(){ return this.get().length; },
  total(){ return this.get().reduce((s,x)=>s+x.price*x.qty,0); },
  renderBadge(){ const el=document.querySelector('[data-cart-count]')||document.querySelector('.bubble'); if(el) el.textContent=this.count(); }
};

export function initReveal(){
  const fire=()=>document.querySelectorAll('[data-reveal]').forEach(e=>{
    const r=e.getBoundingClientRect(); if(r.top<innerHeight-80) e.classList.add('visible');
  });
  addEventListener('scroll',fire); addEventListener('load',fire); fire();
}
document.addEventListener('DOMContentLoaded',()=>Cart.renderBadge());

// تقييمات مباشرة
export const Reviews = {
  all(){ try{ return JSON.parse(localStorage.getItem(REVIEWS_KEY)) || []; }catch{ return []; } },
  add({name='ضيف',stars=5,text=''}){
    const arr=this.all(); arr.push({id:Date.now(), name,stars,text,approved:true});
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(arr));
  },
  clear(){ localStorage.removeItem(REVIEWS_KEY); }
};
