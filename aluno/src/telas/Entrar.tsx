// Entrar: com o link do e-mail (automático), com o atalho logo depois de pagar, com código de 6 números ou com senha.
import { useEffect, useState } from 'react';
import { I, LOGO } from '../comum';
import { SITE, api } from '../nucleo/api';
import { entrarComCodigo, entrarComLink, entrarComSenha } from '../nucleo/auth';
import { useRota } from '../nucleo/rota';

// marca: no endereço de um curso com marca própria (aluno/src/leitor), a mesma tela com o nome e a cruz do curso,
// textos ainda mais simples e a ajuda no WhatsApp no lugar do "Veja os cursos" da Setup.
export function Entrar({ aoEntrar, marca = null }: { aoEntrar: (volta?: string) => void; marca?: { nome: string; whatsapp?: string } | null }) {
  const { rota } = useRota();
  const volta = rota.busca.get('volta') || '/';
  const [passo, setPasso] = useState<'email' | 'codigo' | 'senha' | 'abrindo'>('email');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  // Chegou pelo link do e-mail (?token=) ou pela tela de obrigado (?pedido=): entra sozinho.
  useEffect(() => {
    const hash = rota.busca.get('token');
    const pedido = rota.busca.get('pedido');
    if (!hash && !pedido) return;
    setPasso('abrindo');
    (async () => {
      try {
        if (hash) await entrarComLink(hash);
        else {
          const r = await api<{ token: string; email: string }>('/entrar-pedido', { corpo: { pedido }, semLogin: true });
          setEmail(r.email);
          await entrarComLink(r.token);
        }
        // O link dos e-mails pode levar direto a uma tela (?volta=/compras, a aula onde parou...).
        aoEntrar(volta.startsWith('/') && !volta.startsWith('//') ? volta : '/');
      } catch (e: any) {
        setErro(e.message);
        setPasso('email');
      }
    })();
  }, []);

  async function pedirCodigo(e?: any) {
    e && e.preventDefault();
    setErro('');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setErro('Confira o e-mail.'); return; }
    setOcupado(true);
    try { await api('/codigo', { corpo: { email }, semLogin: true }); setPasso('codigo'); } catch (er: any) { setErro(er.message); } finally { setOcupado(false); }
  }
  async function conferirCodigo(e: any) {
    e.preventDefault();
    setErro('');
    setOcupado(true);
    try { await entrarComCodigo(email, codigo); aoEntrar(volta); } catch (er: any) { setErro(er.message); } finally { setOcupado(false); }
  }
  async function comSenha(e: any) {
    e.preventDefault();
    setErro('');
    setOcupado(true);
    try { await entrarComSenha(email, senha); aoEntrar(volta); } catch (er: any) { setErro(er.message); } finally { setOcupado(false); }
  }

  return (
    <div className="entrar-tela gutter">
      <div className="entrar-caixa">
        {marca ? <span className="logo lt-marca"><span className="lt-cruz" aria-hidden="true" />{marca.nome}</span> : <span className="logo">{LOGO}<span>Setup</span><small>Cursos</small></span>}
        {passo === 'abrindo' ? (
          <><h1>{marca ? 'Abrindo o seu livro...' : 'Abrindo o seu curso...'}</h1><p className="mudo"><span className="giro" /> Só um instante.</p></>
        ) : passo === 'email' ? (
          <form onSubmit={pedirCodigo}>
            <h1>{marca ? 'Entre para ler' : 'Entre no seu curso'}</h1>
            <p className="mudo">{marca ? 'Digite o e-mail que você usou na compra. Vamos mandar um código de 6 números para ele.' : 'Use o e-mail da compra. Mandamos um código de 6 números na hora.'}</p>
            <div className="campo"><label htmlFor="email">E-mail</label><input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></div>
            {erro ? <p className="erro-txt" role="alert">{erro}</p> : null}
            <button className="bt bt-marca bt-g bt-cheio" disabled={ocupado}><I n="email" />{ocupado ? 'Enviando...' : 'Receber código'}</button>
            <button type="button" className="link-simples" onClick={() => { setErro(''); setPasso('senha'); }}>Prefiro entrar com senha</button>
          </form>
        ) : passo === 'codigo' ? (
          <form onSubmit={conferirCodigo}>
            <h1>Digite o código</h1>
            <p className="mudo">Mandamos para <b>{email}</b>. Não chegou em 1 minuto? Olhe o spam ou peça de novo.</p>
            <div className="campo"><label htmlFor="codigo">Código</label><input id="codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} autoFocus className="codigo" /></div>
            {erro ? <p className="erro-txt" role="alert">{erro}</p> : null}
            <button className="bt bt-marca bt-g bt-cheio" disabled={ocupado || codigo.length < 6}>{ocupado ? 'Conferindo...' : 'Entrar'}</button>
            <div className="entrar-links"><button type="button" className="link-simples" onClick={() => pedirCodigo()}>Pedir outro código</button><button type="button" className="link-simples" onClick={() => { setCodigo(''); setPasso('email'); }}>Trocar o e-mail</button></div>
          </form>
        ) : (
          <form onSubmit={comSenha}>
            <h1>Entrar com senha</h1>
            <p className="mudo">Só se você já criou uma senha no seu perfil.</p>
            <div className="campo"><label htmlFor="email2">E-mail</label><input id="email2" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="campo"><label htmlFor="senha">Senha</label><input id="senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
            {erro ? <p className="erro-txt" role="alert">{erro}</p> : null}
            <button className="bt bt-marca bt-g bt-cheio" disabled={ocupado}>{ocupado ? 'Entrando...' : 'Entrar'}</button>
            <button type="button" className="link-simples" onClick={() => { setErro(''); setPasso('email'); }}>Entrar com código</button>
          </form>
        )}
        {marca ? (marca.whatsapp ? <p className="fraco entrar-ajuda">Não está conseguindo entrar? <a href={`https://wa.me/${marca.whatsapp}`} target="_blank" rel="noopener">Fale com a gente no WhatsApp</a></p> : null)
          : <p className="fraco entrar-ajuda">Ainda não comprou? <a href={`${SITE}/cursos`}>Veja os cursos</a></p>}
      </div>
    </div>
  );
}
