import { ChevronDown, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

import type { SettingSheetBlock } from '../types/live-types';

interface AddBlockMenuProps {
  options: Array<{ value: SettingSheetBlock['type']; label: string }>;
  onSelect: (type: SettingSheetBlock['type']) => void;
  buttonLabel: string;
  fullWidth?: boolean;
}

export const AddBlockMenu = ({ options, onSelect, buttonLabel, fullWidth = false }: AddBlockMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={fullWidth ? 'w-full justify-between' : 'justify-between'}>
          <span className="inline-flex items-center gap-2">
            <Plus className="size-4" />
            {buttonLabel}
          </span>
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {options.map((option) => (
          <DropdownMenuItem key={`${buttonLabel}-${option.value}`} onSelect={() => onSelect(option.value)}>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
