import { cn } from '../../lib/cn';
import type { ModelStage } from '../../types/api';

export interface StageChipProps {
  stage: ModelStage;
  className?: string;
}

export function StageChip({ stage, className }: StageChipProps) {
  const styles: Record<ModelStage, string> = {
    Production: 'bg-stage-prod-bg text-stage-prod-text',
    Staging: 'bg-stage-staging-bg text-stage-staging-text',
    Archived: 'bg-stage-archived-bg text-stage-archived-text',
  };

  return (
    <span
      className={cn(
        'inline-block rounded-sm px-[8px] py-[3px] font-sans text-[10.5px] font-bold uppercase tracking-wider leading-none shadow-sm',
        styles[stage],
        className
      )}
    >
      {stage}
    </span>
  );
}
