// Integrações (só Administrador): cada serviço com a sua chave, conferida no próprio serviço e guardada cifrada.
// As chaves nunca voltam para a tela nem para o Claude; aqui só aparece "guardada" e o resultado do teste.
// No fim, os webhooks de saída: avisos para o n8n, Make ou Zapier quando alguém compra, entra ou conclui.
import { useEffect, useState } from 'react';
import { Plus, Save, Send } from 'lucide-react';
import { get, patch, post } from '../nucleo/api';
import { AreaTexto, Campo, Carregando, Celula, ErroCarga, Escolha, Etiqueta, Faixa, Grupo, Marcar, Modal, Segredo, Titulo, Vazio, useAcao, useCarregar } from '../nucleo/ui';
import { haQuanto, numero } from '../nucleo/util';
import { Pagamento } from './Area';

type Def = { titulo: string; ajuda: string; campos: { k: string; t: string; tipo?: string; dica?: string; ph?: string; segredo?: boolean; area?: boolean }[] };
const DEFS: Record<string, Def> = {
  email: {
    titulo: 'Resend (e-mail)', ajuda: 'Manda o acesso, o código de entrada, o certificado, as respostas e os lembretes. Domínio de envio: envio.agenciasetup.com.br.',
    campos: [
      { k: 'chave', t: 'Chave de API do Resend', segredo: true, ph: 're_...', dica: 'No Resend: API Keys > Create API key, permissão "Sending access".' },
      { k: 'de', t: 'Remetente', ph: 'Agência Setup <cursos@envio.agenciasetup.com.br>' },
      { k: 'responder_para', t: 'Respostas vão para', ph: 'contato@agenciasetup.com.br' },
      { k: 'dominio', t: 'Domínio de envio', ph: 'envio.agenciasetup.com.br' },
    ],
  },
  ia: {
    titulo: 'Claude (tutor de IA)', ajuda: 'O tutor responde dúvidas de cada aula, lê print e cita o minuto. Defina o modelo, o limite por aluno e o teto de gasto do mês.',
    campos: [
      { k: 'chave', t: 'Chave da API da Anthropic', segredo: true, ph: 'sk-ant-...', dica: 'Em console.anthropic.com > API keys.' },
      { k: 'limite_dia', t: 'Perguntas por aluno por dia', tipo: 'number' },
      { k: 'teto_mes_usd', t: 'Teto de gasto por mês (US$)', tipo: 'number', dica: 'Chegou no teto, o tutor pausa até o mês virar e as dúvidas vão para a equipe.' },
      { k: 'instrucoes', t: 'Orientações extras para o tutor (opcional)', area: true },
    ],
  },
  bunny: {
    titulo: 'Bunny Stream (vídeos)', ajuda: 'O player das aulas, com o link assinado (só toca no curso). Tem a vez sobre o Panda na aula que tiver o vídeo nos dois. Os vídeos sobem pelo script scripts/bunny.mjs.',
    campos: [
      { k: 'biblioteca', t: 'Número da biblioteca', ph: '788430', dica: 'Aparece no endereço da biblioteca no Bunny: /stream/<número>/.' },
      { k: 'chave', t: 'Chave da API da biblioteca', segredo: true, dica: 'No Bunny: Stream > a biblioteca > API > API Key.' },
      { k: 'token', t: 'Chave do token (Token authentication key)', segredo: true, dica: 'No Bunny: Stream > a biblioteca > Security > General, no fim da página.' },
    ],
  },
  panda: {
    titulo: 'Panda Video', ajuda: 'Outro player possível para as aulas. Depois de ligar, cole o id de cada vídeo em Área de membros > Cursos e aulas.',
    campos: [
      { k: 'chave', t: 'Chave da API do Panda', segredo: true, dica: 'No Panda: Configurações > API.' },
      { k: 'biblioteca', t: 'Id da biblioteca', ph: 'ex.: 3f2a1b9c-...', dica: 'A parte depois de "player-" no link de incorporar.' },
    ],
  },
  stripe: {
    titulo: 'Stripe (venda em dólar)', ajuda: 'O curso em inglês (agenciasetup.com) cobra em US$ pelo Stripe: cartão, Apple Pay e Google Pay na página segura deles. O Stripe repassa em real para a conta. O aviso de pagamento se liga pelo script scripts/stripe.mjs aviso, que guarda o segredo dele aqui.',
    campos: [
      { k: 'chave', t: 'Chave restrita do Stripe', segredo: true, ph: 'rk_live_...', dica: 'No Stripe: Desenvolvedores > Chaves da API > Criar chave restrita, com Checkout Sessions, Charges and Refunds, Customers e Webhook Endpoints em Gravação, e Payment Intents e Events em Leitura.' },
    ],
  },
  turnstile: {
    titulo: 'Turnstile (checkout sem robô)', ajuda: 'O "não sou robô" invisível da Cloudflare. Protege o checkout de robôs testando cartão roubado.',
    campos: [
      { k: 'site', t: 'Chave do site', ph: '0x...' },
      { k: 'segredo', t: 'Chave secreta', segredo: true, ph: '0x...' },
    ],
  },
  nota_fiscal: {
    titulo: 'Nota fiscal (Asaas)', ajuda: 'Emite a nota de serviço de cada venda paga pelo Asaas (R$ 0,49 por nota). Antes, preencha os dados fiscais da empresa no Asaas (Minha conta > Configurações fiscais).',
    campos: [
      { k: 'servico_codigo', t: 'Código do serviço na prefeitura', ph: '1.05', dica: 'Confirme com o contador o código de cursos on-line da sua cidade.' },
      { k: 'servico_nome', t: 'Nome do serviço', ph: 'Ensino a distância' },
      { k: 'descricao', t: 'Descrição na nota', ph: 'Curso on-line: Posts automáticos com Claude' },
      { k: 'iss_pct', t: 'ISS (%)', tipo: 'number' },
      { k: 'observacoes', t: 'Observações (opcional)' },
    ],
  },
  search_console: {
    titulo: 'Google Search Console', ajuda: 'A conta robô que lê os números do Google (cliques, buscas e posição) para a tela SEO e Google. Só lê, de graça. O relógio busca todo dia a partir das 6h. Passo a passo em docs/search-console-automatico.md.',
    campos: [
      { k: 'conta', t: 'Chave da conta robô (o arquivo .json inteiro)', segredo: true, ph: '{ "type": "service_account", ... }', dica: 'Abra o .json baixado do Google Cloud num editor de texto, copie tudo, do { ao }, e cole aqui. Antes, adicione o e-mail da conta robô como Restrito no Search Console dos dois sites. Depois de salvar, apague o arquivo do computador.' },
    ],
  },
  rastreio: {
    titulo: 'Pixel da Meta e Google', ajuda: 'Mede as vendas dos anúncios. A compra vai também pelo servidor (API de Conversões), sem perder venda por bloqueador.',
    campos: [
      { k: 'meta_pixel', t: 'Id do Pixel da Meta', ph: '1234567890123456' },
      { k: 'meta_token', t: 'Token da API de Conversões', segredo: true },
      { k: 'ga4', t: 'Id do GA4', ph: 'G-XXXXXXX' },
      { k: 'google_ads', t: 'Id do Google Ads', ph: 'AW-123456789' },
      { k: 'google_ads_rotulo', t: 'Rótulo da conversão de compra' },
    ],
  },
};

export default function Integracoes() {
  useEffect(() => { document.title = 'Integrações | Painel Agência Setup'; }, []);
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/integracoes'), []);
  return (
    <div className="tela tela-estreita">
      <Titulo titulo="Integrações" sub="As chaves dos serviços que a área de membros usa. Cada uma é conferida no próprio serviço e fica cifrada." />
      <Grupo titulo="Asaas (pagamento)"><Pagamento /></Grupo>
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !dados ? <Carregando /> : (dados || []).map((s: any) => <Cartao key={s.nome} s={s} mudou={recarregar} />)}
      <Webhooks />
    </div>
  );
}

function Cartao({ s, mudou }: { s: any; mudou: () => void }) {
  const def = DEFS[s.nome];
  const [f, setF] = useState<any>(() => ({ ...s.publicos }));
  const { ocupado, rodar } = useAcao();
  const numeros = useCarregar(() => (s.nome === 'ia' ? get('/integracoes/ia/numeros') : Promise.resolve(null)), [s.nome]);
  if (!def) return null;
  const configurada = s.nome === 'nota_fiscal' ? !!s.publicos.ativo : s.nome === 'rastreio' ? !!(s.publicos.meta_pixel || s.publicos.ga4 || s.publicos.google_ads) : def.campos.filter((c) => c.segredo).every((c) => s.segredos[c.k]);
  const salvar = () => rodar(s.nome, async () => {
    const corpo: any = {};
    for (const c of def.campos) if (f[c.k] !== undefined && f[c.k] !== (c.segredo ? '' : s.publicos[c.k])) corpo[c.k] = c.tipo === 'number' ? Number(f[c.k]) : f[c.k];
    if (s.nome === 'ia') { corpo.ativo = f.ativo !== false; corpo.relatorio = f.relatorio !== false; corpo.modelo_tutor = f.modelo_tutor || 'claude-opus-5-5'; }
    if (s.nome === 'nota_fiscal') corpo.ativo = !!f.ativo;
    await post(`/integracoes/${s.nome}`, corpo);
    setF((x: any) => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, def.campos.find((c) => c.k === k && c.segredo) ? '' : v])));
    mudou(); numeros.recarregar();
  }, 'Conferido e guardado.');
  const n = numeros.dados as any;
  return (
    <Grupo titulo={def.titulo} acoes={configurada ? <Etiqueta cor="verde">Ligado</Etiqueta> : <Etiqueta cor="ambar">Falta configurar</Etiqueta>}
      rodape={s.teste ? `Último teste: ${s.teste.resumo} (${haQuanto(s.teste.em)})` : s.salva_em ? `Salvo ${haQuanto(s.salva_em)}` : undefined}>
      <p className="mudo" style={{ marginTop: 0 }}>{def.ajuda}</p>
      {s.nome === 'ia' && n ? (
        <div className="numeros-mini">
          <span><b>US$ {Number(n.gasto_usd).toFixed(2).replace('.', ',')}</b> gastos no mês</span>
          <span><b>{numero(n.perguntas)}</b> perguntas</span>
          <span><b>{numero(n.prontas)}</b> respostas prontas (grátis)</span>
          <span><b>{numero(n.uteis)}</b> ajudaram · <b>{numero(n.nao_uteis)}</b> não</span>
        </div>
      ) : null}
      {s.nome === 'ia' && n?.por_aula?.length ? <p className="mudo">Onde mais perguntam: {n.por_aula.slice(0, 5).map((a: any) => `${a.aula} (${a.n})`).join(' · ')}</p> : null}
      {s.nome === 'search_console' && s.publicos.email ? <p className="mudo">Conta robô: <span className="mono">{s.publicos.email}</span>{Array.isArray(s.publicos.sites) && s.publicos.sites.length ? ` · lê ${s.publicos.sites.map((x: string) => x.replace('sc-domain:', '')).join(' e ')}` : ''}</p> : null}
      {s.nome === 'nota_fiscal' ? <Marcar rotulo="Emitir nota automática" valor={!!f.ativo} mudar={(v) => setF({ ...f, ativo: v })} /> : null}
      {s.nome === 'ia' ? <>
        <Marcar rotulo="Tutor ligado" valor={f.ativo !== false} mudar={(v) => setF({ ...f, ativo: v })} />
        <Marcar rotulo="Relatório da semana" valor={f.relatorio !== false} mudar={(v) => setF({ ...f, relatorio: v })} dica="Toda segunda, às 8h, o Claude lê os números e escreve o que fazer. Aparece em Números (poucos centavos de dólar por semana)." />
        <Escolha rotulo="Modelo" valor={f.modelo_tutor || 'claude-opus-5-5'} mudar={(v) => setF({ ...f, modelo_tutor: v })}
          opcoes={((n && n.modelos) || [{ id: 'claude-opus-5-5', nome: 'Claude Opus 5.5' }]).map((m: any) => ({ v: m.id, t: m.preco ? `${m.nome} · US$ ${m.preco[0]} / ${m.preco[1]} por milhão` : m.nome }))} />
      </> : null}
      {def.campos.map((c) => c.area
        ? <AreaTexto key={c.k} rotulo={c.t} valor={f[c.k] || ''} mudar={(v) => setF({ ...f, [c.k]: v })} linhas={3} dica={c.dica} />
        : <Campo key={c.k} rotulo={c.segredo && s.segredos[c.k] ? `${c.t} (guardada; cole outra para trocar)` : c.t} tipo={c.segredo ? 'password' : c.tipo || 'text'} mono={c.segredo}
            valor={f[c.k] ?? ''} mudar={(v) => setF({ ...f, [c.k]: v })} placeholder={c.ph} dica={c.dica} />)}
      {s.nome === 'email' && !s.segredos.chave ? <Faixa tipo="aviso">Sem o Resend, os e-mails ficam como "simulado": o acesso sai pelo link em Alunos e pela tela de obrigado.</Faixa> : null}
      <button className="bt bt-tinta" disabled={!!ocupado} onClick={salvar}><Save />Conferir e guardar</button>
    </Grupo>
  );
}


// ---------------------------------------------------------------- webhooks de saída
function Webhooks() {
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/webhooks'), []);
  const [w, setW] = useState<any>(null);
  const [segredo, setSegredo] = useState<string | null>(null);
  const { ocupado, rodar } = useAcao();
  const eventos: Record<string, string> = dados?.eventos || {};
  const salvar = () => rodar('webhook', async () => {
    const corpo = { nome: w.nome, url: w.url, eventos: w.eventos, ativo: w.ativo, ...(w.novo_segredo ? { novo_segredo: true } : {}) };
    const r = w.id ? await patch(`/webhooks/${w.id}`, corpo) : await post('/webhooks', corpo);
    setW(null); recarregar();
    if (r.segredo) setSegredo(r.segredo);
  }, 'Webhook guardado.');
  const testar = (id: string) => rodar(`teste-${id}`, async () => {
    const r = await post(`/webhooks/${id}/testar`);
    recarregar();
    if (!r.ok) throw new Error(r.erro || 'O outro sistema não aceitou o teste.');
  }, 'Teste entregue: o outro sistema respondeu.');
  const nomeDe = (id: string) => (dados?.webhooks || []).find((x: any) => x.id === id)?.nome || '';
  return (
    <Grupo titulo="Webhooks (n8n, Make, Zapier)" acoes={<button className="bt bt-mini bt-tinta" onClick={() => setW({ nome: '', url: '', eventos: ['venda.paga'], ativo: true })}><Plus />Webhook</button>}
      rodape={<>Cada aviso sai em até 10 minutos, assinado: o cabeçalho X-Setup-Assinatura traz sha256= e o HMAC SHA-256 do corpo com o segredo. Se o outro sistema falhar, tenta de novo até 6 vezes.</>}>
      <p className="mudo" style={{ marginTop: 0 }}>Avisa outro sistema quando alguém compra, entra, conclui uma aula ou ganha o certificado. Serve para planilha, CRM, WhatsApp ou o que você montar no n8n.</p>
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !dados ? <Carregando /> : dados?.webhooks?.length ? dados.webhooks.map((x: any) => (
        <Celula key={x.id} titulo={x.nome}
          sub={`${x.eventos.map((e: string) => eventos[e] || e).join(', ')} · ${x.ultimo_envio ? `último envio ${haQuanto(x.ultimo_envio)} (${x.ultimo_status || 'sem resposta'})` : 'nada enviado ainda'}`}
          direita={<>{!x.ativo ? <Etiqueta cor="vermelho">Desligado</Etiqueta> : x.falhas ? <Etiqueta cor="ambar">{x.falhas} falhas</Etiqueta> : <Etiqueta cor="verde">Ligado</Etiqueta>}
            <button className="bt bt-mini" onClick={() => setW({ ...x })}>Editar</button><button className="bt bt-mini" disabled={!!ocupado} onClick={() => testar(x.id)}><Send />Testar</button></>} />
      )) : <Vazio titulo="Nenhum webhook ainda." texto="Crie um com o endereço do webhook do seu n8n, Make ou Zapier." />}
      {dados?.envios?.length ? <>
        <h3 className="sub-titulo">Últimos envios</h3>
        {dados.envios.slice(0, 8).map((e: any) => (
          <div key={e.id} className="numeros-mini" style={{ margin: '0 0 4px' }}>
            <span><b>{e.evento}</b> para {nomeDe(e.webhook_id)}</span><span>{haQuanto(e.criado_em)}</span>
            <span>{e.enviado_em ? `entregue (${e.status})` : e.tentativas >= 6 ? `desistiu: ${e.erro || 'sem resposta'}` : e.tentativas ? `tentando de novo: ${e.erro || ''}` : 'na fila'}</span>
          </div>
        ))}
      </> : null}

      <Modal titulo={w?.id ? w.nome : 'Novo webhook'} aberto={!!w} fechar={() => setW(null)}
        rodape={<><button className="bt bt-texto" onClick={() => setW(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado || !w?.nome?.trim() || !w?.url?.trim() || !w?.eventos?.length} onClick={salvar}><Save />Guardar</button></>}>
        {w && <>
          <Campo rotulo="Nome" valor={w.nome} mudar={(v) => setW({ ...w, nome: v })} placeholder="n8n: planilha de alunos" />
          <Campo rotulo="Endereço do webhook" valor={w.url} mudar={(v) => setW({ ...w, url: v })} placeholder="https://seu-n8n.com/webhook/..." mono />
          <h3 className="sub-titulo">Quando avisar</h3>
          {Object.entries(eventos).map(([k, t]) => (
            <Marcar key={k} rotulo={t} valor={w.eventos.includes(k)} mudar={(v) => setW({ ...w, eventos: v ? [...w.eventos, k] : w.eventos.filter((e: string) => e !== k) })} />
          ))}
          {w.id ? <>
            <Marcar rotulo="Ligado" valor={!!w.ativo} mudar={(v) => setW({ ...w, ativo: v })} />
            <Marcar rotulo="Trocar o segredo" valor={!!w.novo_segredo} mudar={(v) => setW({ ...w, novo_segredo: v })} dica="O segredo novo aparece uma vez; atualize no outro sistema." />
          </> : <Faixa tipo="info">Ao guardar, aparece o segredo para conferir a assinatura. Ele aparece uma vez só.</Faixa>}
        </>}
      </Modal>
      <Modal titulo="Segredo do webhook" aberto={!!segredo} fechar={() => setSegredo(null)} rodape={<button className="bt bt-tinta" onClick={() => setSegredo(null)}>Já copiei</button>}>
        {segredo && <Segredo texto={segredo} aviso="Cole no outro sistema para conferir a assinatura (cabeçalho X-Setup-Assinatura). Ele não aparece de novo." />}
      </Modal>
    </Grupo>
  );
}
