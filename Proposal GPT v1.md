# **Document-based Process Model Explorer**

## **1. Introduction**

### **1.1 Motivation**

Process models play a central role in understanding, documenting, and improving complex workflows across industries. They serve as blueprints for system development, process improvement, and regulatory compliance. For requirements engineers in software engineering, process models help bridge the gap between stakeholder needs and system implementation. For process designers, they provide a structured way to translate information gathered through stakeholder interviews into actionable process flows. In domains where regulations and standards are crucial, process designers often rely on dense regulatory documents as their primary source of process requirements.

However, linking these diverse information sources—textual documents, regulatory guidelines, and stakeholder input—to process models is often cumbersome and error-prone. The lack of interactive tools that support bidirectional traceability between source documents and process models hampers collaboration, slows iteration cycles, and increases the risk of misinterpretation.

A **Document-Based Process Model Explorer** aims to bridge this gap by providing an interactive environment where textual information and process models can be explored side-by-side, with seamless navigation between relevant passages in documents and corresponding elements in models. This capability could significantly enhance process model accuracy, traceability, and user experience, especially in contexts involving complex regulatory or technical documentation.

---

### **1.2 Research Questions**

**RQ1 – Related Work:**  
What existing tools, techniques, or frameworks support interactive traceability between documents and process models, and how do they address the needs of requirements engineers, process designers, and regulatory compliance specialists?

**RQ2 – Tool Usability & User Experience:**  
How can interactive traceability between documents and process models be effectively implemented to improve usability and comprehension for stakeholders?

**RQ3 – Evaluation:**  
How does the use of the Document-Based Process Model Explorer influence the quality, efficiency, and accuracy of process modeling in real-world case studies?

---

### **1.3 Contribution**

This thesis proposes the design and implementation of an **interactive process modeling tool** that integrates:

**Document-driven model creation and navigation**, enabling users to highlight document excerpts and link them directly to model elements.

**Bidirectional traceability** between source documents and process models, allowing navigation from text to model and vice versa.

**Support for real-world process modeling contexts**, including regulatory-driven modeling, software engineering requirements gathering, and multi-stakeholder collaboration.

The contribution will be both **technical**—in the form of a working prototype—and **empirical**, through evaluation in real-world scenarios.

---

### **1.4 Methodology**

The research will adopt the **Design Science in Information Systems** approach (Hevner et al.), which emphasizes the creation and evaluation of IT artefacts to solve identified problems.

**Design Science Summary:**

**Purpose:** Create and evaluate artefacts that address relevant organizational problems.

**Core Elements:**

**Stakeholders:** End-users (requirements engineers, process designers, compliance officers).

**Artefacts:** Document-Based Process Model Explorer prototype.

**Activities:** Problem identification, design and development, demonstration, evaluation, and communication.

**In My Case:**

**Stakeholders:**

Requirements engineers (Software Engineering)

Process designers (stakeholder-interview-driven)

Process designers (document-driven)

**Artefacts:**

Web-based process modeling tool integrating side-by-side document and BPMN model views with interactive traceability.

**Steps:**

Identify user requirements through literature review and interviews.

Design and implement prototype.

Conduct usability testing and case studies.

Evaluate results against RQ1–RQ3.

---

### **1.5 Evaluation**

The evaluation will be conducted in three stages, aligned with the research questions:

**For RQ1:** Literature review and feature comparison of existing tools.

**For RQ2:** Usability testing with target users, employing think-aloud protocols, System Usability Scale (SUS), and qualitative feedback.

**For RQ3:** Case studies in real-world modeling contexts, measuring process modeling time, error rates, and stakeholder satisfaction before and after tool adoption.

---

### **1.6 Structure**

The thesis will be organized as follows:

**Introduction:** Problem background, motivation, research questions, contributions, methodology, and structure.

**Background & Related Work:** Process modeling fundamentals, document-driven modeling, and review of existing tools (CPEE, NotebookLM, BPMN-from-text systems).

**Requirements Analysis:** Elicitation of functional and non-functional requirements from literature and stakeholder interviews.

**Design & Implementation:** Architecture, data flow, interface design, and technical implementation details of the Document-Based Process Model Explorer.

**Evaluation:** Usability testing setup, case study methodology, and results analysis.

**Discussion:** Interpretation of findings, limitations, and implications for practice.

**Conclusion & Future Work:** Summary of contributions and directions for further research.

### **2 Related Work**