// O "plim" de moeda do app Vendas: sintetizado aqui (Web Audio), sem arquivo de som. Original: duas notas em quinta
// (dó e sol agudos, onda quadrada de videogame) com um brilho por cima.
// Só toca com o app aberto: o iPhone não deixa site nem app da web escolher o som da notificação, e só libera o áudio
// depois de um toque na tela (destravarSom no primeiro toque).
let ctx: AudioContext | null = null;
const CHAVE = 'agenciasetup-som-moeda';

export function somLigado() {
  try { return localStorage.getItem(CHAVE) !== 'nao'; } catch { return true; }
}
export function ligarSom(sim: boolean) {
  try { localStorage.setItem(CHAVE, sim ? 'sim' : 'nao'); } catch {}
}

export function destravarSom() {
  try {
    const C = window.AudioContext || (window as any).webkitAudioContext;
    if (!C) return;
    if (!ctx) {
      ctx = new C();
      // Um som mudo de um instante, dentro do toque: é o que destrava o áudio no Safari.
      const b = ctx.createBuffer(1, 1, 22050);
      const s = ctx.createBufferSource();
      s.buffer = b; s.connect(ctx.destination); s.start(0);
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch {}
}

export function tocarMoeda() {
  if (!ctx) destravarSom();
  if (!ctx) return false;
  const c = ctx;
  const t0 = c.currentTime + 0.02;
  const nota = (freq: number, ini: number, dur: number, ganho: number, tipo: OscillatorType) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(freq, t0 + ini);
    g.gain.setValueAtTime(0.0001, t0 + ini);
    g.gain.exponentialRampToValueAtTime(ganho, t0 + ini + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + ini + dur);
    o.connect(g).connect(c.destination);
    o.start(t0 + ini);
    o.stop(t0 + ini + dur + 0.03);
  };
  nota(1046.5, 0, 0.09, 0.14, 'square');
  nota(1568, 0.07, 0.5, 0.12, 'square');
  nota(3136, 0.07, 0.32, 0.035, 'sine');
  nota(4186, 0.1, 0.22, 0.02, 'sine');
  return true;
}
