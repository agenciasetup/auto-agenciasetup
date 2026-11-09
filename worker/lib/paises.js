// Países do checkout para quem mora fora do Brasil: Portugal primeiro, depois os de língua portuguesa, os de fala
// hispânica e os mais comuns. ddi = código do país no telefone. "XX" = outro país (a pessoa escreve o código).
export const PAISES = [
  ['PT', 'Portugal', '351'],
  ['AO', 'Angola', '244'], ['MZ', 'Moçambique', '258'], ['CV', 'Cabo Verde', '238'], ['GW', 'Guiné-Bissau', '245'],
  ['ST', 'São Tomé e Príncipe', '239'], ['TL', 'Timor-Leste', '670'],
  ['ES', 'Espanha', '34'], ['AR', 'Argentina', '54'], ['MX', 'México', '52'], ['CO', 'Colômbia', '57'], ['CL', 'Chile', '56'],
  ['PE', 'Peru', '51'], ['UY', 'Uruguai', '598'], ['PY', 'Paraguai', '595'], ['BO', 'Bolívia', '591'], ['EC', 'Equador', '593'],
  ['VE', 'Venezuela', '58'],
  ['US', 'Estados Unidos', '1'], ['CA', 'Canadá', '1'], ['GB', 'Reino Unido', '44'], ['IE', 'Irlanda', '353'], ['FR', 'França', '33'],
  ['DE', 'Alemanha', '49'], ['IT', 'Itália', '39'], ['CH', 'Suíça', '41'], ['BE', 'Bélgica', '32'], ['NL', 'Países Baixos', '31'],
  ['LU', 'Luxemburgo', '352'], ['AT', 'Áustria', '43'], ['JP', 'Japão', '81'], ['AU', 'Austrália', '61'],
  ['XX', 'Outro país', ''],
].map(([codigo, nome, ddi]) => ({ codigo, nome, ddi }));

export const paisPorCodigo = (c) => PAISES.find((p) => p.codigo === String(c || '').toUpperCase()) || null;
