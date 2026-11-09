// As abas da turma dentro da aula: Tutor (texto e print, cita o minuto), Comentários (com minuto, curtir, responder,
// "resolveu minha dúvida") e Notas (presas ao minuto). E o "Essa aula te ajudou?" no fim.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { I, inicial, mmss, useDados, useToast } from '../comum';
import { get, patch, post } from '../nucleo/api';

export const haQuanto = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  const d = Math.round(s / 86400);
  return d === 1 ? 'ontem' : d < 30 ? `há ${d} dias` : new Date(iso).toLocaleDateString('pt-BR');
};

export function Avatar({ nome, foto, moldura, tam }: { nome?: string; foto?: string | null; moldura?: boolean; tam?: number }) {
  const estilo: any = tam ? { ['--tam']: `${tam}px` } : undefined;
  const a = foto ? <span className="avatar" style={estilo}><img src={foto} alt="" /></span> : <span className="avatar" style={estilo}>{inicial(nome)}</span>;
  return moldura ? <span className="moldura moldura-mini">{a}</span> : a;
}

// Texto do tutor e da equipe: parágrafos, listas, **negrito** e [3:42] vira botão que leva ao minuto.
export function TextoRico({ texto, irPara }: { texto: string; irPara?: (s: number) => void }) {
  const partes = (linha: string, k: number) => linha.split(/(\[\d{1,2}:\d{2}\]|\*\*[^*]+\*\*)/g).map((x, i) => {
    const m = x.match(/^\[(\d{1,2}):(\d{2})\]$/);
    if (m && irPara) { const s = Number(m[1]) * 60 + Number(m[2]); return <button key={`${k}-${i}`} type="button" className="ir-minuto ir-minuto-txt" onClick={() => irPara(s)}><I n="tocar" />{m[1]}:{m[2]}</button>; }
    if (x.startsWith('**') && x.endsWith('**')) return <b key={`${k}-${i}`}>{x.slice(2, -2)}</b>;
    return x;
  });
  return <>{String(texto || '').split(/\n+/).filter((l) => l.trim()).map((l, k) => <p key={k}>{partes(l, k)}</p>)}</>;
}

// Reduz a imagem no aparelho antes de mandar (print de tela: até 1600 px, JPEG).
export function reduzirImagem(arquivo: File, lado = 1600, qualidade = 0.82): Promise<string> {
  return new Promise((ok, falha) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, lado / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      ok(c.toDataURL('image/jpeg', qualidade));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => falha(new Error('Não consegui abrir essa imagem.'));
    img.src = URL.createObjectURL(arquivo);
  });
}

// ---------------------------------------------------------------- tutor
export function Tutor({ aulaId, irPara }: { aulaId: string; irPara: (s: number) => void }) {
  const toast = useToast();
  const { dados, recarregar } = useDados(() => get(`/aulas/${aulaId}/tutor`), [aulaId]);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [texto, setTexto] = useState('');
  const [imagem, setImagem] = useState<string | null>(null);
  const [pensando, setPensando] = useState(false);
  const [conversa, setConversa] = useState<string | null>(null);
  const [restam, setRestam] = useState<number | null>(null);
  const arq = useRef<HTMLInputElement>(null);
  const fim = useRef<HTMLDivElement>(null);
  useEffect(() => { if (dados) { setMsgs(dados.mensagens || []); setConversa(dados.conversa ? dados.conversa.id : null); setRestam(dados.restam_hoje); } }, [dados]);
  useEffect(() => { fim.current && msgs.length && fim.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [msgs.length, pensando]);

  if (!dados) return <p className="mudo">Carregando o tutor...</p>;
  if (!dados.ligado) return <DuvidaEquipe aulaId={aulaId} />;

  async function mandar(e: any) {
    e.preventDefault();
    if (pensando || (!texto.trim() && !imagem)) return;
    const pergunta = texto.trim();
    setMsgs((m) => [...m, { id: `tmp-${Date.now()}`, papel: 'aluno', texto: pergunta || '(print)', com_imagem: !!imagem, previa: imagem }]);
    setTexto(''); setPensando(true);
    try {
      const r = await post(`/aulas/${aulaId}/tutor`, { pergunta, imagem, conversa_id: conversa });
      setConversa(r.conversa_id);
      setMsgs((m) => [...m.slice(0, -1), { ...r.pergunta, previa: imagem }, r.resposta]);
      setImagem(null);
      setRestam((n) => (n === null ? n : Math.max(0, n - 1)));
    } catch (er: any) {
      toast(er.message);
      setMsgs((m) => m.slice(0, -1));
      setTexto(pergunta);
    } finally { setPensando(false); }
  }
  async function anexar(f?: File) {
    if (!f) return;
    try { setImagem(await reduzirImagem(f)); } catch (e: any) { toast(e.message); }
  }
  async function util(m: any, v: boolean) {
    setMsgs((l) => l.map((x) => (x.id === m.id ? { ...x, util: v } : x)));
    try { await post(`/tutor/${m.id}/avaliar`, { util: v }); } catch {}
  }
  async function equipe() {
    if (!conversa) return;
    try { await post(`/tutor/conversas/${conversa}/equipe`); toast('Enviado. A equipe responde aqui e no seu e-mail.'); recarregar(); } catch (e: any) { toast(e.message); }
  }

  return (
    <>
      <div className="chat">
        {!msgs.length ? (
          <div className="msg tutor"><span className="quem"><I n="brilho" />Tutor</span><p>Oi! Eu conheço esta aula palavra por palavra. Pergunte o que travou, ou mande o print da sua tela.</p></div>
        ) : msgs.map((m) => (
          m.papel === 'aluno' ? (
            <div key={m.id} className="msg aluno">{m.previa ? <span className="print"><img src={m.previa} alt="Seu print" /></span> : m.com_imagem ? <small className="fraco">com print</small> : null}<p>{m.texto}</p></div>
          ) : (
            <div key={m.id} className={`msg tutor${m.papel === 'equipe' ? ' equipe' : ''}`}>
              <span className="quem"><I n={m.papel === 'equipe' ? 'escudo' : 'brilho'} />{m.papel === 'equipe' ? 'Resposta da equipe' : m.pronta ? 'Tutor · resposta da equipe' : 'Tutor'}</span>
              <TextoRico texto={m.texto} irPara={irPara} />
              {m.papel === 'tutor' ? (
                <span className="util">
                  <button type="button" aria-label="Ajudou" aria-pressed={m.util === true} onClick={() => util(m, true)}><I n="polegar" /></button>
                  <button type="button" aria-label="Não ajudou" aria-pressed={m.util === false} onClick={() => util(m, false)}><I n="polegar" style={{ transform: 'scaleY(-1)' }} /></button>
                </span>
              ) : null}
            </div>
          )
        ))}
        {pensando ? <div className="msg tutor"><span className="quem"><I n="brilho" />Tutor</span><p className="mudo"><span className="giro" /> Lendo a aula...</p></div> : null}
        <div ref={fim} />
      </div>
      {imagem ? <div className="anexo"><img src={imagem} alt="Print anexado" /><button type="button" className="bt bt-p" onClick={() => setImagem(null)}><I n="fechar" />Tirar o print</button></div> : null}
      <form className="enviar" onSubmit={mandar}>
        <button className="bt-icone" type="button" aria-label="Anexar print" onClick={() => arq.current && arq.current.click()}><I n="clipe" /></button>
        <input ref={arq} type="file" accept="image/*" hidden onChange={(e) => anexar(e.target.files ? e.target.files[0] : undefined)} />
        <label htmlFor="pergunta" className="sr">Sua pergunta</label>
        <input id="pergunta" placeholder="Pergunte sobre esta aula" autoComplete="off" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={1500} />
        <button className="mandar" type="submit" aria-label="Enviar" disabled={pensando}><I n="enviar" /></button>
      </form>
      <p className="limite">{restam !== null ? `${restam} ${restam === 1 ? 'pergunta' : 'perguntas'} hoje · ` : ''}o tutor responde só sobre o curso{conversa && dados.conversa?.status !== 'enviada' ? <> · <button type="button" className="link-simples" onClick={equipe}>Não resolveu? Enviar para a equipe</button></> : dados.conversa?.status === 'enviada' ? ' · enviado para a equipe' : ''}</p>
    </>
  );
}

function DuvidaEquipe({ aulaId }: { aulaId: string }) {
  const toast = useToast();
  const [texto, setTexto] = useState('');
  const [foi, setFoi] = useState(false);
  async function mandar(e: any) {
    e.preventDefault();
    try { await post(`/aulas/${aulaId}/duvida`, { pergunta: texto }); setFoi(true); setTexto(''); } catch (er: any) { toast(er.message); }
  }
  if (foi) return <div className="cartao"><h3>Dúvida enviada</h3><p>A equipe responde aqui e no seu e-mail. Enquanto isso, veja se alguém já perguntou nos comentários da aula.</p></div>;
  return (
    <form className="cartao" onSubmit={mandar}>
      <h3>Mande a sua dúvida para a equipe</h3>
      <p>O tutor de IA ainda não está ligado. A equipe responde por aqui e no seu e-mail.</p>
      <div className="campo"><label htmlFor="duv">Sua dúvida</label><textarea id="duv" rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={1500} /></div>
      <button className="bt bt-marca bt-p" disabled={texto.trim().length < 5} style={{ justifySelf: 'start' }}><I n="enviar" />Enviar</button>
    </form>
  );
}

// ---------------------------------------------------------------- comentários
export function Comentarios({ aulaId, t, irPara, aoContar }: { aulaId: string; t: number; irPara: (s: number) => void; aoContar?: (n: number) => void }) {
  const toast = useToast();
  const { dados, recarregar } = useDados(() => get(`/aulas/${aulaId}/comentarios`), [aulaId]);
  const [texto, setTexto] = useState('');
  const [comMinuto, setComMinuto] = useState(true);
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [resposta, setResposta] = useState('');
  const [itens, setItens] = useState<any[]>([]);
  useEffect(() => { if (dados) { setItens(dados.itens); aoContar && aoContar(dados.total); } }, [dados]);
  const minuto = Math.floor(t);

  async function comentar(e: any, pai?: string) {
    e.preventDefault();
    const txt = (pai ? resposta : texto).trim();
    if (txt.length < 2) return;
    try {
      const r = await post(`/aulas/${aulaId}/comentarios`, { texto: txt, minuto_s: !pai && comMinuto && minuto > 0 ? minuto : null, pai_id: pai || null });
      if (r.aviso) toast(r.aviso); else toast('Comentário publicado');
      pai ? (setResposta(''), setRespondendo(null)) : setTexto('');
      recarregar();
    } catch (er: any) { toast(er.message); }
  }
  async function reagir(c: any, tipo: 'curtida' | 'resolveu') {
    const ligar = tipo === 'curtida' ? !c.eu_curti : !c.resolveu_pra_mim;
    const muda = (x: any) => (x.id === c.id ? { ...x, eu_curti: tipo === 'curtida' ? ligar : x.eu_curti, curtidas: tipo === 'curtida' ? x.curtidas + (ligar ? 1 : -1) : x.curtidas, resolveu_pra_mim: tipo === 'resolveu' ? ligar : x.resolveu_pra_mim, resolvido: tipo === 'resolveu' && ligar ? true : x.resolvido } : x);
    setItens((l) => l.map((x) => ({ ...muda(x), respostas: (x.respostas || []).map(muda) })));
    try { await post(`/comentarios/${c.id}/reagir`, { tipo, ligar }); } catch (er: any) { toast(er.message); recarregar(); }
  }
  async function apagar(c: any) {
    try { await post(`/comentarios/${c.id}/apagar`); recarregar(); } catch (er: any) { toast(er.message); }
  }

  const um = (c: any, filho = false): ReactNode => (
    <div key={c.id} className={`coment${c.oficial ? ' oficial' : ''}${filho ? ' filho' : ''}`}>
      <Avatar nome={c.autor.nome} foto={c.autor.foto_url} moldura={c.autor.moldura} tam={filho ? 28 : 34} />
      <div>
        <div className="cab">
          <b>{c.autor.nome}</b>
          {c.oficial ? <span className="etiqueta" style={{ ['--c' as any]: '#ff7a00', height: 20 }}><I n="escudo" />Equipe</span> : null}
          {c.minuto_s !== null && c.minuto_s !== undefined ? <button type="button" className="tempo-chip" onClick={() => irPara(c.minuto_s)}>{mmss(c.minuto_s)}</button> : null}
          <small>{haQuanto(c.criado_em)}</small>
          {c.fixado ? <small className="marca-texto">fixado</small> : null}
          {c.pendente ? <small>· esperando aprovação</small> : null}
        </div>
        <p>{c.texto}</p>
        <div className="acoes-c">
          {!c.meu ? <button type="button" aria-pressed={c.eu_curti} onClick={() => reagir(c, 'curtida')}><I n="coracao" />{c.curtidas || ''}</button> : <span><I n="coracao" />{c.curtidas || ''}</span>}
          {!filho ? <button type="button" onClick={() => { setRespondendo(respondendo === c.id ? null : c.id); setResposta(''); }}><I n="chat" />Responder</button> : null}
          {!c.meu && (filho || c.oficial) ? <button type="button" aria-pressed={c.resolveu_pra_mim} onClick={() => reagir(c, 'resolveu')}><I n="ok" />{c.resolvido ? 'Resolveu' : 'Resolveu minha dúvida'}</button> : c.resolvido ? <span><I n="ok" />Resolveu</span> : null}
          {c.meu ? <button type="button" onClick={() => apagar(c)}><I n="lixo" />Apagar</button> : null}
        </div>
        {(c.respostas || []).length ? <div className="respostas">{c.respostas.map((r: any) => um(r, true))}</div> : null}
        {respondendo === c.id ? (
          <form className="enviar" style={{ marginTop: 8 }} onSubmit={(e) => comentar(e, c.id)}>
            <label htmlFor={`r-${c.id}`} className="sr">Responder</label>
            <input id={`r-${c.id}`} autoFocus placeholder={`Responder a ${c.autor.nome.split(' ')[0]}`} value={resposta} onChange={(e) => setResposta(e.target.value)} maxLength={2000} />
            <button className="mandar" type="submit" aria-label="Enviar"><I n="enviar" /></button>
          </form>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      <form className="enviar" onSubmit={(e) => comentar(e)}>
        <label htmlFor="coment-in" className="sr">Comentar</label>
        <input id="coment-in" placeholder={comMinuto && minuto > 0 ? `Comentar no minuto ${mmss(minuto)}` : 'Escreva um comentário'} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000} />
        {minuto > 0 ? <button type="button" className={`tempo-chip${comMinuto ? '' : ' desligado'}`} onClick={() => setComMinuto(!comMinuto)} aria-pressed={comMinuto} title="Prender ao minuto">{mmss(minuto)}</button> : null}
        <button className="mandar" type="submit" aria-label="Enviar"><I n="enviar" /></button>
      </form>
      {!dados ? <p className="mudo">Carregando os comentários...</p> : itens.length ? itens.map((c) => um(c)) : <p className="mudo">Ninguém comentou ainda. Conte o que você fez com esta aula ou pergunte: a turma e a equipe respondem.</p>}
    </>
  );
}

// ---------------------------------------------------------------- notas (anotações presas ao minuto)
export function Notas({ aulaId, t, irPara }: { aulaId: string; t: number; irPara: (s: number) => void }) {
  const toast = useToast();
  const { dados, recarregar } = useDados(() => get(`/aulas/${aulaId}/anotacoes`), [aulaId]);
  const [nova, setNova] = useState<{ minuto: number; texto: string } | null>(null);
  const [editando, setEditando] = useState<any>(null);
  async function salvar(e: any) {
    e.preventDefault();
    try {
      if (editando) await patch(`/anotacoes/${editando.id}`, { texto: editando.texto });
      else if (nova) await post(`/aulas/${aulaId}/anotacoes`, { minuto_s: nova.minuto, texto: nova.texto });
      setNova(null); setEditando(null); recarregar(); toast('Nota salva');
    } catch (er: any) { toast(er.message); }
  }
  async function apagar(n: any) {
    try { await post(`/anotacoes/${n.id}/apagar`); recarregar(); } catch (er: any) { toast(er.message); }
  }
  return (
    <>
      {(dados || []).map((n: any) => (
        editando && editando.id === n.id ? (
          <form key={n.id} className="nota-item" onSubmit={salvar}>
            <span className="tempo-chip">{mmss(n.minuto_s)}</span>
            <div style={{ display: 'grid', gap: 8 }}>
              <textarea rows={3} value={editando.texto} onChange={(e) => setEditando({ ...editando, texto: e.target.value })} maxLength={2000} autoFocus />
              <span className="acoes"><button className="bt bt-marca bt-p">Salvar</button><button type="button" className="bt bt-p" onClick={() => setEditando(null)}>Cancelar</button></span>
            </div>
          </form>
        ) : (
          <div key={n.id} className="nota-item">
            <button type="button" className="tempo-chip" onClick={() => irPara(n.minuto_s)}>{mmss(n.minuto_s)}</button>
            <div style={{ display: 'grid', gap: 6 }}>
              <span style={{ whiteSpace: 'pre-wrap' }}>{n.texto}</span>
              <span className="acoes-c"><button type="button" onClick={() => setEditando({ ...n })}><I n="nota" />Editar</button><button type="button" onClick={() => apagar(n)}><I n="lixo" />Apagar</button></span>
            </div>
          </div>
        )
      ))}
      {dados && !dados.length && !nova ? <p className="mudo">Anote o que importa. Cada nota fica presa ao minuto do vídeo e leva você de volta ao ponto exato.</p> : null}
      {nova ? (
        <form className="nota-item" onSubmit={salvar}>
          <span className="tempo-chip">{mmss(nova.minuto)}</span>
          <div style={{ display: 'grid', gap: 8 }}>
            <textarea rows={3} value={nova.texto} onChange={(e) => setNova({ ...nova, texto: e.target.value })} maxLength={2000} autoFocus placeholder="Sua nota" />
            <span className="acoes"><button className="bt bt-marca bt-p" disabled={!nova.texto.trim()}>Salvar</button><button type="button" className="bt bt-p" onClick={() => setNova(null)}>Cancelar</button></span>
          </div>
        </form>
      ) : (
        <button className="bt bt-p" style={{ justifySelf: 'start' }} onClick={() => setNova({ minuto: Math.floor(t), texto: '' })}><I n="mais" />Anotar neste minuto ({mmss(Math.floor(t))})</button>
      )}
    </>
  );
}

// ---------------------------------------------------------------- "Essa aula te ajudou?"
export function Ajudou({ aulaId, inicial: ini }: { aulaId: string; inicial: boolean | null }) {
  const toast = useToast();
  const [v, setV] = useState<boolean | null>(ini);
  const [motivo, setMotivo] = useState('');
  const [pedirMotivo, setPedirMotivo] = useState(false);
  async function votar(util: boolean, m?: string) {
    setV(util);
    try { await post(`/aulas/${aulaId}/avaliar`, { util, motivo: m || null }); toast(util ? 'Obrigado! Isso ajuda a melhorar a aula.' : 'Obrigado por contar.'); } catch (e: any) { toast(e.message); }
  }
  return (
    <div className="ajudou-bloco">
      <span>{v === null ? 'Essa aula te ajudou?' : v ? 'Que bom que ajudou.' : 'Vamos melhorar esta aula.'}</span>
      <span className="acoes">
        <button className="bt bt-p" aria-pressed={v === true} onClick={() => { setPedirMotivo(false); votar(true); }}><I n="polegar" />Sim</button>
        <button className="bt bt-p" aria-pressed={v === false} onClick={() => setPedirMotivo(true)}><I n="polegar" style={{ transform: 'scaleY(-1)' }} />Não</button>
      </span>
      {pedirMotivo ? (
        <form className="enviar" style={{ gridColumn: '1 / -1' }} onSubmit={(e) => { e.preventDefault(); votar(false, motivo); setPedirMotivo(false); }}>
          <label htmlFor="motivo" className="sr">O que faltou?</label>
          <input id="motivo" autoFocus placeholder="O que faltou? (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} />
          <button className="mandar" type="submit" aria-label="Enviar"><I n="enviar" /></button>
        </form>
      ) : null}
    </div>
  );
}
