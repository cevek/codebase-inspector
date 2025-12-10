import React, { useState } from 'react';
import { TypeInfo, FieldDetails } from './types';

const styles = {
  container: { 
    fontFamily: 'Consolas, "Cascadia Code", monospace', 
    fontSize: '14px', 
    lineHeight: '1.6', 
    color: '#d4d4d4',
    whiteSpace: 'normal', 
    wordBreak: 'break-word' as const
  },
  interactive: { 
    cursor: 'pointer', 
    color: '#4ec9b0', // Зеленоватый цвет (как Interface/Type)
    borderBottom: '1px dotted rgba(78, 201, 176, 0.4)',
    transition: 'all 0.1s'
  },
  interactiveHover: { 
    background: 'rgba(78, 201, 176, 0.1)' 
  },
  punctuation: { color: '#858585' },
  keyword: { color: '#569cd6' },
  fieldName: { color: '#9cdcfe' },
  primitive: { color: '#569cd6' },
  stringLiteral: { color: '#ce9178' },
  
  // Блок раскрытого контента
  expandedBlock: { 
    display: 'inline-block', 
    verticalAlign: 'top', 
    background: '#1e1e1e', 
    border: '1px solid #3c3c3c', 
    borderRadius: '4px',
    padding: '2px 6px', 
    margin: '0 4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
  },
  indent: { paddingLeft: '16px' },
};

interface Props {
  typeInfo: TypeInfo;
  isRoot?: boolean;
}

const TypeRenderer: React.FC<Props> = ({ typeInfo, isRoot = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeInfo.details) {
      setIsExpanded(!isExpanded);
    }
  };

  const Wrapper = isRoot ? 'div' : 'span';
  const wrapperStyle = isRoot ? styles.container : {};

  // --- 1. ПРИМИТИВЫ (string, "hello", 123) ---
  // Обратите внимание: Backend посылает простые юнионы (string | number) как primitive,
  // поэтому они отрендерятся здесь, сразу текстом.
  if (typeInfo.kind === 'primitive') {
    const isLiteral = typeInfo.name?.startsWith('"') || typeInfo.name?.startsWith("'") || !isNaN(Number(typeInfo.name));
    return (
      <Wrapper style={wrapperStyle}>
        <span style={isLiteral ? styles.stringLiteral : styles.primitive}>
          {typeInfo.baseName || typeInfo.name}
        </span>
      </Wrapper>
    );
  }

  // --- 2. МАССИВЫ (X[]) ---
  if (typeInfo.kind === 'array') {
    const elementType = typeInfo.details.elementType;
    const needsParens = elementType.kind === 'union' || elementType.kind === 'function';

    return (
      <Wrapper style={wrapperStyle}>
        {needsParens && <span style={styles.punctuation}>(</span>}
        <TypeRenderer typeInfo={elementType} />
        {needsParens && <span style={styles.punctuation}>)</span>}
        <span style={styles.punctuation}>[]</span>
      </Wrapper>
    );
  }

  // --- 3. ССЫЛКИ НА РЕКУРСИЮ ---
  if (typeInfo.kind === 'reference') {
    return (
      <Wrapper style={wrapperStyle}>
        <span style={{...styles.interactive, textDecoration: 'underline', color: '#888'}} title="Recursive reference">
          {typeInfo.baseName}
        </span>
      </Wrapper>
    );
  }

  // --- 4. СЛОЖНЫЕ ТИПЫ (Object, Union, Intersection) ---
  // Сюда попадает BookingTypeGroup (kind: union), так как он "сложный" (содержит литералы)
  
  const displayName = typeInfo.baseName || typeInfo.name || 'Object';
  const canExpand = !!typeInfo.details;
  
  const currentStyle = canExpand 
    ? (isHovered ? {...styles.interactive, ...styles.interactiveHover} : styles.interactive)
    : styles.keyword;

  const renderContent = () => {
    // А. Свернуто: просто имя (BookingTypeGroup | null)
    if (!isExpanded) {
      return (
        <span 
          onClick={handleToggle}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={currentStyle}
        >
          {displayName}
        </span>
      );
    }

    // Б. Развернуто: Имя + Блок содержимого
    return (
      <span style={{ display: 'inline-block', verticalAlign: 'top' }}>
        <span 
          onClick={handleToggle}
          style={{...currentStyle, opacity: 0.7, fontSize: '0.85em', marginRight: 2}}
        >
          {displayName}
        </span>
        <div style={styles.expandedBlock}>
           <ExpandedView typeInfo={typeInfo} />
        </div>
      </span>
    );
  };

  // Обертка для дженериков (если есть)
  if (typeInfo.generics && typeInfo.generics.length > 0) {
    return (
      <Wrapper style={wrapperStyle}>
        {renderContent()}
        <span style={styles.punctuation}>&lt;</span>
        {typeInfo.generics.map((arg, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span style={styles.punctuation}>, </span>}
            <TypeRenderer typeInfo={arg} />
          </React.Fragment>
        ))}
        <span style={styles.punctuation}>&gt;</span>
      </Wrapper>
    );
  }

  return <Wrapper style={wrapperStyle}>{renderContent()}</Wrapper>;
};

// --- ВНУТРЕННОСТИ РАСКРЫТОГО БЛОКА ---
const ExpandedView: React.FC<{typeInfo: TypeInfo}> = ({ typeInfo }) => {
  
  // Рендеринг содержимого UNION / INTERSECTION
  if (typeInfo.kind === 'union' || typeInfo.kind === 'intersection') {
    const separator = typeInfo.kind === 'union' ? ' | ' : ' & ';
    const types = typeInfo.details?.types || [];
    
    return (
      <span>
        {types.map((t: TypeInfo, index: number) => (
          <React.Fragment key={index}>
            {index > 0 && <span style={styles.punctuation}>{separator}</span>}
            <TypeRenderer typeInfo={t} />
          </React.Fragment>
        ))}
      </span>
    );
  }

  // Рендеринг полей ОБЪЕКТА
  if (typeInfo.details && typeInfo.details.fields) {
    if (typeInfo.details.fields.length === 0) return <span style={styles.punctuation}>{'{}'}</span>;

    return (
      <div>
        <span style={styles.punctuation}>{'{'}</span>
        {typeInfo.details.fields.map((field: FieldDetails, i: number) => (
          <div key={i} style={styles.indent}>
            <span style={styles.fieldName}>{field.name}</span>
            {field.optional && <span style={styles.punctuation}>?</span>}
            <span style={styles.punctuation}>: </span>
            <TypeRenderer typeInfo={field.type} />
            <span style={styles.punctuation}>;</span>
          </div>
        ))}
        <span style={styles.punctuation}>{'}'}</span>
      </div>
    );
  }

  if (typeInfo.kind === 'function') {
    return <span style={styles.punctuation}>(...) =&gt; void</span>;
  }

  return <span style={{color: 'red'}}>Unknown</span>;
};

export default TypeRenderer;