# Gera as poeirinhas do acabamento (pedido do dono, 30/10/2026: "pode colocar em um lugar ou outro umas poeirinhas").
# Saem em templates/carrossel/imagens/elementos/: poeira-01.png a poeira-16.png (grãos irregulares) e fiapo-1.png a
# fiapo-6.png (fiapos curtos). Brancos em fundo transparente: a cor vem do tema (filter no modelo.css).
# Sempre iguais (semente fixa). Quem decide onde caem é templates/carrossel/poeira.js. Uso: python templates/carrossel/ferramentas/poeira.py
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

PASTA = Path(__file__).resolve().parents[1] / 'imagens' / 'elementos'
PASTA.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(3010)
LADO = 96  # em tamanho maior do que aparece: o modelo reduz para 3 a 26 px


def salvar(alfa, nome):
    a = (np.clip(alfa, 0, 1) * 255).astype('uint8')
    rgba = np.dstack([np.full(a.shape, 255, 'uint8')] * 3 + [a])
    Image.fromarray(rgba, 'RGBA').save(PASTA / nome, optimize=True)


def grao():
    # Um caroço torto: círculo deformado por ruído, com um pedaço às vezes solto do lado.
    y, x = np.mgrid[0:LADO, 0:LADO]
    cx, cy = LADO / 2, LADO / 2
    ang = np.arctan2(y - cy, x - cx)
    raio = np.hypot(x - cx, y - cy)
    borda = np.ones_like(raio) * rng.uniform(18, 30)
    for k in (2, 3, 5, 7):
        borda += rng.uniform(1.5, 6.5) * np.sin(k * ang + rng.uniform(0, 6.28))
    ruido = gaussian_filter(rng.normal(0, 1, (LADO, LADO)), 2.2)
    ruido /= np.abs(ruido).max()
    forma = raio + ruido * 14 < borda
    if rng.random() < 0.45:
        a = rng.uniform(0, 6.28)
        d = rng.uniform(30, 38)
        forma |= np.hypot(x - cx - d * np.cos(a), y - cy - d * np.sin(a)) < rng.uniform(3, 7)
    return gaussian_filter(forma.astype('float32'), 1.1)


def fiapo():
    # Um fio curto e curvo, mais fino nas pontas.
    t = np.linspace(0, 1, 220)
    a0 = rng.uniform(0, 6.28)
    curva = rng.uniform(-2.4, 2.4)
    ang = a0 + curva * t + 0.5 * np.sin(t * rng.uniform(3, 7))
    comp = rng.uniform(58, 80)
    xs = np.cumsum(np.cos(ang)) * comp / len(t)
    ys = np.cumsum(np.sin(ang)) * comp / len(t)
    xs += LADO / 2 - xs.mean()
    ys += LADO / 2 - ys.mean()
    alfa = np.zeros((LADO, LADO), 'float32')
    y, x = np.mgrid[0:LADO, 0:LADO]
    for k in range(0, len(t), 3):
        r = 0.9 + 1.5 * np.sin(np.pi * t[k])
        alfa = np.maximum(alfa, (np.hypot(x - xs[k], y - ys[k]) < r).astype('float32'))
    return gaussian_filter(alfa, 0.7)


for i in range(1, 17):
    salvar(grao(), f'poeira-{i:02d}.png')
for i in range(1, 7):
    salvar(fiapo(), f'fiapo-{i}.png')
print(f'22 partículas em {PASTA}')
