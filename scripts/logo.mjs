// Gera os tamanhos da logo a partir de public/img/logo-setup.png (1024 px, sem fundo):
// logo-setup-128.png (topos e e-mails), aluno/public/logo.png (app do aluno), favicon.png e favicon.svg (o PNG dentro), e os ícones do app do aluno
// (fundo escuro, porque o iPhone não aceita transparência: icone-180, icone-192, icone-512 e icone.svg).
// E os ícones do app "Vendas" (o painel no celular) em admin/public (fundo laranja, logo escura).
// Uso: node scripts/logo.mjs (tudo) ou node scripts/logo.mjs painel (só os ícones do painel)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { raiz } from './env.mjs';

const MESTRE = join(raiz, 'public', 'img', 'logo-setup.png');
const ff = (...a) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a]);
const tam = (n, saida) => ff('-i', MESTRE, '-vf', `scale=${n}:${n}:flags=lanczos`, '-pix_fmt', 'rgba', saida);
// ícone: fundo escuro com a logo em 62% (zona segura do ícone "maskable")
const icone = (n, saida) => {
  const m = Math.round(n * 0.62);
  ff('-f', 'lavfi', '-i', `color=c=0x09090a:s=${n}x${n}`, '-i', MESTRE, '-filter_complex', `[1]scale=${m}:${m}:flags=lanczos[l];[0][l]overlay=(W-w)/2:(H-h)/2`, '-frames:v', '1', saida);
};
// ícone do app "Vendas" (o painel instalado no celular, /admin/celular): o contrário do app do aluno, para não confundir
// na tela de início. Fundo no degradê laranja da marca e a logo em tinta escura.
const iconePainel = (n, saida) => {
  const m = Math.round(n * 0.62);
  ff('-f', 'lavfi', '-i', `gradients=s=${n}x${n}:c0=0xffb000:c1=0xff5a00:x0=0:y0=0:x1=${n}:y1=${n}:nb_colors=2:speed=0`, '-i', MESTRE,
    '-filter_complex', `[1]scale=${m}:${m}:flags=lanczos,format=rgba,colorchannelmixer=rr=0:rg=0:rb=0:gr=0:gg=0:gb=0:br=0:bg=0:bb=0[l];[0][l]overlay=(W-w)/2:(H-h)/2`, '-frames:v', '1', saida);
};
const painel = join(raiz, 'admin', 'public');
for (const n of [180, 192, 512]) iconePainel(n, join(painel, `icone-${n}.png`));
if (process.argv[2] === 'painel') { console.log('admin/public/icone-180/192/512.png prontos'); process.exit(0); }

const img = join(raiz, 'public', 'img'), aluno = join(raiz, 'aluno', 'public');
tam(128, join(img, 'logo-setup-128.png'));
tam(128, join(aluno, 'logo.png')); // o app do aluno (curso.) serve só /aluno/*
tam(96, join(img, 'favicon.png'));
for (const n of [180, 192, 512]) icone(n, join(aluno, `icone-${n}.png`));
const b64 = (f) => readFileSync(f).toString('base64');
writeFileSync(join(img, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><image width="96" height="96" href="data:image/png;base64,${b64(join(img, 'favicon.png'))}"/></svg>`);
writeFileSync(join(aluno, 'icone.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><image width="192" height="192" href="data:image/png;base64,${b64(join(aluno, 'icone-192.png'))}"/></svg>`);
console.log('logo-setup-128.png, favicon.png, favicon.svg, icone-180/192/512.png e icone.svg prontos');
