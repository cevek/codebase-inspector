import {createRoot} from 'react-dom/client';
import * as data from '../data.json';
import {App} from './Graph/App';
import {Graph} from './Graph/types';

createRoot(document.getElementById('root')!).render(<App data={data as Graph} />);
