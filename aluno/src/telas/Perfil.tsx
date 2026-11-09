// Perfil (seções 2.9 e 2.10): cartão com moldura, nível e números; abas Conquistas (selos), Certificados, Criações e
// Conta (foto recortada no aparelho, nome, @ do Instagram, @usuario público, frase, área, cidade, links, privacidade,
// senha, compras e sair). O perfil público fica em curso.agenciasetup.com.br/@usuario.
import { useEffect, useRef, useState } from 'react';
import { Carregando, I, copiar, inicial, useDados, useToast } from '../comum';
import { get, patch, post } from '../nucleo/api';
import { criarSenha, sair, senhaForte } from '../nucleo/auth';
import { Link, useRota } from '../nucleo/rota';

const ICONE: Record<string, string> = { curtir: 'coracao' };
const RARIDADE: Record<string, string> = { comum: 'Comum', rara: 'Rara', epica: 'Épica', lendaria: 'Lendária' };

export function Perfil({ eu, aoMudar }: { eu: any; aoMudar: (e: any) => void }) {
  const { rota, ir } = useRota();
  const toast = useToast();
  const [aba, setAba] = useState(rota.busca.get('aba') || 'conquistas');
  const jogo = useDados(() => get('/jogo'), []);
  const ranking = useDados(() => get('/ranking?periodo=semana'), []);
  useEffect(() => { document.title = 'Perfil | Cursos da Setup'; }, []);
  const trocar = (x: string) => { setAba(x); ir(`/perfil?aba=${x}`, { trocar: true }); };
  const nv = (jogo.dados && jogo.dados.nivel) || eu.nivel || { numero: 1, nome: '', xp: 0, pct: 0 };
  const ganhos = jogo.dados ? jogo.dados.selos.filter((s: any) => s.ganho).length : 0;
  const publico = eu.perfil_publico && eu.usuario ? `${location.origin}/@${eu.usuario}` : null;

  return (
    <section className="tela ativa gutter largura" aria-label="Perfil">
      <div className="perfil">
        <aside className="perfil-cartao">
          {eu.moldura ? (
            <div className="moldura">{eu.foto_url ? <span className="avatar"><img src={eu.foto_url} alt="" /></span> : <span className="avatar">{inicial(eu.nome)}</span>}<span className="selo-m"><I n="brilho" />Criador</span></div>
          ) : (
            <div className="moldura sem">{eu.foto_url ? <span className="avatar"><img src={eu.foto_url} alt="" /></span> : <span className="avatar">{inicial(eu.nome)}</span>}</div>
          )}
          <div style={{ display: 'grid', gap: 6, justifyItems: 'center' }}>
            <h1>{eu.nome}</h1>
            {eu.instagram ? <a className="ig" href={`https://instagram.com/${eu.instagram}`} target="_blank" rel="noopener"><I n="instagram" />@{eu.instagram}</a> : null}
          </div>
          {eu.bio ? <p>{eu.bio}</p> : null}
          {eu.area ? <span className="etiqueta" style={{ ['--c' as any]: '#8e8e93' }}>{eu.area}</span> : null}
          <div className="nivel">
            <div className="linha"><b>Nível {nv.numero} · {nv.nome}</b><span>{nv.ate ? `${nv.xp} / ${nv.ate} XP` : `${nv.xp} XP`}</span></div>
            <div className="barra"><i style={{ width: `${Math.max(3, nv.pct || 0)}%` }} /></div>
          </div>
          <div className="stats">
            <div className="stat"><b>{jogo.dados ? jogo.dados.sequencia : eu.sequencia || 0}</b><small>dias seguidos</small></div>
            <div className="stat"><b>{ranking.dados && ranking.dados.eu.posicao ? `${ranking.dados.eu.posicao}º` : '-'}</b><small>da semana</small></div>
            <div className="stat"><b>{ganhos}</b><small>selos</small></div>
          </div>
          <div className="acoes" style={{ justifyContent: 'center' }}>
            <button className="bt bt-p" onClick={() => trocar('conta')}><I n="nota" />Editar</button>
            {publico ? <button className="bt bt-p" onClick={() => copiar(publico, toast)}><I n="compartilhar" />Perfil público</button> : null}
          </div>
        </aside>
        <div className="perfil-conteudo">
          <div className="segmentos" role="tablist" aria-label="Partes do perfil">
            {[['conquistas', 'Conquistas'], ['certificados', 'Certificados'], ['criacoes', 'Criações'], ['conta', 'Conta']].map(([k, t]) => <button key={k} role="tab" aria-selected={aba === k} onClick={() => trocar(k)}>{t}</button>)}
          </div>
          {aba === 'conquistas' ? (jogo.dados ? (
            <>
              <div className="selos">
                {jogo.dados.selos.map((s: any) => (
                  <div key={s.id} className={`selo${s.ganho ? '' : ' bloq'}${s.novo ? ' novo' : ''}`} style={{ ['--c' as any]: s.cor }} title={s.descricao}>
                    <span className="med"><I n={ICONE[s.icone] || s.icone} /></span>
                    <b>{s.nome}</b>
                    <small>{s.ganho ? `${RARIDADE[s.raridade] || ''}${s.novo ? ' · novo' : ''}` : s.descricao}</small>
                  </div>
                ))}
              </div>
              {jogo.dados.ultimos.length ? <div className="cartao" style={{ marginTop: 14 }}><h3>Seus últimos pontos</h3>{jogo.dados.ultimos.map((u: any, i: number) => <p key={i} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{TIPO_XP[u.tipo] || u.tipo}</span><span className="marca-texto num">+{u.pontos} XP</span></p>)}</div> : null}
            </>
          ) : <Carregando />) : null}
          {aba === 'certificados' ? <Certificados /> : null}
          {aba === 'criacoes' ? <MinhasCriacoes /> : null}
          {aba === 'conta' ? <Conta eu={eu} aoMudar={aoMudar} /> : null}
        </div>
      </div>
    </section>
  );
}

const TIPO_XP: Record<string, string> = {
  aula: 'Aula assistida', passo: 'Passo do "Faça agora"', comentario_curtido: 'Comentário curtido', comentario_resolveu: 'Comentário que resolveu',
  modulo: 'Módulo concluído', curso: 'Curso concluído', entrega: 'Criação aprovada', destaque: 'Criação destaque', certificado: 'Certificado',
  depoimento: 'Depoimento', dia: 'Dia de estudo', conquista: 'Selo novo', desafio: 'Desafio',
};

function Certificados() {
  const { dados } = useDados(() => get('/certificados'), []);
  if (!dados) return <Carregando />;
  if (!dados.length) return <div className="cartao"><h3>Nenhum certificado ainda</h3><p>O certificado sai sozinho quando você conclui 70% das aulas de um curso. Ele vem com código para conferir, PDF e o botão do LinkedIn.</p></div>;
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {dados.map((c: any) => (
        <a key={c.codigo} className="cartao cert-item" href={`/certificado/${c.codigo}`}>
          <div className="cert"><span className="anel" style={{ ['--p' as any]: 100 }} data-txt="70%" /><div><h3>{c.curso_titulo}</h3><p>Emitido em {new Date(c.emitido_em).toLocaleDateString('pt-BR')} · {String(c.horas).replace('.', ',')} h · código {c.codigo}</p></div></div>
        </a>
      ))}
    </div>
  );
}

function MinhasCriacoes() {
  const { dados } = useDados(() => get('/mural'), []);
  if (!dados) return <Carregando />;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {dados.minhas.length ? dados.minhas.map((m: any) => <p key={m.id} className="cartao" style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span>{m.titulo}</span><span className="fraco">{m.status === 'pendente' ? 'em análise' : m.status === 'recusada' ? 'não entrou' : m.status === 'destaque' ? 'destaque' : 'no mural'}</span></p>)
        : <div className="cartao"><h3>Você ainda não mandou criações</h3><p>Mostre o que você fez com o curso. Criação aprovada vai para o mural, dá XP e a moldura de criador.</p><Link className="bt bt-marca bt-p" para="/turma" style={{ justifySelf: 'start' }}><I n="mais" />Enviar criação</Link></div>}
    </div>
  );
}

// Recorta a foto em quadrado no aparelho (400 x 400) antes de mandar.
function recortarFoto(arquivo: File): Promise<string> {
  return new Promise((ok, falha) => {
    const img = new Image();
    img.onload = () => {
      const lado = Math.min(img.width, img.height);
      const c = document.createElement('canvas');
      c.width = 400; c.height = 400;
      c.getContext('2d')!.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 400, 400);
      ok(c.toDataURL('image/jpeg', 0.86));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => falha(new Error('Não consegui abrir essa foto.'));
    img.src = URL.createObjectURL(arquivo);
  });
}

function Conta({ eu, aoMudar }: { eu: any; aoMudar: (e: any) => void }) {
  const toast = useToast();
  const { ir } = useRota();
  const [f, setF] = useState({ nome: eu.nome || '', instagram: eu.instagram || '', usuario: eu.usuario || '', bio: eu.bio || '', area: eu.area || '', cidade: eu.cidade || '', links: (eu.links || []) as any[] });
  const [senha, setSenha] = useState('');
  const [salvando, setSalvando] = useState(false);
  const arq = useRef<HTMLInputElement>(null);
  const original = JSON.stringify({ nome: eu.nome || '', instagram: eu.instagram || '', usuario: eu.usuario || '', bio: eu.bio || '', area: eu.area || '', cidade: eu.cidade || '', links: eu.links || [] });
  const mudou = JSON.stringify(f) !== original;

  async function salvar(dados: any) {
    setSalvando(true);
    try { const r = await patch('/eu', dados); aoMudar({ ...eu, ...r }); toast('Salvo'); } catch (e: any) { toast(e.message); } finally { setSalvando(false); }
  }
  async function foto(a?: File) {
    if (!a) return;
    try { const imagem = await recortarFoto(a); const r = await post('/eu/foto', { imagem }); aoMudar({ ...eu, foto_url: r.foto_url }); toast('Foto nova salva'); } catch (e: any) { toast(e.message); }
  }
  async function guardarSenha(e: any) {
    e.preventDefault();
    if (!senhaForte(senha)) { toast('Use pelo menos 10 caracteres, com letra maiúscula, minúscula e número.'); return; }
    try { await criarSenha(senha); setSenha(''); toast('Senha criada. Agora dá para entrar com ela também.'); } catch (er: any) { toast(er.message); }
  }
  const link = (i: number, campo: string, v: string) => setF({ ...f, links: f.links.map((l, k) => (k === i ? { ...l, [campo]: v } : l)) });

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="cartao" style={{ gridTemplateColumns: 'auto 1fr', alignItems: 'center' }}>
        {eu.foto_url ? <span className="avatar" style={{ ['--tam' as any]: '64px' }}><img src={eu.foto_url} alt="" /></span> : <span className="avatar" style={{ ['--tam' as any]: '64px' }}>{inicial(eu.nome)}</span>}
        <div style={{ display: 'grid', gap: 6 }}><b>Foto do perfil</b><span className="acoes"><button className="bt bt-p" onClick={() => arq.current && arq.current.click()}><I n="imagem" />{eu.foto_url ? 'Trocar a foto' : 'Pôr uma foto'}</button></span></div>
        <input ref={arq} type="file" accept="image/*" hidden onChange={(e) => foto(e.target.files ? e.target.files[0] : undefined)} />
      </div>
      <form className="cartao" onSubmit={(e) => { e.preventDefault(); salvar(f); }}>
        <h3>Seu perfil</h3>
        <div className="campos-perfil">
          <div className="campo"><label htmlFor="p-nome">Nome</label><input id="p-nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} maxLength={80} /></div>
          <div className="campo"><label htmlFor="p-ig">Instagram</label><input id="p-ig" value={f.instagram} onChange={(e) => setF({ ...f, instagram: e.target.value })} placeholder="@seuperfil" maxLength={31} /></div>
          <div className="campo"><label htmlFor="p-us">Usuário do perfil público</label><input id="p-us" value={f.usuario} onChange={(e) => setF({ ...f, usuario: e.target.value.toLowerCase() })} placeholder="seu.nome" maxLength={30} /></div>
          <div className="campo"><label htmlFor="p-area">O que você faz</label><input id="p-area" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} placeholder="Social media, designer, dona de negócio..." maxLength={40} /></div>
          <div className="campo"><label htmlFor="p-cid">Cidade (opcional)</label><input id="p-cid" value={f.cidade} onChange={(e) => setF({ ...f, cidade: e.target.value })} maxLength={60} /></div>
          <div className="campo"><label htmlFor="p-bio">Uma frase sobre você</label><input id="p-bio" value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} maxLength={160} /></div>
        </div>
        <h3>Links (até 4)</h3>
        {f.links.map((l, i) => (
          <div key={i} className="campos-perfil">
            <div className="campo"><label htmlFor={`l-t-${i}`}>Nome do link</label><input id={`l-t-${i}`} value={l.titulo} onChange={(e) => link(i, 'titulo', e.target.value)} maxLength={40} /></div>
            <div className="campo"><label htmlFor={`l-u-${i}`}>Endereço</label><input id={`l-u-${i}`} value={l.url} onChange={(e) => link(i, 'url', e.target.value)} placeholder="https://" inputMode="url" /></div>
          </div>
        ))}
        {f.links.length < 4 ? <button type="button" className="bt bt-p" style={{ justifySelf: 'start' }} onClick={() => setF({ ...f, links: [...f.links, { titulo: '', url: 'https://' }] })}><I n="mais" />Pôr um link</button> : null}
        <button className="bt bt-marca bt-p" disabled={!mudou || salvando} style={{ justifySelf: 'start' }}>{salvando ? 'Salvando...' : 'Salvar'}</button>
      </form>

      <div className="opcoes">
        <div className="opcao"><div>Perfil público<small>{eu.usuario ? `Mostra conquistas, criações e certificados em ${location.host}/@${eu.usuario}` : 'Escolha um usuário acima para ter o seu link'}</small></div><button className="chave" role="switch" aria-checked={!!eu.perfil_publico} aria-label="Perfil público" disabled={!eu.usuario} onClick={() => salvar({ perfil_publico: !eu.perfil_publico })} /></div>
        <div className="opcao"><div>Aparecer no ranking<small>Só o seu nome e a foto</small></div><button className="chave" role="switch" aria-checked={!!eu.no_ranking} aria-label="Aparecer no ranking" onClick={() => salvar({ no_ranking: !eu.no_ranking })} /></div>
      </div>

      <form className="cartao" onSubmit={guardarSenha}>
        <h3>Senha (opcional)</h3>
        <p>Sem senha, você entra com um código no e-mail. Se preferir, crie uma.</p>
        <div className="campo"><label htmlFor="p-senha">Nova senha</label><input id="p-senha" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
        <button className="bt bt-p" disabled={!senha} style={{ justifySelf: 'start' }}>Criar senha</button>
      </form>

      <div className="opcoes">
        <div className="opcao"><div>Compras e pagamentos<small>Comprovantes, Pix ou cartão pendente e seus dados de cobrança</small></div><button className="bt bt-p" onClick={() => ir('/compras')}><I n="recibo" />Abrir</button></div>
        <div className="opcao"><div>Seus dados<small>Para baixar tudo ou apagar a conta, escreva para contato@agenciasetup.com.br</small></div></div>
        <div className="opcao"><div>Sair deste aparelho</div><button className="bt bt-p" onClick={async () => { await sair(); ir('/entrar', { trocar: true }); }}><I n="sair" />Sair</button></div>
      </div>
    </div>
  );
}
