// Links de envio de uso único (2 horas) para o bucket "midia", para o Chrome do Mac mandar direto para cá as imagens
// do Magnific da outra conta (o conector do Magnific é da conta do Windows; o navegador esconde os endereços com código).
// Uso: node scripts/links-envio.mjs <pasta> <nome1> [nome2...]   -> imprime JSON { nome: url_de_envio }
// Depois de enviado, o arquivo fica em <SUPABASE_URL>/storage/v1/object/public/midia/magnific/<pasta>/<nome>.
// O link só serve para enviar aquele arquivo (PUT); não dá acesso a mais nada.
import { env } from './env.mjs';

const [pasta, ...nomes] = process.argv.slice(2);
if (!pasta || !nomes.length) { console.log('Uso: node scripts/links-envio.mjs <pasta> <nome1> [nome2...]'); process.exit(1); }
const chave = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const saida = {};
for (const nome of nomes) {
  const caminho = `magnific/${pasta}/${nome}`;
  const r = await fetch(`${env.SUPABASE_URL}/storage/v1/object/upload/sign/midia/${caminho}`, {
    method: 'POST', headers: { Authorization: `Bearer ${chave}`, apikey: chave, 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: '{}',
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${nome}: ${r.status} ${JSON.stringify(j)}`);
  saida[nome] = `${env.SUPABASE_URL}/storage/v1${j.url}`;
}
console.log(JSON.stringify(saida));
