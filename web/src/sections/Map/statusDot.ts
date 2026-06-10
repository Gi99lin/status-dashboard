export function statusDot(status: string | undefined) {
  const value = (status || '').toLowerCase();
  if (value.includes('run') || value.includes('online') || value.includes('up')) return 'up';
  if (value.includes('exit') || value.includes('dead') || value.includes('down')) return 'down';
  return 'warn';
}

export function vitalColor(value: number) {
  if (value < 50) return 'var(--green)';
  if (value < 80) return 'var(--yellow)';
  return 'var(--red)';
}
