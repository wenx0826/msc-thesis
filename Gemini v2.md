


### **Chapter 1: Introduction**

**1.1. Introduction to Business Process Management and Modeling**

**1.1.1. The Importance of Process Models** In today's competitive landscape, organizations continuously seek ways to optimize their operations. Business Process Management (BPM) provides a structured approach to achieve this by focusing on the identification, design, and analysis of workflows. A core component of BPM is process modeling, which uses standardized notations like **Business Process Model and Notation (BPMN)** to create visual representations of processes. These models are crucial for communication, training, and strategic decision-making.

**1.1.2. The Document-Centric Reality** While the benefits of formal process models are well-documented, many organizations still rely on unstructured or semi-structured documents (e.g., policy manuals, standard operating procedures, and reports) to describe their processes. This creates a significant challenge, as the knowledge contained within these documents remains disconnected from formal modeling initiatives. This document-centric reality highlights a fundamental gap between the documented "as-is" process and the modeled "to-be" state.

<br>

**1.2. Problem Statement: The Manual-to-Digital Gap**

**1.2.1. The Inefficiency of Manual Modeling** The current practice for translating text-based process descriptions into formal BPMN models is a manual, labor-intensive task. Process analysts must sift through lengthy documents, interpret natural language, and manually construct a process model. This process is not only time-consuming and costly but also prone to human error and subjective interpretation, leading to inconsistent and inaccurate models.

**1.2.2. The Need for a Software Solution** To address this inefficiency, there is a clear need for a software solution that can automate or semi-automate the translation process. Such a tool must be a user-friendly, web-based application that can process documents and provide a guided, interactive experience for building process models. The solution should reduce the manual effort, improve model accuracy, and make process analysis more accessible to a wider audience.

<br>

**1.3. Proposed Solution: The Document-based Process Model Explorer**

This thesis proposes the development of a web-based application called the **Document-based Process Model Explorer**. The application is designed to be an interactive platform that assists users in discovering and creating BPMN models directly from textual documents. Its core functionalities, as outlined in the mockup, include:

- **Document Management:** The ability to upload and manage multiple documents.
    
- **Text-to-Model Linking:** A unique feature that connects highlighted text in the document with corresponding elements in the process model.
    
- **Model Visualization & Editing:** An interactive canvas for viewing and refining the generated BPMN diagram.
    

**1.4. Research Questions**

This thesis is guided by the following primary and sub-research questions:

- **Main Research Question:** How can a web-based, interactive application effectively and efficiently assist users in generating accurate business process models from unstructured documents?
    
- **Sub-Question 1:** How can an NLP-driven backend be integrated into a web application to support the extraction of process elements from text?
    
- **Sub-Question 2:** What are the key design principles for a user interface that provides a seamless, interactive link between a document and its corresponding process model?
    
- **Sub-Question 3:** How does the system's performance and usability compare to manual methods of process modeling?
    

<br>

**1.5. Thesis Objectives and Scope**

The primary objectives of this thesis are to:

1. **Develop a Functional Prototype:** Design and implement a web-based prototype of the Document-based Process Model Explorer.
    
2. **Evaluate its Performance:** Conduct a user evaluation to measure the prototype's efficiency and accuracy.
    
3. **Validate the Approach:** Demonstrate the feasibility of combining NLP with a user-centric web interface to solve the text-to-model problem.
    

The scope is limited to the development of a proof-of-concept prototype. The thesis will focus on the technical implementation of the NLP backend and the interactive user interface. It will not cover advanced BPM features like simulation, conformance checking, or integration with external systems.

<br>

**1.6. Thesis Structure**

This thesis is organized as follows: Chapter 2 reviews the related academic and technical literature. Chapter 3 details the system architecture and methodology. Chapter 4 describes the implementation of the prototype. Chapter 5 presents the evaluation results. Chapter 6 concludes with a summary of findings and future work.

---

### **Chapter 2: Literature Review**

**2.1. Introduction**

This chapter provides a comprehensive review of the technologies and research areas that inform the development of the Document-based Process Model Explorer. The goal is to establish a foundation for the project's design choices and justify its contribution by examining the state of the art in process discovery, NLP, and web application design.

<br>

**2.2. Foundational Concepts**

**2.2.1. The BPMN Standard** The **BPMN 2.0** standard provides a graphical notation for specifying business processes. As a universally recognized standard, it offers a consistent way to represent processes, making it the ideal choice for the output of this project. The use of BPMN ensures that the generated models are readable and can be integrated into other BPM tools.

**2.2.2. Event-Log Based Process Discovery** Process mining, pioneered by **Wil van der Aalst**, is a field that focuses on discovering processes from event logs. This approach is highly effective when structured data is available. However, a significant gap exists in applying these methods to unstructured, textual data, which this thesis aims to address.

<br>

**2.3. Related Work in Text-to-Process Conversion**

**2.3.1. Rule-Based and NLP Approaches** Early research in text-to-model conversion primarily used rule-based Natural Language Processing (NLP). These methods rely on a predefined set of linguistic rules to map sentences to process elements. For instance, **Leopold et al. (2012)** demonstrated a system that uses syntactic analysis to extract process activities and their relationships. While these methods are transparent, they are often brittle and struggle with the ambiguity of natural language. More recent research has explored using machine learning models to improve accuracy, but these often lack an interactive component for user validation.

**2.3.2. Limitations of Existing Tools** Many existing text-to-model tools are academic prototypes or command-line scripts. They lack a robust, user-friendly interface and are not designed for interactive use. This creates a significant usability gap, as users cannot easily correct misinterpretations or refine the generated models. My project addresses this limitation by focusing on the development of a complete, web-based application.

<br>

**2.4. Technological and Architectural Foundations**

**2.4.1. Web Application Architecture** The proposed system will be a web application, adopting a client-server architecture. The backend will be responsible for the heavy computational tasks (document processing and NLP), while the frontend will handle the user interface and interactions. This separation ensures scalability and a responsive user experience.

**2.4.2. Natural Language Processing Libraries** The backend will utilize an NLP library like **spaCy** for its efficiency and robust capabilities. spaCy provides advanced features such as dependency parsing, which is crucial for understanding sentence structure, and Named Entity Recognition (NER), which can be adapted to identify process-specific entities like tasks and data objects.

**2.4.3. Frontend Frameworks and Libraries** The user interface will be developed using a modern frontend framework such as React or Vue.js, which are well-suited for building interactive single-page applications. For the BPMN visualization and editing, libraries like **bpmn.io** are ideal. These libraries provide a powerful, ready-to-use BPMN canvas that can be integrated into the web application, allowing me to focus on the core logic of the project rather than building a diagramming tool from scratch.

<br>

**2.5. User Interface and Interaction Design**

**2.5.1. Principles of Visual Analytics** The design of the Document-based Process Model Explorer is guided by the principles of visual analytics. A key principle is **linked views**, where different representations of the same data are synchronized. The interactive connection between the text panel and the model canvas is a direct application of this principle, providing users with a transparent and powerful way to understand and correct the model.

**2.5.2. Human-in-the-Loop Systems** The "explorer" concept is a classic example of a **human-in-the-loop system**. Instead of a fully automated, black-box approach, my design acknowledges that human validation is essential for achieving high accuracy. The system acts as a co-pilot, performing the tedious work of initial extraction while leaving the critical final decisions to the user.

<br>

**2.6. Synthesis and Project Justification**

While the individual components for this project—NLP libraries, BPMN diagramming tools, and web frameworks—already exist, no single, integrated, and user-centric web application effectively combines them to solve the text-to-model problem. This project's unique contribution is not a new algorithm but the **engineering and integration** of these existing technologies into a cohesive, usable, and valuable tool. By creating the Document-based Process Model Explorer, I will demonstrate the feasibility of this approach and provide a practical solution to a persistent challenge in BPM.