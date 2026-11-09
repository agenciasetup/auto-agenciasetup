// Comunicação com a turma: banners (topo do início ou do curso), avisos (faixa) e eventos ao vivo ("Me lembre",
// agenda e link na hora; a gravação vira aula). Cada peça escolhe o público e conta visto, clique e fechado.
import { useEffect, useState } from 'react';
import { CalendarDays, Megaphone, Plus, Save } from 'lucide-react';
import { get, patch, post } from '../nucleo/api';
import { AreaTexto, Campo, Carregando, Celula, ErroCarga, Escolha, Etiqueta, Grupo, Marcar, Modal, Titulo, Vazio, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { dataHora, doCampoData, numero, paraCampoData } from '../nucleo/util';

const TIPOS = [{ v: 'banner', t: 'Banner (topo do início)' }, { v: 'aviso', t: 'Aviso (faixa curta)' }, { v: 'evento', t: 'Evento ao vivo' }];
const NOVO = { tipo: 'banner', titulo: '', texto: '', imagem_url: '', botao_texto: '', botao_link: '', inicio: '', fim: '', evento_em: '', evento_fim: '', evento_link: '', importante: false, ativo: true, ordem: 0, curso_id: '', sem_produto_id: '', parado_dias: '', min_pct: '', concluiu: false };

export default function Comunicacao() {
  const { pode } = useSessao();
  useEffect(() => { document.title = 'Comunicação | Painel Agência Setup'; }, []);
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/comunicacao/avisos'), []);
  const cursos = useCarregar(() => get('/area/cursos'), []);
  const produtos = useCarregar(() => get('/produtos'), []);
  const [a, setA] = useState<any>(null);
  const { ocupado, rodar } = useAcao();
  const podeEditar = pode('comunicacao.editar');

  const abrir = (x: any) => setA({
    ...NOVO, ...x, inicio: paraCampoData(x.inicio), fim: paraCampoData(x.fim), evento_em: paraCampoData(x.evento_em), evento_fim: paraCampoData(x.evento_fim),
    curso_id: x.publico?.curso_id || '', sem_produto_id: x.publico?.sem_produto_id || '', parado_dias: x.publico?.parado_dias || '', min_pct: x.publico?.min_pct || '', concluiu: !!x.publico?.concluiu,
  });
  const salvar = () => rodar('aviso', async () => {
    const publico: any = {};
    if (a.curso_id) publico.curso_id = a.curso_id;
    if (a.sem_produto_id) publico.sem_produto_id = a.sem_produto_id;
    if (a.parado_dias) publico.parado_dias = Number(a.parado_dias);
    if (a.min_pct) publico.min_pct = Number(a.min_pct);
    if (a.concluiu) publico.concluiu = true;
    const corpo = {
      tipo: a.tipo, titulo: a.titulo, texto: a.texto || null, imagem_url: a.imagem_url || null, botao_texto: a.botao_texto || null, botao_link: a.botao_link || null,
      inicio: doCampoData(a.inicio) || undefined, fim: doCampoData(a.fim), evento_em: doCampoData(a.evento_em), evento_fim: doCampoData(a.evento_fim), evento_link: a.evento_link || null,
      importante: a.importante, ativo: a.ativo, ordem: Number(a.ordem) || 0, publico,
    };
    if (a.id) await patch(`/comunicacao/avisos/${a.id}`, corpo); else await post('/comunicacao/avisos', corpo);
    setA(null); recarregar();
  }, 'Salvo. Já aparece para o público escolhido.');

  const publicoTxt = (p: any) => {
    const partes = [];
    const c = (cursos.dados as any[] || []).find((x) => x.id === p?.curso_id);
    if (c) partes.push(`quem tem ${c.titulo}`);
    const pr = (produtos.dados as any[] || []).find((x) => x.id === p?.sem_produto_id);
    if (pr) partes.push(`quem não tem ${pr.nome}`);
    if (p?.parado_dias) partes.push(`parados há ${p.parado_dias} dias`);
    if (p?.min_pct) partes.push(`a partir de ${p.min_pct}%`);
    if (p?.concluiu) partes.push('quem terminou');
    return partes.length ? partes.join(', ') : 'todos os alunos';
  };

  return (
    <div className="tela">
      <Titulo titulo="Comunicação" sub="Banners, avisos e eventos ao vivo dentro da área do aluno, para o público certo."
        acoes={podeEditar ? <button className="bt bt-tinta" onClick={() => setA({ ...NOVO })}><Plus />Novo</button> : undefined} />
      {erro && <ErroCarga erro={erro} tentar={recarregar} />}
      {carregando && !dados ? <Carregando /> : dados?.length ? (
        <Grupo>
          {dados.map((x: any) => (
            <Celula key={x.id} icone={x.tipo === 'evento' ? <CalendarDays /> : <Megaphone />} cor={x.ativo ? 'laranja' : undefined} titulo={x.titulo}
              sub={`${TIPOS.find((t) => t.v === x.tipo)?.t.split(' (')[0]}${x.evento_em ? ` · ${dataHora(x.evento_em)}` : ''} · ${publicoTxt(x.publico)} · ${numero(x.vistos)} viram, ${numero(x.cliques)} clicaram, ${numero(x.fechados)} fecharam${x.tipo === 'evento' ? `, ${numero(x.lembretes)} pediram lembrete` : ''}`}
              direita={x.ativo ? (x.fim && new Date(x.fim) < new Date() ? <Etiqueta>Terminou</Etiqueta> : <Etiqueta cor="verde">No ar</Etiqueta>) : <Etiqueta>Desligado</Etiqueta>}
              onClick={podeEditar ? () => abrir(x) : undefined} />
          ))}
        </Grupo>
      ) : <Vazio titulo="Nada publicado ainda." texto="Banner de lançamento, aviso importante ou o ao vivo do mês: escolha para quem aparece e acompanhe quantos viram e clicaram." />}

      <Modal titulo={a?.id ? 'Editar' : 'Novo'} aberto={!!a} fechar={() => setA(null)}
        rodape={<><button className="bt bt-texto" onClick={() => setA(null)}>Cancelar</button><button className="bt bt-tinta" disabled={!!ocupado || !a?.titulo.trim() || (a?.tipo === 'evento' && !a?.evento_em)} onClick={salvar}><Save />Salvar</button></>}>
        {a && <>
          <Escolha rotulo="Tipo" valor={a.tipo} mudar={(v) => setA({ ...a, tipo: v })} opcoes={TIPOS} />
          <Campo rotulo="Título" valor={a.titulo} mudar={(v) => setA({ ...a, titulo: v })} />
          <AreaTexto rotulo="Texto (opcional)" valor={a.texto || ''} mudar={(v) => setA({ ...a, texto: v })} linhas={2} />
          {a.tipo === 'banner' ? <Campo rotulo="Imagem (endereço, opcional)" valor={a.imagem_url || ''} mudar={(v) => setA({ ...a, imagem_url: v })} placeholder="https://" /> : null}
          {a.tipo === 'evento' ? <>
            <div className="campos-lado">
              <Campo rotulo="Começa" tipo="datetime-local" valor={a.evento_em} mudar={(v) => setA({ ...a, evento_em: v })} />
              <Campo rotulo="Termina (opcional)" tipo="datetime-local" valor={a.evento_fim} mudar={(v) => setA({ ...a, evento_fim: v })} />
            </div>
            <Campo rotulo="Link do ao vivo" valor={a.evento_link || ''} mudar={(v) => setA({ ...a, evento_link: v })} placeholder="https://meet.google.com/..." dica="O botão 'Entrar ao vivo' aparece 10 minutos antes." />
          </> : <div className="campos-lado">
            <Campo rotulo="Texto do botão (opcional)" valor={a.botao_texto || ''} mudar={(v) => setA({ ...a, botao_texto: v })} />
            <Campo rotulo="Link do botão" valor={a.botao_link || ''} mudar={(v) => setA({ ...a, botao_link: v })} placeholder="/cursos/... ou https://" />
          </div>}
          <h3 className="sub-titulo">Para quem</h3>
          <div className="campos-lado">
            <Escolha rotulo="Quem tem o curso" valor={a.curso_id} mudar={(v) => setA({ ...a, curso_id: v })} opcoes={[{ v: '', t: 'Qualquer' }, ...((cursos.dados as any[]) || []).map((c: any) => ({ v: c.id, t: c.titulo }))]} />
            <Escolha rotulo="Quem não tem o produto" valor={a.sem_produto_id} mudar={(v) => setA({ ...a, sem_produto_id: v })} opcoes={[{ v: '', t: 'Não filtrar' }, ...((produtos.dados as any[]) || []).map((p: any) => ({ v: p.id, t: p.nome }))]} />
          </div>
          <div className="campos-lado">
            <Campo rotulo="Parados há (dias)" tipo="number" min={0} valor={a.parado_dias} mudar={(v) => setA({ ...a, parado_dias: v })} />
            <Campo rotulo="Passaram de (%)" tipo="number" min={0} max={100} valor={a.min_pct} mudar={(v) => setA({ ...a, min_pct: v })} />
          </div>
          <Marcar rotulo="Só quem terminou o curso" valor={a.concluiu} mudar={(v) => setA({ ...a, concluiu: v })} />
          <h3 className="sub-titulo">Quando</h3>
          <div className="campos-lado">
            <Campo rotulo="Aparece a partir de" tipo="datetime-local" valor={a.inicio} mudar={(v) => setA({ ...a, inicio: v })} dica="Em branco: agora." />
            <Campo rotulo="Some em" tipo="datetime-local" valor={a.fim} mudar={(v) => setA({ ...a, fim: v })} dica="Em branco: até desligar." />
          </div>
          {a.tipo === 'aviso' ? <Marcar rotulo="Importante (destaque)" valor={a.importante} mudar={(v) => setA({ ...a, importante: v })} /> : null}
          <Marcar rotulo="Ligado" valor={a.ativo} mudar={(v) => setA({ ...a, ativo: v })} />
        </>}
      </Modal>
    </div>
  );
}
