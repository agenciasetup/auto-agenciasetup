// Tratamento pontual de imagem no computador (apagar um detalhe, ampliar, ajustar, editor com pincel).
// Atalho para scripts/tratar.py com o Python isolado de _local/tratar/venv (fora do Git). A foto não sai daqui.
// Uso: node scripts/tratar.mjs apagar <img> (--caixa x,y,w,h | --mascara m.png) [saida] [--ignorar x,y,w,h] [--redondo]
//      node scripts/tratar.mjs ampliar <img> [--escala 2] [--modelo geral|foto|x2] [--ruido 0.2] [saida]
//      node scripts/tratar.mjs ajustar <img> [--brilho N] [--contraste N] [--saturacao N] [--temperatura N] [--nitidez N] [saida]
//      node scripts/tratar.mjs profundidade <img> [saida.png] [--planos 3]   (o mapa de profundidade da foto; os planos em PNG)
//      node scripts/tratar.mjs foco <img> [--ponto x,y] [--abertura 18] [--alcance 0.08] [saida]   (desfoque de lente pela profundidade)
//      node scripts/tratar.mjs editor [img] [--clique]   (IOPaint em http://127.0.0.1:8080)
//      node scripts/tratar.mjs --modelos      (lista os modelos e as licenças)
//      node scripts/tratar.mjs --instalar     (cria o ambiente; os pesos baixam no primeiro uso)
// A saída nunca sobrescreve a entrada sem --no-lugar. PNG transparente continua transparente.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const venv = join(raiz, '_local', 'tratar', 'venv');
const windows = process.platform === 'win32';
const python = join(venv, windows ? 'Scripts/python.exe' : 'bin/python');
const script = join(raiz, 'scripts', 'tratar.py');
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
  // IOPaint 1.6.0 (Apache 2.0) sem as dependências fixas dele: o Pillow 9.5 que ele pede não existe para o
  // Python 3.12, e o gradio e o controlnet-aux só servem a telas que não usamos. As versões abaixo foram testadas.
  pip(['iopaint==1.6.0', '--no-deps']);
  pip(['diffusers==0.27.2', 'huggingface-hub==0.25.2', 'transformers==4.46.3', 'safetensors==0.8.0',
    'opencv-python==5.0.0.93', 'fastapi==0.108.0', 'uvicorn==0.54.0', 'python-multipart==0.0.32',
    'python-socketio==5.7.2', 'typer==0.27.3', 'typer-config==1.4.0', 'pydantic==2.14.1', 'rich==15.0.0',
    'loguru==0.7.3', 'yacs==0.1.8', 'piexif==1.1.3', 'omegaconf==2.4.0', 'easydict==1.13', 'einops==0.8.2',
    'pillow==12.3.0', 'numpy==2.5.2', 'tqdm==4.70.1']);
  console.log(`Pronto: ${venv}. Teste com: node scripts/tratar.mjs --modelos`);
  process.exit(0);
}

if (!existsSync(python)) {
  console.error('O ambiente do tratamento ainda não existe. Rode: node scripts/tratar.mjs --instalar');
  process.exit(1);
}
rodar(python, ['-I', script, ...args]);
