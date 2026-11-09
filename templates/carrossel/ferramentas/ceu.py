# Continua o céu da foto para cima sem levar nuvem junto (05/11/2026). O cena.py repete as primeiras linhas: com nuvem
# no alto, a nuvem vira uma faixa clara vertical. Aqui o alto vira um céu liso: a cor de cada coluna sem as nuvens,
# bem desfocada na horizontal, escurecendo um pouco para o alto, e emendada na foto com borda macia. Nunca mexe nos lados.
# Uso: python templates/carrossel/ferramentas/ceu.py <foto> <saida.jpg> <desce_em_px_do_slide> [largura_no_slide]
import sys

import numpy as np
from PIL import Image, ImageFilter

orig, saida = sys.argv[1], sys.argv[2]
desce = int(sys.argv[3])
larg = int(sys.argv[4]) if len(sys.argv) > 4 else 1100
im = Image.open(orig).convert('RGB')
w, h = im.size
extra = int(desce / larg * w)
a = np.asarray(im).astype(np.float32)
faixa = a[: max(40, h // 25)]
brilho = faixa.mean(axis=2)
ceu = brilho < np.percentile(brilho, 60)  # nuvem é o mais claro: fica de fora
cor = np.array([np.median(faixa[:, x][ceu[:, x]], axis=0) if ceu[:, x].any() else np.median(faixa.reshape(-1, 3), axis=0) for x in range(w)])
linha = Image.fromarray(np.clip(cor[None], 0, 255).astype(np.uint8)).resize((w, 1)).filter(ImageFilter.GaussianBlur(w / 12))
linha = np.asarray(linha).astype(np.float32)[0]
zona = int(h * 0.16)  # a passagem: o céu liso vai sumindo aos poucos dentro da foto (nuvem do alto não fica cortada reta)
t = np.linspace(0.86, 1.0, extra)[:, None, None]  # um pouco mais escuro no alto, como céu de verdade
topo = linha[None] * t
c = np.vstack([topo, a]) if extra else a.copy()
liso = np.repeat(linha[None], zona, axis=0)
alfa = np.linspace(1, 0, zona)[:, None, None] ** 1.6
c[extra:extra + zona] = liso * alfa + c[extra:extra + zona] * (1 - alfa)
img = Image.fromarray(np.clip(c, 0, 255).astype(np.uint8))
img.resize((1500, int(1500 * img.size[1] / w)), Image.LANCZOS).save(saida, quality=92)
print(saida, img.size, 'extra', extra)
