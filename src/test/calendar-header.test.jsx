import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarHeader } from '../components/Calendar/CalendarHeader';

vi.mock('../context/TelegramContext', () => ({
  useTelegram: () => ({
    triggerHaptic: vi.fn(),
  }),
}));

describe('CalendarHeader Component', () => {
  it('renders month name, year and handles navigation clicks', () => {
    const handlePrev = vi.fn();
    const handleNext = vi.fn();
    const handleToday = vi.fn();
    const testDate = new Date(2026, 9, 20); // Жовтень 2026

    render(
      <CalendarHeader
        viewDate={testDate}
        onPrevMonth={handlePrev}
        onNextMonth={handleNext}
        onGoToday={handleToday}
      />
    );

    expect(screen.getByText('Жовтень')).toBeInTheDocument();
    expect(screen.getByText('2026')).toBeInTheDocument();

    const prevBtn = screen.getByLabelText('Попередній місяць');
    const nextBtn = screen.getByLabelText('Наступний місяць');
    const todayBtn = screen.getByRole('button', { name: /Сьогодні/i });

    fireEvent.click(prevBtn);
    expect(handlePrev).toHaveBeenCalledTimes(1);

    fireEvent.click(nextBtn);
    expect(handleNext).toHaveBeenCalledTimes(1);

    fireEvent.click(todayBtn);
    expect(handleToday).toHaveBeenCalledTimes(1);
  });
});
