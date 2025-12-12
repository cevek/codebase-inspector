import React, {JSX} from 'react';
import styles from './Sidebar.module.css';
import {LayoutDirection} from '../GraphViewer';
import {IdeItem, IdeValue} from '../hooks/useIde';
import {Id} from '../../../types';
import {Icons} from './Icons';
import {Direction} from '../types';
import {Search, SearchItem} from './Search/Search';

export const Sidebar: React.FC<{
    path: string[] | null;
    focusNode: Id | null;
    removedNodes: {id: Id; name: string; dir: Direction}[];
    nodeDetails: JSX.Element[];
    layoutDirection: LayoutDirection;
    groupByModules: boolean;
    ideOptions: readonly IdeItem[];
    selectedIde: IdeValue;
    searchItems: SearchItem[];

    onFocusNode: (node: Id | null) => void;
    onIdeChange: (ide: IdeValue) => void;
    onFocusSubtree: () => void;
    onRestoreAll: () => void;
    onRestoreNode: (node: Id) => void;
    onLayoutChange: (layoutDirection: LayoutDirection) => void;
    onGroupByModulesChange: (groupByModules: boolean) => void;
}> = ({
    path,
    nodeDetails,
    focusNode,
    removedNodes,
    layoutDirection,
    groupByModules,
    ideOptions,
    selectedIde,
    searchItems,
    onGroupByModulesChange,
    onFocusNode,
    onIdeChange,
    onFocusSubtree,
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
                    {nodeDetails && nodeDetails.length > 0 && (
                        <div className={styles.nodeDetails}>
                            {nodeDetails.map((v, i) => (
                                <div key={i}>{v}</div>
                            ))}
                        </div>
                    )}

                    <button className={styles.subtreeBtn} onClick={onFocusSubtree}>
                        <Icons.Tree />
                        <span>Focus Subtree</span>
                    </button>
                </div>
            )}

            <div className={styles.section}>
                <div className={styles.sectionTitle}>Focus</div>
                <Search selectedId={focusNode} items={searchItems} onSelect={onFocusNode} />
            </div>

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
                                <span className={styles.nodeName}>
                                    {node.dir === 'forward' ? '↓' : '↑'} {node.name}
                                </span>
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
                <div className={styles.controlGroup}>
                    <label style={{display: 'flex', alignItems: 'center', gap: 5}}>
                        <input
                            type="checkbox"
                            checked={groupByModules}
                            onChange={(e) => onGroupByModulesChange(e.target.checked)}
                        />{' '}
                        Group by modules
                    </label>
                </div>
            </div>
            {/* --- Help / Shortcuts --- */}
            <div className={styles.helpSection}>
                <div className={styles.helpHeader}>
                    <span>Labels</span>
                </div>
                <div className={styles.shortcutRow}>
                    <span>Entities</span>
                    <kbd className={styles.kbd}>E</kbd>
                </div>
                <div className={styles.shortcutRow}>
                    <span>Services</span>
                    <kbd className={styles.kbd}>S</kbd>
                </div>
                <div className={styles.shortcutRow}>
                    <span>Data Providers</span>
                    <kbd className={styles.kbd}>DP</kbd>
                </div>
                <div className={styles.shortcutRow}>
                    <span>Mappings</span>
                    <kbd className={styles.kbd}>M</kbd>
                </div>
            </div>
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
                    <span>Undo</span>
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
