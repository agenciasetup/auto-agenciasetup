"""Recorte local (tira o fundo) com BiRefNet, no computador, sem mandar a foto para fora.

Uso (o atalho acha o Python do ambiente):
  node scripts/recortar.mjs <entrada> [saida.png] [--modelo dynamic|hr-matting] [--cpu]
Direto:
  _local/recorte/venv/Scripts/python.exe -I scripts/recortar.py <entrada> [saida]

- <entrada>: uma foto (.png, .jpg, .jpeg, .webp) ou uma pasta (as fotos dela, sem subpastas).
- [saida]: o PNG (foto) ou a pasta (pasta). Sem ela: <nome>-recorte.png ao lado da foto,
  ou a subpasta "recorte" dentro da pasta.
- Sai um PNG com transparência, do MESMO tamanho da entrada, em três passos:
  1. BiRefNet acha a pessoa (padrão: dynamic, na resolução da própria foto, borda firme);
  2. matting de borda (closed-form, pymatting) só na faixa incerta: fio de cabelo e aro fino
     dos óculos saem com a espessura certa (--sem-matting pula);
  3. a cor da borda é reestimada, para não sobrar halo do fundo antigo (--sem-refino pula).
- Pesos baixados uma vez do Hugging Face do autor (revisão fixa), em _local/recorte/modelos.
- Instalar o ambiente: node scripts/recortar.mjs --instalar
"""
import argparse
import os
import sys
import time
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PASTA = RAIZ / '_local' / 'recorte'
os.environ.setdefault('HF_HOME', str(PASTA / 'modelos'))
os.environ.setdefault('HF_HUB_DISABLE_TELEMETRY', '1')
os.environ.setdefault('HF_HUB_DISABLE_SYMLINKS_WARNING', '1')
os.environ.setdefault('TRANSFORMERS_VERBOSITY', 'error')

# Todos MIT, do Hugging Face do autor (ZhengPeng7). Revisão fixa: o código que vem com o modelo não muda sozinho.
# Os dois empataram no teste de 25/10/2026 (comparação em _local/recorte/comparacao.jpg):
# dynamic tem a borda firme como a do Magnific (dedo, orelha, braço) e segura o aro fino em fundo escuro;
# hr-matting tem a borda mais macia e o cabelo mais limpo em fundo claro.
MODELOS = {
    'dynamic': dict(repo='ZhengPeng7/BiRefNet_dynamic', rev='280306042f57b7a33854319da62fd86aaa89ec4c', tam=None,
                    desc='Padrão. BiRefNet dynamic, na resolução da foto (até 2304 px): borda firme, aro fino inteiro.'),
    'hr-matting': dict(repo='ZhengPeng7/BiRefNet_HR-matting', rev='5d6b6f8adcb5b417c871b1d84ceaae9871355b7f', tam=2048,
                       desc='BiRefNet HR matting, 2048 px: borda mais macia, cabelo mais limpo em fundo claro.'),
}
PADRAO = 'dynamic'
EXTENSOES = {'.png', '.jpg', '.jpeg', '.webp'}
MEDIA = (0.485, 0.456, 0.406)
DESVIO = (0.229, 0.224, 0.225)


def carregar(nome, dispositivo):
    from transformers import AutoModelForImageSegmentation
    m = MODELOS[nome]
    modelo = AutoModelForImageSegmentation.from_pretrained(
        m['repo'], revision=m['rev'], trust_remote_code=True, low_cpu_mem_usage=False)
    modelo.to(dispositivo).eval()
    if dispositivo == 'cuda':
        modelo.half()
    return modelo


def caixa(x, r):
    """Média numa janela (2r+1) x (2r+1), com a borda tratada (soma acumulada: rápido em qualquer r)."""
    import torch

    def eixo(t, dim):
        n = t.shape[dim]
        c = torch.cumsum(t, dim=dim)
        c = torch.cat([torch.zeros_like(c.narrow(dim, 0, 1)), c], dim=dim)
        i = torch.arange(n, device=t.device)
        hi = (i + r + 1).clamp(max=n)
        lo = (i - r).clamp(min=0)
        forma = [1] * t.dim()
        forma[dim] = n
        return (c.index_select(dim, hi) - c.index_select(dim, lo)) / (hi - lo).view(forma).to(t.dtype)

    return eixo(eixo(x, -1), -2)


def cor_da_frente(img, alfa, r1=45, r2=3):
    """Reestima a cor do assunto na borda (Forte e Pitié, 'blur fusion', o mesmo do refine_foreground do BiRefNet):
    tira a cor do fundo antigo que fica no cabelo e no contorno (o halo)."""
    def passo(F, B, r):
        ba = caixa(alfa, r)
        bF = caixa(F * alfa, r) / (ba + 1e-5)
        bB = caixa(B * (1 - alfa), r) / ((1 - ba) + 1e-5)
        F = bF + alfa * (img - alfa * bF - (1 - alfa) * bB)
        return F.clamp(0, 1), bB

    F, bB = passo(img, img, r1)
    F, _ = passo(F, bB, r2)
    return F


def matting_de_borda(img, alfa):
    """Refaz o alfa só onde a rede ficou em dúvida (0,02 a 0,98, mais 1 px) com closed-form matting.
    O resto (o certo de dentro e o de fora) fica como a rede deu."""
    import numpy as np
    import torch
    import torch.nn.functional as Fn
    from pymatting import estimate_alpha_cf

    def encolhe(m):
        return ~(Fn.max_pool2d((~m).float(), 3, 1, 1) > 0)

    frente = encolhe(alfa > 0.98)
    fundo = encolhe(alfa < 0.02)
    duvida = ~(frente | fundo)
    if not duvida.any():
        return alfa
    tri = torch.full_like(alfa, 0.5)
    tri[frente] = 1
    tri[fundo] = 0
    tri = tri[0, 0].double().cpu().numpy()
    ys, xs = np.nonzero(tri == 0.5)
    y0, y1 = max(ys.min() - 4, 0), min(ys.max() + 5, tri.shape[0])
    x0, x1 = max(xs.min() - 4, 0), min(xs.max() + 5, tri.shape[1])
    rgb = img[0, :, y0:y1, x0:x1].permute(1, 2, 0).double().cpu().numpy()
    novo = estimate_alpha_cf(rgb, tri[y0:y1, x0:x1], cg_kwargs=dict(maxiter=2000))
    fim = tri.copy()
    fim[y0:y1, x0:x1] = np.clip(novo, 0, 1)
    return torch.from_numpy(fim).to(alfa.device, alfa.dtype)[None, None]


def tamanho_da_rede(nome, H, W):
    tam = MODELOS[nome]['tam']
    if tam:
        return tam, tam
    escala = min(1.0, 2304 / max(H, W))
    return max(256, round(H * escala / 32) * 32), max(256, round(W * escala / 32) * 32)


def recortar(modelo, nome, caminho, dispositivo, matting=True, refino=True):
    import numpy as np
    import torch
    import torch.nn.functional as Fn
    from PIL import Image, ImageOps

    foto = ImageOps.exif_transpose(Image.open(caminho))
    if foto.mode in ('RGBA', 'LA', 'P', 'PA'):
        foto = foto.convert('RGBA')
        foto = Image.alpha_composite(Image.new('RGBA', foto.size, (255, 255, 255, 255)), foto)
    foto = foto.convert('RGB')
    W, H = foto.size
    img = torch.from_numpy(np.asarray(foto).copy()).to(dispositivo).permute(2, 0, 1).float().div(255).unsqueeze(0)

    with torch.inference_mode():
        sh, sw = tamanho_da_rede(nome, H, W)
        x = Fn.interpolate(img, size=(sh, sw), mode='bilinear', align_corners=False, antialias=True)
        x = (x - torch.tensor(MEDIA, device=dispositivo).view(1, 3, 1, 1)) / torch.tensor(DESVIO, device=dispositivo).view(1, 3, 1, 1)
        if dispositivo == 'cuda':
            x = x.half()
        pred = modelo(x)[-1].float().sigmoid()
        alfa = Fn.interpolate(pred, size=(H, W), mode='bilinear', align_corners=False).clamp(0, 1)
        if matting:
            alfa = matting_de_borda(img, alfa)
        alfa = torch.where(alfa < 2 / 255, torch.zeros_like(alfa), alfa)  # véu quase invisível no fundo
        frente = cor_da_frente(img, alfa) if refino else img
        rgba = torch.cat([frente, alfa], dim=1)[0].permute(1, 2, 0)
        rgba = (rgba * 255).round().clamp(0, 255).byte().cpu().numpy()
    return Image.fromarray(rgba, 'RGBA'), (W, H)


def tarefas(entrada, saida):
    entrada = Path(entrada).resolve()
    if entrada.is_dir():
        fotos = sorted(p for p in entrada.iterdir() if p.is_file() and p.suffix.lower() in EXTENSOES)
        destino = Path(saida).resolve() if saida else entrada / 'recorte'
        return [(p, destino / (p.stem + '.png')) for p in fotos]
    if not entrada.is_file():
        sys.exit(f'Não achei: {entrada}')
    if saida:
        s = Path(saida).resolve()
        destino = s / (entrada.stem + '.png') if (s.is_dir() or not s.suffix) else s.with_suffix('.png')
    else:
        destino = entrada.with_name(entrada.stem + '-recorte.png')
    if destino == entrada:
        sys.exit('A saída não pode ser a própria foto.')
    return [(entrada, destino)]


def main():
    for fluxo in (sys.stdout, sys.stderr):
        fluxo.reconfigure(encoding='utf-8', errors='replace')  # acentos certos no PowerShell
    if '--modelos' in sys.argv:
        for k, v in MODELOS.items():
            print(f'{k:11} {v["desc"]}')
        return
    ap = argparse.ArgumentParser(description='Recorte local com BiRefNet (PNG transparente do mesmo tamanho).')
    ap.add_argument('entrada', help='foto ou pasta')
    ap.add_argument('saida', nargs='?', help='PNG de saída (foto) ou pasta (pasta)')
    ap.add_argument('--modelo', default=PADRAO, choices=list(MODELOS), help=f'padrão: {PADRAO} (--modelos lista)')
    ap.add_argument('--cpu', action='store_true', help='forçar a CPU (bem mais lento)')
    ap.add_argument('--sem-matting', action='store_true', help='não refazer a faixa incerta da borda')
    ap.add_argument('--sem-refino', action='store_true', help='não reestimar a cor da borda')
    a = ap.parse_args()

    import torch
    lista = tarefas(a.entrada, a.saida)
    if not lista:
        sys.exit('Nenhuma foto (.png, .jpg, .jpeg, .webp) na pasta.')
    dispositivo = 'cuda' if torch.cuda.is_available() and not a.cpu else 'cpu'
    t0 = time.perf_counter()
    modelo = carregar(a.modelo, dispositivo)
    placa = torch.cuda.get_device_name(0) if dispositivo == 'cuda' else 'CPU'
    print(f'Modelo {a.modelo} na {placa} ({time.perf_counter() - t0:.1f} s para carregar)')

    for origem, destino in lista:
        t = time.perf_counter()
        try:
            recorte, (W, H) = recortar(modelo, a.modelo, origem, dispositivo, not a.sem_matting, not a.sem_refino)
        except torch.cuda.OutOfMemoryError:
            print('A placa ficou sem memória; esta foto vai pela CPU.')
            torch.cuda.empty_cache()
            modelo = carregar(a.modelo, 'cpu')
            dispositivo = 'cpu'
            recorte, (W, H) = recortar(modelo, a.modelo, origem, dispositivo, not a.sem_matting, not a.sem_refino)
        destino.parent.mkdir(parents=True, exist_ok=True)
        recorte.save(destino, compress_level=6)
        print(f'{origem.name} -> {destino} ({W}x{H}, {time.perf_counter() - t:.1f} s)')


if __name__ == '__main__':
    main()
