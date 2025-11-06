# SDI Connection Feature

## Overview
The SDI Connection feature allows users to authenticate with the EEA SDI Catalogue (GeoNetwork) directly from the chatbot interface. Once connected, the chatbot can access authenticated resources and personalized data.

## Architecture

### Backend (Python Flask)

**Endpoints:**
- `POST /api/sdi/connect` - Authenticate with SDI
- `POST /api/sdi/disconnect` - Disconnect and clear session
- `GET /api/sdi/status` - Check current connection status

**Files Modified:**
- `python_service/app.py` - Added SDI authentication endpoints

**Authentication Flow:**
1. Accepts credentials (server URL, username, password)
2. Obtains GNSESSIONID from `/api/user/signin`
3. Obtains JSESSIONID from `/srv/api/site/info`
4. Retrieves user information from `/srv/api/me`
5. Stores session tokens in Flask session
6. Returns user info to frontend

**Session Storage:**
- `sdi_connected` - Boolean connection status
- `sdi_server` - Server URL
- `sdi_username` - Username
- `sdi_jsessionid` - GN4 session token
- `sdi_gnsessionid` - GN5 session token
- `sdi_user_info` - User profile data

### Frontend (React)

**Components:**
- `src/components/SDIConnectionDialog.tsx` - Modal dialog for authentication
- `src/modules/chatbotModule.tsx` - Integrated connection UI and state management

**Features:**
- Connection dialog with server URL, username, and password fields
- Visual connection status indicator in chatbot header
- User chip showing connected user's name
- Connect/Disconnect button
- Automatic connection status check on component mount
- Session persistence across page refreshes

## Usage

### For Users

1. **Connect to SDI:**
   - Click the "Connect SDI" button in the chatbot header
   - Enter your Eionet credentials:
     - Server URL (default: https://galliwasp.eea.europa.eu/catalogue)
     - Username
     - Password
   - Click "Connect"

2. **Connection Status:**
   - When connected, a chip displays your name in the header
   - The button changes to "Disconnect"

3. **Disconnect:**
   - Click the "Disconnect" button to log out

### For Developers

**Add SDI-authenticated requests:**

```python
# In Flask endpoints, access session tokens:
if session.get('sdi_connected'):
    js_session_id = session.get('sdi_jsessionid')
    gn_session_id = session.get('sdi_gnsessionid')
    server = session.get('sdi_server')

    # Make authenticated requests
    cookies = {
        'JSESSIONID': js_session_id,
        'GNSESSIONID': gn_session_id
    }
    response = requests.get(
        f"{server}/srv/api/some-endpoint",
        cookies=cookies
    )
```

**Frontend state:**

```typescript
// Access SDI connection state in React components:
const [sdiConnected, setSdiConnected] = useState(false);
const [sdiUserInfo, setSdiUserInfo] = useState<SDIConnectionInfo | null>(null);

// Check status
const response = await fetch('/api/sdi/status', {
  credentials: 'include'
});
const data = await response.json();
if (data.connected) {
  // User is connected
}
```

## Configuration

### Environment Variables

**Backend (.env):**
```
FLASK_SECRET_KEY=your-secret-key-here  # For session encryption
```

### Proxy Configuration

**vite.config.ts:**
```typescript
proxy: {
  '/api/sdi': {
    target: 'http://127.0.0.1:5000',
    changeOrigin: true,
  },
}
```

## Security Considerations

1. **Credentials:** Passwords are never stored - only session tokens
2. **Session Storage:** Uses Flask's encrypted session cookies
3. **HTTPS:** Always use HTTPS in production for credential transmission
4. **CORS:** Credentials mode enabled for cross-origin requests
5. **Timeouts:** Requests have 10-second timeouts to prevent hanging

## Testing

**Manual Testing:**
1. Start the Python backend: `python python_service/app.py`
2. Start the frontend: `npm run dev`
3. Open the chatbot
4. Click "Connect SDI"
5. Enter valid Eionet credentials
6. Verify connection status appears in header
7. Refresh page - connection should persist
8. Click "Disconnect"
9. Verify status clears

**API Testing:**

```bash
# Connect
curl -X POST http://localhost:5000/api/sdi/connect \
  -H "Content-Type: application/json" \
  -d '{
    "server": "https://galliwasp.eea.europa.eu/catalogue",
    "username": "your-username",
    "password": "your-password"
  }' \
  -c cookies.txt

# Check status
curl -X GET http://localhost:5000/api/sdi/status \
  -b cookies.txt

# Disconnect
curl -X POST http://localhost:5000/api/sdi/disconnect \
  -b cookies.txt
```

## Future Enhancements

- [ ] Add "Remember me" option
- [ ] Support for OAuth/SSO authentication
- [ ] Connection timeout warnings
- [ ] Automatic token refresh
- [ ] Multiple SDI server profiles
- [ ] Integration with MCP tools for authenticated queries
- [ ] User permissions and role display
- [ ] Connection status in chat context (show in system messages)
