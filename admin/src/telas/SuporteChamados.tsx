// Chamados do direct, no topo da tela Suporte: quem contou no Instagram um problema com um curso que comprou, com o
// curso, o e-mail, o telefone e o problema que o Atendente colheu na conversa. O time abre aqui todo dia, resolve e
// clica em Resolvido. Lógica em worker/lib/chamados.js (migration 47). Pedido do dono em 10/11/2026.
import { useState } from 'react';
import { Check, MessageCircle, Phone, Undo2 } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { BotaoCopiar, Carregando, ErroCarga, Grupo, Vazio, avisar, useCarregar, useSessao } from '../nucleo/ui';
import { haQuanto, numero } from '../nucleo/util';

// O número para o WhatsApp: telefone do Brasil sem o código do país ganha o 55.
const whats = (t: string) => `https://wa.me/${t.length <= 11 ? `55${t}` : t}`;
const faltou = <span className="mudo">não disse</span>;

export default function Chamados() {
  const { pode } = useSessao();
  const podeAtender = pode('suporte.atender');
  const [status, setStatus] = useState<'aberto' | 'resolvido'>('aberto');
  const [indo, setIndo] = useState('');
  const { dados: d, erro, carregando, recarregar } = useCarregar<any>(() => get(`/chamados?status=${status}`), [status]);
  const itens: any[] = d?.itens || [];
  const abertos: number = d ? d.abertos : 0;

  const mudar = async (id: string, novo: string, ok: string) => {
    setIndo(id);
    try { await post(`/chamados/${id}`, { status: novo }); avisar(ok); recarregar(); }
    catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); }
    setIndo('');
  };

  return (
    <Grupo
      titulo={abertos ? `Chamados do direct (${numero(abertos)})` : 'Chamados do direct'}
      acoes={(
        <div className="chips" role="group" aria-label="Quais chamados mostrar">
          <button type="button" className={`chip ${status === 'aberto' ? 'ativo' : ''}`} aria-pressed={status === 'aberto'} onClick={() => setStatus('aberto')}>Abertos</button>
          <button type="button" className={`chip ${status === 'resolvido' ? 'ativo' : ''}`} aria-pressed={status === 'resolvido'} onClick={() => setStatus('resolvido')}>Resolvidos</button>
        </div>
      )}
      rodape="Quando alguém conta no direct um problema com um curso que comprou, o Atendente colhe o curso, o e-mail e o problema, e o chamado aparece aqui. Resolveu, clique em Resolvido."
    >
      {erro ? <ErroCarga erro={erro} tentar={recarregar} /> : carregando && !d ? <Carregando /> : itens.length ? (
        <div className="cha-lista">
          {itens.map((c) => (
            <article className="cha-item" key={c.id}>
              <div className="cha-topo">
                <b>{c.nome || (c.usuario ? `@${c.usuario}` : 'Sem nome')}</b>
                {c.nome && c.usuario && <span className="mudo">@{c.usuario}</span>}
                <span className="mudo cha-quando">{status === 'resolvido' && c.resolvido_em ? `resolvido ${haQuanto(c.resolvido_em)}${c.resolvido_por ? ` por ${c.resolvido_por}` : ''}` : `chegou ${haQuanto(c.criado_em)}`}</span>
              </div>
              <p className="cha-problema">{c.problema}</p>
              <dl className="cha-dados">
                <div><dt>Curso</dt><dd>{c.curso || faltou}</dd></div>
                <div><dt>E-mail</dt><dd>{c.email ? <>{c.email}<BotaoCopiar texto={c.email} classe="bt bt-mini bt-texto" /></> : faltou}</dd></div>
                <div><dt>Telefone</dt><dd>{c.telefone || faltou}</dd></div>
              </dl>
              {c.nota && <p className="mudo cha-nota"><b>Anotação:</b> {c.nota}</p>}
              <div className="cha-pe">
                <span className="mudo">{d.nomes.origem[c.origem] || c.origem}</span>
                <span className="rec-acoes">
                  {c.abrir && <a className="bt bt-mini bt-texto" href={c.abrir} target="_blank" rel="noreferrer"><MessageCircle />Abrir o direct</a>}
                  {c.telefone && <a className="bt bt-mini bt-texto" href={whats(c.telefone)} target="_blank" rel="noreferrer"><Phone />WhatsApp</a>}
                  {podeAtender && status === 'aberto' && <button type="button" className="bt bt-mini bt-tinta" disabled={indo === c.id} onClick={() => mudar(c.id, 'resolvido', 'Chamado resolvido. Ele fica guardado em Resolvidos.')}><Check />{indo === c.id ? 'Salvando' : 'Resolvido'}</button>}
                  {podeAtender && status === 'resolvido' && <button type="button" className="bt bt-mini bt-texto" disabled={indo === c.id} onClick={() => mudar(c.id, 'aberto', 'Chamado reaberto.')}><Undo2 />Reabrir</button>}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Vazio
          icone={<Check />}
          titulo={status === 'aberto' ? 'Nenhum chamado aberto' : 'Nenhum chamado resolvido ainda'}
          texto={status === 'aberto' ? 'Quando alguém contar um problema no direct, o chamado aparece aqui com os dados da pessoa.' : 'Os chamados que o time resolver ficam guardados aqui.'}
        />
      )}
    </Grupo>
  );
}
