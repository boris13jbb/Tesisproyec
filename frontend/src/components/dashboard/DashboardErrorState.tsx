import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import { Alert, Box, Button } from '@mui/material';

type Props = {
  onRetry: () => void;
  retrying?: boolean;
};

export function DashboardErrorState({ onRetry, retrying }: Props) {
  return (
    <Box sx={{ mb: 3 }}>
      <Alert
        severity="error"
        action={
          <Button
            color="inherit"
            size="small"
            startIcon={<RefreshOutlinedIcon />}
            onClick={onRetry}
            disabled={retrying}
            sx={{ fontWeight: 700 }}
          >
            Reintentar
          </Button>
        }
      >
        No fue posible cargar la información del Dashboard.
      </Alert>
    </Box>
  );
}
