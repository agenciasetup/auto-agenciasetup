// A classe do despertador do Atendente (Durable Object). Só o index.js importa este arquivo: ele usa o módulo
// "cloudflare:workers", que não existe no Node. A lógica toda está em lib/despertador.js, que o ensaio testa.
// Ligação em wrangler.jsonc: durable_objects (DESPERTADOR) e migrations (new_sqlite_classes).
import { DurableObject } from 'cloudflare:workers';
import { aoDespertar, armarNoEstado } from './lib/despertador.js';
import { ESPERA_DO_ATENDENTE_MS } from './lib/atendente.js';
import { atenderODirect } from './lib/relogio.js';
import { comContador } from './nucleo/db.js';

export class Despertador extends DurableObject {
  // Chamado pelo Worker quando uma mensagem fica esperando (lib/despertador.js, armarDespertador).
  async armar(quando) {
    return armarNoEstado(this.ctx.storage, quando);
  }

  // A hora chegou: o mesmo Atendente do relógio, com o mesmo contador de chamadas externas.
  async alarm() {
    const r = await aoDespertar(this.ctx.storage, this.env, { responder: (env) => atenderODirect(comContador(env)), esperaMs: ESPERA_DO_ATENDENTE_MS });
    const feitos = r.feito && r.feito.feitos ? r.feito.feitos.join(', ') : 'ninguém na vez';
    console.log(`despertador: ${feitos}${r.proxima ? '; toca de novo' : ''}`);
  }
}
