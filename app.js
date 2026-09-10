/* مكتبة الهاشمي — التطبيق الرئيسي
   نسخة مستقرة: محتوى + شراء + دفع + حالة الطلب + تسليم Telegram
*/

const SUPABASE_URL=window.SUPABASE_URL||'https://bfiobmxgkxrmkukorqdq.supabase.co';
const SUPABASE_KEY=window.SUPABASE_KEY||'sb_publishable_3zAtbhl55a-jSMvuIGd6cw_LFv1nyCJ';

if(!window.supabase){
  console.error('Supabase JS غير محمّل.');
  throw new Error('Supabase JS غير محمّل');
}

const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

const CREATE_ORDER_URL='https://bfiobmxgkxrmkukorqdq.supabase.co/functions/v1/create-order';
const SUBMIT_PAYMENT_URL='https://bfiobmxgkxrmkukorqdq.supabase.co/functions/v1/submit-payment';
const ORDER_STATUS_URL='https://bfiobmxgkxrmkukorqdq.supabase.co/functions/v1/order-status';
const TELEGRAM_BOT_USERNAME='ydyytf';
const PAYMENT_QR_URL='qr-maktabat-alhashmi.jpg';
const FALLBACK_MASTER_NUMBER='910132556242';

let items=[];
let activeFilter='الكل';
let selectedItem=null; // مهم: كان ناقصاً في النسخة الأخيرة وكان يسبب خطأ عند الشراء.

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
  return Number(item?.price||0)>0;
}

function publicFileUrl(path){
  if(!path) return null;
  try{
    return db.storage.from('library-files').getPublicUrl(path).data?.publicUrl||null;
  }catch{
    return null;
  }
}

function createPurchaseModal(){
  if($('purchaseModal')) return;

  const style=document.createElement('style');
  style.textContent=`
    #purchaseModal{position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:9999;display:none;align-items:center;justify-content:center;padding:18px}
    #purchaseModal.show{display:flex}
    .purchase-box{width:min(540px,100%);max-height:92vh;overflow:auto;background:#101010;border:1px solid #5a4816;border-radius:18px;padding:24px;box-shadow:0 25px 80px rgba(0,0,0,.7)}
    .purchase-box h2{margin:0 0 6px;color:#f1d36a}
    .purchase-title{color:#ddd7c7;margin-bottom:16px}
    .purchase-box label{display:block;color:#c9a227;font-size:13px;font-weight:800;margin:10px 0 5px}
    .purchase-box input{width:100%;box-sizing:border-box;margin:0;padding:11px;border-radius:11px;border:1px solid #353535;background:#090909;color:#fff;font-family:inherit}
    .payment-box{margin-top:15px;padding:15px;border-radius:12px;background:#19150a;border:1px solid #5a4816}
    .payment-number{font-size:20px;font-weight:900;color:#f1d36a;direction:ltr;text-align:center;margin:8px 0}
    .purchase-actions{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap}
    .purchase-actions button{flex:1;min-width:120px;padding:12px;border-radius:11px;font-family:inherit;font-weight:900;cursor:pointer}
    .purchase-submit{background:#c9a227;border:1px solid #c9a227;color:#080706}
    .purchase-cancel{background:#0c0b08;border:1px solid #51431e;color:#f1d36a}
    .payment-btn{background:#17130a;border:1px solid #66521c;color:#f1d36a;padding:10px 12px;border-radius:9px;font-family:inherit;font-weight:900;cursor:pointer;margin-top:8px}
    .payment-btn:disabled,.purchase-submit:disabled{opacity:.55;cursor:not-allowed}
    .order-result{margin-top:15px;padding:14px;border-radius:12px;background:#19150a;border:1px solid #5a4816;line-height:2}
    .order-code{font-size:22px;font-weight:900;color:#f1d36a;letter-spacing:1px;direction:ltr;text-align:center}
    .purchase-note{font-size:12px;color:#aaa38f;margin-top:10px;line-height:1.8}
    .payment-qr{display:block;width:min(280px,100%);height:auto;margin:14px auto 8px;border-radius:14px;border:1px solid #5a4816;background:#fff}
    .payment-qr-note{text-align:center;color:#aaa38f;font-size:12px;line-height:1.8;margin-bottom:8px}
  `;
  document.head.appendChild(style);

  const modal=document.createElement('div');
  modal.id='purchaseModal';
  modal.innerHTML=`
    <div class="purchase-box" role="dialog" aria-modal="true" aria-labelledby="purchaseTitle">
      <h2>🛒 شراء المحتوى</h2>
      <div id="purchaseTitle" class="purchase-title"></div>

      <form id="purchaseForm">
        <label>الاسم</label>
        <input id="buyerName" required placeholder="اكتب اسمك" autocomplete="name">

        <label>رقم الهاتف</label>
        <input id="buyerPhone" required inputmode="tel" placeholder="07xxxxxxxxx" autocomplete="tel">

        <label>حساب التليجرام (اختياري)</label>
        <input id="buyerTelegram" placeholder="@username" autocomplete="off">

        <div class="purchase-actions">
          <button type="submit" class="purchase-submit" id="purchaseSubmit">إنشاء الطلب</button>
          <button type="button" class="purchase-cancel" id="purchaseCancel">إلغاء</button>
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

          <img id="paymentQr" class="payment-qr" src="${PAYMENT_QR_URL}" alt="QR الدفع - مكتبة الهاشمي" loading="lazy">
          <div class="payment-qr-note">📱 امسح رمز QR من داخل SuperQi لإتمام التحويل.</div>

          <button type="button" class="payment-btn" id="copyMaster">📋 نسخ رقم الماستر</button>
          <button type="button" class="payment-btn" id="openSuperQi">📲 فتح SuperQi</button>
          <button type="button" class="payment-btn" id="whatsappPayment">📱 التواصل عبر واتساب</button>
        </div>

        <label>رقم الإيصال</label>
        <input id="receiptNumber" inputmode="numeric" placeholder="اكتب رقم الإيصال بعد التحويل">

        <div class="purchase-actions">
          <button type="button" class="purchase-submit" id="submitPaymentBtn">✅ تم التحويل</button>
          <button type="button" class="payment-btn" id="checkStatusBtn">🔍 حالة الطلب</button>
        </div>
      </div>

      <div id="orderResult" class="order-result" style="display:none"></div>
      <div class="purchase-note">بعد التحويل أرسل رقم الإيصال للتحقق من الدفع. لا يتم تسليم الملف إلا بعد تأكيد الدفع.</div>
    </div>
  `;
  document.body.appendChild(modal);

  let currentOrder=null;

  $('purchaseCancel').addEventListener('click',closePurchaseModal);
  modal.addEventListener('click',e=>{if(e.target===modal) closePurchaseModal();});

  async function loadPaymentSettings(){
    const result=await db
      .from('payment_settings')
      .select('master_name,master_number,whatsapp_number,instructions')
      .eq('id',1)
      .maybeSingle();

    const data=result.data;
    const error=result.error;
    const masterNumber=String(data?.master_number||FALLBACK_MASTER_NUMBER);

    $('masterName').textContent=data?.master_name||'مكتبة الهاشمي';
    $('masterNumber').textContent=masterNumber;
    $('paymentInstructions').textContent=error||!data
      ?'حوّل المبلغ إلى الرقم الموضح أدناه، ثم اكتب رقم الإيصال واضغط «تم التحويل».'
      :(data.instructions||'حوّل المبلغ ثم أرسل رقم الإيصال للتحقق.');

    $('copyMaster').onclick=async()=>{
      try{await navigator.clipboard.writeText(masterNumber);toast('تم نسخ رقم الماستر ✅');}
      catch{toast('انسخ الرقم يدوياً.');}
    };

    $('openSuperQi').onclick=()=>{
      const playUrl='https://play.google.com/store/apps/details?id=iq.qicard.qipay.prod';
      const isAndroid=/Android/i.test(navigator.userAgent);
      if(isAndroid){
        const started=Date.now();
        try{window.location.href='intent://#Intent;scheme=superqi;package=iq.qicard.qipay.prod;end';}catch{}
        setTimeout(()=>{if(Date.now()-started<2200) window.open(playUrl,'_blank','noopener');},1300);
      }else window.open(playUrl,'_blank','noopener');
    };

    $('whatsappPayment').onclick=()=>{
      let number=String(data?.whatsapp_number||'').replace(/[^0-9]/g,'');
      if(!number){toast('رقم واتساب غير مضبوط.');return;}
      if(number.startsWith('07')) number='964'+number.slice(1);
      const text=encodeURIComponent(`السلام عليكم، أريد دفع قيمة المحتوى: ${selectedItem?.title||''}\nرقم الطلب: ${currentOrder?.order_number||''}`);
      window.open(`https://wa.me/${number}?text=${text}`,'_blank','noopener');
    };
  }

  $('purchaseForm').addEventListener('submit',async e=>{
    e.preventDefault();
    if(!selectedItem){toast('لم يتم اختيار محتوى.');return;}

    const btn=$('purchaseSubmit');
    const result=$('orderResult');
    const payload={
      content_id:selectedItem.id,
      customer_name:$('buyerName').value.trim(),
      customer_phone:$('buyerPhone').value.trim(),
      customer_telegram:$('buyerTelegram').value.trim(),
      payment_method:'manual_master'
    };

    if(!payload.customer_name||!payload.customer_phone){toast('اكتب الاسم ورقم الهاتف أولاً.');return;}
    btn.disabled=true;btn.textContent='جاري إنشاء الطلب...';

    try{
      const res=await fetch(CREATE_ORDER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data.ok) throw new Error(data.error||'تعذر إنشاء الطلب');

      currentOrder=data.order;
      $('purchaseForm').style.display='none';
      $('paymentArea').style.display='block';
      result.style.display='block';
      result.innerHTML=`
        <div>✅ تم إنشاء الطلب</div>
        <div>🧾 رقم الطلب:</div>
        <div class="order-code">${esc(currentOrder.order_number)}</div>
        <div>💰 المبلغ: ${Number(currentOrder.amount||0).toLocaleString('ar-IQ')} ${esc(currentOrder.currency||'IQD')}</div>
        <div style="margin-top:8px">حوّل المبلغ ثم اكتب رقم الإيصال واضغط «تم التحويل».</div>
      `;
      await loadPaymentSettings();
    }catch(err){
      result.style.display='block';
      result.innerHTML=`❌ ${esc(err.message||'حدث خطأ')}`;
    }finally{btn.disabled=false;btn.textContent='إنشاء الطلب';}
  });

  $('submitPaymentBtn').addEventListener('click',async()=>{
    if(!currentOrder){toast('أنشئ الطلب أولاً.');return;}
    const receipt=$('receiptNumber').value.trim();
    if(!receipt){toast('اكتب رقم الإيصال أولاً.');return;}

    const btn=$('submitPaymentBtn');
    btn.disabled=true;btn.textContent='جاري إرسال الإيصال...';
    try{
      const res=await fetch(SUBMIT_PAYMENT_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        order_number:currentOrder.order_number,
        customer_phone:$('buyerPhone').value.trim(),
        receipt_number:receipt
      })});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data.ok) throw new Error(data.error||'تعذر إرسال الإيصال');

      $('orderResult').style.display='block';
      $('orderResult').innerHTML=`
        <div>✅ تم إرسال رقم الإيصال بنجاح</div>
        <div>🧾 الطلب: <b>${esc(currentOrder.order_number)}</b></div>
        <div>⏳ الحالة: بانتظار التحقق من الدفع</div>
        <div class="purchase-note">بعد تأكيد الدفع سيظهر كود التسليم ويمكنك الانتقال إلى بوت التليجرام.</div>
      `;
      toast('تم إرسال الإيصال للتحقق ✅');
    }catch(err){toast(err.message||'حدث خطأ');}
    finally{btn.disabled=false;btn.textContent='✅ تم التحويل';}
  });

  $('checkStatusBtn').addEventListener('click',async()=>{
    if(!currentOrder){toast('أنشئ الطلب أولاً.');return;}
    const phone=$('buyerPhone').value.trim();
    const btn=$('checkStatusBtn');
    btn.disabled=true;btn.textContent='جاري التحقق...';
    try{
      const res=await fetch(ORDER_STATUS_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({order_number:currentOrder.order_number,customer_phone:phone})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data.ok) throw new Error(data.error||'تعذر جلب حالة الطلب');

      const order=data.order||{};
      let html=`
        <div>🧾 الطلب: <b>${esc(order.order_number)}</b></div>
        <div>📚 المحتوى: ${esc(order.title||selectedItem?.title||'')}</div>
        <div>💰 المبلغ: ${Number(order.amount||0).toLocaleString('ar-IQ')} ${esc(order.currency||'IQD')}</div>
        <div>📌 ${esc(order.message||'الحالة متاحة')}</div>
      `;
      if(order.receipt_number) html+=`<div>🧾 رقم الإيصال: ${esc(order.receipt_number)}</div>`;

      if(order.payment_status==='paid'&&order.claim_code){
        html+=`<hr>
          <div>🎉 تم تأكيد الدفع</div>
          <div>🔐 كود التسليم:</div>
          <div class="order-code">${esc(order.claim_code)}</div>
          <div class="purchase-note">اضغط الزر لاستلام الملف عبر بوت مكتبة الهاشمي.</div>
          ${TELEGRAM_BOT_USERNAME?'<button type="button" class="payment-btn" id="openDeliveryBot">🤖 استلام الملف عبر التليجرام</button>':''}`;
      }else{
        html+=`<div class="purchase-note">💡 بعد تأكيد الدفع من الإدارة/بوت تأكيد الدفع سيظهر كود التسليم هنا.</div>`;
      }

      $('orderResult').style.display='block';
      $('orderResult').innerHTML=html;
      const deliveryBtn=$('openDeliveryBot');
      if(deliveryBtn&&order.claim_code){
        deliveryBtn.onclick=()=>window.open(`https://t.me/${TELEGRAM_BOT_USERNAME}?start=${encodeURIComponent(order.claim_code)}`,'_blank','noopener');
      }
    }catch(err){toast(err.message||'حدث خطأ');}
    finally{btn.disabled=false;btn.textContent='🔍 حالة الطلب';}
  });
}

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
  setTimeout(()=>$('buyerName')?.focus(),50);
}

function closePurchaseModal(){
  const modal=$('purchaseModal');
  if(modal) modal.classList.remove('show');
  selectedItem=null;
}

async function load(){
  const status=$('status');
  const cards=$('cards');
  if(!status||!cards){console.warn('عناصر المحتوى غير موجودة في index.html');return;}
  status.textContent='جاري تحميل المحتوى...';
  cards.innerHTML='<div class="empty">جاري تحميل المحتوى...</div>';

  try{
    const {data,error}=await db.from('content').select('*').order('created_at',{ascending:false});
    if(error) throw error;
    items=Array.isArray(data)?data:[];
    render();
  }catch(error){
    console.error('content load error:',error);
    status.textContent='تعذر تحميل المحتوى';
    cards.innerHTML=`<div class="empty">❌ تعذر تحميل المحتوى.<br><small>${esc(error?.message||'تحقق من Supabase وRLS')}</small></div>`;
  }
}

function render(){
  const search=$('search');
  const cards=$('cards');
  const status=$('status');
  if(!cards||!status) return;

  const q=(search?.value||'').trim().toLowerCase();
  const rows=items.filter(x=>{
    const filterOk=activeFilter==='الكل'||(activeFilter==='المدفوع'&&isPaid(x))||x.type===activeFilter;
    const text=`${x.title||''} ${x.type||''} ${x.stage||''} ${x.branch||''} ${x.subject||''}`.toLowerCase();
    return filterOk&&text.includes(q);
  });

  status.textContent=`${rows.length} محتوى`;
  cards.innerHTML=rows.map(x=>{
    const paid=isPaid(x);
    const url=publicFileUrl(x.file_path);
    return `<article class="card user-item-card">
      <div class="icon">${icon(x.type)}</div>
      <span class="tag">${esc(x.type||'')} • ${esc(x.stage||'')}${x.branch?' • '+esc(x.branch):''}</span>
      <h3>${esc(x.title||'بدون عنوان')}</h3>
      <p>${esc(x.subject||'')}</p>
      ${paid
        ? `<span class="price">💰 ${Number(x.price||0).toLocaleString('ar-IQ')} د.ع</span>
           <button class="buy-content-btn" data-id="${esc(x.id)}" style="display:block;margin-top:14px;width:100%;padding:10px 12px;border:1px solid #c9a227;border-radius:9px;background:#c9a227;color:#080706;font-family:inherit;font-weight:900;cursor:pointer">🛒 شراء الآن</button>`
        : (url?`<a href="${esc(url)}" target="_blank" rel="noopener">فتح الملف</a>`:'<span class="purchase-note">الملف غير مرفوع حالياً.</span>')}
    </article>`;
  }).join('')||'<div class="empty">لا يوجد محتوى مطابق حاليًا.</div>';

  cards.querySelectorAll('.buy-content-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const item=items.find(x=>String(x.id)===String(btn.dataset.id));
      if(item) openPurchaseModal(item);
    });
  });
}

function init(){
  createPurchaseModal();
  $('search')?.addEventListener('input',render);
  $('searchBtn')?.addEventListener('click',render);

  document.querySelectorAll('#filters button').forEach(b=>{
    b.addEventListener('click',()=>{
      document.querySelectorAll('#filters button').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      activeFilter=b.dataset.filter||'الكل';
      render();
    });
  });

  if($('whatsBtn')){
    $('whatsBtn').addEventListener('click',()=>{
      const text=encodeURIComponent('السلام عليكم، أريد التواصل مع مكتبة الهاشمي بخصوص طلب/شراء.');
      location.href=`https://wa.me/96477404078255?text=${text}`;
    });
  }
   const ORDER_TRACKING_KEY='alhasmi_last_order_v1';

async function checkOrderStatus(orderNumber, phone, resultEl){
  if(!orderNumber || !phone){
    resultEl.style.display='block';
    resultEl.innerHTML='⚠️ اكتب رقم الطلب ورقم الهاتف.';
    return;
  }

  resultEl.style.display='block';
  resultEl.innerHTML='⏳ جاري التحقق من حالة الطلب...';

  try{
    const res=await fetch(ORDER_STATUS_URL,{
      method:'POST',
      headers:{
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        order_number:orderNumber.trim(),
        customer_phone:phone.trim()
      })
    });

    const data=await res.json().catch(()=>({}));

    if(!res.ok || !data.ok){
      throw new Error(
        data.error || 'تعذر جلب حالة الطلب'
      );
    }

    const order=data.order || {};

    let status='⏳ قيد الانتظار';

    if(order.payment_status==='paid'){
      status='✅ تم تأكيد الدفع';
    }else if(order.payment_status==='failed'){
      status='❌ فشل الدفع';
    }else if(order.payment_status==='cancelled'){
      status='🚫 الطلب ملغى';
    }

    let html=`
      <div>🧾 رقم الطلب:
        <b>${esc(order.order_number || orderNumber)}</b>
      </div>

      <div>📚 المحتوى:
        ${esc(order.title || '')}
      </div>

      <div>💰 المبلغ:
        ${Number(order.amount || 0).toLocaleString('ar-IQ')}
        ${esc(order.currency || 'IQD')}
      </div>

      <div style="margin-top:8px">
        📌 الحالة:
        <b>${status}</b>
      </div>
    `;

    if(order.receipt_number){
      html+=`
        <div>
          🧾 رقم الإيصال:
          ${esc(order.receipt_number)}
        </div>
      `;
    }

    if(order.message){
      html+=`
        <div>
          💬 ${esc(order.message)}
        </div>
      `;
    }

    if(
      order.payment_status==='paid' &&
      order.claim_code
    ){
      html+=`
        <hr>

        <div>🎉 تم تأكيد الدفع بنجاح</div>

        <div>🔐 كود التسليم:</div>

        <div class="order-code">
          ${esc(order.claim_code)}
        </div>

        <button
          type="button"
          class="payment-btn"
          id="deliveryBotBtn"
        >
          🤖 استلام الملف عبر التليجرام
        </button>
      `;
    }else{
      html+=`
        <div class="purchase-note">
          ⏳ الطلب بانتظار تأكيد الدفع.
          يمكنك تحديث الحالة لاحقاً.
        </div>
      `;
    }

    resultEl.innerHTML=html;

    localStorage.setItem(
      ORDER_TRACKING_KEY,
      JSON.stringify({
        order_number:order.order_number || orderNumber,
        customer_phone:phone,
        title:order.title || ''
      })
    );

    if(
      order.payment_status==='paid' &&
      order.claim_code
    ){
      const bot=$('deliveryBotBtn');

      if(bot){
        bot.onclick=()=>{
          window.open(
            `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${encodeURIComponent(order.claim_code)}`,
            '_blank',
            'noopener'
          );
        };
      }
    }

  }catch(err){

    resultEl.style.display='block';

    resultEl.innerHTML=`
      ❌ ${esc(err.message || 'حدث خطأ')}
    `;
  }
}


function createOrderTracking(){

  if($('orderTracking')) return;

  const style=document.createElement('style');

  style.textContent=`
    #orderTracking{
      width:min(1160px,92%);
      margin:35px auto;
      padding:24px;
      background:linear-gradient(145deg,#101010,#090909);
      border:1px solid #5a4816;
      border-radius:18px;
    }

    #orderTracking h2{
      margin:0 0 5px;
      color:#f1d36a;
    }

    #orderTracking p{
      color:#aaa38f;
      font-size:13px;
      margin:0 0 16px;
    }

    .tracking-grid{
      display:grid;
      grid-template-columns:1fr 1fr auto;
      gap:10px;
    }

    .tracking-grid input{
      width:100%;
      box-sizing:border-box;
      padding:12px;
      border-radius:11px;
      border:1px solid #302d25;
      background:#090909;
      color:#fff;
      font-family:inherit;
    }

    .tracking-grid button{
      padding:12px 18px;
      border-radius:11px;
      border:1px solid #c9a227;
      background:#c9a227;
      color:#080706;
      font-family:inherit;
      font-weight:900;
      cursor:pointer;
    }

    .tracking-result{
      display:none;
      margin-top:15px;
      padding:15px;
      border-radius:12px;
      background:#19150a;
      border:1px solid #5a4816;
      line-height:2;
    }

    @media(max-width:650px){
      .tracking-grid{
        grid-template-columns:1fr;
      }

      .tracking-grid button{
        width:100%;
      }
    }
  `;

  document.head.appendChild(style);

  const box=document.createElement('section');

  box.id='orderTracking';

  box.innerHTML=`
    <h2>🔍 متابعة الطلب</h2>

    <p>
      اكتب رقم الطلب ورقم الهاتف لمعرفة حالة الطلب والدفع.
    </p>

    <div class="tracking-grid">

      <input
        id="trackingOrderNumber"
        placeholder="رقم الطلب"
        autocomplete="off"
      >

      <input
        id="trackingPhone"
        placeholder="رقم الهاتف 07xxxxxxxxx"
        inputmode="tel"
        autocomplete="tel"
      >

      <button
        type="button"
        id="trackingCheck"
      >
        🔍 تحديث الحالة
      </button>

    </div>

    <div
      id="trackingResult"
      class="tracking-result"
    ></div>
  `;

  const content=$('content');

  if(content){
    content.parentNode.insertBefore(
      box,
      content
    );
  }else{
    document.body.appendChild(box);
  }

  const saved=(()=>{
    try{
      return JSON.parse(
        localStorage.getItem(ORDER_TRACKING_KEY)||'null'
      );
    }catch{
      return null;
    }
  })();

  if(saved){

    $('trackingOrderNumber').value=
      saved.order_number || '';

    $('trackingPhone').value=
      saved.customer_phone || '';
  }

  $('trackingCheck').onclick=async()=>{

    const btn=$('trackingCheck');

    btn.disabled=true;
    btn.textContent='⏳ جاري التحقق...';

    await checkOrderStatus(
      $('trackingOrderNumber').value,
      $('trackingPhone').value,
      $('trackingResult')
    );

    btn.disabled=false;
    btn.textContent='🔍 تحديث الحالة';
  };
}
  load();
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
else init();
