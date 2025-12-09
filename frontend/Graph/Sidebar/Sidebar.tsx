import React from 'react';
import styles from './Sidebar.module.css';
import {LayoutDirection} from '../GraphViewer';
import {IdeItem, IdeValue} from '../hooks/useIde';
import {Id} from '../../../types';

const Icons = {
    Close: () => (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    ),
    Tree: () => (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <line x1="10" y1="7" x2="14" y2="7"></line>
            <line x1="10" y1="17" x2="14" y2="17"></line>
            <line x1="10" y1="7" x2="10" y2="17"></line>
        </svg>
    ),
    Restore: () => (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
        </svg>
    ),
    ChevronDown: () => (
        <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
    ),
    Keyboard: () => (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
            <line x1="6" y1="8" x2="6" y2="8"></line>
            <line x1="10" y1="8" x2="10" y2="8"></line>
            <line x1="14" y1="8" x2="14" y2="8"></line>
            <line x1="18" y1="8" x2="18" y2="8"></line>
            <line x1="6" y1="12" x2="6" y2="12"></line>
            <line x1="10" y1="12" x2="10" y2="12"></line>
            <line x1="14" y1="12" x2="14" y2="12"></line>
            <line x1="18" y1="12" x2="18" y2="12"></line>
            <line x1="6" y1="16" x2="18" y2="16"></line>
        </svg>
    ),
};

export const Sidebar: React.FC<{
    path: string[] | null;
    focusNode: string | null;
    removedNodes: {id: Id; name: string}[];
    layoutDirection: LayoutDirection;
    ideOptions: readonly IdeItem[];
    selectedIde: IdeValue;
    onIdeChange: (ide: IdeValue) => void;
    onFocusSubtree: () => void;
    onClearFocus: () => void;
    onRestoreAll: () => void;
    onRestoreNode: (node: Id) => void;
    onLayoutChange: (layoutDirection: LayoutDirection) => void;
}> = ({
    path,
    focusNode,
    removedNodes,
    layoutDirection,
    ideOptions,
    selectedIde,
    onIdeChange,
    onFocusSubtree,
    onClearFocus,
    onRestoreAll,
    onRestoreNode,
    onLayoutChange,
}) => {
    return (
        <aside className={styles.sidebar}>
            {/* --- Header & Breadcrumbs --- */}
            {path && (
                <div className={styles.header}>
                    <div className={styles.breadcrumbs}>
                        {path.slice(0, -1).map((crumb, i) => (
                            <span key={i} className={styles.crumbPath}>
                                {crumb}
                                <span className={styles.divider}>›</span>
                            </span>
                        ))}
                        <span className={styles.crumbCurrent}>{path[path.length - 1]}</span>
                    </div>

                    <button className={styles.subtreeBtn} onClick={onFocusSubtree}>
                        <Icons.Tree />
                        <span>Focus Subtree</span>
                    </button>
                </div>
            )}

            {/* --- Focus Context --- */}
            {focusNode && (
                <div className={styles.focusCard}>
                    <div className={styles.cardLabel}>FOCUS</div>
                    <div className={styles.cardContent}>
                        <span className={styles.focusValue}>{focusNode}</span>
                        <button className={styles.clearBtn} onClick={onClearFocus} aria-label="Clear focus">
                            <Icons.Close />
                        </button>
                    </div>
                </div>
            )}

            {/* --- Removed Nodes List --- */}
            {removedNodes.length > 0 && (
                <div className={styles.section}>
                    <div className={styles.listHeader}>
                        <div className={styles.sectionTitle}>REMOVED NODES</div>
                        {removedNodes.length > 0 && (
                            <button className={styles.restoreAllLink} onClick={onRestoreAll}>
                                Restore All
                            </button>
                        )}
                    </div>

                    <ul className={styles.nodeList}>
                        {removedNodes.map((node, index) => (
                            <li key={index} className={styles.nodeItem}>
                                <span className={styles.nodeName}>{node.name}</span>
                                <button
                                    className={styles.restoreBtn}
                                    onClick={() => onRestoreNode(node.id)}
                                    title="Restore Node"
                                >
                                    <Icons.Restore />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* --- Settings Grid --- */}
            <div className={styles.section} style={{marginTop: 'auto'}}>
                <div className={styles.sectionTitle}>VIEW SETTINGS</div>
                <div className={styles.settingsGrid}>
                    <div className={styles.controlGroup}>
                        <label>Layout</label>
                        <div className={styles.selectWrapper}>
                            <select
                                value={layoutDirection}
                                onChange={(e) => onLayoutChange(e.target.value as LayoutDirection)}
                            >
                                <option value={'TB'}>Top to bottom</option>
                                <option value={'LR'}>Left to right</option>
                            </select>
                            <span className={styles.selectIcon}>
                                <Icons.ChevronDown />
                            </span>
                        </div>
                    </div>

                    <div className={styles.controlGroup}>
                        <label>Open in IDE</label>
                        <div className={styles.selectWrapper}>
                            <select value={selectedIde} onChange={(e) => onIdeChange(e.target.value as 'vscode')}>
                                {ideOptions.map((opt) => (
                                    <option key={opt.value}>{opt.name}</option>
                                ))}
                            </select>
                            <span className={styles.selectIcon}>
                                <Icons.ChevronDown />
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            {/* --- Help / Shortcuts --- */}
            <div className={styles.helpSection}>
                <div className={styles.helpHeader}>
                    <Icons.Keyboard /> <span>Shortcuts</span>
                </div>
                <div className={styles.shortcutRow}>
                    <span>Remove Node</span>
                    <kbd className={styles.kbd}>Backspace</kbd>
                </div>
                <div className={styles.shortcutRow}>
                    <span>Open in IDE</span>
                    <kbd className={styles.kbd}>Dbl Click</kbd>
                </div>
                <div className={styles.shortcutRow}>
                    <span>Restore File</span>
                    <div className={styles.keysGroup}>
                        <kbd className={styles.kbd}>Cmd</kbd>
                        <span className={styles.plus}>+</span>
                        <kbd className={styles.kbd}>Z</kbd>
                    </div>
                </div>
            </div>
            <div className={styles.githubLink}>
                <a href="https://github.com/cevek/codebase-inspector" target="_blank">
                    github
                </a>
            </div>
        </aside>
    );
};
