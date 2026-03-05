User: Please extract an introduction from this dbpm project

Workspace: Collecting workspace informationBased on the codebase structure and content currently open in your workspace, here is an introduction to the **Document-Based Process Model Explorer (DBPME)** project.

### Project Overview
The **Document-Based Process Model Explorer (DBPME)** is a web application designed to bridge the gap between unstructured textual documents (such as SOPs or manuals) and structured process models. It utilizes Generative AI (LLMs) to assist users in extracting process logic while maintaining **traceability**—linking generated model elements back to specific text evidence in the source document to ensure trust and verification.

### Architecture

The project follows a standard client-server architecture:

*   **Backend:** A Node.js application using the **Fastify** framework. It is modularized by domain entities (`projects`, `documents`, `models`, `traces`) located in modules. Data is persisted using **SQLite** as defined in database.js.
*   **Frontend:** A web interface built with **jQuery** and specialized **CPEE** (Cloud Process Execution Engine) libraries for UI and graph rendering. The entry points include index.html (Dashboard) and workspace.html (main editor).

### Key Features

1.  **Project & Document Management**
    Users can organize work into projects and upload source documents. The system supports versioning for both documents and models, handled by repositories like `DocumentRepository` and `ModelVersionRepository`.

2.  **LLM-Driven Extraction**
    The application integrates with Large Language Models (referenced as Gemini or "autobpmn.ai") to generate process models from text. This logic is found in the API layer, specifically within the `generateModelLLM` function.

3.  **Traceability (Text-to-Model Linking)**
    A core differentiator is the "Trace" system. When a model is generated or edited, the specific text selections used as evidence are stored and linked to the model version. This is managed by the traces module and the database schema for `traces` in database.js.

4.  **Interactive Workspace**
    The workspace.html provides a dual-pane view: a document viewer for highlighting text and a process model editor (integrating BPMN/CPEE visualization) to refine the AI-generated output.

5.  **Analytics**
    A statistics module, accessible via stats.html, enables users to visualize project metrics, such as model complexity and document processing status.

### 1. Project & Asset Management

- **Create Project:** Users can initialize new workspaces to group related documents and models (`backend/modules/projects`).
- **Upload Source Documents:** Users can upload unstructured process documentation (e.g., HTML/Text files) to serve as the ground truth for modeling (`backend/modules/documents`, `data/documents`).
- **Manage Document Versions:** The system supports maintaining different versions or states of uploaded documents.

### 2. AI-Assisted Modeling (The Core Loop)

- **Generate Model from Text:** Within the `workspace.html` interface, users can select sections of text and invoke the LLM (Large Language Model) to automatically generate a BPMN/CPEE process model structure.
- **Refine Process Models:** Users can manually edit the generated graph structure (nodes, edges, gateways) using the visual editor in the workspace.
- **Version Control Models:** Users can save snapshots of their process models, creating a history of model evolution (`backend/modules/models`).

### 3. Traceability & Evidence

- **Create Trace Links:** Users can highlight specific text snippets in the document viewer and strictly link them to specific elements (tasks/gateways) in the process model (`backend/modules/traces`).
- **Verify Model Logic:** Users can click on a model element to see the corresponding original text highlighted, validating that the process logic matches the documentation.

### 4. Analysis & Monitoring

- **View Project Statistics:** Users can access a dashboard (`stats.html`) to view metrics such as the number of documents processed, model complexity, or completion status.
- **Audit Logging:** Administrators or users can view activity logs (`backend/modules/logs`) to see actions taken within the system (e.g., "Model Generated", "Document Uploaded").
- **Compare Workflows:** Users can visually compare different versions of a workflow or different workflows within a project (`workflow-viewer.html`).

### The Scenario: Digitizing the "Supplier Onboarding" Process

**User:** Sarah, a Process Analyst.  
**Goal:** Convert an old, unstructured HTML policy document into a formal customized process model.

#### Phase 1: Project Initialization

Sarah opens the application and lands on the **Dashboard** (`index.html`). She creates a new project named "Procurement Modernization".

- **Backend Action:** The `backend/modules/projects` module creates a new project entry in the SQLite database.
- **System State:** A new isolated workspace is ready.

#### Phase 2: Ingestion

Sarah enters the project and uploads the `Supplier_Onboarding_SOP.html` file into the repository.

- **Backend Action:** The API accepts the file, and `backend/utils/fileHelper.js` saves it to the `data/documents/` directory. The `documents` module records metadata in the database.
- **Frontend Action:** The document appears in the breakdown list.

#### Phase 3: The Workspace & AI Discovery

Sarah clicks "Open Workspace" (`workspace.html`) for this document. The screen splits into two panes:

1. **Left:** The messy text of the Supplier Onboarding SOP.
2. **Right:** An empty canvas (using the CPEE visualizer).

She highlights a dense paragraph describing how specific suppliers need a background check. She clicks the **"Generate Model"** button.

- **Backend Action:** The `models` API receives the text and queries the LLM service. It parses the natural language and returns a structured JSON graph.
- **Result:** A BPMN/CPEE graph appears on the right canvas, automatically drawing a Gateway: _Check Supplier Type -> (Exclusive XOR) -> Background Check / Quick Approval_.

#### Phase 4: Establishing Traceability (The Core Feature)

Sarah reviews the generated model. She notices the AI created a task labeled "Finance Review." She wants to ensure future auditors know _why_ this task exists.

1. She selects the "Finance Review" node in the graph.
2. She highlights the sentence in the text: _"All vendors exceeding $10k spend require fiscal sign-off."_
3. She clicks **"Link Trace"**.

- **Backend Action:** The `backend/modules/traces` module writes a specific link to the database, mapping the Model Element ID to the Document Selection Range.
- **Benefit:** Months later, if someone questions this task, clicking it will automatically scroll the document to that exact sentence.

#### Phase 5: Refinement and Versioning

Sarah realizes the process has changed slightly since the document was written. She manually drags a new "Email Notification" task into the graph using the editor tools.  
She clicks **"Save Version"**.

- **Backend Action:** The `backend/modules/models` repository saves a snapshot of the graph structure as "Version 1.0".
- **Audit:** The `backend/modules/logs` system records: `User Sarah saved Model V1 for Project X`.

#### Phase 6: Analysis

Finally, Sarah navigates to the **Statistics Page** (`stats.html`). She views a chart showing that her project now contains 1 processed document, 15 process nodes, and 7 verified trace links. The workflow feels complete and is now backed by tangible, traceable evidence.