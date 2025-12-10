interface User<T> {
    id: number;
    data: T;
    metadata: {
        createdAt: string;
    };
}

interface Wrapper<T> {
    value: T;
    status: 'ok' | 'error';
}

// Вот это мы хотим раскрыть:
const myVar: Wrapper<User<string[]>> = {
    value: {
        id: 1,
        data: ['hello'],
        metadata: {createdAt: 'now'},
    },
    status: 'ok',
};
