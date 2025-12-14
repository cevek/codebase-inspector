import {Graph} from '../../Graph';
import {usePersistentState} from '../../hooks/usePersistentState';
import { Id } from '../../types';

const ideOptions = [
    {name: 'VSCode', value: 'vscode', link: (url: string) => 'vscode://file/' + url},
    {name: 'Sublime Text', value: 'sublime', link: (url: string) => 'subl://open/' + url},
    {
        name: 'WebStorm',
        value: 'webstorm',
        link: (url: string) => {
            const [path, line, column] = url.split(':');
            return 'webstorm://open?file=' + encodeURIComponent(path) + '&line=' + line + '&column=' + column;
        },
    },
    {name: 'Windsurf', value: 'windsurf', link: (url: string) => 'windsurf://file/' + url},
    {name: 'Cursor', value: 'cursor', link: (url: string) => 'cursor://file/' + url},
] as const;

export type IdeItem = (typeof ideOptions)[number];
export type IdeValue = (typeof ideOptions)[number]['value'];

export const useIde = (graphData: Graph) => {
    const [selectedIde, setSelectedIde] = usePersistentState<IdeValue>({key: 'selectedIde'}, ideOptions[0].value);

    const handleOpenFileInIde = (id: Id) => {
        const node = graphData.nodes.get(id);
        if (node) {
            const ide = ideOptions.find((ide) => ide.value === selectedIde);
            if (ide) {
                window.location.href = ide.link(node.location.url);
            }
        }
    };

    return {
        ideOptions,
        selectedIde,
        setSelectedIde,
        handleOpenFileInIde,
    };
};
