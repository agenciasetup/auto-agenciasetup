// A planta do Escritório de IA: as 8 salas em pixel, vistas em ângulo (isométrico), com um Calango por agente que
// trabalha, da cor do setor e vestido pela função. Quem roda sempre ligado fica sentado digitando; os outros andam pelo
// chão livre. Eles pensam e falam o que estão fazendo, e a seta em cima da cabeça diz como cada um está indo.
// Duas visões: a geral (todas as salas) e a de um setor (a sala grande, o consumo por modelo e a equipe). O toque num
// Calango abre o perfil ao lado. Pedidos do dono em 09 e 10/11/2026 (docs/escritorio.md).
// As salas e os bonecos saem do Magnific e moram no bucket midia (scripts/escritorio-sala.mjs, escritorio-bonecos.mjs,
// escritorio-cores.mjs e escritorio-arte.mjs): todas as salas têm a mesma câmera e o mesmo chão, por isso os pontos
// valem em porcentagem da imagem.
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ArrowDown, ArrowLeft, ArrowUp, Maximize2, Pause, Pencil, Play, UserMinus, UserPlus, X } from 'lucide-react';
import { get, post } from '../nucleo/api';
import { Etiqueta, avisar } from '../nucleo/ui';
import { dataHora, haQuanto, numero } from '../nucleo/util';
import folhaDoCalango from '../img/escritorio-calango.webp';

// Onde cada um fica, em [x, y] por cento da imagem. SENTAR: quem trabalha sentado; em Vendas e Conteúdo os primeiros
// lugares são as cadeiras das mesas da própria sala (o boneco sentado traz a cadeira e cobre a da imagem). ANDAR: o
// chão livre por onde os outros circulam.
const SENTAR: Record<string, number[][]> = {
  direcao: [[27, 70], [81, 73]],
  vendas: [[22, 68], [54.5, 50.5], [79, 69]],
  conteudo: [[22, 68], [54.5, 50.5], [44, 66], [68, 67]],
  video: [[50, 58], [57, 63]],
  design: [[44, 62], [62, 74]],
  sistema: [[35, 72], [62, 74]],
  produto: [[52, 66], [64, 68]],
  receita: [[44, 66], [56, 70]],
};
const ANDAR: Record<string, number[][]> = {
  direcao: [[23, 77], [31, 82], [75, 79], [86, 70]],
  vendas: [[42, 62], [60, 60], [50, 70], [66, 72], [36, 80], [70, 80]],
  conteudo: [[56, 59], [60, 75], [77, 74], [38, 78], [32, 84], [68, 82]],
  video: [[53, 70], [49, 78], [56, 86], [46, 90]],
  design: [[42, 72], [52, 77], [40, 82], [66, 80]],
  sistema: [[48, 76], [72, 78], [40, 82], [56, 84]],
  produto: [[72, 74], [56, 80], [46, 84], [36, 86], [64, 84]],
  receita: [[30, 70], [48, 80], [38, 84], [60, 84], [52, 90]],
};
const NOME_TURNO: Record<string, string> = { rodando: 'trabalhando agora', ok: 'deu certo', erro: 'deu erro', sem_trabalho: 'não tinha o que fazer' };
const NOME_SINAL: Record<string, string> = { bem: 'Indo bem', neutro: 'Neutro', mal: 'Precisa de atenção' };
const curto = (t: string, n = 46) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);
// De qual tarefa agendada foi o turno (dados.tarefa): os posts de frase das 8h e o carrossel das 10h gravam nos mesmos
// agentes. Tarefa que não está na lista aparece com o próprio nome.
const NOME_TAREFA: Record<string, string> = { 'posts-de-frase-do-dia': 'Posts de frase', 'carrossel-em-alta-do-dia': 'Carrossel do dia', 'direct-followup': 'Rodada do direct' };
export const nomeDaTarefa = (t?: string | null) => (t ? NOME_TAREFA[t] || curto(String(t).replace(/-/g, ' '), 28) : '');
// O rótulo da tarefa ao lado do turno. Sem tarefa informada, nada.
export function Tarefa({ t }: { t?: string | null }) {
  const nome = nomeDaTarefa(t);
  return nome ? <span className="pl-tarefa" title="A tarefa agendada que gravou este turno">{nome}</span> : null;
}
const COR_STATUS: Record<string, string> = { nova: 'ambar', aprovada: 'azul', depois: 'cinza', descartada: 'cinza', feita: 'verde' };
// Valor pequeno aparece com 4 casas, para meio centavo não virar zero.
export const dolar = (v?: number | null) => { const n = Number(v) || 0; const casas = n > 0 && n < 0.1 ? 4 : 2; return `US$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}`; };
const mil = (v?: number | null) => { const n = Number(v) || 0; if (n >= 1e6) return `${(n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`; if (n >= 1000) return `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`; return numero(n); };
// "João L." quando o Calango tem nome; senão, a função.
export const chamado = (a: any) => a.apelido || a.nome;

// O que o agente está fazendo, em uma frase: é o que ele "fala" no balão e o que abre o perfil.
export function fazendo(a: any): string {
  const u = a.turnos?.ultimo;
  const semPonto = (t: string) => String(t || '').trim().replace(/[.]+$/, '').trim();
  if (a.estado === 'desligado') return 'Demitido';
  if (a.estado === 'planejado') return 'Vaga aberta: ainda não foi construído';
  if (a.estado === 'pausado') return 'Em pausa';
  if (a.offline) return a.maquina_nome ? `Offline: ${a.maquina_nome} desligado` : 'Offline: nenhum computador ligado';
  if (u?.status === 'rodando') return 'Trabalhando agora';
  if (a.trabalho?.frase) return semPonto(a.trabalho.frase);
  if (u?.resumo) return semPonto(u.resumo);
  return semPonto(a.funcao);
}

// A seta de desempenho: verde para cima, amarela no meio, vermelha para baixo.
export function Seta({ sinal, classe = '' }: { sinal?: { nivel: string; motivo: string } | null; classe?: string }) {
  if (!sinal) return null;
  return <i className={`pl-seta pl-seta-${sinal.nivel} ${classe}`} title={`${NOME_SINAL[sinal.nivel] || ''}: ${sinal.motivo}`} aria-hidden="true" />;
}

export function Planta({ salas, arte, abrir }: { salas: any[]; arte: any; abrir: (a: any) => void }) {
  // A sala aberta (visão do setor). Sem sala, é a visão geral.
  const [aberta, setAberta] = useState<string | null>(null);
  const topo = useRef<HTMLDivElement>(null);
  const trocar = (id: string | null) => {
    const d = document as any;
    const parado = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (d.startViewTransition && !parado) d.startViewTransition(() => flushSync(() => setAberta(id)));
    else setAberta(id);
  };
  // Ao abrir uma sala, a tela sobe até ela.
  useEffect(() => { if (aberta) topo.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, [aberta]);
  const bonecos = arte?.bonecos || {};
  const sala = aberta ? salas.find((s) => s.id === aberta) : null;
  if (sala) {
    return (
      <div className="pl-setor" ref={topo}>
        <div className="pl-setor-topo">
          <button type="button" className="bt bt-mini bt-tingido" onClick={() => trocar(null)}><ArrowLeft />Todas as salas</button>
          <div className="pl-abas" role="tablist" aria-label="Salas">
            {salas.map((s) => <button key={s.id} type="button" role="tab" aria-selected={s.id === aberta} className={`pl-aba esc-${s.id}${s.id === aberta ? ' pl-aba-ativa' : ''}`} onClick={() => trocar(s.id)}>{s.nome}</button>)}
          </div>
        </div>
        <div className="pl-setor-corpo">
          <SalaIso key={sala.id} s={sala} imagem={arte?.salas?.[sala.id]} bonecos={bonecos} abrir={abrir} grande />
          <LadoDoSetor s={sala} bonecos={bonecos} abrir={abrir} />
        </div>
      </div>
    );
  }
  return (
    <div className="pl-planta">
      {salas.map((s) => <SalaIso key={s.id} s={s} imagem={arte?.salas?.[s.id]} bonecos={bonecos} abrir={abrir} expandir={() => trocar(s.id)} />)}
    </div>
  );
}

type Boneco = { b: HTMLElement; x: number; y: number; tx: number; ty: number; ponto: number; ate: number; anda: boolean; senta: boolean; parado: boolean; fala: number };

function SalaIso({ s, imagem, bonecos, abrir, expandir, grande = false }: { s: any; imagem?: string; bonecos: Record<string, string>; abrir: (a: any) => void; expandir?: () => void; grande?: boolean }) {
  const chao = useRef<HTMLDivElement>(null);
  const vivos = s.agentes.filter((a: any) => a.estado === 'ativo' || a.estado === 'pausado');
  const vagas = s.agentes.filter((a: any) => a.estado === 'planejado');
  // Quem roda sempre ligado (na nuvem) trabalha sentado, enquanto houver cadeira; os outros andam.
  const assentos = SENTAR[s.id] || [];
  let ocupados = 0;
  const modo: Record<string, string> = {};
  for (const a of vivos) modo[a.id] = a.estado === 'ativo' && a.onde === 'worker' && ocupados < assentos.length ? (ocupados++, 'senta') : 'anda';
  const chave = vivos.map((a: any) => `${a.id}:${a.estado}:${modo[a.id]}`).join(',');

  useEffect(() => {
    const el = chao.current;
    if (!el) return;
    const pontos = ANDAR[s.id] || ANDAR.vendas;
    let nSenta = 0;
    let nAnda = 0;
    const lista: Boneco[] = [...el.querySelectorAll<HTMLElement>('[data-boneco]')].map((b) => {
      const senta = b.dataset.modo === 'senta';
      const i = senta ? nSenta++ : nAnda++;
      const p = senta ? assentos[i % Math.max(1, assentos.length)] || pontos[0] : pontos[i % pontos.length];
      // Quando há mais bonecos que pontos, os que sobram ficam um pouco ao lado, para ninguém ficar em cima de ninguém.
      const volta = senta ? 0 : Math.floor(i / pontos.length);
      return { b, x: p[0] + volta * 4, y: p[1] + volta * 2, tx: p[0], ty: p[1], ponto: senta ? -1 : i % pontos.length, ate: performance.now() + 600 + Math.random() * 5000, anda: false, senta, parado: b.dataset.estado !== 'ativo', fala: 0 };
    });
    // lado: quem está perto da parede abre o balão para dentro da sala, para ele não sair da tela.
    const pinta = (c: Boneco) => { c.b.style.left = `${c.x}%`; c.b.style.top = `${c.y}%`; c.b.style.zIndex = String(Math.round(c.y * 10)); c.b.dataset.lado = c.x < 36 ? 'e' : c.x > 64 ? 'd' : ''; };
    lista.forEach(pinta);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const fecha = (c: Boneco) => { c.b.classList.remove('pl-fala', 'pl-pensa'); c.fala = 0; };
    const balao = (c: Boneco, tipo: string, dura: number, t: number) => { fecha(c); c.b.classList.add(`pl-${tipo}`); c.fala = t + dura; };
    let quadro = 0;
    let antes = performance.now();
    let proximaFala = antes + 1500 + Math.random() * 3000; // na sala, um fala de cada vez
    // Pensa de vez em quando; fala quando é a vez da sala.
    const conversa = (c: Boneco, t: number, chancePensar: number) => {
      if (t > proximaFala) { balao(c, 'fala', 4200, t); proximaFala = t + 6500 + Math.random() * 4500; } else if (Math.random() < chancePensar) balao(c, 'pensa', 2200, t);
    };
    const passo = (t: number) => {
      quadro = requestAnimationFrame(passo);
      const dt = Math.min(0.1, (t - antes) / 1000);
      antes = t;
      if (document.hidden) return;
      for (const c of lista) {
        if (c.fala && t > c.fala) fecha(c);
        if (c.parado) continue;
        if (c.senta) {
          if (t >= c.ate) { c.ate = t + 5000 + Math.random() * 7000; conversa(c, t, 0.25); }
          continue;
        }
        if (c.anda) {
          const dx = c.tx - c.x;
          const dy = c.ty - c.y;
          const d = Math.hypot(dx, dy);
          const v = 6.5 * dt; // por segundo, em porcentagem da largura da sala
          if (d <= v) {
            c.x = c.tx; c.y = c.ty; c.anda = false;
            c.b.classList.remove('pl-anda');
            c.ate = t + 2500 + Math.random() * 6500;
            conversa(c, t, 0.16);
          } else { c.x += (dx / d) * v; c.y += (dy / d) * v; }
          pinta(c);
        } else if (t >= c.ate) {
          const tomados = new Set(lista.filter((o) => o !== c).map((o) => o.ponto));
          const livres = pontos.map((_, i) => i).filter((i) => i !== c.ponto && !tomados.has(i));
          if (!livres.length) { c.ate = t + 3500 + Math.random() * 5000; conversa(c, t, 0.2); continue; }
          c.ponto = livres[Math.floor(Math.random() * livres.length)];
          [c.tx, c.ty] = pontos[c.ponto];
          c.anda = true;
          c.b.classList.add('pl-anda');
          c.b.classList.toggle('pl-vira', c.tx < c.x);
          fecha(c);
        }
      }
    };
    quadro = requestAnimationFrame(passo);
    return () => { cancelAnimationFrame(quadro); lista.forEach(fecha); };
  }, [s.id, chave]);

  const trabalhando = vivos.filter((a: any) => a.estado === 'ativo').length;
  // Na visão geral do celular a sala é pequena demais para acertar um Calango com o dedo: o toque abre a sala.
  const tocar = (a: any) => { if (expandir && (chao.current?.clientWidth || 999) < 250) expandir(); else abrir(a); };
  const naSala = trabalhando === 0 ? 'Sala vazia' : trabalhando === 1 ? '1 ativo' : `${trabalhando} ativos`;
  return (
    <section className={`pl-sala esc-${s.id}${grande ? ' pl-grande' : ' pl-cartao'}`} aria-label={`Sala ${s.nome}`}>
      {!grande && (
        <header className="pl-cartao-topo">
          <span className="pl-ponto" aria-hidden="true" />
          <h3>{s.nome}</h3>
          <button type="button" className="pl-expandir" onClick={expandir} aria-label={`Abrir a sala ${s.nome}: equipe e consumo`} title="Abrir a sala"><Maximize2 /></button>
        </header>
      )}
      <div className="pl-chao" ref={chao} style={{ ...(imagem ? { backgroundImage: `url(${imagem})` } : {}), viewTransitionName: `sala-${s.id}` } as any}>
        {vivos.map((a: any) => {
          const u = a.turnos?.ultimo;
          const erro = u?.status === 'erro';
          const senta = modo[a.id] === 'senta';
          const foto = (senta && bonecos[`${a.id}-sentado`]) || bonecos[a.id];
          return (
            <button key={a.id} type="button" data-boneco data-estado={a.offline ? 'offline' : a.estado} data-modo={modo[a.id]} className={`pl-boneco pl-b-${a.estado}${a.offline ? ' pl-b-offline' : ''}${senta ? ' pl-senta' : ''}${erro ? ' pl-b-erro' : ''}${u?.status === 'rodando' ? ' pl-b-rodando' : ''}`} onClick={() => tocar(a)} aria-label={`${chamado(a)}, ${a.nome}: ${fazendo(a)}. Abrir o perfil.`}>
              <span className="pl-balao pl-balao-fala"><b>{chamado(a)}</b>{curto(fazendo(a))}</span>
              <span className="pl-balao pl-balao-pensa" aria-hidden="true"><i /><i /><i /></span>
              {a.estado === 'pausado' && <span className="pl-balao pl-balao-fixo" aria-hidden="true">zz</span>}
              {a.offline && <span className="pl-balao pl-balao-fixo pl-zzz" aria-hidden="true">ZzzZz</span>}
              <Seta sinal={a.sinal} />
              {foto
                ? <span className="pl-sprite pl-foto" style={{ backgroundImage: `url(${foto})` }} aria-hidden="true" />
                : <span className="pl-sprite" style={{ backgroundImage: `url(${folhaDoCalango})` }} aria-hidden="true" />}
              <span className="pl-rotulo"><b>{chamado(a)}</b>{a.apelido ? a.nome : ''}</span>
            </button>
          );
        })}
      </div>
      {!grande && (
        <footer className="pl-cartao-pe">
          <span>{naSala}{vagas.length > 0 ? ` · ${vagas.length === 1 ? '1 vaga' : `${vagas.length} vagas`}` : ''}</span>
          {s.consumo?.hoje > 0 && <span>{s.consumo.hoje < 0.01 ? 'menos de US$ 0,01' : `US$ ${s.consumo.hoje.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} hoje</span>}
        </footer>
      )}
    </section>
  );
}

// Ao lado da sala aberta: quanto o setor gastou, por modelo, e a equipe (o toque abre o perfil).
function LadoDoSetor({ s, bonecos, abrir }: { s: any; bonecos: Record<string, string>; abrir: (a: any) => void }) {
  const c = s.consumo;
  const noPlano = s.agentes.filter((a: any) => a.estado === 'ativo' && a.onde === 'computador').length;
  return (
    <aside className={`pl-lado esc-${s.id}`}>
      <h2 className="pl-lado-titulo"><span className="pl-ponto" />{s.nome}</h2>

      <h3>Consumo de IA</h3>
      <div className="pl-custos">
        <div><b>{dolar(c?.hoje)}</b><span>hoje</span></div>
        <div><b>{dolar(c?.d7)}</b><span>7 dias</span></div>
        <div><b>{dolar(c?.d30)}</b><span>30 dias</span></div>
      </div>
      {c?.modelos?.length > 0 ? (
        <table className="pl-modelos">
          <thead><tr><th>Modelo</th><th>Chamadas</th><th>Tokens</th><th>Custo</th></tr></thead>
          <tbody>
            {c.modelos.map((m: any) => (
              <tr key={m.modelo}>
                <td>{m.nome}</td>
                <td>{numero(m.chamadas_30d)}</td>
                <td>{mil(m.tokens_entrada_30d + m.tokens_saida_30d)}</td>
                <td>{dolar(m.custo_30d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="mudo">Nenhuma chamada de IA paga nesta sala nos últimos 30 dias.</p>}
      <p className="mudo pl-nota">Chamadas, tokens e custo dos últimos 30 dias, pela API.{noPlano > 0 ? ` ${noPlano === 1 ? '1 agente desta sala roda' : `${noPlano} agentes desta sala rodam`} no computador, pelo seu plano do Claude: não gasta API e não entra nesta conta.` : ''}</p>

      <h3>Equipe</h3>
      <ul className="pl-equipe">
        {s.agentes.map((a: any) => (
          <li key={a.id}>
            <button type="button" className={`pl-membro pl-m-${a.estado}`} onClick={() => abrir(a)}>
              <span className="pl-membro-foto" style={bonecos[a.id] ? { backgroundImage: `url(${bonecos[a.id]})` } : undefined} aria-hidden="true" />
              <span className="pl-membro-nome"><b>{chamado(a)}</b><small>{a.apelido ? a.nome : ''}{a.estado === 'planejado' ? `${a.apelido ? ' · ' : ''}vaga aberta` : a.estado === 'pausado' ? ' · em pausa' : a.offline ? ' · offline' : ''}</small></span>
              <span className="pl-membro-fim">
                {a.estado === 'ativo' && <Seta sinal={a.sinal} classe="pl-seta-linha" />}
                {a.consumo?.d30 > 0 ? <small>{dolar(a.consumo.d30)}</small> : a.estado === 'ativo' && a.onde === 'computador' ? <small>plano</small> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

type Acao = { rotulo: string; corpo: any; ok: string; perigo?: boolean };

// O perfil do agente, ao lado: o que faz, o que está fazendo, o consumo, o placar, a carreira, os turnos e o caderno.
export function Perfil({ a, nomes, foto, fechar, mudou, podeEditar }: { a: any; nomes: any; foto?: string; fechar: () => void; mudou: () => void; podeEditar: boolean }) {
  const [det, setDet] = useState<any>(null);
  const [acao, setAcao] = useState<Acao | null>(null);
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [renomear, setRenomear] = useState<string | null>(null);
  const carregar = () => get(`/escritorio/agentes/${a.id}`).then(setDet).catch((e: any) => avisar(e.message || 'Não consegui abrir o agente.', 'erro'));
  useEffect(() => { setDet(null); setAcao(null); setMotivo(''); setRenomear(null); carregar(); }, [a.id]);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [fechar]);

  const estado = det?.estado || a.estado;
  const nivel = det?.nivel || a.nivel || 1;
  const apelido = det ? det.apelido : a.apelido;
  const u = a.turnos?.ultimo;
  const c = a.consumo;
  const confirmar = async () => {
    if (!acao) return;
    setSalvando(true);
    try { await post(`/escritorio/agentes/${a.id}`, { ...acao.corpo, motivo: motivo.trim() }); avisar(acao.ok); setAcao(null); setMotivo(''); await carregar(); mudou(); }
    catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); }
    setSalvando(false);
  };
  const salvarNome = async () => {
    setSalvando(true);
    try { await post(`/escritorio/agentes/${a.id}`, { apelido: (renomear || '').trim() }); avisar('Nome salvo.'); setRenomear(null); await carregar(); mudou(); }
    catch (e: any) { avisar(e.message || 'Não deu certo. Tente de novo.', 'erro'); }
    setSalvando(false);
  };
  const acoes: (Acao & { icone: JSX.Element })[] = [];
  if (podeEditar && det) {
    if ((estado === 'ativo' || estado === 'pausado') && nivel < 4) acoes.push({ rotulo: 'Promover', icone: <ArrowUp />, corpo: { promover: true }, ok: `${chamado(a)} foi promovido.` });
    if ((estado === 'ativo' || estado === 'pausado') && nivel > 1) acoes.push({ rotulo: 'Rebaixar', icone: <ArrowDown />, corpo: { rebaixar: true }, ok: `${chamado(a)} foi rebaixado.` });
    if (det.controla && estado === 'ativo') acoes.push({ rotulo: 'Pausar', icone: <Pause />, corpo: { estado: 'pausado' }, ok: `${chamado(a)} está em pausa.` });
    if (det.controla && estado === 'pausado') acoes.push({ rotulo: 'Voltar ao trabalho', icone: <Play />, corpo: { estado: 'ativo' }, ok: `${chamado(a)} voltou ao trabalho.` });
    if (det.controla && (estado === 'ativo' || estado === 'pausado')) acoes.push({ rotulo: 'Demitir', icone: <UserMinus />, corpo: { estado: 'desligado' }, ok: `${chamado(a)} foi demitido.`, perigo: true });
    if (det.controla && estado === 'desligado') acoes.push({ rotulo: 'Readmitir', icone: <UserPlus />, corpo: { estado: 'ativo' }, ok: `${chamado(a)} foi readmitido.` });
    // Vaga aberta de quem já tem o trabalho pronto no sistema: só começa quando o dono contrata.
    if (det.controla && estado === 'planejado') acoes.push({ rotulo: 'Contratar', icone: <UserPlus />, corpo: { estado: 'ativo' }, ok: `${chamado(a)} foi contratado.` });
  }

  return (
    <>
      <div className="pl-fundo" onClick={fechar} aria-hidden="true" />
      <aside className="pl-perfil" role="dialog" aria-label={`Perfil de ${chamado(a)}`}>
        <header className={`pl-perfil-topo esc-${a.sala}`}>
          <span className={`pl-perfil-sprite${foto ? ' pl-foto' : ''}`} style={{ backgroundImage: `url(${foto || folhaDoCalango})` }} aria-hidden="true" />
          <div>
            <h2>{apelido || a.nome}</h2>
            <p>{apelido ? `${a.nome} · ` : ''}{nomes.salas[a.sala]}{estado === 'ativo' || estado === 'pausado' ? ` · ${nomes.niveis[nivel]}` : ''}</p>
          </div>
          <button type="button" className="pl-fechar" onClick={fechar} aria-label="Fechar o perfil"><X /></button>
        </header>
        <div className="pl-perfil-corpo">
          <p className="pl-estado"><span className={`esc-luz esc-luz-${estado}`} />{nomes.estados[estado]}{estado !== 'planejado' ? ` · ${nomes.onde[det?.onde || a.onde] || ''}` : ''}{(det?.cadencia || a.cadencia) ? ` · ${det?.cadencia || a.cadencia}` : ''}</p>
          {a.offline && <p className="pl-sinal"><b>Offline.</b> {a.maquina_nome ? `Este agente só roda no ${a.maquina_nome}, que está sem sinal. Ele volta sozinho quando esse computador ligar.` : 'Nenhum computador da agência está ligado, e este agente roda no computador. Ele volta sozinho quando um deles ligar.'}</p>}
          {a.sinal && estado === 'ativo' && <p className={`pl-sinal pl-sinal-${a.sinal.nivel}`}><Seta sinal={a.sinal} classe="pl-seta-linha" /><b>{NOME_SINAL[a.sinal.nivel]}.</b> {a.sinal.motivo}</p>}

          {podeEditar && det && renomear === null && <button type="button" className="bt bt-mini bt-texto pl-renomear" onClick={() => setRenomear(apelido || '')}><Pencil />Mudar o nome</button>}
          {renomear !== null && (
            <div className="pl-motivo">
              <label htmlFor="pl-nome">O nome do Calango, com a inicial do sobrenome (ex.: João L.)</label>
              <input id="pl-nome" type="text" maxLength={40} value={renomear} onChange={(e) => setRenomear(e.target.value)} autoFocus />
              <div className="pl-acoes">
                <button type="button" className="bt bt-mini bt-tinta" disabled={salvando || renomear.trim().length < 2} onClick={salvarNome}>Salvar o nome</button>
                <button type="button" className="bt bt-mini bt-texto" onClick={() => setRenomear(null)}>Cancelar</button>
              </div>
            </div>
          )}

          <h3>O que faz</h3>
          <p>{det?.funcao || a.funcao}</p>

          <h3>O que está fazendo</h3>
          <p>{fazendo({ ...a, estado })}</p>
          {u && estado !== 'planejado' && <p className="mudo">Último turno {haQuanto(u.inicio)}: {NOME_TURNO[u.status] || u.status}. <Tarefa t={u.tarefa} /></p>}
          {!u && a.trabalho?.ultimo && <p className="mudo">Mais recente: {haQuanto(a.trabalho.ultimo)}.</p>}
          {(a.placar || a.vendas) && (
            <ul className="pl-placar">
              {a.vendas && <li><b>{numero(a.vendas.pessoas)}</b> {a.vendas.pessoas === 1 ? 'pessoa atendida' : 'pessoas atendidas'}, <b>{numero(a.vendas.responderam)}</b> {a.vendas.responderam === 1 ? 'respondeu' : 'responderam'}, <b>{numero(a.vendas.compraram)}</b> {a.vendas.compraram === 1 ? 'comprou' : 'compraram'}{a.vendas.pouco ? '. Ainda é cedo para comparar.' : ''}</li>}
              {a.placar && <li><b>{numero(a.placar.feitas_por_ele)}</b> {a.placar.feitas_por_ele === 1 ? 'proposta' : 'propostas'}, <b>{numero(a.placar.aprovadas)}</b> {a.placar.aprovadas === 1 ? 'aprovada' : 'aprovadas'}, <b>{numero(a.placar.com_resultado)}</b> com resultado</li>}
            </ul>
          )}

          {estado !== 'planejado' && (
            <>
              <h3>Consumo de IA</h3>
              {c ? (
                <>
                  <div className="pl-custos">
                    <div><b>{dolar(c.hoje)}</b><span>hoje</span></div>
                    <div><b>{dolar(c.d7)}</b><span>7 dias</span></div>
                    <div><b>{dolar(c.d30)}</b><span>30 dias</span></div>
                  </div>
                  <table className="pl-modelos">
                    <thead><tr><th>Modelo</th><th>Chamadas</th><th>Tokens</th><th>Custo</th></tr></thead>
                    <tbody>{c.modelos.map((m: any) => <tr key={m.modelo}><td>{m.nome}</td><td>{numero(m.chamadas_30d)}</td><td>{mil(m.tokens_entrada_30d + m.tokens_saida_30d)}</td><td>{dolar(m.custo_30d)}</td></tr>)}</tbody>
                  </table>
                  <p className="mudo pl-nota">Chamadas, tokens e custo dos últimos 30 dias.</p>
                </>
              ) : <p className="mudo">{(det?.onde || a.onde) === 'computador' ? 'Roda no computador, pelo seu plano do Claude: não gasta API.' : 'Nenhuma chamada de IA paga nos últimos 30 dias.'}</p>}
            </>
          )}

          <h3>Carreira</h3>
          {!det && <p className="mudo">Carregando.</p>}
          {det && estado === 'planejado' && !det.historico?.length && <p className="mudo">{det.controla ? 'Vaga aberta. O trabalho deste agente já está pronto no sistema: ele começa quando você contratar.' : 'Vaga aberta. Este agente ainda não foi construído: ele é admitido sozinho no primeiro turno de trabalho.'}</p>}
          {det?.historico?.length > 0 && (
            <ol className="pl-carreira">
              {det.historico.map((h: any) => (
                <li key={h.id} className={`pl-c-${h.tipo}`}>
                  <b>{nomes.carreira[h.tipo] || h.tipo}</b>
                  {(h.tipo === 'promovido' || h.tipo === 'rebaixado') && h.de && h.para ? `: de ${h.de} para ${h.para}` : ''}
                  <span className="mudo"> · {dataHora(h.criado_em)}{h.por_nome ? ` · ${h.por_nome}` : ''}</span>
                  {h.motivo && <p>{h.motivo}</p>}
                </li>
              ))}
            </ol>
          )}

          {acoes.length > 0 && !acao && (
            <div className="pl-acoes">
              {acoes.map((x) => <button key={x.rotulo} type="button" className={`bt bt-mini ${x.perigo ? 'bt-texto bt-perigo' : 'bt-tingido'}`} onClick={() => { setAcao(x); setMotivo(''); }}>{x.icone}{x.rotulo}</button>)}
            </div>
          )}
          {acao && (
            <div className="pl-motivo">
              <label htmlFor="pl-motivo">{acao.rotulo}: por quê? Uma frase, de preferência com o número que justifica.</label>
              <textarea id="pl-motivo" rows={2} maxLength={400} value={motivo} onChange={(e) => setMotivo(e.target.value)} autoFocus />
              <div className="pl-acoes">
                <button type="button" className="bt bt-mini bt-tinta" disabled={salvando || motivo.trim().length < 3} onClick={confirmar}>{salvando ? 'Salvando' : `Confirmar: ${acao.rotulo.toLowerCase()}`}</button>
                <button type="button" className="bt bt-mini bt-texto" onClick={() => setAcao(null)}>Cancelar</button>
              </div>
            </div>
          )}
          {det && podeEditar && det.controla && <p className="mudo pl-nota">{det.controla}</p>}
          {det && podeEditar && !det.controla && (estado === 'ativo' || estado === 'pausado') && <p className="mudo pl-nota">{det.sem_controle || 'Pausar e demitir não valem por aqui para este agente.'} Promover e rebaixar valem.</p>}

          {det?.propostas?.length > 0 && (
            <>
              <h3>Cartões deste agente</h3>
              <ol className="pl-cartoes">
                {det.propostas.slice(0, 8).map((p: any) => (
                  <li key={p.id}>
                    <b>{p.titulo}</b> <Etiqueta cor={COR_STATUS[p.status] || 'cinza'}>{nomes.status[p.status] || p.status}</Etiqueta>
                    <span className="mudo"> · {dataHora(p.criado_em)}</span>
                    {p.motivo && <p><b>Seu recado:</b> {p.motivo}</p>}
                    {p.resultado && <p><b>Resultado:</b> {p.resultado}</p>}
                  </li>
                ))}
              </ol>
              {det.le_recado && <p className="mudo pl-nota">Este agente lê o seu recado e o resultado antes de propor de novo. O recado se escreve no cartão, na mesa, na hora de aprovar, deixar para depois ou descartar.</p>}
            </>
          )}

          {det?.turnos?.length > 0 && (
            <>
              <h3>Últimos turnos</h3>
              <ol className="pl-turnos">{det.turnos.slice(0, 8).map((t: any) => <li key={t.id}><span className="mudo">{dataHora(t.inicio)} · {NOME_TURNO[t.status] || t.status}{Number(t.custo_usd) > 0 ? ` · ${dolar(t.custo_usd)}` : ''}</span> <Tarefa t={t.tarefa} />{t.resumo ? ` ${t.resumo}` : ''}</li>)}</ol>
            </>
          )}
          {det && (
            <>
              <h3>Caderno</h3>
              {det.caderno ? <p className="esc-caderno">{det.caderno}</p> : <p className="mudo">Em branco. As lições deste agente aparecem aqui.</p>}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
