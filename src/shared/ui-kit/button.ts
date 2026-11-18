import { cn } from '../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'glow';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'group/btn relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-[background,box-shadow,border-color,color,transform] duration-200 active:translate-y-px';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-ac text-white shadow-[0_8px_24px_-8px_rgba(37,99,235,.7)] hover:bg-ach dark:hover:text-[#0B1220]',
  secondary: 'border border-bd2 bg-surf text-tx shadow-[var(--shadow-sm)] hover:border-acb hover:text-ach',
  ghost: 'text-tx2 hover:bg-alt hover:text-tx',
  glow:
    'bg-[linear-gradient(110deg,#1D4ED8,#2563EB_40%,#0EA5E9)] text-white shadow-[0_0_0_1px_rgba(147,197,253,.35),0_12px_40px_-10px_rgba(37,99,235,.9)] hover:shadow-[0_0_0_1px_rgba(147,197,253,.6),0_16px_50px_-10px_rgba(14,165,233,.9)]',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-13 px-6 text-base',
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra?: string): string {
  return cn(base, variants[variant], sizes[size], extra);
}
