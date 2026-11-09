# A foto como cena de fundo. Para o assunto descer no slide, continua a parte de cima da foto (céu ou fundo liso) para cima,
# sem emenda. Nunca mexe nos lados: "odiei a forma que você expandiu o lado" (dono, 30/10/2026).
# Uso: python templates/carrossel/ferramentas/cena.py <foto> <saida.jpg> [desce_em_px_do_slide] [largura_no_slide]
# No conteúdo: fundoFoto { arq: saida, x, y: y_do_assunto - desce, w } e assunto { arq: recorte, x, y, w }.
import sys

import numpy as np
from PIL import Image, ImageFilter

orig, saida = sys.argv[1], sys.argv[2]
desce = int(sys.argv[3]) if len(sys.argv) > 3 else 0
larg = int(sys.argv[4]) if len(sys.argv) > 4 else 1100
im = Image.open(orig).convert('RGB')
w, h = im.size
extra = int(desce / larg * w)
if extra:
    a = np.array(im)
    topo = np.repeat(a[:6], (extra + 30) // 6 + 1, axis=0)[:extra + 30]
    c = Image.fromarray(np.vstack([topo, a[30:]]))
    m = Image.new('L', c.size, 0)
    m.paste(255, (0, 0, w, extra + 40))
    m = m.filter(ImageFilter.GaussianBlur(35))
    im = Image.composite(c.filter(ImageFilter.GaussianBlur(25)), c, m)
im.resize((1500, int(1500 * im.size[1] / w)), Image.LANCZOS).save(saida, quality=92)
print(saida, im.size, 'extra', extra)
