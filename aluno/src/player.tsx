// O player: Bunny Stream ou Panda Video (produção) ou um arquivo de vídeo (só no computador, para testar). Por cima, a nossa
// camada: pular abertura, "próxima aula" no fim, o tempo para os marcadores e o progresso real (só conta o que tocou de verdade).
// API do Panda conferida na documentação em 10/2026: api.v2.js, PandaPlayer, eventos panda_timeupdate e panda_ended, setCurrentTime.
// Bunny (player.js, documentação de 10/2026): playerjs-latest.min.js, new playerjs.Player(iframe), eventos ready, timeupdate
// ({ seconds, duration }) e ended; métodos play, pause e setCurrentTime.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { I } from './comum';

export type PlayerControle = { ir: (s: number) => void; pausar: () => void };
type Props = {
  video: any; capa?: string; inicio: number; aberturaFim?: number | null; finalInicio?: number | null;
  aoTempo: (t: number) => void; aoTerminar: () => void; aoProxima?: () => void; temProxima: boolean;
  // Pausa prática: no segundo s o vídeo pausa e mostra o que fazer, com "Fiz, continuar".
  pausas?: { s: number; texto: string; passo?: number }[]; aoVerPasso?: (passo?: number) => void;
};

const scripts: Record<string, Promise<void>> = {};
function carregar(src: string, pronto: () => boolean) {
  if (pronto()) return Promise.resolve();
  if (!scripts[src]) scripts[src] = new Promise((ok, falha) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => ok();
    s.onerror = () => { delete scripts[src]; falha(new Error('Não consegui carregar o player.')); };
    document.head.appendChild(s);
  });
  return scripts[src];
}
const carregarPanda = () => carregar('https://player.pandavideo.com.br/api.v2.js', () => !!(window as any).PandaPlayer);
const carregarBunny = () => carregar('https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js', () => !!(window as any).playerjs);

export const Player = forwardRef<PlayerControle, Props>(function Player({ video, capa, inicio, aberturaFim, finalInicio, aoTempo, aoTerminar, aoProxima, temProxima, pausas = [], aoVerPasso }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Panda ou Bunny: os dois têm setCurrentTime, play e pause.
  const externoRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [t, setT] = useState(inicio || 0);
  const [fim, setFim] = useState(false);
  const [contagem, setContagem] = useState(0);
  const [pausa, setPausa] = useState<any>(null);
  const pausasFeitas = useRef(new Set<number>());

  const irPara = (s: number) => {
    if (videoRef.current) { videoRef.current.currentTime = s; videoRef.current.play().catch(() => {}); }
    else if (externoRef.current) { externoRef.current.setCurrentTime(s); externoRef.current.play && externoRef.current.play(); }
    setT(s);
  };
  const pausar = () => { if (videoRef.current) videoRef.current.pause(); else if (externoRef.current && externoRef.current.pause) externoRef.current.pause(); };
  const tocar = () => { if (videoRef.current) videoRef.current.play().catch(() => {}); else if (externoRef.current && externoRef.current.play) externoRef.current.play(); };
  useImperativeHandle(ref, () => ({ ir: irPara, pausar }), []);

  const tempo = (s: number) => {
    setT(s); aoTempo(s);
    const p = (pausas || []).find((x) => s >= x.s && s < x.s + 1.5 && !pausasFeitas.current.has(x.s));
    if (p) { pausasFeitas.current.add(p.s); pausar(); setPausa(p); }
  };
  const continuar = () => { setPausa(null); tocar(); };

  // Panda: o iframe com o id "panda-<video>" e a API por cima.
  useEffect(() => {
    if (video.tipo !== 'panda') return;
    let vivo = true;
    carregarPanda().then(() => {
      if (!vivo) return;
      const P = (window as any).PandaPlayer;
      const p = new P(`panda-${video.id}`, {
        onReady() {
          if (inicio > 5) p.setCurrentTime(inicio);
          p.onEvent((e: any) => {
            if (e.message === 'panda_timeupdate') tempo(e.currentTime);
            if (e.message === 'panda_ended') { setFim(true); aoTerminar(); }
          });
        },
      });
      externoRef.current = p;
    }).catch(() => {});
    return () => { vivo = false; try { externoRef.current && externoRef.current.destroy && externoRef.current.destroy(); } catch {} externoRef.current = null; };
  }, [video.tipo, video.id]);

  // Bunny: player.js por cima do iframe (o link já vem assinado pelo servidor).
  useEffect(() => {
    if (video.tipo !== 'bunny') return;
    let vivo = true;
    carregarBunny().then(() => {
      if (!vivo || !iframeRef.current) return;
      const p = new (window as any).playerjs.Player(iframeRef.current);
      p.on('ready', () => {
        if (!vivo) return;
        externoRef.current = p;
        if (inicio > 5) p.setCurrentTime(inicio);
        p.on('timeupdate', (d: any) => { if (d && typeof d.seconds === 'number') tempo(d.seconds); });
        p.on('play', () => { setFim(false); setContagem(0); });
        p.on('ended', () => { setFim(true); aoTerminar(); });
      });
    }).catch(() => {});
    return () => { vivo = false; externoRef.current = null; };
  }, [video.tipo, video.id]);

  // "Próxima aula em 5": contagem quando o vídeo termina (dá para cancelar).
  useEffect(() => {
    if (!fim || !temProxima) return;
    setContagem(5);
    const iv = setInterval(() => setContagem((c) => { if (c <= 1) { clearInterval(iv); aoProxima && aoProxima(); return 0; } return c - 1; }), 1000);
    return () => clearInterval(iv);
  }, [fim]);

  const pularAbertura = aberturaFim && t < aberturaFim && t > 0.5;
  const noFinal = finalInicio && t >= finalInicio && temProxima && !fim;

  return (
    <div className="player">
      {/* referrerPolicy "origin": o site manda referrer só para ele mesmo (same-origin), e o Bunny e o Panda só tocam
          para o domínio liberado. O player recebe o endereço do site, sem o caminho da aula. */}
      {video.tipo === 'bunny' ? (
        <iframe ref={iframeRef} src={video.url} referrerPolicy="origin" style={{ border: 'none', position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;fullscreen" allowFullScreen title="Vídeo da aula" />
      ) : video.tipo === 'panda' ? (
        <iframe id={`panda-${video.id}`} src={`https://player-${video.biblioteca}.tv.pandavideo.com.br/embed/?v=${video.id}${inicio > 5 ? `&startTime=${Math.floor(inicio)}` : ''}`} referrerPolicy="origin"
          style={{ border: 'none', position: 'absolute', inset: 0, width: '100%', height: '100%' }} allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;fullscreen" allowFullScreen title="Vídeo da aula" />
      ) : video.tipo === 'arquivo' ? (
        <video ref={videoRef} src={video.url} poster={capa} controls playsInline preload="metadata" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#000' }}
          onLoadedMetadata={(e) => { if (inicio > 5) e.currentTarget.currentTime = inicio; }}
          onTimeUpdate={(e) => tempo(e.currentTarget.currentTime)}
          onPlay={() => { setFim(false); setContagem(0); }}
          onEnded={() => { setFim(true); aoTerminar(); }} />
      ) : (
        <>
          {capa ? <img src={capa} alt="" /> : null}
          <div className="pausa"><div className="box"><span className="etiqueta"><I n="relogio" />Em preparação</span><h4>O vídeo desta aula está sendo enviado</h4><p>Enquanto isso, o "Faça agora" e os materiais já estão liberados.</p></div></div>
        </>
      )}
      {pausa ? (
        <div className="pausa">
          <div className="box">
            <span className="etiqueta"><I n="listas" />Pausa prática</span>
            <h4>{pausa.texto}</h4>
            <p>Faça agora no seu Claude. O vídeo espera você.</p>
            <div className="acoes"><button className="bt bt-marca bt-p" onClick={continuar}><I n="ok" />Fiz, continuar</button>{aoVerPasso ? <button className="bt bt-p" onClick={() => aoVerPasso(pausa.passo)}>Ver o passo</button> : null}</div>
          </div>
        </div>
      ) : null}
      {pularAbertura ? <button className="pular" onClick={() => irPara(aberturaFim as number)} style={{ bottom: 64 }}><span>Pular abertura</span><I n="pular" /></button> : null}
      {noFinal ? <button className="pular" onClick={aoProxima} style={{ bottom: 64 }}><span>Próxima aula</span><I n="pular" /></button> : null}
      {fim && temProxima && contagem > 0 ? (
        <div className="pausa">
          <div className="box">
            <span className="etiqueta"><I n="ok" />Aula concluída</span>
            <h4>Próxima aula em {contagem}...</h4>
            <div className="acoes"><button className="bt bt-marca bt-p" onClick={aoProxima}><I n="tocar" />Ir agora</button><button className="bt bt-p" onClick={() => { setContagem(0); setFim(false); }}>Ficar aqui</button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
});
