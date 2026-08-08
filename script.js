(function(){
  // ======= PREENCHA AQUI COM SEUS DADOS DO SUPABASE =======
  const SUPABASE_URL = "https://eogugfwxbqcydonhnmnd.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_PvIiBvBCucOinjgC4biNlg_KBvjVOlS";
  // ==========================================================

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
  const seatMe = document.getElementById('seatMe');
  const seatOther = document.getElementById('seatOther');

  const myId = Math.random().toString(36).slice(2);
  let channel = null;
  let suppressEvents = false; // evita eco ao aplicar estado remoto
  let lastSentAt = 0;
  let otherPresent = false;
  let supabase = null;

  const loginScreen = document.getElementById('loginScreen');
  const appScreen = document.getElementById('appScreen');
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const btnLogin = document.getElementById('btnLogin');
  const loginError = document.getElementById('loginError');

  function getSupabase(){
    if (!supabase) {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabase;
  }

  function showApp(){
    loginScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
  }

  async function tryLogin(){
    loginError.textContent = '';
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    if (!email || !password) {
      loginError.textContent = 'Preencha e-mail e senha.';
      return;
    }
    if (SUPABASE_URL.includes('SUA_URL') || SUPABASE_ANON_KEY.includes('SUA_CHAVE')) {
      loginError.textContent = 'Faltou colocar a URL e a chave do Supabase no código.';
      return;
    }
    btnLogin.disabled = true;
    btnLogin.textContent = 'Entrando…';
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    btnLogin.disabled = false;
    btnLogin.textContent = 'Entrar';
    if (error) {
      loginError.textContent = 'E-mail ou senha incorretos.';
      return;
    }
    showApp();
  }

  btnLogin.addEventListener('click', tryLogin);
  loginPassword.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryLogin(); });

  // Se já existir uma sessão salva no navegador, entra direto sem pedir login de novo
  (async function checkExistingSession(){
    if (SUPABASE_URL.includes('SUA_URL') || SUPABASE_ANON_KEY.includes('SUA_CHAVE')) return;
    const { data } = await getSupabase().auth.getSession();
    if (data && data.session) showApp();
  })();

  const modePanel = document.getElementById('modePanel');
  const rolePanel = document.getElementById('rolePanel');
  const loaderControls = document.getElementById('loaderControls');
  const streamStatusRow = document.getElementById('streamStatusRow');
  const streamStatus = document.getElementById('streamStatus');

  let currentMode = 'each';
  let currentRole = 'host';
  let pc = null; // RTCPeerConnection
  let hostVideoReady = false;
  let pendingGuestRequest = false;
  const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

  document.querySelectorAll('input[name="mode"]').forEach(r => {
    r.addEventListener('change', () => {
      currentMode = document.querySelector('input[name="mode"]:checked').value;
      rolePanel.classList.toggle('hidden', currentMode !== 'stream');
      updateLoaderVisibility();
    });
  });
  document.querySelectorAll('input[name="role"]').forEach(r => {
    r.addEventListener('change', () => {
      currentRole = document.querySelector('input[name="role"]:checked').value;
      updateLoaderVisibility();
    });
  });

  function updateLoaderVisibility(){
    const showLoader = currentMode === 'each' || (currentMode === 'stream' && currentRole === 'host');
    loaderControls.classList.toggle('hidden', !showLoader);
    streamStatusRow.style.display = currentMode === 'stream' ? 'flex' : 'none';
    if (currentMode === 'stream' && currentRole === 'guest') {
      placeholder.innerHTML = '<span class="curtain-icon">🎬</span>Aguardando a transmissão da outra pessoa…';
      placeholder.style.display = player.style.display === 'block' ? 'none' : 'block';
    }
  }

  function setStatus(state, text){
    statusDot.className = 'status-dot' + (state ? ' ' + state : '');
    statusText.textContent = text;
  }

  function loadVideoFromSrc(src, label){
    player.src = src;
    player.style.display = 'block';
    placeholder.style.display = 'none';
    metaInfo.textContent = 'Filme: ' + label;
  }

  player.addEventListener('loadedmetadata', () => {
    if (currentMode === 'stream' && currentRole === 'host') {
      hostVideoReady = true;
      player.play().catch(()=>{});
      if (pendingGuestRequest) startHostOffer();
    }
  });

  inputVideo.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    loadVideoFromSrc(url, file.name);
    btnVideo.classList.add('loaded');
    labelVideo.textContent = file.name.length > 26 ? file.name.slice(0,23) + '…' : file.name;
  });

  btnLoadUrl.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (!url) return;
    loadVideoFromSrc(url, 'link direto');
  });

  function sendState(eventName, extra){
    if (!channel) return;
    lastSentAt = Date.now();
    channel.send({
      type: 'broadcast',
      event: 'sync',
      payload: Object.assign({
        from: myId,
        time: player.currentTime || 0,
        playing: !player.paused,
        action: eventName,
        at: Date.now()
      }, extra || {})
    });
  }

  // Envia comandos quando EU controlo o vídeo (não quando é aplicação remota) — só no modo "cada um com o próprio arquivo"
  player.addEventListener('play', () => { if (!suppressEvents && currentMode === 'each') sendState('play'); });
  player.addEventListener('pause', () => { if (!suppressEvents && currentMode === 'each') sendState('pause'); });
  player.addEventListener('seeked', () => { if (!suppressEvents && currentMode === 'each') sendState('seek'); });

  // Heartbeat leve pra quem entra depois se ajustar, e corrigir deriva de tempo
  setInterval(() => {
    if (currentMode !== 'each' || !channel || player.paused || !player.src) return;
    sendState('heartbeat');
  }, 4000);

  function applyRemote(payload){
    if (currentMode !== 'each') return;
    if (payload.from === myId) return; // ignora meu próprio eco

    const diff = Math.abs((player.currentTime || 0) - payload.time);

    suppressEvents = true;

    // Corrige o tempo se a diferença for perceptível (>1.2s) ou se for um seek explícito
    if (payload.action === 'seek' || diff > 1.2) {
      try { player.currentTime = payload.time; } catch(e) {}
    }

    if (payload.playing && player.paused) {
      player.play().catch(()=>{});
    } else if (!payload.playing && !player.paused) {
      player.pause();
    }

    driftInfo.textContent = diff > 1.2 ? 'ajustado (' + diff.toFixed(1) + 's de diferença)' : '';

    setTimeout(() => { suppressEvents = false; }, 300);
  }

  // ======= WEBRTC: transmissão ao vivo de quem tem o filme pra quem não tem =======

  function newPeerConnection(){
    const conn = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    conn.onicecandidate = (e) => {
      if (e.candidate && channel) {
        channel.send({
          type: 'broadcast', event: 'webrtc-ice',
          payload: { from: myId, role: currentRole, candidate: e.candidate }
        });
      }
    };
    return conn;
  }

  async function startHostOffer(){
    if (!hostVideoReady || !channel) { pendingGuestRequest = true; return; }
    pendingGuestRequest = false;
    streamStatus.textContent = 'Conectando transmissão…';

    if (pc) { pc.close(); }
    pc = newPeerConnection();

    const stream = player.captureStream ? player.captureStream() : player.mozCaptureStream();
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    channel.send({
      type: 'broadcast', event: 'webrtc-offer',
      payload: { from: myId, sdp: offer }
    });
  }

  async function handleOfferAsGuest(payload){
    streamStatus.textContent = 'Recebendo transmissão…';
    if (pc) { pc.close(); }
    pc = newPeerConnection();

    pc.ontrack = (e) => {
      player.srcObject = e.streams[0];
      player.style.display = 'block';
      placeholder.style.display = 'none';
      player.play().catch(() => {
        streamStatus.textContent = 'Toque no vídeo pra iniciar o som';
      });
      streamStatus.textContent = 'Transmissão ao vivo conectada';
      metaInfo.textContent = 'Recebendo filme da outra pessoa';
    };

    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    channel.send({
      type: 'broadcast', event: 'webrtc-answer',
      payload: { from: myId, sdp: answer }
    });
  }

  async function handleAnswerAsHost(payload){
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    streamStatus.textContent = 'Transmissão ao vivo conectada';
  }

  async function handleRemoteIce(payload){
    if (!pc || payload.role === currentRole) return; // só aplica candidato do outro lado
    try { await pc.addIceCandidate(payload.candidate); } catch(e) {}
  }

  btnJoin.addEventListener('click', () => {
    const code = roomCodeInput.value.trim().toLowerCase();
    if (!code) { roomCodeInput.focus(); return; }

    if (SUPABASE_URL.includes('SUA_URL') || SUPABASE_ANON_KEY.includes('SUA_CHAVE')) {
      setStatus('', 'Faltou colocar a URL e a chave do Supabase no código');
      return;
    }

    if (channel) { channel.unsubscribe(); }

    channel = getSupabase().channel('sala-' + code, {
      config: { broadcast: { self: false }, presence: { key: myId } }
    });

    channel.on('broadcast', { event: 'sync' }, (msg) => applyRemote(msg.payload));
    channel.on('broadcast', { event: 'webrtc-offer' }, (msg) => {
      if (currentMode === 'stream' && currentRole === 'guest') handleOfferAsGuest(msg.payload);
    });
    channel.on('broadcast', { event: 'webrtc-answer' }, (msg) => {
      if (currentMode === 'stream' && currentRole === 'host') handleAnswerAsHost(msg.payload);
    });
    channel.on('broadcast', { event: 'webrtc-ice' }, (msg) => handleRemoteIce(msg.payload));
    channel.on('broadcast', { event: 'webrtc-request' }, () => {
      if (currentMode === 'stream' && currentRole === 'host') startHostOffer();
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const count = Object.keys(state).length;
      otherPresent = count > 1;
      seatOther.classList.toggle('on', otherPresent);
      if (otherPresent) {
        setStatus('connected', 'Sala "' + code + '" — os dois estão aqui');
        // Anfitrião: assim que detectar o outro na sala, (re)inicia a transmissão —
        // não depende de quem entrou primeiro, nem de um pedido explícito do convidado.
        if (currentMode === 'stream' && currentRole === 'host') {
          if (!pc || pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'new') {
            startHostOffer();
          }
        }
      } else {
        setStatus('waiting', 'Sala "' + code + '" — esperando a outra pessoa entrar');
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        seatMe.classList.add('on');
        await channel.track({ joinedAt: Date.now() });
        setStatus('waiting', 'Sala "' + code + '" — esperando a outra pessoa entrar');
        if (currentMode === 'stream' && currentRole === 'guest') {
          channel.send({ type: 'broadcast', event: 'webrtc-request', payload: { from: myId } });
        } else {
          // pede o estado atual pra quem já estiver na sala (modo "cada um com o próprio arquivo")
          sendState('request-sync');
        }
      }
    });

    btnJoin.textContent = 'Trocar de sala';
  });

})();