import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Box,
} from "@mui/material";

interface SDIConnectionDialogProps {
  open: boolean;
  onClose: () => void;
  onConnected: (userInfo: { name: string; surname: string; username: string; server: string }) => void;
}

export default function SDIConnectionDialog({
  open,
  onClose,
  onConnected,
}: SDIConnectionDialogProps) {
  const [server, setServer] = useState("https://galliwasp.eea.europa.eu/catalogue");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/sdi/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          server,
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Connection failed");
      }

      if (data.success) {
        onConnected({
          name: data.user.name,
          surname: data.user.surname,
          username: data.user.username,
          server: data.server,
        });
        onClose();
        // Clear password for security
        setPassword("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to SDI");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Connect to EEA SDI Catalogue</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TextField
            label="Server URL"
            value={server}
            onChange={(e) => setServer(e.target.value)}
            fullWidth
            disabled={loading}
            variant="outlined"
          />

          <TextField
            label="Eionet Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
            disabled={loading}
            variant="outlined"
            autoComplete="username"
          />

          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            disabled={loading}
            variant="outlined"
            autoComplete="current-password"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) {
                handleConnect();
              }
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleConnect}
          variant="contained"
          disabled={loading || !username || !password}
          style={{
            backgroundColor: loading ? undefined : "#007B6C",
          }}
        >
          {loading ? <CircularProgress size={24} /> : "Connect"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
