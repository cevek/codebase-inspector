# FE Explorer

**FE Explorer** is a powerful static analysis and visualization tool for React, Redux, and TypeScript projects. Unlike simple dependency graphs, it uses the TypeScript Compiler API to deeply understand your project's structure, type system, and data flow.

It automatically generates an interactive, directed graph of your application's architecture—connecting Components, Actions, and Epics—allowing you to refactor, debug, and onboard developers with clarity.

## 🚀 Quick StartNo installation required. Run the tool directly in your project root (where your `tsconfig.json` is located):

```bash
npx fe-explorer
```

The tool will analyze your project and automatically open the web interface in your browser.

---

## 💡 Key Features
### 🧠 Robust Static Analysis (Backend)Leveraging the TypeScript AST and type system for precise identification:

* **React Components:** Detects standard and `lazy` loaded components.
* **Redux Actions:** Tracks usage within dispatched actions and reducers.
* **Redux-Observable Epics:** Deep analysis of Epics including:
* `ofType(Action)` triggers.
* Dispatched downstream actions.
* **API Calls:** Identifies HTTP methods and URLs used within streams.



### 🎨 Architecture Visualization
* **Sea of Nodes:** Visualizes Actions, Components, and Epics.
* **Clustering:** Groups nodes into **Modules** (Clusters) for high-level architectural views.
* **Layer Identification:** Nodes are color-coded based on their architectural layer:
* `Entity`
* `Service`
* `Data Provider`
* `Mappings`
* `Component Container`
* `Component View`
* `Component Layout`



### 🎮 Interactive Graph & UI
* **Focus Mode:** Isolate specific nodes to view only their relevant subtree (dependencies and dependents).
* **IDE Integration:** Right-click any node to open the exact file, line, and column in your preferred IDE.
* **Smart Graph Manipulation:**
* **Hide/Remove:** Recursively hide nodes backward or forward.
* **Restore:** Restore individual nodes or reset all.
* **Noise Reduction:** Option to embed generic actions (Success, Error, Trigger) directly into Epic nodes to minimize graph size.
* **Reveal:** Show hidden dependencies with visual counters indicating how many connections are currently hidden.


* **Layout Engines:** Switch between Top-to-Bottom or Left-to-Right layouts.
* **Grouping:** Toggle module grouping on or off.

### ⚡ User Experience
* **State Sharing:** URL synchronization allows you to share deep-links with teammates—they see exactly what you see.
* **Search:** Autocomplete search to quickly find and focus on nodes.
* **Navigation:** Pan, zoom, and navigate nodes using keyboard arrow keys.
* **History:** Full Undo/Redo support for graph manipulations.
* **Animations:** Smooth transitions and animations for auto-layout changes.
* **Context Menu:** Right-click context menu for quick actions on nodes.

---

## 🛠 Tech Stack
* **Analysis:** TypeScript Compiler API
* **Rendering:** Graphviz (DOT)
* **Frontend:** React