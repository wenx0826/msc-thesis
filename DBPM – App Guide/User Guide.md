## 1. Introduction

  

The Document-Based Process Model Explorer (DBPME) is a web-based application designed to help users create process models directly from textual documents such as Standard Operating Procedures (SOPs), manuals, or internal guidelines.

  

The system combines document analysis, AI-assisted extraction, and process modeling in one environment. Users can upload documents, highlight process-related text, generate workflow elements with the help of Large Language Models (LLMs), and refine the resulting models manually.

  

A key feature of DBPME is traceability: each process model element can be linked to the exact sentence or paragraph from which it was derived. This ensures that models remain verifiable and grounded in their original documentation.

---

# 2. Getting Started

  

### Accessing the Application

  

Open the application in your browser by launching:
This will take you to the Dashboard, which serves as the main entry point.

  

The dashboard provides:

- Projects View – overview of all modeling projects
    
- Quick Statistics – number of documents and models stored in the system
    

---

### Creating a New Project

  

Projects help organize documents and models related to a specific process.

  

To create a project:

1. Click “New Project” on the dashboard.
    
2. Enter a project name (for example: HR Onboarding 2026).
    
3. The project will appear in the project list.
    
4. Click the project name to open it.
    

---

# 3. Uploading and Viewing Documents

  

Before creating a process model, you must upload a source document.

  

### Uploading a Document

1. Open a project.
    
2. Navigate to the Documents tab.
    
3. Click “Upload Document”.
    
4. Select an HTML or text file from your computer.
    

  

Typical examples include:

- SOP documents
    
- operational manuals
    
- internal policy descriptions
    

  

Once uploaded, the document will appear in the document list.

---

### Viewing a Document

  

Click on a document to open the Document Viewer.

  

The viewer allows you to:

- read the full document
    
- identify relevant process descriptions
    
- select text passages for modeling
    

---

# 4. Creating Process Models

  

Process models are created in the Workspace.

  

You can access it by:

- clicking “Edit Model” for a document
    
    or
    
- opening workspace.html
    

---

## Workspace Layout

  

The workspace contains two main panels.

  

### Left Panel – Source Document

  

Displays the uploaded document text.

  

You can scroll through the document and highlight relevant sections.

  

### Right Panel – Process Model

  

Displays the interactive process model in a BPMN-style graph.

  

This panel shows:

- tasks
    
- gateways
    
- events
    
- sequence flows
    

  

The side-by-side layout allows users to compare textual descriptions and model structures while working.

---

# 5. Generating Models with AI


DBPME can automatically generate model elements using AI.

  
### Generating Model Components

1. Highlight a paragraph in the Source Document panel.
    
2. Open the context menu.
    
3. Click “Generate Component” or “LLM Extraction”.
    
4. The AI analyzes the text and generates corresponding process elements.
    

  

Generated elements may include:

- tasks
    
- decision gateways
    
- start or end events
    

  

The generated components appear in the Process Model panel.

---

# 6. Refining the Model

  

AI-generated models often require manual adjustments.

  

You can refine the model by:

  

### Adding Elements

  

Drag additional nodes from the modeling palette to the canvas.

  

### Connecting Nodes

  

Draw connections between nodes to define the process flow.

  

### Editing Properties

  

Click on a node to:

- rename tasks
    
- edit attributes
    
- adjust execution properties
    

---

# 7. Linking Model Elements to Text 

  

Traceability allows users to verify how the model relates to the source document.

  

### Creating a Trace Link

1. Select a node in the process model.
    
2. Highlight the relevant text passage in the document.
    
3. Click “Link Selection”.
    

  

The system stores the link between the model element and the selected text.

---

### Viewing Trace Links

  

When selecting a linked node in the model:

- the system automatically scrolls to the corresponding text
    
- the source sentence is highlighted
    

  

This helps users quickly verify the origin of each process step.

---

# 8. Saving and Versioning Models

  

DBPME keeps track of different versions of process models.

  

### Saving Your Work

  

Click “Save Model” to store the current version.

  

Each save creates a new version entry, for example:

- v1.0
    
- v1.1
    
- v2.0
    

---

### Viewing Version History

  

The History or Logs section shows:

- model changes
    
- timestamps
    
- previous versions
    

  

Users can restore earlier versions if needed.

---

# 9. Viewing Project Analytics

  

Project statistics are available on the analytics page.

  

Open:
### Model Complexity

  

Displays charts showing:

- number of nodes
    
- number of connections
    
- overall model complexity
    

  

### Document Coverage

  

Shows the percentage of document text that has been linked to process models.

  

This helps identify:

- modeled sections
    
- text that has not yet been analyzed.