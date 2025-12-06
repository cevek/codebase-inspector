import {Graphviz} from '@hpcc-js/wasm';
import * as React from 'react';
import {TransformComponent, TransformWrapper} from 'react-zoom-pan-pinch';
import {generateGraphviz} from './generateGraphviz';
import {Graph} from './types';
import classes from './GraphViewer.module.css';

export const GraphViewer: React.FC<{
    data: Graph;
    selectedId: string | null;
    onSelect?: (id: string | null) => void;
}> = ({data, selectedId, onSelect}) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        const renderGraph = async () => {
            try {
                const dot = generateGraphviz(data);
                const graphviz = await Graphviz.load();
                const svg = graphviz.layout(dot, 'svg', 'dot');
                containerRef.current!.innerHTML = svg;
            } catch (err) {
                console.error(err);
            }
        };
        renderGraph();
    }, [data]);

    React.useEffect(() => {
        if (containerRef.current) {
            const previouslySelected = containerRef.current.querySelectorAll('.' + classes.selected);
            previouslySelected.forEach((el) => el.classList.remove(classes.selected));
        }
        if (selectedId && containerRef.current) {
            const element = containerRef.current.querySelector(`#${selectedId}`);
            if (element) {
                element.classList.add(classes.selected);
            }
        }
    }, [selectedId]);

    const handleGraphClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const groupElement = target.closest('g.node, g.cluster');
        if (groupElement) {
            const id = groupElement.getAttribute('id');
            if (id && id.split('_').length > 1) {
                onSelect?.(selectedId === id ? null : id);
                return;
            }
        }

        onSelect?.(null);
    };

    return (
        <TransformWrapper
            initialScale={1}
            minScale={0.1}
            maxScale={4}
            limitToBounds={false}
            alignmentAnimation={{disabled: true}}
            velocityAnimation={{disabled: true}}
            centerOnInit={true}
            panning={{velocityDisabled: true}}
            doubleClick={{disabled: true}}
        >
            <TransformComponent wrapperStyle={{width: '100%', height: '100%'}}>
                <div
                    className={classes.svg}
                    ref={containerRef}
                    style={{width: '100%', height: '100%'}}
                    onClick={handleGraphClick}
                />
            </TransformComponent>
        </TransformWrapper>
    );
};
