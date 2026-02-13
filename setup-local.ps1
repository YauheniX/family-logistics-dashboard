param(
  [switch]$SkipSupabaseStart
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ($null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue)) {
  $PSNativeCommandUseErrorActionPreference = $false
}

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-ProcessCapture {
  param(
    [string]$FilePath,
    [string[]]$Arguments
  )

  $stdoutPath = Join-Path $Env:TEMP ([Guid]::NewGuid().ToString() + '.out.txt')
  $stderrPath = Join-Path $Env:TEMP ([Guid]::NewGuid().ToString() + '.err.txt')

  try {
    $proc = Start-Process -FilePath $FilePath -ArgumentList $Arguments -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
    $stdout = @()
    $stderr = @()

    if (Test-Path $stdoutPath) {
      $stdout = Get-Content -Path $stdoutPath
    }

    if (Test-Path $stderrPath) {
      $stderr = Get-Content -Path $stderrPath
    }

    return @{
      ExitCode = $proc.ExitCode
      StdOut = @($stdout | ForEach-Object { $_.ToString() })
      StdErr = @($stderr | ForEach-Object { $_.ToString() })
    }
  }
  finally {
    if (Test-Path $stdoutPath) {
      Remove-Item -Path $stdoutPath -ErrorAction SilentlyContinue
    }

    if (Test-Path $stderrPath) {
      Remove-Item -Path $stderrPath -ErrorAction SilentlyContinue
    }
  }
}

function Ensure-DockerCli {
  $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
  if ($null -ne $dockerCmd) {
    return $dockerCmd.Source
  }

  $knownPath = Join-Path $Env:ProgramFiles 'Docker\Docker\resources\bin\docker.exe'
  if (Test-Path $knownPath) {
    $Env:Path = "$(Split-Path $knownPath);$Env:Path"
    return $knownPath
  }

  throw 'Docker CLI was not found. Install Docker Desktop and open a new terminal.'
}

function Ensure-DockerDaemon {
  param([string]$DockerCliPath)

  $dockerInfo = Invoke-ProcessCapture -FilePath $DockerCliPath -Arguments @('info')
  if ($dockerInfo.ExitCode -eq 0) {
    return
  }

  $desktopExe = Join-Path $Env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
  if (-not (Test-Path $desktopExe)) {
    throw 'Docker Desktop is not installed in the default location.'
  }

  Write-Step 'Starting Docker Desktop...'
  Start-Process $desktopExe | Out-Null

  Write-Step 'Waiting for Docker engine to become ready...'
  $maxAttempts = 36
  for ($i = 0; $i -lt $maxAttempts; $i++) {
    Start-Sleep -Seconds 5
    $attemptInfo = Invoke-ProcessCapture -FilePath $DockerCliPath -Arguments @('info')
    if ($attemptInfo.ExitCode -eq 0) {
      return
    }
  }

  throw 'Docker engine did not become ready in time. Open Docker Desktop and retry.'
}

function Ensure-DockerLinuxEngine {
  param([string]$DockerCliPath)

  Write-Step 'Ensuring Docker is using Linux containers...'
  $null = Invoke-ProcessCapture -FilePath $DockerCliPath -Arguments @('context', 'use', 'desktop-linux')

  Write-Step 'Waiting for Docker Linux engine (desktop-linux) to become ready...'
  $maxAttempts = 36
  for ($i = 0; $i -lt $maxAttempts; $i++) {
    $attemptInfo = Invoke-ProcessCapture -FilePath $DockerCliPath -Arguments @('--context', 'desktop-linux', 'info')
    if ($attemptInfo.ExitCode -eq 0) {
      return
    }

    Start-Sleep -Seconds 5
  }

  throw 'Docker Linux engine is not ready. In Docker Desktop, switch to Linux containers and retry.'
}

function Ensure-Npx {
  $npxCmd = Get-Command npx.cmd -ErrorAction SilentlyContinue
  $npx = Get-Command npx -ErrorAction SilentlyContinue
  if ($null -eq $npxCmd -and $null -eq $npx) {
    throw 'npx was not found. Install Node.js 18+ and retry.'
  }

  $nodeCmd = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($null -eq $nodeCmd) {
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
  }
  if ($null -eq $nodeCmd) {
    throw 'node was not found. Install Node.js 18+ and retry.'
  }

  $nodeArch = ''
  try {
    $nodeArch = (& $nodeCmd.Source -p "process.arch" 2>$null | Select-Object -First 1)
  }
  catch {
    $nodeArch = ''
  }

  $nodeArch = "$nodeArch".Trim()
  if ([string]::IsNullOrWhiteSpace($nodeArch)) {
    throw 'Could not determine Node.js architecture. Reinstall Node.js and retry.'
  }

  if ($nodeArch -eq 'ia32') {
    throw 'Supabase CLI does not support 32-bit Node.js on Windows (ia32). Install 64-bit Node.js (x64), then rerun setup-local.ps1.'
  }
}

function Ensure-SupabaseCli {
  param([string]$ProjectRoot)

  $supabaseCliPath = Join-Path $ProjectRoot 'node_modules\.bin\supabase.cmd'
  if (Test-Path $supabaseCliPath) {
    return $supabaseCliPath
  }

  Write-Step 'Supabase CLI launcher is missing. Rebuilding Supabase package...'

  $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
  $npm = Get-Command npm -ErrorAction SilentlyContinue
  if ($null -eq $npmCmd -and $null -eq $npm) {
    throw 'npm was not found. Install Node.js 18+ and retry.'
  }

  $npmExe = if ($null -ne $npmCmd) { $npmCmd.Source } else { $npm.Source }
  $output = & $npmExe rebuild supabase 2>&1
  if ($LASTEXITCODE -ne 0) {
    $details = ($output | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine
    if ([string]::IsNullOrWhiteSpace($details)) {
      throw 'Failed to rebuild Supabase CLI package. Run "npm.cmd rebuild supabase" and retry.'
    }

    throw "Failed to rebuild Supabase CLI package.$([Environment]::NewLine)$details"
  }

  if (-not (Test-Path $supabaseCliPath)) {
    throw 'Supabase CLI launcher is still missing after rebuild. Run "npm.cmd rebuild supabase" manually and retry.'
  }

  return $supabaseCliPath
}

function Invoke-SupabaseCli {
  param(
    [string]$SupabaseCliPath,
    [string[]]$Arguments,
    [string]$DockerCliPath
  )

  $maxAttempts = 3
  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    $result = Invoke-ProcessCapture -FilePath $SupabaseCliPath -Arguments $Arguments
    $allOutput = @($result.StdOut + $result.StdErr)

    if ($result.ExitCode -eq 0) {
      return @($allOutput | ForEach-Object { $_.ToString() })
    }

    $details = ($allOutput | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine
    $isDockerPipeIssue = $details -match 'dockerDesktopLinuxEngine' -or $details -match 'failed to inspect service: error during connect'

    if ($isDockerPipeIssue -and $attempt -lt $maxAttempts) {
      Write-Step 'Docker Linux engine is still initializing. Retrying...'
      Ensure-DockerLinuxEngine -DockerCliPath $DockerCliPath
      Start-Sleep -Seconds 3
      continue
    }

    $command = "supabase $($Arguments -join ' ')"
    if ([string]::IsNullOrWhiteSpace($details)) {
      throw "Supabase CLI command failed: $command"
    }

    throw "Supabase CLI command failed: $command$([Environment]::NewLine)$details"
  }
}

function Parse-EnvOutput {
  param([string[]]$Lines)

  $result = @{}
  foreach ($line in $Lines) {
    $trimmed = $line.Trim()
    if ($trimmed -match '^([A-Z0-9_]+)=(.*)$') {
      $value = $Matches[2].Trim()
      if ($value.Length -ge 2 -and $value.StartsWith('"') -and $value.EndsWith('"')) {
        $value = $value.Substring(1, $value.Length - 2)
      }

      $result[$Matches[1]] = $value
    }
  }

  return $result
}

$projectRoot = Split-Path -Parent $PSCommandPath
Push-Location $projectRoot
try {
  Write-Step 'Checking Docker CLI...'
  $dockerCli = Ensure-DockerCli

  Write-Step 'Checking Docker engine...'
  Ensure-DockerDaemon -DockerCliPath $dockerCli

  Ensure-DockerLinuxEngine -DockerCliPath $dockerCli

  Write-Step 'Checking Node/npx...'
  Ensure-Npx

  Write-Step 'Checking local Supabase CLI...'
  $supabaseCli = Ensure-SupabaseCli -ProjectRoot $projectRoot

  if (-not $SkipSupabaseStart) {
    Write-Step 'Starting local Supabase services (this can take a minute)...'
    $startOutput = Invoke-SupabaseCli -SupabaseCliPath $supabaseCli -Arguments @('start') -DockerCliPath $dockerCli
    $startOutput | Write-Output
  }

  Write-Step 'Reading local Supabase environment values...'
  $statusOutput = Invoke-SupabaseCli -SupabaseCliPath $supabaseCli -Arguments @('status', '-o', 'env') -DockerCliPath $dockerCli
  $statusOutput | Write-Output

  $envVars = Parse-EnvOutput -Lines $statusOutput
  if (-not $envVars.ContainsKey('API_URL') -or -not $envVars.ContainsKey('ANON_KEY')) {
    throw 'Could not find API_URL and ANON_KEY from supabase status output.'
  }

  $envPath = Join-Path $projectRoot '.env'
  $envContent = @(
    "VITE_SUPABASE_URL=$($envVars['API_URL'])"
    "VITE_SUPABASE_ANON_KEY=$($envVars['ANON_KEY'])"
    'VITE_SUPABASE_STORAGE_BUCKET=documents'
  )

  # Note: Write the .env file as UTF-8 without BOM for better cross-platform compatibility.
  # This is more explicit than `Set-Content -Encoding UTF8`, which typically emits a BOM.
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($envPath, ($envContent -join [Environment]::NewLine) + [Environment]::NewLine, $utf8NoBom)
  Write-Step '.env updated successfully.'

  Write-Host ''
  Write-Host 'Local setup complete.' -ForegroundColor Green
  Write-Host 'Run: npm run dev'
}
finally {
  Pop-Location
}