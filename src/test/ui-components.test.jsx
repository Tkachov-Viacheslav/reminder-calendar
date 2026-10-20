import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, Badge, Card } from '../components/ui';

describe('UI Base Components', () => {
  it('renders Button with text and handles clicks', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Тестова кнопка</Button>);

    const btn = screen.getByRole('button', { name: /Тестова кнопка/i });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders Badge with custom variant', () => {
    render(<Badge variant="success">Виконано</Badge>);
    const badge = screen.getByText('Виконано');
    expect(badge).toBeInTheDocument();
  });

  it('renders Card with children content', () => {
    render(
      <Card>
        <p>Вміст картки</p>
      </Card>
    );
    expect(screen.getByText('Вміст картки')).toBeInTheDocument();
  });
});
