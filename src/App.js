import 'App.css';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Home from 'pages/Home';
import Darkbroccoli from 'pages/Darkbroccoli';
import Homotopy from 'pages/Homotopy';
import RootLayout from './pages/Root';
import BarycentricSplit from './pages/BarycentricSplit';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/darkbroccoli', element: <Darkbroccoli /> },
      { path: '/homotopy', element: <Homotopy /> },
      { path: '/barycentricSplit', element: <BarycentricSplit /> },
    ],
  },
]);

const App = () => <RouterProvider router={router} />;

export default App;
