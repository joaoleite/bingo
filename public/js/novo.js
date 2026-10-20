// ============================================
// CRIAR BINGO - página inicial (/)
// ============================================

const $ = id => document.getElementById(id);

// Celular abre o menu de compartilhar (WhatsApp etc.); no computador, copia
async function shareLink(button, url, title, link) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      window.medir?.('link enviado', { link, jeito: 'compartilhar' });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  const label = button.textContent;
  try {
    await navigator.clipboard.writeText(url);
    button.textContent = '✅ Link copiado';
  } catch (e) {
    window.prompt('Copie o link:', url);
  }
  window.medir?.('link enviado', { link, jeito: 'copiar' });
  setTimeout(() => { button.textContent = label; }, 2000);
}

$('btn-create').addEventListener('click', async () => {
  const button = $('btn-create');
  button.disabled = true;
  $('create-error').hidden = true;
  try {
    const response = await fetch('/api/rooms', { method: 'POST' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.error || 'Não consegui criar o bingo');

    // Este aparelho já fica com a chave: "Abrir o controle aqui" entra direto
    try { localStorage.setItem(`bingo-key:${data.room}`, JSON.stringify(data.key)); } catch (e) { /* ignora */ }

    $('room').textContent = data.room;
    $('display-url').textContent = data.displayUrl.replace(/^https?:\/\//, '');
    $('open-display').href = data.displayUrl;
    $('open-admin').href = data.adminUrl;
    $('admin-qr').src = data.adminQr;
    $('share-display').onclick = e => shareLink(e.currentTarget, data.displayUrl, 'Telão do bingo', 'telão');
    $('share-admin').onclick = e => shareLink(e.currentTarget, data.adminUrl, 'Controle do bingo', 'controle');
    $('intro').hidden = true;
    $('created').hidden = false;
    window.scrollTo(0, 0);
    window.medir?.('bingo criado');
  } catch (error) {
    window.medir?.('erro ao criar bingo', { erro: error.message });
    $('create-error').textContent = error.message === 'Failed to fetch' ? 'Sem conexão com o servidor' : error.message;
    $('create-error').hidden = false;
    button.disabled = false;
  }
});
