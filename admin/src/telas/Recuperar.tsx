// Recuperar vendas: quem chegou no checkout e não comprou (preencheu e saiu, Pix vencido, cartão recusado). Cada pessoa
// com o motivo em uma frase, de onde veio e as mensagens prontas para o WhatsApp. O clique abre a conversa e marca como
// chamada; quem manda é a pessoa da equipe, nunca o sistema. Suporte atende sem ver valores. Lógica em worker/lib/recuperacao.js.
import { useEffect, useState } from 'react';
import { Check, Copy, MessageCircle, RotateCcw, Search, UserX } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { Abas, Carregando, ErroCarga, Etiqueta, Grupo, Titulo, Vazio, avisar, useCarregar, useSessao } from '../nucleo/ui';
import { dinheiro, haQuanto, numero } from '../nucleo/util';
import '../suporte.css';

const VAZIOS: Record<string, { t: string; d: string }> = {
  nova: { t: 'Ninguém para chamar agora', d: 'Quem preencher o checkout e não comprar aparece aqui depois de 10 minutos. Os dois e-mails de lembrete saem sozinhos.' },
  chamei: { t: 'Ninguém chamado ainda', d: 'Quando você mandar uma mensagem, a pessoa vem para cá. Se ela comprar, sai sozinha da lista.' },
  comprou: { t: 'Nenhuma venda recuperada ainda', d: 'Entra aqui quem comprou depois de ser chamado ou de receber o lembrete.' },
  nao_quer: { t: 'Ninguém pediu para parar', d: 'Quem você marcar como "Não quer" ou parar os lembretes pelo e-mail não recebe mais nada.' },
};

export default function Recuperar() {
  useEffect(() => { document.title = 'Recuperar vendas | Painel Agência Setup'; }, []);
  const { pode } = useSessao();
  const [aba, setAba] = useState('nova');
  const [busca, setBusca] = useState('');
  const [buscaFeita, setBuscaFeita] = useState('');
  useEffect(() => { const t = setTimeout(() => setBuscaFeita(busca.trim()), 350); return () => clearTimeout(t); }, [busca]);
  const { dados, erro, carregando, recarregar } = useCarregar(() => get(`/recuperar?aba=${aba}${buscaFeita ? `&busca=${encodeURIComponent(buscaFeita)}` : ''}`), [aba, buscaFeita]);
  const d: any = dados;
  const n = d?.numeros;
  const podeMexer = pode('recuperar.editar');
  const marcar = async (id: string, corpo: any, ok?: string) => {
    try { await post(`/recuperar/${id}`, corpo); if (ok) avisar(ok); recarregar(); }
    catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); }
  };
  const dupla = (real?: number, usd?: number) => [real ? dinheiro(real) : '', usd ? dinheiro(usd, 'usd') : ''].filter(Boolean).join(' + ');

  return (
    <div className="tela">
      <Titulo titulo="Recuperar vendas" sub="Quem chegou no checkout e não comprou. Escolha a mensagem, mande no WhatsApp e marque o que aconteceu." />
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {n && (
        <div className="numeros">
          <div className="numero grande destaque"><b>{numero(n.nova)}</b><span>{n.nova === 1 ? 'pessoa para chamar' : 'pessoas para chamar'}{dupla(n.a_chamar_centavos, n.a_chamar_usd_centavos) ? ` · ${dupla(n.a_chamar_centavos, n.a_chamar_usd_centavos)} em jogo` : ''}</span></div>
          <div className="numero"><b>{numero(n.chamei)}</b><span>Chamadas, esperando resposta</span></div>
          <div className="numero"><b>{numero(n.comprou)}</b><span>Compraram depois do contato</span></div>
          {n.recuperado_centavos !== undefined && <div className="numero"><b>{dupla(n.recuperado_centavos, n.recuperado_usd_centavos) || dinheiro(0)}</b><span>Recuperado</span></div>}
          <div className="numero"><b>{numero(n.nao_quer)}</b><span>Não querem</span></div>
        </div>
      )}
      <Abas abas={[{ id: 'nova', t: 'A chamar', n: n?.nova }, { id: 'chamei', t: 'Chamados', n: n?.chamei }, { id: 'comprou', t: 'Compraram', n: n?.comprou }, { id: 'nao_quer', t: 'Não querem', n: n?.nao_quer }]} atual={aba} mudar={setAba} />
      <div className="filtros"><input type="search" placeholder="Nome ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar pessoa" /></div>
      {carregando && !d && <Carregando />}
      {d && (d.itens.length ? (
        <div className="rec-lista">{d.itens.map((p: any) => <Pessoa key={p.id} p={p} marcar={marcar} podeMexer={podeMexer} />)}</div>
      ) : (
        <Vazio icone={buscaFeita ? <Search /> : <MessageCircle />} titulo={buscaFeita ? 'Ninguém com esse nome ou e-mail nesta aba.' : VAZIOS[aba]?.t} texto={buscaFeita ? undefined : VAZIOS[aba]?.d} />
      ))}
      {d && d.total > d.itens.length && <p className="mudo linha-pequena">Mostrando {d.itens.length} de {d.total}. Use a busca para achar as outras.</p>}
    </div>
  );
}

function Pessoa({ p, marcar, podeMexer }: { p: any; marcar: (id: string, corpo: any, ok?: string) => void; podeMexer: boolean }) {
  const [nota, setNota] = useState(p.nota || '');
  useEffect(() => { setNota(p.nota || ''); }, [p.id, p.nota]);
  const copiar = async () => {
    try { await navigator.clipboard.writeText(p.link); avisar('Link copiado. Ele abre a compra com os dados preenchidos.'); }
    catch { avisar('Não consegui copiar o link.', 'erro'); }
  };
  const emails = p.lembretes ? `${p.lembretes} ${p.lembretes === 1 ? 'e-mail enviado' : 'e-mails enviados'}` : 'Nenhum e-mail ainda';
  return (
    <Grupo className="rec-pessoa">
      <div className="rec-topo">
        <div className="rec-quem">
          <b>{p.nome || p.email}</b>
          <span className="mudo">{p.nome ? `${p.email} · ` : ''}{haQuanto(p.visto_em)}</span>
        </div>
        <div className="rec-valor">
          {p.valor_centavos !== undefined && <b className="num">{dinheiro(p.situacao === 'comprou' && p.recuperado_centavos ? p.recuperado_centavos : p.valor_centavos, p.moeda)}</b>}
          <Etiqueta cor={p.motivo.id === 'saiu' ? 'azul' : 'ambar'}>{p.motivo.t}</Etiqueta>
        </div>
      </div>
      <p className="rec-linha">{p.produto}{p.pedido ? ` · pedido #${p.pedido}` : ''} · veio de: {p.canal} · {emails}{p.chamado_em ? ` · chamado ${haQuanto(p.chamado_em)}${p.quem ? ` por ${p.quem}` : ''}${p.contatos > 1 ? ` (${p.contatos} vezes)` : ''}` : ''}</p>
      {!p.oferta_ligada && <p className="rec-linha mudo">Esta oferta está desligada: o link não abre a compra.</p>}
      {podeMexer && (
        <div className="rec-acoes">
          {['nova', 'chamei'].includes(p.situacao) && p.whatsapp.map((m: any) => (
            <a key={m.id} className="bt bt-mini bt-whats" href={m.link} target="_blank" rel="noopener noreferrer" title={m.texto} onClick={() => marcar(p.id, { situacao: 'chamei' })}><MessageCircle />{m.t}</a>
          ))}
          {['nova', 'chamei'].includes(p.situacao) && !p.whatsapp.length && <span className="mudo linha-pequena">Sem celular: só por e-mail.</span>}
          <button className="bt bt-mini bt-texto" onClick={copiar}><Copy />Copiar link</button>
          {['nova', 'chamei'].includes(p.situacao) && <>
            <button className="bt bt-mini bt-texto" onClick={() => marcar(p.id, { situacao: 'comprou' }, 'Marcado como comprou.')} title="Pagou por fora ou você confirmou a compra"><Check />Comprou</button>
            <button className="bt bt-mini bt-texto" onClick={() => marcar(p.id, { situacao: 'nao_quer' }, 'Não recebe mais lembretes.')}><UserX />Não quer</button>
          </>}
          {p.situacao !== 'nova' && <button className="bt bt-mini bt-texto" onClick={() => marcar(p.id, { situacao: 'nova' }, 'Voltou para A chamar.')}><RotateCcw />Voltar para A chamar</button>}
        </div>
      )}
      {podeMexer && <input className="rec-nota" placeholder="Anotação (só a equipe vê)" maxLength={500} value={nota} aria-label="Anotação" onChange={(e) => setNota(e.target.value)} onBlur={() => { if (nota !== (p.nota || '')) marcar(p.id, { nota }, 'Anotação salva.'); }} />}
    </Grupo>
  );
}
