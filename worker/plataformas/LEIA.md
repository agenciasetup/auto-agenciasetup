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
  segredos: ['META_APP_ID', 'META_APP_SECRET'], // o que precisa estar no Worker (npm run segredos)
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

  // Opcionais: o motor de engajamento usa quando existem.
  recursos: { metricas: 'escopo', comentarios: 'escopo', mensagens: 'escopo' }, // função -> permissão que a conexão precisa ter
  async lerConta({ credenciais }) { return { usuario, seguidores, posts }; },
  async lerPosts({ credenciais, limite, depois }) { return { itens: [{ id_na_rede, formato, legenda, link, miniatura_url, publicado_em, curtidas, comentarios }], depois }; },
  async lerMetricas({ credenciais, post }) { return { alcance, salvos, compartilhamentos, visualizacoes }; },
  async lerComentarios({ credenciais, post_id, desde, paginas }) { return [{ id, texto, usuario, quando }]; },
  async responderComentario({ credenciais, comentario_id, texto }) {},
  async mensagemPrivada({ credenciais, comentario_id, texto }) {}, // DM para quem comentou
};
```

`credenciais.js` abre as credenciais e renova o token (fila, desempenho e "Comenta X" passam por ali). Token morto (código 190 da Meta, ou `extra.tokenMorto` no `Erro` do módulo) marca a conexão como `expirada` e o painel pede "Conectar de novo".

Rede sem `mensagemPrivada` (YouTube): o "Comenta X" manda o link na resposta pública ao comentário (`responderComentario`).

## Como a fila usa

1. O relógio (cron de 10 minutos) chama `processarFila` (`fila.js`), que pega as peças `agendado` vencidas de uma vez só (`pegar_pecas_para_publicar`, sem publicar duas vezes).
2. Para cada peça: acha o módulo pela `rede`, a conta (`conexao_id` ou a mais antiga ativa daquela rede no perfil da peça), abre as credenciais (`cripto.js`), renova se estiver perto de vencer, valida e publica.
3. Deu certo: `publicado`, com `id_na_rede` e `url_publicada`. Falhou: tenta de novo em 5, 10 e 15 minutos; na terceira vira `erro`, com o motivo.
4. Rede sem módulo pronto ou sem conta conectada: a peça vira `erro` com a explicação, sem tentar de novo.

## Perfis

A agência tem dois perfis (`worker/lib/perfis.js`): `br` (Agência Setup · Brasil, @agenciasetup, português) e `en` (Setup Agency · Inglês, @setupagency_eng). A coluna `perfil` (padrão `br`) está em `conexoes`, `pecas`, `gatilhos` e `posts_redes`.

- **Conectar:** `POST /api/admin/redes/:id/conectar { perfil }` põe o perfil no state assinado; `retornoConexao` grava na conta nova. Conta que já existia continua no perfil dela (mudar é `mudarPerfilConexao`, em Redes).
- **Achar a conta:** `contaAtiva(env, rede, perfil = 'br')` (a mais antiga ativa daquele perfil) e `contaPorId(env, rede, conta_id)` (aviso da Meta: `entry.id`). Nunca pegue "qualquer conta da rede".
- **Fila:** `contaDaPeca` usa `conexao_id` (se for do mesmo perfil da peça) ou `contaAtiva(rede, peca.perfil)`. Sem conta: "Nenhuma conta de X conectada no perfil Y".
- **Posts importados:** `posts_redes.perfil` é o da conta (`fila.js` e `lib/desempenho.js`). Desempenho e resultados são de um perfil por vez.
- **Comenta X:** a palavra é de um perfil; relógio e aviso da Meta usam só a conta e os posts daquele perfil, e o idioma das mensagens é o do perfil.
- Módulo novo não precisa saber de perfil: o contrato acima não muda.

## Credenciais

Ficam em `conexoes.credenciais`, cifradas com AES-GCM (`CRIPTO_CHAVE`). Nunca voltam para o painel nem para o Claude.
