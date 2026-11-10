// O Treino da Colmeia: uma conversa de ensaio entre duas pessoas do time, dentro do painel. Uma escreve como cliente e
// a outra responde como atendente, do jeito que o atendimento deve ser. "Aprender" manda a IA ler a conversa e
// entregar o que entendeu como propostas para a Colmeia (nada vale antes do sim). "Salvar" guarda a conversa na lista
// e "Recomeçar" limpa e abre outra. Com "O Atendente de IA responde" ligado, quem faz o cliente conversa com a IA do
// direct, para ver se ela aprendeu. Nada daqui vai para cliente nenhum. Lógica em worker/lib/treino.js (migration 46).
// A conversa aberta é uma só, a mesma para todo mundo: a tela busca as falas novas a cada 2,5 segundos.
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { Eye, GraduationCap, RotateCcw, Save, Send, X } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { Carregando, ErroCarga, Grupo, Vazio, avisar } from '../nucleo/ui';
import { haQuanto, numero } from '../nucleo/util';

type Fala = { id: number; papel: 'cliente' | 'atendente' | 'nota'; texto: string; autor?: string | null; ia?: boolean; criado_em: string };
const PAPEL: Record<string, string> = { cliente: 'Cliente', atendente: 'Atendente' };
const lembrado = () => { try { return localStorage.getItem('treino-papel') || ''; } catch { return ''; } };

// As falas de uma conversa, em balões: cliente à esquerda, atendente à direita, e o nome de quem falou quando muda.
function Baloes({ falas }: { falas: Fala[] }) {
  return (
    <>
      {falas.map((m, k) => {
        if (m.papel === 'nota') return <p key={m.id} className="tre-nota">{m.texto}</p>;
        const antes = falas[k - 1];
        const mudou = !antes || antes.papel !== m.papel || !!antes.ia !== !!m.ia || antes.autor !== m.autor;
        const quem = m.ia ? 'Atendente de IA' : `${PAPEL[m.papel]}${m.autor ? ` · ${m.autor}` : ''}`;
        return (
          <Fragment key={m.id}>
            {mudou && <span className={`tre-quem tre-quem-${m.papel}`}>{quem}</span>}
            <span className={`tre-fala tre-${m.papel}${m.ia ? ' tre-ia' : ''}`}>{m.texto}</span>
          </Fragment>
        );
      })}
    </>
  );
}

export default function Treino({ itens, podeEditar, cartao, recarregarColmeia }: { itens: any[]; podeEditar: boolean; cartao: (i: any) => ReactNode; recarregarColmeia: () => void }) {
  const [sala, setSala] = useState<any>(null);
  const [erro, setErro] = useState('');
  const [papel, setPapel] = useState(lembrado);
  const [iaAtende, setIaAtende] = useState(false);
  const [iaPensando, setIaPensando] = useState(false);
  const [texto, setTexto] = useState('');
  const [ocupado, setOcupado] = useState('');
  const [resultado, setResultado] = useState<any>(null);
  const [vendo, setVendo] = useState<any>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const salaRef = useRef<any>(null);
  salaRef.current = sala;
  const espera = useRef<number | undefined>(undefined);

  const carregar = async () => {
    try { setSala(await get('/treino')); setErro(''); }
    catch (e: any) { setErro(e.message || 'Não deu para abrir o Treino.'); }
  };
  // Junta as falas novas nas que a tela já tem, sem repetir.
  const juntar = (novas: Fala[], treino?: any) => setSala((s: any) => {
    if (!s) return s;
    const tem = new Set(s.mensagens.map((m: Fala) => m.id));
    const mais = (novas || []).filter((m) => !tem.has(m.id));
    if (!mais.length && (!treino || treino.aprendido_em === s.treino.aprendido_em)) return s;
    return { ...s, treino: treino || s.treino, mensagens: [...s.mensagens, ...mais].sort((a: Fala, b: Fala) => a.id - b.id) };
  });

  useEffect(() => { carregar(); return () => window.clearTimeout(espera.current); }, []);
  // As falas da outra pessoa: um pedido curto a cada 2,5 segundos, só com a aba do navegador à vista.
  useEffect(() => {
    const t = window.setInterval(async () => {
      const s = salaRef.current;
      if (!s || document.hidden) return;
      const ultimo = s.mensagens.length ? s.mensagens[s.mensagens.length - 1].id : 0;
      try {
        const r: any = await get(`/treino?depois=${ultimo}`);
        const atual = salaRef.current;
        if (!atual) return;
        // Outra pessoa salvou ou recomeçou: esta tela abre a conversa nova.
        if (r.treino.id !== atual.treino.id) { setResultado(null); carregar(); return; }
        juntar(r.mensagens, r.treino);
      } catch { /* a próxima tentativa resolve */ }
    }, 2500);
    return () => window.clearInterval(t);
  }, []);
  const total = sala ? sala.mensagens.length : 0;
  useEffect(() => { if (caixa.current) caixa.current.scrollTop = caixa.current.scrollHeight; }, [total, iaPensando]);

  const escolher = (p: string) => { setPapel(p); try { localStorage.setItem('treino-papel', p); } catch { /* sem memória, vale só nesta visita */ } };
  const falhou = (e: any) => { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); if (e.status === 409) { setResultado(null); carregar(); } };

  // A IA responde uns segundos depois da última fala do cliente, para ler as mensagens quebradas de uma vez.
  const chamarIa = () => {
    window.clearTimeout(espera.current);
    setIaPensando(true);
    espera.current = window.setTimeout(async () => {
      const s = salaRef.current;
      if (s) {
        try { const r: any = await post('/treino/responder', { id: s.treino.id }); juntar(r.mensagens); }
        catch (e: any) { falhou(e); }
      }
      setIaPensando(false);
    }, 2500);
  };
  const enviar = async () => {
    const t = texto.trim();
    if (!t || !papel || !sala || ocupado === 'enviando') return;
    setTexto(''); setOcupado('enviando');
    try {
      const r: any = await post('/treino/mensagem', { id: sala.treino.id, papel, texto: t });
      juntar([r.mensagem]);
      if (iaAtende && papel === 'cliente') chamarIa();
    } catch (e: any) { setTexto(t); falhou(e); }
    setOcupado('');
  };
  const aprender = async (id: string, daSala: boolean) => {
    setOcupado(`aprendendo:${id}`);
    try {
      const r: any = await post('/treino/aprender', { id });
      if (daSala) { setResultado(r); setSala((s: any) => (s ? { ...s, treino: { ...s.treino, aprendizado: r.aprendizado, aprendido_em: r.aprendizado.em } } : s)); }
      avisar(r.itens.length ? `Aprendi ${r.itens.length} ${r.itens.length === 1 ? 'coisa' : 'coisas'}. Confira e aprove.` : 'A Colmeia já sabia o que esta conversa ensina.');
      recarregarColmeia();
      if (!daSala) carregar();
    } catch (e: any) { falhou(e); }
    setOcupado('');
  };
  const salvar = async () => {
    setOcupado('salvando');
    try { setSala(await post('/treino/salvar', { id: sala.treino.id })); setResultado(null); avisar('Conversa salva. Uma conversa nova já está aberta.'); }
    catch (e: any) { falhou(e); }
    setOcupado('');
  };
  const recomecar = async () => {
    const perde = sala.mensagens.length > 0 && !sala.treino.aprendido_em;
    if (perde && !confirm('Começar outra conversa? Esta não foi salva e sai da tela.')) return;
    setOcupado('recomecando');
    try { setSala(await post('/treino/recomecar', {})); setResultado(null); setTexto(''); }
    catch (e: any) { falhou(e); }
    setOcupado('');
  };
  const tirar = async (id: string) => {
    if (!confirm('Tirar esta conversa da lista? O que ela já ensinou continua na Colmeia.')) return;
    try { await post(`/treino/${id}`, { status: 'descartada' }); if (vendo && vendo.treino.id === id) setVendo(null); carregar(); }
    catch (e: any) { falhou(e); }
  };
  const ver = async (id: string) => {
    if (vendo && vendo.treino.id === id) { setVendo(null); return; }
    try { setVendo(await get(`/treino?id=${id}`)); }
    catch (e: any) { falhou(e); }
  };

  if (erro) return <ErroCarga erro={erro} tentar={carregar} />;
  if (!sala) return <Carregando />;

  const falas: Fala[] = sala.mensagens;
  const deGente = falas.filter((m) => m.papel !== 'nota' && !m.ia);
  const podeAprender = deGente.some((m) => m.papel === 'cliente') && deGente.some((m) => m.papel === 'atendente');
  const aprendendo = ocupado === `aprendendo:${sala.treino.id}`;
  const ids: string[] = (sala.treino.aprendizado && sala.treino.aprendizado.ids) || [];
  const aprendidos = itens.filter((i: any) => ids.includes(i.id));
  const esperando = aprendidos.filter((i: any) => i.status === 'proposta');
  const aprovados = aprendidos.filter((i: any) => i.status === 'ativa').length;
  const jaSabia: string[] = (resultado && resultado.ja_sabia) || (sala.treino.aprendizado && sala.treino.aprendizado.ja_sabia) || [];
  const resumo: string = (resultado && resultado.resumo) || (sala.treino.aprendizado && sala.treino.aprendizado.resumo) || '';
  const salvas: any[] = sala.salvas || [];

  return (
    <div className="tre">
      <Grupo titulo="Conversa de treino" rodape="Nada daqui vai para cliente nenhum. Uma pessoa escreve como cliente e a outra responde como atendente, do jeito que você quer que o atendimento seja. Quem abrir esta tela em outro computador ou celular cai na mesma conversa.">
        <div className="tre-topo">
          <div className="tre-escolha" role="group" aria-label="Quem você é nesta conversa">
            <span className="mudo">Nesta conversa eu sou</span>
            {Object.entries(PAPEL).map(([k, v]) => <button key={k} type="button" className={`col-chip ${papel === k ? 'col-chip-ativo' : ''}`} aria-pressed={papel === k} onClick={() => escolher(k)}>{v}</button>)}
          </div>
          {podeEditar && papel === 'cliente' && (
            <label className="tre-ia-liga"><input type="checkbox" checked={iaAtende} onChange={(e) => setIaAtende(e.target.checked)} />O Atendente de IA responde</label>
          )}
        </div>
        <div className="tre-conversa" ref={caixa} aria-live="polite">
          {!falas.length && <p className="tre-vazia mudo">A conversa está vazia. Escolha quem você é e mande a primeira mensagem.</p>}
          <Baloes falas={falas} />
          {iaPensando && <p className="tre-nota">O Atendente de IA está escrevendo</p>}
        </div>
        {podeEditar && (
          <div className="tre-escrever">
            <div className="campo tre-campo"><textarea
              rows={2} maxLength={1000} value={texto} disabled={!papel} aria-label="Sua mensagem"
              placeholder={papel ? `Escreva como ${papel === 'cliente' ? 'o cliente' : 'o atendente'}. Enter envia.` : 'Escolha acima quem você é nesta conversa.'}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            /></div>
            <button type="button" className="bt bt-tingido" disabled={!papel || !texto.trim() || ocupado === 'enviando'} onClick={enviar}><Send />Enviar</button>
          </div>
        )}
        {podeEditar && (
          <div className="tre-acoes">
            <button type="button" className="bt bt-tinta" disabled={!podeAprender || !!ocupado} onClick={() => aprender(sala.treino.id, true)}><GraduationCap />{aprendendo ? 'Lendo a conversa' : 'Aprender'}</button>
            <button type="button" className="bt" disabled={deGente.length < 2 || !!ocupado} onClick={salvar}><Save />{ocupado === 'salvando' ? 'Salvando' : 'Salvar'}</button>
            <button type="button" className="bt bt-texto" disabled={!!ocupado} onClick={recomecar}><RotateCcw />Recomeçar</button>
            <span className="mudo tre-dica">{aprendendo ? 'Leva uns 20 segundos.' : 'Aprender: eu leio a conversa e mostro o que entendi, para você aprovar. Salvar: guarda na lista. Recomeçar: limpa e abre outra.'}</span>
          </div>
        )}
      </Grupo>

      {(resultado || ids.length > 0) && (
        <Grupo titulo="O que aprendi com esta conversa" rodape="Nada vale antes do seu sim. Aprovou, entra na Colmeia para todos os vendedores.">
          {resumo && <p className="col-nota">{resumo}</p>}
          {esperando.length > 0 && <div className="col-lista">{esperando.map((i: any) => <Fragment key={i.id}>{cartao(i)}</Fragment>)}</div>}
          {esperando.length === 0 && <p className="mudo col-nota">{aprovados > 0 ? `Tudo decidido: ${numero(aprovados)} ${aprovados === 1 ? 'item entrou' : 'itens entraram'} na Colmeia.` : resultado && resultado.itens.length === 0 ? 'Nada de novo: a Colmeia já sabia o que esta conversa ensina.' : 'Nada esperando o seu sim desta conversa.'}</p>}
          {jaSabia.length > 0 && <p className="mudo col-nota"><b>A Colmeia já sabia:</b> {jaSabia.map((t, k) => <span key={k}>{k > 0 ? ' · ' : ''}“{t}”</span>)}</p>}
          {resultado && resultado.fora && resultado.fora.length > 0 && <p className="mudo col-nota">{resultado.fora.join(' ')}</p>}
        </Grupo>
      )}

      <Grupo titulo={salvas.length ? `Conversas salvas (${numero(salvas.length)})` : 'Conversas salvas'}>
        {salvas.length ? (
          <div className="tre-salvas">
            {salvas.map((s: any) => (
              <article className="tre-salva" key={s.id}>
                <div className="tre-salva-topo">
                  <div>
                    <h3>{s.titulo || 'Conversa de treino'}</h3>
                    <span className="mudo">{numero(s.n)} {s.n === 1 ? 'fala' : 'falas'} · salva {haQuanto(s.atualizado_em)}{s.aprendido_em ? ' · já ensinou' : ''}</span>
                  </div>
                  <span className="rec-acoes">
                    <button type="button" className="bt bt-mini bt-texto" aria-expanded={!!vendo && vendo.treino.id === s.id} onClick={() => ver(s.id)}><Eye />{vendo && vendo.treino.id === s.id ? 'Fechar' : 'Ver'}</button>
                    {podeEditar && <button type="button" className="bt bt-mini bt-tingido" disabled={!!ocupado} onClick={() => aprender(s.id, false)}><GraduationCap />{ocupado === `aprendendo:${s.id}` ? 'Lendo' : 'Aprender'}</button>}
                    {podeEditar && <button type="button" className="bt bt-mini bt-texto" onClick={() => tirar(s.id)}><X />Tirar da lista</button>}
                  </span>
                </div>
                {vendo && vendo.treino.id === s.id && <div className="tre-conversa tre-conversa-lida"><Baloes falas={vendo.mensagens} /></div>}
              </article>
            ))}
          </div>
        ) : <Vazio icone={<Save />} titulo="Nenhuma conversa salva" texto="Quando você clicar em Salvar, a conversa fica guardada aqui e dá para aprender com ela depois." />}
      </Grupo>
    </div>
  );
}
