import { Paper, Tab, Tabs } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactElement, SyntheticEvent } from 'react';

export type IdentityTabItem = {
  id: string;
  label: string;
  icon: ReactElement;
};

type Props = {
  value: number;
  onChange: (_: SyntheticEvent, next: number) => void;
  tabs: IdentityTabItem[];
  'aria-label'?: string;
};

export function IdentityTabs({ value, onChange, tabs, 'aria-label': ariaLabel }: Props) {
  return (
    <Paper
      elevation={0}
      sx={{
        mb: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      <Tabs
        value={value}
        onChange={onChange}
        variant="scrollable"
        scrollButtons="auto"
        aria-label={ariaLabel ?? 'Administración de identidades'}
        sx={{
          minHeight: 48,
          px: { xs: 0.5, sm: 1 },
          '& .MuiTab-root': {
            minHeight: 48,
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            px: { xs: 1.5, sm: 2.5 },
            transition: 'color 120ms ease, background-color 120ms ease',
            '&:hover': {
              bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
            },
          },
          '& .Mui-selected': {
            color: 'primary.main',
          },
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: '3px 3px 0 0',
          },
        }}
      >
        {tabs.map((tab) => (
          <Tab key={tab.id} icon={tab.icon} iconPosition="start" label={tab.label} />
        ))}
      </Tabs>
    </Paper>
  );
}
