// Novo post (pedido do dono em 24/10/2026: "eu mesmo não posso postar? Achei que teria o painel de agendar post,
// escolher as plataformas, legenda, formato... com todas as funções do Instagram"). Uma tela: onde publicar, o
// formato, as mídias, a legenda (com texto próprio por rede), as opções do Instagram, o Comenta X e quando sai.
// Do lado, a prévia no Instagram. Cada rede vira uma peça na agenda, todas no mesmo grupo.
// Primeiro, o perfil (29/10/2026): Agência Setup · Brasil ou Setup Agency · Inglês. A tela mostra por qual conta cada rede
// vai publicar naquele perfil, ou que o perfil ainda não tem conta nela.
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarClock, ImagePlus, MessageCircleHeart, Save, Send, Trash2, Type } from 'lucide-react';
import { enviarArquivo, get, post } from '../nucleo/api';
import { useRota } from '../nucleo/roteador';
import { AreaTexto, Campo, Carregando, Escolha, Faixa, Grupo, Modal, Titulo, avisar, useAcao, useCarregar, useSessao } from '../nucleo/ui';
import { FORMATOS, PERFIS, doCampoData, paraCampoData, perfilDe } from '../nucleo/util';
import { EditorVersoes, NOVA_VERSAO } from './Comenta';
import { EtiquetaPerfil } from './comum';
import { OpcoesInstagram, PreviaInstagram, avisoProporcao, medir, paraJpeg } from './postComum';

type Midia = { url: string; tipo: 'imagem' | 'video'; alt?: string; prop?: number | null };
const FORMATOS_POST = ['post', 'carrossel', 'reels', 'story'];
const LIMITE: Record<string, number> = { instagram: 2200, facebook: 63206, threads: 500, x: 280, linkedin: 3000, tiktok: 2200, youtube: 5000, pinterest: 500 };
const linhas = (t: string) => String(t || '').split('\n').map((x) => x.trim()).filter(Boolean);

export default function NovoPost() {
  const { pode } = useSessao();
  const { ir } = useRota();
  const { dados: redes, erro } = useCarregar(() => get('/redes'), []);
  const { dados: recursos } = useCarregar(() => get('/conteudo/recursos?pagina=1'), []);
  const [perfil, setPerfil] = useState<'br' | 'en'>('br');
  const [escolhidas, setEscolhidas] = useState<string[]>(['instagram']);
  const [formato, setFormato] = useState('carrossel');
  const [midias, setMidias] = useState<Midia[]>([]);
  const [subindo, setSubindo] = useState(0);
  const [legenda, setLegenda] = useState('');
  const [proprios, setProprios] = useState<Record<string, string | undefined>>({});
  const [opIg, setOpIg] = useState<any>({});
  const [comenta, setComenta] = useState<any>(null);
  const [titulo, setTitulo] = useState('');
  const [agendar, setAgendar] = useState(false);
  const [quando, setQuando] = useState(() => paraCampoData(new Date(Date.now() + 2 * 3600_000).toISOString()));
  const [altAberto, setAltAberto] = useState<number | null>(null);
  const { ocupado, rodar } = useAcao();
  useEffect(() => { document.title = 'Novo post | Painel Agência Setup'; }, []);

  const lista: any[] = (redes || []).filter((r: any) => r.disponivel);
  // A conta que publica cada rede no perfil escolhido (a mais antiga ativa, como a fila; conta antiga sem perfil é do Brasil).
  const contaNoPerfil = (r: any) => (r?.conexoes || []).find((c: any) => c.status === 'ativa' && (c.perfil || 'br') === perfil);
  const contaIg = contaNoPerfil((redes || []).find((r: any) => r.id === 'instagram'));
  const en = perfil === 'en';
  // Formatos que as redes escolhidas aceitam (o Instagram manda: é a rede principal).
  const aceita = (id: string, f: string) => !!lista.find((r) => r.id === id)?.formatos?.includes(f);
  const fora = escolhidas.filter((id) => !aceita(id, formato));
  const naoConectadas = escolhidas.filter((id) => !contaNoPerfil(lista.find((r) => r.id === id)));
  const ig = escolhidas.includes('instagram');

  const alternarRede = (id: string) => setEscolhidas((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  // Problemas antes de mandar (o servidor confere de novo).
  const problemas = useMemo(() => {
    const p: string[] = [];
    if (!escolhidas.length) p.push('Escolha ao menos uma rede.');
    if (fora.length) p.push(`${fora.map((id) => lista.find((r) => r.id === id)?.nome || id).join(', ')} não ${fora.length > 1 ? 'aceitam' : 'aceita'} ${FORMATOS[formato] || formato}. Tire da lista ou troque o formato.`);
    if (!midias.length) p.push('Envie as imagens ou o vídeo.');
    if (formato === 'carrossel' && midias.length > 0 && (midias.length < 2 || midias.length > 10)) p.push('Carrossel leva de 2 a 10 imagens ou vídeos.');
    if (formato === 'post' && midias.length > 1) p.push('Post leva uma imagem só. Para mais, use carrossel.');
    if (formato === 'post' && midias.some((m) => m.tipo === 'video')) p.push('Post é foto. Vídeo vai em Reels.');
    if (formato === 'reels' && (midias.length !== 1 || midias[0].tipo !== 'video')) p.push('Reels leva um vídeo.');
    if (formato === 'story' && midias.length !== 1) p.push('Story leva uma imagem ou um vídeo.');
    for (const id of escolhidas) {
      const t = proprios[id] != null ? proprios[id]! : legenda;
      if (formato !== 'story' && t.length > (LIMITE[id] || 2200)) p.push(`O texto do ${lista.find((r) => r.id === id)?.nome || id} passa de ${LIMITE[id]} caracteres.`);
    }
    if (ig && (legenda.match(/#[\p{L}\p{N}_]+/gu) || []).length > 30) p.push('O Instagram aceita no máximo 30 hashtags.');
    if (comenta) {
      if (!comenta.palavra) p.push('Escreva a palavra do Comenta X.');
      if (en && !comenta.link) p.push('No perfil em inglês, o Comenta X manda um link: cole o link do material em inglês.');
      else if (!comenta.recurso_id && !comenta.link) p.push('Escolha o material que o Comenta X manda.');
      if (comenta.palavra && !legenda.toUpperCase().includes(String(comenta.palavra).toUpperCase())) p.push(`A legenda não pede "${comenta.palavra}". Use "Pôr na legenda".`);
    }
    return p;
  }, [escolhidas, fora, midias, formato, legenda, proprios, comenta, ig, lista, en]);

  const subir = (arquivos: FileList | File[]) => {
    const fila = Array.from(arquivos).slice(0, 10 - midias.length);
    if (!fila.length) return;
    rodar('subir', async () => {
      for (const f of fila) {
        setSubindo((n) => n + 1);
        try {
          const video = f.type.startsWith('video');
          if (f.size > 50 * 1024 * 1024) throw new Error(`${f.name}: acima de 50 MB. Diminua o vídeo antes de enviar.`);
          const pronto = video ? f : await paraJpeg(f);
          const local = URL.createObjectURL(pronto);
          const prop = await medir(local, video);
          URL.revokeObjectURL(local);
          const r = await enviarArquivo(pronto, 'midia');
          setMidias((l) => [...l, { url: r.url, tipo: video ? 'video' : 'imagem', prop }]);
        } finally {
          setSubindo((n) => n - 1);
        }
      }
    });
  };
  const mover = (i: number, d: number) => setMidias((l) => { const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n; });

  const ligarComenta = (sim: boolean) => setComenta(sim ? { palavra: '', recurso_id: '', link: '', modo: 'direto', estrategia: 'melhor', responder_publico: true, resposta_ia: true, variantes: [NOVA_VERSAO('a'), NOVA_VERSAO('b')] } : null);
  const mudarComenta = (k: string, v: any) => setComenta((c: any) => ({ ...c, [k]: k === 'palavra' ? String(v).toUpperCase().replace(/[^\p{L}\p{N}]/gu, '') : v }));
  const porNaLegenda = () => setLegenda((t) => `${t.trim()}${t.trim() ? '\n\n' : ''}${en ? `Comment "${comenta.palavra}" and I'll send it to your DMs 🦎` : `Comenta "${comenta.palavra}" que eu te envio no direct 🦎`}`);
  // Trocar de perfil: no inglês o material vai por link (as páginas de recurso do site são em português).
  const trocarPerfil = (p: 'br' | 'en') => { setPerfil(p); if (p === 'en') setComenta((c: any) => (c ? { ...c, recurso_id: '' } : c)); };
  const escreverIA = () => rodar('ia', async () => {
    const r = await post('/comenta/escrever', { palavra: comenta.palavra, recurso_id: en ? null : comenta.recurso_id || null, link: comenta.link || null, legenda, modo: comenta.modo, quantas: 2, perfil });
    setComenta((c: any) => ({ ...c, variantes: (r.variantes || []).map((v: any) => ({ ...NOVA_VERSAO(v.id), ...v, publico: (v.publico || []).join('\n') })) }));
  }, 'O Claude escreveu duas versões. Revise antes de salvar.');

  const enviar = (acao: 'rascunho' | 'agendar' | 'publicar') => rodar(acao, async () => {
    if (acao !== 'rascunho' && problemas.length) throw new Error(problemas[0]);
    if (acao === 'rascunho' && !midias.length && !legenda.trim()) throw new Error('Escreva a legenda ou envie uma mídia antes de salvar.');
    const textos: Record<string, string> = {};
    for (const id of escolhidas) if (proprios[id] != null) textos[id] = proprios[id]!;
    const corpo: any = {
      perfil, redes: escolhidas, formato, titulo: titulo || null, legenda, textos, midias: midias.map(({ url, tipo, alt }) => ({ url, tipo, ...(alt ? { alt } : {}) })),
      opcoes: ig ? { instagram: opIg } : {}, acao, ...(acao === 'agendar' ? { agendado_para: doCampoData(quando) } : {}),
      ...(comenta && comenta.palavra ? { comenta: { ...comenta, recurso_id: en ? null : comenta.recurso_id || null, link: comenta.link || null, variantes: comenta.variantes.filter((v: any) => v.dm || v.pergunta || v.depois).map((v: any) => ({ ...v, publico: linhas(v.publico) })) } } : {}),
    };
    const r = await post('/posts', corpo);
    const erros = (r.pecas || []).filter((p: any) => p.status === 'erro');
    if (erros.length) avisar(`Não saiu em ${erros.map((p: any) => p.rede).join(', ')}: ${erros[0].erro}`, 'erro');
    for (const a of r.avisos || []) avisar(a, 'erro');
    setAgendar(false);
    ir('/posts');
  }, acao === 'rascunho' ? 'Rascunho salvo na agenda.' : acao === 'agendar' ? 'Post agendado.' : 'Post enviado para as redes.');

  if (erro) return <div className="tela"><Faixa tipo="erro">{erro}</Faixa></div>;
  if (!redes) return <div className="tela"><Carregando /></div>;
  const podeAprovar = pode('pecas.aprovar');
  const recursosOp = [{ v: '', t: 'Nenhum (uso um link)' }, ...((recursos?.itens || []).map((r: any) => ({ v: r.id, t: `${r.titulo}${r.status !== 'publicado' ? ' (rascunho: publique antes de o post sair)' : ''}` })))];

  return (
    <div className="tela tela-larga">
      <Titulo voltar={{ para: '/posts', t: 'Posts e agenda' }} titulo="Novo post" sub="Escolha as redes, envie as mídias e escreva a legenda. Salve como rascunho, agende ou publique agora." />
      <div className="compor">
        <div className="compor-form">
          <Grupo titulo="Para qual perfil?">
            <div className="perfil-escolha" role="radiogroup" aria-label="Perfil">
              {Object.entries(PERFIS).map(([id, p]) => (
                <button key={id} type="button" role="radio" aria-checked={perfil === id} className={`perfil-cartao${perfil === id ? ' ligado' : ''}`} onClick={() => trocarPerfil(id as 'br' | 'en')}>
                  <b><EtiquetaPerfil perfil={id} sempre />{p.t}</b>
                  <span>{id === 'en' ? 'Legenda e direct em inglês.' : 'Legenda e direct em português.'}</span>
                </button>
              ))}
            </div>
          </Grupo>

          <Grupo titulo="Onde publicar">
            <div className="redes-escolha">
              {(redes || []).map((r: any) => {
                const conta = contaNoPerfil(r);
                const ligada = escolhidas.includes(r.id);
                return (
                  <button key={r.id} type="button" className={`rede-cartao${ligada ? ' ligada' : ''}`} disabled={!r.disponivel} onClick={() => alternarRede(r.id)} style={{ ['--c' as any]: r.cor }} aria-pressed={ligada}>
                    <span className="rede-ponto" />
                    <span className="rede-cartao-t"><b>{r.nome}</b><span>{!r.disponivel ? 'Em breve' : conta ? `Sai por ${conta.conta_nome || 'conta conectada'}` : 'Sem conta neste perfil'}</span></span>
                  </button>
                );
              })}
            </div>
            {naoConectadas.length > 0 && <p className="campo-dica" style={{ marginTop: 10 }}>{naoConectadas.map((id) => lista.find((r) => r.id === id)?.nome || id).join(', ')} ainda sem conta no perfil {perfilDe(perfil).t}: dá para salvar e agendar, mas só sai depois de conectar a conta desse perfil em Contas conectadas.</p>}
          </Grupo>

          <Grupo titulo="Formato">
            <div className="chips">
              {FORMATOS_POST.map((f) => <button key={f} type="button" className={`chip ${formato === f ? 'ativo' : ''}`} onClick={() => setFormato(f)}>{FORMATOS[f] || f}</button>)}
            </div>
            <p className="campo-dica" style={{ marginTop: 10 }}>{formato === 'carrossel' ? 'De 2 a 10 imagens (JPEG) ou vídeos, na ordem em que aparecem. O ideal é 4:5 (1080 × 1350).' : formato === 'post' ? 'Uma imagem. O ideal é 4:5 (1080 × 1350).' : formato === 'reels' ? 'Um vídeo em pé (9:16), MP4. Até 50 MB por aqui.' : 'Uma imagem ou um vídeo em pé (9:16). Story não tem legenda.'}</p>
          </Grupo>

          <Grupo titulo={`Mídias${midias.length ? ` (${midias.length})` : ''}`} acoes={pode('arquivos.enviar') ? (
            <label className="bt bt-mini"><ImagePlus />{subindo ? `Enviando ${subindo}…` : 'Enviar'}
              <input type="file" multiple accept={formato === 'reels' ? 'video/mp4,video/quicktime' : formato === 'post' ? 'image/*' : 'image/*,video/mp4,video/quicktime'} hidden onChange={(e) => { if (e.target.files) subir(e.target.files); e.target.value = ''; }} />
            </label>) : undefined}>
            {midias.length === 0 ? (
              <label className="soltar" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.length) subir(e.dataTransfer.files); }}>
                <ImagePlus /><b>Arraste as imagens ou o vídeo aqui</b><span>ou toque para escolher. PNG e WebP viram JPEG sozinhos.</span>
                <input type="file" multiple accept="image/*,video/mp4,video/quicktime" hidden onChange={(e) => { if (e.target.files) subir(e.target.files); e.target.value = ''; }} />
              </label>
            ) : (
              <div className="midias-compor" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.length) subir(e.dataTransfer.files); }}>
                {midias.map((m, i) => {
                  const aviso = avisoProporcao(formato, m.prop);
                  return (
                    <div className="midia-compor" key={m.url}>
                      {m.tipo === 'video' ? <video src={m.url} muted playsInline /> : <img src={m.url} alt={m.alt || `Mídia ${i + 1}`} />}
                      <span className="midia-n">{i + 1}</span>
                      <div className="midia-acoes">
                        <button type="button" className="bt-icone" disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Para trás"><ArrowLeft /></button>
                        <button type="button" className="bt-icone" disabled={i === midias.length - 1} onClick={() => mover(i, 1)} aria-label="Para frente"><ArrowRight /></button>
                        {m.tipo === 'imagem' && <button type="button" className={`bt-icone${m.alt ? ' com-alt' : ''}`} onClick={() => setAltAberto(altAberto === i ? null : i)} aria-label="Texto alternativo" title="Texto alternativo (acessibilidade)"><Type /></button>}
                        <button type="button" className="bt-icone" onClick={() => setMidias((l) => l.filter((_, j) => j !== i))} aria-label="Tirar"><Trash2 /></button>
                      </div>
                      {aviso && <span className="midia-aviso" title={aviso}>!</span>}
                    </div>
                  );
                })}
              </div>
            )}
            {altAberto != null && midias[altAberto] && (
              <div style={{ marginTop: 12 }}>
                <AreaTexto rotulo={`Texto alternativo da mídia ${altAberto + 1}`} valor={midias[altAberto].alt || ''} mudar={(v) => setMidias((l) => l.map((m, j) => (j === altAberto ? { ...m, alt: v } : m)))} linhas={2}
                  placeholder="O que a imagem mostra, para quem usa leitor de tela." />
              </div>
            )}
            {midias.some((m) => avisoProporcao(formato, m.prop)) && <p className="campo-dica" style={{ marginTop: 10 }}>{avisoProporcao(formato, midias.find((m) => avisoProporcao(formato, m.prop))!.prop)}</p>}
          </Grupo>

          {formato !== 'story' && (
            <Grupo titulo="Legenda">
              <AreaTexto rotulo={en ? 'Texto (em inglês)' : 'Texto'} valor={legenda} mudar={setLegenda} linhas={8} placeholder={en ? 'The first line is the hook.\n\nComment "WORD" and I\'ll send it to your DMs 🦎' : 'Primeira linha é o gancho.\n\nComenta "PALAVRA" que eu te envio no direct 🦎'}
                dica={`${legenda.length} caracteres · ${(legenda.match(/#[\p{L}\p{N}_]+/gu) || []).length} hashtags · ${(legenda.match(/@[\w.]+/g) || []).length} menções`} />
              {escolhidas.filter((id) => id !== 'instagram').map((id) => {
                const nome = lista.find((r) => r.id === id)?.nome || id;
                return proprios[id] == null
                  ? <button key={id} type="button" className="bt bt-mini bt-texto" onClick={() => setProprios((p) => ({ ...p, [id]: legenda }))}>Texto próprio para o {nome}</button>
                  : <div key={id} style={{ marginTop: 12 }}>
                    <AreaTexto rotulo={`Texto do ${nome}`} valor={proprios[id]!} mudar={(v) => setProprios((p) => ({ ...p, [id]: v }))} linhas={5} dica={`${proprios[id]!.length} de ${LIMITE[id] || 2200} caracteres.`} />
                    <button type="button" className="bt bt-mini bt-texto" onClick={() => setProprios((p) => { const n = { ...p }; delete n[id]; return n; })}>Usar a mesma legenda</button>
                  </div>;
              })}
              <Campo rotulo="Título interno (opcional)" valor={titulo} mudar={setTitulo} dica="Só para a equipe achar o post na agenda. Não vai para a rede." />
            </Grupo>
          )}

          {ig && formato !== 'story' && (
            <Grupo titulo="Instagram">
              <OpcoesInstagram op={opIg} mudar={setOpIg} formato={formato} />
            </Grupo>
          )}

          {ig && formato !== 'story' && pode('gatilhos.editar') && (
            <Grupo titulo="Comenta X (automação do direct)" acoes={<label className="interruptor"><input type="checkbox" checked={!!comenta} onChange={(e) => ligarComenta(e.target.checked)} /><span>{comenta ? 'Ligado' : 'Desligado'}</span></label>}>
              {!comenta ? <p className="mudo" style={{ margin: 0 }}><MessageCircleHeart style={{ width: 16, height: 16, verticalAlign: '-3px' }} /> Quem comentar a palavra recebe uma resposta no comentário e o material no direct, num botão, com o mini curso no fim. Liga sozinho quando o post sair.</p> : <>
                {en ? <>
                  <div className="linha-campos">
                    <Campo rotulo="Palavra" valor={comenta.palavra} mudar={(v) => mudarComenta('palavra', v)} placeholder="PROMPT" dica="Curta e fácil de digitar em inglês." />
                    <Campo rotulo="Link do material em inglês" valor={comenta.link} mudar={(v) => mudarComenta('link', v)} placeholder="https://" dica="As páginas de recurso do site são em português: aqui vai o link do material em inglês." />
                  </div>
                </> : <>
                  <div className="linha-campos">
                    <Campo rotulo="Palavra" valor={comenta.palavra} mudar={(v) => mudarComenta('palavra', v)} placeholder="PROMPT" dica="Curta e fácil de digitar." />
                    <Escolha rotulo="Material (recurso do site)" valor={comenta.recurso_id} mudar={(v) => mudarComenta('recurso_id', v)} opcoes={recursosOp} />
                  </div>
                  {!comenta.recurso_id && <Campo rotulo="Ou um link" valor={comenta.link} mudar={(v) => mudarComenta('link', v)} placeholder="https://" />}
                </>}
                {comenta.palavra && !legenda.toUpperCase().includes(comenta.palavra) && <Faixa tipo="aviso">A legenda ainda não pede "{comenta.palavra}". <button type="button" className="bt bt-mini" onClick={porNaLegenda}>Pôr na legenda</button></Faixa>}
                <EditorVersoes e={{ ...comenta, perfil }} mudar={mudarComenta} escreverIA={escreverIA} ocupado={ocupado} />
              </>}
            </Grupo>
          )}

          {problemas.length > 0 && midias.length > 0 && <Faixa tipo="aviso">{problemas[0]}</Faixa>}
          <div className="compor-acoes">
            <button className="bt" disabled={!!ocupado || !!subindo} onClick={() => enviar('rascunho')}><Save />{ocupado === 'rascunho' ? 'Salvando…' : 'Salvar rascunho'}</button>
            {podeAprovar && <button className="bt" disabled={!!ocupado || !!subindo || problemas.length > 0} onClick={() => setAgendar(true)}><CalendarClock />Agendar</button>}
            {podeAprovar && <button className="bt bt-tinta" disabled={!!ocupado || !!subindo || problemas.length > 0 || naoConectadas.length > 0}
              title={naoConectadas.length ? 'Conecte as redes escolhidas antes de publicar agora' : undefined}
              onClick={() => { if (confirm(`Publicar agora no perfil ${perfilDe(perfil).t}, em ${escolhidas.map((id) => `${lista.find((r) => r.id === id)?.nome || id} (${contaNoPerfil(lista.find((r) => r.id === id))?.conta_nome || 'conta conectada'})`).join(', ')}?`)) enviar('publicar'); }}><Send />{ocupado === 'publicar' ? 'Publicando…' : 'Publicar agora'}</button>}
          </div>
          {!podeAprovar && <p className="campo-dica">Seu cargo salva rascunhos. Quem é Editor aprova e agenda.</p>}
        </div>

        <aside className="compor-previa">
          <p className="compor-previa-t">Prévia no Instagram{contaIg?.conta_nome ? ` (${contaIg.conta_nome})` : ` · ${perfilDe(perfil).t}`}</p>
          <PreviaInstagram conta={contaIg?.conta_nome || (en ? 'setupagency_eng' : undefined)} foto={contaIg?.conta_foto} midias={midias} legenda={legenda} formato={formato} />
          {opIg.primeiro_comentario && <p className="previa-ig-comentario"><b>{String(contaIg?.conta_nome || (en ? 'setupagency_eng' : 'agenciasetup')).replace(/^@/, '')}</b> {opIg.primeiro_comentario}</p>}
        </aside>
      </div>

      <Modal titulo={`Agendar post · ${perfilDe(perfil).t}`} aberto={agendar} fechar={() => setAgendar(false)}
        rodape={<><button className="bt bt-texto" onClick={() => setAgendar(false)}>Cancelar</button>
          <button className="bt bt-tinta" disabled={!quando || !!ocupado} onClick={() => enviar('agendar')}><CalendarClock />{ocupado === 'agendar' ? 'Agendando…' : 'Agendar'}</button></>}>
        <Campo rotulo="Data e hora (no horário deste aparelho)" tipo="datetime-local" valor={quando} mudar={setQuando} />
        <p className="campo-dica">Agendar já aprova: na hora marcada o relógio publica sozinho (ele passa a cada 10 minutos). Até lá dá para mudar ou cancelar na agenda.</p>
      </Modal>
    </div>
  );
}
