// Claude: como ligar o app do Claude (login) e o Claude Code (chave), e as conexões que estão valendo.
import { useEffect, useState } from 'react';
import { Bot, KeyRound, Plus, Trash2 } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { BotaoCopiar, Campo, Carregando, Celula, ErroCarga, Escolha, Etiqueta, Faixa, Grupo, Modal, Segredo, Titulo, Vazio, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { DESCRICAO_PAPEL, NOME_PAPEL, dataHora, haQuanto } from '../nucleo/util';

const NIVEL: Record<string, number> = { administrador: 3, editor: 2, redator: 1 };

export default function Claude() {
  const { eu, pode } = useSessao();
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/claude'), []);
  const [nova, setNova] = useState<any>(null);
  const [criada, setCriada] = useState<string | null>(null);
  const { ocupado, rodar } = useAcao();
  useEffect(() => { document.title = 'Claude | Painel Agência Setup'; }, []);

  const mcp = dados?.mcp_url || eu.mcp_url || `${location.origin}/mcp`;
  const papeis = Object.keys(NIVEL).filter((p) => NIVEL[p] <= (NIVEL[eu.usuario.papel] || 1));
  const comando = `claude mcp add --transport http agencia-setup ${mcp} --header "Authorization: Bearer ${criada || 'SUA_CHAVE'}"`;

  const criar = () => rodar('criar', async () => {
    if (!nova.nome.trim()) throw new Error('Dê um nome para lembrar onde esta chave está (ex.: Claude Code do notebook).');
    const r = await post('/claude/chaves', { nome: nova.nome.trim(), papel: nova.papel });
    setNova(null);
    setCriada(r.chave);
    recarregar();
  });
  const revogar = (c: any) => {
    if (!confirm(`Desligar "${c.nome}"? Quem usa esta ${c.conector ? 'conexão' : 'chave'} perde o acesso na hora.`)) return;
    rodar(c.id, async () => { await post(`/claude/chaves/${c.id}/revogar`); recarregar(); }, 'Desligada.');
  };

  const chaves = dados?.chaves || [];
  const conexoes = chaves.filter((c: any) => c.conector);
  const manuais = chaves.filter((c: any) => !c.conector);
  const linha = (c: any) => (
    <Celula key={c.id} icone={c.conector ? <Bot /> : <KeyRound />} cor={c.conector ? 'roxo' : 'laranja'} titulo={c.nome}
      sub={[NOME_PAPEL[c.papel] || c.papel, c.dono ? c.dono.nome : 'Chave do sistema', `${c.prefixo}…`, c.ultimo_uso ? `usada ${haQuanto(c.ultimo_uso)}` : 'nunca usada', c.usos ? `${c.usos} usos` : null].filter(Boolean).join(' · ')}
      direita={<>
        {c.expira_em && !c.conector && <Etiqueta cor="ambar">vence {dataHora(c.expira_em)}</Etiqueta>}
        {(pode('chaves.todas') || (c.dono && c.dono.id === eu.usuario.id)) && <button className="bt-icone" aria-label="Desligar" title="Desligar" disabled={ocupado === c.id} onClick={() => revogar(c)}><Trash2 /></button>}
      </>} />
  );

  return (
    <div className="tela tela-estreita">
      <Titulo titulo="Claude" sub="Mande um texto no Claude e ele cria o recurso, a novidade e as peças das redes." />

      <Grupo titulo="Endereço do conector">
        <code className="codigo" style={{ marginBottom: 10 }}>{mcp}</code>
        <BotaoCopiar texto={mcp} rotulo="Copiar endereço" />
      </Grupo>

      <Grupo titulo="No app do Claude (site, computador e celular)" rodape="O Claude entra com o seu login e faz só o que o cargo escolhido permite. Tudo fica no Histórico.">
        <ol className="passos">
          <li>No Claude, abra <b>Configurações</b> e depois <b>Conectores</b>.</li>
          <li>Toque em <b>Adicionar conector personalizado</b>.</li>
          <li>Dê o nome <b>Agência Setup</b> e cole o endereço acima.</li>
          <li>Toque em <b>Conectar</b>. Vai abrir este painel: entre com seu e-mail e senha.</li>
          <li>Confira o cargo e toque em <b>Permitir</b>. Pronto: o Claude volta conectado.</li>
        </ol>
      </Grupo>

      <Grupo titulo="No Claude Code (terminal)" rodape="O Claude Code usa uma chave colada à mão. Crie uma abaixo e troque SUA_CHAVE por ela.">
        <code className="codigo" style={{ marginBottom: 10 }}>{comando}</code>
        <BotaoCopiar texto={comando} rotulo="Copiar comando" />
      </Grupo>

      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !dados && <Carregando />}
      {dados && <>
        <Grupo titulo="Apps conectados pelo login">
          {conexoes.length ? conexoes.map(linha) : <Vazio titulo="Nenhum app conectado ainda." texto="Siga os passos acima no app do Claude." />}
        </Grupo>
        <Grupo titulo="Chaves" acoes={pode('chaves.proprias') ? <button className="bt bt-mini" onClick={() => setNova({ nome: '', papel: papeis.includes('editor') ? 'editor' : papeis[0] })}><Plus />Nova chave</button> : undefined}>
          {manuais.length ? manuais.map(linha) : <Vazio titulo="Nenhuma chave." texto="Chave serve para o Claude Code e para scripts." />}
        </Grupo>
      </>}

      <Modal titulo="Nova chave" aberto={!!nova} fechar={() => setNova(null)}
        rodape={<><button className="bt bt-texto" onClick={() => setNova(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado} onClick={criar}><KeyRound />Criar chave</button></>}>
        {nova && <>
          <Campo rotulo="Nome" valor={nova.nome} mudar={(v) => setNova({ ...nova, nome: v })} autoFocus placeholder="Claude Code do notebook" />
          <Escolha rotulo="Cargo da chave" valor={nova.papel} mudar={(v) => setNova({ ...nova, papel: v })} opcoes={papeis.map((p) => ({ v: p, t: NOME_PAPEL[p] }))} dica={DESCRICAO_PAPEL[nova.papel]} />
        </>}
      </Modal>

      <Modal titulo="Chave criada" aberto={!!criada} fechar={() => setCriada(null)} rodape={<button className="bt bt-tinta" onClick={() => setCriada(null)}>Já copiei</button>}>
        {criada && <>
          <Faixa tipo="aviso">Copie agora: esta chave não aparece de novo. Se perder, desligue e crie outra.</Faixa>
          <Segredo texto={criada} />
          <p className="campo-dica" style={{ marginTop: 14 }}>Comando pronto para o Claude Code:</p>
          <code className="codigo" style={{ margin: '6px 0 10px' }}>{comando}</code>
          <BotaoCopiar texto={comando} rotulo="Copiar comando" />
        </>}
      </Modal>
    </div>
  );
}
