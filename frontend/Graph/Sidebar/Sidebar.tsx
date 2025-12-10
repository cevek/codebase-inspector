import React from 'react';
import styles from './Sidebar.module.css';
import {LayoutDirection} from '../GraphViewer';
import {IdeItem, IdeValue} from '../hooks/useIde';
import {Id} from '../../../types';
import {Icons} from './Icons';

export const Sidebar: React.FC<{
    path: string[] | null;
    focusNode: string | null;
    removedNodes: {id: Id; name: string}[];
    apiUrl: {method: string; url: string} | null;
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
    apiUrl,
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
                    {apiUrl && <div className={styles.apiUrl}>{apiUrl.method} {apiUrl.url}</div>}

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
                                    <option key={opt.value} value={opt.value}>
                                        {opt.name}
                                    </option>
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
                    <span>Shortcuts</span>
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
