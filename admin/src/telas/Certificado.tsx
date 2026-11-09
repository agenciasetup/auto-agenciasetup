// Certificado: o visual que sai para o aluno ao concluir o curso (página pública, PDF e story).
// Formulário à esquerda, prévia ao vivo à direita (a mesma página do certificado, com um nome de exemplo).
import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, RotateCcw, Save } from 'lucide-react';
import { get, post, put } from '../nucleo/api';
import { Abas, Campo, Carregando, ErroCarga, Escolha, Faixa, Grupo, Marcar, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { CampoImagem } from './Cursos';

const VARIAVEIS = '{nome}, {curso}, {aulas_feitas}, {aulas_total}, {horas} e {data}';

export function Certificado() {
  const { pode } = useSessao();
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/area/certificado'), []);
  const [c, setC] = useState<any>(null);
  const [formato, setFormato] = useState('folha');
  const [html, setHtml] = useState('');
  const { ocupado, rodar } = useAcao();
  const vez = useRef(0);
  useEffect(() => { if (dados) setC({ ...dados.config }); }, [dados]);
  const original = useMemo(() => JSON.stringify(dados?.config || {}), [dados]);
  const mudou = !!c && JSON.stringify(c) !== original;

  // Prévia: espera a pessoa parar de digitar e pede a página pronta ao servidor.
  useEffect(() => {
    if (!c) return;
    const n = ++vez.current;
    const t = setTimeout(() => {
      post(`/area/certificado/previa${formato === 'story' ? '?formato=story' : ''}`, c).then((r: any) => { if (n === vez.current) setHtml(r.html); }).catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [c, formato]);

  if (erro) return <ErroCarga erro={erro} tentar={recarregar} />;
  if (!c) return <Carregando />;
  const pe = pode('cursos.editar');
  const m = (k: string, v: any) => setC((x: any) => ({ ...x, [k]: v }));
  const salvar = () => rodar('salvar', async () => { await put('/area/certificado', c); await recarregar(); }, 'Certificado salvo. Os certificados já emitidos também mudam.');

  return <div className="cert-editor">
    <div className="cert-form">
      {!pe && <Faixa>Seu cargo só vê o certificado.</Faixa>}
      <Conquista pe={pe} />
      <Grupo titulo="Visual">
        <Escolha rotulo="Modelo" valor={c.modelo} mudar={(v) => m('modelo', v)} desativado={!pe}
          opcoes={[{ v: 'escuro', t: 'Escuro (padrão Setup)' }, { v: 'claro', t: 'Claro (papel)' }]} />
        <div className="campo">
          <label htmlFor="cert-cor">Cor de destaque</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input id="cert-cor" type="color" value={c.cor} disabled={!pe} onChange={(e) => m('cor', e.target.value)} style={{ width: 48, height: 38, padding: 0, border: 0, background: 'none' }} />
            <code>{c.cor}</code>
            {c.cor !== dados.padrao.cor && pe && <button className="bt bt-mini" onClick={() => m('cor', dados.padrao.cor)}><RotateCcw />Laranja da Setup</button>}
          </div>
        </div>
        <Marcar rotulo="Selo redondo no rodapé" valor={c.selo} mudar={(v) => m('selo', v)} desativado={!pe} />
        <Marcar rotulo="QR para conferir" valor={c.qr} mudar={(v) => m('qr', v)} desativado={!pe} dica="Quem aponta a câmera abre a página do certificado e confere o código." />
      </Grupo>
      <Grupo titulo="Textos" rodape={`Pode usar ${VARIAVEIS}.`}>
        <Campo rotulo="Título" valor={c.titulo} mudar={(v) => m('titulo', v)} desativado={!pe} />
        <Campo rotulo="Antes do nome" valor={c.abertura} mudar={(v) => m('abertura', v)} desativado={!pe} />
        <Campo rotulo="Antes do curso" valor={c.antes_do_curso} mudar={(v) => m('antes_do_curso', v)} desativado={!pe} />
        <Campo rotulo="Linha de detalhes" valor={c.detalhes} mudar={(v) => m('detalhes', v)} desativado={!pe} />
      </Grupo>
      <Grupo titulo="Assinatura" rodape="Sem imagem, o nome sai em letra de assinatura.">
        <Campo rotulo="Nome" valor={c.assinatura_nome} mudar={(v) => m('assinatura_nome', v)} desativado={!pe} />
        <Campo rotulo="Cargo" valor={c.assinatura_cargo} mudar={(v) => m('assinatura_cargo', v)} desativado={!pe} />
        <CampoImagem rotulo="Imagem da assinatura (PNG sem fundo, opcional)" valor={c.assinatura_img || ''} mudar={(v) => m('assinatura_img', v)} desativado={!pe} />
      </Grupo>
      {pe && <div className="barra-acoes">
        <button className="bt bt-tinta" disabled={!mudou || !!ocupado} onClick={salvar}><Save />{ocupado === 'salvar' ? 'Salvando…' : 'Salvar'}</button>
        {mudou && <button className="bt bt-texto" onClick={() => setC({ ...dados.config })}>Desfazer</button>}
      </div>}
    </div>
    <div className="cert-previa">
      <div className="cert-previa-topo">
        <Abas abas={[{ id: 'folha', t: 'Folha (PDF)' }, { id: 'story', t: 'Story' }]} atual={formato} mudar={setFormato} />
        <a className="bt bt-texto" href={`${dados.exemplo}${formato === 'story' ? '?formato=story' : ''}`} target="_blank" rel="noopener"><ExternalLink />Abrir o exemplo salvo</a>
      </div>
      {html ? <iframe title="Prévia do certificado" className={`cert-iframe cert-${formato}`} sandbox="" srcDoc={html} /> : <Carregando texto="Montando a prévia…" />}
    </div>
  </div>;
}

// A conquista dos 7 dias: a barra do app do aluno que enche um dia por vez desde a compra. No último dia abrem os
// modelos prontos e o "Solicitar certificado". Desligada: sem barra e sem espera.
function Conquista({ pe }: { pe: boolean }) {
  const { dados, erro, recarregar } = useCarregar(() => get('/area/conquista-dias'), []);
  const [f, setF] = useState<any>(null);
  const { ocupado, rodar } = useAcao();
  useEffect(() => { if (dados) setF({ ligada: dados.ligada, dias: dados.dias }); }, [dados]);
  if (erro) return <Faixa tipo="erro">Não consegui ler a conquista dos 7 dias: {erro}</Faixa>;
  if (!f) return null;
  const mudou = f.ligada !== dados.ligada || Number(f.dias) !== dados.dias;
  const salvar = () => rodar('conquista', async () => { await put('/area/conquista-dias', { ligada: f.ligada, dias: Number(f.dias) }); await recarregar(); }, 'Conquista salva. Vale na hora para todos os alunos.');
  const b = dados.bonus;
  return <Grupo titulo="Conquista dos dias" rodape={<>Conta do dia da compra paga (ou da liberação), no fuso de Brasília. Curso dado como bônus e a equipe já entram liberados. Desligada: sem barra e sem espera; o certificado segue só o percentual de aulas do curso (70%).</>}>
    <Marcar rotulo="Mostrar a barra e segurar o bônus e o certificado" valor={f.ligada} mudar={(v) => setF({ ...f, ligada: v })} desativado={!pe}
      dica="No app do aluno: no início e na página do curso, grande; nas aulas, uma faixa fina." />
    <Campo rotulo="Dias até liberar" tipo="number" min={1} max={30} valor={String(f.dias)} mudar={(v) => setF({ ...f, dias: v })} desativado={!pe || !f.ligada}
      dica={`O dia da compra é o dia 1. Com ${f.dias || 7}, libera no dia ${f.dias || 7}. A garantia é de 7 dias: com 8, o bônus só abre depois dela.`} />
    <div className="campo"><label>Bônus</label>
      {b ? <p style={{ margin: 0 }}>{b.titulo}: {b.modelos.map((m: any) => m.nome).join(', ')}{b.arquivos.length ? ` · ${b.arquivos.map((a: any) => `${a.nome} (${a.bytes ? `${(a.bytes / 1048576).toFixed(1)} MB` : 'sem tamanho'}, ${a.downloads} downloads)`).join(', ')}` : ''}</p>
        : <p style={{ margin: 0 }}>Nenhum bônus gravado. Rode <code>node scripts/area-bonus.mjs</code>.</p>}
    </div>
    {pe && mudou && <div className="barra-acoes"><button className="bt bt-tinta" disabled={!!ocupado} onClick={salvar}><Save />{ocupado === 'conquista' ? 'Salvando…' : 'Salvar a conquista'}</button><button className="bt bt-texto" onClick={() => setF({ ligada: dados.ligada, dias: dados.dias })}>Desfazer</button></div>}
  </Grupo>;
}
