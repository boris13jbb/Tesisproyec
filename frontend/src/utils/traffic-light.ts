export type TrafficLightLevel = 'green' | 'yellow' | 'red';

export function trafficLightLabel(level: TrafficLightLevel): string {
  switch (level) {
    case 'green':
      return 'Actividad baja';
    case 'yellow':
      return 'Actividad media';
    case 'red':
      return 'Actividad alta';
    default:
      return level;
  }
}

export function trafficLightEmoji(level: TrafficLightLevel): string {
  switch (level) {
    case 'green':
      return '🟢';
    case 'yellow':
      return '🟡';
    case 'red':
      return '🔴';
    default:
      return '⚪';
  }
}

export function trafficLightColor(
  level: TrafficLightLevel,
): 'success' | 'warning' | 'error' {
  switch (level) {
    case 'green':
      return 'success';
    case 'yellow':
      return 'warning';
    case 'red':
      return 'error';
    default:
      return 'success';
  }
}
