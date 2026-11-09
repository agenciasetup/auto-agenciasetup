// Recorte local (tira o fundo) com BiRefNet + matting de borda, no computador: a foto não sai daqui.
// Atalho para scripts/recortar.py com o Python isolado de _local/recorte/venv (fora do Git).
// Uso: node scripts/recortar.mjs <foto ou pasta> [saida.png ou pasta] [--modelo dynamic|hr-matting] [--cpu] [--sem-matting] [--sem-refino]
//      node scripts/recortar.mjs --modelos      (lista os modelos)
//      node scripts/recortar.mjs --instalar     (cria o ambiente; os pesos baixam na primeira foto, uns 450 MB)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const venv = join(raiz, '_local', 'recorte', 'venv');
const windows = process.platform === 'win32';
const python = join(venv, windows ? 'Scripts/python.exe' : 'bin/python');
const script = join(raiz, 'scripts', 'recortar.py');
const args = process.argv.slice(2);

function rodar(cmd, lista) {
  const r = spawnSync(cmd, lista, { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (args[0] === '--instalar') {
  mkdirSync(dirname(venv), { recursive: true });
  if (!existsSync(python)) rodar(windows ? 'py' : 'python3', windows ? ['-3.12', '-m', 'venv', venv] : ['-m', 'venv', venv]);
  const pip = (lista) => rodar(python, ['-I', '-m', 'pip', 'install', ...lista]);
  pip(['--upgrade', 'pip']);
  // Placa NVIDIA: torch com CUDA (o índice oficial do PyTorch). Sem placa: o torch comum (CPU, ou MPS no Mac).
  const nvidia = spawnSync('nvidia-smi', ['-L'], { stdio: 'ignore' }).status === 0;
  pip(['torch==2.11.0', 'torchvision==0.26.0', ...(nvidia ? ['--index-url', 'https://download.pytorch.org/whl/cu128'] : [])]);
  pip(['transformers==4.57.6', 'timm==1.0.30', 'kornia==0.9.0', 'einops==0.8.2', 'safetensors==0.8.0',
    'huggingface_hub==0.36.2', 'hf_xet', 'pymatting==1.1.16', 'pillow', 'numpy']);
  console.log(`Pronto: ${venv}. Teste com: node scripts/recortar.mjs <foto>`);
  process.exit(0);
}

if (!existsSync(python)) {
  console.error('O ambiente do recorte ainda não existe. Rode: node scripts/recortar.mjs --instalar');
  process.exit(1);
}
rodar(python, ['-I', script, ...args]);
