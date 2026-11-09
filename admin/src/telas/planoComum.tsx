// Pedaços do Plano que o Início também mostra: um item de "O que fazer agora" e o cartão de uma ideia de post.
import { AlertTriangle, CalendarDays, Check, ChevronRight, Copy, Megaphone, ShoppingBag, Undo2, X } from 'lucide-react';
import { Link } from '../nucleo/roteador';
import { Etiqueta, avisar } from '../nucleo/ui';
import { EtiquetaPerfil } from './comum';

const TIPOS: Record<string, { i: any; cor: string }> = {
  alerta: { i: <AlertTriangle />, cor: 'vermelho' }, agenda: { i: <CalendarDays />, cor: 'azul' },
  vender: { i: <ShoppingBag />, cor: 'laranja' }, alcance: { i: <Megaphone />, cor: 'rosa' },
};
const OBJETIVO: Record<string, { t: string; cor: string }> = { alcance: { t: 'Alcance', cor: 'azul' }, comentarios: { t: 'Comentários', cor: 'ambar' }, venda: { t: 'Venda', cor: 'verde' } };
const FORMATO: Record<string, string> = { carrossel: 'Carrossel', frase: 'Frase', lista: 'Lista salvável' };

export function ItemAgora({ r }: { r: any }) {
  const t = TIPOS[r.tipo] || TIPOS.agenda;
  return (
    <Link para={r.para} className="plano-agora">
      <span className={`celula-icone cor-${t.cor}`}>{t.i}</span>
      <span className="plano-agora-t"><b>{r.titulo}</b><span>{r.texto}</span></span>
      <span className="plano-agora-acao">{r.acao}<ChevronRight /></span>
    </Link>
  );
}

// O texto que a pessoa cola no Claude: ele segue a skill do formato e deixa o post como rascunho.
export function pedidoDaIdeia(i: any) {
  const skill = i.formato === 'frase' ? 'frase-agenciasetup' : 'carrossel-agenciasetup';
  return [
    `Faça este post do plano para o perfil ${i.perfil === 'en' ? '@setupagency_eng (em inglês)' : '@agenciasetup'}, seguindo a skill ${skill}:`,
    `Formato: ${FORMATO[i.formato] || i.formato}`,
    `Assunto: ${i.titulo}`,
    `Gancho da capa: ${i.gancho}`,
    i.palavra ? `Comenta ${i.palavra}: entrega ${i.material || 'o material do post'}` : '',
    `Por que agora: ${i.por_que}`,
    i.dia ? `Melhor dia: ${i.dia}` : '',
    `Deixe como rascunho na fila e marque a ideia ${i.id} do plano como feita (marcar_ideia).`,
  ].filter(Boolean).join('\n');
}

export function CartaoIdeia({ i, marcar, ocupado }: { i: any; marcar?: (id: string, status: string) => void; ocupado?: boolean }) {
  const obj = OBJETIVO[i.objetivo] || OBJETIVO.alcance;
  const copiar = async () => {
    try { await navigator.clipboard.writeText(pedidoDaIdeia(i)); avisar('Pedido copiado. Cole no Claude: ele faz o post e deixa como rascunho.'); }
    catch { avisar('Não consegui copiar. Selecione o texto da ideia e copie à mão.', 'erro'); }
  };
  const aberta = i.status === 'nova';
  return (
    <article className={`plano-ideia${aberta ? '' : ' fechada'}`}>
      <div className="plano-ideia-topo">
        <Etiqueta cor={obj.cor}>{obj.t}</Etiqueta>
        <span className="mudo">{FORMATO[i.formato] || i.formato}{i.dia ? ` · ${i.dia}` : ''}</span>
        <EtiquetaPerfil perfil={i.perfil} />
      </div>
      <h3>{i.gancho}</h3>
      <p className="plano-ideia-assunto">{i.titulo}</p>
      {i.palavra && <p className="plano-ideia-palavra"><b>Comenta {i.palavra}</b>{i.material ? ` · ${i.material}` : ''}</p>}
      <p className="plano-porque">{i.por_que}</p>
      {marcar && (
        <div className="barra-acoes">
          {aberta ? <>
            <button className="bt bt-mini bt-tinta" onClick={copiar}><Copy />Copiar pedido</button>
            <button className="bt bt-mini bt-texto" disabled={ocupado} onClick={() => marcar(i.id, 'feita')}><Check />Feita</button>
            <button className="bt bt-mini bt-texto" disabled={ocupado} onClick={() => marcar(i.id, 'descartada')}><X />Descartar</button>
          </> : <button className="bt bt-mini bt-texto" disabled={ocupado} onClick={() => marcar(i.id, 'nova')}><Undo2 />Desfazer ({i.status})</button>}
        </div>
      )}
    </article>
  );
}
