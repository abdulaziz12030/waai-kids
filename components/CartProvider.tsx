
'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Product } from '@/lib/products';

export type CartItem = { id:string; name:string; price:number; image:string; qty:number; };
type Ctx = { items:CartItem[]; add:(p:Product,qty?:number)=>void; remove:(id:string)=>void; setQty:(id:string,qty:number)=>void; clear:()=>void; count:number; total:number; };

const CartContext = createContext<Ctx|null>(null);
const KEY='waai-kids-cart';

export function CartProvider({children}:{children:React.ReactNode}){
  const [items,setItems]=useState<CartItem[]>([]);
  useEffect(()=>{ try{const raw=localStorage.getItem(KEY); if(raw) setItems(JSON.parse(raw));}catch{} },[]);
  useEffect(()=>{ try{localStorage.setItem(KEY, JSON.stringify(items));}catch{} },[items]);

  const add=(p:Product,qty=1)=> setItems(prev=>{
    const ex=prev.find(i=>i.id===p.id);
    return ex? prev.map(i=>i.id===p.id? {...i,qty:i.qty+qty}:i) : [...prev,{id:p.id,name:p.name,price:p.price,image:p.image,qty}];
  });
  const remove=(id:string)=> setItems(prev=>prev.filter(i=>i.id!==id));
  const setQty=(id:string,qty:number)=> setItems(prev=>prev.map(i=>i.id===id? {...i,qty:Math.max(1,qty)}:i));
  const clear=()=> setItems([]);
  const count=useMemo(()=>items.reduce((a,b)=>a+b.qty,0),[items]);
  const total=useMemo(()=>items.reduce((a,b)=>a+b.qty*b.price,0),[items]);
  return <CartContext.Provider value={{items,add,remove,setQty,clear,count,total}}>{children}</CartContext.Provider>;
}
export function useCart(){ const ctx=useContext(CartContext); if(!ctx) throw new Error('useCart must be used within CartProvider'); return ctx; }
