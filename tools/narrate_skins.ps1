param([string]$ScriptName = 'narration.json')
Add-Type -AssemblyName System.Speech
$folder = Join-Path $PSScriptRoot '../media/three-spaces-20261107'
$voiceFolder = Join-Path $folder 'voice'
New-Item -ItemType Directory -Force -Path $voiceFolder | Out-Null
$synthesizer = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synthesizer.SelectVoice('Microsoft Heami Desktop')
$synthesizer.Rate = 0
$synthesizer.Volume = 92
try {
  foreach ($item in (Get-Content -LiteralPath (Join-Path $folder $ScriptName) -Raw -Encoding UTF8 | ConvertFrom-Json)) {
    $path = [IO.Path]::GetFullPath((Join-Path $voiceFolder ($item.id + '.wav')))
    $synthesizer.SetOutputToWaveFile($path)
    $synthesizer.Speak($item.text.Replace('AI', '에이아이'))
    $synthesizer.SetOutputToNull()
    Write-Output ($item.id + ': ' + (Get-Item -LiteralPath $path).Length + ' bytes')
  }
} finally { $synthesizer.Dispose() }
