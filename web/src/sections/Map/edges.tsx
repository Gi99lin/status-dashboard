import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';

export function TopoEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps & { data?: { kind?: string } }) {
  const [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const kind = data?.kind || 'flow';

  return <BaseEdge path={path} className={`edge ${kind}`} />;
}
