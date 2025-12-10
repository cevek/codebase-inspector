import React from 'react';
import './App.css';
import {sampleTypeData} from './sampleData';
import TypeRenderer from './TypeTreeNode';

const App = () => {
    return (
        <div style={{background: '#1e1e1e', minHeight: '100vh', padding: '20px', color: '#fff'}}>
            <h3>Interactive Type Signature</h3>
            <div style={{fontSize: '16px', marginTop: '20px'}}>
                <span style={{color: '#569cd6'}}>const</span> <span style={{color: '#9cdcfe'}}>myAction</span>{' '}
                <span style={{color: '#858585'}}>: </span>
                {/* ВАШ НОВЫЙ КОМПОНЕНТ */}
                <TypeRenderer typeInfo={sampleTypeData} />
            </div>
        </div>
    );
};

export default App;
