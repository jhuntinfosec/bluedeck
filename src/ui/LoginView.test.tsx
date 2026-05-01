import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoginView } from './LoginView';

describe('LoginView', () => {
  it('renders local app-password login fields', () => {
    render(<LoginView />);

    expect(screen.getByRole('heading', { name: 'Bluedeck' })).toBeInTheDocument();
    expect(screen.getByLabelText('Service')).toHaveValue('https://bsky.social');
    expect(screen.getByLabelText('Handle or email')).toBeInTheDocument();
    expect(screen.getByLabelText('App password')).toBeInTheDocument();
  });
});
