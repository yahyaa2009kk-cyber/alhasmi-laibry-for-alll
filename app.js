let db=null;

const CREATE_ORDER_URL='https://bfiobmxgkxrmkukorqdq.supabase.co/functions/v1/create-order';
const SUBMIT_PAYMENT_URL='https://bfiobmxgkxrmkukorqdq.supabase.co/functions/v1/submit-payment';
const ORDER_STATUS_URL='https://bfiobmxgkxrmkukorqdq.supabase.co/functions/v1/order-status';

let items=[];
let activeFilter='الكل';
let selectedItem=null;

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

function createPurchaseModal(){
  if($('purchaseModal')) return;

  const style=document.createElement('style');
  style.textContent=`
    #purchaseModal{position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:9999;display:none;align-items:center;justify-content:center;padding:18px}
    #purchaseModal.show{display:flex}
    .purchase-box{width:min(520px,100%);max-height:90vh;overflow:auto;background:#101010;border:1px solid #5a4816;border-radius:18px;padding:24px;box-shadow:0 25px 80px rgba(0,0,0,.7)}
    .purchase-box h2{margin:0 0 6px;color:#f1d36a}
    .purchase-title{color:#ddd7c7;margin-bottom:16px}
    .purchase-box label{display:block;color:#c9a227;font-size:13px;font-weight:800;margin:10px 0 5px}
    .purchase-box input{margin:0}
    .payment-box{margin-top:15px;padding:15px;border-radius:12px;background:#19150a;border:1px solid #5a4816}
    .payment-number{font-size:20px;font-weight:900;color:#f1d36a;direction:ltr;text-align:center;margin:8px 0}
    .payment-qr{display:block;width:min(280px,100%);height:auto;margin:14px auto 8px;border-radius:14px;border:1px solid #5a4816;background:#fff}
    .payment-qr-note{text-align:center;color:#aaa38f;font-size:12px;line-height:1.8;margin-bottom:8px}
    .purchase-actions{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap}
    .purchase-actions button{flex:1;min-width:120px;padding:12px;border-radius:11px;font-family:inherit;font-weight:900;cursor:pointer}
    .purchase-submit{background:#c9a227;border:1px solid #c9a227;color:#080706}
    .purchase-cancel{background:#0c0b08;border:1px solid #51431e;color:#f1d36a}
    .payment-btn{background:#17130a;border:1px solid #66521c;color:#f1d36a;padding:10px 12px;border-radius:9px;font-family:inherit;font-weight:900;cursor:pointer;margin-top:8px}
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

          <div style="color:#ddd7c7;font-weight:900">
            💳 طريقة الدفع
          </div>

          <div id="paymentInstructions" class="purchase-note"></div>

          <div style="margin-top:10px;color:#aaa">
            اسم صاحب الحساب:
          </div>

          <div id="masterName" style="font-weight:900;color:#fff"></div>

          <div style="margin-top:10px;color:#aaa">
            رقم الماستر:
          </div>

          <div id="masterNumber" class="payment-number"></div>

          <!-- QR الدفع -->
          <img
            src="qr-maktabat-alhashmi.jpg"
            alt="QR الدفع - مكتبة الهاشمي"
            class="payment-qr"
          >

          <div class="payment-qr-note">
            📱 امسح رمز QR من داخل SuperQi لإتمام التحويل.
          </div>

          <button type="button" class="payment-btn" id="copyMaster">
            📋 نسخ رقم الماستر
          </button>

          <button type="button" class="payment-btn" id="whatsappPayment">
            📱 التواصل عبر واتساب
          </button>

        </div>

        <label>رقم الإيصال</label>

        <input
          id="receiptNumber"
          placeholder="اكتب رقم الإيصال بعد التحويل"
        >

        <div class="purchase-actions">

          <button
            type="button"
            class="purchase-submit"
            id="submitPaymentBtn"
          >
            ✅ تم التحويل
          </button>

          <button
            type="button"
            class="payment-btn"
            id="checkStatusBtn"
          >
            🔍 حالة الطلب
          </button>

        </div>
      </div>

      <div
        id="orderResult"
        class="order-result"
        style="display:none"
      ></div>

      <div class="purchase-note">
        بعد التحويل أرسل رقم الإيصال للتحقق من الدفع.
        لا يتم تسليم الملف إلا بعد تأكيد الدفع.
      </div>

    </div>
  `;

  document.body.appendChild(modal);

  let currentOrder=null;

  $('purchaseCancel').addEventListener(
    'click',
    closePurchaseModal
  );

  modal.addEventListener('click',e=>{
    if(e.target===modal) closePurchaseModal();
  });

  async function loadPaymentSettings(){

    if(!db) return;

    const {data,error}=await db
      .from('payment_settings')
      .
