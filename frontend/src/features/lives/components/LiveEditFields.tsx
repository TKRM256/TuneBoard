/** ライブ情報（名前・開催日・会場・締切・公開状態）の入力欄。 */
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { LIVE_STATUS_OPTIONS, type LiveFormValues, type LiveStatus } from '../types/live-types';

interface LiveEditFieldsProps {
  /** input の id が画面内で衝突しないようにする接頭辞 */
  idPrefix: string;
  formValues: LiveFormValues;
  onChange: (field: keyof LiveFormValues, value: string) => void;
}

export const LiveEditFields = ({ idPrefix, formValues, onChange }: LiveEditFieldsProps) => (
  <FieldGroup>
    <Field>
      <FieldLabel htmlFor={`name-${idPrefix}`}>ライブ名<span className="text-red-500">*</span></FieldLabel>
      <Input
        id={`name-${idPrefix}`}
        value={formValues.name.value}
        onChange={(event) => onChange('name', event.target.value)}
      />
      {formValues.name.error ? <FieldError>{formValues.name.error}</FieldError> : null}
    </Field>

    <div className="grid gap-4 md:grid-cols-2">
      <Field>
        <FieldLabel htmlFor={`date-${idPrefix}`}>開催日</FieldLabel>
        <Input
          id={`date-${idPrefix}`}
          type="date"
          value={formValues.date.value}
          onChange={(event) => onChange('date', event.target.value)}
        />
        {formValues.date.error ? <FieldError>{formValues.date.error}</FieldError> : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={`deadline-${idPrefix}`}>回答締切</FieldLabel>
        <Input
          id={`deadline-${idPrefix}`}
          type="datetime-local"
          value={formValues.deadlineAt.value}
          onChange={(event) => onChange('deadlineAt', event.target.value)}
        />
        {formValues.deadlineAt.error ? <FieldError>{formValues.deadlineAt.error}</FieldError> : null}
      </Field>
    </div>

    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
      <Field>
        <FieldLabel htmlFor={`location-${idPrefix}`}>会場</FieldLabel>
        <Input
          id={`location-${idPrefix}`}
          value={formValues.location.value}
          onChange={(event) => onChange('location', event.target.value)}
        />
        {formValues.location.error ? <FieldError>{formValues.location.error}</FieldError> : null}
      </Field>

      <Field>
        <FieldLabel htmlFor={`status-${idPrefix}`}>公開状態</FieldLabel>
        <Select
          value={formValues.status.value}
          onValueChange={(value) => onChange('status', value as LiveStatus)}
        >
          <SelectTrigger id={`status-${idPrefix}`} className="w-full">
            <SelectValue placeholder="状態を選択" />
          </SelectTrigger>
          <SelectContent>
            {LIVE_STATUS_OPTIONS.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formValues.status.error ? <FieldError>{formValues.status.error}</FieldError> : null}
      </Field>
    </div>
  </FieldGroup>
);
