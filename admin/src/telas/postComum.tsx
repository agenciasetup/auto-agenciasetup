// Pedaços do post que o Novo post e a peça usam: a prévia no Instagram, as opções do Instagram e o preparo das
// imagens (o Instagram só aceita JPEG pela API: PNG e WebP viram JPEG aqui mesmo, antes de subir).
import { useState } from 'react';
import { Bookmark, ChevronLeft, ChevronRight, Heart, MessageCircle, Send } from 'lucide-react';
import { AreaTexto, Campo, Escolha, Marcar } from '../nucleo/ui';

// ---------------------------------------------------------------- imagens
export async function paraJpeg(arquivo: File): Promise<File> {
  if (!arquivo.type.startsWith('image/') || /jpe?g$/i.test(arquivo.type)) return arquivo;
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = falha; i.src = url; });
    const escala = Math.min(1, 2160 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * escala);
    c.height = Math.round(img.naturalHeight * escala);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const blob: Blob = await new Promise((ok) => c.toBlob((b) => ok(b!), 'image/jpeg', 0.92));
    return new File([blob], arquivo.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Proporção da mídia (largura / altura), para avisar o que o Instagram corta.
export function medir(url: string, video: boolean): Promise<number | null> {
  return new Promise((ok) => {
    if (video) {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => ok(v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : null);
      v.onerror = () => ok(null);
      v.src = url;
    } else {
      const i = new Image();
      i.onload = () => ok(i.naturalWidth / i.naturalHeight);
      i.onerror = () => ok(null);
      i.src = url;
    }
  });
}

// O que o Instagram aceita de proporção em cada formato (largura / altura).
export function avisoProporcao(formato: string, r?: number | null) {
  if (!r) return null;
  if (formato === 'reels' || formato === 'story') return r > 0.6 ? 'Reels e story ficam melhores em 9:16 (em pé). Essa mídia vai aparecer com faixas ou cortada.' : null;
  if (r < 0.79) return 'Mais alta que 4:5: o Instagram corta em cima e embaixo no feed.';
  if (r > 1.92) return 'Mais larga que 1,91:1: o Instagram corta nas laterais.';
  return null;
}

// ---------------------------------------------------------------- opções do Instagram
export const TESTES = [{ v: '', t: 'Não (vai para todos)' }, { v: 'MANUAL', t: 'Sim, e eu decido depois se vai para todos' }, { v: 'SS_PERFORMANCE', t: 'Sim, e vai para todos se for bem' }];

export function OpcoesInstagram({ op, mudar, formato, desativado }: { op: any; mudar: (o: any) => void; formato: string; desativado?: boolean }) {
  const set = (k: string, v: any) => mudar({ ...op, [k]: v });
  const colab = Array.isArray(op.colaboradores) ? op.colaboradores.join(' ') : op.colaboradores || '';
  return <>
    {formato !== 'story' && <>
      <Campo rotulo="Colaboradores (até 3)" valor={colab} mudar={(v) => set('colaboradores', v)} placeholder="@filipealourenco @outraconta" desativado={desativado}
        dica="O post aparece também no perfil de quem aceitar o convite de colaboração. Separe com espaço." />
      <AreaTexto rotulo="Primeiro comentário" valor={op.primeiro_comentario || ''} mudar={(v) => set('primeiro_comentario', v)} linhas={2} desativado={desativado}
        placeholder="Comenta PROMPT que eu te mando no direct 🦎" dica="Sai do perfil logo depois de publicar. Bom para hashtags ou para repetir a chamada." />
      <Campo rotulo="Localização (id do local, opcional)" valor={op.local_id || ''} mudar={(v) => set('local_id', v.replace(/\D/g, ''))} desativado={desativado} mono
        dica="O número da página do local no Facebook (aparece no endereço da página). Vazio: sem localização." />
    </>}
    {formato === 'reels' && <>
      <div className="linha-campos">
        <Campo rotulo="Capa: segundo do vídeo" tipo="number" min={0} valor={op.capa_ms != null && op.capa_ms !== '' ? String(Number(op.capa_ms) / 1000) : ''} mudar={(v) => set('capa_ms', v === '' ? null : Math.round(Number(v) * 1000))} desativado={desativado} dica="Ou mande uma imagem de capa abaixo." />
        <Campo rotulo="Nome do áudio" valor={op.audio_nome || ''} mudar={(v) => set('audio_nome', v)} placeholder="Áudio original" desativado={desativado} />
      </div>
      <Campo rotulo="Imagem de capa (endereço, opcional)" valor={op.capa_url || ''} mudar={(v) => set('capa_url', v)} mono desativado={desativado} />
      <Marcar rotulo="Mostrar também no feed" valor={op.no_feed !== false} mudar={(v) => set('no_feed', v)} desativado={desativado} />
      <Escolha rotulo="Reels de teste (só para quem não segue)" valor={op.teste || ''} mudar={(v) => set('teste', v || null)} opcoes={TESTES} desativado={desativado}
        dica="O Instagram mostra primeiro para quem não segue o perfil. Bom para testar gancho sem cansar quem já segue." />
    </>}
  </>;
}

// ---------------------------------------------------------------- prévia
// Como o post aparece no feed do Instagram (aproximado): topo com a conta, a mídia (com as bolinhas do carrossel),
// os ícones e a legenda cortada em 2 linhas.
export function PreviaInstagram({ conta, foto, midias, legenda, formato }: { conta?: string; foto?: string | null; midias: { url: string; tipo: string }[]; legenda: string; formato: string }) {
  const [i, setI] = useState(0);
  const atual = midias[Math.min(i, midias.length - 1)];
  const nome = String(conta || 'agenciasetup').replace(/^@/, '');
  const emPe = formato === 'reels' || formato === 'story';
  return (
    <div className={`previa-ig${emPe ? ' em-pe' : ''}`} aria-label="Prévia no Instagram">
      {!emPe && <div className="previa-ig-topo">{foto ? <img src={foto} alt="" referrerPolicy="no-referrer" /> : <span className="previa-ig-avatar" />}<b>{nome}</b></div>}
      <div className="previa-ig-midia">
        {atual ? (atual.tipo === 'video' ? <video src={atual.url} muted autoPlay loop playsInline /> : <img src={atual.url} alt="" />) : <span className="previa-ig-vazia">A mídia aparece aqui</span>}
        {midias.length > 1 && <>
          {i > 0 && <button className="previa-ig-seta esq" onClick={() => setI(i - 1)} aria-label="Anterior"><ChevronLeft /></button>}
          {i < midias.length - 1 && <button className="previa-ig-seta dir" onClick={() => setI(i + 1)} aria-label="Próxima"><ChevronRight /></button>}
          <span className="previa-ig-n">{i + 1}/{midias.length}</span>
        </>}
        {emPe && <div className="previa-ig-sobre"><b>{nome}</b>{legenda && <p>{legenda.split('\n')[0].slice(0, 90)}</p>}</div>}
      </div>
      {!emPe && <>
        <div className="previa-ig-icones"><Heart /><MessageCircle /><Send /><span style={{ flex: 1 }} />
          {midias.length > 1 && <span className="previa-ig-pontos">{midias.map((_, j) => <i key={j} className={j === i ? 'on' : ''} />)}</span>}
          <span style={{ flex: 1 }} /><Bookmark /></div>
        <p className="previa-ig-legenda"><b>{nome}</b> {legenda ? legenda : <span className="mudo">A legenda aparece aqui.</span>}</p>
      </>}
    </div>
  );
}
