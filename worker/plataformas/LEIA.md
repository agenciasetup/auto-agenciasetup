# Módulos das redes

Cada rede é um arquivo nesta pasta que exporta um objeto com o mesmo contrato. O resto do sistema (painel, fila, conector do Claude) só fala com esse contrato: ligar uma rede nova é preencher o arquivo dela e trocar `disponivel` para `true`.

## Contrato

```js
export default {
  id: 'instagram',                 // igual ao valor de pecas.rede e conexoes.plataforma
  nome: 'Instagram',
  cor: '#E1306C',
  formatos: ['carrossel', 'post', 'story', 'reels'],
  descricao: 'Uma frase sobre o que publica.',
  requisitos: ['O que o dono precisa ter antes de conectar'],
  segredos: ['META_APP_ID', 'META_APP_SECRET'], // o que precisa estar no Worker (wrangler secret)
  disponivel: false,               // true quando conectar e publicar estiverem prontos

  // Os quatro abaixo só existem quando disponivel = true.
  // 1. Para onde mandar a pessoa para autorizar. "estado" já vem assinado; "retorno" é /api/redes/<id>/retorno.
  async urlConectar({ env, estado, retorno }) { return 'https://...'; },
  // 2. A rede voltou com ?code=. Troca pelo token e diz qual conta é.
  async concluirConexao({ env, url, retorno }) {
    return { conta_id, conta_nome, conta_foto, credenciais: { /* tokens */ }, escopos: [], expira_em };
  },
  // 3. (opcional) Renova o token antes de vencer. Devolve { credenciais, expira_em }.
  async renovar({ env, credenciais }) {},
  // 4. Publica uma peça. Lança Erro com mensagem clara se falhar.
  async publicar({ env, peca, credenciais, conexao }) { return { id_na_rede, url_publicada }; },

  // Confere se a peça cabe na rede antes de agendar (devolve texto do problema ou null).
  validar(peca) { return null; },
};
```

## Como a fila usa

1. O relógio (cron de 10 minutos) chama `processarFila` (`fila.js`), que pega as peças `agendado` vencidas de uma vez só (`pegar_pecas_para_publicar`, sem publicar duas vezes).
2. Para cada peça: acha o módulo pela `rede`, a conta (`conexao_id` ou a primeira ativa daquela rede), abre as credenciais (`cripto.js`), renova se estiver perto de vencer, valida e publica.
3. Deu certo: `publicado`, com `id_na_rede` e `url_publicada`. Falhou: tenta de novo em 5, 10 e 15 minutos; na terceira vira `erro`, com o motivo.
4. Rede sem módulo pronto ou sem conta conectada: a peça vira `erro` com a explicação, sem tentar de novo.

## Credenciais

Ficam em `conexoes.credenciais`, cifradas com AES-GCM (`CRIPTO_CHAVE`). Nunca voltam para o painel nem para o Claude.
