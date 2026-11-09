// SEO e Google (fase C de docs/seo-geo.md): os números do Google Search Console, importados todo dia de manhã pela
// conta robô (worker/lib/searchconsole.js), e as oportunidades que viram pauta. Ação: verSeo em worker/lib/acoes-seo.js.
import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ExternalLink, RefreshCw, Search } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { Link } from '../nucleo/roteador';
import { Abas, Carregando, ErroCarga, Etiqueta, Faixa, Grupo, Titulo, Vazio, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { compacto, haQuanto, numero } from '../nucleo/util';
import { Colunas } from './comum';

const NOME_SITE: Record<string, string> = { 'sc-domain:agenciasetup.com.br': 'agenciasetup.com.br', 'sc-domain:agenciasetup.com': 'agenciasetup.com (inglês)' };
const ENDERECO: Record<string, string> = { 'sc-domain:agenciasetup.com.br': 'https://agenciasetup.com.br', 'sc-domain:agenciasetup.com': 'https://agenciasetup.com' };
const TIPO_OPORTUNIDADE: Record<string, { t: string; cor: string }> = {
  titulo: { t: 'Pouco clique', cor: 'ambar' },
  reforcar: { t: 'Quase na 1ª página', cor: 'azul' },
  nova: { t: 'Sem página própria', cor: 'verde' },
};
const pct = (n?: number | null) => `${((n || 0) * 100).toFixed(1).replace('.', ',')}%`;
const pos = (n?: number | null) => (n == null ? '–' : n.toFixed(1).replace('.', ','));
const dia = (iso: string) => { const [, m, d] = iso.split('-'); return `${d}/${m}`; };

// A variação contra os 28 dias antes. Na posição, menor é melhor.
function Variacao({ agora, antes, menorMelhor }: { agora?: number | null; antes?: number | null; menorMelhor?: boolean }) {
  if (agora == null || antes == null || !antes) return null;
  const d = menorMelhor ? antes - agora : agora - antes;
  const relativo = menorMelhor ? d : (d / antes) * 100;
  if (Math.abs(relativo) < 0.5) return <small className="mudo"> igual</small>;
  const bom = d > 0;
  return <small style={{ color: bom ? 'var(--verde, #30d158)' : 'var(--vermelho, #ff453a)', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
    {bom ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{menorMelhor ? `${Math.abs(d).toFixed(1).replace('.', ',')} posições` : `${Math.abs(relativo).toFixed(0)}%`}
  </small>;
}

export default function Seo() {
  const { pode } = useSessao();
  const [site, setSite] = useState('sc-domain:agenciasetup.com.br');
  const [aba, setAba] = useState('oportunidades');
  const { dados, erro, carregando, recarregar } = useCarregar(() => get(`/seo?site=${encodeURIComponent(site)}`), [site]);
  const { ocupado, rodar } = useAcao();
  const [pautas, setPautas] = useState<Record<string, boolean>>({});
  useEffect(() => { document.title = 'SEO e Google | Painel Agência Setup'; }, []);

  if (erro) return <div className="tela"><ErroCarga erro={erro} tentar={recarregar} /></div>;
  if (!dados) return <div className="tela"><Carregando /></div>;

  const importar = () => rodar('importar', async () => { await post('/seo/importar', { site }); await recarregar(); }, 'Números atualizados.');
  const virarPauta = (o: any) => rodar(`pauta:${o.consulta}`, async () => {
    const r = await post('/seo/pauta', { consulta: o.consulta, tipo: o.tipo, motivo: o.motivo, acao: o.acao, pagina: o.pagina });
    setPautas((p) => ({ ...p, [o.consulta + o.tipo]: true }));
    return r;
  }, 'Virou pauta.');

  const imp = dados.importacao;
  const a = dados.atual || {};
  const b = dados.anterior;
  const temNumeros = (dados.serie || []).length > 0;

  return (
    <div className="tela">
      <Titulo titulo="SEO e Google" sub="O que as pessoas buscam no Google e acham o site: cliques, aparições, posição e onde dá para ganhar mais."
        acoes={<>
          {dados.conectado && pode('conteudo.publicar') && <button className="bt" disabled={!!ocupado || carregando} onClick={importar}><RefreshCw />{ocupado === 'importar' ? 'Buscando…' : 'Buscar agora'}</button>}
          <a className="bt bt-texto" href={`https://search.google.com/search-console?resource_id=${encodeURIComponent(site)}`} target="_blank" rel="noopener"><ExternalLink />Search Console</a>
        </>} />

      <Abas abas={dados.sites.map((s: string) => ({ id: s, t: NOME_SITE[s] || s }))} atual={site} mudar={setSite} />

      {!dados.conectado ? (
        <Grupo titulo="Ligar a leitura do Google">
          <Vazio icone={<Search />} titulo="Falta a conta robô do Google"
            texto={<>É uma conta do Google que só lê os números do Search Console, de graça. Você cria uma vez (uns 15 minutos), dá acesso de leitura nos dois sites e cola a chave em Integrações. O passo a passo está em docs/search-console-automatico.md.</>}
            acao={pode('integracoes.configurar') ? <Link className="bt bt-tinta" para="/integracoes">Abrir Integrações</Link> : undefined} />
        </Grupo>
      ) : !temNumeros ? (
        <>
          {imp && imp.ok === false && <Faixa tipo="erro">A última busca deu erro: {imp.erro}</Faixa>}
          <Grupo titulo="Ainda sem números">
            <Vazio icone={<Search />} titulo="Os números chegam na primeira busca" texto={`A conta robô (${dados.conta}) está ligada. O relógio busca todo dia a partir das 6h; para ver agora, toque em Buscar agora.`} />
          </Grupo>
        </>
      ) : <>
        {imp && imp.ok === false && <Faixa tipo="erro">A última busca deu erro ({haQuanto(imp.em)}): {imp.erro}</Faixa>}
        <div className="numeros">
          <div className="numero grande"><b>{compacto(a.cliques)}</b><span>cliques do Google em 28 dias <Variacao agora={a.cliques} antes={b?.cliques} /></span></div>
          <div className="numero"><b>{compacto(a.impressoes)}</b><span>vezes que apareceu <Variacao agora={a.impressoes} antes={b?.impressoes} /></span></div>
          <div className="numero"><b>{pct(a.ctr)}</b><span>de quem viu clicou <Variacao agora={a.ctr} antes={b?.ctr} /></span></div>
          <div className="numero"><b>{pos(a.posicao)}</b><span>posição média <Variacao agora={a.posicao} antes={b?.posicao} menorMelhor /></span></div>
        </div>

        <Grupo titulo="Cliques por dia" rodape={`Últimos ${dados.serie.length} dias com número fechado (o Google leva uns 2 dias para fechar). ${imp?.em ? `Buscado ${haQuanto(imp.em)}.` : ''}`}>
          <Colunas nome="Cliques" formatar={(n) => `${numero(n)} clique${n === 1 ? '' : 's'}`}
            itens={dados.serie.map((d: any) => ({ rotulo: dia(d.dia), valor: d.cliques, detalhe: `${dia(d.dia)}: ${numero(d.cliques)} cliques, apareceu ${numero(d.impressoes)} vezes` }))} />
        </Grupo>

        <Abas abas={[{ id: 'oportunidades', t: 'Oportunidades', n: dados.oportunidades.length }, { id: 'consultas', t: 'O que buscam' }, { id: 'paginas', t: 'Páginas' }]} atual={aba} mudar={setAba} />

        {aba === 'oportunidades' && (
          <Grupo rodape="Saem dos números dos últimos 28 dias. As que podem render mais vêm primeiro. Virar pauta manda para Pautas, de onde o Claude ou a equipe escrevem.">
            {!dados.oportunidades.length ? <Vazio titulo="Nenhuma oportunidade por enquanto" texto="Elas aparecem quando uma busca junta aparições suficientes. Com mais artigos no ar, a lista cresce." /> : (
              <div className="tabela-rolar">
                <table className="tabela">
                  <thead><tr><th>Busca</th><th>O que fazer</th><th className="num">Aparições</th><th className="num">Posição</th><th className="num">Clique</th><th /></tr></thead>
                  <tbody>
                    {dados.oportunidades.map((o: any) => {
                      const feito = pautas[o.consulta + o.tipo];
                      return (
                        <tr key={o.tipo + o.consulta}>
                          <td><b>{o.consulta}</b><br /><Etiqueta cor={TIPO_OPORTUNIDADE[o.tipo]?.cor}>{TIPO_OPORTUNIDADE[o.tipo]?.t || o.tipo}</Etiqueta>{o.pagina && <small className="mudo"> {o.pagina}</small>}</td>
                          <td><small>{o.motivo}</small><br /><small className="mudo">{o.acao}</small></td>
                          <td className="num">{numero(o.impressoes)}</td>
                          <td className="num">{pos(o.posicao)}</td>
                          <td className="num">{pct(o.ctr)}</td>
                          <td>{pode('pautas.editar') && <button className="bt bt-mini" disabled={feito || ocupado === `pauta:${o.consulta}`} onClick={() => virarPauta(o)}>{feito ? 'Na pauta' : 'Virar pauta'}</button>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Grupo>
        )}

        {aba === 'consultas' && (
          <Grupo rodape="O que as pessoas digitaram no Google antes de ver o site, nos últimos 28 dias.">
            {!dados.consultas.length ? <Vazio titulo="Nenhuma busca ainda" /> : (
              <div className="tabela-rolar">
                <table className="tabela">
                  <thead><tr><th>Busca</th><th className="num">Cliques</th><th className="num">Aparições</th><th className="num">Clique</th><th className="num">Posição</th></tr></thead>
                  <tbody>{dados.consultas.slice(0, 100).map((c: any) => (
                    <tr key={c.consulta}><td>{c.consulta}</td><td className="num">{numero(c.cliques)}</td><td className="num">{numero(c.impressoes)}</td><td className="num">{pct(c.ctr)}</td><td className="num">{pos(c.posicao)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Grupo>
        )}

        {aba === 'paginas' && (
          <Grupo rodape="Cada página do site no Google, nos últimos 28 dias.">
            {!dados.paginas.length ? <Vazio titulo="Nenhuma página ainda" /> : (
              <div className="tabela-rolar">
                <table className="tabela">
                  <thead><tr><th>Página</th><th className="num">Cliques</th><th className="num">Aparições</th><th className="num">Clique</th><th className="num">Posição</th></tr></thead>
                  <tbody>{dados.paginas.map((p: any) => (
                    <tr key={p.pagina}><td><a href={p.pagina.startsWith('http') ? p.pagina : `${ENDERECO[site]}${p.pagina}`} target="_blank" rel="noopener" className="mono">{p.pagina}</a></td><td className="num">{numero(p.cliques)}</td><td className="num">{numero(p.impressoes)}</td><td className="num">{pct(p.ctr)}</td><td className="num">{pos(p.posicao)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Grupo>
        )}
      </>}

      {dados.conectado && <p className="mudo" style={{ fontSize: 13 }}>Conta robô: {dados.conta}. O relógio busca os números todo dia a partir das 6h.</p>}
    </div>
  );
}
