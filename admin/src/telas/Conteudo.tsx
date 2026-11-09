// Recursos (para baixar de graça) e Artigos (notícias, guias, tutoriais e comparativos para o Google e as IAs) do site.
import { useEffect, useState } from 'react';
import { BookOpen, Bot, Download, FileText, LayoutTemplate, MessageSquareText, Newspaper, Package, Play, Plus, Table, Workflow, Wrench } from 'lucide-react';
import { get } from '../nucleo/api';
import { Link, useRota } from '../nucleo/roteador';
import { Abas, Carregando, Celula, ErroCarga, Grupo, Paginacao, Titulo, Vazio, useCarregar, useSessao } from '../nucleo/ui';
import { STATUS_CONTEUDO, TIPOS_RECURSO, haQuanto, numero } from '../nucleo/util';
import { EtiquetaConteudo, EtiquetaPerfil } from './comum';

// Cada tipo de recurso com o ícone e a cor do site.
const ICONE_TIPO: Record<string, { i: any; cor: string }> = {
  agente: { i: <Bot />, cor: 'ambar' }, prompt: { i: <MessageSquareText />, cor: 'roxo' }, template: { i: <LayoutTemplate />, cor: 'azul' },
  planilha: { i: <Table />, cor: 'verde' }, automacao: { i: <Workflow />, cor: 'ciano' }, guia: { i: <BookOpen />, cor: 'laranja' },
  pack: { i: <Package />, cor: 'rosa' }, ferramenta: { i: <Wrench />, cor: '' }, video: { i: <Play />, cor: 'vermelho' },
};

export default function Conteudo() {
  const { pode } = useSessao();
  const { rota, ir } = useRota();
  const [aba, setAba] = useState(rota.busca.get('aba') === 'artigos' ? 'artigos' : 'recursos');
  const [status, setStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [buscaFeita, setBuscaFeita] = useState('');
  const [pagina, setPagina] = useState(1);
  useEffect(() => { document.title = 'Recursos e artigos | Painel Agência Setup'; }, []);
  useEffect(() => { const t = setTimeout(() => setBuscaFeita(busca.trim()), 350); return () => clearTimeout(t); }, [busca]);
  useEffect(() => { setPagina(1); }, [aba, status, buscaFeita]);

  const { dados, erro, carregando, recarregar } = useCarregar(() => {
    const p = new URLSearchParams({ pagina: String(pagina) });
    if (status) p.set('status', status);
    if (buscaFeita) p.set('busca', buscaFeita);
    return get(`/conteudo/${aba}?${p}`);
  }, [aba, status, buscaFeita, pagina]);

  const trocarAba = (a: string) => { setAba(a); ir(`/conteudo?aba=${a}`, { trocar: true }); };
  const ehRecurso = aba === 'recursos';

  return (
    <div className="tela">
      <Titulo titulo="Recursos e artigos" sub="O que vai para o site. Rascunho só aparece para a equipe."
        acoes={pode('conteudo.editar') ? <>
          {ehRecurso && <Link className="bt" para="/conteudo/recursos/novo?tipo=agente"><Bot />Novo agente</Link>}
          <Link className="bt bt-tinta" para={`/conteudo/${aba}/novo`}><Plus />{ehRecurso ? 'Novo recurso' : 'Novo artigo'}</Link>
        </> : undefined} />
      <Abas abas={[{ id: 'recursos', t: 'Recursos' }, { id: 'artigos', t: 'Artigos' }]} atual={aba} mudar={trocarAba} />
      <div className="filtros">
        <input type="search" placeholder="Buscar pelo título" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Situação">
          <option value="">Todas as situações</option>
          {Object.entries(STATUS_CONTEUDO).map(([id, s]) => <option key={id} value={id}>{s.t}</option>)}
        </select>
      </div>
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !dados && <Carregando />}
      {dados && (dados.itens?.length ? <>
        <Grupo>
          {dados.itens.map((c: any) => (
            <Celula key={c.id} para={`/conteudo/${aba}/${c.id}`} icone={ehRecurso ? (ICONE_TIPO[c.tipo]?.i || <FileText />) : <Newspaper />} cor={ehRecurso ? ICONE_TIPO[c.tipo]?.cor || undefined : 'laranja'}
              titulo={c.titulo}
              sub={[ehRecurso ? TIPOS_RECURSO[c.tipo] || c.tipo : null, ehRecurso && c.downloads ? `${numero(c.downloads)} downloads` : null, `mexido ${haQuanto(c.atualizado_em)}`].filter(Boolean).join(' · ')}
              direita={<>{ehRecurso && c.downloads ? <span className="mudo" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Download style={{ width: 14, height: 14 }} />{numero(c.downloads)}</span> : null}<EtiquetaPerfil perfil={c.perfil} /><EtiquetaConteudo status={c.status} /></>} />
          ))}
        </Grupo>
        <Paginacao pagina={pagina} total={dados.total} porPagina={dados.por_pagina || 20} mudar={setPagina} />
      </> : <Vazio titulo={buscaFeita || status ? 'Nada encontrado com esse filtro.' : ehRecurso ? 'Nenhum recurso ainda.' : 'Nenhum artigo ainda.'}
        texto={ehRecurso ? 'Recursos são o que a pessoa baixa de graça: prompts, templates, planilhas, automações.' : 'Artigos: notícias, guias, tutoriais e comparativos feitos para aparecer no Google e nas respostas das IAs.'}
        acao={pode('conteudo.editar') && !buscaFeita && !status ? <Link className="bt bt-tinta" para={`/conteudo/${aba}/novo`}><Plus />Criar agora</Link> : undefined} />)}
    </div>
  );
}
