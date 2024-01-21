import { Link } from 'react-router-dom';
import './Header.module.css';

const Header = () => (
  <header>
    <nav>
      <ul>
        <li>
          <Link to='/darkbroccoli'>DARKBROCCOLI</Link>
        </li>
        <li>
          <Link to='/homotopy'>???????</Link>
        </li>
      </ul>
    </nav>
  </header>
);

export default Header;
