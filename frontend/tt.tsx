import React, {forwardRef, lazy, memo} from 'react';
import {FC} from 'react';

function Bar0() {
    return <div></div>;
}

const Bar1 = () => {
    return <div></div>;
};
const Bar2: React.FC = () => {
    return <div></div>;
};
const Bar20: FC = () => {
    return <div></div>;
};
const Bar3: FC<{x?: number}> = () => {
    return <div></div>;
};
const Bar4 = React.memo(() => {
    return <div></div>;
});
const Bar40 = memo(() => {
    return <div></div>;
});
const Bar5 = React.lazy(async () => {
    return {default: () => <div></div>};
});
const Bar50 = lazy(async () => {
    return {default: () => <div></div>};
});

const Bar6 = React.forwardRef(() => {
    return <div></div>;
});
const Bar61 = forwardRef(() => {
    return <div></div>;
});
