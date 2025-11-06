/**
 * SDI Authentication Routes
 * Handle authentication with SDI Catalogue
 */
import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

// Extend session type to include SDI properties
declare module 'express-session' {
  interface SessionData {
    sdi_connected?: boolean;
    sdi_server?: string;
    sdi_username?: string;
    sdi_jsessionid?: string;
    sdi_gnsessionid?: string;
    sdi_user_info?: any;
  }
}

/**
 * POST /api/sdi/connect
 * Authenticate with SDI Catalogue and store session tokens
 */
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { server, username, password } = req.body;
    const sdiServer = server || 'https://galliwasp.eea.europa.eu/catalogue';

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Step 1: Sign in to get GN5 session (GNSESSIONID)
    const signinUrl = `${sdiServer}/api/user/signin`;
    const signinResponse = await axios.post(
      signinUrl,
      { username, password },
      {
        auth: { username, password },
        headers: { 'Accept': 'application/json' },
        timeout: 10000,
        maxRedirects: 5
      }
    );

    if (signinResponse.status !== 200) {
      return res.status(401).json({
        error: 'Authentication failed',
        details: signinResponse.data
      });
    }

    // Extract GNSESSIONID cookie
    let gnSessionId: string | undefined;
    const setCookieHeaders = signinResponse.headers['set-cookie'];
    if (setCookieHeaders) {
      for (const cookie of setCookieHeaders) {
        if (cookie.includes('GNSESSIONID=')) {
          gnSessionId = cookie.split('GNSESSIONID=')[1].split(';')[0];
          break;
        }
      }
    }

    // Step 2: Get GN4 session (JSESSIONID)
    const siteInfoUrl = `${sdiServer}/srv/api/site/info`;
    const siteResponse = await axios.get(siteInfoUrl, {
      auth: { username, password },
      headers: { 'Accept': 'application/json' },
      timeout: 10000
    });

    // Extract JSESSIONID cookie
    let jsSessionId: string | undefined;
    const siteSetCookieHeaders = siteResponse.headers['set-cookie'];
    if (siteSetCookieHeaders) {
      for (const cookie of siteSetCookieHeaders) {
        if (cookie.includes('JSESSIONID=')) {
          jsSessionId = cookie.split('JSESSIONID=')[1].split(';')[0];
          break;
        }
      }
    }

    if (!gnSessionId && !jsSessionId) {
      return res.status(500).json({ error: 'Failed to obtain session tokens' });
    }

    // Step 3: Get user information
    const meUrl = `${sdiServer}/srv/api/me`;
    const cookies: Record<string, string> = {};
    if (jsSessionId) cookies['JSESSIONID'] = jsSessionId;
    if (gnSessionId) cookies['GNSESSIONID'] = gnSessionId;

    let userInfo = {};
    try {
      const meResponse = await axios.get(meUrl, {
        auth: { username, password },
        headers: {
          'Accept': 'application/json',
          'Cookie': Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ')
        },
        timeout: 10000
      });
      userInfo = meResponse.data;
    } catch (error) {
      console.warn('Failed to fetch user info, continuing anyway');
    }

    // Store session data
    req.session.sdi_connected = true;
    req.session.sdi_server = sdiServer;
    req.session.sdi_username = username;
    req.session.sdi_jsessionid = jsSessionId;
    req.session.sdi_gnsessionid = gnSessionId;
    req.session.sdi_user_info = userInfo;

    // Log tokens to console
    console.log('='.repeat(60));
    console.log(`SDI Connection Successful for user: ${username}`);
    console.log(`Server: ${sdiServer}`);
    console.log(`JSESSIONID: ${jsSessionId}`);
    console.log(`GNSESSIONID: ${gnSessionId}`);
    console.log(`User: ${(userInfo as any)?.name || ''} ${(userInfo as any)?.surname || ''}`);
    console.log('='.repeat(60));

    return res.json({
      success: true,
      message: 'Connected successfully',
      user: {
        name: (userInfo as any)?.name || '',
        surname: (userInfo as any)?.surname || '',
        username: username
      },
      server: sdiServer
    });

  } catch (error: any) {
    console.error('SDI connection error:', error.message);
    return res.status(500).json({
      error: 'Network error',
      details: error.message
    });
  }
});

/**
 * POST /api/sdi/disconnect
 * Disconnect from SDI by clearing session
 */
router.post('/disconnect', (req: Request, res: Response) => {
  req.session.sdi_connected = false;
  req.session.sdi_server = undefined;
  req.session.sdi_username = undefined;
  req.session.sdi_jsessionid = undefined;
  req.session.sdi_gnsessionid = undefined;
  req.session.sdi_user_info = undefined;

  res.json({
    success: true,
    message: 'Disconnected successfully'
  });
});

/**
 * GET /api/sdi/status
 * Check SDI connection status
 */
router.get('/status', (req: Request, res: Response) => {
  if (req.session.sdi_connected) {
    const userInfo = req.session.sdi_user_info || {};
    return res.json({
      connected: true,
      server: req.session.sdi_server,
      user: {
        name: userInfo.name || '',
        surname: userInfo.surname || '',
        username: req.session.sdi_username || ''
      }
    });
  }

  res.json({ connected: false });
});

export default router;
