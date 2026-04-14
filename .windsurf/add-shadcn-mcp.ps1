$p = 'C:\Users\Admin\.codeium\windsurf\mcp_config.json'
$cfg = Get-Content -LiteralPath $p -Raw | ConvertFrom-Json
if (-not $cfg.mcpServers.PSObject.Properties['shadcn']) {
  $cfg.mcpServers | Add-Member -NotePropertyName shadcn -NotePropertyValue ([pscustomobject]@{
    command = 'npx'
    args = @('shadcn@latest', 'mcp')
    disabled = $false
  })
}
$cfg | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $p -Encoding UTF8
