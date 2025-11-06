# Duplicate Record Feature

## Overview
The duplicate record feature allows authenticated users to create copies of existing metadata records in the EEA SDI Catalogue directly through the chatbot interface.

## Requirements
- **Authentication Required**: Users must be connected to SDI using the "Connect SDI" button
- **MCP Server**: Must have the `/records/duplicate` endpoint available (PUT request)

## Usage

### Through Chatbot
Users can ask the chatbot to duplicate records using natural language:

**Examples:**
- "Duplicate the record with UUID abc-123-def"
- "Copy record abc-123-def to group XYZ"
- "Make a copy of record abc-123-def"

### Tool Definition
The OpenAI function calling integration includes a `duplicate_record` tool with the following parameters:

**Required:**
- `metadataUuid` (string) - The UUID of the record to duplicate

**Optional:**
- `group` (string) - The target group for the duplicated record
- `isChildOfSource` (boolean) - Set the source record as parent (default: false)
- `targetUuid` (string) - Specific UUID for the new record (auto-generated if not provided)
- `hasCategoryOfSource` (boolean) - Copy categories from source (default: true)

## Implementation Details

### Backend (Flask)

**File:** `python_service/app.py`

**MCP Tool Definition** (lines 134-166):
```python
{
    "type": "function",
    "function": {
        "name": "duplicate_record",
        "description": "Duplicate a metadata record in the catalogue...",
        "parameters": {
            "type": "object",
            "properties": {
                "metadataUuid": {"type": "string", "description": "UUID of record to duplicate"},
                "group": {"type": "string", "description": "Target group (optional)"},
                "isChildOfSource": {"type": "boolean", "description": "Set as child (default: false)"},
                "targetUuid": {"type": "string", "description": "Custom UUID (optional)"},
                "hasCategoryOfSource": {"type": "boolean", "description": "Copy categories (default: true)"}
            },
            "required": ["metadataUuid"]
        }
    }
}
```

**Tool Handler** (lines 385-446):
- Validates metadataUuid parameter
- Checks SDI authentication status
- Retrieves session tokens (JSESSIONID, GNSESSIONID)
- Builds request data with all optional parameters
- Calls MCP API with PUT request
- Returns formatted success message with all applied options

**Authentication Check:**
```python
if not session.get('sdi_connected'):
    return "Error: You must be connected to SDI to duplicate records..."
```

**API Call:**
```python
duplicate_data = {"metadataUuid": metadata_uuid}
# Add optional parameters if provided
if "group" in arguments and arguments["group"]:
    duplicate_data["group"] = arguments["group"]
if "isChildOfSource" in arguments:
    duplicate_data["isChildOfSource"] = arguments["isChildOfSource"]
if "targetUuid" in arguments and arguments["targetUuid"]:
    duplicate_data["targetUuid"] = arguments["targetUuid"]
if "hasCategoryOfSource" in arguments:
    duplicate_data["hasCategoryOfSource"] = arguments["hasCategoryOfSource"]

result = call_mcp_api(
    "/records/duplicate",
    method="PUT",
    data=duplicate_data,
    auth_cookies={
        'JSESSIONID': session['sdi_jsessionid'],
        'GNSESSIONID': session['sdi_gnsessionid']
    }
)
```

### MCP API Integration

**Updated Functions:**

**`call_mcp_api()`** - Enhanced to support:
- PUT requests
- Authentication cookies
- Flexible request data

```python
def call_mcp_api(endpoint: str, method: str = 'GET',
                 data: Dict = None, auth_cookies: Dict = None):
    # Supports GET, POST, PUT with optional auth cookies
```

## Response Format

**Success (with all options):**
```
✓ Record successfully duplicated!

**Original UUID:** abc-123-def
**New UUID:** xyz-789-ghi
**Target Group:** MyGroup
**Set as child of source:** Yes
**Custom target UUID used:** xyz-789-ghi
**Categories copied:** Yes

The duplicated record is now available in the catalogue.
```

**Success (minimal):**
```
✓ Record successfully duplicated!

**Original UUID:** abc-123-def
**New UUID:** [auto-generated-uuid]

The duplicated record is now available in the catalogue.
```

**Errors:**
- "Error: metadataUuid is required to duplicate a record"
- "Error: You must be connected to SDI to duplicate records. Please use the 'Connect SDI' button to authenticate."
- "Error duplicating record: [specific error]"

## Workflow

1. **User Request**: "Duplicate record abc-123"
2. **OpenAI Processing**: Recognizes intent, calls `duplicate_record` tool
3. **Authentication Check**: Verifies SDI connection in Flask session
4. **Token Retrieval**: Gets JSESSIONID and GNSESSIONID from session
5. **MCP API Call**: PUT request to `/records/duplicate` with auth cookies
6. **Response**: Returns new UUID and confirmation message
7. **Display**: Chatbot shows formatted success message to user

## Error Handling

### Not Authenticated
If user hasn't connected to SDI:
```
Error: You must be connected to SDI to duplicate records.
Please use the 'Connect SDI' button to authenticate.
```

### Invalid UUID
```
Error: UUID is required to duplicate a record
```

### MCP API Error
```
Error duplicating record: [API error message]
```

### Network/Connection Error
```
Error executing tool duplicate_record: [exception details]
```

## Testing

### Manual Testing Steps

1. **Start Services:**
   ```bash
   # Terminal 1 - MCP Server
   cd mcp_server
   npm start

   # Terminal 2 - Flask Backend
   python python_service/app.py

   # Terminal 3 - Frontend
   npm run dev
   ```

2. **Authenticate:**
   - Click "Connect SDI" in chatbot header
   - Enter Eionet credentials
   - Verify connection status

3. **Find a Record:**
   - Ask: "Search for water quality datasets"
   - Note a UUID from results

4. **Duplicate Record:**
   - Ask: "Duplicate record [UUID]"
   - Verify success message with new UUID

5. **Verify in Catalogue:**
   - Check the new UUID exists in the catalogue
   - Verify it's a copy of the original

### API Testing

**Direct MCP API Call (basic):**
```bash
curl -X PUT http://localhost:3001/api/records/duplicate \
  -H "Content-Type: application/json" \
  -H "Cookie: JSESSIONID=xxx; GNSESSIONID=yyy" \
  -d '{"metadataUuid": "abc-123-def"}'
```

**With all options:**
```bash
curl -X PUT http://localhost:3001/api/records/duplicate \
  -H "Content-Type: application/json" \
  -H "Cookie: JSESSIONID=xxx; GNSESSIONID=yyy" \
  -d '{
    "metadataUuid": "abc-123-def",
    "group": "MyGroup",
    "isChildOfSource": true,
    "targetUuid": "custom-uuid-here",
    "hasCategoryOfSource": false
  }'
```

## Security Considerations

1. **Authentication Required**: Duplication only works for authenticated users
2. **Session Tokens**: Uses secure Flask sessions to store auth tokens
3. **Token Passing**: Tokens passed to MCP server via cookies
4. **No Token Storage**: Frontend never sees or stores tokens
5. **Permission Checks**: GeoNetwork handles user permissions server-side

## Future Enhancements

- [ ] Batch duplication (multiple records at once)
- [ ] Custom metadata modifications during duplication
- [ ] Duplication templates (predefined group/settings)
- [ ] Progress indicator for large records
- [ ] Preview duplicated record before confirmation
- [ ] Undo duplication feature
- [ ] Duplication history tracking
- [ ] Notification when duplication completes

## Related Documentation

- [SDI_CONNECTION.md](./SDI_CONNECTION.md) - SDI authentication setup
- MCP Server API documentation
- GeoNetwork REST API reference
