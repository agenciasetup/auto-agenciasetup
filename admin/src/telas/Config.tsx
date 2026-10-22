// Configuração do site: nome, descrição, Instagram, assinatura e o AdSense.
import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { get, patch } from '../nucleo/api';
import { AreaTexto, Campo, Carregando, ErroCarga, Faixa, Grupo, Marcar, Titulo, useAcao, useCarregar } from '../nucleo/ui';

export default function Config() {
  const { dados, erro, carregando, recarregar } = useCarregar(() => get('/config'), []);
  const [site, setSite] = useState<any>(null);
  const [adsense, setAdsense] = useState<any>(null);
  const { ocupado, rodar } = useAcao();
  useEffect(() => { document.title = 'Configuração | Painel Agência Setup'; }, []);
  useEffect(() => {
    if (!dados) return;
    setSite({ ...(dados.site || {}) });
    setAdsense({ cliente: '', ativo: false, ...(dados.adsense || {}) });
  }, [dados]);

  if (erro) return <div className="tela"><ErroCarga erro={erro} tentar={recarregar} /></div>;
  if (carregando && !dados || !site || !adsense) return <div className="tela"><Carregando /></div>;

  const clienteOk = !adsense.cliente || /^ca-pub-\d+$/.test(adsense.cliente.trim());
  const salvarSite = () => rodar('site', async () => {
    await patch('/config/site', { valor: { ...site, nome: (site.nome || '').trim(), descricao: (site.descricao || '').trim(), instagram: (site.instagram || '').replace(/^@/, '').trim() } });
    recarregar();
  }, 'Configuração do site salva.');
  const salvarAdsense = () => rodar('adsense', async () => {
    if (!clienteOk) throw new Error('O código do AdSense tem o formato ca-pub- seguido de números.');
    if (adsense.ativo && !adsense.cliente) throw new Error('Para ligar, coloque o código ca-pub.');
    await patch('/config/adsense', { valor: { ...adsense, cliente: (adsense.cliente || '').trim() } });
    recarregar();
  }, adsense.ativo ? 'AdSense ligado.' : 'AdSense salvo.');

  return (
    <div className="tela tela-estreita">
      <Titulo titulo="Configuração" sub="Vale para o site inteiro. A mudança aparece em até 1 minuto." />
      <Grupo titulo="Site" acoes={<button className="bt bt-tinta bt-mini" disabled={!!ocupado} onClick={salvarSite}><Save />Salvar</button>}>
        <Campo rotulo="Nome do site" valor={site.nome} mudar={(v) => setSite({ ...site, nome: v })} />
        <AreaTexto rotulo="Descrição" valor={site.descricao} mudar={(v) => setSite({ ...site, descricao: v })} linhas={2} dica="Aparece no Google e quando o link é compartilhado." />
        <div className="linha-campos">
          <Campo rotulo="Instagram" valor={site.instagram} mudar={(v) => setSite({ ...site, instagram: v })} placeholder="agenciasetup" />
          <Campo rotulo="Assinatura" valor={site.assinatura} mudar={(v) => setSite({ ...site, assinatura: v })} placeholder="Calango | Agência Setup" />
        </div>
        <Campo rotulo="Domínio" valor={site.dominio} mudar={() => {}} desativado dica="O domínio muda no servidor, não aqui." />
      </Grupo>
      <Grupo titulo="Google AdSense" acoes={<button className="bt bt-tinta bt-mini" disabled={!!ocupado} onClick={salvarAdsense}><Save />Salvar</button>}
        rodape="Com o AdSense ligado, o site carrega o script do Google, publica o ads.txt e mostra os espaços de anúncio. Os anúncios dos nossos cursos continuam aparecendo.">
        {!clienteOk && <Faixa tipo="erro">O código tem o formato ca-pub- seguido de números (ex.: ca-pub-1234567890123456).</Faixa>}
        <Campo rotulo="Código do editor (ca-pub)" valor={adsense.cliente} mudar={(v) => setAdsense({ ...adsense, cliente: v })} mono placeholder="ca-pub-0000000000000000" />
        <Marcar rotulo="Ligado" valor={!!adsense.ativo} mudar={(v) => setAdsense({ ...adsense, ativo: v })} dica="Ligue só depois de o Google aprovar o site." />
      </Grupo>
    </div>
  );
}
