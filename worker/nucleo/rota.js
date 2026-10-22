// Roteador mínimo da API: "GET /pecas/:id" -> função(x).
// Modelo: worker/nucleo/api/rota.js do olharondoniense.
import { Erro } from './util.js';

export function roteador(definicoes) {
  const rotas = definicoes.map(([metodo, padrao, fn]) => {
    const nomes = [];
    const re = new RegExp('^' + padrao.replace(/:([a-z_]+)/g, (_, n) => { nomes.push(n); return '([^/]+)'; }) + '/?$');
    return { metodo, re, nomes, fn };
  });
  return async (metodo, caminho, x) => {
    let achouCaminho = false;
    for (const r of rotas) {
      const m = caminho.match(r.re);
      if (!m) continue;
      achouCaminho = true;
      if (r.metodo !== metodo) continue;
      x.params = Object.fromEntries(r.nomes.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
      return r.fn(x);
    }
    throw new Erro(achouCaminho ? 405 : 404, achouCaminho ? 'Método não aceito.' : 'Endereço da API não existe.');
  };
}

export function q(x, nome, padrao = null) {
  const v = x.url.searchParams.get(nome);
  return v === null || v === '' ? padrao : v;
}

export function pagina(x, porPagina = 30) {
  const n = Math.max(1, parseInt(q(x, 'pagina', '1'), 10) || 1);
  return { limite: porPagina, offset: (n - 1) * porPagina, por_pagina: porPagina };
}
