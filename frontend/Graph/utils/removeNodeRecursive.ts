// --- Тип для функции-чекера ---

import {Graph, Id, Item} from '../../../types';

// Возвращает true, если ноду нужно удалить
export type RemoveChecker = (node: Item, nodeId: Id) => boolean;

/**
 * Рекурсивно удаляет ноду и её зависимые ноды, если они становятся сиротами.
 * @param graph Исходный граф
 * @param targetNodeId ID ноды для удаления
 * @param shouldRemove Функция-предикат, подтверждающая удаление
 * @returns Новый экземпляр графа (иммутабельно)
 */
export const removeNodeRecursive = (graph: Graph, targetNodeId: Id, shouldRemove: RemoveChecker) => {
    // 1. Создаем поверхностную копию графа, чтобы не мутировать исходный объект.
    // Важно: копируем relations и nodes, чтобы изменения не затрагивали оригинал.
    const newGraph: Graph = {
        nodes: new Map(graph.nodes),
        relations: new Map(graph.relations),
    };

    // Внутренняя рекурсивная функция
    const processNode = (id: Id) => {
        const node = newGraph.nodes.get(id);

        // Если ноды уже нет (была удалена ранее) или чекер запретил удаление
        if (!node || !shouldRemove(node, id)) {
            return;
        }

        // 2. Получаем список детей перед удалением самой ноды
        const children = newGraph.relations.get(id) || [];

        // 3. Удаляем саму ноду и её исходящие связи
        newGraph.nodes.delete(id);
        newGraph.relations.delete(id);

        // 4. Очистка входящих связей (Cleanup):
        // Проходимся по всем остальным нодам и удаляем удаляемую ноду (id) из их списков детей.
        // Это нужно, чтобы граф оставался консистентным и на удаленную ноду никто не ссылался.
        for (const parentId of newGraph.relations.keys()) {
            const children = newGraph.relations.get(parentId);
            if (children) {
                newGraph.relations.set(parentId, children.filter((childId) => childId !== id));
            }
        }

        // 5. Обработка детей (сирот)
        children.forEach((childId) => {
            // Проверяем, остались ли у ребенка ДРУГИЕ родители.
            // Мы ищем childId в значениях newGraph.relations.
            const hasOtherParents = newGraph.relations.values().some((kids) => kids.includes(childId));

            // Если других родителей нет, рекурсивно пытаемся удалить ребенка
            if (!hasOtherParents) {
                processNode(childId);
            }
        });
    };

    // Запускаем процесс
    processNode(targetNodeId);

    return newGraph;
};
