// ============================================
// MEDIÇÃO DE USO (PostHog) — só carrega com POSTHOG_KEY (server.js → medicaoTags)
// ============================================
// O nome da sala e a chave do controle nunca saem daqui: quem tem o nome abre o telão e quem
// tem a chave sorteia. Toda URL e todo texto que vai para o PostHog passa por limpa():
//   ?sala=pipoca-azul-4821  →  ?sala=*        #chave=…  →  #chave=*
//   /api/rooms/pipoca-azul-4821/draw  →  /api/rooms/*/draw
// Cada página vira um caminho fixo (/, /telao, /controle), com os utm_ da busca, para dar para
// ver de onde vem quem cria bingo. O telão não é gravado: fica horas aberto e só mostra números.
(function () {
  'use strict';
  const meta = document.querySelector('meta[name="posthog"]');
  const pagina = meta.dataset.pagina; // novo, display ou admin
  const CAMINHO = { novo: '/', display: '/telao', admin: '/controle' }[pagina] || '/';
  // nomes sorteados (server.js → newRoomName): palavra-cor-1234
  const SALA = /\b[a-z]+-[a-z]+-\d{4}\b/g;

  function limpa(texto) {
    if (typeof texto !== 'string') return texto;
    return texto
      .replace(/([?&#](?:sala|chave)=)[^&#"'\s;]*/g, '$1*')
      .replace(/(\/api\/(?:rooms|qr)\/)[^/?#"'\s;]+/g, '$1*')
      .replace(SALA, '*');
  }

  // limpa todo texto do evento, valores e chaves (o mapa de calor usa a URL como chave)
  function varre(x, fundo) {
    if (!x || typeof x !== 'object' || fundo > 6) return;
    Object.keys(x).forEach(k => {
      const v = typeof x[k] === 'string' ? limpa(x[k]) : x[k];
      if (typeof v === 'object') varre(v, fundo + 1);
      const k2 = limpa(k);
      if (k2 !== k) delete x[k];
      x[k2] = v;
    });
  }

  function utm() {
    const fica = new URLSearchParams();
    new URLSearchParams(location.search).forEach((v, k) => { if (/^utm_\w+$/.test(k)) fica.append(k, v); });
    return fica.toString() ? `?${fica}` : '';
  }

  function antesDeMandar(ev) {
    if (!ev) return ev;
    if (ev.event === '$snapshot') {
      // na gravação, a URL só vem no evento de página (tipo 4)
      const d = ev.properties?.$snapshot_data;
      if (Array.isArray(d)) d.forEach(s => { if (s?.type === 4 && s.data?.href) s.data.href = location.origin + CAMINHO; });
      return ev;
    }
    varre(ev.properties, 0);
    varre(ev.$set, 0);
    varre(ev.$set_once, 0);
    if (ev.properties) {
      ev.properties.$pathname = CAMINHO;
      ev.properties.$current_url = location.origin + CAMINHO + utm();
    }
    return ev;
  }

  // o snippet oficial do PostHog (posthog.com/docs/libraries/js), sem mudança
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],Object.defineProperty(u,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e}}),Object.defineProperty(u.people,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+".people (stub)"}}),o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  window.posthog.init(meta.content, {
    api_host: meta.dataset.host || 'https://us.i.posthog.com',
    defaults: '2026-05-30',
    person_profiles: 'identified_only',   // ninguém se identifica: todo evento é anônimo
    cross_subdomain_cookie: false,        // o cookie fica em bingo.…, não vale para os outros subdomínios
    capture_heatmaps: true,
    capture_dead_clicks: true,
    capture_exceptions: true,
    enable_recording_console_log: false,
    disable_session_recording: pagina === 'display',
    session_recording: {
      maskAllInputs: true,                // nome da caixa de som, usuário e senha
      maskTextSelector: '*',
      maskTextFn: limpa,                  // o texto aparece, menos sala, chave e links
      maskAttributeFn: (nome, valor) => limpa(valor),
      blockSelector: '#admin-qr',         // o QR code do controle leva a chave
      recordHeaders: false,               // X-Bingo-Key e Authorization
      recordBody: false,
      maskCapturedNetworkRequestFn: r => {
        r.name = limpa(r.name);
        r.requestBody = r.responseBody = null;
        delete r.requestHeaders;
        delete r.responseHeaders;
        return r;
      }
    },
    before_send: antesDeMandar
  });
  window.posthog.register({ app: 'bingo', pagina: CAMINHO });

  // As telas chamam medir('bingo criado', {...}); sem POSTHOG_KEY este arquivo não vem e
  // window.medir?.() não faz nada
  window.medir = (evento, props) => window.posthog.capture(evento, props);
  // Quem entra com usuário e senha é o dono do servidor: fica marcado neste aparelho para o
  // filtro de usuários internos do PostHog (operador ≠ true)
  window.medir.operador = () => window.posthog.register({ operador: true });
})();
