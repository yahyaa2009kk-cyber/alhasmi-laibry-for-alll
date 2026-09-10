document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('specialRequestBtn')) return;

  const style = document.createElement('style');
  style.textContent = `
    #specialRequestBtn{
      position:fixed;bottom:18px;right:18px;z-index:9999;
      background:#c9a227;color:#080706;border:0;
      border-radius:14px;padding:13px 18px;
      font-weight:900;font-family:inherit;cursor:pointer;
      box-shadow:0 8px 25px #0008;
    }
    #specialRequestModal{
      position:fixed;inset:0;background:#000b;z-index:10000;
      display:none;align-items:center;justify-content:center;padding:15px;
    }
    #specialRequestModal.show{display:flex}
    .sr-box{
      width:min(520px,100%);max-height:90vh;overflow:auto;
      background:#111;border:1px solid #5a4816;border-radius:18px;
      padding:22px;color:#fff;
    }
    .sr-box h2{color:#f1d36a;margin-top:0}
    .sr-box label{display:block;color:#d8c47b;margin:12px 0 5px}
    .sr-box input,.sr-box select,.sr-box textarea{
      width:100%;box-sizing:border-box;background:#090909;color:#fff;
      border:1px solid #353535;border-radius:10px;padding:11px;
      font-family:inherit;
    }
    .sr-box textarea{min-height:110px;resize:vertical}
    .sr-actions{display:flex;gap:8px;margin-top:15px}
    .sr-actions button{flex:1;padding:12px;border-radius:10px;font-weight:900}
    .sr-submit{background:#c9a227;border:0}
    .sr-close{background:#171717;color:#fff;border:1px solid #444}
    .sr-success{text-align:center;line-height:2}
    .sr-link{
      display:block;text-decoration:none;text-align:center;
      padding:11px;margin-top:8px;border-radius:10px;
      background:#19150a;color:#f1d36a;border:1px solid #5a4816;
    }
  `;
  document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.id = 'specialRequestBtn';
  btn.textContent = '📝 طلب خاص';
  document.body.appendChild(btn);

  const modal = document.createElement('div');
  modal.id = 'specialRequestModal';
  modal.innerHTML = `
    <div class="sr-box">
      <h2>📝 طلب خاص</h2>
      <p>اطلب خدمة خاصة مثل إعداد أسئلة، تقرير، بحث، ملزمة أو أي طلب دراسي.</p>

      <form id="specialRequestForm">
        <label>الاسم *</label>
        <input id="srName" required>

        <label>رقم الهاتف *</label>
        <input id="srPhone" required>

        <label>المرحلة</label>
        <select id="srStage">
          <option>ابتدائي</option>
          <option>متوسط</option>
          <option>إعدادية</option>
          <option>جامعي</option>
          <option>أخرى</option>
        </select>

        <label>المادة</label>
        <input id="srSubject" placeholder="مثلاً: رياضيات">

        <label>نوع الطلب</label>
        <select id="srType">
          <option>أسئلة</option>
          <option>تقرير / بحث</option>
          <option>ملزمة</option>
          <option>تلخيص</option>
          <option>مراجعة</option>
          <option>أخرى</option>
        </select>

        <label>تفاصيل الطلب *</label>
        <textarea id="srDescription" required placeholder="اكتب بالتفصيل شنو تريد..."></textarea>

        <div id="srMsg" style="margin-top:10px;color:#f1d36a"></div>

        <div class="sr-actions">
          <button type="submit" class="sr-submit">إرسال الطلب</button>
          <button type="button" class="sr-close" id="srClose">إلغاء</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  btn.onclick = () => modal.classList.add('show');
  document.getElementById('srClose').onclick = () => modal.classList.remove('show');

  document.getElementById('specialRequestForm').onsubmit = async e => {
    e.preventDefault();

    const msg = document.getElementById('srMsg');
    msg.textContent = 'جاري إرسال الطلب...';

    const { error } = await db.from('special_requests').insert({
      customer_name: document.getElementById('srName').value.trim(),
      customer_phone: document.getElementById('srPhone').value.trim(),
      stage: document.getElementById('srStage').value,
      subject: document.getElementById('srSubject').value.trim(),
      request_type: document.getElementById('srType').value,
      description: document.getElementById('srDescription').value.trim()
    });

    if (error) {
      msg.textContent = 'حدث خطأ: ' + error.message;
      return;
    }

    document.querySelector('.sr-box').innerHTML = `
      <div class="sr-success">
        <h2>✅ تم استلام طلبك</h2>
        <p>تم إرسال طلبك بنجاح، وسيتم التواصل معك قريبًا.</p>
        <a class="sr-link" href="https://t.me/ydyytf" target="_blank">📨 التواصل عبر Telegram</a>
        <a class="sr-link" href="https://wa.me/1cw_" target="_blank">💬 التواصل عبر WhatsApp</a>
      </div>
    `;
  };
});
