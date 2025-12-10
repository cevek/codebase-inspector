# Frontend Project Graph Explorer

This tool analyzes TypeScript frontend projects, specifically focusing on Redux epics and actions, to generate an interactive graph visualizing their relationships.

## Usage

To analyze your project, run the following command in the root directory of your TypeScript project (where `tsconfig.json` is located):

```bash
npx fe-explorer
```

This will start a local server and open a web page displaying the project's dependency graph.

## How It Works

The tool performs the following steps:

1.  **Analyzes Project:** It traverses the TypeScript project specified by the `tsconfig.json` in your current working directory.
2.  **Finds Epics and Actions:** It identifies Redux epics and actions within the codebase.
3.  **Generates Graph:** It constructs a graph of dependencies and relationships.
4.  **Launches Frontend:** It starts a web server to host a frontend application that visualizes the generated graph. The frontend provides features for filtering and exploring the project structure.

## Development

To run the project in a development environment:

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  The frontend is located in the `frontend` directory and can be developed separately.

## Key Technologies

*   **TypeScript:** For code analysis.
*   **Vite:** For the frontend development server.
*   **React:** For the graph visualization frontend.
*   **Graphviz:** Used for graph layout generation.
