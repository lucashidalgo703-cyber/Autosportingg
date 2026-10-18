# Test de Verificación Automatizado en PowerShell: Reparto Sugerido de Tesorería Estratégica

function Simulate-SuggestedAllocation {
    param (
        [double]$liquidityARS,
        [hashtable]$commitments,
        [double]$burnRateARS,
        [int]$reserveMonths,
        [double]$personalBudgetARS,
        [double]$postventaProvisionPerVehicleARS,
        [int]$eligibleSalesCount,
        [hashtable]$surplusRule
    )

    $targetMap = @{
        operativa = @{
            targetARS = if ($commitments.ContainsKey('operativa')) { [double]$commitments.operativa } else { 0.0 }
            isConfigIncomplete = (-not $commitments.ContainsKey('operativa') -or $commitments.operativa -le 0)
        }
        impuestos = @{
            targetARS = if ($commitments.ContainsKey('impuestos')) { [double]$commitments.impuestos } else { 0.0 }
            isConfigIncomplete = (-not $commitments.ContainsKey('impuestos') -or $commitments.impuestos -le 0)
        }
        deudas = @{
            targetARS = if ($commitments.ContainsKey('deudas')) { [double]$commitments.deudas } else { 0.0 }
            isConfigIncomplete = $false
        }
        personal = @{
            targetARS = [double]$personalBudgetARS
            isConfigIncomplete = ($personalBudgetARS -le 0)
        }
        reserva = @{
            targetARS = [double]($burnRateARS * $reserveMonths)
            isConfigIncomplete = ($burnRateARS -le 0 -or $reserveMonths -le 0)
        }
        postventa = @{
            targetARS = [double]($postventaProvisionPerVehicleARS * $eligibleSalesCount)
            isConfigIncomplete = ($postventaProvisionPerVehicleARS -le 0)
        }
        stock = @{
            targetARS = 0.0
            isConfigIncomplete = (-not $surplusRule.configured)
        }
        crecimiento = @{
            targetARS = 0.0
            isConfigIncomplete = (-not $surplusRule.configured)
        }
    }

    $priorityOrder = @('operativa', 'impuestos', 'deudas', 'personal', 'postventa', 'reserva', 'stock', 'crecimiento')
    $remainingFunds = [double]$liquidityARS
    $boxResults = @{}

    foreach ($key in $priorityOrder) {
        if ($key -eq 'stock' -or $key -eq 'crecimiento') { continue }

        $meta = $targetMap[$key]
        $target = [double]$meta.targetARS
        $shortfall = $target
        $allocated = [Math]::Min($remainingFunds, $shortfall)
        $uncovered = $shortfall - $allocated
        $remainingFunds -= $allocated

        $boxResults[$key] = @{
            targetARS = $target
            suggestedAmountARS = $allocated
            uncoveredShortfallARS = $uncovered
            isConfigIncomplete = $meta.isConfigIncomplete
        }
    }

    $surplusPoolARS = [Math]::Max(0.0, $remainingFunds)
    $stockSuggested = 0.0
    $crecimientoSuggested = 0.0

    if ($surplusRule.configured -and $surplusPoolARS -gt 0) {
        $stockSuggested = [Math]::Round($surplusPoolARS * ($surplusRule.stockPercent / 100.0))
        $crecimientoSuggested = [Math]::Round($surplusPoolARS * ($surplusRule.crecimientoPercent / 100.0))
        $remainingFunds -= ($stockSuggested + $crecimientoSuggested)
    }

    $boxResults['stock'] = @{
        targetARS = $stockSuggested
        suggestedAmountARS = $stockSuggested
        uncoveredShortfallARS = 0.0
        isConfigIncomplete = (-not $surplusRule.configured)
    }

    $boxResults['crecimiento'] = @{
        targetARS = $crecimientoSuggested
        suggestedAmountARS = $crecimientoSuggested
        uncoveredShortfallARS = 0.0
        isConfigIncomplete = (-not $surplusRule.configured)
    }

    $totalDeficitARS = 0.0
    foreach ($val in $boxResults.Values) {
        $totalDeficitARS += $val.uncoveredShortfallARS
    }

    return @{
        boxResults = $boxResults
        totalDeficitARS = $totalDeficitARS
        hasDeficit = ($totalDeficitARS -gt 0)
        surplusPoolARS = $surplusPoolARS
        unassignedRemainderARS = $remainingFunds
    }
}

Write-Host "--- EJECUTANDO TEST DE REPARTO SUGERIDO DETERMINÍSTICO ---" -ForegroundColor Cyan

$common = @{
    commitments = @{
        operativa = 2500000.0
        impuestos = 1200000.0
        deudas = 800000.0
    }
    burnRateARS = 1500000.0
    reserveMonths = 2
    personalBudgetARS = 4000000.0
    postventaProvisionPerVehicleARS = 300000.0
    eligibleSalesCount = 4
}

# 1. Invarianza
$r10M = Simulate-SuggestedAllocation -liquidityARS 10000000.0 @common -surplusRule @{ configured = $false; stockPercent = 0; crecimientoPercent = 0 }
$r26M = Simulate-SuggestedAllocation -liquidityARS 26100000.0 @common -surplusRule @{ configured = $false; stockPercent = 0; crecimientoPercent = 0 }
$r50M = Simulate-SuggestedAllocation -liquidityARS 50000000.0 @common -surplusRule @{ configured = $true; stockPercent = 80; crecimientoPercent = 20 }

Write-Host "`n1. Verificando invarianza de metas ante liquidez variable (10M vs 26.1M vs 50M):" -ForegroundColor Yellow
foreach ($boxKey in @('operativa', 'impuestos', 'deudas', 'personal', 'reserva', 'postventa')) {
    $t10 = $r10M.boxResults[$boxKey].targetARS
    $t26 = $r26M.boxResults[$boxKey].targetARS
    $t50 = $r50M.boxResults[$boxKey].targetARS
    Write-Host "  - Caja [$boxKey]: Target 10M=`$$t10 | Target 26.1M=`$$t26 | Target 50M=`$$t50"
    if ($t10 -ne $t26 -or $t26 -ne $t50) {
        throw "FALLO: La meta de $boxKey vario segun la liquidez!"
    }
}
Write-Host "  => EXITO: Las metas fijas son 100% invariantes ante la liquidez." -ForegroundColor Green

# 2. Déficit con 10M
Write-Host "`n2. Verificando deficit con 10M de liquidez:" -ForegroundColor Yellow
if (-not $r10M.hasDeficit) { throw "FALLO: Debio detectar deficit" }
if ($r10M.totalDeficitARS -ne 2700000.0) { throw "FALLO: El deficit debio ser 2.700.000 ARS" }
Write-Host "  - Deficit total detectado: ARS $($r10M.totalDeficitARS)"
Write-Host "  => EXITO: Deficit detectado sin presentar estructura como cubierta." -ForegroundColor Green

# 3. Excedente con 26.1M sin regla de excedente
Write-Host "`n3. Verificando excedente con 26.1M sin regla de excedente:" -ForegroundColor Yellow
if ($r26M.boxResults['stock'].suggestedAmountARS -ne 0 -or $r26M.boxResults['crecimiento'].suggestedAmountARS -ne 0) {
    throw "FALLO: Stock o Crecimiento recibieron fondos sin tener regla configurada!"
}
if ($r26M.unassignedRemainderARS -ne (26100000.0 - 12700000.0)) {
    throw "FALLO: El excedente no quedo en cuentas sin asignar!"
}
Write-Host "  - Stock asignado: ARS $($r26M.boxResults['stock'].suggestedAmountARS)"
Write-Host "  - Crecimiento asignado: ARS $($r26M.boxResults['crecimiento'].suggestedAmountARS)"
Write-Host "  - Remanente sin asignar: ARS $($r26M.unassignedRemainderARS)"
Write-Host "  => EXITO: Eliminados porcentajes silenciosos (10%, 15%, etc.). El dinero permanece en cuentas." -ForegroundColor Green

# 4. Excedente con 50M y regla configurada 80/20
Write-Host "`n4. Verificando excedente con 50M y regla 80/20:" -ForegroundColor Yellow
$surplus = 50000000.0 - 12700000.0 # 37.3M
$expectedStock = [Math]::Round($surplus * 0.8)
$expectedCrec = [Math]::Round($surplus * 0.2)
if ($r50M.boxResults['stock'].suggestedAmountARS -ne $expectedStock) {
    throw "FALLO: Stock debio recibir $expectedStock"
}
if ($r50M.boxResults['crecimiento'].suggestedAmountARS -ne $expectedCrec) {
    throw "FALLO: Crecimiento debio recibir $expectedCrec"
}
Write-Host "  - Stock (80%): ARS $($r50M.boxResults['stock'].suggestedAmountARS)"
Write-Host "  - Crecimiento (20%): ARS $($r50M.boxResults['crecimiento'].suggestedAmountARS)"
Write-Host "  => EXITO: Regla de excedente aplicada fielmente." -ForegroundColor Green

Write-Host "`n======================================================`nTODAS LAS PRUEBAS PASARON EXITOSAMENTE CON 100% FIDELIDAD.`n======================================================`n" -ForegroundColor Green
