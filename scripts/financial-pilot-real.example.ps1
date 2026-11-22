# Configuration only. Dot-source this from PowerShell. The previous budget path; never use a new folder to reset the cup.
param(
    [Parameter(Mandatory)]
    [string]$BudgetDirectory,

    [string]$DataDirectory = (Join-Path $env:LOCALAPPDATA 'AutoSportingAI\financial-pilot.local')
)

foreach ($directory in @($BudgetDirectory, $DataDirectory)) {
    if (-not [System.IO.Path]::IsPathFullyQualified($directory)) {
        throw 'Usá rutas absolutas para el presupuesto y los datos del piloto.'
    }
}

if (-not (Test-Path -LiteralPath $BudgetDirectory -PathType Container)) {
    throw 'El directorio de presupuesto debe existir. Reutilizá el registro anterior si ya fue configurado.'
}

$env:AUTOSPORTING_FINANCIAL_AI_BUDGET_DIR = (Resolve-Path -LiteralPath $BudgetDirectory).Path
$env:AUTOSPORTING_FINANCIAL_AI_MODEL = 'gpt-5.4-mini-2026-03-17'
$env:FINANCIAL_PILOT_AI_MODE = 'real'
$env:FINANCIAL_PILOT_CHAT = '1'
$env:FINANCIAL_PILOT_STORAGE = 'persistent'
$env:FINANCIAL_PILOT_DATA_DIR = $DataDirectory
