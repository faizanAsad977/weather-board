import { render, screen } from '@testing-library/react';
import App from './App';

test('renders WeatherBoard heading', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /weatherboard/i });
  expect(heading).toBeInTheDocument();
});
