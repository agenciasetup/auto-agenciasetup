// Desempenho: o que funcionou em cada rede (Instagram, Facebook, YouTube...). Sem perfeição: números de cada post, os melhores, e os cortes por formato,
// tema, "Comenta X" e horário. O relógio atualiza sozinho; "Atualizar agora" puxa uma fatia na hora.
import { useEffect, useState } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { Link } from '../nucleo/roteador';
import { Carregando, ErroCarga, Faixa, Grupo, Paginacao, Titulo, Vazio, useAcao, useCarregar } from '../nucleo/ui';
import { DIA_SEMANA, FORMATOS, REDES, TEMA, compacto, numero, perfilDe, porcento } from '../nucleo/util';
import { Barras, FiltroPerfil, LinhaPost } from './comum';

const PERIODOS = [{ d: 7, t: '7 dias' }, { d: 30, t: '30 dias' }, { d: 90, t: '90 dias' }, { d: 365, t: '1 ano' }, { d: 3650, t: 'Tudo' }];
const ORDENS = [{ v: 'recentes', t: 'Mais recentes' }, { v: 'nota', t: 'Melhor engajamento' }, { v: 'comentarios', t: 'Mais comentados' }, { v: 'curtidas', t: 'Mais curtidos' }, { v: 'salvos', t: 'Mais salvos' }, { v: 'compartilhamentos', t: 'Mais compartilhados' }, { v: 'alcance', t: 'Maior alcance' }];

// embutido: a aba "O que funciona" de Resultados (o período, a rede e o perfil vêm de lá; sem título nem lista de posts).
// Um perfil por vez (padrão Brasil): o ranking e as medianas de um nunca se misturam com os do outro.
export default function Desempenho({ embutido, dias: diasFora, rede: redeFora, perfil: perfilFora }: { embutido?: boolean; dias?: number; rede?: string; perfil?: string } = {}) {
  const [diasProprio, setDias] = useState(30);
  const [redeProprio, setRede] = useState('instagram');
  const [perfilProprio, setPerfil] = useState('br');
  const dias = embutido ? diasFora || 30 : diasProprio;
  const rede = embutido ? redeFora || 'instagram' : redeProprio;
  const perfil = embutido ? perfilFora || 'br' : perfilProprio;
  const { dados, erro, carregando, recarregar } = useCarregar(() => get(`/desempenho?dias=${dias}&rede=${rede}&perfil=${perfil}`), [dias, rede, perfil]);
  const { ocupado, rodar } = useAcao();
  const [pulou, setPulou] = useState(false);
  useEffect(() => { if (!embutido) document.title = 'Desempenho | Painel Agência Setup'; }, [embutido]);
  // Mês sem post (conta parada): abre direto no último ano, que é onde está o que funcionou.
  useEffect(() => { if (!embutido && dados && !dados.posts && dias === 30 && !pulou) { setPulou(true); setDias(365); } }, [dados, dias, pulou, embutido]);

  const atualizar = () => rodar('atualizar', async () => {
    const r = await post('/desempenho/atualizar', { rede, perfil });
    recarregar();
    const aviso = [...(r.posts || []), ...(r.metricas || [])].find((x: any) => x.aviso || x.erro);
    if (aviso) throw new Error(aviso.aviso || aviso.erro);
  }, 'Números atualizados.');

  const conta = dados?.contas?.[0];
  const pk = dados?.palavra_chave || {};
  return (
    <div className={embutido ? '' : 'tela'}>
      {!embutido && <Titulo titulo="Desempenho" sub={`O que funcionou no ${REDES[rede]?.t || 'Instagram'} do perfil ${perfilDe(perfil).t}. O relógio atualiza os números sozinho, várias vezes por dia.`}
        acoes={<button className="bt" disabled={!!ocupado} onClick={atualizar}><RefreshCw className={ocupado ? 'girar' : ''} />{ocupado ? 'Atualizando…' : 'Atualizar agora'}</button>} />}
      {!embutido && <div className="filtros">
        <FiltroPerfil valor={perfil} mudar={setPerfil} todos={false} />
        {(dados?.redes || []).length > 1 && <div className="chips">{dados.redes.map((r: string) => <button key={r} className={`chip ${rede === r ? 'ativo' : ''}`} onClick={() => setRede(r)}>{REDES[r]?.t || r}</button>)}</div>}
        <div className="chips">{PERIODOS.map((p) => <button key={p.d} className={`chip ${dias === p.d ? 'ativo' : ''}`} onClick={() => setDias(p.d)}>{p.t}</button>)}</div>
      </div>}

      {dados && !conta && <Faixa tipo="aviso">Nenhuma conta conectada no perfil {perfilDe(perfil).t}. <Link para="/redes">Conecte o Instagram em Redes</Link> para os números aparecerem aqui.</Faixa>}
      {conta && !conta.metricas && <Faixa tipo="aviso">Faltam as métricas de alcance: <Link para="/redes">conecte {REDES[conta.rede]?.t || 'a rede'} de novo em Redes</Link> para liberar a permissão. Até lá, o engajamento usa curtidas e comentários sobre os seguidores.</Faixa>}
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !dados && <Carregando />}

      {dados && conta && (!dados.posts ? (
        <Vazio icone={<BarChart3 />} titulo="Nenhum post neste período" texto="O relógio traz os posts da conta aos poucos. Escolha um período maior ou toque em Atualizar agora." />
      ) : <>
        <div className="numeros">
          <div className="numero grande"><b>{compacto(dados.seguidores)}</b><span>seguidores{dados.seguidores_7d != null ? ` · ${dados.seguidores_7d >= 0 ? '+' : ''}${numero(dados.seguidores_7d)} em 7 dias` : ''}</span></div>
          <div className="numero"><b>{numero(dados.posts)}</b><span>posts no período</span></div>
          <div className="numero destaque"><b>{numero(dados.medianas?.comentarios)}</b><span>comentários num post típico</span></div>
          <div className="numero"><b>{compacto(dados.medianas?.curtidas)}</b><span>curtidas num post típico</span></div>
          <div className="numero"><b>{dados.medianas?.alcance != null ? compacto(dados.medianas.alcance) : '…'}</b>
            <span>{dados.medianas?.alcance != null ? `alcance num post típico · ${compacto(dados.totais?.salvos)} salvos e ${compacto(dados.totais?.compartilhamentos)} compartilhamentos no período` : 'alcance (falta a permissão de métricas)'}</span></div>
        </div>

        <div className="colunas">
          <div>
            <Grupo titulo="Os melhores do período" rodape="Engajamento = (curtidas + 3 comentários + 2 salvos + 2 compartilhamentos) sobre o alcance.">
              {dados.top?.length ? <div style={{ margin: '-14px -18px -18px' }}>{dados.top.map((p: any) => <LinhaPost key={p.id} p={p} rede={rede} />)}</div>
                : <Vazio titulo="Ainda sem nota" texto="A nota aparece quando os números do post chegam." />}
            </Grupo>
            <Grupo titulo="Mais comentados">
              <div style={{ margin: '-14px -18px -18px' }}>{(dados.mais_comentados || []).map((p: any) => <LinhaPost key={p.id} p={p} rede={rede} />)}</div>
            </Grupo>
          </div>
          <div>
            <Grupo titulo={'O "Comenta X" funciona?'} rodape="Comentários de um post típico (a mediana), com e sem pedir uma palavra na legenda.">
              <div className="comparar">
                <div><b>{numero(pk.com?.comentarios)}</b><span>com palavra · {numero(pk.com?.posts)} posts</span></div>
                <div><b>{numero(pk.sem?.comentarios)}</b><span>sem palavra · {numero(pk.sem?.posts)} posts</span></div>
              </div>
              {pk.melhores?.length > 0 && <>
                <p className="mudo" style={{ margin: '16px 0 10px', fontSize: 13 }}>Palavras que mais trouxeram comentários</p>
                <Barras itens={pk.melhores} valor={(i) => i.comentarios} rotulo={(i) => i.palavra} detalhe={(i) => `${numero(i.comentarios)} coment.`} />
              </>}
            </Grupo>
            {dados.por_formato?.length > 0 && (
              <Grupo titulo="Por formato">
                <Barras itens={dados.por_formato} valor={(i) => i.nota ?? i.comentarios} rotulo={(i) => FORMATOS[i.formato] || i.formato}
                  detalhe={(i) => `${porcento(i.nota)} · ${numero(i.comentarios)} coment. · ${i.posts} posts`} />
              </Grupo>
            )}
            {dados.por_tema?.length > 0 && (
              <Grupo titulo="Por assunto" rodape="Assunto e ferramenta achados na legenda (hashtag não conta).">
                <Barras itens={dados.por_tema.slice(0, 12)} valor={(i) => i.nota ?? i.comentarios} rotulo={(i) => TEMA[i.tema] || i.tema}
                  detalhe={(i) => `${porcento(i.nota)} · ${numero(i.comentarios)} coment. · ${i.posts}`} />
              </Grupo>
            )}
            {dados.por_horario?.length > 0 && (
              <Grupo titulo="Por horário e dia">
                <Barras itens={dados.por_horario} valor={(i) => i.nota || 0} rotulo={(i) => i.faixa} detalhe={(i) => `${porcento(i.nota)} · ${i.posts} posts`} />
                <div style={{ height: 14 }} />
                <Barras itens={dados.por_dia || []} valor={(i) => i.nota || 0} rotulo={(i) => DIA_SEMANA[i.dia] || i.dia} detalhe={(i) => `${porcento(i.nota)} · ${i.posts}`} />
              </Grupo>
            )}
          </div>
        </div>
      </>)}

      {conta && !embutido && <TodosOsPosts dias={dias} rede={rede} perfil={perfil} />}
    </div>
  );
}

function TodosOsPosts({ dias, rede, perfil }: { dias: number; rede: string; perfil: string }) {
  const [ordem, setOrdem] = useState('recentes');
  const [formato, setFormato] = useState('');
  const [busca, setBusca] = useState('');
  const [termo, setTermo] = useState('');
  const [pagina, setPagina] = useState(1);
  useEffect(() => { const t = setTimeout(() => { setTermo(busca); setPagina(1); }, 350); return () => clearTimeout(t); }, [busca]);
  useEffect(() => { setPagina(1); }, [ordem, formato, dias, rede, perfil]);
  const q = new URLSearchParams({ ordem, rede, perfil, pagina: String(pagina), dias: String(dias), ...(formato ? { formato } : {}), ...(termo ? { busca: termo } : {}) });
  const { dados, erro, carregando, recarregar } = useCarregar(() => get(`/desempenho/posts?${q}`), [q.toString()]);
  return (
    <Grupo titulo="Todos os posts">
      <div className="filtros">
        <select value={ordem} onChange={(e) => setOrdem(e.target.value)} aria-label="Ordem">{ORDENS.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}</select>
        <select value={formato} onChange={(e) => setFormato(e.target.value)} aria-label="Formato">
          <option value="">Todos os formatos</option>{['carrossel', 'reels', 'post', 'video', 'texto'].map((f) => <option key={f} value={f}>{FORMATOS[f]}</option>)}
        </select>
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar na legenda…" aria-label="Procurar na legenda" />
      </div>
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !dados && <Carregando />}
      {dados && (dados.itens.length ? <div style={{ margin: '0 -18px' }}>{dados.itens.map((p: any) => <LinhaPost key={p.id} p={p} rede={rede} />)}</div>
        : <Vazio titulo="Nenhum post com esse filtro" />)}
      {dados && <Paginacao pagina={pagina} total={dados.total} porPagina={dados.por_pagina} mudar={setPagina} />}
    </Grupo>
  );
}
