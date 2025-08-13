import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestUI } from '../test-ui';

describe('TestUI Component', () => {
  it('renders the component with correct title', () => {
    render(<TestUI />);

    expect(screen.getByText('Both Sides UI Test')).toBeInTheDocument();
    expect(
      screen.getByText('Testing shadcn/ui components integration')
    ).toBeInTheDocument();
  });

  it('renders all button variants', () => {
    render(<TestUI />);

    expect(screen.getByText('Primary Button')).toBeInTheDocument();
    expect(screen.getByText('Secondary Button')).toBeInTheDocument();
    expect(screen.getByText('Outline Button')).toBeInTheDocument();
  });

  it('renders input field with correct placeholder', () => {
    render(<TestUI />);

    const input = screen.getByPlaceholderText('Type something...');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'test-input');
  });

  it('allows typing in the input field', async () => {
    const user = userEvent.setup();
    render(<TestUI />);

    const input = screen.getByPlaceholderText('Type something...');
    await user.type(input, 'Hello, Both Sides!');

    expect(input).toHaveValue('Hello, Both Sides!');
  });

  it('displays success indicators', () => {
    render(<TestUI />);

    expect(
      screen.getByText(/✅ Tailwind CSS classes working/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/✅ shadcn\/ui components rendering/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/✅ Design system variables applied/)
    ).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<TestUI />);

    const input = screen.getByLabelText('Test Input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'test-input');
  });

  it('buttons are clickable', async () => {
    const user = userEvent.setup();
    render(<TestUI />);

    const primaryButton = screen.getByText('Primary Button');
    const secondaryButton = screen.getByText('Secondary Button');
    const outlineButton = screen.getByText('Outline Button');

    // Verify buttons are clickable (no errors thrown)
    await user.click(primaryButton);
    await user.click(secondaryButton);
    await user.click(outlineButton);

    // Buttons should still be in the document after clicking
    expect(primaryButton).toBeInTheDocument();
    expect(secondaryButton).toBeInTheDocument();
    expect(outlineButton).toBeInTheDocument();
  });
});
