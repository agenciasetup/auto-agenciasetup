' O sinal de vida deste computador para o Escritório de IA, sem abrir janela.
' O Agendador de Tarefas do Windows chama este arquivo de 5 em 5 minutos (tarefa "AgenciaSetup-Batimento").
' Ele só roda "node scripts\batimento.mjs windows" escondido, a partir da pasta do projeto.
' Para tirar: Agendador de Tarefas > AgenciaSetup-Batimento > Excluir.
Option Explicit
Dim fso, pasta, sh
Set fso = CreateObject("Scripting.FileSystemObject")
pasta = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = pasta
sh.Run "node scripts\batimento.mjs windows", 0, False
