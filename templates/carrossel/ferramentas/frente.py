# Separa do recorte só a parte que encosta na lente (o cartucho e a pata, a letra de madeira), para a camada `frente`
# do modelo (por cima da régua e, sem `dentro`, saindo da moldura sobre o preto). 05/11/2026.
# Uso: python templates/carrossel/ferramentas/frente.py <recorte.png> <saida.png> x,y x,y x,y ...
#   os pontos são o contorno da parte, em frações da foto (0 a 1). A borda do polígono é macia (3 px).
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

recorte, saida, *pontos = sys.argv[1:]
im = Image.open(recorte).convert('RGBA')
w, h = im.size
poli = [(float(p.split(',')[0]) * w, float(p.split(',')[1]) * h) for p in pontos]
m = Image.new('L', (w, h), 0)
ImageDraw.Draw(m).polygon(poli, fill=255)
m = m.filter(ImageFilter.GaussianBlur(3))
a = np.minimum(np.asarray(im.getchannel('A')), np.asarray(m))
im.putalpha(Image.fromarray(a.astype(np.uint8)))
im.save(saida)
print(saida, (w, h))
