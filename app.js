const db=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_KEY);

const CREATE_ORDER_URL='https://bfiobmxgkxrmkukorqdq.supabase.co/functions/v1/create-order';
const SUBMIT_PAYMENT_URL='https://bfiobmxgkxrmkukorqdq.supabase.co/functions/v1/submit-payment';
const ORDER_STATUS_URL='https://bfiobmxgkxrmkukorqdq.supabase.co/functions/v1/order-status';
let items=[];
let activeFilter='الكل';

const $=id=>document.getElementById(id);

function toast(message){
  let el=$('appToast');
  if(!el){
    el=document.createElement('div');
    el.id='appToast';
    el.className='toast';
    document.body.appendChild(el);
  }
  el.textContent=message;
  el.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer=setTimeout(()=>el.classList.remove('show'),3500);
}

function esc(v){
  return String(v??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function icon(t){
  return t==='أسئلة'?'📝':t==='ملازم'?'📚':t==='كتب'?'📖':'🔎';
}

function isPaid(item){
  return Number(item.price||0)>0;
}

function customer_phone:$('buyerPhone').value.trim()
    })
  });

  const data=await res.json().catch(()=>({}));

  if(!res.ok || !data.ok){
    throw new Error(data.error || 'تعذر جلب حالة الطلب');
  }

  const order=data.order;

  let html=`
    <div>🧾 الطلب: <b>${esc(order.order_number)}</b></div>
    <div>📚 المحتوى: ${esc(order.title)}</div>
    <div>💰 المبلغ: ${Number(order.amount).toLocaleString('ar-IQ')} ${esc(order.currency || 'IQD')}</div>
    <div>📌 ${esc(order.message)}</div>
  `;

  if(order.receipt_number){
    html+=`<div>🧾 رقم الإيصال: ${esc(order.receipt_number)}</div>`;
  }

  if(order.payment_status==='paid' && order.claim_code){
    html+=`
      <hr>
      <div>🎉 تم تأكيد الدفع</div>
      <div>🔐 كود التسليم:</div>
      <div class="order-code">${esc(order.claim_code)}</div>
      <div class="purchase-note">
        أرسل هذا الكود إلى بوت مكتبة الهاشمي لاستلام الملف.
      </div>
    `;
  }

  $('orderResult').style.display='block';
  $('orderResult').innerHTML=html;

}catch(err){

  toast(err.message || 'حدث خطأ');

}finally{

  btn.disabled=false;
  btn.textContent='🔍 حالة الطلب';

}
}); }{
  if($('purchaseModal')) return;

  const style=document.createElement('style');
  style.textContent=`
    #purchaseModal{position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:999;display:none;align-items:center;justify-content:center;padding:18px}
    #purchaseModal.show{display:flex}
    .purchase-box{width:min(520px,100%);background:#101010;border:1px solid #5a4816;border-radius:18px;padding:24px;box-shadow:0 25px 80px rgba(0,0,0,.7)}
    .purchase-box h2{margin:0 0 6px;color:#f1d36a}
    .purchase-box .purchase-title{color:#ddd7c7;margin-bottom:16px}
    .purchase-box label{display:block;color:#c9a227;font-size:13px;font-weight:800;margin:10px 0 5px}
    .purchase-box input{margin:0}
    .purchase-actions{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap}
    .purchase-actions button{flex:1;min-width:120px;padding:12px;border-radius:11px;font-family:inherit;font-weight:900;cursor:pointer}
    .purchase-submit{background:#c9a227;border:1px solid #c9a227;color:#080706}
    .purchase-cancel{background:#0c0b08;border:1px solid #51431e;color:#f1d36a}
    .order-result{margin-top:15px;padding:14px;border-radius:12px;background:#19150a;border:1px solid #5a4816;line-height:2}
    .order-code{font-size:22px;font-weight:900;color:#f1d36a;letter-spacing:1px}
    .purchase-note{font-size:12px;color:#aaa38f;margin-top:10px}
  `;
  document.head.appendChild(style);

  const modal=document.createElement('div');
  modal.id='purchaseModal';
  modal.innerHTML=`
    <div class="purchase-box" role="dialog" aria-modal="true">
      <h2>🛒 شراء المحتوى</h2>
      <div id="purchaseTitle" class="purchase-title"></div>
      <form id="purchaseForm">
        <label>الاسم</label>
        <input id="buyerName" required placeholder="اكتب اسمك">
        <label>رقم الهاتف</label>
        <input id="buyerPhone" required inputmode="tel" placeholder="07xxxxxxxxx">
        <label>حساب التليجرام (اختياري)</label>
        <input id="buyerTelegram" placeholder="@username">
        <div class="purchase-actions">
          <button type="submit" class="purchase-submit" id="purchaseSubmit">إنشاء الطلب</button>
          <button type="button" class="purchase-cancel" id="purchaseCancel">إلغاء</button>
        </div>
      </form>
      <div id="orderResult" class="order-result" style="display:none"></div>
      <div class="purchase-note">بعد إنشاء الطلب يصلك رقم الطلب وكود المطالبة. لا يتم تسليم الملف إلا بعد تأكيد الدفع.</div>
    </div>
  `;
  document.body.appendChild(modal);

  $('purchaseCancel').addEventListener('click',closePurchaseModal);
  modal.addEventListener('click',e=>{if(e.target===modal)closePurchaseModal()});
  $('purchaseForm').addEventListener('submit',submitOrder);
}

let selectedItem=null;

function openPurchaseModal(item){
  createPurchaseModal();
  selectedItem=item;
  $('purchaseTitle').textContent=`${item.title} — ${Number(item.price||0).toLocaleString('ar-IQ')} د.ع`;
  $('purchaseForm').style.display='';
  $('orderResult').style.display='none';
  $('orderResult').innerHTML='';
  $('purchaseModal').classList.add('show');
  $('buyerName').focus();
}

function closePurchaseModal(){
  const modal=$('purchaseModal');
  if(modal) modal.classList.remove('show');
  selectedItem=null;
}

async function submitOrder(e){
  e.preventDefault();
  if(!selectedItem) return;

  const btn=$('purchaseSubmit');
  const result=$('orderResult');
  const payload={
    content_id:selectedItem.id,
    customer_name:$('buyerName').value.trim(),
    customer_phone:$('buyerPhone').value.trim(),
    customer_telegram:$('buyerTelegram').value.trim(),
    payment_method:'pending'
  };

  if(!payload.customer_name || !payload.customer_phone){
    toast('اكتب الاسم ورقم الهاتف أولاً.');
    return;
  }

  btn.disabled=true;
  btn.textContent='جاري إنشاء الطلب...';

  try{
    const res=await fetch(CREATE_ORDER_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });

    const data=await res.json().catch(()=>({}));

    if(!res.ok || !data.ok){
      throw new Error(data.error||data.message||'تعذر إنشاء الطلب');
    }

    const order=data.order||{};
    const orderNumber=order.order_number||data.order_number||'غير متوفر';
    const claimCode=order.claim_code||data.claim_code||'سيظهر بعد تحديث الطلب';

    $('purchaseForm').style.display='none';
    result.style.display='block';
        result.innerHTML=`
      <div>✅ تم إنشاء الطلب بنجاح</div>
      <div>🧾 رقم الطلب: <strong>${esc(orderNumber)}</strong></div>
      <div>💰 المبلغ: <strong>${Number(order.amount||selectedItem.price||0).toLocaleString('ar-IQ')} د.ع</strong></div>
      <div>🔐 كود المطالبة:</div>
      <div class="order-code">${esc(claimCode)}</div>
      <div style="color:#aaa38f;font-size:12px">بعد تأكيد الدفع، استخدم هذا البوت: <b>@AlhashmiLibrary_bot</b> لاستلام الملف.</div>
    `;
    toast('تم إنشاء الطلب وإرسال إشعار التليجرام.');
  }catch(err){
    console.error(err);
    toast(err.message||'حدث خطأ أثناء إنشاء الطلب.');
  }finally{
    btn.disabled=false;
    btn.textContent='إنشاء الطلب';
  }
}

async function load(){
  const {data,error}=await db.from('content').select('*').order('created_at',{ascending:false});
  if(error){
    $('status').textContent='تعذر تحميل المحتوى. تأكد من إعداد Supabase وسياسات RLS.';
    return;
  }
  items=data||[];
  render();
}

function render(){
  const q=($('search').value||'').trim().toLowerCase();

  const rows=items.filter(x=>{
    const filterOk=
      activeFilter==='الكل' ||
      (activeFilter==='المدفوع' && isPaid(x)) ||
      x.type===activeFilter;

    return filterOk &&
      (`${x.title} ${x.type} ${x.stage} ${x.branch||''} ${x.subject||''}`)
      .toLowerCase()
      .includes(q);
  });

  $('status').textContent=`${rows.length} محتوى`;

  $('cards').innerHTML=rows.map(x=>{
    const paid=isPaid(x);
    const url=x.file_path
      ?db.storage.from('library-files').getPublicUrl(x.file_path).data.publicUrl
      :null;

    return `<article class="card user-item-card">
      <div class="icon">${icon(x.type)}</div>
      <span class="tag">${esc(x.type)} • ${esc(x.stage)}${x.branch?' • '+esc(x.branch):''}</span>
      <h3>${esc(x.title)}</h3>
      <p>${esc(x.subject||'')}</p>
      ${paid
        ? `<span class="price">💰 ${Number(x.price).toLocaleString('ar-IQ')} د.ع</span>
           <button class="buy-content-btn" data-id="${x.id}" style="display:block;margin-top:14px;width:100%;padding:10px 12px;border:1px solid #c9a227;border-radius:9px;background:#c9a227;color:#080706;font-family:inherit;font-weight:900;cursor:pointer">🛒 شراء الآن</button>`
        : (url?`<a href="${url}" target="_blank" rel="noopener">فتح الملف</a>`:'')}
    </article>`;
  }).join('')||'<div class="empty">لا يوجد محتوى مطابق حاليًا.</div>';

  document.querySelectorAll('.buy-content-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const item=items.find(x=>String(x.id)===String(btn.dataset.id));
      if(item) openPurchaseModal(item);
    });
  });
}

createPurchaseModal();

$('search').addEventListener('input',render);
$('searchBtn').addEventListener('click',render);

document.querySelectorAll('#filters button').forEach(b=>{
  b.addEventListener('click',()=>{
    document.querySelectorAll('#filters button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    activeFilter=b.dataset.filter;
    render();
  });
});

if($('whatsBtn')){
  $('whatsBtn').addEventListener('click',()=>{
    const n=$('contactName').value.trim();
    const m=$('contactMsg').value.trim();
    const text=encodeURIComponent(`السلام عليكم، أنا ${n||'طالب'}\n${m}`);
    location.href=`https://wa.me/96477404078255?text=${text}`;
  });
}

load();
