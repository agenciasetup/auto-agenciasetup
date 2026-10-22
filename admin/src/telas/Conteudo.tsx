// Recursos (para baixar de graça) e Novidades (artigos curtos) do site.
import { useEffect, useState } from 'react';
import { Download, FileText, Newspaper, Plus } from 'lucide-react';
import { get } from '../nucleo/api';
import { Link, useRota } from '../nucleo/roteador';
import { Abas, Carregando, Celula, ErroCarga, Grupo, Paginacao, Titulo, Vazio, useCarregar, useSessao } from '../nucleo/ui';
import { STATUS_CONTEUDO, TIPOS_RECURSO, haQuanto, numero } from '../nucleo/util';
import { EtiquetaConteudo } from './comum';

export default function Conteudo() {
  const { pode } = useSessao();
  const { rota, ir } = useRota();
  const [aba, setAba] = useState(rota.busca.get('aba') === 'artigos' ? 'artigos' : 'recursos');
  const [status, setStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [buscaFeita, setBuscaFeita] = useState('');
  const [pagina, setPagina] = useState(1);
  useEffect(() => { document.title = 'Recursos e novidades | Painel Agência Setup'; }, []);
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
      <Titulo titulo="Recursos e novidades" sub="O que vai para o site. Rascunho só aparece para a equipe."
        acoes={pode('conteudo.editar') ? <Link className="bt bt-tinta" para={`/conteudo/${aba}/novo`}><Plus />{ehRecurso ? 'Novo recurso' : 'Nova novidade'}</Link> : undefined} />
      <Abas abas={[{ id: 'recursos', t: 'Recursos' }, { id: 'artigos', t: 'Novidades' }]} atual={aba} mudar={trocarAba} />
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
            <Celula key={c.id} para={`/conteudo/${aba}/${c.id}`} icone={ehRecurso ? <FileText /> : <Newspaper />} cor={c.status === 'publicado' ? 'verde' : undefined}
              titulo={c.titulo}
              sub={[ehRecurso ? TIPOS_RECURSO[c.tipo] || c.tipo : null, ehRecurso && c.downloads ? `${numero(c.downloads)} downloads` : null, `mexido ${haQuanto(c.atualizado_em)}`].filter(Boolean).join(' · ')}
              direita={<>{ehRecurso && c.downloads ? <span className="mudo" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Download style={{ width: 14, height: 14 }} />{numero(c.downloads)}</span> : null}<EtiquetaConteudo status={c.status} /></>} />
          ))}
        </Grupo>
        <Paginacao pagina={pagina} total={dados.total} porPagina={dados.por_pagina || 20} mudar={setPagina} />
      </> : <Vazio titulo={buscaFeita || status ? 'Nada encontrado com esse filtro.' : ehRecurso ? 'Nenhum recurso ainda.' : 'Nenhuma novidade ainda.'}
        texto={ehRecurso ? 'Recursos são o que a pessoa baixa de graça: prompts, templates, planilhas, automações.' : 'Novidades são artigos curtos sobre o que mudou nas ferramentas de IA.'}
        acao={pode('conteudo.editar') && !buscaFeita && !status ? <Link className="bt bt-tinta" para={`/conteudo/${aba}/novo`}><Plus />Criar agora</Link> : undefined} />)}
    </div>
  );
}
