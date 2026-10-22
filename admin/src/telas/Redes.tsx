// Redes: um módulo por rede (worker/plataformas/). Cada um diz se já sabe conectar e publicar e se está configurado.
import { useEffect, useState } from 'react';
import { Plug, Power } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { useRota } from '../nucleo/roteador';
import { Carregando, ErroCarga, Etiqueta, Faixa, Titulo, Vazio, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { FORMATOS, REDES, dataHora } from '../nucleo/util';

export default function Redes() {
  const { pode } = useSessao();
  const { rota, ir } = useRota();
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/redes'), []);
  const { ocupado, rodar } = useAcao();
  const [aviso] = useState(() => ({ conectada: rota.busca.get('conectada'), erro: rota.busca.get('erro') }));
  useEffect(() => {
    document.title = 'Redes | Painel Agência Setup';
    if (aviso.conectada || aviso.erro) ir('/redes', { trocar: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const conectar = (id: string) => rodar(id, async () => {
    const r = await post(`/redes/${id}/conectar`);
    if (r && r.url) location.assign(r.url);
  });
  const desligar = (c: any, nome: string) => {
    if (!confirm(`Desligar a conta ${c.conta_nome || ''} do ${nome}? As peças agendadas para ela vão dar erro até conectar de novo.`)) return;
    rodar(c.id, async () => { await post(`/conexoes/${c.id}/desligar`); recarregar(); }, 'Conta desligada.');
  };

  const nomeConectada = aviso.conectada ? (REDES[aviso.conectada]?.t || aviso.conectada) : '';
  return (
    <div className="tela">
      <Titulo titulo="Redes" sub="Cada rede é um módulo. Quando o módulo fica pronto, é só conectar a conta aqui." />
      {aviso.conectada && <Faixa tipo="ok">{nomeConectada} conectado. As peças agendadas para essa rede já podem sair.</Faixa>}
      {aviso.erro && <Faixa tipo="erro">Não deu para conectar: {aviso.erro}</Faixa>}
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !dados && <Carregando />}
      {dados && (dados.length ? (
        <div className="redes">
          {dados.map((r: any) => {
            const ativas = (r.conexoes || []).filter((c: any) => c.status !== 'desligada');
            const conectada = ativas.some((c: any) => c.status === 'ativa');
            const situacao = conectada ? <Etiqueta cor="verde">Conectada</Etiqueta> : !r.disponivel ? <Etiqueta>Em breve</Etiqueta>
              : !r.configurada ? <Etiqueta cor="ambar">Falta configurar</Etiqueta> : <Etiqueta cor="azul">Pronta para conectar</Etiqueta>;
            return (
              <article className="rede" key={r.id} style={{ ['--cor' as any]: r.cor || REDES[r.id]?.cor }}>
                <div className="rede-topo">
                  <h3><span className="ponto-rede" style={{ background: r.cor || REDES[r.id]?.cor }} />{r.nome}</h3>
                  {situacao}
                </div>
                {r.descricao && <p className="mudo" style={{ margin: 0, fontSize: 14 }}>{r.descricao}</p>}
                <div className="formatos">{(r.formatos || []).map((f: string) => <Etiqueta key={f}>{FORMATOS[f] || f}</Etiqueta>)}</div>
                {r.requisitos?.length > 0 && <div>
                  <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600 }}>O que precisa</p>
                  <ul>{r.requisitos.map((q: string) => <li key={q}>{q}</li>)}</ul>
                </div>}
                {ativas.map((c: any) => (
                  <div className="rede-conta" key={c.id}>
                    {c.conta_foto ? <img src={c.conta_foto} alt="" /> : <span className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{(c.conta_nome || '?').slice(0, 2).toUpperCase()}</span>}
                    <div>
                      <b>{c.conta_nome || 'Conta'}</b>
                      <span>{c.status === 'ativa' ? `Desde ${dataHora(c.criado_em)}${c.expira_em ? ` · renova até ${dataHora(c.expira_em)}` : ''}` : c.status === 'expirada' ? 'Login vencido: conecte de novo' : c.ultimo_erro || 'Com erro'}</span>
                    </div>
                    {pode('redes.conectar') && <button className="bt-icone" aria-label="Desligar conta" title="Desligar" disabled={ocupado === c.id} onClick={() => desligar(c, r.nome)}><Power /></button>}
                  </div>
                ))}
                {pode('redes.conectar') && r.disponivel && (
                  <button className={`bt ${conectada ? '' : 'bt-tinta'}`} disabled={!r.configurada || ocupado === r.id} onClick={() => conectar(r.id)}
                    title={r.configurada ? undefined : 'Falta configurar o app desta rede no servidor'}>
                    <Plug />{ocupado === r.id ? 'Abrindo…' : conectada ? 'Conectar outra conta' : 'Conectar'}
                  </button>
                )}
                {!r.disponivel && <p className="campo-dica" style={{ margin: 0 }}>O módulo desta rede ainda não publica. Entra numa próxima etapa.</p>}
                {r.disponivel && !r.configurada && <p className="campo-dica" style={{ margin: 0 }}>Falta colocar no servidor as chaves do app desta rede.</p>}
              </article>
            );
          })}
        </div>
      ) : <Vazio titulo="Nenhuma rede cadastrada." />)}
      {!pode('redes.conectar') && <p className="mudo" style={{ fontSize: 13, marginTop: 14 }}>Só o administrador conecta e desliga contas.</p>}
    </div>
  );
}
