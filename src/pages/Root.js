import { Outlet } from 'react-router-dom';
import Header from '../components/Header';

const RootLayout = () => (
  <>
    <Header />
    <hr />
    <Outlet />
  </>
);

export default RootLayout;
