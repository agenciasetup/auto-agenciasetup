// A conquista dos 7 dias: uma barra de 7 partes que enche uma por dia desde a compra. No último dia o cadeado abre:
// "Baixar os modelos" (o bônus) e "Solicitar certificado" (se a pessoa já fez as aulas do percentual).
// Grande no início e na página do curso; uma faixa fina em cima da aula. Os dados vêm prontos da API (conquista).
import { useState } from 'react';
import { I, useToast } from '../comum';
import { post } from '../nucleo/api';
import { Link } from '../nucleo/rota';
import { baixar } from './Ficha';
import '../conquista.css';

const emDias = (n: number) => (n <= 0 ? 'hoje' : n === 1 ? 'amanhã' : `em ${n} dias`);
const aulas = (n: number) => `${n} ${n === 1 ? 'aula' : 'aulas'}`;

function Barra({ c, fina = false }: { c: any; fina?: boolean }) {
  return (
    <ol className={`cq-barra${fina ? ' fina' : ''}${c.liberado ? ' completa' : ''}`} aria-label={c.liberado ? 'Conquista completa' : `Dia ${c.dia} de ${c.dias}`}>
      {Array.from({ length: c.dias }, (_, i) => {
        const n = i + 1;
        const estado = n < c.dia || c.liberado ? 'feito' : n === c.dia ? 'hoje' : '';
        return <li key={n} className={estado} style={{ ['--k' as any]: i }}><i /></li>;
      })}
    </ol>
  );
}

// Pede o certificado (o servidor confere o dia e as aulas de novo) e abre a página dele.
function useCertificado(c: any) {
  const toast = useToast();
  const [pedindo, setPedindo] = useState(false);
  async function pedir() {
    setPedindo(true);
    try {
      const r = await post<{ codigo: string }>(`/cursos/${c.curso.slug}/certificado`);
      toast('Seu certificado saiu!');
      location.href = `/certificado/${r.codigo}`;
    } catch (e: any) { toast(e.message); setPedindo(false); }
  }
  return { pedindo, pedir };
}

export function Conquista({ c, galeria = false }: { c: any; galeria?: boolean }) {
  const toast = useToast();
  const [baixando, setBaixando] = useState(false);
  const [aberta, setAberta] = useState(false);
  const { pedindo, pedir } = useCertificado(c);
  if (!c) return null;
  const b = c.bonus;
  const cert = c.certificado;
  const nomes = b ? b.modelos.map((m: any) => m.nome) : [];
  const titulo = c.liberado
    ? <>{b ? <>Seus <span className="serifa">modelos prontos</span> chegaram</> : <>Seu <span className="serifa">certificado</span> liberou</>}</>
    : <>Seu bônus libera <span className="serifa">{emDias(c.faltam)}</span></>;
  const sub = c.liberado
    ? (c.livre ? 'Liberado para você desde já.' : `Você chegou ao dia ${c.dias}. O cadeado abriu.`)
    : `Cada dia no curso enche uma parte. No ${c.dias}º dia abrem ${b ? `os ${b.titulo.toLowerCase()} e ` : ''}o seu certificado.`;
  return (
    <section className={`cq${c.liberado ? ' livre' : ''}`} aria-label="Sua conquista">
      <div className="cq-luz" aria-hidden="true" />
      <div className="cq-topo">
        <span className="cq-selo" aria-hidden="true"><I n={c.liberado ? 'presente' : 'cadeado'} /></span>
        <div className="cq-txt">
          <span className="cq-olho">{c.liberado ? 'Conquista completa' : <>Sua conquista · <b>Dia {c.dia}</b> de {c.dias}</>}</span>
          <h2>{titulo}</h2>
          <p>{sub}</p>
        </div>
      </div>

      <Barra c={c} />
      {!c.liberado ? (
        <div className="cq-dias" aria-hidden="true">
          {Array.from({ length: c.dias }, (_, i) => <span key={i} className={i + 1 === c.dia ? 'hoje' : ''}>{i + 1 === c.dia ? 'Hoje' : i + 1 === c.dias ? <I n="presente" /> : i + 1}</span>)}
        </div>
      ) : null}

      <div className="cq-premios">
        {b ? (
          <div className={`cq-premio${c.liberado ? '' : ' fechado'}`}>
            <button type="button" className="cq-previas" onClick={() => setAberta(!aberta)} aria-label={aberta ? 'Esconder os modelos' : 'Ver os modelos'}>
              {b.modelos.map((m: any, i: number) => m.imagens[0] ? <img key={i} src={m.imagens[0]} alt={c.liberado ? `Modelo ${m.nome}` : ''} loading="lazy" style={{ ['--k' as any]: i }} /> : null)}
              {!c.liberado ? <span className="cq-cadeado"><I n="cadeado" /></span> : null}
            </button>
            <div className="cq-premio-txt">
              <b>{b.titulo}</b>
              <small>{nomes.length} estilos editáveis: {nomes.join(', ')}. Arraste no Claude e adapte ao seu nicho.</small>
            </div>
            {c.liberado
              ? <button className="bt bt-marca bt-p" disabled={baixando || !b.arquivo_id} onClick={async () => { setBaixando(true); await baixar(b.arquivo_id, toast); setBaixando(false); }}><I n="baixar" />{baixando ? 'Preparando...' : 'Baixar os modelos'}</button>
              : <span className="cq-quando"><I n="cadeado" />Libera no dia {c.dias}</span>}
          </div>
        ) : null}
        <div className={`cq-premio cq-cert${c.liberado ? '' : ' fechado'}`}>
          <span className="cq-ic" aria-hidden="true"><I n={cert.codigo || cert.pode_pedir ? 'medalha' : 'cadeado'} /></span>
          <div className="cq-premio-txt">
            <b>Certificado</b>
            <small>{cert.codigo ? 'Pronto, com código para conferir, PDF e LinkedIn.'
              : !c.liberado ? `Libera no dia ${c.dias}${cert.faltam_aulas > 0 ? `. Até lá, faltam ${aulas(cert.faltam_aulas)}.` : '. Suas aulas já estão em dia.'}`
              : cert.faltam_aulas > 0 ? `O dia chegou. Faltam ${aulas(cert.faltam_aulas)} para pedir.` : 'Tudo pronto: é só pedir.'}</small>
          </div>
          {cert.codigo ? <a className="bt bt-p" href={`/certificado/${cert.codigo}`}><I n="medalha" />Ver o certificado</a>
            : cert.pode_pedir ? <button className={`bt ${b ? 'bt-tingido' : 'bt-marca'} bt-p`} disabled={pedindo} onClick={pedir}><I n="medalha" />{pedindo ? 'Emitindo...' : 'Solicitar certificado'}</button>
            : c.liberado ? <Link className="bt bt-p" para={`/cursos/${c.curso.slug}`}>Ver as aulas</Link> : null}
        </div>
      </div>

      {b && (galeria || aberta) ? (
        <div className="cq-galeria">
          {b.modelos.map((m: any, i: number) => (
            <figure key={i} className={c.liberado ? '' : 'fechado'}>
              <div className="cq-slides">{m.imagens.map((u: string, k: number) => <img key={k} src={u} alt={c.liberado ? `${m.nome}, slide ${k + 1}` : ''} loading="lazy" />)}</div>
              <figcaption><b>{m.nome}</b>{m.texto ? <span>{m.texto}</span> : null}</figcaption>
            </figure>
          ))}
        </div>
      ) : null}
    </section>
  );
}

// O botão da página do curso (cartão "Seu certificado"), quando o dia chegou e as aulas estão feitas.
export function BotaoCertificado({ slug }: { slug: string }) {
  const { pedindo, pedir } = useCertificado({ curso: { slug } });
  return <button className="bt bt-marca bt-p" disabled={pedindo} onClick={pedir}><I n="medalha" />{pedindo ? 'Emitindo...' : 'Solicitar certificado'}</button>;
}

// A faixa fina em cima da aula: lembra quanto falta e leva ao curso.
export function FaixaConquista({ c }: { c: any }) {
  if (!c) return null;
  const b = c.bonus;
  const texto = c.liberado
    ? (c.certificado.pode_pedir ? <><b>Liberado:</b> {b ? 'baixe os modelos e ' : ''}solicite o certificado</> : b ? <><b>Seus modelos prontos liberaram</b> · Baixar</> : <><b>Certificado liberado</b>{c.certificado.faltam_aulas > 0 ? ` · faltam ${aulas(c.certificado.faltam_aulas)}` : ''}</>)
    : <><b>Bônus {emDias(c.faltam)}</b><span className="so-pc"> · Dia {c.dia} de {c.dias}</span></>;
  if (c.liberado && c.certificado.codigo && !b) return null;
  return (
    <Link className={`cq-faixa${c.liberado ? ' livre' : ''}`} para={`/cursos/${c.curso.slug}`}>
      <I n={c.liberado ? 'presente' : 'cadeado'} />
      <span className="cq-faixa-txt">{texto}</span>
      <Barra c={c} fina />
      <I n="direita" />
    </Link>
  );
}
