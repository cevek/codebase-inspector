import {createRoot} from 'react-dom/client';
import {App} from './Graph/App';
import {Graph} from './Graph/types';
import * as data from '../data.json';

createRoot(document.getElementById('root')!).render(<App data={data as Graph} />);
