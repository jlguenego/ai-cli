function Invoke-DocsValidation {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$DocsDir
  )

  $validMermaid = @('flowchart','graph','sequenceDiagram','journey','erDiagram','stateDiagram')
  $issues = New-Object System.Collections.Generic.List[object]

  $files = Get-ChildItem -Path $DocsDir -Filter '*.md' -File |
    Where-Object { $_.Name -notmatch '^\.' } |
    Sort-Object Name

  foreach ($file in $files) {
    $lines = Get-Content -Path $file.FullName -Encoding UTF8

    $inFence = $false
    $fenceDelim = $null
    $fenceLang = $null

    $inMermaid = $false
    $mermaidStartLine = $null
    $mermaidFirstContentLine = $null

    for ($i = 0; $i -lt $lines.Count; $i++) {
      $line = $lines[$i]

      # Fence opening/closing: ``` or ```` etc.
      $m = [regex]::Match($line, '^(?<indent>\s*)(?<delim>`{3,})(?<lang>\S+)?\s*$')
      if ($m.Success) {
        $delim = $m.Groups['delim'].Value
        $lang = $m.Groups['lang'].Value
        $trimLine = $line.Trim()

        if (-not $inFence) {
          # Opening a fence
          $inFence = $true
          $fenceDelim = $delim
          $fenceLang = $lang

          if ($trimLine -eq '```mermaid') {
            $inMermaid = $true
            $mermaidStartLine = $i + 1
            $mermaidFirstContentLine = $null
          }
        } else {
          # Closing a fence: must match the same delimiter
          if ($delim -ne $fenceDelim) {
            $issues.Add([pscustomobject]@{
                file = $file.Name
                line = $i + 1
                type = 'markdown'
                message = "Fence de fermeture ne correspond pas à l’ouverture ('$fenceDelim' attendu, '$delim' trouvé)"
                suggestion = "Utiliser exactement '$fenceDelim' pour fermer ce bloc."
              })
          }

          if ($inMermaid) {
            # Prompt rule: mermaid fence MUST be closed with exactly ```
            if ($delim -ne '```') {
              $issues.Add([pscustomobject]@{
                  file = $file.Name
                  line = $i + 1
                  type = 'mermaid'
                  message = 'Fermeture Mermaid invalide (doit être ``` )'
                  suggestion = 'Fermer le bloc Mermaid avec une ligne contenant uniquement ```.'
                })
            }

            if (-not $mermaidFirstContentLine) {
              $issues.Add([pscustomobject]@{
                  file = $file.Name
                  line = $mermaidStartLine
                  type = 'mermaid'
                  message = 'Bloc Mermaid vide'
                  suggestion = 'Ajouter un diagramme Mermaid valide après ```mermaid.'
                })
            }

            $inMermaid = $false
            $mermaidStartLine = $null
            $mermaidFirstContentLine = $null
          }

          $inFence = $false
          $fenceDelim = $null
          $fenceLang = $null
        }

        continue
      }

      if ($inMermaid) {
        $trim = $line.Trim()
        if ($trim.Length -gt 0 -and -not $mermaidFirstContentLine) {
          $mermaidFirstContentLine = $i + 1
          $firstToken = ($trim -split '\s+')[0]
          if ($validMermaid -notcontains $firstToken) {
            $issues.Add([pscustomobject]@{
                file = $file.Name
                line = $mermaidFirstContentLine
                type = 'mermaid'
                message = "Type Mermaid invalide: '$firstToken'"
                suggestion = ('Le premier token doit être: ' + ($validMermaid -join ', '))
              })
          }
        }
      }
    }

    if ($inFence) {
      $issues.Add([pscustomobject]@{
          file = $file.Name
          line = 1
          type = 'markdown'
          message = 'Fence Markdown non fermé (bloc de code non clos)'
          suggestion = 'Vérifier que chaque bloc de code ouvert est bien fermé avec le même délimiteur.'
        })
    }

    if ($inMermaid) {
      $lineNumber = 1
      if ($mermaidStartLine) { $lineNumber = $mermaidStartLine }
      $issues.Add([pscustomobject]@{
          file = $file.Name
          line = $lineNumber
          type = 'mermaid'
          message = 'Bloc Mermaid non fermé'
          suggestion = 'Ajouter une ligne ``` pour fermer le bloc Mermaid.'
        })
    }
  }

  $now = (Get-Date).ToUniversalTime().ToString('o')
  $reportPath = Join-Path $DocsDir '.validate-report.txt'

  $header = "VALIDATION docs/*.md - $now`r`n"
  if ($issues.Count -eq 0) {
    $body = "OK: aucun problème structurel Markdown/Mermaid détecté.`r`n"
  } else {
    $body = "ERREURS: $($issues.Count) problème(s) détecté(s).`r`n`r`n"
    $body += ($issues | Sort-Object file, line | Format-Table -AutoSize file, line, type, message | Out-String)
    $body += "`r`nSuggestions:`r`n"
    $body += ($issues | Sort-Object file, line | ForEach-Object { "- $($_.file):$($_.line) [$($_.type)] $($_.suggestion)" } | Out-String)
  }

  Set-Content -Path $reportPath -Value ($header + $body) -Encoding UTF8

  # Return result object
  [pscustomobject]@{
    now = $now
    issueCount = $issues.Count
    issues = $issues
    reportPath = $reportPath
  }
}
