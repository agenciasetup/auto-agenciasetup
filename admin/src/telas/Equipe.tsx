// Equipe (quem tem equipe.ver) ou Minha conta (os outros): convidar, cargo, ativo, link de acesso, trocar senha.
import { useEffect, useState } from 'react';
import { KeyRound, Link2, Save, UserPlus } from 'lucide-react';
import { get, patch, post } from '../nucleo/api';
import { senhaForte, trocarSenha } from '../nucleo/auth';
import { Campo, Carregando, Celula, ErroCarga, Escolha, Etiqueta, Faixa, Grupo, Marcar, Modal, Segredo, Titulo, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { DESCRICAO_PAPEL, NOME_PAPEL, haQuanto, iniciais } from '../nucleo/util';

export default function Equipe() {
  const { pode } = useSessao();
  useEffect(() => { document.title = `${pode('equipe.ver') ? 'Equipe' : 'Minha conta'} | Painel Agência Setup`; }, [pode]);
  return pode('equipe.ver') ? <ListaEquipe /> : <div className="tela tela-estreita"><Titulo titulo="Minha conta" /><MinhaConta /></div>;
}

function ListaEquipe() {
  const { eu, pode } = useSessao();
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/equipe'), []);
  const [convite, setConvite] = useState<any>(null);
  const [editando, setEditando] = useState<any>(null);
  const [link, setLink] = useState<{ nome: string; link: string } | null>(null);
  const { ocupado, rodar } = useAcao();
  const podeEditar = pode('equipe.editar');
  const papeis = Object.keys(NOME_PAPEL).map((p) => ({ v: p, t: NOME_PAPEL[p] }));

  const convidar = () => rodar('convidar', async () => {
    if (!/^\S+@\S+\.\S+$/.test(convite.email.trim())) throw new Error('Confira o e-mail.');
    if (!convite.nome.trim()) throw new Error('Coloque o nome da pessoa.');
    const r = await post('/equipe', { email: convite.email.trim().toLowerCase(), nome: convite.nome.trim(), papel: convite.papel });
    setConvite(null);
    setLink({ nome: r.membro?.nome || convite.nome, link: r.link });
    recarregar();
  }, 'Convite criado.');

  const salvar = () => rodar('salvar', async () => {
    await patch(`/equipe/${editando.id}`, { nome: editando.nome, papel: editando.papel, ativo: editando.ativo });
    setEditando(null);
    recarregar();
  }, 'Alteração salva.');

  const gerarLink = (m: any) => rodar(`link-${m.id}`, async () => {
    const r = await post(`/equipe/${m.id}/link`);
    setEditando(null);
    setLink({ nome: m.nome, link: r.link });
  });

  return (
    <div className="tela tela-estreita">
      <Titulo titulo="Equipe" sub="Quem entra no painel e o que cada um pode fazer."
        acoes={podeEditar ? <button className="bt bt-tinta" onClick={() => setConvite({ email: '', nome: '', papel: 'redator' })}><UserPlus />Convidar</button> : undefined} />
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !dados && <Carregando />}
      {dados && (
        <Grupo>
          {dados.map((m: any) => (
            <Celula key={m.id} icone={<span style={{ fontWeight: 700, fontSize: 13 }}>{iniciais(m.nome)}</span>} cor={m.ativo ? 'laranja' : undefined}
              titulo={<>{m.nome}{m.id === eu.usuario.id ? <span className="mudo"> (você)</span> : null}</>}
              sub={`${m.email} · ${m.convite_pendente ? 'convite ainda não aceito' : `entrou ${haQuanto(m.ultimo_acesso)}`}`}
              direita={<>{!m.ativo ? <Etiqueta cor="vermelho">Desativado</Etiqueta> : m.convite_pendente ? <Etiqueta cor="ambar">Convidado</Etiqueta> : null}<Etiqueta>{NOME_PAPEL[m.papel] || m.papel}</Etiqueta></>}
              onClick={podeEditar ? () => setEditando({ ...m }) : undefined} />
          ))}
        </Grupo>
      )}
      <Grupo titulo="Cargos">
        {Object.keys(NOME_PAPEL).map((p) => <p key={p} style={{ margin: '0 0 8px' }}><b>{NOME_PAPEL[p]}:</b> <span className="mudo">{DESCRICAO_PAPEL[p]}</span></p>)}
      </Grupo>
      <Grupo titulo="Minha conta"><MinhaConta embutida /></Grupo>

      <Modal titulo="Convidar para o painel" aberto={!!convite} fechar={() => setConvite(null)}
        rodape={<><button className="bt bt-texto" onClick={() => setConvite(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado} onClick={convidar}><UserPlus />Criar convite</button></>}>
        {convite && <>
          <Campo rotulo="E-mail" tipo="email" valor={convite.email} mudar={(v) => setConvite({ ...convite, email: v })} autoFocus />
          <Campo rotulo="Nome" valor={convite.nome} mudar={(v) => setConvite({ ...convite, nome: v })} />
          <Escolha rotulo="Cargo" valor={convite.papel} mudar={(v) => setConvite({ ...convite, papel: v })} opcoes={papeis} dica={DESCRICAO_PAPEL[convite.papel]} />
          <p className="campo-dica">Você recebe um link de convite para mandar à pessoa (WhatsApp ou e-mail). Com ele, ela cria a própria senha.</p>
        </>}
      </Modal>

      <Modal titulo={editando ? editando.nome : ''} aberto={!!editando} fechar={() => setEditando(null)}
        rodape={editando && <>
          <button className="bt bt-texto" disabled={!!ocupado} onClick={() => gerarLink(editando)}><Link2 />Gerar link de acesso</button>
          <button className="bt bt-tinta" disabled={!!ocupado} onClick={salvar}><Save />Salvar</button>
        </>}>
        {editando && <>
          {editando.id === eu.usuario.id && <Faixa tipo="aviso">Esta é a sua conta. Cuidado para não tirar o seu próprio acesso de administrador.</Faixa>}
          <Campo rotulo="Nome" valor={editando.nome} mudar={(v) => setEditando({ ...editando, nome: v })} />
          <Campo rotulo="E-mail" valor={editando.email} mudar={() => {}} desativado />
          <Escolha rotulo="Cargo" valor={editando.papel} mudar={(v) => setEditando({ ...editando, papel: v })} opcoes={papeis} dica={DESCRICAO_PAPEL[editando.papel]} />
          <Marcar rotulo="Acesso ativo" valor={editando.ativo} mudar={(v) => setEditando({ ...editando, ativo: v })} dica="Desativado não entra no painel e as chaves e conexões dele param." />
          <p className="campo-dica">O link de acesso serve para quem perdeu o convite ou esqueceu a senha.</p>
        </>}
      </Modal>

      <Modal titulo="Link de acesso" aberto={!!link} fechar={() => setLink(null)} rodape={<button className="bt bt-tinta" onClick={() => setLink(null)}>Pronto</button>}>
        {link && <>
          <p style={{ marginTop: 0 }}>Mande este link para <b>{link.nome}</b>. Ele vale uma vez e vence em pouco tempo.</p>
          <Segredo texto={link.link} aviso="Não publique este link: quem abrir primeiro cria a senha da conta." />
        </>}
      </Modal>
    </div>
  );
}

function MinhaConta({ embutida }: { embutida?: boolean }) {
  const { eu, recarregarEu } = useSessao();
  const [nome, setNome] = useState(eu.usuario.nome);
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const { ocupado, rodar } = useAcao();
  const corpo = <>
    <Campo rotulo="Nome" valor={nome} mudar={setNome} />
    <p className="campo-dica" style={{ margin: '-6px 0 12px' }}>{eu.usuario.email} · {eu.usuario.nome_papel}</p>
    <div className="barra-acoes" style={{ marginBottom: 18 }}>
      <button className="bt" disabled={!!ocupado || !nome.trim() || nome === eu.usuario.nome} onClick={() => rodar('nome', async () => { await patch('/eu', { nome: nome.trim() }); recarregarEu(); }, 'Nome salvo.')}><Save />Salvar nome</button>
    </div>
    <Campo rotulo="Senha nova" tipo="password" valor={senha} mudar={setSenha} dica={senha && !senhaForte(senha) ? 'Ainda fraca: 10 caracteres, maiúscula, minúscula e número.' : undefined} />
    <Campo rotulo="Repita a senha" tipo="password" valor={senha2} mudar={setSenha2} />
    <button className="bt" disabled={!!ocupado || !senhaForte(senha) || !senha2} onClick={() => rodar('senha', async () => {
      if (senha !== senha2) throw new Error('As duas senhas não são iguais.');
      await trocarSenha(senha); setSenha(''); setSenha2('');
    }, 'Senha trocada.')}><KeyRound />Trocar senha</button>
  </>;
  return embutida ? corpo : <Grupo>{corpo}</Grupo>;
}
