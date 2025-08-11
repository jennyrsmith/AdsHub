import { BrowserRouter } from 'react-router-dom';
import TablePage from './components/TablePage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <TablePage />
    </BrowserRouter>
  );
}
