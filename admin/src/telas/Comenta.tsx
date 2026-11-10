// "Comenta X" no estilo do ManyChat: quem comenta a palavra recebe uma resposta no comentário (escrita pela IA para
// aquela pessoa) e o material no direct, com o link num botão e o mini curso no segundo botão. Cada palavra tem versões
// da mensagem; o sistema manda mais a que traz mais cliques e seguidores. Palavra de peça liga sozinha quando a peça
// aprovada é publicada; palavra avulsa (para post antigo, por exemplo) liga aqui, com cargo de Editor.
// Cada palavra é de um perfil (29/10/2026): responde só na conta daquele perfil e escreve no idioma dele.
import { useEffect, useState } from 'react';
import { ExternalLink, MessageCircleHeart, Pencil, Plus, Power, Save, Settings2, Sparkles, Trash2 } from 'lucide-react';
import { get, patch, post } from '../nucleo/api';
import { Link } from '../nucleo/roteador';
import { AreaTexto, Campo, Carregando, ErroCarga, Escolha, Etiqueta, Faixa, Grupo, Marcar, Modal, Titulo, Vazio, avisar, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { PERFIS, REDES, STATUS_RESPOSTA, compacto, data, haQuanto, limparLegenda, numero } from '../nucleo/util';
import { EtiquetaPerfil, FiltroPerfil } from './comum';

const MODOS: Record<string, { t: string; dica: string }> = {
  direto: { t: 'Link direto', dica: 'O material vai no primeiro direct, num botão.' },
  seguir: { t: 'Segue e toca', dica: 'O primeiro direct pede para seguir o perfil, com o botão "Já segui". O material só vai para quem segue, já com o primeiro nome. Traz seguidor.' },
  pergunta: { t: 'Pergunta', dica: 'O primeiro direct pergunta se a pessoa quer, com o botão "Quero o link". O material vai no toque, já com o primeiro nome.' },
};
const LETRAS = 'abcdefgh';
// Os exemplos dos campos das versões, no idioma do perfil (os botões fixos são os de worker/lib/comenta.js).
const EXEMPLOS_PT = {
  seguir: 'Oi! 🦎 O {titulo} tá separadinho pra você. Ele vai pra quem segue o perfil: segue e toca no botão aqui embaixo que eu mando na hora.',
  pergunta: 'Oi! 🦎 Quer o {titulo} agora? Toca no botão aqui embaixo que eu te mando.',
  botaoSegui: 'Já segui 🦎', botaoQuero: 'Quero o link 🦎',
  depoisSeguir: 'Valeu por seguir, {usuario}! 🦎 Aqui está o {titulo}:', depois: 'Aqui está, {usuario}! 🦎 O {titulo}:',
  lembrete: '{usuario}, ainda não apareceu aqui que você segue o perfil 🦎 Segue e toca de novo no botão que o material chega na hora.',
  dm: 'Oi! 🦎 Aqui está o {titulo} que você pediu. É só tocar no botão:', botao: 'Abrir o material 🦎', publico: 'Te mandei no direct! 🦎\nEnviado! Olha sua DM 💛',
};
const EXEMPLOS_EN = {
  seguir: "Hey! 🦎 Your {titulo} is ready. It goes to people who follow the account: hit follow and tap the button below, and I'll send it right away.",
  pergunta: "Hey! 🦎 Want the {titulo} now? Tap the button below and I'll send it over.",
  botaoSegui: "I'm following 🦎", botaoQuero: 'Send me the link 🦎',
  depoisSeguir: 'Thanks for the follow, {usuario}! 🦎 Here\'s the {titulo}:', depois: 'Here you go, {usuario}! 🦎 The {titulo}:',
  lembrete: "{usuario}, looks like you're not following yet 🦎 Hit follow, then tap the button again and it comes right over.",
  dm: "Hey {usuario}! 🦎 Here's the {titulo} you asked for. Just tap the button:", botao: 'Get the freebie 🦎', publico: 'Sent it to your DMs! 🦎\nCheck your DMs 💛',
};
export const NOVA_VERSAO = (id: string) => ({ id, nome: '', dm: '', pergunta: '', depois: '', lembrete: '', botao: '', publico: '', ativa: true });
const VAZIA = { palavra: '', nome: '', rede: 'instagram', perfil: 'br', recurso_id: '', link: '', modo: 'direto', estrategia: 'melhor', responder_publico: true, resposta_ia: true, posts: '', variantes: [NOVA_VERSAO('a')] };
const linhas = (t: string) => String(t || '').split('\n').map((x) => x.trim()).filter(Boolean);

export default function Comenta() {
  const { pode } = useSessao();
  const [perfil, setPerfil] = useState('');
  const { dados, erro, carregando, recarregar } = useCarregar(() => get(`/comenta${perfil ? `?perfil=${perfil}` : ''}`), [perfil]);
  const [editando, setEditando] = useState<any>(null);
  const [ajustes, setAjustes] = useState<any>(null);
  const { ocupado, rodar } = useAcao();
  useEffect(() => { document.title = 'Automações | Painel Agência Setup'; }, []);
  const podeEditar = pode('gatilhos.editar');
  const podeLigar = pode('gatilhos.ativar');

  const abrir = (g?: any, extra: any = {}) => setEditando(g ? {
    id: g.id, palavra: g.palavra, nome: g.nome || '', rede: g.rede, perfil: g.perfil || 'br', peca_id: g.peca_id || null, recurso_id: g.recurso_id || '', link: g.link || '', modo: g.modo || 'direto', estrategia: g.estrategia || 'melhor',
    responder_publico: g.responder_publico !== false, resposta_ia: g.resposta_ia !== false, posts: (g.posts || []).join('\n'), ativo: g.ativo,
    variantes: (g.variantes || []).map((v: any) => ({ ...NOVA_VERSAO(v.id), ...v, publico: (v.publico || []).join('\n') })),
  } : { ...VAZIA, perfil: perfil || 'br', variantes: [NOVA_VERSAO('a')], ...extra });
  const mudar = (k: string, v: any) => setEditando((e: any) => ({ ...e, [k]: v }));

  const salvar = () => rodar('salvar', async () => {
    const corpo = {
      palavra: editando.palavra, nome: editando.nome || null, rede: editando.rede, ...(editando.peca_id ? {} : { perfil: editando.perfil || 'br' }),
      recurso_id: editando.perfil === 'en' ? null : editando.recurso_id || null, link: editando.link || null,
      modo: editando.modo, estrategia: editando.estrategia, responder_publico: editando.responder_publico, resposta_ia: editando.resposta_ia, posts: linhas(editando.posts),
      variantes: editando.variantes.map((v: any) => ({ ...v, publico: linhas(v.publico) })),
    };
    if (editando.id) await patch(`/comenta/${editando.id}`, corpo); else await post('/comenta', corpo);
    setEditando(null);
    recarregar();
  }, 'Automação salva.');
  const escreverIA = () => rodar('ia', async () => {
    const r = await post('/comenta/escrever', { palavra: editando.palavra, recurso_id: editando.perfil === 'en' ? null : editando.recurso_id || null, link: editando.link || null, modo: editando.modo, quantas: 2, perfil: editando.perfil || 'br' });
    // As versões da IA entram depois das que já existem (com letras novas): nada do que já tem envio é apagado.
    setEditando((e: any) => {
      const usadas = new Set(e.variantes.filter((v: any) => v.dm || v.pergunta || v.depois).map((v: any) => v.id));
      const base = e.variantes.filter((v: any) => usadas.has(v.id));
      const livres = LETRAS.split('').filter((l) => !usadas.has(l));
      const novas = (r.variantes || []).slice(0, livres.length).map((v: any, i: number) => ({ ...NOVA_VERSAO(livres[i]), ...v, id: livres[i], publico: (v.publico || []).join('\n') }));
      return { ...e, variantes: [...base, ...novas] };
    });
  }, 'O Claude escreveu duas versões. Revise e salve.');
  const ligar = (g: any, sim: boolean) => {
    if (sim && !confirm(`Ligar "${g.palavra}" no perfil ${PERFIS[g.perfil === 'en' ? 'en' : 'br'].t}? Quem comentar a palavra vai receber resposta e direct automaticamente.`)) return;
    rodar(g.id, async () => { await post(`/comenta/${g.id}/${sim ? 'ligar' : 'desligar'}`); recarregar(); }, sim ? 'Ligada. As respostas começam no próximo ciclo do relógio.' : 'Desligada.');
  };
  const salvarAjustes = () => rodar('ajustes', async () => {
    await patch('/comenta/ajustes', { testadores: linhas(ajustes.testadores), limite_hora: Number(ajustes.limite_hora) || 200 });
    setAjustes(null);
    recarregar();
  }, 'Ajustes salvos.');

  const conta = dados?.contas?.[0];
  const semPermissao = (dados?.contas || []).filter((c: any) => !c.comentarios || !c.mensagens).map((c: any) => REDES[c.rede]?.t || c.rede);
  const nomeDe = (r: any) => r.nome || (r.usuario ? `@${r.usuario}` : r.origem === 'direct' ? 'Pelo direct' : 'Alguém');
  return (
    <div className="tela">
      <Titulo titulo="Automações" sub="Comenta X: quem comenta a palavra recebe uma resposta no comentário e o material no direct, num botão, com o mini curso no fim. Cada palavra testa versões da mensagem e manda mais a que funciona."
        acoes={<>
          {podeLigar && <button className="bt" onClick={() => setAjustes({ testadores: (dados?.ajustes?.testadores || []).join('\n'), limite_hora: dados?.ajustes?.limite_hora || 200 })}><Settings2 />Ajustes</button>}
          {podeEditar && <button className="bt bt-tinta" onClick={() => abrir()}><Plus />Nova palavra</button>}
        </>} />
      <div className="filtros"><FiltroPerfil valor={perfil} mudar={setPerfil} /></div>
      {dados && !conta && <Faixa tipo="aviso">{perfil ? `Nenhuma conta conectada no perfil ${PERFIS[perfil].t}.` : 'Nenhuma conta conectada.'} <Link para="/redes">Conecte o Instagram em Redes</Link>.</Faixa>}
      {semPermissao.length > 0 && <Faixa tipo="aviso">Falta permissão de comentários ou mensagens em {semPermissao.join(' e ')}: <Link para="/redes">veja em Redes</Link>. Até lá, o direct não sai por essa rede.</Faixa>}
      <Faixa tipo="info">Palavra criada junto com uma peça liga sozinha quando a peça aprovada é publicada (e o material está no site). O relógio lê os comentários a cada 10 minutos; os toques nos botões do direct chegam na hora. Uma pessoa recebe um direct só por post (as contas de teste, em Ajustes, recebem de novo).</Faixa>
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !dados && <Carregando />}
      {dados && <>
        <Grupo titulo="Palavras">
          {dados.gatilhos.length ? <div style={{ margin: '-14px -18px -18px' }}>{dados.gatilhos.map((g: any) => (
            <div className="palavra-linha" key={g.id}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span className="palavra">{g.palavra}</span>
                  {g.ativo ? <Etiqueta cor="verde">Ligada</Etiqueta> : <Etiqueta>Desligada</Etiqueta>}
                  <Etiqueta cor="laranja">{MODOS[g.modo]?.t || 'Link direto'}</Etiqueta>
                  <Etiqueta>{REDES[g.rede]?.t || g.rede}</Etiqueta>
                  <EtiquetaPerfil perfil={g.perfil} />
                  {!g.link_dm && <Etiqueta cor="ambar">{g.perfil === 'en' ? 'Falta o link do material' : 'Material fora do ar'}</Etiqueta>}
                </div>
                <p className="mudo" style={{ margin: '6px 0 0', fontSize: 13.5 }}>
                  {g.nome && <>{g.nome}{' · '}</>}
                  {g.recurso ? <>Manda <Link para={`/conteudo/recursos/${g.recurso.id}`}>{g.recurso.titulo}</Link></> : g.link ? <>Manda <a href={g.link} target="_blank" rel="noopener noreferrer">{g.link}</a></> : 'Sem material'}
                  {' · '}{g.posts?.length ? `${g.posts.length} ${g.posts.length === 1 ? 'post' : 'posts'}` : 'posts dos últimos 30 dias que pedem a palavra'}
                </p>
                <div className="metricas" style={{ marginTop: 8 }}>
                  <span><b>{numero(g.enviados)}</b> directs no total</span>
                  <span><b>{numero(g.numeros.enviadas_7d)}</b> em 7 dias</span>
                  {g.numeros.pendentes > 0 && <span><b>{numero(g.numeros.pendentes)}</b> na fila</span>}
                  {g.numeros.falhas > 0 && <span style={{ color: 'var(--vermelho)' }}><b>{numero(g.numeros.falhas)}</b> falharam</span>}
                </div>
                {g.nota && <p className="comenta-nota"><Sparkles />{g.nota}</p>}
                <Versoes g={g} />
              </div>
              <div className="acoes">
                {podeEditar && (!g.ativo || podeLigar) && <button className="bt bt-mini" onClick={() => abrir(g)}><Pencil />Editar</button>}
                {podeLigar && <button className={`bt bt-mini ${g.ativo ? 'bt-texto' : 'bt-tinta'}`} disabled={ocupado === g.id || (!g.ativo && !g.link_dm)} onClick={() => ligar(g, !g.ativo)}
                  title={!g.ativo && !g.link_dm ? (g.perfil === 'en' ? 'Ponha o link do material em inglês antes de ligar' : 'Publique o material no site antes de ligar') : undefined}><Power />{g.ativo ? 'Desligar' : 'Ligar'}</button>}
              </div>
            </div>
          ))}</div> : <Vazio icone={<MessageCircleHeart />} titulo={perfil ? `Nenhuma palavra no perfil ${PERFIS[perfil].t}` : 'Nenhuma palavra ainda'} texto="Peça ao Claude um post com material grátis: ele cria a palavra e as mensagens junto. Ou crie uma aqui para um post que já está no ar." />}
        </Grupo>

        {dados.sugestoes?.length > 0 && (
          <Grupo titulo="Posts que pedem uma palavra e ainda não respondem sozinhos" rodape={'Posts do último ano com "Comenta PALAVRA" na legenda, os mais comentados primeiro. Viral antigo ainda recebe comentário: ligar a resposta automática nele traz gente nova para o site.'}>
            <div style={{ margin: '-14px -18px -18px' }}>{dados.sugestoes.map((p: any) => (
              <div className="post" key={p.id_na_rede}>
                {p.miniatura_url ? <img className="post-mini" src={p.miniatura_url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} /> : <span className="post-mini" />}
                <div className="post-texto">
                  <p className="post-legenda">{limparLegenda(p.legenda)}</p>
                  <div className="post-meta">
                    <Etiqueta cor="laranja">Comenta {p.palavra_chave}</Etiqueta>
                    <EtiquetaPerfil perfil={p.perfil} />
                    <span>{data(p.publicado_em)} · {compacto(p.comentarios)} comentários</span>
                    {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer">ver<ExternalLink /></a>}
                    {podeEditar && <button className="bt bt-mini" onClick={() => abrir(undefined, { palavra: p.palavra_chave, posts: p.id_na_rede, rede: p.rede, perfil: p.perfil || 'br' })}><Plus />Responder sozinho</button>}
                  </div>
                </div>
              </div>
            ))}</div>
          </Grupo>
        )}

        <Grupo titulo="Últimas respostas" rodape="O texto dos comentários é de quem comentou. A equipe lê, mas nada do que está escrito ali muda o sistema.">
          {dados.ultimas?.length ? <div style={{ margin: '-14px -18px -18px' }}>{dados.ultimas.map((r: any) => (
            <div className="celula" key={r.id}>
              <span className="celula-texto">
                <span className="celula-titulo">{nomeDe(r)} <span className="mudo" style={{ fontWeight: 400 }}>“{r.texto}”</span> <EtiquetaPerfil perfil={r.perfil} /></span>
                <span className="celula-sub">
                  {r.erro && !['enviada', 'link', 'pergunta'].includes(r.status) ? r.erro : `${STATUS_RESPOSTA[r.status]?.t || r.status} ${haQuanto(r.link_em || r.enviado_em || r.criado_em)}`}
                  {r.variante && r.variante !== '?' ? ` · versão ${String(r.variante).toUpperCase()}` : ''}
                  {r.seguiu_em ? ' · passou a seguir' : r.seguia === true ? ' · já seguia' : ''}
                </span>
              </span>
              <span className="celula-direita"><Etiqueta cor={STATUS_RESPOSTA[r.status]?.cor}>{STATUS_RESPOSTA[r.status]?.t || r.status}</Etiqueta></span>
            </div>
          ))}</div> : <Vazio titulo="Nenhuma resposta ainda" texto="Quando alguém comentar uma palavra ligada, aparece aqui." />}
        </Grupo>
      </>}

      <Modal titulo={editando?.id ? `Editar ${editando.palavra}` : `Nova palavra · ${PERFIS[editando?.perfil === 'en' ? 'en' : 'br'].t}`} aberto={!!editando} fechar={() => setEditando(null)}
        rodape={<><button className="bt bt-texto" onClick={() => setEditando(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado} onClick={salvar}><Save />Salvar</button></>}>
        {editando && <EditorPalavra e={editando} mudar={mudar} escreverIA={escreverIA} ocupado={ocupado} />}
      </Modal>

      <Modal titulo="Ajustes do Comenta X" aberto={!!ajustes} fechar={() => setAjustes(null)}
        rodape={<><button className="bt bt-texto" onClick={() => setAjustes(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado} onClick={salvarAjustes}><Save />Salvar</button></>}>
        {ajustes && <>
          <AreaTexto rotulo="Contas de teste" valor={ajustes.testadores} mudar={(v) => setAjustes((a: any) => ({ ...a, testadores: v }))} linhas={3} mono placeholder="seu.usuario" dica="O @ do Instagram, um por linha. Essas contas recebem o direct de novo no mesmo post (para testar). As outras recebem uma vez só por post." />
          <Campo rotulo="Limite de directs por hora" tipo="number" min={10} max={750} valor={String(ajustes.limite_hora)} mudar={(v) => setAjustes((a: any) => ({ ...a, limite_hora: v }))} dica="Proteção da conta. O que passar fica na fila e sai na hora seguinte." />
        </>}
      </Modal>
    </div>
  );
}

// As versões da mensagem com os números: envios, cliques no link curto, seguidores novos e a chance de ser a melhor.
function Versoes({ g }: { g: any }) {
  const lista = g.por_versao || [];
  if (!lista.length) return null;
  // A chance só diz algo com alguns envios em cada versão ativa.
  const testando = lista.filter((v: any) => v.ativa).length > 1 && lista.filter((v: any) => v.ativa).every((v: any) => v.enviados >= 10);
  return (
    <div className="versoes">
      {lista.map((v: any) => (
        <div className={`versao-linha${v.ativa ? '' : ' versao-pausada'}`} key={v.id}>
          <span className="versao-letra">{String(v.id).toUpperCase()}</span>
          <span className="versao-nome">{v.nome || 'Sem nome'}{!v.ativa && <span className="mudo"> (pausada)</span>}</span>
          <span className="metricas">
            <span><b>{numero(v.enviados)}</b> directs</span>
            <span><b>{numero(v.cliques)}</b> cliques{v.taxa_clique != null && <> ({v.taxa_clique}%)</>}</span>
            {g.modo === 'seguir' && <span><b>{numero(v.seguidores)}</b> seguidores novos</span>}
            {v.vendas > 0 && <span><b>{numero(v.vendas)}</b> {v.vendas === 1 ? 'venda' : 'vendas'}{v.vendas_centavos > 0 && <> ({(v.vendas_centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</>}</span>}
            {testando && v.ativa && v.chance_de_ser_a_melhor != null && <span><b>{v.chance_de_ser_a_melhor}%</b> de ser a melhor</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function EditorPalavra({ e, mudar, escreverIA, ocupado }: { e: any; mudar: (k: string, v: any) => void; escreverIA: () => void; ocupado: string | null }) {
  const { dados: recursos } = useCarregar(() => get('/conteudo/recursos?pagina=1'), []);
  const opcoes = [{ v: '', t: 'Nenhum (uso um link)' }, ...((recursos?.itens || []).map((r: any) => ({ v: r.id, t: `${r.titulo}${r.status !== 'publicado' ? ' (rascunho)' : ''}` })))];
  if (e.recurso_id && !opcoes.some((o) => o.v === e.recurso_id)) opcoes.push({ v: e.recurso_id, t: 'Recurso atual' });
  const en = e.perfil === 'en';
  // Perfil: o da peça (palavra de peça) ou o escolhido aqui, com a palavra desligada.
  const travado = !!e.peca_id || !!e.ativo;
  return <>
    {e.ativo && <Faixa tipo="aviso">Esta palavra está ligada: mudanças valem para os próximos directs. Para testar um texto novo, crie uma versão nova em vez de reescrever uma que já tem envios.</Faixa>}
    <Escolha rotulo="Perfil" valor={e.perfil || 'br'} mudar={(v) => mudar('perfil', v)} desativado={travado} opcoes={Object.entries(PERFIS).map(([v, p]) => ({ v, t: p.t }))}
      dica={e.peca_id ? 'Palavra de uma peça: o perfil é o da peça.' : e.ativo ? 'Desligue a palavra para mudar o perfil.' : en ? 'Responde só na conta em inglês, com as mensagens em inglês.' : 'Responde só na conta do Brasil, com as mensagens em português.'} />
    <div className="linha-campos">
      <Campo rotulo="Palavra" valor={e.palavra} mudar={(v) => mudar('palavra', v.toUpperCase())} placeholder="PROMPT" autoFocus={!e.id} dica="Curta e fácil de digitar. Acento e maiúscula não importam no comentário." />
      <Escolha rotulo="Rede" valor={e.rede} mudar={(v) => mudar('rede', v)} opcoes={[{ v: 'instagram', t: 'Instagram' }, { v: 'facebook', t: 'Facebook' }]} />
    </div>
    <Campo rotulo="Nome (opcional)" valor={e.nome} mudar={(v) => mudar('nome', v)} placeholder="Carrossel do Claude" dica="Só para a equipe achar a palavra." />
    {en ? <Campo rotulo="Link do material em inglês" valor={e.link} mudar={(v) => mudar('link', v)} placeholder="https://" dica="As páginas de recurso do site são em português: o direct do perfil em inglês manda este link, num botão." /> : <>
      <Escolha rotulo="Material (recurso do site)" valor={e.recurso_id} mudar={(v) => mudar('recurso_id', v)} opcoes={opcoes} dica="O direct manda o link da página do recurso, num botão. Ele precisa estar publicado." />
      {!e.recurso_id && <Campo rotulo="Ou um link" valor={e.link} mudar={(v) => mudar('link', v)} placeholder="https://" />}
    </>}
    <EditorVersoes e={e} mudar={mudar} escreverIA={escreverIA} ocupado={ocupado} />
    <AreaTexto rotulo="Posts (opcional)" valor={e.posts} mudar={(v) => mudar('posts', v)} linhas={2} mono dica="Ids dos posts no Instagram, um por linha. Vazio: vale para os posts dos últimos 30 dias que pedem a palavra na legenda." />
  </>;
}

// O modo de entregar, a resposta no comentário e as versões da mensagem (também no Novo post).
// No perfil em inglês (e.perfil 'en'), os exemplos dos campos e os botões fixos aparecem em inglês.
export function EditorVersoes({ e, mudar, escreverIA, ocupado }: { e: any; mudar: (k: string, v: any) => void; escreverIA: () => void; ocupado: string | null }) {
  const espera = e.modo === 'seguir' || e.modo === 'pergunta';
  const en = e.perfil === 'en';
  const ex = en ? EXEMPLOS_EN : EXEMPLOS_PT;
  const mudarVersao = (i: number, k: string, v: any) => mudar('variantes', e.variantes.map((x: any, j: number) => (j === i ? { ...x, [k]: v } : x)));
  const novaVersao = () => {
    const livre = LETRAS.split('').find((l) => !e.variantes.some((v: any) => v.id === l));
    if (!livre) return avisar('No máximo 8 versões por palavra.', 'erro');
    mudar('variantes', [...e.variantes, NOVA_VERSAO(livre)]);
  };
  return <>
    <Escolha rotulo="Como entrega" valor={e.modo} mudar={(v) => mudar('modo', v)} opcoes={Object.entries(MODOS).map(([v, m]) => ({ v, t: m.t }))} dica={MODOS[e.modo]?.dica} />
    <Marcar rotulo="Responder no comentário" valor={e.responder_publico} mudar={(v) => mudar('responder_publico', v)} dica="Uma resposta curta embaixo do comentário avisando que foi no direct. Ajuda o post." />
    {e.responder_publico && <Marcar rotulo="Resposta escrita pela IA para cada pessoa" valor={e.resposta_ia} mudar={(v) => mudar('resposta_ia', v)} dica="O Claude reage ao que a pessoa escreveu, no jeito da Setup. Se a IA falhar, vai uma das respostas da versão." />}

    <div className="versoes-topo">
      <h3>Versões da mensagem</h3>
      <button className="bt bt-mini" disabled={!e.palavra || ocupado === 'ia'} onClick={escreverIA} title={!e.palavra ? 'Escreva a palavra antes' : undefined}><Sparkles />{ocupado === 'ia' ? 'Escrevendo...' : 'Escrever com IA'}</button>
    </div>
    <p className="campo-dica" style={{ margin: '-4px 0 10px' }}>
      {en && <><b>Escreva em inglês</b> (é o perfil em inglês). </>}De 2 a 4 versões, uma diferença por vez. {'{usuario}'} vira o primeiro nome (a Meta só mostra depois do toque no botão; sem nome, some junto com a vírgula), {'{titulo}'} vira o nome do material. O link entra sozinho num botão e o mini curso num segundo botão: não escreva endereço.
    </p>
    {e.variantes.map((v: any, i: number) => (
      <div className="versao-cartao" key={v.id}>
        <div className="versao-cartao-topo">
          <span className="versao-letra">{String(v.id).toUpperCase()}</span>
          <input className="versao-nome-campo" value={v.nome} onChange={(ev) => mudarVersao(i, 'nome', ev.target.value)} placeholder="O que esta versão testa (ex.: gancho curioso)" aria-label={`Nome da versão ${v.id}`} />
          <label className="versao-ativa"><input type="checkbox" checked={v.ativa !== false} onChange={(ev) => mudarVersao(i, 'ativa', ev.target.checked)} />Ativa</label>
          {e.variantes.length > 1 && <button className="bt-icone" title="Tirar esta versão" aria-label={`Tirar a versão ${v.id}`} onClick={() => mudar('variantes', e.variantes.filter((_: any, j: number) => j !== i))}><Trash2 /></button>}
        </div>
        {espera ? <>
          <AreaTexto rotulo={e.modo === 'seguir' ? 'Primeiro direct (pede para seguir)' : 'Primeiro direct (a pergunta)'} valor={v.pergunta} mudar={(x) => mudarVersao(i, 'pergunta', x)} linhas={3}
            placeholder={e.modo === 'seguir' ? ex.seguir : ex.pergunta}
            dica={`Vai com o botão "${e.modo === 'seguir' ? ex.botaoSegui : ex.botaoQuero}". Sem link.`} />
          <AreaTexto rotulo="Mensagem com o material (depois do toque)" valor={v.depois} mudar={(x) => mudarVersao(i, 'depois', x)} linhas={2} placeholder={e.modo === 'seguir' ? ex.depoisSeguir : ex.depois} />
          {e.modo === 'seguir' && <AreaTexto rotulo="Lembrete (tocou sem seguir)" valor={v.lembrete} mudar={(x) => mudarVersao(i, 'lembrete', x)} linhas={2} placeholder={ex.lembrete} dica="Vazio: o lembrete padrão." />}
        </> : <AreaTexto rotulo="Direct com o material" valor={v.dm} mudar={(x) => mudarVersao(i, 'dm', x)} linhas={3} placeholder={ex.dm} />}
        <Campo rotulo="Texto do botão" valor={v.botao} mudar={(x) => mudarVersao(i, 'botao', x)} placeholder={ex.botao} dica="Até 20 letras (o emoji conta 2). Vazio: o padrão." />
        <AreaTexto rotulo="Respostas no comentário" valor={v.publico} mudar={(x) => mudarVersao(i, 'publico', x)} linhas={3} placeholder={ex.publico} dica={e.resposta_ia ? 'Uma por linha. Com a IA ligada, servem de exemplo do tom e de reserva.' : 'Uma por linha. O sistema sorteia.'} />
      </div>
    ))}
    <button className="bt bt-mini" onClick={novaVersao}><Plus />Nova versão</button>
    {e.variantes.length > 1 && <Escolha rotulo="Como escolher a versão" valor={e.estrategia} mudar={(v) => mudar('estrategia', v)} opcoes={[{ v: 'melhor', t: 'Mandar mais a que funciona' }, { v: 'igual', t: 'Sortear igual' }]} dica="Mandar mais a que funciona: cada versão recebe 25 envios e depois sai mais a que vende mais (clique e seguidor novo também contam, com peso menor), sem parar de testar as outras." />}
  </>;
}
