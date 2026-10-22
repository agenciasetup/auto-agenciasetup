// Tela "Permitir" do conector: o app do Claude (ou outra IA) pediu para usar o painel com o login desta pessoa.
// Chega aqui pelo /oauth/authorize do Worker, que já conferiu o app e o endereço de volta.
// Modelo: admin/src/telas/Conectar.tsx do olharondoniense.
import { useEffect, useState } from 'react';
import { Bot, Globe, Laptop, ShieldCheck, UserRound } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { useRota } from '../nucleo/roteador';
import { Carregando, Celula, Escolha, Faixa, Grupo, Logo, useSessao } from '../nucleo/ui';

export default function Conectar() {
  const { eu } = useSessao();
  const { rota } = useRota();
  const pedido = rota.busca.get('pedido') || '';
  const [info, setInfo] = useState<any>(undefined);
  const [erro, setErro] = useState<string | null>(null);
  const [papel, setPapel] = useState<string>(eu.usuario.papel);
  const [indo, setIndo] = useState<string | null>(null);
  // O Permitir só responde 1 segundo depois de a tela aparecer: um site não consegue abrir esta página por baixo
  // de um clique duplo e roubar o segundo clique.
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    document.title = 'Conectar | Painel Agência Setup';
    if (!pedido) { setErro('Este endereço não traz nenhum pedido de conexão. Volte ao app e conecte de novo.'); setInfo(null); return; }
    get(`/oauth/pedido?p=${encodeURIComponent(pedido)}`)
      .then((i) => { setInfo(i); setPapel(i.papeis.some((p: any) => p.id === i.sugerido) ? i.sugerido : (i.papeis[0] || {}).id); })
      .catch((e) => { setErro(e.message); setInfo(null); });
  }, [pedido]);

  useEffect(() => {
    if (!info) return;
    let t: any;
    const armar = () => { clearTimeout(t); setPronto(false); if (document.visibilityState === 'visible') t = setTimeout(() => setPronto(true), 1000); };
    armar();
    document.addEventListener('visibilitychange', armar);
    window.addEventListener('focus', armar);
    return () => { clearTimeout(t); document.removeEventListener('visibilitychange', armar); window.removeEventListener('focus', armar); };
  }, [info]);

  const responder = async (permitir: boolean) => {
    setErro(null);
    setIndo(permitir ? `Voltando para ${info.volta}…` : 'Cancelando…');
    try {
      const r = await post('/oauth/aprovar', { pedido, permitir, papel });
      location.assign(r.destino);
    } catch (e: any) {
      setErro(e.message);
      setIndo(null);
    }
  };

  const escolhido = info && info.papeis.find((p: any) => p.id === papel);
  return (
    <div className="entrar">
      <div className="entrar-cx">
        <div className="entrar-topo">
          <Logo />
          <h1>Conectar {info ? info.app : 'app'}</h1>
          <p className="mudo">{info && info.conferido ? `${info.app} quer usar o painel da Agência Setup com a sua conta.` : 'Um app quer usar o painel da Agência Setup com a sua conta.'}</p>
        </div>
        {erro && <Faixa tipo="erro">{erro}</Faixa>}
        {info === undefined && <Carregando />}
        {info && <>
          <Grupo>
            <Celula icone={<Bot />} cor="roxo" titulo={info.conferido ? info.app : info.declarado ? `Diz que se chama “${info.declarado}”` : 'App sem nome'}
              sub={info.conhecido ? `Identidade conferida em ${info.host}` : info.conferido ? `Ficha publicada pelo próprio ${info.host}` : 'Nome dado pelo próprio app, sem conferência'} />
            <Celula icone={<UserRound />} titulo={eu.usuario.nome} sub={`Entra como você. ${eu.usuario.email}`} />
            <Celula icone={info.local ? <Laptop /> : <Globe />} titulo={`Volta para ${info.volta}`} sub={info.local ? 'Um programa aberto no seu computador' : 'Para onde você vai depois de permitir'} />
          </Grupo>
          {info.local && <Faixa tipo="aviso">O pedido volta para um programa no seu computador (como o Claude Code). Só permita se foi você que pediu agora.</Faixa>}
          {!info.conferido && !info.local && <Faixa tipo="aviso">Este app se registrou sozinho, então o nome não é conferido e ele liga no máximo como Redator. Só permita se você reconhece <b>{info.volta}</b>.</Faixa>}
          {info.conferido && !info.conhecido && !info.local && <Faixa tipo="aviso">Não é um dos apps que o painel já conhece (Claude, ChatGPT). Só permita se você reconhece <b>{info.host}</b>.</Faixa>}
          {!info.pode ? <Faixa tipo="erro">Seu cargo ({eu.usuario.nome_papel}) não liga IAs ao painel. Peça ao administrador.</Faixa> : (
            <Grupo rodape="A IA faz só o que esse cargo permite, pelas mesmas regras do painel. O que é perigoso ela só faz com o seu sim, e tudo fica no Histórico. Para desligar: Claude, Chaves e conexões.">
              <Escolha rotulo="Cargo desta conexão" valor={papel} mudar={setPapel} opcoes={info.papeis.map((p: any) => ({ v: p.id, t: p.nome }))} dica={escolhido && escolhido.descricao} />
            </Grupo>
          )}
          {info.pode && <button className="bt bt-tinta bt-largo" disabled={!!indo || !pronto} onClick={() => responder(true)}><ShieldCheck />{indo || 'Permitir'}</button>}
          <button className="bt bt-texto bt-largo" disabled={!!indo} onClick={() => responder(false)}>{info.pode ? 'Recusar' : 'Voltar ao app'}</button>
        </>}
        {info === null && <a className="bt bt-texto bt-largo" href="/admin/">Abrir o painel</a>}
      </div>
    </div>
  );
}
