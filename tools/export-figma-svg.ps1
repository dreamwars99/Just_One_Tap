[CmdletBinding()]
param(
    [string]$FileKey,

    [string]$RootNodeId,

    [string]$FigmaAddress,

    [switch]$IgnoreAddressNodeId,

    [string]$OutDir = "Assets/FigmaSvg",

    [string]$EnvFile = ".env",

    [ValidateSet("all", "frames")]
    [string]$Mode = "all",

    [switch]$IncludeHidden,

    [int]$BatchSize = 100
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$NonExportableTypes = @("DOCUMENT", "CANVAS")
$PathExcludedTypes = @("DOCUMENT")
$FrameTypes = @("FRAME", "COMPONENT", "COMPONENT_SET", "INSTANCE", "SECTION")

function Write-Info([string]$Message) {
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-WarnMsg([string]$Message) {
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Load-DotEnv([string]$Path) {
    if (-not (Test-Path $Path)) {
        return
    }

    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("#")) {
            return
        }

        $splitIndex = $line.IndexOf("=")
        if ($splitIndex -lt 1) {
            return
        }

        $key = $line.Substring(0, $splitIndex).Trim()
        $value = $line.Substring($splitIndex + 1).Trim()
        if (
            ($value.StartsWith("'") -and $value.EndsWith("'")) -or
            ($value.StartsWith('"') -and $value.EndsWith('"'))
        ) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

function Get-FigmaToken {
    $candidates = @(
        @($env:FIGMA_API_KEY, $env:FIGMA_TOKEN, $env:FIGMA_ACCESS_TOKEN) |
            Where-Object { $_ -and $_.Trim().Length -gt 0 }
    )

    if (-not $candidates -or $candidates.Count -eq 0) {
        throw "No token found. Set FIGMA_API_KEY (or FIGMA_TOKEN / FIGMA_ACCESS_TOKEN) in .env."
    }

    return $candidates[0].Trim().Trim("'").Trim('"')
}

function Normalize-NodeId([string]$NodeIdRaw) {
    if ([string]::IsNullOrWhiteSpace($NodeIdRaw)) {
        return $null
    }

    $decoded = [Uri]::UnescapeDataString($NodeIdRaw).Trim()
    if ($decoded -match '^\d+-\d+$') {
        return ($decoded -replace '-', ':')
    }

    return $decoded
}

function Parse-FigmaAddress([string]$Address) {
    if ([string]::IsNullOrWhiteSpace($Address)) {
        return [PSCustomObject]@{
            FileKey = $null
            NodeId = $null
        }
    }

    $fileKey = $null
    $nodeId = $null

    if ($Address -match '/(?:design|file|proto)/([^/?#]+)') {
        $fileKey = $Matches[1]
    }

    if ($Address -match '(?:\?|&)node-id=([^&#]+)') {
        $nodeId = Normalize-NodeId -NodeIdRaw $Matches[1]
    }

    return [PSCustomObject]@{
        FileKey = $fileKey
        NodeId = $nodeId
    }
}

function Invoke-FigmaJson([string]$Uri, [hashtable]$Headers) {
    $maxAttempts = 6
    for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
        try {
            return Invoke-RestMethod -Uri $Uri -Headers $Headers -Method Get -TimeoutSec 60
        }
        catch {
            $errorBody = if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { "" }
            $isRateLimited = $errorBody -match '"status"\s*:\s*429' -or $_.Exception.Message -match '\(429\)'

            if ($isRateLimited -and $attempt -lt $maxAttempts) {
                $delay = [Math]::Min([int][Math]::Pow(2, $attempt), 30)
                Write-WarnMsg "Rate limited (429). Retrying in $delay sec... ($attempt/$maxAttempts)"
                Start-Sleep -Seconds $delay
                continue
            }

            if ($errorBody) {
                throw "Figma API error: $errorBody"
            }

            throw
        }
    }

    throw "Figma API request failed after $maxAttempts attempts: $Uri"
}

function Get-Children($Node) {
    if ($Node.PSObject.Properties.Name -contains "children" -and $Node.children) {
        return @($Node.children)
    }
    return @()
}

function Sanitize-Segment([string]$Name) {
    if ([string]::IsNullOrWhiteSpace($Name)) {
        return "_unnamed"
    }

    $invalid = [System.IO.Path]::GetInvalidFileNameChars() + [char[]]@("/", "\")
    $pattern = "[" + [Regex]::Escape((-join $invalid)) + "]"
    $safe = [Regex]::Replace($Name, $pattern, "_").Trim()

    if ([string]::IsNullOrWhiteSpace($safe)) {
        return "_unnamed"
    }

    return $safe
}

function Should-ExportNode($Node, [string]$CurrentMode) {
    if ($NonExportableTypes -contains $Node.type) {
        return $false
    }

    if ($CurrentMode -eq "frames") {
        return $FrameTypes -contains $Node.type
    }

    return $true
}

function Find-NodeById($Node, [string]$TargetId) {
    if ($Node.id -eq $TargetId) {
        return $Node
    }

    foreach ($child in (Get-Children $Node)) {
        $found = Find-NodeById -Node $child -TargetId $TargetId
        if ($found) {
            return $found
        }
    }

    return $null
}

function Collect-Targets(
    $Node,
    [string[]]$Ancestors,
    [string]$CurrentMode,
    [bool]$AllowHidden,
    [System.Collections.Generic.List[object]]$Results
) {
    $isVisible = $true
    if ($Node.PSObject.Properties.Name -contains "visible" -and $Node.visible -eq $false) {
        $isVisible = $false
    }

    if (-not $AllowHidden -and -not $isVisible) {
        return
    }

    if (Should-ExportNode -Node $Node -CurrentMode $CurrentMode) {
        $Results.Add([PSCustomObject]@{
            Id = $Node.id
            Name = $Node.name
            Type = $Node.type
            Directory = ($Ancestors -join [System.IO.Path]::DirectorySeparatorChar)
            FileBase = (Sanitize-Segment $Node.name)
        })
    }

    $nextAncestors = $Ancestors
    if ($PathExcludedTypes -notcontains $Node.type) {
        $nextAncestors = $Ancestors + @(Sanitize-Segment $Node.name)
    }

    foreach ($child in (Get-Children $Node)) {
        Collect-Targets -Node $child -Ancestors $nextAncestors -CurrentMode $CurrentMode -AllowHidden $AllowHidden -Results $Results
    }
}

if ($BatchSize -lt 1 -or $BatchSize -gt 100) {
    throw "BatchSize must be 1..100."
}

Load-DotEnv -Path $EnvFile
$token = Get-FigmaToken
$headers = @{ "X-Figma-Token" = $token }

$effectiveAddress = if ($FigmaAddress) { $FigmaAddress } else { $env:FIGMA_ADDRESS }
$parsedAddress = Parse-FigmaAddress -Address $effectiveAddress
$fileKeyProvidedByUser = $PSBoundParameters.ContainsKey("FileKey")

if ([string]::IsNullOrWhiteSpace($FileKey) -and $parsedAddress.FileKey) {
    $FileKey = $parsedAddress.FileKey
    Write-Info "FileKey resolved from FIGMA_ADDRESS."
}

if (
    -not $IgnoreAddressNodeId.IsPresent -and
    -not $fileKeyProvidedByUser -and
    [string]::IsNullOrWhiteSpace($RootNodeId) -and
    $parsedAddress.NodeId
) {
    $RootNodeId = $parsedAddress.NodeId
    Write-Info "RootNodeId resolved from FIGMA_ADDRESS: $RootNodeId"
}

if ([string]::IsNullOrWhiteSpace($FileKey)) {
    throw "FileKey is required. Pass -FileKey or set FIGMA_ADDRESS in .env."
}

$rootNode = $null
if ($RootNodeId) {
    try {
        Write-Info "Loading root node tree via /nodes: $RootNodeId"
        $encodedRoot = [Uri]::EscapeDataString($RootNodeId)
        $nodeResp = Invoke-FigmaJson -Uri "https://api.figma.com/v1/files/${FileKey}/nodes?ids=$encodedRoot" -Headers $headers

        if ($nodeResp.nodes) {
            foreach ($prop in $nodeResp.nodes.PSObject.Properties) {
                if ($prop.Name -eq $RootNodeId -and $prop.Value.document) {
                    $rootNode = $prop.Value.document
                    break
                }
            }
        }

        if (-not $rootNode) {
            Write-WarnMsg "Could not resolve root from /nodes response. Falling back to full file tree."
        }
    }
    catch {
        Write-WarnMsg "Failed to load root via /nodes. Falling back to full file tree."
    }
}

if (-not $rootNode) {
    Write-Info "Loading Figma file tree..."
    $file = Invoke-FigmaJson -Uri "https://api.figma.com/v1/files/${FileKey}" -Headers $headers

    if (-not $file.document) {
        throw "Could not read document from Figma response."
    }

    $rootNode = $file.document
    if ($RootNodeId) {
        Write-Info "Finding root node: $RootNodeId"
        $foundRoot = Find-NodeById -Node $file.document -TargetId $RootNodeId
        if (-not $foundRoot) {
            throw "RootNodeId '$RootNodeId' was not found in this file."
        }
        $rootNode = $foundRoot
    }
}

$targets = New-Object "System.Collections.Generic.List[object]"
Collect-Targets -Node $rootNode -Ancestors @() -CurrentMode $Mode -AllowHidden:$IncludeHidden.IsPresent -Results $targets

if ($targets.Count -eq 0) {
    Write-WarnMsg "No export targets found."
    exit 0
}

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
Write-Info ("Export targets: {0}" -f $targets.Count)

$targetArray = $targets.ToArray()
$batches = @()
for ($i = 0; $i -lt $targetArray.Count; $i += $BatchSize) {
    $end = [Math]::Min($i + $BatchSize - 1, $targetArray.Count - 1)
    $batches += ,(@($targetArray[$i..$end]))
}
$manifest = New-Object "System.Collections.Generic.List[object]"
$downloaded = 0
$failed = 0

for ($bi = 0; $bi -lt $batches.Count; $bi++) {
    $batch = @($batches[$bi])
    Write-Info ("Requesting image URLs: batch {0}/{1}" -f ($bi + 1), $batches.Count)

    $idsParam = ($batch | ForEach-Object { [Uri]::EscapeDataString($_.Id) }) -join ","
    $imagesUrl = "https://api.figma.com/v1/images/${FileKey}?format=svg&ids=$idsParam"
    $imageResp = Invoke-FigmaJson -Uri $imagesUrl -Headers $headers

    $imageMap = @{}
    if ($imageResp.images) {
        foreach ($p in $imageResp.images.PSObject.Properties) {
            $imageMap[$p.Name] = $p.Value
        }
    }

    foreach ($item in $batch) {
        $svgUrl = $null
        if ($imageMap.ContainsKey($item.Id)) {
            $svgUrl = $imageMap[$item.Id]
        }

        $dirPath = if ([string]::IsNullOrWhiteSpace($item.Directory)) {
            $OutDir
        }
        else {
            Join-Path $OutDir $item.Directory
        }
        New-Item -ItemType Directory -Path $dirPath -Force | Out-Null

        $safeId = ($item.Id -replace ":", "-")
        $fileName = "{0}__{1}.svg" -f $item.FileBase, $safeId
        $outPath = Join-Path $dirPath $fileName
        $status = "ok"

        if ($svgUrl) {
            try {
                Invoke-WebRequest -Uri $svgUrl -OutFile $outPath -TimeoutSec 90 | Out-Null
                $downloaded++
            }
            catch {
                $failed++
                $status = "download_failed"
            }
        }
        else {
            $failed++
            $status = "not_renderable"
        }

        $manifest.Add([PSCustomObject]@{
            id = $item.Id
            name = $item.Name
            type = $item.Type
            status = $status
            path = $outPath
        })
    }
}

$manifestPath = Join-Path $OutDir "manifest.json"
$manifest | ConvertTo-Json -Depth 6 | Set-Content -Path $manifestPath -Encoding UTF8

Write-Info ("Completed. Downloaded={0}, Failed={1}" -f $downloaded, $failed)
Write-Info ("Manifest: {0}" -f $manifestPath)
