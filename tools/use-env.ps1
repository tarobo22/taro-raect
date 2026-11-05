# Dot-source to use this PC's existing Node installation in the current terminal.
$taskNode=Join-Path $env:USERPROFILE '.cache/yeoun-tools/node-v24.22.2-win-x64'
if(Test-Path -LiteralPath (Join-Path $taskNode 'node.exe')){$env:Path=$taskNode+';'+$env:Path}
