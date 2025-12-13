export function assignStableIds(element: Element, parentId: string = 'root'): void {
    let currentId = element.id;

    if (!currentId) {
        if (element.tagName === 'text') {
            let textContent = element.textContent?.trim() || 'empty';
            textContent = textContent.replace(/📍/g, 'trigger').replace(/✔/g, 'success').replace(/✖/g, 'error');
            const safeText = textContent.replace(/[^a-zA-Z0-9]/g, '_');

            currentId = `${parentId}_text_${safeText}`;
        } else {
            const parent = element.parentElement;
            if (parent) {
                const siblings = Array.from(parent.children).filter((e) => e.tagName === element.tagName);
                const index = siblings.indexOf(element);
                currentId = `${parentId}_${element.tagName}_${index}`;
            } else {
                currentId = `${parentId}_${element.tagName}_0`;
            }
        }

        element.id = currentId;
    }
    const children = Array.from(element.children);
    children.forEach((child) => {
        assignStableIds(child, currentId);
    });
}
