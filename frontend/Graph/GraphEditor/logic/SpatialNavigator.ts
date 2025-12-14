import {Id} from '../../../../types';
import { Rect } from '../../GraphViewer/types';
import {ArrowDirection} from '../../types';

type MoveRecord = {
    fromId: Id;
    toId: Id;
    direction: ArrowDirection;
};

export class SpatialNavigator {
    private lastMove: MoveRecord | null = null;

    public reset(): void {
        this.lastMove = null;
    }

    /**
     * Основной метод поиска следующего узла
     */
    public findNext(currentId: Id, direction: ArrowDirection, rects: Rect[]): Id | undefined {
        const currentRect = rects.find((r) => r.id === currentId);
        if (!currentRect) return undefined;

        if (this.shouldReturnToPreviousSource(currentId, direction, rects)) {
            this.lastMove = {
                fromId: currentId,
                toId: this.lastMove!.fromId,
                direction: direction,
            };
            return this.lastMove.toId;
        }

        const bestCandidate = this.findBestCandidate(currentRect, direction, rects);

        if (bestCandidate) {
            this.lastMove = {
                fromId: currentId,
                toId: bestCandidate.id,
                direction: direction,
            };
            return bestCandidate.id;
        }

        return undefined;
    }

    private shouldReturnToPreviousSource(currentId: Id, targetDirection: ArrowDirection, rects: Rect[]): boolean {
        if (!this.lastMove) return false;

        const isReturningToSource =
            this.lastMove.toId === currentId && targetDirection === this.getOppositeDirection(this.lastMove.direction);

        if (!isReturningToSource) return false;

        const sourceExists = rects.some((r) => r.id === this.lastMove!.fromId);
        return sourceExists;
    }

    private findBestCandidate(currentRect: Rect, direction: ArrowDirection, rects: Rect[]): Rect | null {
        let bestCandidate: Rect | null = null;
        let minScore = Infinity;

        const WEIGHTS = {
            CROSS_AXIS: 10,
            CENTER_ALIGN: 0.1,
        };

        for (const cand of rects) {
            if (cand.id === currentRect.id) continue;

            const metrics = this.calculateMetrics(currentRect, cand, direction);

            if (!metrics.isValid) continue;

            const score =
                metrics.distMain + metrics.distCross * WEIGHTS.CROSS_AXIS + metrics.distCenter * WEIGHTS.CENTER_ALIGN;

            if (score < minScore) {
                minScore = score;
                bestCandidate = cand;
            }
        }

        return bestCandidate;
    }

    private calculateMetrics(
        src: Rect,
        cand: Rect,
        dir: ArrowDirection,
    ): {isValid: boolean; distMain: number; distCross: number; distCenter: number} {
        let isValid = false;
        let distMain = 0;
        let distCross = 0;
        let distCenter = 0;

        switch (dir) {
            case 'right':
                if (cand.left >= src.right) {
                    isValid = true;
                    distMain = cand.left - src.right;
                    distCross = this.calculateCrossDist(src.top, src.bottom, cand.top, cand.bottom);
                    distCenter = Math.abs(cand.cy - src.cy);
                }
                break;

            case 'left':
                if (cand.right <= src.left) {
                    isValid = true;
                    distMain = src.left - cand.right;
                    distCross = this.calculateCrossDist(src.top, src.bottom, cand.top, cand.bottom);
                    distCenter = Math.abs(cand.cy - src.cy);
                }
                break;

            case 'down':
                if (cand.top >= src.bottom) {
                    isValid = true;
                    distMain = cand.top - src.bottom;
                    distCross = this.calculateCrossDist(src.left, src.right, cand.left, cand.right);
                    distCenter = Math.abs(cand.cx - src.cx);
                }
                break;

            case 'up':
                if (cand.bottom <= src.top) {
                    isValid = true;
                    distMain = src.top - cand.bottom;
                    distCross = this.calculateCrossDist(src.left, src.right, cand.left, cand.right);
                    distCenter = Math.abs(cand.cx - src.cx);
                }
                break;
        }

        return {isValid, distMain, distCross, distCenter};
    }

    private calculateCrossDist(start1: number, end1: number, start2: number, end2: number): number {
        const overlap = Math.min(end1, end2) - Math.max(start1, start2);
        if (overlap > 0) return 0;
        return Math.max(0, Math.max(start1, start2) - Math.min(end1, end2));
    }

    private getOppositeDirection(dir: ArrowDirection): ArrowDirection {
        switch (dir) {
            case 'left':
                return 'right';
            case 'right':
                return 'left';
            case 'up':
                return 'down';
            case 'down':
                return 'up';
        }
    }
}
