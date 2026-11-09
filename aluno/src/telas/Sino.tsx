// O sino (notificações dentro do app) e as boas-vindas em 3 passos no primeiro acesso.
import { useEffect, useRef, useState } from 'react';
import { I, useToast } from '../comum';
import { get, patch, post } from '../nucleo/api';
import { useRota } from '../nucleo/rota';
import { haQuanto, reduzirImagem } from './AulaAbas';

export function Sino({ naoLidas, aoLer }: { naoLidas: number; aoLer: () => void }) {
  const { ir } = useRota();
  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState<any[] | null>(null);
  async function abrir() {
    setAberto(true);
    try { const r = await get('/notificacoes'); setItens(r.itens); if (r.nao_lidas) { await post('/notificacoes/lidas'); aoLer(); } } catch { setItens([]); }
  }
  function seguir(n: any) {
    setAberto(false);
    if (!n.link) return;
    if (/^\/(certificado|@)/.test(n.link) || /^https?:/.test(n.link)) location.href = n.link;
    else ir(n.link);
  }
  // Lista suspensa presa ao sino: fecha ao clicar fora ou com Esc.
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', tecla); };
  }, [aberto]);
  return (
    <div className="sino-envolta" ref={caixa}>
      <button className={`sino-bt${aberto ? ' ativo' : ''}`} type="button" aria-haspopup="true" aria-expanded={aberto} aria-label={naoLidas ? `Notificações, ${naoLidas} novas` : 'Notificações'} onClick={() => (aberto ? setAberto(false) : abrir())}><I n="sino" />{naoLidas ? <b /> : null}</button>
      {aberto ? (
        <div className="sino-lista" role="dialog" aria-label="Notificações">
          <div className="sino-cab"><h3>Notificações</h3></div>
          {itens === null ? <p className="mudo sino-vazio"><span className="giro" /> Carregando...</p> : itens.length ? (
            <div className="sino-itens">
              {itens.map((n) => (
                <button key={n.id} type="button" className={`notif${n.lida_em ? '' : ' nova'}`} onClick={() => seguir(n)}>
                  <span className="ic"><I n={ICONE[n.tipo] || 'sino'} /></span>
                  <span><b>{n.titulo}</b>{n.texto ? <small>{n.texto}</small> : null}<small className="fraco">{haQuanto(n.criado_em)}</small></span>
                </button>
              ))}
            </div>
          ) : <p className="mudo sino-vazio">Nada novo por aqui. Selos, respostas da equipe, certificado e eventos aparecem aqui.</p>}
        </div>
      ) : null}
    </div>
  );
}
const ICONE: Record<string, string> = { selo: 'medalha', certificado: 'escudo', resposta: 'chat', modulo: 'ok', evento: 'calendario', entrega: 'imagem', aviso: 'sino' };

// Primeiro acesso: foto e @ (pode pular), o objetivo (vira a trilha sugerida) e quantas aulas por semana (vira lembrete).
export function BoasVindas({ eu, aoFim }: { eu: any; aoFim: (e: any) => void }) {
  const toast = useToast();
  const [passo, setPasso] = useState(1);
  const [f, setF] = useState<any>({ instagram: eu.instagram || '', objetivo: eu.objetivo || '', aulas_semana: eu.aulas_semana || 3 });
  const [foto, setFoto] = useState<string | null>(null);
  const arq = useRef<HTMLInputElement>(null);
  const objetivos: Record<string, string> = eu.objetivos || {};
  async function terminar() {
    try {
      if (foto) await post('/eu/foto', { imagem: foto }).catch(() => {});
      const r = await patch('/eu', { ...f, objetivo: f.objetivo || null, boas_vindas: true });
      aoFim({ ...eu, ...r, foto_url: r.foto_url || eu.foto_url });
    } catch (e: any) { toast(e.message); }
  }
  return (
    <div className="busca-folha" role="dialog" aria-modal="true" aria-label="Boas-vindas">
      <div className="busca-caixa boas-vindas">
        <span className="fraco" style={{ fontSize: 12.5 }}>Passo {passo} de 3</span>
        {passo === 1 ? (
          <>
            <h2>Bem-vindo, {String(eu.nome || '').split(' ')[0]}!</h2>
            <p className="mudo">Uma foto e o seu @ deixam a turma reconhecer você. Pode pular.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="avatar" style={{ ['--tam' as any]: '64px' }}>{foto || eu.foto_url ? <img src={foto || eu.foto_url} alt="" /> : String(eu.nome || '?')[0]}</span>
              <button className="bt bt-p" onClick={() => arq.current && arq.current.click()}><I n="imagem" />Escolher foto</button>
              <input ref={arq} type="file" accept="image/*" hidden onChange={async (e) => { const a = e.target.files && e.target.files[0]; if (a) try { setFoto(await reduzirImagem(a, 400, 0.86)); } catch (er: any) { toast(er.message); } }} />
            </div>
            <div className="campo"><label htmlFor="bv-ig">Seu @ do Instagram</label><input id="bv-ig" value={f.instagram} onChange={(e) => setF({ ...f, instagram: e.target.value })} placeholder="@seuperfil" /></div>
          </>
        ) : passo === 2 ? (
          <>
            <h2>O que você quer com o curso?</h2>
            <div className="escolhas">
              {Object.entries(objetivos).map(([k, t]) => <button key={k} type="button" aria-pressed={f.objetivo === k} onClick={() => setF({ ...f, objetivo: k })}>{t}</button>)}
            </div>
          </>
        ) : (
          <>
            <h2>Quantas aulas por semana?</h2>
            <p className="mudo">As aulas têm de 5 a 7 minutos. A gente lembra você no ritmo que escolher.</p>
            <div className="escolhas linha">
              {[1, 3, 5, 7].map((n) => <button key={n} type="button" aria-pressed={f.aulas_semana === n} onClick={() => setF({ ...f, aulas_semana: n })}><b>{n}</b><small>{n === 1 ? 'aula' : 'aulas'}</small></button>)}
            </div>
          </>
        )}
        <div className="acoes" style={{ justifyContent: 'space-between' }}>
          {passo > 1 ? <button className="bt bt-p" onClick={() => setPasso(passo - 1)}>Voltar</button> : <button className="bt bt-p" onClick={terminar}>Pular tudo</button>}
          {passo < 3 ? <button className="bt bt-marca bt-p" onClick={() => setPasso(passo + 1)}>Continuar<I n="direita" /></button> : <button className="bt bt-marca bt-p" onClick={terminar}><I n="tocar" />Começar</button>}
        </div>
      </div>
    </div>
  );
}
