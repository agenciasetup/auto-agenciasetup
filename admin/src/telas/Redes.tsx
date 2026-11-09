// Redes: um módulo por rede (worker/plataformas/). Cada um diz se já sabe conectar e publicar e se está configurado.
// Duas seções, uma por perfil (pedido do dono em 29/10/2026: "clareza dos dois perfis, separados"): a conta que entra
// pela seção do perfil em inglês fica no perfil em inglês, e cada conta tem o "Mudar de perfil".
import { useEffect, useState } from 'react';
import { ArrowLeftRight, Plug, Power } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { useRota } from '../nucleo/roteador';
import { Carregando, ErroCarga, Etiqueta, Faixa, Titulo, Vazio, avisar, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { FORMATOS, PERFIS, REDES, dataHora, perfilDe } from '../nucleo/util';
import { EtiquetaPerfil } from './comum';

export default function Redes() {
  const { pode } = useSessao();
  const { rota, ir } = useRota();
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/redes'), []);
  const { ocupado, rodar } = useAcao();
  const [aviso] = useState(() => ({ conectada: rota.busca.get('conectada'), perfil: rota.busca.get('perfil'), ficou: rota.busca.get('ficou'), erro: rota.busca.get('erro') }));
  useEffect(() => {
    document.title = 'Redes | Painel Agência Setup';
    if (aviso.conectada || aviso.erro) ir('/redes', { trocar: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const conectar = (id: string, perfil: string) => rodar(`${perfil}:${id}`, async () => {
    const r = await post(`/redes/${id}/conectar`, { perfil });
    if (r && r.url) location.assign(r.url);
  });
  const desligar = (c: any, nome: string) => {
    if (!confirm(`Desligar a conta ${c.conta_nome || ''} do ${nome}? As peças agendadas para ela vão dar erro até conectar de novo.`)) return;
    rodar(c.id, async () => { await post(`/conexoes/${c.id}/desligar`); recarregar(); }, 'Conta desligada.');
  };
  const mudarPerfil = (c: any, nome: string) => {
    const para = (c.perfil || 'br') === 'en' ? 'br' : 'en';
    if (!confirm(`Mudar a conta ${c.conta_nome || ''} do ${nome} para o perfil ${perfilDe(para).t}?\n\nAs peças do perfil ${perfilDe(c.perfil).curto} deixam de sair por ela, e as do perfil ${perfilDe(para).curto} passam a sair. Os posts dela vão junto para o outro perfil.`)) return;
    rodar(c.id, async () => {
      const r = await post(`/conexoes/${c.id}/perfil`, { perfil: para });
      for (const a of r.avisos || []) avisar(a, 'erro');
      recarregar();
    }, `Conta no perfil ${perfilDe(para).t}.`);
  };

  const nomeConectada = aviso.conectada ? (REDES[aviso.conectada]?.t || aviso.conectada) : '';
  return (
    <div className="tela">
      <Titulo titulo="Redes" sub="Cada perfil tem as contas dele. Conecte a conta na seção do perfil certo: as peças daquele perfil saem por ela." />
      {aviso.conectada && <Faixa tipo="ok">{nomeConectada} conectado no perfil {perfilDe(aviso.perfil).t}. As peças agendadas desse perfil já podem sair.</Faixa>}
      {aviso.ficou && <Faixa tipo="aviso">{aviso.ficou}</Faixa>}
      {aviso.erro && <Faixa tipo="erro">Não deu para conectar: {aviso.erro}</Faixa>}
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !dados && <Carregando />}
      {dados && (dados.length ? [...Object.keys(PERFIS).map((perfil) => {
        // As redes que já conectam, em cada perfil. No Brasil com o que cada uma precisa; no inglês, sem repetir.
        const lista = dados.filter((r: any) => r.disponivel);
        return (
          <section className="perfil-secao" key={perfil} aria-labelledby={`perfil-${perfil}`}>
            <div className="perfil-secao-topo">
              <h2 id={`perfil-${perfil}`}><EtiquetaPerfil perfil={perfil} sempre />{PERFIS[perfil].t}</h2>
              <p className="mudo">{PERFIS[perfil].sobre}</p>
            </div>
            <div className="redes">
              {lista.map((r: any) => (
                <CartaoRede key={r.id} r={r} perfil={perfil} compacto={perfil !== 'br'} ocupado={ocupado} pode={pode('redes.conectar')}
                  conectar={() => conectar(r.id, perfil)} desligar={(c) => desligar(c, r.nome)} mudarPerfil={(c) => mudarPerfil(c, r.nome)} />
              ))}
            </div>
          </section>
        );
      }),
      // As redes que ainda não publicam ficam no fim, uma vez só (valem para os dois perfis quando entrarem).
      dados.some((r: any) => !r.disponivel) && (
        <section className="perfil-secao" key="em-breve" aria-labelledby="perfil-em-breve">
          <div className="perfil-secao-topo">
            <h2 id="perfil-em-breve">Em breve</h2>
            <p className="mudo">Redes que ainda não publicam pelo sistema. Quando entrarem, aparecem nos dois perfis.</p>
          </div>
          <div className="redes">
            {dados.filter((r: any) => !r.disponivel).map((r: any) => (
              <CartaoRede key={r.id} r={r} perfil="br" compacto={false} ocupado={ocupado} pode={pode('redes.conectar')}
                conectar={() => undefined} desligar={() => undefined} mudarPerfil={() => undefined} />
            ))}
          </div>
        </section>
      )] : <Vazio titulo="Nenhuma rede cadastrada." />)}
      {!pode('redes.conectar') && <p className="mudo" style={{ fontSize: 13, marginTop: 14 }}>Só o administrador conecta, desliga e muda o perfil das contas.</p>}
    </div>
  );
}

function CartaoRede({ r, perfil, compacto, ocupado, pode, conectar, desligar, mudarPerfil }: {
  r: any; perfil: string; compacto: boolean; ocupado: string | null; pode: boolean;
  conectar: () => void; desligar: (c: any) => void; mudarPerfil: (c: any) => void;
}) {
  // Só as contas deste perfil (conta antiga, sem perfil, é do Brasil).
  const ativas = (r.conexoes || []).filter((c: any) => c.status !== 'desligada' && (c.perfil || 'br') === perfil);
  const conectada = ativas.some((c: any) => c.status === 'ativa');
  const reconectar = ativas.some((c: any) => c.status === 'expirada' || (c.status === 'ativa' && c.faltam?.length));
  const situacao = conectada ? <Etiqueta cor="verde">Conectada</Etiqueta> : !r.disponivel ? <Etiqueta>Em breve</Etiqueta>
    : !r.configurada ? <Etiqueta cor="ambar">Falta configurar</Etiqueta> : <Etiqueta cor="azul">Pronta para conectar</Etiqueta>;
  const outro = perfil === 'en' ? 'br' : 'en';
  const chave = `${perfil}:${r.id}`;
  return (
    <article className="rede" style={{ ['--cor' as any]: r.cor || REDES[r.id]?.cor }}>
      <div className="rede-topo">
        <h3><span className="ponto-rede" style={{ background: r.cor || REDES[r.id]?.cor }} />{r.nome}</h3>
        {situacao}
      </div>
      {!compacto && r.descricao && <p className="mudo" style={{ margin: 0, fontSize: 14 }}>{r.descricao}</p>}
      {!compacto && <div className="formatos">{(r.formatos || []).map((f: string) => <Etiqueta key={f}>{FORMATOS[f] || f}</Etiqueta>)}</div>}
      {!compacto && r.requisitos?.length > 0 && <div>
        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600 }}>O que precisa</p>
        <ul>{r.requisitos.map((q: string) => <li key={q}>{q}</li>)}</ul>
      </div>}
      {ativas.map((c: any) => (
        <div className="rede-conta" key={c.id}>
          {c.conta_foto ? <img src={c.conta_foto} alt="" /> : <span className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{(c.conta_nome || '?').slice(0, 2).toUpperCase()}</span>}
          <div>
            <b>{c.conta_nome || 'Conta'}</b>
            <span>{c.status === 'ativa' ? `Desde ${dataHora(c.criado_em)}${c.expira_em ? ` · renova até ${dataHora(c.expira_em)}` : ''}` : c.status === 'expirada' ? 'Login vencido: conecte de novo' : c.ultimo_erro || 'Com erro'}</span>
            {c.status === 'ativa' && c.faltam?.length > 0 && <span style={{ color: 'var(--ambar)' }}>Falta liberar: {c.faltam.join(', ')}. Conecte de novo.</span>}
          </div>
          {pode && <span className="rede-conta-acoes">
            <button className="bt-icone" aria-label={`Mudar para o perfil ${PERFIS[outro].curto}`} title={`Mudar para o perfil ${PERFIS[outro].curto}`} disabled={ocupado === c.id} onClick={() => mudarPerfil(c)}><ArrowLeftRight /></button>
            <button className="bt-icone" aria-label="Desligar conta" title="Desligar" disabled={ocupado === c.id} onClick={() => desligar(c)}><Power /></button>
          </span>}
        </div>
      ))}
      {compacto && !ativas.length && <p className="mudo" style={{ margin: 0, fontSize: 13.5 }}>Nenhuma conta de {r.nome} neste perfil.</p>}
      {pode && r.disponivel && (
        <button className={`bt ${conectada && !reconectar ? '' : 'bt-tinta'}`} disabled={!r.configurada || ocupado === chave} onClick={conectar}
          title={r.configurada ? undefined : 'Falta configurar o app desta rede no servidor'}>
          <Plug />{ocupado === chave ? 'Abrindo…' : reconectar ? 'Conectar de novo' : conectada ? 'Conectar outra conta' : `Conectar no perfil ${PERFIS[perfil].curto}`}
        </button>
      )}
      {pode && r.disponivel && r.configurada && r.id === 'instagram' && <p className="campo-dica" style={{ margin: 0 }}>Na tela do Instagram, entre com a conta {perfil === 'en' ? 'em inglês' : 'do Brasil'}. Conta que já está no outro perfil continua lá.</p>}
      {pode && r.disponivel && r.configurada && r.id === 'facebook' && <p className="campo-dica" style={{ margin: 0 }}>Um login do Facebook pode liberar várias Páginas. Na tela do Facebook, marque só a Página {perfil === 'en' ? 'em inglês' : 'do Brasil'}.</p>}
      {!r.disponivel && <p className="campo-dica" style={{ margin: 0 }}>O módulo desta rede ainda não publica. Entra numa próxima etapa.</p>}
      {r.disponivel && !r.configurada && <p className="campo-dica" style={{ margin: 0 }}>Falta colocar no servidor as chaves do app desta rede.</p>}
    </article>
  );
}
