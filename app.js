let db=null;

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

function createPurchaseModal(){
  if($('purchaseModal')) return;

  const style=document.createElement('style');
  style.textContent=`
    #purchaseModal{position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:999;display:none;align-items:center;justify-content:center;padding:18px}
    #purchaseModal.show{display:flex}
    .purchase-box{width:min(520px,100%);max-height:90vh;overflow:auto;background:#101010;border:1px solid #5a4816;border-radius:18px;padding:24px;box-shadow:0 25px 80px rgba(0,0,0,.7)}
    .purchase-box h2{margin:0 0 6px;color:#f1d36a}
    .purchase-title{color:#ddd7c7;margin-bottom:16px}
    .purchase-box label{display:block;color:#c9a227;font-size:13px;font-weight:800;margin:10px 0 5px}
    .purchase-box input{margin:0}
    .payment-box{margin-top:15px;padding:15px;border-radius:12px;background:#19150a;border:1px solid #5a4816}
    .payment-number{font-size:20px;font-weight:900;color:#f1d36a;direction:ltr;text-align:center;margin:8px 0}
    .purchase-actions{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap}
    .purchase-actions button{flex:1;min-width:120px;padding:12px;border-radius:11px;font-family:inherit;font-weight:900;cursor:pointer}
    .purchase-submit{background:#c9a227;border:1px solid #c9a227;color:#080706}
    .purchase-cancel{background:#0c0b08;border:1px solid #51431e;color:#f1d36a}
    .payment-btn{background:#17130a;border:1px solid #66521c;color:#f1d36a}
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
          <button type="submit" class="purchase-submit" id="purchaseSubmit">
            إنشاء الطلب
          </button>

          <button type="button" class="purchase-cancel" id="purchaseCancel">
            إلغاء
          </button>
        </div>
      </form>

      <div id="paymentArea" style="display:none">
        <div class="payment-box">
          <div style="color:#ddd7c7;font-weight:900">💳 طريقة الدفع</div>
          <div id="paymentInstructions" class="purchase-note"></div>

          <div style="margin-top:10px;color:#aaa">اسم صاحب الحساب:</div>
          <div id="masterName" style="font-weight:900;color:#fff"></div>

          <div style="margin-top:10px;color:#aaa">رقم الماستر:</div>
          <div id="masterNumber" class="payment-number"></div>

          <button type="button" class="payment-btn" id="copyMaster">
            📋 نسخ رقم الماستر
          </button>

          <button type="button" class="payment-btn" id="whatsappPayment">
            📱 التواصل عبر واتساب
          </button>
        </div>

        <label>رقم الإيصال</label>
        <input id="receiptNumber" placeholder="اكتب رقم الإيصال بعد التحويل">

        <div class="purchase-actions">
          <button type="button" class="purchase-submit" id="submitPaymentBtn">
            ✅ تم التحويل
          </button>

          <button type="button" class="payment-btn" id="checkStatusBtn">
            🔍 حالة الطلب
          </button>
        </div>
      </div>

      <div id="orderResult" class="order-result" style="display:none"></div>

      <div class="purchase-note">
        بعد التحويل أرسل رقم الإيصال للتحقق من الدفع.
        لا يتم تسليم الملف إلا بعد تأكيد الدفع.
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  let currentOrder=null;

  $('purchaseCancel').addEventListener('click',closePurchaseModal);

  modal.addEventListener('click',e=>{
    if(e.target===modal) closePurchaseModal();
  });

  async function loadPaymentSettings(){
    const {data,error}=await db
      .from('payment_settings')
      .select('master_name,master_number,whatsapp_number,instructions')
      .eq('id',1)
      .single();

    if(error || !data){
      $('paymentInstructions').textContent='تعذر تحميل بيانات الدفع.';
      return;
    }

    $('masterName').textContent=data.master_name || '';
    $('masterNumber').textContent=data.master_number || '';
    $('paymentInstructions').textContent=data.instructions || '';

    $('copyMaster').onclick=async()=>{
      try{
        await navigator.clipboard.writeText(data.master_number || '');
        toast('تم نسخ رقم الماستر ✅');
      }catch{
        toast('انسخ الرقم يدوياً.');
      }
    };

    $('whatsappPayment').onclick=()=>{
      const number=String(data.whatsapp_number || '').replace(/[^0-9]/g,'');
      if(!number){
        toast('رقم واتساب غير مضبوط.');
        return;
      }

      const text=encodeURIComponent(
        `السلام عليكم، أريد دفع قيمة المحتوى: ${selectedItem?.title || ''}`
      );

      window.open(`https://wa.me/${number}?text=${text}`,'_blank');
    };
  }

  $('purchaseForm').addEventListener('submit',async e=>{
    e.preventDefault();

    if(!selectedItem) return;

    const btn=$('purchaseSubmit');
    const result=$('orderResult');

    const payload={
      content_id:selectedItem.id,
      customer_name:$('buyerName').value.trim(),
      customer_phone:$('buyerPhone').value.trim(),
      customer_telegram:$('buyerTelegram').value.trim(),
      payment_method:'manual_master'
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
        throw new Error(data.error || 'تعذر إنشاء الطلب');
      }

      currentOrder=data.order;

      $('purchaseForm').style.display='none';
      $('paymentArea').style.display='block';

      result.style.display='block';
      result.innerHTML=`
        <div>✅ تم إنشاء الطلب</div>
        <div>🧾 رقم الطلب:</div>
        <div class="order-code">${esc(currentOrder.order_number)}</div>
        <div>💰 المبلغ: ${Number(currentOrder.amount).toLocaleString('ar-IQ')} ${esc(currentOrder.currency || 'IQD')}</div>
        <div style="margin-top:8px">حوّل المبلغ ثم اكتب رقم الإيصال واضغط «تم التحويل».</div>
      `;

      await loadPaymentSettings();

    }catch(err){
      result.style.display='block';
      result.innerHTML=`❌ ${esc(err.message || 'حدث خطأ')}`;
    }finally{
      btn.disabled=false;
      btn.textContent='إنشاء الطلب';
    }
  });

  $('submitPaymentBtn').addEventListener('click',async()=>{
    if(!currentOrder){
      toast('أنشئ الطلب أولاً.');
      return;
    }

    const receipt=$('receiptNumber').value.trim();

    if(!receipt){
      toast('اكتب رقم الإيصال أولاً.');
      return;
    }

    const btn=$('submitPaymentBtn');
    btn.disabled=true;
    btn.textContent='جاري إرسال الإيصال...';

    try{
      const res=await fetch(SUBMIT_PAYMENT_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          order_number:currentOrder.order_number,
          customer_phone:$('buyerPhone').value.trim(),
          receipt_number:receipt
        })
      });

      const data=await res.json().catch(()=>({}));

      if(!res.ok || !data.ok){
        throw new Error(data.error || 'تعذر إرسال الإيصال');
      }

      $('orderResult').style.display='block';
      $('orderResult').innerHTML=`
        <div>✅ تم إرسال رقم الإيصال بنجاح</div>
        <div>🧾 الطلب: <b>${esc(currentOrder.order_number)}</b></div>
        <div>⏳ الحالة: بانتظار التحقق من الدفع</div>
      `;

      toast('تم إرسال الإيصال للتحقق ✅');

    }catch(err){
      toast(err.message || 'حدث خطأ');
    }finally{
      btn.disabled=false;
      btn.textContent='✅ تم التحويل';
    }
  });

  $('checkStatusBtn').addEventListener('click',async()=>{
    if(!currentOrder){
      toast('أنشئ الطلب أولاً.');
      return;
    }

    const btn=$('checkStatusBtn');
    btn.disabled=true;
    btn.textContent='جاري التحقق...';

    try{
      const res=await fetch(ORDER_STATUS_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          order_number:currentOrder.order_number,
          customer_phone:$('buyerPhone').value.trim()
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
  });
}

let selectedItem=null;

function openPurchaseModal(item){
  createPurchaseModal();
  selectedItem=item;
  $('purchaseTitle').textContent=`${item.title} — ${Number(item.price||0).toLocaleString('ar-IQ')} د.ع`;
  $('purchaseForm').style.display='';
  $('paymentArea').style.display='none';
  $('orderResult').style.display='none';
  $('orderResult').innerHTML='';
  $('receiptNumber').value='';
  $('purchaseModal').classList.add('show');
  $('buyerName').focus();
}

function closePurchaseModal(){
  const modal=$('purchaseModal');
  if(modal) modal.classList.remove('show');
  selectedItem=null;
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

function initApp(){
  const statusEl=$('status');
  if(!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY){
    if(statusEl) statusEl.textContent='تعذر تشغيل الموقع: إعدادات Supabase غير موجودة.';
    return;
  }

  db=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_KEY);

  createPurchaseModal();

  const searchEl=$('search');
  const searchBtnEl=$('searchBtn');
  if(searchEl) searchEl.addEventListener('input',render);
  if(searchBtnEl) searchBtnEl.addEventListener('click',render);

  document.querySelectorAll('#filters button').forEach(b=>{
    b.addEventListener('click',()=>{
      document.querySelectorAll('#filters button').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      activeFilter=b.dataset.filter || 'الكل';
      render();
    });
  });

  if($('whatsBtn')){
    $('whatsBtn').addEventListener('click',()=>{
      const n=$('contactName')?.value.trim() || 'طالب';
      const m=$('contactMsg')?.value.trim() || '';
      const text=encodeURIComponent(`السلام عليكم، أنا ${n}\n${m}`);
      location.href=`https://wa.me/96477404078255?text=${text}`;
    });
  }

  load();
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',initApp);
}else{
  initApp();
}
