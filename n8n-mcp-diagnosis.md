# n8n-MCP Diagnostic Report

## Issue Summary
The n8n-mcp server is not working because the configured n8n instance at `https://n8n.etrox.de` is **not accessible**.

## Root Cause
DNS resolution failure for `n8n.etrox.de`:
```
*** UnKnown can't find n8n.etrox.de: No response from server
```

All HTTP requests to the domain return 404 errors because the domain cannot be resolved.

## Current Configuration
Location: `%USERPROFILE%\.cursor\mcp.json`

```json
"n8n-mcp": {
  "command": "npx",
  "args": [
    "-y",
    "supergateway",
    "--streamableHttp",
    "https://n8n.etrox.de/mcp-server/http",
    "--header",
    "authorization:Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  ]
}
```

## Possible Causes

1. **Domain is down or no longer exists**
   - The n8n instance may have been taken offline
   - The domain may have expired or been deleted

2. **Network/DNS issues**
   - Local DNS server cannot resolve the domain
   - Firewall or network restrictions blocking access

3. **Wrong domain name**
   - Typo in the domain name
   - The n8n instance may have moved to a different domain

## Solutions

### Option 1: Verify the Correct n8n Instance URL
1. Check with your n8n administrator or team for the correct URL
2. Verify the n8n instance is running and accessible
3. Try accessing the URL in a web browser: `https://n8n.etrox.de`

### Option 2: Update the Configuration with Correct URL
Once you have the correct n8n instance URL, update the configuration:

1. Open: `%USERPROFILE%\.cursor\mcp.json`
2. Update the `n8n-mcp` section with the correct URL
3. Restart Cursor to apply changes

### Option 3: Set Up Your Own n8n Instance
If you need to set up a new n8n instance:

1. **Cloud Option**: Use n8n Cloud at https://n8n.io
2. **Self-hosted Option**: 
   ```bash
   docker run -it --rm \
     --name n8n \
     -p 5678:5678 \
     -e N8N_FEATURE_FLAG_MCP=true \
     -v ~/.n8n:/home/node/.n8n \
     docker.n8n.io/n8nio/n8n
   ```

3. **Enable MCP Access**:
   - Navigate to **Settings > Instance-level MCP**
   - Toggle **Enable MCP access**
   - Generate an MCP Access Token
   - Mark workflows as "Available in MCP"

4. **Update Configuration**:
   ```json
   "n8n-mcp": {
     "command": "npx",
     "args": [
       "-y",
       "supergateway",
       "--streamableHttp",
       "https://YOUR-N8N-DOMAIN/mcp-server/http",
       "--header",
       "authorization:Bearer YOUR_NEW_TOKEN"
     ]
   }
   ```

### Option 4: Use Local n8n Instance
If running n8n locally (e.g., on localhost:5678):

```json
"n8n-mcp": {
  "command": "npx",
  "args": [
    "-y",
    "supergateway",
    "--streamableHttp",
    "http://localhost:5678/mcp-server/http",
    "--header",
    "authorization:Bearer YOUR_TOKEN"
  ]
}
```

## Verification Steps

After updating the configuration:

1. **Test DNS resolution**:
   ```powershell
   nslookup YOUR-N8N-DOMAIN
   ```

2. **Test HTTP connectivity**:
   ```powershell
   Invoke-WebRequest -Uri "https://YOUR-N8N-DOMAIN" -Method GET
   ```

3. **Test MCP endpoint**:
   ```powershell
   $headers = @{ 
     "authorization" = "Bearer YOUR_TOKEN"
     "Content-Type" = "application/json" 
   }
   $body = '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
   Invoke-WebRequest -Uri "https://YOUR-N8N-DOMAIN/mcp-server/http" -Method POST -Headers $headers -Body $body
   ```

4. **Restart Cursor** to reload the MCP configuration

## Additional Requirements

For n8n MCP to work properly:

- ✅ n8n instance must be running and accessible
- ✅ MCP access must be enabled in n8n settings
- ✅ At least one workflow must be marked as "Available in MCP"
- ✅ The workflow must have a supported trigger (Webhook, Schedule, Chat, or Form)
- ✅ Valid MCP Access Token or OAuth2 configuration
- ✅ For self-hosted: Environment variable `N8N_FEATURE_FLAG_MCP=true`

## Next Steps

1. **Immediate**: Contact your n8n administrator to get the correct instance URL
2. **Verify**: Test the URL is accessible before updating configuration
3. **Update**: Modify the mcp.json file with correct details
4. **Restart**: Restart Cursor to apply changes
5. **Test**: Verify MCP tools are available in Cursor

## References

- [n8n MCP Documentation](https://docs.n8n.io/advanced-ai/accessing-n8n-mcp-server/)
- [n8n Cloud](https://n8n.io)
- [n8n Self-hosting Guide](https://docs.n8n.io/hosting/)
