' A cópia de segurança diária do banco, sem abrir janela.
' O Agendador de Tarefas do Windows chama este arquivo uma vez por dia, de madrugada (tarefa "AgenciaSetup-Backup").
' Ele só roda "node scripts\backup.mjs" escondido, a partir da pasta do projeto, e espera terminar para devolver o
' resultado ao Agendador: 0 quando a cópia deu certo, 1 quando falhou (aparece em "Resultado da última execução").
' O que aconteceu em cada rodada fica em _backup\banco\backup.log. Como conferir e como restaurar: docs\backup.md.
' Para tirar: Agendador de Tarefas > AgenciaSetup-Backup > Excluir.
Option Explicit
Dim fso, pasta, sh, codigo
Set fso = CreateObject("Scripting.FileSystemObject")
pasta = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = pasta
codigo = sh.Run("node scripts\backup.mjs", 0, True)
WScript.Quit codigo
