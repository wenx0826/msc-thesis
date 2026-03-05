# User Guide: Document-Based Process Model Explorer

## 1. Getting Started

### Accessing the Dashboard

Open the application in your browser (`index.html`). This is your command center.

- **Projects View:** See all your active digitization initiatives.
- **Quick Stats:** View high-level metrics on how many documents and models are currently in the system.

### Creating a New Project

1. Click the **"New Project"** button on the dashboard.
2. Enter a Project Name (e.g., "HR Onboarding 2026").
3. The project will appear in your list. Click it to enter the project view.

---

## 2. Managing Documents

Before you can model anything, you need a source of truth.

### Uploading Documents

1. Navigate to the **Documents** tab within your project.
2. Click **"Upload Document"**.
3. Select an HTML or Text file from your computer (e.g., Standard Operating Procedures, Policy Manuals).
4. The system stores these in the `/data/documents/` folder and registers them in the database.

### Document Viewer

Click on any uploaded document to inspect it. The viewer rendering allows you to read the raw content that will drive your process modeling.

---

## 3. The Workspace (Modeling)

This is the core of the application where text becomes a workflow. Navigate to `workspace.html` or click "Edit Model" on a specific document impact.

### Comparing Views

The Workspace is split into two panels:

- **Left Panel (Source):** Displays the uploaded document text.
- **Right Panel (Model):** Displays the interactive Process Graph (CPEE/BPMN style).

### Generating Models with AI

1. **Select Text:** Highlight a specific paragraph or section in the Left Panel that describes a process.
2. **Generate:** Click the **"Generate Component"** or **"LLM Extraction"** button context menu.
3. **Review:** The AI (Gemini/Autobpmn) will parse the text and insert the corresponding tasks, gateways, and events into the Right Panel.

### Manual Refinement

The AI gives you a head start, but human expertise is required.

- **Add Nodes:** Drag and drop extra tasks from the palette if the text was missing details.
- **Connect:** Draw lines between nodes to fix the sequence flow.
- **Properties:** Click a node to rename it or add execution attributes.

---

## 4. Traceability (Linking)

Traceability ensures your model is verifiable against the source text.

### Creating a Trace Link

1. **Select Node:** Click a task or gateway in the Process Graph (Right Panel).
2. **Highlight Text:** Select the specific sentence in the Source Document (Left Panel) that justifies this step.
3. **Link:** Click the **"Link Selection"** button.
4. **Verify:** The system saves this coordinate. In the future, clicking that Process Node will automatically scroll to and highlight the original text evidence.

---

## 5. Versioning & History

Detailed work requires safety nets.

### Saving Versions

- Click **"Save Model"** to commit your current graph structure to the database.
- The system creates a new version entry (e.g., _v1.0_, _v1.1_).

### Reviewing History

- Navigate to the **logs** or **history** section to see who changed what and when.
- You can revert to previous model states if a recent change was incorrect.

---

## 6. Analytics

Navigate to the `stats.html` page to see the health of your project.

- **Model Complexity:** Visual charts showing the number of nodes/edges per model.
- **Coverage:** Percentage of the document text that has been linked to a model (identifies ignored text).