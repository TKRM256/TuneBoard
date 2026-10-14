import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { NumberInput } from './NumberInput';

function Harness({ initial, min, max }: { initial: number; min?: number; max?: number }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <NumberInput aria-label="数" value={value} min={min} max={max} onValueChange={setValue} />
      <output aria-label="値">{value}</output>
      <button type="button">ほか</button>
    </>
  );
}

afterEach(cleanup);

describe('数値の入力欄', () => {
  it('9 を消して空にしてから 5 と打ち直せる', async () => {
    const user = userEvent.setup();
    render(<Harness initial={9} />);
    const input = screen.getByRole('textbox', { name: '数' });
    await user.click(input);
    await user.keyboard('{Backspace}');
    expect(input).toHaveValue('');
    expect(screen.getByLabelText('値')).toHaveTextContent('9');
    await user.keyboard('5');
    expect(input).toHaveValue('5');
    expect(screen.getByLabelText('値')).toHaveTextContent('5');
  });

  it('空のまま離れると元の値に戻る', async () => {
    const user = userEvent.setup();
    render(<Harness initial={9} />);
    const input = screen.getByRole('textbox', { name: '数' });
    await user.clear(input);
    await user.click(screen.getByRole('button', { name: 'ほか' }));
    expect(input).toHaveValue('9');
  });

  it('範囲の外は離れたときに収め、打っている途中では変えない', async () => {
    const user = userEvent.setup();
    render(<Harness initial={5} min={1} max={10} />);
    const input = screen.getByRole('textbox', { name: '数' });
    await user.clear(input);
    await user.type(input, '15');
    expect(screen.getByLabelText('値')).toHaveTextContent('1');
    await user.click(screen.getByRole('button', { name: 'ほか' }));
    expect(input).toHaveValue('10');
    expect(screen.getByLabelText('値')).toHaveTextContent('10');
  });

  it('全角の数字も受け付け、↑キーで増やせる', async () => {
    const user = userEvent.setup();
    render(<Harness initial={1} />);
    const input = screen.getByRole('textbox', { name: '数' });
    await user.clear(input);
    await user.type(input, '３');
    expect(screen.getByLabelText('値')).toHaveTextContent('3');
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveValue('4');
  });
});
