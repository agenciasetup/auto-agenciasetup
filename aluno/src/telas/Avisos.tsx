// Banners, avisos e eventos ao vivo que a equipe publica (seção 6). Conta visto, clique e fechado; o evento tem
// "Me lembre" (aviso no sino antes de começar), o arquivo de agenda (.ics) e o link na hora.
import { useEffect, useState } from 'react';
import { I } from '../comum';
import { post } from '../nucleo/api';
import { useRota } from '../nucleo/rota';

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const sp = (iso: string) => new Date(new Date(iso).getTime() - 3 * 3600_000);
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
const dia = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' });

function ics(e: any) {
  const f = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const fim = e.evento_fim || new Date(new Date(e.evento_em).getTime() + 3600_000).toISOString();
  const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Agencia Setup//Cursos//PT', 'BEGIN:VEVENT', `UID:${e.id}@curso.agenciasetup.com.br`, `DTSTAMP:${f(new Date().toISOString())}`,
    `DTSTART:${f(e.evento_em)}`, `DTEND:${f(fim)}`, `SUMMARY:${String(e.titulo).replace(/[,;]/g, ' ')}`, `DESCRIPTION:${String(e.texto || '').replace(/\n/g, ' ').replace(/[,;]/g, ' ')}`,
    `URL:${location.origin}`, 'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:Começa em 15 minutos', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: 'text/calendar' }));
  a.download = 'evento-agencia-setup.ics';
  a.click();
}

export function Avisos({ dados }: { dados: any }) {
  const { ir } = useRota();
  const [fechados, setFechados] = useState<string[]>([]);
  const [lembrados, setLembrados] = useState<string[]>([]);
  const todos = dados ? [...dados.avisos, ...dados.banners, ...dados.eventos] : [];
  useEffect(() => { todos.filter((a) => a.novo).forEach((a) => post(`/avisos/${a.id}/visto`).catch(() => {})); }, [dados]);
  if (!dados) return null;
  const fechar = (a: any) => { setFechados((l) => [...l, a.id]); post(`/avisos/${a.id}/fechado`).catch(() => {}); };
  const abrir = (a: any, link?: string) => {
    post(`/avisos/${a.id}/clique`).catch(() => {});
    const destino = link || a.botao_link;
    if (!destino) return;
    if (destino.startsWith('/') && !destino.startsWith('/certificado') && !destino.startsWith('/@')) ir(destino); else window.open(destino, '_blank', 'noopener');
  };
  const lembrar = (a: any) => { setLembrados((l) => [...l, a.id]); post(`/avisos/${a.id}/lembrete`).catch(() => {}); };
  const vivos = (l: any[]) => l.filter((a) => !fechados.includes(a.id));
  const agora = Date.now();

  return (
    <>
      {vivos(dados.avisos).map((a: any) => (
        <div key={a.id} className={`faixa-aviso${a.importante ? ' importante' : ''}`} role={a.importante ? 'alert' : undefined}>
          <I n="sino" /><span><b>{a.titulo}</b>{a.texto ? ` ${a.texto}` : ''}</span>
          {a.botao_texto ? <button className="bt bt-p" onClick={() => abrir(a)}>{a.botao_texto}</button> : null}
          <button className="bt-icone" aria-label="Fechar aviso" onClick={() => fechar(a)}><I n="fechar" /></button>
        </div>
      ))}
      {vivos(dados.banners).map((a: any) => (
        <div key={a.id} className="fileira">
          <div className={`banner banner-img${a.imagem_url ? '' : ' sem-img'}`}>
            {a.imagem_url ? <img src={a.imagem_url} alt="" /> : <div className="data"><I n="brilho" /></div>}
            <div><h3>{a.titulo}</h3>{a.texto ? <p>{a.texto}</p> : null}</div>
            <div className="acoes">{a.botao_texto ? <button className="bt bt-marca bt-p" onClick={() => abrir(a)}>{a.botao_texto}</button> : null}<button className="bt bt-p" onClick={() => fechar(a)}>Agora não</button></div>
          </div>
        </div>
      ))}
      {vivos(dados.eventos).map((e: any) => {
        const ini = new Date(e.evento_em).getTime();
        const fim = e.evento_fim ? new Date(e.evento_fim).getTime() : ini + 2 * 3600_000;
        const aoVivo = agora >= ini - 10 * 60_000 && agora <= fim;
        const passou = agora > fim;
        const d = sp(e.evento_em);
        return (
          <div key={e.id} className="fileira">
            <div className="banner">
              <div className="data num"><b>{d.getUTCDate()}</b><small>{MES[d.getUTCMonth()]}</small></div>
              <div><h3>{aoVivo ? 'Ao vivo agora: ' : passou ? '' : `${dia(e.evento_em)}, ${hora(e.evento_em)}: `}{e.titulo}</h3>{e.texto ? <p>{e.texto}</p> : null}</div>
              <div className="acoes">
                {aoVivo && e.evento_link ? <button className="bt bt-marca bt-p" onClick={() => abrir(e, e.evento_link)}><I n="tocar" />Entrar ao vivo</button> : null}
                {passou && e.gravacao_aula_id ? <button className="bt bt-marca bt-p" onClick={() => abrir(e, `/aulas/${e.gravacao_aula_id}`)}><I n="tocar" />Ver a gravação</button> : null}
                {!passou && !aoVivo ? <button className="bt bt-tingido bt-p" disabled={e.lembrete || lembrados.includes(e.id)} onClick={() => lembrar(e)}><I n="sino" />{e.lembrete || lembrados.includes(e.id) ? 'Vamos te lembrar' : 'Me lembre'}</button> : null}
                {!passou ? <button className="bt bt-p" onClick={() => ics(e)}><I n="calendario" />Agenda</button> : null}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
