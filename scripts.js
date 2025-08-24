// Slider
(function(){
  const root=document.querySelector('.slider'); if(!root) return;
  const slides=[...root.querySelectorAll('.slide')];
  const dotsEl=root.querySelector('.dots');
  const prev=root.querySelector('.prev'),next=root.querySelector('.next');
  let i=0,t,delay=+root.dataset.autoplay||6000;
  function go(idx){i=(idx+slides.length)%slides.length;
    slides.forEach((s,si)=>s.classList.toggle('active',si===i));
    dotsEl.querySelectorAll('.dot').forEach((d,di)=>d.classList.toggle('active',di===i));}
  function restart(){clearInterval(t);t=setInterval(()=>go(i+1),delay);}
  prev.onclick=()=>{go(i-1);restart()}; next.onclick=()=>{go(i+1);restart()};
  slides.forEach((_,idx)=>{let b=document.createElement('button');b.className='dot'+(idx===0?' active':'');
    b.onclick=()=>{go(idx);restart()}; dotsEl.appendChild(b);});
  go(0); restart();
})();

// Gift Card preview + WhatsApp
document.querySelectorAll('.product').forEach(prod=>{
  const msg=prod.querySelector('.gift-message');
  const sender=prod.querySelector('.gift-sender');
  const canvas=prod.querySelector('.gift-card-canvas');
  const msgNode=canvas.querySelector('.msg');
  const senderNode=canvas.querySelector('.sender');
  const btn=prod.querySelector('.preview-btn');
  const whats=prod.querySelector('.whats-order');
  const name=prod.dataset.product;
  function sync(){
    msgNode.textContent=msg.value||'نورت الدنيا يا أجمل العطايا';
    senderNode.textContent=sender.value?('— '+sender.value):'';
  }
  msg.oninput=sender.oninput=sync; sync();
  btn.onclick=()=>canvas.scrollIntoView({behavior:'smooth',block:'center'});
  whats.onclick=e=>{
    e.preventDefault();
    let text=`طلب: ${name}\nرسالة: ${msg.value}\n${sender.value?'المهدي: '+sender.value:''}`;
    window.open(`https://wa.me/966570905999?text=${encodeURIComponent(text)}`,'_blank');
  };
});
