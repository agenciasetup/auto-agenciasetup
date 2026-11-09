// Comunidade: o que espera a equipe (comentários para aprovar e responder, dúvidas do tutor, criações para o mural,
// depoimentos), desafios, selos e as respostas prontas do tutor. Suporte responde; Editor e Administrador cuidam do resto.
import { useEffect, useState } from 'react';
import { Check, EyeOff, MessageSquareReply, Pin, Plus, Save, Sparkles, Star, X } from 'lucide-react';
import { get, patch, post } from '../nucleo/api';
import { Abas, AreaTexto, Campo, Carregando, Celula, ErroCarga, Escolha, Etiqueta, Faixa, Grupo, Marcar, Modal, Titulo, Vazio, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { dataHora, haQuanto, numero, paraCampoData, doCampoData } from '../nucleo/util';
import { useRota } from '../nucleo/roteador';

const mmss = (s?: number | null) => (s || s === 0 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '');

export default function Comunidade() {
  const { rota } = useRota();
  const fila = useCarregar(() => get('/comunidade/fila'), []);
  const [aba, setAba] = useState(rota.busca.get('aba') || 'comentarios');
  useEffect(() => { document.title = 'Comunidade | Painel Agência Setup'; }, []);
  const f = fila.dados || {};
  const abas = [
    { id: 'comentarios', t: 'Comentários', n: (f.comentarios || 0) + (f.sem_resposta || 0) },
    { id: 'duvidas', t: 'Dúvidas do tutor', n: f.duvidas },
    { id: 'criacoes', t: 'Criações', n: f.entregas },
    { id: 'depoimentos', t: 'Depoimentos', n: f.depoimentos },
    { id: 'desafios', t: 'Desafios' },
    { id: 'selos', t: 'Selos' },
    { id: 'prontas', t: 'Respostas prontas' },
  ];
  return (
    <div className="tela">
      <Titulo titulo="Comunidade" sub="Comentários, dúvidas, criações e depoimentos da turma, os desafios e os selos." />
      <Abas abas={abas} atual={aba} mudar={setAba} />
      {aba === 'comentarios' && <Comentarios mudou={fila.recarregar} />}
      {aba === 'duvidas' && <Duvidas mudou={fila.recarregar} />}
      {aba === 'criacoes' && <Criacoes mudou={fila.recarregar} />}
      {aba === 'depoimentos' && <Depoimentos mudou={fila.recarregar} />}
      {aba === 'desafios' && <Desafios />}
      {aba === 'selos' && <Selos />}
      {aba === 'prontas' && <Prontas />}
    </div>
  );
}

function Filtro({ valor, mudar, opcoes }: { valor: string; mudar: (v: string) => void; opcoes: [string, string][] }) {
  return <div className="filtros"><select value={valor} onChange={(e) => mudar(e.target.value)} aria-label="Filtro">{opcoes.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>;
}

// ---------------------------------------------------------------- comentários
function Comentarios({ mudou }: { mudou: () => void }) {
  const [status, setStatus] = useState('pendente');
  const { dados, erro, carregando, recarregar } = useCarregar(() => get(`/comunidade/comentarios?status=${status}`), [status]);
  const [resp, setResp] = useState<any>(null);
  const { ocupado, rodar } = useAcao();
  const acao = (c: any, a: string) => rodar(`${a}-${c.id}`, async () => { await post(`/comunidade/comentarios/${c.id}/${a}`); recarregar(); mudou(); });
  const responder = () => rodar('responder', async () => { await post(`/comunidade/comentarios/${resp.id}/responder`, { texto: resp.texto, resolver: resp.resolver }); setResp(null); recarregar(); mudou(); }, 'Resposta oficial publicada. O aluno recebe no sino e no e-mail.');
  return <>
    <Filtro valor={status} mudar={setStatus} opcoes={[['pendente', 'Esperando aprovação'], ['duvidas', 'Dúvidas sem resolver'], ['publicado', 'Publicados'], ['oculto', 'Ocultos']]} />
    {erro && <ErroCarga erro={erro} tentar={recarregar} />}
    {carregando && !dados ? <Carregando /> : dados?.itens.length ? (
      <Grupo>
        {dados.itens.map((c: any) => (
          <div key={c.id} className="item-com">
            <div className="item-com-cab">
              <b>{c.aluno?.nome || c.equipe?.nome}</b>
              <span className="mudo">{c.aula ? `Aula ${c.aula.codigo}` : ''}{c.minuto_s !== null ? ` · ${mmss(c.minuto_s)}` : ''} · {haQuanto(c.criado_em)}</span>
              {c.status === 'pendente' ? <Etiqueta cor="ambar">{c.motivo_pendente === 'link' ? 'Tem link' : c.motivo_pendente === 'palavra' ? 'Palavra filtrada' : 'Pendente'}</Etiqueta> : null}
              {c.tipo === 'duvida' ? <Etiqueta cor="azul">Dúvida</Etiqueta> : null}
              {c.fixado ? <Etiqueta cor="laranja">Fixado</Etiqueta> : null}
              {c.resolvido ? <Etiqueta cor="verde">Resolvido</Etiqueta> : null}
            </div>
            <p className="item-com-txt">{c.texto}</p>
            {(c.respostas || []).map((r: any) => <p key={r.id} className="item-com-resp"><b>{r.equipe?.nome || r.aluno?.nome}{r.oficial ? ' (equipe)' : ''}:</b> {r.texto}</p>)}
            <div className="barra-acoes">
              <button className="bt bt-mini bt-tinta" onClick={() => setResp({ id: c.id, texto: '', resolver: c.tipo === 'duvida', quem: c.aluno?.nome })}><MessageSquareReply />Responder</button>
              {c.status !== 'publicado' ? <button className="bt bt-mini" disabled={!!ocupado} onClick={() => acao(c, 'publicar')}><Check />Publicar</button> : null}
              {c.status !== 'oculto' ? <button className="bt bt-mini bt-texto" disabled={!!ocupado} onClick={() => acao(c, 'ocultar')}><EyeOff />Ocultar</button> : null}
              {c.status === 'publicado' ? <button className="bt bt-mini bt-texto" disabled={!!ocupado} onClick={() => acao(c, c.fixado ? 'desafixar' : 'fixar')}><Pin />{c.fixado ? 'Desafixar' : 'Fixar'}</button> : null}
              {c.tipo === 'duvida' && !c.resolvido ? <button className="bt bt-mini bt-texto" disabled={!!ocupado} onClick={() => acao(c, 'resolver')}><Check />Marcar resolvido</button> : null}
            </div>
          </div>
        ))}
      </Grupo>
    ) : <Vazio titulo={status === 'pendente' ? 'Nada esperando aprovação.' : 'Nada por aqui.'} texto="Comentário com link ou palavrão espera aprovação. O resto publica na hora." />}
    <Modal titulo={resp ? `Responder ${resp.quem || ''}` : ''} aberto={!!resp} fechar={() => setResp(null)}
      rodape={<><button className="bt bt-texto" onClick={() => setResp(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado || !resp?.texto.trim()} onClick={responder}><MessageSquareReply />Publicar resposta oficial</button></>}>
      {resp && <>
        <AreaTexto rotulo="Resposta oficial" valor={resp.texto} mudar={(v) => setResp({ ...resp, texto: v })} linhas={5} />
        <Marcar rotulo="Marcar a dúvida como resolvida" valor={resp.resolver} mudar={(v) => setResp({ ...resp, resolver: v })} />
      </>}
    </Modal>
  </>;
}

// ---------------------------------------------------------------- dúvidas do tutor
function Duvidas({ mudou }: { mudou: () => void }) {
  const [status, setStatus] = useState('enviada');
  const { dados, erro, carregando, recarregar } = useCarregar(() => get(`/comunidade/duvidas?status=${status}`), [status]);
  const [resp, setResp] = useState<any>(null);
  const { ocupado, rodar } = useAcao();
  const responder = () => rodar('duvida', async () => {
    await post(`/comunidade/duvidas/${resp.id}/responder`, { texto: resp.texto, virar_pronta: resp.pronta, palavras: resp.palavras.split(',') });
    setResp(null); recarregar(); mudou();
  }, 'Resposta enviada. O aluno vê na aula, no sino e no e-mail.');
  return <>
    <Filtro valor={status} mudar={setStatus} opcoes={[['enviada', 'Mandadas para a equipe'], ['respondida', 'Respondidas'], ['aberta', 'Conversas com o tutor']]} />
    {erro && <ErroCarga erro={erro} tentar={recarregar} />}
    {carregando && !dados ? <Carregando /> : dados?.length ? (
      <Grupo>
        {dados.map((c: any) => (
          <div key={c.id} className="item-com">
            <div className="item-com-cab"><b>{c.aluno?.nome}</b><span className="mudo">{c.aula ? `Aula ${c.aula.codigo} · ${c.aula.titulo}` : ''} · {haQuanto(c.atualizado_em)}</span></div>
            <div className="conversa">
              {c.mensagens.map((m: any, i: number) => <p key={i} className={`fala fala-${m.papel}`}><b>{m.papel === 'aluno' ? 'Aluno' : m.papel === 'tutor' ? 'Tutor' : 'Equipe'}:</b> {m.texto}{m.com_imagem ? ' (com print)' : ''}{m.util === false ? ' · marcou que não ajudou' : ''}</p>)}
            </div>
            <div className="barra-acoes"><button className="bt bt-mini bt-tinta" onClick={() => setResp({ id: c.id, texto: '', pronta: false, palavras: '' })}><MessageSquareReply />Responder</button></div>
          </div>
        ))}
      </Grupo>
    ) : <Vazio titulo={status === 'enviada' ? 'Nenhuma dúvida esperando.' : 'Nada por aqui.'} texto="Quando o tutor não resolve, o aluno manda para a equipe e a dúvida aparece aqui com a conversa." />}
    <Modal titulo="Responder a dúvida" aberto={!!resp} fechar={() => setResp(null)}
      rodape={<><button className="bt bt-texto" onClick={() => setResp(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado || !resp?.texto.trim()} onClick={responder}><MessageSquareReply />Enviar resposta</button></>}>
      {resp && <>
        <AreaTexto rotulo="Resposta" valor={resp.texto} mudar={(v) => setResp({ ...resp, texto: v })} linhas={6} dica="Use [3:42] para apontar um minuto da aula: vira botão para o aluno." />
        <Marcar rotulo="Virar resposta pronta do tutor" valor={resp.pronta} mudar={(v) => setResp({ ...resp, pronta: v })} dica="Da próxima vez que alguém perguntar o mesmo nesta aula, o tutor responde com o seu texto, sem custo." />
        {resp.pronta && <Campo rotulo="Palavras que identificam a pergunta" valor={resp.palavras} mudar={(v) => setResp({ ...resp, palavras: v })} placeholder="pasta, oculta, mac" dica="Separadas por vírgula. A pergunta precisa ter todas (pelo menos 2)." />}
      </>}
    </Modal>
  </>;
}

// ---------------------------------------------------------------- criações (mural)
function Criacoes({ mudou }: { mudou: () => void }) {
  const [status, setStatus] = useState('pendente');
  const { dados, erro, carregando, recarregar } = useCarregar(() => get(`/comunidade/entregas?status=${status}`), [status]);
  const { ocupado, rodar } = useAcao();
  const [recusa, setRecusa] = useState<any>(null);
  const avaliar = (e: any, acao: string, motivo?: string) => rodar(`${acao}-${e.id}`, async () => { await post(`/comunidade/entregas/${e.id}`, { acao, motivo }); setRecusa(null); recarregar(); mudou(); }, acao === 'recusar' ? 'Recusada. O aluno vê o motivo.' : 'Aprovada: está no mural, deu XP e a moldura de criador.');
  return <>
    <Filtro valor={status} mudar={setStatus} opcoes={[['pendente', 'Esperando'], ['aprovada', 'No mural'], ['destaque', 'Destaques'], ['recusada', 'Recusadas']]} />
    {erro && <ErroCarga erro={erro} tentar={recarregar} />}
    {carregando && !dados ? <Carregando /> : dados?.length ? (
      <div className="grade-cartoes">
        {dados.map((e: any) => (
          <div key={e.id} className="cartao-entrega">
            {e.imagem_url ? <img src={e.imagem_url} alt="" /> : <div className="sem-img">Link</div>}
            <div className="corpo">
              <b>{e.titulo}</b>
              <span className="mudo">{e.aluno?.nome}{e.aluno?.instagram ? ` · @${e.aluno.instagram}` : ''}{e.desafio ? ` · ${e.desafio.titulo}` : ''}</span>
              {e.descricao ? <p>{e.descricao}</p> : null}
              {e.link ? <a href={e.link} target="_blank" rel="noreferrer">Abrir o link</a> : null}
              <span className="mudo">{e.autoriza_repost ? 'Autoriza repost' : 'Sem repost'} · {numero(e.curtidas)} curtidas · {haQuanto(e.criado_em)}</span>
              <div className="barra-acoes">
                {e.status !== 'aprovada' ? <button className="bt bt-mini" disabled={!!ocupado} onClick={() => avaliar(e, 'aprovar')}><Check />Aprovar</button> : null}
                {e.status !== 'destaque' ? <button className="bt bt-mini bt-tinta" disabled={!!ocupado} onClick={() => avaliar(e, 'destaque')}><Star />Destaque</button> : null}
                {e.status !== 'recusada' ? <button className="bt bt-mini bt-texto" disabled={!!ocupado} onClick={() => setRecusa({ e, motivo: '' })}><X />Recusar</button> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : <Vazio titulo="Nenhuma criação aqui." texto="O aluno manda o link do post ou uma imagem em Turma. Aprovada, vai para o mural, dá XP e a moldura de criador." />}
    <Modal titulo="Recusar a criação" aberto={!!recusa} fechar={() => setRecusa(null)}
      rodape={<><button className="bt bt-texto" onClick={() => setRecusa(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado} onClick={() => avaliar(recusa.e, 'recusar', recusa.motivo)}>Recusar</button></>}>
      {recusa && <Campo rotulo="Motivo (o aluno vê)" valor={recusa.motivo} mudar={(v) => setRecusa({ ...recusa, motivo: v })} placeholder="Ex.: não foi feito com o curso" />}
    </Modal>
  </>;
}

// ---------------------------------------------------------------- depoimentos
function Depoimentos({ mudou }: { mudou: () => void }) {
  const [status, setStatus] = useState('pendente');
  const { dados, erro, carregando, recarregar } = useCarregar(() => get(`/comunidade/depoimentos?status=${status}`), [status]);
  const { ocupado, rodar } = useAcao();
  const avaliar = (d: any, corpo: any, msg: string) => rodar(`dep-${d.id}`, async () => { await post(`/comunidade/depoimentos/${d.id}`, corpo); recarregar(); mudou(); }, msg);
  return <>
    <Filtro valor={status} mudar={setStatus} opcoes={[['pendente', 'Esperando'], ['aprovado', 'Aprovados'], ['recusado', 'Recusados']]} />
    {erro && <ErroCarga erro={erro} tentar={recarregar} />}
    {carregando && !dados ? <Carregando /> : dados?.length ? (
      <Grupo>
        {dados.map((d: any) => (
          <div key={d.id} className="item-com">
            <div className="item-com-cab"><b>{d.aluno?.nome}</b><Etiqueta cor={d.nota >= 9 ? 'verde' : d.nota >= 7 ? 'ambar' : 'vermelho'}>Nota {d.nota}</Etiqueta><span className="mudo">{d.curso?.titulo} · {haQuanto(d.criado_em)}</span>{d.na_landing ? <Etiqueta cor="laranja">Na página do curso</Etiqueta> : null}</div>
            <p className="item-com-txt">"{d.texto}"</p>
            {d.video_url ? <a href={d.video_url} target="_blank" rel="noreferrer">Vídeo do depoimento</a> : null}
            {d.resultado ? <p className="mudo">Resultado depois de 30 dias: {d.resultado}</p> : null}
            <p className="mudo">{d.autoriza_uso ? 'Autoriza usar com o nome' : 'Não autorizou usar'}</p>
            <div className="barra-acoes">
              {d.status !== 'aprovado' ? <button className="bt bt-mini" disabled={!!ocupado} onClick={() => avaliar(d, { acao: 'aprovar' }, 'Aprovado.')}><Check />Aprovar</button> : null}
              {d.status === 'aprovado' && d.autoriza_uso ? <button className="bt bt-mini bt-tinta" disabled={!!ocupado} onClick={() => avaliar(d, { na_landing: !d.na_landing }, d.na_landing ? 'Saiu da página do curso.' : 'Entrou na página do curso.')}><Sparkles />{d.na_landing ? 'Tirar da página' : 'Pôr na página do curso'}</button> : null}
              {d.status !== 'recusado' ? <button className="bt bt-mini bt-texto" disabled={!!ocupado} onClick={() => avaliar(d, { acao: 'recusar' }, 'Recusado.')}><X />Recusar</button> : null}
            </div>
          </div>
        ))}
      </Grupo>
    ) : <Vazio titulo="Nenhum depoimento aqui." texto="Depois de 50% do curso, o aluno conta como foi e ganha o material de presente. Os aprovados e autorizados podem ir para a página do curso." />}
  </>;
}

// ---------------------------------------------------------------- desafios
function Desafios() {
  const { pode } = useSessao();
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/comunidade/desafios'), []);
  const selos = useCarregar(() => get('/comunidade/selos'), []);
  const [d, setD] = useState<any>(null);
  const { ocupado, rodar } = useAcao();
  const salvar = () => rodar('desafio', async () => {
    const corpo = { titulo: d.titulo, descricao: d.descricao, regras: d.regras, premio: d.premio, fim: doCampoData(d.fim), status: d.status, conquista_id: d.conquista_id || null };
    if (d.id) await patch(`/comunidade/desafios/${d.id}`, corpo); else await post('/comunidade/desafios', corpo);
    setD(null); recarregar();
  }, 'Desafio salvo. Ao abrir, a turma recebe o aviso no sino.');
  return <>
    {pode('comunicacao.editar') ? <div className="barra-acoes" style={{ marginBottom: 12 }}><button className="bt bt-tinta" onClick={() => setD({ titulo: '', descricao: '', regras: '', premio: '', fim: '', status: 'rascunho', conquista_id: '' })}><Plus />Novo desafio</button></div> : null}
    {erro && <ErroCarga erro={erro} tentar={recarregar} />}
    {carregando && !dados ? <Carregando /> : dados?.length ? (
      <Grupo>
        {dados.map((x: any) => <Celula key={x.id} titulo={x.titulo} sub={`${x.fim ? `até ${dataHora(x.fim)} · ` : ''}${x.entregas?.[0]?.count || 0} entregas${x.premio ? ` · prêmio: ${x.premio}` : ''}`}
          direita={<Etiqueta cor={x.status === 'aberto' ? 'verde' : x.status === 'rascunho' ? 'ambar' : 'cinza'}>{x.status === 'aberto' ? 'Aberto' : x.status === 'rascunho' ? 'Rascunho' : 'Encerrado'}</Etiqueta>}
          onClick={pode('comunicacao.editar') ? () => setD({ ...x, fim: paraCampoData(x.fim), conquista_id: x.conquista_id || '' }) : undefined} />)}
      </Grupo>
    ) : <Vazio titulo="Nenhum desafio ainda." texto="Desafio do mês: tema, prazo e prêmio. A turma entrega, curte, e a equipe escolhe os destaques." />}
    <Modal titulo={d?.id ? 'Editar desafio' : 'Novo desafio'} aberto={!!d} fechar={() => setD(null)}
      rodape={<><button className="bt bt-texto" onClick={() => setD(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado || !d?.titulo.trim()} onClick={salvar}><Save />Salvar</button></>}>
      {d && <>
        <Campo rotulo="Título" valor={d.titulo} mudar={(v) => setD({ ...d, titulo: v })} />
        <AreaTexto rotulo="O desafio" valor={d.descricao} mudar={(v) => setD({ ...d, descricao: v })} linhas={3} />
        <AreaTexto rotulo="Regras (opcional)" valor={d.regras || ''} mudar={(v) => setD({ ...d, regras: v })} linhas={3} />
        <Campo rotulo="Prêmio" valor={d.premio || ''} mudar={(v) => setD({ ...d, premio: v })} placeholder="Selo exclusivo, repost no Instagram da agência..." />
        <Campo rotulo="Prazo" tipo="datetime-local" valor={d.fim} mudar={(v) => setD({ ...d, fim: v })} />
        <Escolha rotulo="Selo de quem tiver a criação aprovada" valor={d.conquista_id} mudar={(v) => setD({ ...d, conquista_id: v })} opcoes={[{ v: '', t: 'Nenhum' }, ...((selos.dados as any[]) || []).map((s: any) => ({ v: s.id, t: s.nome }))]} />
        <Escolha rotulo="Situação" valor={d.status} mudar={(v) => setD({ ...d, status: v })} opcoes={[{ v: 'rascunho', t: 'Rascunho' }, { v: 'aberto', t: 'Aberto (avisa a turma)' }, { v: 'encerrado', t: 'Encerrado' }]} />
      </>}
    </Modal>
  </>;
}

// ---------------------------------------------------------------- selos
const RARIDADES = [{ v: 'comum', t: 'Comum' }, { v: 'rara', t: 'Rara' }, { v: 'epica', t: 'Épica' }, { v: 'lendaria', t: 'Lendária' }];
const REGRAS = [
  { v: 'aulas', t: 'Aulas concluídas' }, { v: 'modulos', t: 'Módulos completos' }, { v: 'cursos', t: 'Cursos completos' }, { v: 'passos', t: 'Passos do "Faça agora"' },
  { v: 'sequencia', t: 'Dias seguidos' }, { v: 'uteis', t: 'Curtidas e "resolveu" recebidos' }, { v: 'entregas', t: 'Criações aprovadas' }, { v: 'destaques', t: 'Criações destaque' },
  { v: 'certificados', t: 'Certificados' }, { v: 'depoimento', t: 'Depoimentos aprovados' }, { v: 'aula', t: 'Uma aula específica (código)' }, { v: 'manual', t: 'Só dado pela equipe (desafio)' },
];
function Selos() {
  const { pode } = useSessao();
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/comunidade/selos'), []);
  const [s, setS] = useState<any>(null);
  const { ocupado, rodar } = useAcao();
  const salvar = () => rodar('selo', async () => {
    const corpo = { nome: s.nome, descricao: s.descricao, raridade: s.raridade, cor: s.cor, icone: s.icone, xp: Number(s.xp), ativa: s.ativa, secreta: s.secreta, regra: { tipo: s.regra_tipo, n: Number(s.regra_n) || 1, ...(s.regra_tipo === 'aula' ? { codigo: s.regra_codigo } : {}) } };
    if (s.existe) await patch(`/comunidade/selos/${s.id}`, corpo); else await post('/comunidade/selos', corpo);
    setS(null); recarregar();
  }, 'Selo salvo.');
  return <>
    {pode('comunicacao.editar') ? <div className="barra-acoes" style={{ marginBottom: 12 }}><button className="bt bt-tinta" onClick={() => setS({ nome: '', descricao: '', raridade: 'comum', cor: '#ff7a00', icone: 'medalha', xp: 10, ativa: true, secreta: false, regra_tipo: 'aulas', regra_n: 1, regra_codigo: '' })}><Plus />Novo selo</button></div> : null}
    {erro && <ErroCarga erro={erro} tentar={recarregar} />}
    {carregando && !dados ? <Carregando /> : (
      <Grupo>
        {(dados || []).map((x: any) => <Celula key={x.id} icone={<span style={{ width: 14, height: 14, borderRadius: '50%', background: x.cor, display: 'block' }} />} titulo={x.nome} sub={`${x.descricao} · ${x.xp} XP · ${x.ganhos} ${x.ganhos === 1 ? 'aluno ganhou' : 'alunos ganharam'}`}
          direita={<>{!x.ativa ? <Etiqueta>Desligado</Etiqueta> : null}<Etiqueta cor={x.raridade === 'lendaria' ? 'ambar' : x.raridade === 'epica' ? 'laranja' : x.raridade === 'rara' ? 'azul' : 'cinza'}>{RARIDADES.find((r) => r.v === x.raridade)?.t}</Etiqueta></>}
          onClick={pode('comunicacao.editar') ? () => setS({ ...x, existe: true, regra_tipo: x.regra?.tipo || 'manual', regra_n: x.regra?.n || 1, regra_codigo: x.regra?.codigo || '' }) : undefined} />)}
      </Grupo>
    )}
    <Modal titulo={s?.existe ? 'Editar selo' : 'Novo selo'} aberto={!!s} fechar={() => setS(null)}
      rodape={<><button className="bt bt-texto" onClick={() => setS(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado || !s?.nome?.trim()} onClick={salvar}><Save />Salvar</button></>}>
      {s && <>
        <Campo rotulo="Nome" valor={s.nome} mudar={(v) => setS({ ...s, nome: v })} />
        <Campo rotulo="Como se ganha (o aluno vê)" valor={s.descricao} mudar={(v) => setS({ ...s, descricao: v })} />
        <div className="campos-lado">
          <Escolha rotulo="Raridade" valor={s.raridade} mudar={(v) => setS({ ...s, raridade: v })} opcoes={RARIDADES} />
          <Campo rotulo="Cor" tipo="color" valor={s.cor} mudar={(v) => setS({ ...s, cor: v })} />
        </div>
        <div className="campos-lado">
          <Escolha rotulo="Regra" valor={s.regra_tipo} mudar={(v) => setS({ ...s, regra_tipo: v })} opcoes={REGRAS} />
          {s.regra_tipo === 'aula' ? <Campo rotulo="Código da aula" valor={s.regra_codigo} mudar={(v) => setS({ ...s, regra_codigo: v })} placeholder="3.3" /> : s.regra_tipo !== 'manual' ? <Campo rotulo="Quantidade" tipo="number" min={1} valor={s.regra_n} mudar={(v) => setS({ ...s, regra_n: v })} /> : <span />}
        </div>
        <div className="campos-lado">
          <Campo rotulo="XP ao ganhar" tipo="number" min={0} valor={s.xp} mudar={(v) => setS({ ...s, xp: v })} />
          <Escolha rotulo="Ícone" valor={s.icone} mudar={(v) => setS({ ...s, icone: v })} opcoes={['medalha', 'trofeu', 'brilho', 'fogo', 'ok', 'tocar', 'listas', 'curso', 'escudo', 'relogio', 'modelo', 'coracao', 'nota'].map((i) => ({ v: i, t: i }))} />
        </div>
        <Marcar rotulo="Ligado" valor={s.ativa} mudar={(v) => setS({ ...s, ativa: v })} />
        <Marcar rotulo="Secreto (só aparece depois de ganho)" valor={s.secreta} mudar={(v) => setS({ ...s, secreta: v })} />
      </>}
    </Modal>
  </>;
}

// ---------------------------------------------------------------- respostas prontas
function Prontas() {
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/comunidade/prontas'), []);
  const [r, setR] = useState<any>(null);
  const { ocupado, rodar } = useAcao();
  const salvar = () => rodar('pronta', async () => {
    const corpo = { pergunta: r.pergunta, resposta: r.resposta, palavras: r.palavras, ativa: r.ativa };
    if (r.id) await patch(`/comunidade/prontas/${r.id}`, corpo); else await post('/comunidade/prontas', corpo);
    setR(null); recarregar();
  }, 'Resposta pronta salva.');
  return <>
    <Faixa tipo="info">Quando a pergunta do aluno bate com uma resposta pronta, o tutor responde com o texto da equipe, sem gastar IA. Elas nascem na aba Dúvidas, ao responder.</Faixa>
    <div className="barra-acoes" style={{ margin: '12px 0' }}><button className="bt bt-tinta" onClick={() => setR({ pergunta: '', resposta: '', palavras: '', ativa: true })}><Plus />Nova resposta pronta</button></div>
    {erro && <ErroCarga erro={erro} tentar={recarregar} />}
    {carregando && !dados ? <Carregando /> : dados?.length ? (
      <Grupo>{dados.map((x: any) => <Celula key={x.id} titulo={x.pergunta} sub={`${x.aula ? `Aula ${x.aula.codigo} · ` : 'Curso todo · '}${(x.palavras || []).join(', ') || 'só a pergunta igual'} · usada ${x.usos} vezes`} direita={x.ativa ? <Etiqueta cor="verde">Ligada</Etiqueta> : <Etiqueta>Desligada</Etiqueta>} onClick={() => setR({ ...x, palavras: (x.palavras || []).join(', ') })} />)}</Grupo>
    ) : <Vazio titulo="Nenhuma resposta pronta ainda." />}
    <Modal titulo={r?.id ? 'Editar resposta pronta' : 'Nova resposta pronta'} aberto={!!r} fechar={() => setR(null)}
      rodape={<><button className="bt bt-texto" onClick={() => setR(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado || !r?.pergunta.trim() || !r?.resposta.trim()} onClick={salvar}><Save />Salvar</button></>}>
      {r && <>
        <Campo rotulo="Pergunta" valor={r.pergunta} mudar={(v) => setR({ ...r, pergunta: v })} />
        <AreaTexto rotulo="Resposta" valor={r.resposta} mudar={(v) => setR({ ...r, resposta: v })} linhas={6} dica="Use [3:42] para apontar um minuto da aula." />
        <Campo rotulo="Palavras-chave" valor={r.palavras} mudar={(v) => setR({ ...r, palavras: v })} placeholder="pasta, oculta, mac" dica="Separadas por vírgula; a pergunta precisa ter todas (pelo menos 2)." />
        <Marcar rotulo="Ligada" valor={r.ativa} mudar={(v) => setR({ ...r, ativa: v })} />
      </>}
    </Modal>
  </>;
}
