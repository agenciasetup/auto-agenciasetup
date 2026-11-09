// Compras e pagamentos: o que a pessoa comprou, pagar o que ficou pendente (Pix vencido, cartão recusado),
// trocar entre Pix e cartão, comprovante, garantia (com o pedido de reembolso) e os dados de cobrança (nome, CPF, celular).
import { useEffect, useState } from 'react';
import { Carregando, ErroTela, I, brl, copiar, useDados, useToast } from '../comum';
import { get, patch, post } from '../nucleo/api';

const SITUACAO: Record<string, { t: string; c: string }> = {
  pago: { t: 'Pago', c: '#34c759' }, aguardando: { t: 'Aguardando pagamento', c: '#ffb000' }, expirado: { t: 'Pix vencido', c: '#8e8e93' },
  recusado: { t: 'Cartão recusado', c: '#ff453a' }, reembolsado: { t: 'Reembolsado', c: '#0a84ff' }, contestado: { t: 'Em contestação', c: '#ff453a' },
  cancelado: { t: 'Cancelado', c: '#8e8e93' },
};
const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function Compras() {
  useEffect(() => { document.title = 'Compras e pagamentos | Cursos da Setup'; }, []);
  const { dados, erro, carregando, recarregar } = useDados(() => get('/compras'), []);
  if (carregando && !dados) return <Carregando />;
  if (erro) return <ErroTela erro={erro} aoTentar={recarregar} />;
  return (
    <section className="tela ativa gutter largura estreita" aria-label="Compras e pagamentos">
      <div className="ola"><h1>Compras e pagamentos</h1></div>
      <div className="compras">
        {dados.length ? dados.map((c: any) => <Compra key={c.id} c={c} aoMudar={recarregar} />) : (
          <div className="cartao"><h3>Nenhuma compra ainda</h3><p>O que você comprar aparece aqui, com o comprovante.</p></div>
        )}
      </div>
      <Vagas />
      <Indique />
      <Dados />
    </section>
  );
}

function Compra({ c, aoMudar }: { c: any; aoMudar: () => void }) {
  const toast = useToast();
  const s = SITUACAO[c.status] || { t: c.status, c: '#8e8e93' };
  const [pagando, setPagando] = useState<any>(null);
  const [metodo, setMetodo] = useState(c.metodo);
  const [parcelas, setParcelas] = useState(c.metodo === 'cartao' ? c.parcelas : 1);
  const [ocupado, setOcupado] = useState(false);
  const [reembolso, setReembolso] = useState(false);
  const garantia = c.garantia_ate && new Date(c.garantia_ate) > new Date();

  async function pagar() {
    setOcupado(true);
    try {
      const r = await post(`/compras/${c.id}/pagar`, { metodo, parcelas: metodo === 'cartao' ? parcelas : 1 });
      if (r.link) { location.href = r.link; return; }
      setPagando(r);
      aoMudar();
    } catch (e: any) { toast(e.message); } finally { setOcupado(false); }
  }
  async function comprovante() {
    setOcupado(true);
    try { const r = await get(`/compras/${c.id}/comprovante`); if (r.url) window.open(r.url, '_blank', 'noopener'); else toast('O comprovante desta compra não está disponível.'); }
    catch (e: any) { toast(e.message); } finally { setOcupado(false); }
  }

  return (
    <article className="cartao compra">
      <div className="compra-topo">
        <div><h3>{c.itens.join(' + ')}</h3><p>Pedido {c.numero} · {data(c.criado_em)}{c.teste ? ' · teste' : ''}</p></div>
        <span className="etiqueta" style={{ ['--c' as any]: s.c }}>{s.t}</span>
      </div>
      <p className="compra-valor"><b>{brl(c.total_centavos)}</b> {c.metodo === 'pix' ? 'no Pix' : c.parcelas > 1 ? `no cartão em ${c.parcelas}x` : 'no cartão'}</p>

      {c.pendente && !pagando && (
        <div className="compra-pagar">
          <div className="metodos-mini" role="group" aria-label="Forma de pagamento">
            {c.metodos.includes('pix') && <button type="button" aria-pressed={metodo === 'pix'} onClick={() => setMetodo('pix')}><I n="pix" />Pix{c.pix_desconto_pct ? <small>{String(c.pix_desconto_pct).replace('.', ',')}% off</small> : null}</button>}
            {c.metodos.includes('cartao') && <button type="button" aria-pressed={metodo === 'cartao'} onClick={() => setMetodo('cartao')}><I n="cartao" />Cartão</button>}
          </div>
          {metodo === 'cartao' && c.parcelas_max > 1 && (
            <div className="campo"><label htmlFor={`p-${c.id}`}>Parcelas</label>
              <select id={`p-${c.id}`} value={parcelas} onChange={(e) => setParcelas(+e.target.value)}>
                {Array.from({ length: c.parcelas_max }, (_, i) => <option key={i} value={i + 1}>{i + 1}x</option>)}
              </select>
            </div>
          )}
          <button className="bt bt-marca bt-p" disabled={ocupado} onClick={pagar}>{ocupado ? 'Preparando...' : metodo === 'pix' ? 'Gerar o Pix' : 'Pagar no cartão'}</button>
          <p className="fraco">{metodo === 'cartao' ? 'Você digita o cartão na página segura do Asaas e volta para cá.' : 'O acesso libera sozinho assim que o Pix cai.'}</p>
        </div>
      )}

      {pagando?.pix && (
        <div className="compra-pix">
          {pagando.pix.qr ? <img src={pagando.pix.qr} alt="QR do Pix" width={200} height={200} /> : null}
          <p>Pague {brl(pagando.total_centavos)} no app do banco. Vale até {new Date(pagando.pix.vence).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.</p>
          <div className="copia"><code>{pagando.pix.copia}</code><button className="bt bt-p" onClick={() => copiar(pagando.pix.copia, toast)}><I n="copiar" />Copiar</button></div>
        </div>
      )}

      {c.status === 'pago' && (
        <div className="compra-acoes">
          <button className="bt bt-p" disabled={ocupado} onClick={comprovante}><I n="recibo" />Comprovante</button>
          {garantia && !c.reembolso && !reembolso && <button className="bt bt-p" onClick={() => setReembolso(true)}><I n="volta" />Pedir reembolso</button>}
          {c.reembolso ? <p className="fraco">Reembolso pedido: o valor volta até {data(c.reembolso.devolver_em)}. O acesso ao curso foi encerrado.</p>
            : garantia && <p className="fraco">Garantia até {data(c.garantia_ate)}.</p>}
        </div>
      )}
      {reembolso && <PedirReembolso c={c} fechar={() => setReembolso(false)} aoPedir={aoMudar} />}
    </article>
  );
}

// Reembolso pelo app, com barreiras (pedido do dono): "tem certeza?" com o que a pessoa já usou, o motivo, o "concordo"
// e só então o pedido. Entra na fila de 7 dias e o acesso cai na hora. Ver worker/lib/vendas.js, pedirReembolso.
const MOTIVOS = ['Não era o que eu esperava', 'Não tenho tempo para fazer agora', 'Tive problema para acessar ou usar', 'Comprei por engano', 'Outro motivo'];

function PedirReembolso({ c, fechar, aoPedir }: { c: any; fechar: () => void; aoPedir: () => void }) {
  const toast = useToast();
  const { dados: uso, erro, carregando } = useDados(() => get(`/compras/${c.id}/reembolso`), [c.id]);
  const [etapa, setEtapa] = useState<'certeza' | 'termos' | 'feito'>('certeza');
  const [motivo, setMotivo] = useState('');
  const [concordo, setConcordo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState<any>(null);

  async function confirmar() {
    setEnviando(true);
    try { const r = await post(`/compras/${c.id}/reembolso`, { motivo, concordo }); setFeito(r); setEtapa('feito'); }
    catch (e: any) { toast(e.message); } finally { setEnviando(false); }
  }
  const prazo = c.metodo === 'pix' ? 'Em até 7 dias o reembolso estará na sua conta.' : 'Em até 7 dias o estorno é feito no cartão. Ele pode levar até 2 faturas para aparecer, conforme o banco.';

  if (carregando && !uso) return <div className="reembolso"><p className="fraco">Carregando...</p></div>;
  if (erro) return <div className="reembolso"><p>{erro}</p><button className="bt bt-p" onClick={fechar}>Voltar</button></div>;

  if (etapa === 'feito') return (
    <div className="reembolso">
      <h4>Pedido de reembolso registrado</h4>
      <p>O valor volta até <b>{data(feito.devolver_em)}</b>. {c.metodo === 'pix' ? 'Ele cai na conta que fez o Pix.' : 'O estorno sai no mesmo cartão.'} Mandamos a confirmação para o seu e-mail.</p>
      <p className="fraco">O acesso ao curso foi encerrado.</p>
      <button className="bt bt-p" onClick={() => { fechar(); aoPedir(); }}>Fechar</button>
    </div>
  );

  if (etapa === 'certeza') return (
    <div className="reembolso">
      <h4>Tem certeza que quer o reembolso?</h4>
      <p>Cada acesso, aula assistida e arquivo baixado fica registrado na sua conta. Depois de pedir o reembolso, não é permitido usar nada do curso: aulas, arquivos, modelos e skills.</p>
      {uso.aulas_vistas > 0 || uso.arquivos.length > 0 ? (
        <div className="reembolso-uso">
          {uso.aulas_vistas > 0 && <p>Você {uso.aulas_concluidas === uso.aulas_vistas ? 'assistiu e concluiu' : 'assistiu'} <b>{uso.aulas_vistas} {uso.aulas_vistas === 1 ? 'aula' : 'aulas'}</b>{uso.minutos ? ` (${uso.minutos} min)` : ''}{uso.aulas_concluidas && uso.aulas_concluidas !== uso.aulas_vistas ? `, e concluiu ${uso.aulas_concluidas}` : ''}.</p>}
          {uso.arquivos.length > 0 && <>
            <p>Vimos que você baixou os seguintes arquivos:</p>
            <ul>{uso.arquivos.map((a: any) => <li key={a.nome}><I n="arquivo" />{a.nome}</li>)}</ul>
          </>}
        </div>
      ) : null}
      <p className="reembolso-alerta"><I n="escudo" />Se você pedir o reembolso e usar o material do curso, e nós identificarmos o uso, entraremos em contato.</p>
      <div className="reembolso-botoes">
        <button className="bt bt-marca bt-p" onClick={fechar}>Cancelar reembolso</button>
        <button className="bt bt-p" onClick={() => setEtapa('termos')}>Quero o reembolso</button>
      </div>
    </div>
  );

  return (
    <div className="reembolso">
      <h4>Confirme o pedido de reembolso</h4>
      <div className="campo"><label htmlFor={`m-${c.id}`}>Por que você quer o reembolso?</label>
        <select id={`m-${c.id}`} value={motivo} onChange={(e) => setMotivo(e.target.value)}>
          <option value="">Escolha um motivo</option>
          {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <label className="marcar-linha"><input type="checkbox" checked={concordo} onChange={(e) => setConcordo(e.target.checked)} /> Concordo com os termos e não vou utilizar nada do curso (aulas, arquivos, modelos e skills).</label>
      <p className="reembolso-alerta"><I n="relogio" />{prazo} O acesso ao curso é encerrado na hora.</p>
      <div className="reembolso-botoes">
        <button className="bt bt-p" onClick={fechar}>Cancelar reembolso</button>
        <button className="bt bt-p bt-perigo" disabled={!motivo || !concordo || enviando} onClick={confirmar}>{enviando ? 'Enviando...' : 'Confirmar'}</button>
      </div>
    </div>
  );
}

function Dados() {
  const toast = useToast();
  const { dados, recarregar } = useDados(() => get('/dados'), []);
  const [f, setF] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => { if (dados) setF({ nome: dados.nome || '', celular: dados.celular || '', cpf: '' }); }, [dados]);
  if (!dados || !f) return null;
  const mudou = f.nome !== (dados.nome || '') || f.celular !== (dados.celular || '') || !!f.cpf;
  async function salvar(e: any) {
    e.preventDefault();
    setSalvando(true);
    try { await patch('/dados', { nome: f.nome, celular: f.celular, ...(f.cpf ? { cpf: f.cpf } : {}) }); toast('Dados salvos'); recarregar(); }
    catch (er: any) { toast(er.message); } finally { setSalvando(false); }
  }
  return (
    <form className="cartao" onSubmit={salvar} style={{ marginTop: 18 }}>
      <h3>Dados de cobrança</h3>
      <p>São os dados que vão no comprovante e no pagamento.</p>
      <div className="campos-perfil">
        <div className="campo"><label htmlFor="d-nome">Nome completo</label><input id="d-nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} autoComplete="name" maxLength={120} /></div>
        {/* Quem mora fora do Brasil: celular com o código do país (começa com +) e sem CPF. */}
        <div className="campo"><label htmlFor="d-cel">{dados.estrangeiro ? 'Celular com o código do país' : 'Celular com DDD'}</label><input id="d-cel" value={f.celular} onChange={(e) => setF({ ...f, celular: e.target.value })} inputMode="tel" autoComplete={dados.estrangeiro ? 'tel' : 'tel-national'} maxLength={dados.estrangeiro ? 20 : 15} /></div>
        {!dados.estrangeiro && <div className="campo"><label htmlFor="d-cpf">CPF</label><input id="d-cpf" value={f.cpf} onChange={(e) => setF({ ...f, cpf: e.target.value })} inputMode="numeric" placeholder={dados.cpf || 'Só se precisar trocar'} maxLength={14} autoComplete="off" /></div>}
        <div className="campo"><label htmlFor="d-email">E-mail</label><input id="d-email" value={dados.email} disabled /></div>
      </div>
      <p className="fraco">Para trocar o e-mail (é com ele que você entra), escreva para contato@agenciasetup.com.br.</p>
      <button className="bt bt-marca bt-p" disabled={!mudou || salvando} style={{ justifySelf: 'start' }}>{salvando ? 'Salvando...' : 'Salvar'}</button>
    </form>
  );
}

// Plano equipe: quem comprou com vagas convida a equipe por e-mail; cada pessoa recebe o acesso e o link de entrada.
function Vagas() {
  const toast = useToast();
  const { dados, recarregar } = useDados(() => get('/vagas'), []);
  const [f, setF] = useState<any>({});
  if (!dados || !dados.length) return null;
  async function convidar(p: any) {
    const v = f[p.id] || {};
    try { await post(`/vagas/${p.id}`, { email: v.email, nome: v.nome }); toast('Convite enviado. A pessoa recebe o acesso no e-mail.'); setF({ ...f, [p.id]: {} }); recarregar(); } catch (e: any) { toast(e.message); }
  }
  return (
    <>
      {dados.map((p: any) => (
        <div key={p.id} className="cartao" style={{ marginTop: 18 }}>
          <h3>Sua equipe · {p.produto}</h3>
          <p>{p.usadas} de {p.vagas} vagas usadas (a sua conta inclusa).</p>
          {p.convidados.map((c: any) => <p key={c.email} className="fraco">{c.email}</p>)}
          {p.usadas < p.vagas ? (
            <div className="campos-perfil">
              <div className="campo"><label htmlFor={`v-e-${p.id}`}>E-mail de quem vai entrar</label><input id={`v-e-${p.id}`} type="email" value={(f[p.id] || {}).email || ''} onChange={(e) => setF({ ...f, [p.id]: { ...(f[p.id] || {}), email: e.target.value } })} /></div>
              <div className="campo"><label htmlFor={`v-n-${p.id}`}>Nome</label><input id={`v-n-${p.id}`} value={(f[p.id] || {}).nome || ''} onChange={(e) => setF({ ...f, [p.id]: { ...(f[p.id] || {}), nome: e.target.value } })} /></div>
              <button className="bt bt-marca bt-p" style={{ justifySelf: 'start' }} onClick={() => convidar(p)}><I n="mais" />Liberar a vaga</button>
            </div>
          ) : null}
        </div>
      ))}
    </>
  );
}

// Indique um amigo: o link com o seu código. Quem compra por ele conta para você (XP e o selo "Trouxe a turma").
function Indique() {
  const toast = useToast();
  const { dados } = useDados(() => get('/indicacao'), []);
  if (!dados) return null;
  return (
    <div className="cartao" style={{ marginTop: 18 }}>
      <h3>Indique um amigo</h3>
      <p>Mande o seu link. Quando alguém comprar por ele, você ganha 50 XP e o selo "Trouxe a turma".{dados.pagas ? ` Você já trouxe ${dados.pagas} ${dados.pagas === 1 ? 'pessoa' : 'pessoas'}.` : ''}</p>
      <div className="copia"><code>{dados.link}</code><button className="bt bt-p" onClick={() => copiar(dados.link, toast)}><I n="copiar" />Copiar</button></div>
    </div>
  );
}
