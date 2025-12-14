import {useRef} from 'react';
import {useEvent} from '../../hooks/useEvent';

export const useIgnoreClickOnDrag = (threshold = 5) => {
    const startCoords = useRef({x: 0, y: 0});
    const isDragging = useRef(false);

    const onMouseDown = useEvent((e: React.MouseEvent) => {
        startCoords.current = {x: e.clientX, y: e.clientY};
        isDragging.current = false;
    });

    const onMouseUp = useEvent((e: React.MouseEvent) => {
        const deltaX = Math.abs(e.clientX - startCoords.current.x);
        const deltaY = Math.abs(e.clientY - startCoords.current.y);

        if (deltaX > threshold || deltaY > threshold) {
            isDragging.current = true;
        }
    });

    const onClickCapture = useEvent((e: React.MouseEvent) => {
        if (isDragging.current) {
            e.stopPropagation();
            e.preventDefault();
        }
    });

    return {onMouseDown, onMouseUp, onClickCapture};
};
