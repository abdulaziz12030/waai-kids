document.querySelectorAll('.product-card').forEach(prod=>{
  const msg=prod.querySelector('.gift-message');
  const sender=prod.querySelector('.gift-sender');
  const card=prod.querySelector('.gift-preview .card');
  const msgNode=card.querySelector('.msg');
  const senderNode=card.querySelector('.sender');
  const whats=prod.querySelector('.whats-order');

  function sync(){
    msgNode.textContent=msg.value||'نورت الدنيا يا أجمل العطايا';
    senderNode.textContent=sender.value?('— '+sender.value):'';
  }
  msg.oninput=sender.oninput=sync; sync();

  whats.onclick=e=>{
    e.preventDefault();
    const text=`طلب: ${prod.querySelector('h2').textContent}\nرسالة: ${msg.value}\n${sender.value?'المهدي: '+sender.value:''}`;
    window.open(`https://wa.me/966570905999?text=${encodeURIComponent(text)}`,'_blank');
  };
});
