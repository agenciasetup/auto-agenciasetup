// Área de membros: montar cursos e trilhas (Montar.tsx), as ofertas do checkout, os cupons,
// os links rastreáveis (de onde veio cada venda), a caixa de saída dos e-mails e o visual do certificado.
import { useEffect, useState } from 'react';
import { ExternalLink, Link2, Plus, Save } from 'lucide-react';
import { get, patch, post, put } from '../nucleo/api';
import { Abas, AreaTexto, BotaoCopiar, Campo, Carregando, Celula, ErroCarga, Escolha, Etiqueta, Faixa, Grupo, Marcar, Modal, Titulo, Vazio, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { STATUS_EMAIL, centavosDe, dinheiro, doCampoData, haQuanto, numero, paraCampoData, textoDeCentavos } from '../nucleo/util';
import { useRota } from '../nucleo/roteador';
import { Montar, Trilhas } from './Montar';
import { Certificado } from './Certificado';

const ABAS = [{ id: 'aulas', t: 'Cursos e aulas' }, { id: 'trilhas', t: 'Trilhas' }, { id: 'ofertas', t: 'Ofertas' }, { id: 'cupons', t: 'Cupons' }, { id: 'links', t: 'Links rastreáveis' }, { id: 'emails', t: 'E-mails' }, { id: 'certificado', t: 'Certificado' }];

export default function Area() {
  const { rota } = useRota();
  const { pode } = useSessao();
  const abas = ABAS;
  const [aba, setAba] = useState(abas.some((a) => a.id === rota.busca.get('aba')) ? (rota.busca.get('aba') as string) : 'aulas');
  useEffect(() => { document.title = 'Área de membros | Painel Agência Setup'; }, []);
  return (
    <div className="tela">
      <Titulo titulo="Área de membros" sub="O que o aluno vê em curso.agenciasetup.com.br e como ele chega até lá." />
      <Abas abas={abas} atual={aba} mudar={setAba} />
      {aba === 'aulas' && <Montar />}
      {aba === 'trilhas' && <Trilhas />}
      {aba === 'ofertas' && <Ofertas />}
      {aba === 'cupons' && <Cupons />}
      {aba === 'links' && <Links />}
      {aba === 'emails' && <Emails />}
      {aba === 'certificado' && <Certificado />}
    </div>
  );
}

// ---------------------------------------------------------------- pagamento (Asaas)
export function Pagamento() {
  const { dados: s, erro, carregando, recarregar } = useCarregar(() => get('/pagamento'), []);
  const [chave, setChave] = useState('');
  const { ocupado, rodar } = useAcao();
  const salvar = () => rodar('chave', async () => { await post('/pagamento/chave', { chave: chave.trim() }); setChave(''); recarregar(); }, 'Chave conferida no Asaas e guardada.');
  const ligar = () => rodar('aviso', async () => { await post('/pagamento/aviso'); recarregar(); }, 'Aviso de pagamento ligado no Asaas.');
  if (erro) return <ErroCarga erro={erro} tentar={recarregar} />;
  if (carregando && !s) return <Carregando />;
  return <>
    {s.configurada && s.producao === false && <Faixa tipo="aviso">A chave guardada é do sandbox: o checkout não cobra de verdade.</Faixa>}
    <Grupo titulo="Chave do Asaas" rodape="A chave fica cifrada no banco e não aparece de novo, nem para a equipe nem para o Claude. Para trocar, é só colar outra.">
      <dl className="lista-dados" style={{ marginBottom: 14 }}>
        <dt>Situação</dt><dd>{s.configurada ? <Etiqueta cor="verde">Configurada</Etiqueta> : <Etiqueta cor="ambar">Falta a chave</Etiqueta>}</dd>
        {s.conta?.nome && <><dt>Conta</dt><dd>{s.conta.nome}{s.producao ? ' (produção)' : s.producao === false ? ' (sandbox)' : ''}</dd></>}
        {s.salva_em && <><dt>Guardada</dt><dd>{haQuanto(s.salva_em)}{s.origem ? ` · pelo ${s.origem}` : ''}</dd></>}
      </dl>
      <Campo rotulo={s.configurada ? 'Trocar a chave' : 'Cole a chave de API do Asaas'} tipo="password" valor={chave} mudar={setChave} mono placeholder="$aact_prod_..."
        dica="No Asaas: Integrações > Chaves de API > Gerar chave de API. Deixe desmarcada a opção de saque." />
      <button className="bt bt-tinta" disabled={!!ocupado || chave.trim().length < 30} onClick={salvar}><Save />Conferir e guardar</button>
    </Grupo>
    <Grupo titulo="Aviso de pagamento" rodape="O Asaas avisa o site quando um Pix cai, um cartão é aprovado, um reembolso sai ou alguém contesta. É isso que libera o acesso sozinho.">
      <dl className="lista-dados" style={{ marginBottom: 14 }}>
        <dt>Situação</dt><dd>{s.aviso ? <Etiqueta cor="verde">Ligado</Etiqueta> : <Etiqueta cor="ambar">Desligado</Etiqueta>}</dd>
        <dt>Endereço</dt><dd className="mono">{s.aviso?.url || s.aviso_url}</dd>
        {s.aviso?.em && <><dt>Ligado</dt><dd>{haQuanto(s.aviso.em)}{s.aviso.eventos ? ` · ${s.aviso.eventos} tipos de aviso` : ''}</dd></>}
      </dl>
      <button className="bt" disabled={!!ocupado || !s.configurada} onClick={ligar}>{s.aviso ? 'Ligar de novo (troca o token)' : 'Ligar o aviso no Asaas'}</button>
    </Grupo>
    <Grupo titulo="Quem mora fora do Brasil" rodape="Ligado, o checkout mostra o link “Moro fora do Brasil / não tenho CPF”: a pessoa escolhe o país, põe o celular com o código do país e paga no cartão internacional, à vista, em reais. Sem Pix e sem parcelas, que é a regra do Asaas para pagador estrangeiro.">
      {s.estrangeiros_local && <Faixa tipo="aviso">No computador, ESTRANGEIROS=1 no .dev.vars deixa ligado na memória, seja qual for a escolha abaixo.</Faixa>}
      <Marcar rotulo="Aceitar compra de quem mora fora do Brasil (precisa da liberação do Asaas)" valor={!!s.estrangeiros} desativado={!!ocupado}
        mudar={(v) => rodar('estrangeiros', async () => { await post('/pagamento/estrangeiros', { ligado: v }); recarregar(); }, v ? 'Compra de fora do Brasil ligada.' : 'Compra de fora do Brasil desligada.')}
        dica={<>Só ligue depois que o Asaas liberar “Pagadores estrangeiros” na conta (pedido em análise, protocolo 1921730). Sem a liberação, a compra de fora falha no Asaas.{s.estrangeiros_em ? ` Mudado ${haQuanto(s.estrangeiros_em)}.` : ''}</>} />
    </Grupo>
  </>;
}

// ---------------------------------------------------------------- ofertas
function Ofertas() {
  const { pode, eu } = useSessao();
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/area/ofertas'), []);
  const cursos = useCarregar(() => get('/area/cursos'), []);
  const produtos = useCarregar(() => get('/produtos'), []);
  const [o, setO] = useState<any>(null);
  const [nova, setNova] = useState<any>(null);
  const { ocupado, rodar } = useAcao();
  const site = eu.site?.url || location.origin;

  const abrir = async (x: any) => {
    const [acessos, bumps] = await Promise.all([get(`/area/produtos/${x.produto_id}/acessos`).catch(() => []), get(`/area/ofertas/${x.id}/bumps`).catch(() => [])]);
    const c = x.checkout || {};
    setO({
      ...x, preco: textoDeCentavos(x.preco_centavos), preco_de: textoDeCentavos(x.preco_de_centavos), juros: String((Number(x.juros_mes) * 100).toFixed(2)).replace('.', ','),
      acessos: (acessos as any[]).map((a) => ({ curso_id: a.curso_id, dias: a.dias || '' })),
      bumps: (bumps as any[]).map((b) => ({ bump_id: b.bump_id, titulo: b.titulo, texto: b.texto || '' })),
      subtitulo: c.subtitulo || '', inclui: (c.inclui || []).join('\n'), vagas: c.vagas || 1, presente: c.presente !== false,
      upsell: c.upsell || { oferta: '', titulo: '', texto: '' }, downsell: c.downsell || { oferta: '', titulo: '', texto: '' },
      upgrade_de: c.upgrade?.de_produto_id || '', upgrade_desconto: textoDeCentavos(c.upgrade?.desconto_centavos),
      bump_em: { oferta: c.bump_em?.[0]?.oferta || '', titulo: c.bump_em?.[0]?.titulo || '', texto: c.bump_em?.[0]?.texto || '' }, etq: !!c.etiqueta, etq_cursos: c.etiqueta?.cursos || [], etq_rotulo: c.etiqueta?.rotulo || '',
      etq_acao: c.etiqueta?.acao || '', etq_texto: c.etiqueta?.texto || '', etq_vsl: c.etiqueta?.vsl_bunny || '',
    });
  };
  const salvar = () => rodar('oferta', async () => {
    const preco = centavosDe(o.preco);
    if (!preco || preco < 100) throw new Error('O preço mínimo é R$ 1,00.');
    const vsl = String(o.etq_vsl || '').trim();
    if (o.etq && vsl && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vsl)) throw new Error('O id do vídeo no Bunny tem 36 letras e números, com hífens (ex.: 1a2b3c4d-...).');
    const checkout = {
      ...(o.checkout || {}), subtitulo: o.subtitulo || undefined, inclui: String(o.inclui || '').split('\n').map((l) => l.trim()).filter(Boolean),
      vagas: Math.max(1, Number(o.vagas) || 1), presente: !!o.presente,
      upsell: o.upsell.oferta ? o.upsell : undefined, downsell: o.downsell.oferta ? o.downsell : undefined,
      upgrade: o.upgrade_de ? { de_produto_id: o.upgrade_de, desconto_centavos: centavosDe(o.upgrade_desconto) || 0 } : undefined,
      bump_em: o.bump_em.oferta ? [{ oferta: o.bump_em.oferta, titulo: o.bump_em.titulo.trim() || undefined, texto: o.bump_em.texto.trim() || undefined }] : undefined,
      etiqueta: o.etq ? { cursos: o.etq_cursos, rotulo: o.etq_rotulo.trim() || undefined, acao: o.etq_acao.trim() || undefined, texto: o.etq_texto.trim(), vsl_bunny: vsl || null } : undefined,
    };
    await patch(`/area/ofertas/${o.id}`, {
      nome: o.nome, preco_centavos: preco, preco_de_centavos: centavosDe(o.preco_de), parcelas_max: Number(o.parcelas_max),
      juros_mes: (Number(String(o.juros).replace(',', '.')) || 0) / 100, pix_desconto_pct: Number(o.pix_desconto_pct), pix_minutos: Number(o.pix_minutos),
      garantia_dias: Number(o.garantia_dias), metodos: o.metodos, ativa: o.ativa, checkout,
    });
    await put(`/area/produtos/${o.produto_id}/acessos`, { acessos: o.acessos.filter((a: any) => a.curso_id) });
    await put(`/area/ofertas/${o.id}/bumps`, { bumps: o.bumps.filter((b: any) => b.bump_id) });
    setO(null); recarregar();
  }, 'Oferta salva.');
  const criar = () => rodar('nova', async () => {
    const preco = centavosDe(nova.preco);
    const r = await post('/area/ofertas', { nome: nova.nome, preco_centavos: preco, produto_id: nova.produto_id || null, produto_nome: nova.produto_id ? null : nova.nome });
    setNova(null); recarregar(); produtos.recarregar(); abrir(r);
  }, 'Oferta criada (desligada). Escolha o que ela libera.');
  const metodo = (m: string, sim: boolean) => setO({ ...o, metodos: sim ? [...new Set([...o.metodos, m])] : o.metodos.filter((x: string) => x !== m) });
  const outras = (dados || []).filter((x: any) => !o || x.id !== o.id).map((x: any) => ({ v: x.slug, t: `${x.nome} (${dinheiro(x.preco_centavos)})` }));
  const outrasId = (dados || []).filter((x: any) => !o || x.id !== o.id).map((x: any) => ({ v: x.id, t: `${x.nome} (${dinheiro(x.preco_centavos)})` }));
  const listaCursos = ((cursos.dados as any[]) || []).map((c: any) => ({ v: c.id, t: c.titulo }));
  const listaCursosSlug = ((cursos.dados as any[]) || []).filter((c: any) => c.slug).map((c: any) => ({ v: c.slug, t: c.titulo }));
  const listaProdutos = ((produtos.dados as any[]) || []).map((p: any) => ({ v: p.id, t: p.nome }));

  if (erro) return <ErroCarga erro={erro} tentar={recarregar} />;
  if (carregando && !dados) return <Carregando />;
  return <>
    {pode('ofertas.editar') ? <div className="barra-acoes" style={{ marginBottom: 12 }}><button className="bt bt-tinta" onClick={() => setNova({ nome: '', preco: '', produto_id: '' })}><Plus />Nova oferta</button></div> : null}
    {!dados?.length ? <Vazio titulo="Nenhuma oferta ainda." /> : (
      <Grupo rodape="Oferta desligada não vende: o checkout mostra que as vendas estão fechadas. No computador dá para testar mesmo desligada. Combo = produto que libera vários cursos.">
        {dados.map((x: any) => (
          <Celula key={x.id} onClick={pode('ofertas.editar') ? () => abrir(x) : undefined}
            titulo={x.nome}
            sub={`${dinheiro(x.preco_centavos)} · até ${x.parcelas_max}x · Pix ${Number(x.pix_desconto_pct) ? `com ${Number(x.pix_desconto_pct)}% de desconto` : 'sem desconto'} · /checkout/${x.slug}${x.checkout?.upsell ? ' · com upsell' : ''}${(x.checkout?.vagas || 1) > 1 ? ` · ${x.checkout.vagas} vagas` : ''}`}
            direita={x.ativa ? <Etiqueta cor="verde">Vendendo</Etiqueta> : <Etiqueta>Desligada</Etiqueta>} />
        ))}
      </Grupo>
    )}

    <Modal titulo="Nova oferta" aberto={!!nova} fechar={() => setNova(null)}
      rodape={<><button className="bt bt-texto" onClick={() => setNova(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado || !nova?.nome.trim() || !centavosDe(nova?.preco || '')} onClick={criar}><Plus />Criar</button></>}>
      {nova && <>
        <Campo rotulo="Nome da oferta" valor={nova.nome} mudar={(v) => setNova({ ...nova, nome: v })} placeholder="Ex.: Combo Black Friday" />
        <Campo rotulo="Preço (R$)" valor={nova.preco} mudar={(v) => setNova({ ...nova, preco: v })} />
        <Escolha rotulo="Produto" valor={nova.produto_id} mudar={(v) => setNova({ ...nova, produto_id: v })} opcoes={[{ v: '', t: 'Um produto novo com este nome' }, ...listaProdutos]} dica="Combo, upgrade ou upsell: crie um produto novo e escolha os cursos que ele libera." />
      </>}
    </Modal>

    <Modal titulo={o ? o.nome : ''} aberto={!!o} fechar={() => setO(null)}
      rodape={<><a className="bt bt-texto" href={o ? `${site}/checkout/${o.slug}` : '#'} target="_blank" rel="noreferrer"><ExternalLink />Ver o checkout</a><button className="bt bt-tinta" disabled={!!ocupado} onClick={salvar}><Save />Salvar</button></>}>
      {o && <>
        <Campo rotulo="Nome" valor={o.nome} mudar={(v) => setO({ ...o, nome: v })} />
        <div className="campos-lado">
          <Campo rotulo="Preço (R$)" valor={o.preco} mudar={(v) => setO({ ...o, preco: v })} />
          <Campo rotulo="Preço riscado (R$)" valor={o.preco_de} mudar={(v) => setO({ ...o, preco_de: v })} dica="Opcional. Em branco: sem preço riscado." />
        </div>
        <div className="campos-lado">
          <Campo rotulo="Parcelas no cartão" tipo="number" min={1} max={21} valor={o.parcelas_max} mudar={(v) => setO({ ...o, parcelas_max: v })} />
          <Campo rotulo="Juros ao mês (%)" valor={o.juros} mudar={(v) => setO({ ...o, juros: v })} dica="Repassa a taxa do parcelamento. 0 = sem juros (você paga a taxa)." />
        </div>
        <div className="campos-lado">
          <Campo rotulo="Desconto no Pix (%)" tipo="number" min={0} max={50} valor={o.pix_desconto_pct} mudar={(v) => setO({ ...o, pix_desconto_pct: v })} />
          <Campo rotulo="Pix vence em (minutos)" tipo="number" min={5} max={1440} valor={o.pix_minutos} mudar={(v) => setO({ ...o, pix_minutos: v })} />
        </div>
        <Campo rotulo="Garantia (dias)" tipo="number" min={7} valor={o.garantia_dias} mudar={(v) => setO({ ...o, garantia_dias: v })} dica="O mínimo pela lei é 7 dias." />
        <Marcar rotulo="Aceita Pix" valor={o.metodos.includes('pix')} mudar={(v) => metodo('pix', v)} />
        <Marcar rotulo="Aceita cartão" valor={o.metodos.includes('cartao')} mudar={(v) => metodo('cartao', v)} />

        <h3 className="sub-titulo">O que esta oferta libera</h3>
        {o.acessos.map((a: any, i: number) => (
          <div key={i} className="campos-lado">
            <Escolha rotulo="Curso" valor={a.curso_id} mudar={(v) => setO({ ...o, acessos: o.acessos.map((y: any, k: number) => (k === i ? { ...y, curso_id: v } : y)) })} opcoes={[{ v: '', t: 'Tirar' }, ...listaCursos]} />
            <Campo rotulo="Dias de acesso" tipo="number" min={1} valor={a.dias} mudar={(v) => setO({ ...o, acessos: o.acessos.map((y: any, k: number) => (k === i ? { ...y, dias: v } : y)) })} dica="Em branco: sem prazo." />
          </div>
        ))}
        <button type="button" className="bt bt-mini" onClick={() => setO({ ...o, acessos: [...o.acessos, { curso_id: '', dias: 365 }] })}><Plus />Pôr outro curso (combo)</button>

        <h3 className="sub-titulo">Página do checkout</h3>
        <Campo rotulo="Frase embaixo do nome" valor={o.subtitulo} mudar={(v) => setO({ ...o, subtitulo: v })} placeholder="Acesso começa na hora" />
        <AreaTexto rotulo="O que a pessoa recebe (uma linha por item)" valor={o.inclui} mudar={(v) => setO({ ...o, inclui: v })} linhas={4} />
        <Marcar rotulo="Deixar comprar de presente" valor={o.presente} mudar={(v) => setO({ ...o, presente: v })} dica="A pessoa marca 'É para dar de presente' e o acesso vai para o e-mail de quem ganha." />
        <Campo rotulo="Vagas (plano equipe)" tipo="number" min={1} max={50} valor={o.vagas} mudar={(v) => setO({ ...o, vagas: v })} dica="1 = uma pessoa. Com 3 ou 5, quem compra libera as vagas para a equipe na área dele." />

        <h3 className="sub-titulo">Order bump (até 2)</h3>
        {o.bumps.map((b: any, i: number) => (
          <div key={i} className="caixa-sub">
            <Escolha rotulo="Leva junto" valor={b.bump_id} mudar={(v) => setO({ ...o, bumps: o.bumps.map((y: any, k: number) => (k === i ? { ...y, bump_id: v } : y)) })} opcoes={[{ v: '', t: 'Tirar' }, ...outrasId]} />
            <Campo rotulo="Título da caixinha" valor={b.titulo} mudar={(v) => setO({ ...o, bumps: o.bumps.map((y: any, k: number) => (k === i ? { ...y, titulo: v } : y)) })} />
            <Campo rotulo="Texto (opcional)" valor={b.texto} mudar={(v) => setO({ ...o, bumps: o.bumps.map((y: any, k: number) => (k === i ? { ...y, texto: v } : y)) })} />
          </div>
        ))}
        {o.bumps.length < 2 ? <button type="button" className="bt bt-mini" onClick={() => setO({ ...o, bumps: [...o.bumps, { bump_id: '', titulo: 'Leve junto', texto: '' }] })}><Plus />Pôr order bump</button> : null}

        <h3 className="sub-titulo">Etiqueta em cima dos vídeos</h3>
        <Marcar rotulo="Mostrar a etiqueta nas aulas" valor={o.etq} mudar={(v) => setO({ ...o, etq: v })} dica={'"✨ Vídeo e voz gerados com IA | Aprender" em cima do vídeo das aulas. Tocou, abre a mini VSL, o texto, o preço e o botão de comprar. Só aparece com esta oferta ligada; quem já tem o curso vê "Ir para o curso".'} />
        {o.etq ? <div className="caixa-sub">
          {listaCursosSlug.map((c) => <Marcar key={c.v} rotulo={`Nas aulas de: ${c.t}`} valor={o.etq_cursos.includes(c.v)} mudar={(v) => setO({ ...o, etq_cursos: v ? [...o.etq_cursos, c.v] : o.etq_cursos.filter((x: string) => x !== c.v) })} />)}
          <div className="campos-lado">
            <Campo rotulo="Etiqueta" valor={o.etq_rotulo} mudar={(v) => setO({ ...o, etq_rotulo: v })} placeholder="Vídeo e voz gerados com IA" />
            <Campo rotulo="Depois da barra" valor={o.etq_acao} mudar={(v) => setO({ ...o, etq_acao: v })} placeholder="Aprender" />
          </div>
          <AreaTexto rotulo="Texto do painel" valor={o.etq_texto} mudar={(v) => setO({ ...o, etq_texto: v })} linhas={3} />
          <Campo rotulo="Id da mini VSL no Bunny" valor={o.etq_vsl} mudar={(v) => setO({ ...o, etq_vsl: v })} mono dica="Em branco, o painel mostra só o texto, o preço e o botão." />
        </div> : null}
        <h3 className="sub-titulo">Esta oferta como order bump de outra</h3>
        <div className="caixa-sub">
          <Escolha rotulo="No checkout de" valor={o.bump_em.oferta} mudar={(v) => setO({ ...o, bump_em: { ...o.bump_em, oferta: v } })} opcoes={[{ v: '', t: 'Nenhum' }, ...outras]} dica="Para curso que também se vende sozinho. Aparece só com esta oferta ligada (o order bump de cima aparece sempre)." />
          {o.bump_em.oferta ? <><Campo rotulo="Título da caixinha" valor={o.bump_em.titulo} mudar={(v) => setO({ ...o, bump_em: { ...o.bump_em, titulo: v } })} placeholder={`Leve junto: ${o.nome}`} /><Campo rotulo="Texto (opcional)" valor={o.bump_em.texto} mudar={(v) => setO({ ...o, bump_em: { ...o.bump_em, texto: v } })} /></> : null}
        </div>

        <h3 className="sub-titulo">Depois de pagar (1 toque, Pix na hora)</h3>
        {(['upsell', 'downsell'] as const).map((q) => (
          <div key={q} className="caixa-sub">
            <Escolha rotulo={q === 'upsell' ? 'Upsell' : 'Downsell (se recusar o upsell)'} valor={o[q].oferta} mudar={(v) => setO({ ...o, [q]: { ...o[q], oferta: v } })} opcoes={[{ v: '', t: 'Nenhum' }, ...outras]} />
            {o[q].oferta ? <><Campo rotulo="Título" valor={o[q].titulo} mudar={(v) => setO({ ...o, [q]: { ...o[q], titulo: v } })} /><Campo rotulo="Texto" valor={o[q].texto} mudar={(v) => setO({ ...o, [q]: { ...o[q], texto: v } })} /></> : null}
          </div>
        ))}

        <h3 className="sub-titulo">Upgrade (quem já tem paga a diferença)</h3>
        <div className="campos-lado">
          <Escolha rotulo="Quem tem o produto" valor={o.upgrade_de} mudar={(v) => setO({ ...o, upgrade_de: v })} opcoes={[{ v: '', t: 'Sem upgrade' }, ...listaProdutos.filter((p) => p.v !== o.produto_id)]} />
          <Campo rotulo="Desconto (R$)" valor={o.upgrade_desconto} mudar={(v) => setO({ ...o, upgrade_desconto: v })} dica="Normalmente o preço do produto anterior." />
        </div>

        <h3 className="sub-titulo">Vendas</h3>
        <Marcar rotulo="Oferta ligada (vendendo)" valor={o.ativa} mudar={(v) => setO({ ...o, ativa: v })} dica="Ligada, o checkout aceita compras de verdade." />
        {o.ativa && <Faixa tipo="aviso">Com a oferta ligada, quem abrir o checkout paga de verdade. Ligue só depois do teste de compra.</Faixa>}
      </>}
    </Modal>
  </>;
}

// ---------------------------------------------------------------- cupons
function Cupons() {
  const { pode } = useSessao();
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/area/cupons'), []);
  const ofertas = useCarregar(() => get('/area/ofertas'), []);
  const [c, setC] = useState<any>(null);
  const { ocupado, rodar } = useAcao();
  const salvar = () => rodar('cupom', async () => {
    const corpo = { tipo: c.tipo, valor: c.tipo === 'pct' ? Number(c.valor) : (centavosDe(c.valor) || 0) / 100, ofertas: c.oferta ? [c.oferta] : [], limite: c.limite || null, valido_ate: doCampoData(c.valido_ate), primeira_compra: c.primeira_compra, ativo: c.ativo, descricao: c.descricao || null };
    if (c.existe) await patch(`/area/cupons/${c.codigo}`, corpo); else await post('/area/cupons', { ...corpo, codigo: c.codigo });
    setC(null); recarregar();
  }, 'Cupom salvo.');
  if (erro) return <ErroCarga erro={erro} tentar={recarregar} />;
  if (carregando && !dados) return <Carregando />;
  return <>
    {pode('ofertas.editar') ? <div className="barra-acoes" style={{ marginBottom: 12 }}><button className="bt bt-tinta" onClick={() => setC({ codigo: '', tipo: 'pct', valor: '10', oferta: '', limite: '', valido_ate: '', primeira_compra: false, ativo: true, descricao: '' })}><Plus />Novo cupom</button></div> : null}
    {dados?.length ? (
      <Grupo>
        {dados.map((x: any) => <Celula key={x.codigo} titulo={x.codigo} sub={`${x.tipo === 'pct' ? `${Number(x.valor)}% de desconto` : `${dinheiro(Math.round(Number(x.valor) * 100))} de desconto`} · ${x.usos}${x.limite ? ` de ${x.limite}` : ''} usos${x.valido_ate ? ` · até ${new Date(x.valido_ate).toLocaleDateString('pt-BR')}` : ''}${x.primeira_compra ? ' · só primeira compra' : ''}`}
          direita={x.ativo ? <Etiqueta cor="verde">Ativo</Etiqueta> : <Etiqueta>Desligado</Etiqueta>}
          onClick={pode('ofertas.editar') ? () => setC({ ...x, existe: true, valor: x.tipo === 'pct' ? String(Number(x.valor)) : textoDeCentavos(Math.round(Number(x.valor) * 100)), oferta: (x.ofertas || [])[0] || '', limite: x.limite || '', valido_ate: paraCampoData(x.valido_ate) }) : undefined} />)}
      </Grupo>
    ) : <Vazio titulo="Nenhum cupom ainda." texto="Percentual ou valor, por oferta, com limite de usos, validade e 'só na primeira compra'." />}
    <Modal titulo={c?.existe ? `Cupom ${c.codigo}` : 'Novo cupom'} aberto={!!c} fechar={() => setC(null)}
      rodape={<><button className="bt bt-texto" onClick={() => setC(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado || !c?.codigo} onClick={salvar}><Save />Salvar</button></>}>
      {c && <>
        <Campo rotulo="Código" valor={c.codigo} mudar={(v) => setC({ ...c, codigo: v.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} desativado={c.existe} mono />
        <div className="campos-lado">
          <Escolha rotulo="Tipo" valor={c.tipo} mudar={(v) => setC({ ...c, tipo: v })} opcoes={[{ v: 'pct', t: 'Percentual (%)' }, { v: 'valor', t: 'Valor (R$)' }]} />
          <Campo rotulo={c.tipo === 'pct' ? 'Desconto (%)' : 'Desconto (R$)'} valor={c.valor} mudar={(v) => setC({ ...c, valor: v })} />
        </div>
        <Escolha rotulo="Vale para" valor={c.oferta} mudar={(v) => setC({ ...c, oferta: v })} opcoes={[{ v: '', t: 'Todas as ofertas' }, ...((ofertas.dados as any[]) || []).map((o: any) => ({ v: o.id, t: o.nome }))]} />
        <div className="campos-lado">
          <Campo rotulo="Limite de usos" tipo="number" min={1} valor={c.limite} mudar={(v) => setC({ ...c, limite: v })} dica="Em branco: sem limite." />
          <Campo rotulo="Vale até" tipo="datetime-local" valor={c.valido_ate} mudar={(v) => setC({ ...c, valido_ate: v })} />
        </div>
        <Marcar rotulo="Só na primeira compra" valor={c.primeira_compra} mudar={(v) => setC({ ...c, primeira_compra: v })} />
        <Marcar rotulo="Ativo" valor={c.ativo} mudar={(v) => setC({ ...c, ativo: v })} />
      </>}
    </Modal>
  </>;
}

// ---------------------------------------------------------------- links rastreáveis
function Links() {
  const { pode, eu } = useSessao();
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/area/links'), []);
  const [novo, setNovo] = useState<any>(null);
  const { ocupado, rodar } = useAcao();
  const site = eu.site?.url || location.origin;

  const criar = () => rodar('link', async () => {
    await post('/area/links', novo);
    setNovo(null); recarregar();
  }, 'Link criado.');

  if (erro) return <ErroCarga erro={erro} tentar={recarregar} />;
  if (carregando && !dados) return <Carregando />;
  return <>
    <Grupo titulo="Links curtos com marca de origem"
      acoes={pode('cursos.editar') ? <button className="bt bt-mini bt-tinta" onClick={() => setNovo({ codigo: '', destino: '/checkout/posts-automaticos', utm_source: 'instagram', utm_medium: 'bio', utm_campaign: '', utm_content: '' })}><Plus />Novo link</button> : undefined}
      rodape="Use um link por lugar (bio, stories, post, anúncio). A venda que vier dele aparece em Vendas com essa origem.">
      {dados?.length ? dados.map((l: any) => (
        <div key={l.codigo} className="linha-pequena linha-acao" style={{ padding: '10px 0' }}>
          <span><b className="mono">/l/{l.codigo}</b> <span className="mudo">→ {l.destino} · {[l.utm_source, l.utm_medium, l.utm_campaign, l.utm_content].filter(Boolean).join(' · ')}</span></span>
          <span><span className="mudo">{numero(l.cliques)} cliques</span> <BotaoCopiar texto={`${site}/l/${l.codigo}`} classe="bt bt-mini" /></span>
        </div>
      )) : <Vazio titulo="Nenhum link ainda." icone={<Link2 />} />}
    </Grupo>

    <Modal titulo="Novo link rastreável" aberto={!!novo} fechar={() => setNovo(null)}
      rodape={<><button className="bt bt-texto" onClick={() => setNovo(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado} onClick={criar}><Plus />Criar link</button></>}>
      {novo && <>
        <Campo rotulo="Código" valor={novo.codigo} mudar={(v) => setNovo({ ...novo, codigo: v.toLowerCase().replace(/[^a-z0-9-]/g, '') })} mono autoFocus
          dica={`O link fica ${site}/l/${novo.codigo || 'codigo'}`} />
        <Campo rotulo="Leva para" valor={novo.destino} mudar={(v) => setNovo({ ...novo, destino: v })} mono dica="Endereço do site começando com /. Ex.: /checkout/posts-automaticos ou /cursos." />
        <div className="campos-lado">
          <Campo rotulo="Origem (utm_source)" valor={novo.utm_source} mudar={(v) => setNovo({ ...novo, utm_source: v })} dica="instagram, youtube, tiktok, email" />
          <Campo rotulo="Meio (utm_medium)" valor={novo.utm_medium} mudar={(v) => setNovo({ ...novo, utm_medium: v })} dica="bio, stories, post, anuncio, dm" />
        </div>
        <div className="campos-lado">
          <Campo rotulo="Campanha (utm_campaign)" valor={novo.utm_campaign} mudar={(v) => setNovo({ ...novo, utm_campaign: v })} dica="Ex.: lancamento-outubro" />
          <Campo rotulo="Conteúdo (utm_content)" valor={novo.utm_content} mudar={(v) => setNovo({ ...novo, utm_content: v })} dica="Qual peça. Ex.: carrossel-claude" />
        </div>
      </>}
    </Modal>
  </>;
}

// ---------------------------------------------------------------- e-mails
function Emails() {
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/area/emails'), []);
  const [ver, setVer] = useState<any>(null);
  if (erro) return <ErroCarga erro={erro} tentar={recarregar} />;
  if (carregando && !dados) return <Carregando />;
  return <>
    {dados?.some((e: any) => e.status === 'simulado') && <Faixa tipo="info">E-mail "Simulado" não saiu de verdade: falta ligar o envio (Resend). O link de entrada continua valendo pelo painel, em Alunos.</Faixa>}
    <Grupo>
      {dados?.length ? dados.map((e: any) => (
        <Celula key={e.id} onClick={() => setVer(e)} titulo={e.assunto} sub={`${e.para} · ${haQuanto(e.criado_em)}${e.erro ? ` · ${e.erro}` : ''}`}
          direita={<Etiqueta cor={STATUS_EMAIL[e.status]?.cor}>{STATUS_EMAIL[e.status]?.t || e.status}</Etiqueta>} />
      )) : <Vazio titulo="Nenhum e-mail enviado ainda." />}
    </Grupo>
    <Modal titulo={ver ? ver.assunto : ''} aberto={!!ver} fechar={() => setVer(null)} rodape={<button className="bt bt-tinta" onClick={() => setVer(null)}>Fechar</button>}>
      {ver && <>
        <p className="mudo" style={{ marginTop: 0 }}>Para {ver.para} · {haQuanto(ver.criado_em)}</p>
        <iframe title="Prévia do e-mail" className="previa-email" sandbox="" srcDoc={ver.html || ''} />
      </>}
    </Modal>
  </>;
}

