(function(){
  // ======= PREENCHA AQUI COM SEUS DADOS DO SUPABASE =======
  const SUPABASE_URL = "https://eogugfwxbqcydonhnmnd.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_PvIiBvBCucOinjgC4biNlg_KBvjVOlS";
  // ==========================================================S
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
  const guestRequests = document.getElementById('guestRequests');
  const btnRequestPause = document.getElementById('btnRequestPause');
  const btnRequestPlay = document.getElementById('btnRequestPlay');
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

  const loginScreen = document.getElementById('loginScreen');
  const appScreen = document.getElementById('appScreen');
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const btnLogin = document.getElementById('btnLogin');
  const loginError = document.getElementById('loginError');

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
  const panels = { room: document.getElementById('flyoutRoom'), mode: document.getElementById('flyoutMode'), load: document.getElementById('flyoutLoad'), account: document.getElementById('flyoutAccount') };
  const navButtons = { room: document.getElementById('navRoom'), mode: document.getElementById('navMode'), load: document.getElementById('navLoad'), account: document.getElementById('navAccount') };
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

  // ---------- travar controles de quem só recebe a transmissão ----------
  function applyControlLock(){
    const isLockedGuest = currentMode === 'stream' && currentRole === 'guest';
    player.controls = !isLockedGuest;
    player.tabIndex = isLockedGuest ? -1 : 0;
    player.classList.toggle('no-interact', isLockedGuest);
    lockBadge.classList.toggle('hidden', !isLockedGuest);
    btnFullscreen.classList.toggle('hidden', !isLockedGuest);
    guestRequests.classList.toggle('hidden', !isLockedGuest);
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

  // ---------- convidado pede pausa/play; anfitrião recebe notificação ----------
  function flashSent(btn){
    btn.classList.add('sent');
    setTimeout(() => btn.classList.remove('sent'), 1200);
  }

  function sendControlRequest(action){
    if (!channel) return;
    channel.send({ type: 'broadcast', event: 'control-request', payload: { from: myId, action } });
  }

  btnRequestPause.addEventListener('click', () => { sendControlRequest('pause'); flashSent(btnRequestPause); });
  btnRequestPlay.addEventListener('click', () => { sendControlRequest('play'); flashSent(btnRequestPlay); });

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

  function handleControlRequest(payload){
    if (payload.action === 'pause') {
      showToast('A outra pessoa pediu para pausar o filme.', 'Pausar agora', () => player.pause());
    } else {
      showToast('A outra pessoa pediu para continuar o filme.', 'Play agora', () => player.play().catch(()=>{}));
    }
  }

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
    btnLogin.disabled = true;
    btnLogin.textContent = 'Entrando…';
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    btnLogin.disabled = false;
    btnLogin.textContent = 'Entrar';
    if (error) { loginError.textContent = 'E-mail ou senha incorretos.'; return; }
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

  // ---------- carregar vídeo ----------
  function setStatus(state, text){
    statusDot.className = 'side-dot' + (state ? ' ' + state : '');
    statusText.textContent = text;
  }

  function loadVideoFromSrc(src, label){
    player.src = src;
    player.style.display = 'block';
    placeholder.style.display = 'none';
    metaInfo.textContent = 'Filme: ' + label;
    closePanel();
  }

  player.addEventListener('loadedmetadata', () => {
    if (currentMode === 'stream' && currentRole === 'host') {
      hostVideoReady = true;
      player.play().catch(()=>{});
      if (otherPresent) startHostOffer();
    }
  });

  inputVideo.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
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
    const stream = player.captureStream ? player.captureStream() : player.mozCaptureStream();
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
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
    channel.on('broadcast', { event: 'control-request' }, (msg) => { if (currentMode === 'stream' && currentRole === 'host') handleControlRequest(msg.payload); });

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
          if (currentRole === 'host' && hostVideoReady) startHostOffer();
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