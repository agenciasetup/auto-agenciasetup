// Campanha com data (pedido do dono, 06/11/2026: a ancoragem de Black Friday do mini curso sai sozinha depois de 30/11).
// O que está em `campanha` vale até `campanha.ate` e depois some, sem ninguém mexer; o resto continua igual.
// - Na oferta (`checkout.campanha`): `preco_de_centavos` (o "de R$ 97") e qualquer texto do checkout (ex.: subtitulo).
// - No bloco da landing page (`bloco.campanha`): qualquer campo do bloco (selo, brasas, mostrar_de, contador, olho...).
// Ex.: { tipo: 'heroi', titulo, campanha: { ate: '2026-11-30T23:59:59-03:00', selo: 'Oferta de Black Friday', brasas: true } }.

export const campanhaAtiva = (c, agora = Date.now()) => !!(c && typeof c === 'object' && Date.parse(c.ate) > agora);

export function comCampanha(oferta, agora = Date.now()) {
  const c = oferta && oferta.checkout && oferta.checkout.campanha;
  if (!campanhaAtiva(c, agora)) return oferta;
  const { ate, preco_de_centavos: de, ...textos } = c;
  return { ...oferta, ...(Number(de) > 0 ? { preco_de_centavos: Number(de) } : {}), checkout: { ...oferta.checkout, ...textos } };
}

export function blocosComCampanha(blocos, agora = Date.now()) {
  return (Array.isArray(blocos) ? blocos : []).map((b) => {
    if (!b || !b.campanha) return b;
    const { campanha, ...resto } = b;
    if (!campanhaAtiva(campanha, agora)) return resto;
    const { ate, ...campos } = campanha;
    return { ...resto, ...campos };
  });
}
