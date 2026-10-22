// Entrar no painel. Três jeitos: e-mail e senha; link de convite (criar a senha); link de "esqueci a senha".
// O link só é usado quando a pessoa clica em "Continuar": a prévia do WhatsApp não queima o convite.
// Modelo: admin/src/nucleo/Entrar.tsx do olharondoniense.
import { useEffect, useState } from 'react';
import { KeyRound, Mail } from 'lucide-react';
import { aceitarLink, entrar, esqueciSenha, senhaForte, supabase, trocarSenha } from './auth';
import { Campo, Faixa, Logo } from './ui';

type Modo = 'entrar' | 'link' | 'senha' | 'esqueci' | 'enviado';

export default function Entrar({ aoEntrar, logado }: { aoEntrar: () => void; logado: boolean }) {
  const busca = new URLSearchParams(location.search);
  const tokenHash = busca.get('token');
  const tipo = (busca.get('tipo') as 'invite' | 'recovery') || 'invite';
  const [modo, setModo] = useState<Modo>(tokenHash ? 'link' : 'entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    document.title = 'Entrar | Painel Agência Setup';
    // Link de "esqueci a senha" que volta com a sessão no endereço (fluxo antigo do Supabase).
    const h = new URLSearchParams(location.hash.slice(1));
    if (h.get('access_token') && h.get('refresh_token')) {
      supabase.auth.setSession({ access_token: h.get('access_token')!, refresh_token: h.get('refresh_token')! }).then(({ error }) => {
        history.replaceState(null, '', '/admin/entrar');
        if (error) setErro('Este link venceu. Peça outro.');
        else setModo('senha');
      });
    }
  }, []);

  const rodar = async (fn: () => Promise<void>) => {
    setErro(null); setOcupado(true);
    try { await fn(); } catch (e: any) { setErro(e.message); } finally { setOcupado(false); }
  };

  const forte = senhaForte(senha);
  const titulo = modo === 'senha' ? 'Crie sua senha' : modo === 'link' ? (tipo === 'invite' ? 'Boas-vindas' : 'Nova senha') : modo === 'esqueci' || modo === 'enviado' ? 'Esqueci a senha' : 'Painel';
  const sub = modo === 'link' ? (tipo === 'invite' ? 'Você foi convidado para o painel da Agência Setup.' : 'Vamos criar uma senha nova para a sua conta.')
    : modo === 'senha' ? 'Pelo menos 10 caracteres, com letra maiúscula, minúscula e número.'
    : modo === 'esqueci' ? 'Mandamos um link para o seu e-mail.' : modo === 'enviado' ? '' : 'Entre com o e-mail e a senha da equipe.';

  return (
    <div className="entrar">
      <div className="entrar-cx">
        <div className="entrar-topo">
          <Logo />
          <h1>{titulo}</h1>
          {sub && <p className="mudo">{sub}</p>}
        </div>
        {erro && <Faixa tipo="erro">{erro}</Faixa>}
        {logado && modo === 'entrar' && <Faixa>Você já entrou. <a href="/admin/">Abrir o painel</a></Faixa>}

        {modo === 'entrar' && (
          <form onSubmit={(e) => { e.preventDefault(); rodar(async () => { await entrar(email, senha); aoEntrar(); }); }}>
            <Campo rotulo="E-mail" tipo="email" valor={email} mudar={setEmail} autoFocus />
            <Campo rotulo="Senha" tipo="password" valor={senha} mudar={setSenha} />
            <button className="bt bt-tinta bt-largo" disabled={ocupado || !email || !senha}>{ocupado ? 'Entrando…' : 'Entrar'}</button>
            <button type="button" className="bt bt-texto bt-largo" onClick={() => { setErro(null); setModo('esqueci'); }}>Esqueci a senha</button>
          </form>
        )}

        {modo === 'esqueci' && (
          <form onSubmit={(e) => { e.preventDefault(); rodar(async () => { await esqueciSenha(email); setModo('enviado'); }); }}>
            <Campo rotulo="E-mail da equipe" tipo="email" valor={email} mudar={setEmail} autoFocus
              dica="Se o e-mail não chegar em alguns minutos, peça ao administrador um link de acesso (Equipe, seu nome, Gerar link)." />
            <button className="bt bt-tinta bt-largo" disabled={ocupado || !email}><Mail />Mandar link</button>
            <button type="button" className="bt bt-texto bt-largo" onClick={() => setModo('entrar')}>Voltar</button>
          </form>
        )}

        {modo === 'enviado' && <>
          <Faixa tipo="ok">Se esse e-mail é da equipe, o link chegou. Abra pelo celular ou computador e crie a senha nova.</Faixa>
          <button type="button" className="bt bt-texto bt-largo" onClick={() => setModo('entrar')}>Voltar para entrar</button>
        </>}

        {modo === 'link' && (
          <button className="bt bt-tinta bt-largo" disabled={ocupado} onClick={() => rodar(async () => { await aceitarLink(tokenHash!, tipo); history.replaceState(null, '', '/admin/entrar'); setModo('senha'); })}>
            <KeyRound />{ocupado ? 'Conferindo…' : 'Continuar'}
          </button>
        )}

        {modo === 'senha' && (
          <form onSubmit={(e) => { e.preventDefault(); rodar(async () => { if (senha !== senha2) throw new Error('As duas senhas não são iguais.'); await trocarSenha(senha); history.replaceState(null, '', '/admin/'); aoEntrar(); }); }}>
            <Campo rotulo="Senha nova" tipo="password" valor={senha} mudar={setSenha} autoFocus dica={senha && !forte ? 'Ainda fraca: 10 caracteres, maiúscula, minúscula e número.' : undefined} />
            <Campo rotulo="Repita a senha" tipo="password" valor={senha2} mudar={setSenha2} />
            <button className="bt bt-tinta bt-largo" disabled={ocupado || !forte || !senha2}>{ocupado ? 'Salvando…' : 'Salvar e entrar'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
