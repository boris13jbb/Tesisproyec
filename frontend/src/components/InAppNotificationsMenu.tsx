import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import {
  Badge,
  Box,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

type NotificationItem = {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string | null;
  resourceType: string | null;
  resourceId: string | null;
  leido: boolean;
  createdAt: string;
};

type NotificationsResponse = {
  unread: number;
  items: NotificationItem[];
};

export function InAppNotificationsMenu() {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [data, setData] = useState<NotificationsResponse | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get<NotificationsResponse>('/notifications', {
        params: { limit: 20 },
      });
      setData(res.data);
    } catch {
      setData({ unread: 0, items: [] });
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  const open = Boolean(anchor);

  const handleOpen = (e: MouseEvent<HTMLElement>) => {
    setAnchor(e.currentTarget);
    void load();
  };

  const handleClose = () => setAnchor(null);

  const handleItemClick = async (item: NotificationItem) => {
    try {
      await apiClient.patch(`/notifications/${item.id}/read`);
    } catch {
      /* ignore */
    }
    handleClose();
    if (item.resourceType === 'Documento' && item.resourceId) {
      navigate(`/documentos/${item.resourceId}`);
    }
    void load();
  };

  const markAllRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
    } catch {
      /* ignore */
    }
    void load();
  };

  return (
    <>
      <Tooltip title="Notificaciones">
        <IconButton
          color="inherit"
          onClick={handleOpen}
          aria-label="Notificaciones"
          sx={{
            border: '1px solid rgba(255,255,255,0.22)',
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.08)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.14)' },
          }}
        >
          <Badge badgeContent={data?.unread ?? 0} color="error" max={99}>
            <NotificationsNoneOutlinedIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={open}
        onClose={handleClose}
        slotProps={{ paper: { sx: { width: 360, maxWidth: '92vw' } } }}
      >
        <Box sx={{ px: 2, py: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Notificaciones
          </Typography>
          {(data?.unread ?? 0) > 0 ? (
            <Typography
              component="button"
              variant="caption"
              onClick={() => void markAllRead()}
              sx={{
                border: 0,
                background: 'none',
                cursor: 'pointer',
                color: 'primary.main',
                fontWeight: 600,
              }}
            >
              Marcar todas leídas
            </Typography>
          ) : null}
        </Box>
        <Divider />
        {!data?.items.length ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            Sin notificaciones recientes.
          </Typography>
        ) : (
          <List dense disablePadding sx={{ maxHeight: 360, overflow: 'auto' }}>
            {data.items.map((item) => (
              <ListItemButton
                key={item.id}
                onClick={() => void handleItemClick(item)}
                sx={{ alignItems: 'flex-start', opacity: item.leido ? 0.75 : 1 }}
              >
                <ListItemText
                  primary={item.titulo}
                  secondary={
                    <>
                      {item.mensaje ? (
                        <Typography component="span" variant="caption" sx={{ display: 'block' }}>
                          {item.mensaje}
                        </Typography>
                      ) : null}
                      <Typography component="span" variant="caption" color="text.disabled">
                        {new Intl.DateTimeFormat('es-EC', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }).format(new Date(item.createdAt))}
                      </Typography>
                    </>
                  }
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontWeight: item.leido ? 500 : 700,
                    },
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Menu>
    </>
  );
}
