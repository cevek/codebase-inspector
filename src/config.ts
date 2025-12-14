export const CONFIG = {
    apiClients: {
        RestAPI: {
            methods: {get: 'GET', post: 'POST', put: 'PUT', del: 'DELETE'},
            urlArgIndex: 1,
        },
        gatewayBookingClient: {
            methods: {GET: 'GET', POST: 'POST', PUT: 'PUT', DELETE: 'DELETE'},
            urlArgIndex: 0,
        },
    },
    layers: [
        {regex: /\/services\/(?!dataProviders\/)/, type: 'S'},
        {regex: /\/dataProviders\//, type: 'DP'},
        {regex: /\/entities\//, type: 'E'},
        {regex: /\/mappings\//, type: 'M'},
        {regex: /\/components\//, type: 'V'},
        {regex: /\/containers\//, type: 'C'},
        {regex: /\/layouts\//, type: 'L'},
    ],
    actions: {
        typeKeywords: ['ActionCreator', 'CallHistoryMethodAction', '@@router/'],
    },
    epics: {
        rootEpicNames: ['rootEpic'],
        typeKeywords: ['Epic'],
        operators: {filter: 'ofType'},
    },
    reducers: {
        creators: ['createSlice', 'createReducer'],
        builderMethods: {
            case: 'addCase',
            matcher: 'addMatcher',
            default: 'addDefaultCase',
        },
    },
    components: {
        types: [
            ' => JSX.Element',
            '.JSX.Element',
            '.JSXElementConstructor',
            'React.FC',
            'React.FunctionComponent',
            'React.NamedExoticComponent',
            'React.MemoExoticComponent',
            'React.LazyExoticComponent',
            'React.ForwardRefExoticComponent',
            'React.ComponentType',
            '.OverridableComponent',
        ],
    },
} as const;
