import React, {useState, useRef, useEffect} from 'react';
import {Command} from 'cmdk';
import styles from './Search.module.css';
import {Id} from '../../../../types';

export interface SearchItem {
    id: Id;
    name: string;
    module: string;
    fileName: string;
}

export const Search = ({
    onSelect,
    items,
    selectedId,
}: {
    selectedId: Id | null;
    items: SearchItem[];
    onSelect: (id: Id | null) => void;
}) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedItem = items.find((i) => i.id === selectedId);

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(null);
        setOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={styles.container} ref={containerRef}>
            <button className={styles.trigger} onClick={() => setOpen(!open)} type="button">
                {selectedItem ? (
                    <div className={styles.itemContent}>
                        <span className={styles.itemName}>{selectedItem.name}</span>
                        <span style={{fontSize: '11px', color: '#666'}}>{selectedItem.module}</span>
                    </div>
                ) : (
                    <span style={{color: '#6a737d'}}>Select node...</span>
                )}

                <div className={styles.iconsRight}>
                    {selectedId && (
                        <div className={styles.clearBtn} onClick={handleClear} title="Clear" role="button">
                            ✕
                        </div>
                    )}

                    <span style={{fontSize: '10px', color: '#666'}}>▼</span>
                </div>
            </button>

            {open && (
                <div className={styles.popover}>
                    <Command loop>
                        <Command.Input autoFocus className={styles.input} placeholder="Search..." />

                        <Command.List className={styles.list}>
                            <Command.Empty className={styles.empty}>Nothing found</Command.Empty>

                            {items.map((item) => (
                                <Command.Item
                                    key={item.id}
                                    value={`${item.name} ${item.module} ${item.fileName}`}
                                    onSelect={() => {
                                        onSelect(item.id);
                                        setOpen(false);
                                    }}
                                    className={styles.item}
                                >
                                    <div className={styles.itemContent}>
                                        <span className={styles.itemName}>{item.name}</span>
                                        <span className={styles.itemModule}>{item.module}</span>
                                    </div>

                                    {selectedId === item.id && <span>✓</span>}
                                </Command.Item>
                            ))}
                        </Command.List>
                    </Command>
                </div>
            )}
        </div>
    );
};
