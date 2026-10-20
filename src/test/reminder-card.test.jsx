import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReminderCard } from '../components/Reminders/ReminderCard';

vi.mock('../context/TelegramContext', () => ({
  useTelegram: () => ({
    triggerHaptic: vi.fn(),
    user: null,
    activeUserId: '123',
  }),
}));

describe('ReminderCard Component', () => {
  const mockReminder = {
    id: 'rem-1',
    title: 'Зустріч з командою',
    description: 'Обговорення релізу',
    remind_at: new Date(Date.now() + 3600000).toISOString(),
    category: 'work',
    is_sent: false,
    items: [],
  };

  it('renders reminder title and description', () => {
    render(
      <ReminderCard
        reminder={mockReminder}
        canEdit={true}
        onToggleSent={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onUpdate={vi.fn()}
      />
    );

    expect(screen.getByText('Зустріч з командою')).toBeInTheDocument();
    expect(screen.getByText('Обговорення релізу')).toBeInTheDocument();
  });

  it('handles toggle completion status on check button click', () => {
    const handleToggleSent = vi.fn();
    render(
      <ReminderCard
        reminder={mockReminder}
        canEdit={true}
        onToggleSent={handleToggleSent}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onUpdate={vi.fn()}
      />
    );

    const checkBtn = screen.getByTitle(/позначити як виконане/i);
    expect(checkBtn).toBeInTheDocument();
    fireEvent.click(checkBtn);

    expect(handleToggleSent).toHaveBeenCalledWith('rem-1', true);
  });
});
