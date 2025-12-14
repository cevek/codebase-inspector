import {gsap} from 'gsap';

export interface RawSnapshotItem {
    tagName: string;
    d?: string;
    points?: string;
    x?: string;
    y?: string;
    transform?: string;
    outerHTML: string;
}

export type RawSnapshot = Map<string, RawSnapshotItem>;

type Point = [number, number];

const NUM_REGEX = /[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g;

export function createResampledInterpolator(d1: string, d2: string, samples: number = 100) {
    const getPathPoints = (d: string): Point[] => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);

        const totalLength = path.getTotalLength();
        const points: Point[] = [];
        const step = totalLength / (samples - 1);

        for (let i = 0; i < samples; i++) {
            const distance = i * step;
            const pt = path.getPointAtLength(Math.min(distance, totalLength));
            points.push([pt.x, pt.y]);
        }
        return points;
    };

    const points1 = getPathPoints(d1);
    const points2 = getPathPoints(d2);

    return (t: number): string => {
        const progress = Math.max(0, Math.min(1, t));
        const pathCommands: string[] = new Array(samples);

        for (let i = 0; i < samples; i++) {
            const [x1, y1] = points1[i];
            const [x2, y2] = points2[i];

            // Linear Interpolation (LERP)
            const x = x1 + (x2 - x1) * progress;
            const y = y1 + (y2 - y1) * progress;

            const cmd = `${x.toFixed(1)},${y.toFixed(1)}`;
            pathCommands[i] = i === 0 ? `M${cmd}` : `L${cmd}`;
        }

        return pathCommands.join(' ');
    };
}

function createHybridPathInterpolator(oldD: string, newD: string) {
    const oldNumbers = oldD.match(NUM_REGEX) || [];
    const newNumbers = newD.match(NUM_REGEX) || [];

    if (oldNumbers.length !== newNumbers.length) {
        return createResampledInterpolator(oldD, newD);
    }

    return (t: number) => {
        let i = 0;
        return oldD.replace(NUM_REGEX, (match) => {
            const start = parseFloat(match);
            const end = parseFloat(newNumbers[i++] || '0');

            const val = start + (end - start) * t;
            return val.toString();
        });
    };
}

export function createAttributeSnapshot(svgRoot: SVGSVGElement): RawSnapshot {
    const snapshot: RawSnapshot = new Map();
    const elements = svgRoot.querySelectorAll('[id]');

    elements.forEach((el) => {
        const item: RawSnapshotItem = {
            tagName: el.tagName,
            outerHTML: el.outerHTML,
        };

        let hasData = false;

        if (el.tagName === 'path') {
            item.d = el.getAttribute('d') || '';
            hasData = !!item.d;
        } else if (el.tagName === 'polygon') {
            item.points = el.getAttribute('points') || '';
            hasData = !!item.points;
        } else if (el.tagName === 'text') {
            item.x = el.getAttribute('x') || '0';
            item.y = el.getAttribute('y') || '0';
            hasData = true;
        } else if (el.tagName === 'g') {
            item.transform = el.getAttribute('transform') || '';
            hasData = !!item.transform;
        }

        if (hasData || el.tagName === 'g') {
            snapshot.set(el.id, item);
        }
    });

    return snapshot;
}

export function animateRawAttributes(
    newSvgRoot: SVGSVGElement,
    snapshot: RawSnapshot,
    duration: number = 0.5,
): Promise<void> {
    return new Promise((resolve) => {
        const onCompleteAll = () => {
            gsap.set(newSvgRoot.querySelectorAll('*'), {clearProps: 'all'});
            resolve();
        };

        const tl = gsap.timeline({onComplete: onCompleteAll});
        const newElements = Array.from(newSvgRoot.querySelectorAll('[id]'));
        const newIds = new Set(newElements.map((el) => el.id));

        snapshot.forEach((oldData, id) => {
            if (!newIds.has(id)) {
                const ghostGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                ghostGroup.innerHTML = oldData.outerHTML;
                const ghost = ghostGroup.firstElementChild as SVGGraphicsElement;

                if (ghost) {
                    newSvgRoot.appendChild(ghost);
                    tl.to(
                        ghost,
                        {
                            opacity: 0,
                            duration: duration,
                            onComplete: () => ghost.remove(),
                        },
                        0,
                    );
                }
            }
        });

        // 2. UPDATE & ENTER
        newElements.forEach((el) => {
            const oldData = snapshot.get(el.id);

            // --- NEW ELEMENT (ENTER) ---
            if (!oldData) {
                gsap.from(el, {
                    opacity: 0,
                    duration: duration,
                    ease: 'power1.in',
                    // startAt: 0,
                });
                return;
            }

            // --- EXISTING ELEMENT (UPDATE) ---

            // A. TRANSFORM
            if (oldData.transform) {
                const newTransform = el.getAttribute('transform') || '';
                if (newTransform !== oldData.transform) {
                    tl.fromTo(
                        el,
                        {attr: {transform: oldData.transform}},
                        {attr: {transform: newTransform}, duration: duration, ease: 'power1.inOut'},
                        0,
                    );
                }
            }

            // B. PATH (d)
            if (el.tagName === 'path' && oldData.d) {
                const newD = el.getAttribute('d') || '';
                if (newD !== oldData.d) {
                    const interpolator = createHybridPathInterpolator(oldData.d, newD);
                    const proxy = {t: 0};

                    tl.to(
                        proxy,
                        {
                            t: 1,
                            duration: duration,
                            ease: 'power1.inOut',
                            onUpdate: () => el.setAttribute('d', interpolator(proxy.t)),
                            onComplete: () => el.setAttribute('d', newD),
                        },
                        0,
                    );
                }
            }

            // C. POLYGON (points)
            if (el.tagName === 'polygon' && oldData.points) {
                const newPoints = el.getAttribute('points') || '';
                if (newPoints !== oldData.points) {
                    const interpolator = createHybridPathInterpolator(oldData.points, newPoints);
                    const proxy = {t: 0};

                    tl.to(
                        proxy,
                        {
                            t: 1,
                            duration: duration,
                            ease: 'power1.inOut',
                            onUpdate: () => el.setAttribute('points', interpolator(proxy.t)),
                            onComplete: () => el.setAttribute('points', newPoints),
                        },
                        0,
                    );
                }
            }

            // D. TEXT POSITION
            if (el.tagName === 'text' && oldData.x && oldData.y) {
                const newX = el.getAttribute('x') || '0';
                const newY = el.getAttribute('y') || '0';
                if (newX !== oldData.x || newY !== oldData.y) {
                    tl.fromTo(
                        el,
                        {attr: {x: oldData.x, y: oldData.y}},
                        {attr: {x: newX, y: newY}, duration: duration, ease: 'power1.inOut'},
                        0,
                    );
                }
            }
        });

        if (newSvgRoot.style.opacity === '0') {
            newSvgRoot.style.opacity = '1';
        }
    });
}
