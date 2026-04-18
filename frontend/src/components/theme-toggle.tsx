import type { ComponentProps, MouseEvent } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';

type ThemeToggleProps = Omit<ComponentProps<typeof Button>, 'children'> & {
  lightLabel?: string;
  darkLabel?: string;
  showLabel?: boolean;
};

export const ThemeToggle = ({
  variant = 'outline',
  size = 'sm',
  type = 'button',
  lightLabel = 'Light',
  darkLabel = 'Dark',
  showLabel = true,
  onClick,
  ...props
}: ThemeToggleProps) => {
  const { resolvedTheme, setTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }
    setTheme(isDarkMode ? 'light' : 'dark');
  };

  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      onClick={handleClick}
      aria-label={isDarkMode ? 'ライトモードに切り替える' : 'ダークモードに切り替える'}
      {...props}
    >
      {isDarkMode ? <Sun /> : <Moon />}
      {showLabel ? <span>{isDarkMode ? lightLabel : darkLabel}</span> : null}
    </Button>
  );
};