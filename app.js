return filterOk && (${x.title} ${x.type} ${x.stage} ${x.branch || ''} ${x.subject || ''}) .toLowerCase() .includes(q); });
 {rows.length} محتوى`;
$('cards').innerHTML = rows.map(x => { const paid = isPaid(x);
const url = x.file_path ? db.storage.from('library-files').getPublicUrl(x.file_path).data.publicUrl : null;
return ` <article class="card user-item-card"> <div class="icon">${icon(x.type)}</div>
  <span class="tag">
    ￼{x.branch ? ' • ' + esc(x.branch) : ''}
  </span>

  <h3>${esc(x.title)}</h3>

  <p>${esc(x.subject || '')}</p>

  ${
    paid
      ? `
        <span class="price">
          💰 ${Number(x.price).toLocaleString('ar-IQ')} د.ع
        </span>

        <button
          class="buy-content-btn"
          data-id="${x.id}"
          style="display:block;margin-top:14px;width:100%;padding:10px 12px;border:1px solid #c9a227;border-radius:9px;background:#c9a227;color:#080706;font-family:inherit;font-weight:900;cursor:pointer"
        >
          🛒 شراء الآن
        </button>
      `
      : (
          url
            ? `<a href="${url}" target="_blank" rel="noopener">فتح الملف</a>`
            : ''
        )
  }
</article>
`; }).join('') || '<div class="empty">لا يوجد محتوى مطابق حاليًا.</div>';
document.querySelectorAll('.buy-content-btn').forEach(btn => { btn.addEventListener('click', () => { const item = items.find( x => String(x.id) === String(btn.dataset.id) );
if (item) openPurchaseModal(item);
}); });
createPurchaseModal();
$('search').addEventListener('input', render); $('searchBtn').addEventListener('click', render);
document.querySelectorAll('#filters button').forEach(b => { b.addEventListener('click', () => { document .querySelectorAll('#filters button') .forEach(x => x.classList.remove('active'));
b.classList.add('active');
activeFilter = b.dataset.filter;

render();
}); });
if ($('whatsBtn')) { $('whatsBtn').addEventListener('click', () => { const n = $('contactName').value.trim(); const m = $('contactMsg').value.trim();
const text = encodeURIComponent(
  `السلام عليكم، أنا ${n || 'طالب'}\n${m}`
);

location.href =
  `https://wa.me/96477404078255?text=${text}`;
}); }
load();
