// O plano: o que fazer agora (regras sobre os números, de graça, a cada abertura), ideias de posts e como vender e
// alcançar mais (o Claude escreve lendo os últimos resultados, a cada 3 dias ou no botão). A ideia vira pedido para o
// Claude; o post nasce rascunho como sempre. Lógica em worker/lib/plano.js.
import { useEffect, useState } from 'react';
import { Megaphone, RefreshCw, ShoppingBag, Sparkles, Target } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { Link } from '../nucleo/roteador';
import { Carregando, ErroCarga, Faixa, Grupo, Titulo, Vazio, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { haQuanto } from '../nucleo/util';
import { CartaoIdeia, ItemAgora } from './planoComum';

export default function Plano() {
  useEffect(() => { document.title = 'Plano | Painel Agência Setup'; }, []);
  const { pode } = useSessao();
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/plano'), []);
  const { ocupado, rodar } = useAcao();
  // A ideia marcada ou o plano refeito já voltam prontos: troco aqui, sem recarregar os números.
  const [novo, setNovo] = useState<any>(null);
  const d: any = dados;
  const plano = novo || d?.plano;
  const gerar = () => rodar('gerar', async () => { setNovo(await post('/plano')); }, 'Plano novo pronto.');
  const marcar = (id: string, status: string) => rodar('marcar', async () => { setNovo(await post(`/plano/ideias/${id}`, { status })); });
  const abertas = (plano?.ideias || []).filter((i: any) => i.status === 'nova');
  const fechadas = (plano?.ideias || []).filter((i: any) => i.status !== 'nova');
  const botao = d?.ia && pode('plano.gerar')
    ? <button className="bt bt-mini" disabled={!!ocupado} onClick={gerar}>{ocupado === 'gerar' ? <RefreshCw className="girar" /> : <Sparkles />}{ocupado === 'gerar' ? 'Pensando…' : plano ? 'Refazer agora' : 'Gerar agora'}</button>
    : undefined;

  return (
    <div className="tela">
      <Titulo titulo="Plano" sub="O que fazer agora, o que postar e como vender mais, a partir dos seus números. Nada aqui publica sozinho." acoes={botao} />
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !d && <Carregando />}
      {d && <>
        <Grupo titulo="O que fazer agora" rodape="Sai dos números de agora, sem custo. Cada item leva à tela onde se resolve.">
          {d.recomendacoes.length ? <div className="plano-agora-lista">{d.recomendacoes.map((r: any) => <ItemAgora key={r.id} r={r} />)}</div>
            : <Vazio icone={<Target />} titulo="Nada pedindo atenção agora" texto="Agenda em dia, nada com erro e ainda sem número suficiente para tirar conclusão." />}
        </Grupo>

        {!plano && !d.ia && <Faixa tipo="info">Ligue o Claude em <Link para="/integracoes">Integrações</Link> para ele escrever as ideias de posts.</Faixa>}
        {!plano && d.ia && <Vazio icone={<Sparkles />} titulo="As ideias ainda não foram escritas" texto="O relógio escreve sozinho nos próximos minutos e renova a cada 3 dias. Para ver agora, toque em Gerar agora (custa uns 20 centavos de dólar)." />}
        {plano && <>
          <Grupo titulo="Esta semana" rodape={`Escrito ${haQuanto(plano.criado_em)} pelo ${plano.modelo || 'Claude'} · custou US$ ${Number(plano.custo_usd || 0).toFixed(3).replace('.', ',')} · renova a cada 3 dias`}>
            <p className="plano-resumo">{plano.resumo}</p>
          </Grupo>
          <h2 className="sub-titulo">Ideias de posts</h2>
          {abertas.length ? <div className="plano-ideias">{abertas.map((i: any) => <CartaoIdeia key={i.id} i={i} marcar={pode('plano.gerar') ? marcar : undefined} ocupado={!!ocupado} />)}</div>
            : <Vazio icone={<Sparkles />} titulo="Todas as ideias já têm destino" texto="Toque em Refazer agora para receber novas." />}
          <p className="linha-pequena mudo plano-dica">Copiar pedido: cole no Claude e ele faz o post pela skill e deixa como rascunho. Ou diga no Claude "faz a primeira ideia do plano".</p>
          <div className="colunas">
            <div><ListaAcoes titulo="Para vender mais" icone={<ShoppingBag />} itens={plano.vender} /></div>
            <div><ListaAcoes titulo="Para alcançar mais gente" icone={<Megaphone />} itens={plano.alcance} /></div>
          </div>
          {fechadas.length > 0 && <>
            <h2 className="sub-titulo">Feitas e descartadas</h2>
            <div className="plano-ideias">{fechadas.map((i: any) => <CartaoIdeia key={i.id} i={i} marcar={pode('plano.gerar') ? marcar : undefined} ocupado={!!ocupado} />)}</div>
          </>}
        </>}
      </>}
    </div>
  );
}

function ListaAcoes({ titulo, icone, itens }: { titulo: string; icone: any; itens?: any[] }) {
  return (
    <Grupo titulo={<span className="plano-titulo-acao">{icone}{titulo}</span>}>
      {itens?.length ? itens.map((a, n) => (
        <div className="plano-acao" key={n}>
          <b>{a.titulo}</b>
          <p>{a.como}</p>
          <p className="plano-porque">{a.por_que}</p>
        </div>
      )) : <p className="mudo" style={{ margin: 0 }}>Sem ação sugerida neste plano.</p>}
    </Grupo>
  );
}
