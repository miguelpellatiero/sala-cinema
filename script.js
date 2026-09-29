(function(){
  // ======= PREENCHA AQUI COM SEUS DADOS DO SUPABASE =======
  const SUPABASE_URL = "https://mlfjieimpqsevedqwzwv.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_pmoSc0nTDpPAr0kjy8Auyg_Epwplpzm";
  // ==========================================================

 
  const ICE_SERVERS = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.relay.metered.ca:80" },
    { urls: "turn:global.relay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:global.relay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:global.relay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" }
  ];
 
  const player = document.getElementById('player');
  const placeholder = document.getElementById('placeholder');
  const inputVideo = document.getElementById('inputVideo');
  const labelVideo = document.getElementById('labelVideo');
  const btnVideo = document.getElementById('btnVideo');
  const urlInput = document.getElementById('urlInput');
  const btnLoadUrl = document.getElementById('btnLoadUrl');
  const roomCodeInput = document.getElementById('roomCode');
  const btnJoin = document.getElementById('btnJoin');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const metaInfo = document.getElementById('metaInfo');
  const driftInfo = document.getElementById('driftInfo');
  const nodeMe = document.getElementById('nodeMe');
  const nodeOther = document.getElementById('nodeOther');
  const threadLine = document.getElementById('threadLine');
  const streamStatus = document.getElementById('streamStatus');
  const modeSegmented = document.getElementById('modeSegmented');
  const roleSegmented = document.getElementById('roleSegmented');
  const lockBadge = document.getElementById('lockBadge');
  const btnFullscreen = document.getElementById('btnFullscreen');
  const guestControls = document.getElementById('guestControls');
  const gcPlayPause = document.getElementById('gcPlayPause');
  const gcIconPlay = document.getElementById('gcIconPlay');
  const gcIconPause = document.getElementById('gcIconPause');
  const gcSeek = document.getElementById('gcSeek');
  const gcTimeCurrent = document.getElementById('gcTimeCurrent');
  const gcTimeTotal = document.getElementById('gcTimeTotal');
  const gcVolume = document.getElementById('gcVolume');
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toastText');
  const toastAction = document.getElementById('toastAction');
  const toastDismiss = document.getElementById('toastDismiss');
  const modeHint = document.getElementById('modeHint');
  const stageEl = document.querySelector('.stage');
  const videoWrap = document.getElementById('videoWrap');
  const accountEmail = document.getElementById('accountEmail');
  const btnLogout = document.getElementById('btnLogout');
  const flyoutBackdrop = document.getElementById('flyoutBackdrop');
  const navCast = document.getElementById('navCast');
  const swipeEdge = document.getElementById('swipeEdge');
 
  const libraryGrid = document.getElementById('libraryGrid');
  const libraryEmpty = document.getElementById('libraryEmpty');
  const libTitle = document.getElementById('libTitle');
  const libVideoUrl = document.getElementById('libVideoUrl');
  const libCoverFile = document.getElementById('libCoverFile');
  const labelLibCover = document.getElementById('labelLibCover');
  const libCoverUrl = document.getElementById('libCoverUrl');
  const btnAddMovie = document.getElementById('btnAddMovie');
  const libStatus = document.getElementById('libStatus');
  const shortcutsList = document.getElementById('shortcutsList');
  const shortcutLabel = document.getElementById('shortcutLabel');
  const shortcutUrl = document.getElementById('shortcutUrl');
  const btnAddShortcut = document.getElementById('btnAddShortcut');
  const toggleAddMovie = document.getElementById('toggleAddMovie');
  const libraryAddForm = document.getElementById('libraryAddForm');
  const toggleAddShortcut = document.getElementById('toggleAddShortcut');
  const shortcutAddForm = document.getElementById('shortcutAddForm');
 
  toggleAddMovie.addEventListener('click', () => {
    const open = libraryAddForm.classList.toggle('hidden') === false;
    toggleAddMovie.classList.toggle('active', open);
    toggleAddMovie.querySelector('span').textContent = open ? '– Fechar' : '+ Adicionar filme';
  });
  toggleAddShortcut.addEventListener('click', () => {
    shortcutAddForm.classList.toggle('hidden');
  });
 
  const loginScreen = document.getElementById('loginScreen');
  const appScreen = document.getElementById('appScreen');
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const btnLogin = document.getElementById('btnLogin');
  const loginError = document.getElementById('loginError');
  const loginSpinner = document.getElementById('loginSpinner');
  const toggleSignup = document.getElementById('toggleSignup');
  const btnLoginLabel = btnLogin.querySelector('.btn-label');
 
  const myId = Math.random().toString(36).slice(2);
  let channel = null;
  let suppressEvents = false;
  let otherPresent = false;
  let supabase = null;
 
  let currentMode = 'each';
  let currentRole = 'host';
  let pc = null;
  let hostVideoReady = false;
  let pendingIceQueue = [];
  let remoteDescSet = false;
  let guestRetryTimer = null;
 
  // ---------- navegação lateral (flyouts) ----------
  const panels = { room: document.getElementById('flyoutRoom'), mode: document.getElementById('flyoutMode'), load: document.getElementById('flyoutLoad'), account: document.getElementById('flyoutAccount'), library: document.getElementById('flyoutLibrary') };
  const navButtons = { room: document.getElementById('navRoom'), mode: document.getElementById('navMode'), load: document.getElementById('navLoad'), account: document.getElementById('navAccount'), library: document.getElementById('navLibrary') };
  let openPanel = null;
 
  function closePanel(){
    if (!openPanel) return;
    panels[openPanel].classList.remove('show');
    navButtons[openPanel].classList.remove('active');
    flyoutBackdrop.classList.remove('show');
    openPanel = null;
  }
  function togglePanel(name){
    if (openPanel === name) { closePanel(); return; }
    closePanel();
    panels[name].classList.add('show');
    navButtons[name].classList.add('active');
    flyoutBackdrop.classList.add('show');
    openPanel = name;
  }
  Object.keys(navButtons).forEach(name => {
    navButtons[name].addEventListener('click', () => togglePanel(name));
  });
  flyoutBackdrop.addEventListener('click', closePanel);
  document.getElementById('closeLibrary').addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });
 
  // ---------- ajustar o palco pra caber na tela sem gerar scroll ----------
  const videoStatusEl = document.getElementById('videoStatus');
  function fitStage(){
    const availW = stageEl.clientWidth;
    const statusH = videoStatusEl.offsetHeight + 8; // margem entre vídeo e status
    const availH = stageEl.clientHeight - statusH;
    if (availW <= 0 || availH <= 0) return;
    let w = availW;
    let h = w * 9 / 16;
    if (h > availH) { h = availH; w = h * 16 / 9; }
    videoWrap.style.width = Math.floor(w) + 'px';
    videoWrap.style.height = Math.floor(h) + 'px';
  }
  window.addEventListener('resize', fitStage);
  new ResizeObserver(fitStage).observe(stageEl);
  new ResizeObserver(fitStage).observe(videoStatusEl);
 
  const MODE_HINTS = {
    each: 'Os dois precisam ter o mesmo filme salvo — só o play, a pausa e o tempo são sincronizados.',
    stream: 'Só quem tem o filme precisa do arquivo — o vídeo vai direto pro navegador do outro.'
  };
  function updateModeHint(){ modeHint.textContent = MODE_HINTS[currentMode]; }
 
  // ---------- travar controles nativos de quem só recebe a transmissão (troca pela barra própria) ----------
  function applyControlLock(){
    const isLockedGuest = currentMode === 'stream' && currentRole === 'guest';
    player.controls = !isLockedGuest;
    player.tabIndex = isLockedGuest ? -1 : 0;
    player.classList.toggle('no-interact', isLockedGuest);
    lockBadge.classList.toggle('hidden', !isLockedGuest);
    btnFullscreen.classList.toggle('hidden', !isLockedGuest);
    guestControls.classList.toggle('hidden', !isLockedGuest);
  }
 
  // ---------- tela cheia (só existe pra quem tem controles bloqueados) ----------
  const ICON_EXPAND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4H4v4"/><path d="M16 4h4v4"/><path d="M8 20H4v-4"/><path d="M16 20h4v-4"/></svg>';
  const ICON_SHRINK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h4V4"/><path d="M20 8h-4V4"/><path d="M4 16h4v4"/><path d="M20 16h-4v4"/></svg>';
 
  function isWrapFullscreen(){
    return document.fullscreenElement === videoWrap || document.webkitFullscreenElement === videoWrap;
  }
 
  function updateFullscreenIcon(){
    btnFullscreen.innerHTML = isWrapFullscreen() ? ICON_SHRINK : ICON_EXPAND;
    btnFullscreen.setAttribute('aria-label', isWrapFullscreen() ? 'Sair da tela cheia' : 'Tela cheia');
  }
 
  btnFullscreen.addEventListener('click', () => {
    if (isWrapFullscreen()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
    } else {
      const req = videoWrap.requestFullscreen || videoWrap.webkitRequestFullscreen;
      if (req) req.call(videoWrap);
    }
  });
 
  document.addEventListener('fullscreenchange', updateFullscreenIcon);
  document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
 
  let toastTimer = null;
  function showToast(message, actionLabel, actionFn){
    toastText.textContent = message;
    toastAction.textContent = actionLabel;
    toastAction.onclick = () => { actionFn(); hideToast(); };
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 8000);
  }
  function hideToast(){
    toast.classList.remove('show');
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
  }
  toastDismiss.addEventListener('click', hideToast);
 
  // ---------- controle direto de quem recebe: pausar, adiantar/voltar e volume ----------
  function formatTime(s){
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
  }
 
  // -- lado de quem TEM o filme: avisa o estado atual pro outro lado --
  function broadcastStreamState(action){
    if (!channel || currentMode !== 'stream' || currentRole !== 'host') return;
    channel.send({
      type: 'broadcast', event: 'stream-state',
      payload: { time: player.currentTime || 0, duration: player.duration || 0, playing: !player.paused, action: action || 'tick' }
    });
  }
  player.addEventListener('play', () => broadcastStreamState('play'));
  player.addEventListener('pause', () => broadcastStreamState('pause'));
  player.addEventListener('seeked', () => broadcastStreamState('seek'));
  setInterval(() => broadcastStreamState('tick'), 2000);
 
  function handleStreamControl(payload){
    if (currentMode !== 'stream' || currentRole !== 'host') return;
    if (payload.action === 'play') player.play().catch(()=>{});
    else if (payload.action === 'pause') player.pause();
    else if (payload.action === 'seek' && typeof payload.time === 'number') player.currentTime = payload.time;
  }
 
  // -- lado de quem RECEBE: mostra o estado e manda comandos --
  let guestKnownPlaying = false;
  let isDraggingSeek = false;
 
  function applyStreamStateToUI(payload){
    if (currentMode !== 'stream' || currentRole !== 'guest') return;
    guestKnownPlaying = payload.playing;
    gcIconPlay.classList.toggle('hidden', payload.playing);
    gcIconPause.classList.toggle('hidden', !payload.playing);
    gcTimeTotal.textContent = formatTime(payload.duration);
    if (!isDraggingSeek) {
      gcSeek.max = payload.duration || 0;
      gcSeek.value = payload.time || 0;
      gcTimeCurrent.textContent = formatTime(payload.time);
    }
  }
 
  function sendStreamControl(action, extra){
    if (!channel) return;
    channel.send({ type: 'broadcast', event: 'stream-control', payload: Object.assign({ from: myId, action }, extra || {}) });
  }
 
  gcPlayPause.addEventListener('click', () => {
    sendStreamControl(guestKnownPlaying ? 'pause' : 'play');
    guestKnownPlaying = !guestKnownPlaying;
    gcIconPlay.classList.toggle('hidden', guestKnownPlaying);
    gcIconPause.classList.toggle('hidden', !guestKnownPlaying);
  });
 
  gcSeek.addEventListener('pointerdown', () => { isDraggingSeek = true; });
  gcSeek.addEventListener('input', () => { gcTimeCurrent.textContent = formatTime(parseFloat(gcSeek.value)); });
  gcSeek.addEventListener('change', () => {
    sendStreamControl('seek', { time: parseFloat(gcSeek.value) });
    isDraggingSeek = false;
  });
 
  gcVolume.addEventListener('input', () => { player.volume = parseFloat(gcVolume.value); });
 
  // ---------- segmented controls ----------
  function setSegmented(container, value){
    container.querySelectorAll('.segment').forEach(btn => btn.classList.toggle('active', btn.dataset.value === value));
  }
  modeSegmented.addEventListener('click', (e) => {
    const btn = e.target.closest('.segment');
    if (!btn) return;
    currentMode = btn.dataset.value;
    setSegmented(modeSegmented, currentMode);
    roleSegmented.classList.toggle('hidden', currentMode !== 'stream');
    updateLoaderState();
    applyControlLock();
    updateModeHint();
  });
  roleSegmented.addEventListener('click', (e) => {
    const btn = e.target.closest('.segment');
    if (!btn) return;
    currentRole = btn.dataset.value;
    setSegmented(roleSegmented, currentRole);
    updateLoaderState();
    applyControlLock();
  });
 
  function updateLoaderState(){
    if (currentMode === 'stream' && currentRole === 'guest' && player.style.display !== 'block') {
      placeholder.querySelector('p').textContent = 'Aguardando a transmissão da outra pessoa…';
    } else if (player.style.display !== 'block') {
      placeholder.querySelector('p').textContent = 'Entre numa sala e carregue o filme pra começar.';
    }
  }
 
  // ---------- login ----------
  function getSupabase(){
    if (!supabase) supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabase;
  }
 
  function showApp(email){
    loginScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    accountEmail.textContent = email || '';
    updateModeHint();
    requestAnimationFrame(fitStage);
    loadLibrary();
    loadShortcuts();
  }
 
  let isSignupMode = false;
  toggleSignup.addEventListener('click', () => {
    isSignupMode = !isSignupMode;
    btnLoginLabel.textContent = isSignupMode ? 'Criar conta' : 'Entrar';
    toggleSignup.textContent = isSignupMode ? 'Já tem conta? Entrar' : 'Ainda não tem conta? Criar conta';
    loginError.textContent = '';
  });
 
  function setLoginBusy(busy){
    btnLogin.disabled = busy;
    loginSpinner.classList.toggle('hidden', !busy);
    btnLoginLabel.style.display = busy ? 'none' : 'inline';
  }
 
  async function tryLogin(){
    loginError.textContent = '';
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    if (!email || !password) { loginError.textContent = 'Preencha e-mail e senha.'; return; }
    if (SUPABASE_URL.includes('SUA_URL') || SUPABASE_ANON_KEY.includes('SUA_CHAVE')) {
      loginError.textContent = 'Faltou colocar a URL e a chave do Supabase no código.';
      return;
    }
    setLoginBusy(true);
    const client = getSupabase();
    const { data, error } = isSignupMode
      ? await client.auth.signUp({ email, password })
      : await client.auth.signInWithPassword({ email, password });
    setLoginBusy(false);
 
    if (error) {
      loginError.textContent = isSignupMode ? (error.message || 'Não foi possível criar a conta.') : 'E-mail ou senha incorretos.';
      return;
    }
    if (isSignupMode && !data.session) {
      loginError.textContent = 'Conta criada! Confirme o e-mail (ou desative essa exigência no Supabase) e faça login.';
      isSignupMode = false;
      btnLoginLabel.textContent = 'Entrar';
      toggleSignup.textContent = 'Ainda não tem conta? Criar conta';
      return;
    }
    showApp(data.user ? data.user.email : email);
  }
 
  btnLogin.addEventListener('click', tryLogin);
  loginPassword.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryLogin(); });
 
  btnLogout.addEventListener('click', async () => {
    await getSupabase().auth.signOut();
    closePanel();
    appScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    loginEmail.value = '';
    loginPassword.value = '';
  });
 
  (async function checkExistingSession(){
    if (SUPABASE_URL.includes('SUA_URL') || SUPABASE_ANON_KEY.includes('SUA_CHAVE')) return;
    const { data } = await getSupabase().auth.getSession();
    if (data && data.session) showApp(data.session.user.email);
  })();
 
  // ======================================================================
  // BIBLIOTECA DE FILMES
  // Dados (título, link do vídeo, endereço da capa OU aviso de capa local)
  // ficam no Supabase. Se a capa for um ARQUIVO escolhido do dispositivo,
  // a imagem em si nunca vai pro banco — fica só neste navegador, guardada
  // no IndexedDB. Só o texto do link é leve o bastante pra ir ao banco.
  // ======================================================================
 
  // ---------- IndexedDB: guarda as capas que vieram de arquivo local ----------
  const COVER_DB_NAME = 'sala-cinema-covers';
  let coverDbPromise = null;
  function openCoverDb(){
    if (coverDbPromise) return coverDbPromise;
    coverDbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(COVER_DB_NAME, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore('covers'); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return coverDbPromise;
  }
  async function saveCoverLocal(movieId, dataUrl){
    const db = await openCoverDb();
    return new Promise((resolve) => {
      const tx = db.transaction('covers', 'readwrite');
      tx.objectStore('covers').put(dataUrl, movieId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }
  async function getCoverLocal(movieId){
    const db = await openCoverDb();
    return new Promise((resolve) => {
      const tx = db.transaction('covers', 'readonly');
      const req = tx.objectStore('covers').get(movieId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }
  async function deleteCoverLocal(movieId){
    const db = await openCoverDb();
    return new Promise((resolve) => {
      const tx = db.transaction('covers', 'readwrite');
      tx.objectStore('covers').delete(movieId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }
  function fileToDataUrl(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
 
  // ---------- carregar / desenhar a biblioteca ----------
  let pendingCoverFile = null;
  libCoverFile.addEventListener('change', () => {
    pendingCoverFile = libCoverFile.files[0] || null;
    labelLibCover.textContent = pendingCoverFile ? (pendingCoverFile.name.length > 16 ? pendingCoverFile.name.slice(0,13) + '…' : pendingCoverFile.name) : 'Capa (arquivo)';
    if (pendingCoverFile) libCoverUrl.value = '';
  });
  libCoverUrl.addEventListener('input', () => {
    if (libCoverUrl.value.trim()) { pendingCoverFile = null; libCoverFile.value = ''; labelLibCover.textContent = 'Capa (arquivo)'; }
  });
 
  async function renderMovieCard(movie){
    const card = document.createElement('div');
    card.className = 'movie-card';
 
    let coverSrc = movie.cover_url || null;
    if (!coverSrc) {
      const local = await getCoverLocal(movie.id);
      if (local) coverSrc = local;
    }
 
    card.innerHTML = `
      ${coverSrc ? `<img src="${coverSrc}" alt="">` : ''}
      <button class="movie-remove" type="button" aria-label="Remover">✕</button>
      <span class="movie-title">${movie.title}</span>
    `;
    card.addEventListener('click', (e) => {
      if (e.target.closest('.movie-remove')) return;
      loadVideoFromSrc(movie.video_url, movie.title, movie.id);
    });
    card.querySelector('.movie-remove').addEventListener('click', async (e) => {
      e.stopPropagation();
      await getSupabase().from('movies').delete().eq('id', movie.id);
      await deleteCoverLocal(movie.id);
      loadLibrary();
    });
    return card;
  }
 
  async function loadLibrary(){
    if (SUPABASE_URL.includes('SUA_URL')) return;
    const { data, error } = await getSupabase().from('movies').select('*').order('created_at', { ascending: false });
    libraryGrid.innerHTML = '';
    if (error) {
      libraryGrid.appendChild(libraryEmpty);
      libraryEmpty.textContent = 'Não consegui carregar a biblioteca (crie a tabela "movies" no Supabase — veja as instruções).';
      return;
    }
    if (!data || !data.length) {
      libraryGrid.appendChild(libraryEmpty);
      libraryEmpty.textContent = 'Nenhum filme na biblioteca ainda.';
      return;
    }
    for (const movie of data) {
      libraryGrid.appendChild(await renderMovieCard(movie));
    }
  }
 
  btnAddMovie.addEventListener('click', async () => {
    const title = libTitle.value.trim();
    const videoUrl = libVideoUrl.value.trim();
    if (!title || !videoUrl) { libStatus.textContent = 'Preencha o título e o link do filme.'; return; }
 
    libStatus.textContent = 'Salvando…';
    btnAddMovie.disabled = true;
 
    const coverUrl = libCoverUrl.value.trim() || null;
    const { data, error } = await getSupabase().from('movies').insert({ title, video_url: videoUrl, cover_url: coverUrl }).select().single();
 
    btnAddMovie.disabled = false;
 
    if (error) {
      libStatus.textContent = 'Não consegui salvar (confira se a tabela "movies" existe no Supabase).';
      return;
    }
    if (pendingCoverFile && data) {
      const dataUrl = await fileToDataUrl(pendingCoverFile);
      await saveCoverLocal(data.id, dataUrl);
    }
 
    libTitle.value = ''; libVideoUrl.value = ''; libCoverUrl.value = '';
    pendingCoverFile = null; libCoverFile.value = ''; labelLibCover.textContent = 'Capa (arquivo)';
    libStatus.textContent = 'Filme adicionado!';
    setTimeout(() => {
      libStatus.textContent = '';
      libraryAddForm.classList.add('hidden');
      toggleAddMovie.classList.remove('active');
      toggleAddMovie.querySelector('span').textContent = '+ Adicionar filme';
    }, 900);
    loadLibrary();
  });
 
  // ---------- atalhos (links editáveis, ex.: páginas do X/Twitter) ----------
  async function loadShortcuts(){
    if (SUPABASE_URL.includes('SUA_URL')) return;
    const { data, error } = await getSupabase().from('shortcuts').select('*').order('created_at', { ascending: true });
    shortcutsList.innerHTML = '';
    if (error || !data) return;
    data.forEach(sc => {
      const a = document.createElement('a');
      a.className = 'shortcut-link';
      a.href = sc.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.innerHTML = `<span>${sc.label}</span><button class="shortcut-remove" type="button" aria-label="Remover">✕</button>`;
      a.querySelector('.shortcut-remove').addEventListener('click', async (e) => {
        e.preventDefault(); e.stopPropagation();
        await getSupabase().from('shortcuts').delete().eq('id', sc.id);
        loadShortcuts();
      });
      shortcutsList.appendChild(a);
    });
  }
 
  btnAddShortcut.addEventListener('click', async () => {
    const label = shortcutLabel.value.trim();
    const url = shortcutUrl.value.trim();
    if (!label || !url) return;
    await getSupabase().from('shortcuts').insert({ label, url });
    shortcutLabel.value = ''; shortcutUrl.value = '';
    shortcutAddForm.classList.add('hidden');
    loadShortcuts();
  });
 
  // ---------- transmitir para TV (Remote Playback API — sem SDK externo) ----------
  navCast.addEventListener('click', async () => {
    if (!player.src && !player.currentSrc) {
      showToast('Carregue um filme primeiro pra poder transmitir.', 'Entendi', () => {});
      return;
    }
    if (player.src && player.src.startsWith('blob:')) {
      showToast('Pra transmitir pra TV, carregue o filme por um link direto (não um arquivo local).', 'Entendi', () => {});
      return;
    }
    try {
      if (player.remote && typeof player.remote.prompt === 'function') {
        await player.remote.prompt();
      } else if (typeof player.webkitShowPlaybackTargetPicker === 'function') {
        player.webkitShowPlaybackTargetPicker(); // AirPlay no Safari
      } else {
        showToast('Esse navegador não suporta transmissão automática. No Chrome, use o ícone de transmitir da própria barra do navegador.', 'Entendi', () => {});
      }
    } catch (err) {
      const msg = (err && err.name === 'NotFoundError')
        ? 'Nenhuma TV encontrada na mesma rede Wi-Fi.'
        : 'Não consegui transmitir (' + (err && err.message ? err.message : 'erro desconhecido') + ').';
      showToast(msg, 'Entendi', () => {});
    }
  });
 
  // ---------- retomar de onde parou (localStorage, sobrevive a atualização/queda de conexão) ----------
  function resumeKeyFor(src){
    return 'resume:' + btoa(unescape(encodeURIComponent(src))).slice(0, 120);
  }
  let currentResumeKey = null;
  player.addEventListener('loadedmetadata', () => {
    if (!currentResumeKey) return;
    const saved = parseFloat(localStorage.getItem(currentResumeKey));
    if (saved && saved > 5 && saved < player.duration - 8) {
      player.currentTime = saved;
    }
  });
  setInterval(() => {
    if (!currentResumeKey || player.paused || !player.src) return;
    localStorage.setItem(currentResumeKey, String(player.currentTime));
  }, 5000);
  player.addEventListener('pause', () => {
    if (currentResumeKey && player.src) localStorage.setItem(currentResumeKey, String(player.currentTime));
  });
 
  // ---------- gesto de arrastar (só no mobile): arrasta da borda esquerda pra direita, abre a biblioteca ----------
  let touchStartX = null, touchStartY = null;
  document.addEventListener('touchstart', (e) => {
    if (window.innerWidth > 640) return;
    if (document.querySelector('.flyout.show')) { touchStartX = null; return; } // painel já aberto: não interfere no toque/scroll dele
    const t = e.touches[0];
    if (t.clientX > 20) { touchStartX = null; return; } // só conta bem na borda
    touchStartX = t.clientX; touchStartY = t.clientY;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = Math.abs(t.clientY - touchStartY);
    if (dx > 70 && dy < 60) togglePanel('library');
    touchStartX = null;
  }, { passive: true });
 
  // ---------- fecha os painéis se clicar fora, exceto o próprio dropdown de sala já cuida disso ----------
 
  // ---------- carregar vídeo ----------
  function setStatus(state, text){
    statusDot.className = 'side-dot' + (state ? ' ' + state : '');
    statusText.textContent = text;
  }
 
  function loadVideoFromSrc(src, label, movieId){
    player.src = src;
    player.style.display = 'block';
    placeholder.style.display = 'none';
    metaInfo.textContent = 'Filme: ' + label;
    closePanel();
    currentResumeKey = resumeKeyFor(movieId ? 'movie:' + movieId : src);
  }
 
  player.addEventListener('loadedmetadata', () => {
    if (currentMode === 'stream' && currentRole === 'host') {
      hostVideoReady = true;
      player.muted = false; // garante que a captura não pegue um vídeo mudo por engano
      const beginStream = () => { if (otherPresent) startHostOffer(); };
      player.play().then(() => {
        // espera o evento "playing" (frames e áudio já fluindo de verdade) antes de capturar
        if (!player.paused && player.currentTime > 0) beginStream();
        else player.addEventListener('playing', beginStream, { once: true });
      }).catch(() => {
        streamStatus.textContent = 'Toque no vídeo pra iniciar a reprodução e a transmissão';
        player.addEventListener('playing', beginStream, { once: true });
      });
    }
  });
 
  let currentLocalFile = null;
  let tempCastPath = null; // caminho no Supabase Storage, enquanto o arquivo estiver hospedado temporariamente
 
  inputVideo.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    currentLocalFile = file;
    loadVideoFromSrc(URL.createObjectURL(file), file.name);
    btnVideo.classList.add('loaded');
    labelVideo.textContent = file.name.length > 24 ? file.name.slice(0,21) + '…' : file.name;
  });
 
  btnLoadUrl.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (!url) return;
    loadVideoFromSrc(url, 'link direto');
  });
 
  // ---------- sincronização (modo "cada um com o arquivo") ----------
  function sendState(eventName, extra){
    if (!channel) return;
    channel.send({ type: 'broadcast', event: 'sync', payload: Object.assign({ from: myId, time: player.currentTime || 0, playing: !player.paused, action: eventName, at: Date.now() }, extra || {}) });
  }
  player.addEventListener('play', () => { if (!suppressEvents && currentMode === 'each') sendState('play'); });
  player.addEventListener('pause', () => { if (!suppressEvents && currentMode === 'each') sendState('pause'); });
  player.addEventListener('seeked', () => { if (!suppressEvents && currentMode === 'each') sendState('seek'); });
  setInterval(() => {
    if (currentMode !== 'each' || !channel || player.paused || !player.src) return;
    sendState('heartbeat');
  }, 4000);
  function applyRemote(payload){
    if (currentMode !== 'each' || payload.from === myId) return;
    const diff = Math.abs((player.currentTime || 0) - payload.time);
    suppressEvents = true;
    if (payload.action === 'seek' || diff > 1.2) { try { player.currentTime = payload.time; } catch(e) {} }
    if (payload.playing && player.paused) player.play().catch(()=>{});
    else if (!payload.playing && !player.paused) player.pause();
    driftInfo.textContent = diff > 1.2 ? 'ajustado (' + diff.toFixed(1) + 's)' : '';
    setTimeout(() => { suppressEvents = false; }, 300);
  }
 
  // ---------- WebRTC: transmissão ao vivo ----------
  function newPeerConnection(){
    const conn = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    conn.onicecandidate = (e) => {
      if (e.candidate && channel) channel.send({ type: 'broadcast', event: 'webrtc-ice', payload: { from: myId, role: currentRole, candidate: e.candidate } });
    };
    conn.onconnectionstatechange = () => {
      const state = conn.connectionState;
      const labels = { connecting: 'Conectando transmissão…', connected: 'Transmissão ao vivo conectada', disconnected: 'Conexão perdida, tentando de novo…', failed: 'Falha na conexão — tentando de novo…', closed: '' };
      streamStatus.textContent = labels[state] || '';
      if (state === 'failed' && currentMode === 'stream') {
        if (currentRole === 'host' && otherPresent) setTimeout(startHostOffer, 1500);
        if (currentRole === 'guest') requestOfferWithRetry();
      }
    };
    return conn;
  }
 
  async function flushPendingIce(){
    if (!pc) return;
    while (pendingIceQueue.length) {
      const candidate = pendingIceQueue.shift();
      try { await pc.addIceCandidate(candidate); } catch(e) {}
    }
  }
 
  async function startHostOffer(){
    if (!hostVideoReady || !channel) return;
    streamStatus.textContent = 'Conectando transmissão…';
    remoteDescSet = false;
    pendingIceQueue = [];
    if (pc) pc.close();
    pc = newPeerConnection();
    player.muted = false; // segurança extra: nunca capturar com o vídeo mudo
    const stream = player.captureStream ? player.captureStream(30) : player.mozCaptureStream();
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
 
    if (stream.getAudioTracks().length === 0) {
      streamStatus.textContent = 'Atenção: não encontrei áudio nesse vídeo pra transmitir.';
    }
 
    // força qualidade alta: sem isso, o WebRTC reduz bitrate/resolução sozinho de forma bem agressiva
    const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
    if (videoSender) {
      const params = videoSender.getParameters();
      if (!params.encodings || !params.encodings.length) params.encodings = [{}];
      params.encodings[0].maxBitrate = 8_000_000; // 8 Mbps
      params.degradationPreference = 'maintain-resolution'; // prefere perder quadros a perder nitidez
      try { await videoSender.setParameters(params); } catch(e) {}
    }
 
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    channel.send({ type: 'broadcast', event: 'webrtc-offer', payload: { from: myId, sdp: offer } });
  }
 
  async function handleOfferAsGuest(payload){
    stopGuestRetry();
    streamStatus.textContent = 'Recebendo transmissão…';
    remoteDescSet = false;
    pendingIceQueue = [];
    if (pc) pc.close();
    pc = newPeerConnection();
    pc.ontrack = (e) => {
      player.srcObject = e.streams[0];
      player.style.display = 'block';
      placeholder.style.display = 'none';
      applyControlLock();
      player.play().catch(() => { streamStatus.textContent = 'Toque no vídeo pra iniciar o som'; });
      metaInfo.textContent = 'Recebendo filme da outra pessoa';
      closePanel();
    };
    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    remoteDescSet = true;
    await flushPendingIce();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    channel.send({ type: 'broadcast', event: 'webrtc-answer', payload: { from: myId, sdp: answer } });
  }
 
  async function handleAnswerAsHost(payload){
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    remoteDescSet = true;
    await flushPendingIce();
  }
 
  async function handleRemoteIce(payload){
    if (!pc || payload.role === currentRole) return;
    if (remoteDescSet) { try { await pc.addIceCandidate(payload.candidate); } catch(e) {} }
    else pendingIceQueue.push(payload.candidate);
  }
 
  function requestOfferWithRetry(){
    stopGuestRetry();
    let attempts = 0;
    const tryRequest = () => {
      if (!channel || currentRole !== 'guest' || currentMode !== 'stream') { stopGuestRetry(); return; }
      if (pc && pc.connectionState === 'connected') { stopGuestRetry(); return; }
      attempts++;
      channel.send({ type: 'broadcast', event: 'webrtc-request', payload: { from: myId } });
      if (attempts === 1) streamStatus.textContent = 'Procurando a transmissão…';
      if (attempts >= 8) { stopGuestRetry(); streamStatus.textContent = 'Não encontrei a transmissão — confirme se a outra pessoa já carregou o filme.'; }
    };
    tryRequest();
    guestRetryTimer = setInterval(tryRequest, 4000);
  }
  function stopGuestRetry(){ if (guestRetryTimer) { clearInterval(guestRetryTimer); guestRetryTimer = null; } }
 
  // ---------- sala ----------
  btnJoin.addEventListener('click', () => {
    const code = roomCodeInput.value.trim().toLowerCase();
    if (!code) { roomCodeInput.focus(); return; }
    if (SUPABASE_URL.includes('SUA_URL') || SUPABASE_ANON_KEY.includes('SUA_CHAVE')) {
      setStatus('', 'Faltou colocar a URL e a chave do Supabase no código');
      return;
    }
    if (channel) channel.unsubscribe();
    stopGuestRetry();
 
    channel = getSupabase().channel('sala-' + code, { config: { broadcast: { self: false }, presence: { key: myId } } });
 
    channel.on('broadcast', { event: 'sync' }, (msg) => applyRemote(msg.payload));
    channel.on('broadcast', { event: 'webrtc-offer' }, (msg) => { if (currentMode === 'stream' && currentRole === 'guest') handleOfferAsGuest(msg.payload); });
    channel.on('broadcast', { event: 'webrtc-answer' }, (msg) => { if (currentMode === 'stream' && currentRole === 'host') handleAnswerAsHost(msg.payload); });
    channel.on('broadcast', { event: 'webrtc-ice' }, (msg) => handleRemoteIce(msg.payload));
    channel.on('broadcast', { event: 'webrtc-request' }, () => { if (currentMode === 'stream' && currentRole === 'host') startHostOffer(); });
    channel.on('broadcast', { event: 'control-request' }, () => {}); // compatibilidade com versões antigas do site, sem efeito
    channel.on('broadcast', { event: 'stream-state' }, (msg) => applyStreamStateToUI(msg.payload));
    channel.on('broadcast', { event: 'stream-control' }, (msg) => handleStreamControl(msg.payload));
 
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const count = Object.keys(state).length;
      const wasPresent = otherPresent;
      otherPresent = count > 1;
      nodeMe.classList.add('on');
      nodeOther.classList.toggle('on', otherPresent);
      threadLine.classList.toggle('on', otherPresent);
 
      if (otherPresent) {
        setStatus('connected', 'Sala "' + code + '" — os dois estão aqui');
        if (!wasPresent && currentMode === 'stream') {
          if (currentRole === 'host' && hostVideoReady) { startHostOffer(); broadcastStreamState('tick'); }
          if (currentRole === 'guest') requestOfferWithRetry();
        }
      } else {
        setStatus('waiting', 'Sala "' + code + '" — esperando a outra pessoa entrar');
      }
    });
 
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        nodeMe.classList.add('on');
        await channel.track({ joinedAt: Date.now() });
        setStatus('waiting', 'Sala "' + code + '" — esperando a outra pessoa entrar');
        if (currentMode === 'each') sendState('request-sync');
      }
    });
 
    btnJoin.textContent = 'Trocar de sala';
  });
 
})();
 