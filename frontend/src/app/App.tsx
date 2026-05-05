import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Providers } from './components/Providers';

export default function App() {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}