import {Fragment} from 'react';
import classes from './HotKeyView.module.css';

export function HotKeyView({hotkey}: {hotkey: string[]}) {
    return (
        <span className={classes.kbd}>
            {hotkey.map((key, i) => (
                <Fragment key={i}>
                    <span className={classes.kbdKey}>{key}</span>
                    {i < hotkey.length - 1 && <span className={classes.plus}>+</span>}
                </Fragment>
            ))}
        </span>
    );
}
