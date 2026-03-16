Prompt: 
# A Proposal for a Document-based Process Model Explorer: An Interactive Visual Analytics Approach to Bridging Unstructured Text and Formal Process Models

## 1. Introduction

### 1.1. The Challenge of Latent Process Knowledge in Unstructured Documents

A substantial volume of organizational process knowledge is not captured within the structured event logs of enterprise systems but remains latent within vast repositories of unstructured documents.1 These documents, including standard operating procedures (SOPs), policy manuals, project reports, technical documentation, and interview transcripts, contain rich, context-specific descriptions of how work is actually performed. However, this knowledge is inaccessible to the automated analysis and optimization techniques that are central to modern Business Process Management (BPM).3

The manual extraction of this latent knowledge and its subsequent modeling into formal representations is a primary bottleneck in the BPM lifecycle. This process is exceptionally time-consuming, resource-intensive, and prone to subjective interpretation by the business analyst performing the task.4 Organizations can spend hundreds of thousands of dollars annually on these manual modeling efforts, which require specialized expertise in formal notations such as the Business Process Model and Notation (BPMN).6 This high barrier to entry often results in process documentation that is incomplete, outdated, or inaccurate, thereby undermining critical business initiatives that depend on a clear understanding of "as-is" processes, including compliance audits, digital transformation, and automation projects.4 The gap between the domain experts who hold the process knowledge and the BPMN specialists who formalize it often leads to miscommunication and models that do not faithfully represent operational reality.9

### 1.2. Motivation: Bridging Text and Model through Interactive Visualization

The fundamental problem this research addresses is the significant cognitive and semantic gap that exists between unstructured, human-readable textual descriptions and structured, machine-executable process models.10 While BPMN was designed to serve as a common language to bridge the divide between business and technical stakeholders, its effective creation and validation still necessitate a degree of training and expertise that many domain experts lack.12 This disenfranchises the very individuals who understand the processes most intimately from participating directly in their formalization.

Recent and rapid advancements in the field of Natural Language Processing (NLP), particularly the advent of powerful Large Language Models (LLMs), present a transformative opportunity to automate the initial translation from text to a formal BPMN model.9 However, a fully automated, "black box" generation approach is inherently limited. The ambiguity, nuance, and contextual dependencies of natural language mean that any automatically generated model is, at best, a high-fidelity draft that requires rigorous validation, contextual refinement, and correction by a human expert.11 The true challenge is not merely one of translation but of creating a trustworthy and verifiable representation.

This project, the "Document-based Process Model Explorer," is motivated by the critical need for a _human-in-the-loop_ system that moves beyond static generation. The innovation, as conceptualized in the project's user interface mockup, lies in the creation of an **interactive visual analytics environment**.16 This environment is designed to facilitate a dialogue between the user and the automated generation system. Instead of simply presenting a final model, the Explorer will allow users to visually trace the connections between source text fragments and their corresponding model elements, iteratively refine the model through direct manipulation and feedback, and ultimately validate its correctness against the source document. This interactive paradigm directly confronts the limitations of one-shot generation by empowering the user to become an active participant in the sensemaking and validation process, ensuring the final model is both formally correct and semantically faithful to the original procedural knowledge.

### 1.3. Research Questions and Core Contributions

To address the challenges and motivations outlined above, this thesis will be guided by two primary research questions:

- **RQ1: Feasibility and Quality.** To what extent can modern NLP techniques, specifically LLM-based pipelines, automatically generate syntactically and semantically correct BPMN 2.0 models from unstructured procedural texts?
    
- **RQ2: Interaction and Usability.** How can an interactive visual interface, featuring bidirectional linking between text and model elements, enhance a user's ability to understand, validate, and refine automatically generated process models?
    

The pursuit of these questions will yield three core contributions to the fields of BPM and Human-Computer Interaction (HCI):

1. **A Novel System Architecture:** The design and implementation of an integrated, web-based platform that synergistically combines a sophisticated NLP-based process extraction engine with an interactive BPMN visualization and editing front-end, realizing the vision presented in the user's mockup.
    
2. **An Interactive Exploration Paradigm:** The development and application of a bidirectional synchronization mechanism that visually and dynamically links textual phrases to their corresponding BPMN elements. This feature provides a novel and intuitive method for model validation, traceability, and exploration, moving beyond the state-of-the-art in static model generation.
    
3. **An Empirical Evaluation:** A comprehensive, multi-faceted evaluation of the developed system. This evaluation will rigorously assess both the objective quality of the automatically generated models against a gold standard and the subjective usability and effectiveness of the interactive exploration environment through a formal user study.
    

By focusing on the synergy between automated generation and human-led refinement, this project aims to create a tool that can significantly lower the technical barriers to entry for business process analysis. Such a system has the potential to democratize the practice, enabling subject matter experts—who possess deep process knowledge but may lack formal modeling skills—to take a more direct and active role in documenting, analyzing, and improving their organization's operations.6

## 2. Background and State of the Art

### 2.1. Foundations of Business Process Modeling with BPMN 2.0

Business Process Model and Notation (BPMN) has become the de facto international standard for graphically representing business processes.9 Its primary value lies in providing a standardized, unambiguous visual language that is intuitive for business stakeholders yet capable of representing complex process semantics for technical implementation.13 This dual nature allows BPMN to serve as a crucial bridge, closing the common communication gap between process design activities, which are often led by business analysts, and process implementation, which is handled by software developers.13

The BPMN 2.0 specification defines a rich set of graphical elements for modeling. For the scope of this project, which focuses on extracting control-flow logic from procedural texts, the most relevant elements include:

- **Flow Objects:** These are the main graphical elements that define the behavior of a business process.
    
    - **Events:** Indicate something that "happens" during the course of a process. They are typically categorized as Start, Intermediate, and End events.13
        
    - **Activities:** Represent work that is performed within a process. These can be atomic (Tasks) or compound (Subprocesses), which hide a more detailed process model within them.13
        
    - **Gateways:** Used to control the divergence and convergence of sequence flows. Key types include Exclusive (XOR) for conditional branching, Parallel (AND) for concurrent execution, and Inclusive (OR) for complex decision points.13
        
- **Connecting Objects:**
    
    - **Sequence Flow:** A solid line with an arrowhead that shows the order in which activities will be performed in a process.13
        

A foundational understanding of these core elements is essential, as they constitute the target vocabulary and structure that the proposed system's NLP engine must identify and extract from unstructured textual sources.

### 2.2. The Evolution of Process Discovery: From Event Logs to Text Mining

The field of process discovery has traditionally been dominated by a discipline known as Process Mining. This data-driven approach automatically constructs "as-is" process models by analyzing structured event logs generated by enterprise systems such as Enterprise Resource Planning (ERP) or Customer Relationship Management (CRM) platforms.1 Each event in the log typically contains a case ID, an activity name, and a timestamp, which allows algorithms to piece together the actual execution paths of a process.

While powerful, a significant limitation of traditional process mining is its reliance on the existence of high-quality, structured event logs. Many critical business activities, particularly those involving unstructured communication, human decision-making, or offline tasks, are never recorded in these systems.1 This knowledge, often referred to as "dark matter," is instead captured in unstructured formats like emails, chat logs, and procedural documents.3

This limitation has spurred the growth of a complementary field: Automated Business Process Discovery (ABPD) from unstructured text.5 This emerging area aims to apply text mining and NLP techniques to these document-based sources to discover and model the "hidden" processes they describe.1 The benefits of this approach are substantial, offering greater accuracy and objectivity compared to manual interviews, providing unprecedented visibility into end-to-end workflows that span multiple systems, and uncovering new opportunities for process improvement and automation that would be invisible to log-based analysis alone.4 This thesis project is situated at the forefront of this research direction, directly tackling the challenge of transforming unstructured document-based knowledge into formally structured and analyzable BPMN models.

### 2.3. A Survey of NLP Techniques for Process Element Extraction

The central technical challenge in text-based process discovery is the automated transformation of natural language into the discrete, structured elements of a BPMN model. This requires a sophisticated NLP pipeline capable of identifying activities, actors, control-flow logic (such as conditions and parallelism), and the sequential relationships that connect them. The approaches to this problem have evolved significantly over time.

#### 2.3.1. Rule-Based and Traditional Machine Learning Approaches

Initial forays into this domain primarily relied on rule-based systems that employed hand-crafted linguistic patterns and syntactic analysis. For instance, a common heuristic was to identify tasks by looking for verb-object pairs (e.g., "approve invoice") using dependency parsing to understand the grammatical structure of sentences.11 While these methods can achieve high precision for simple, formulaic texts, they are inherently brittle and struggle with the vast linguistic variation and ambiguity present in real-world documents.21

To overcome this rigidity, researchers turned to supervised machine learning techniques. This paradigm reframes the problem as a series of classification and extraction tasks. Named Entity Recognition (NER) models can be trained on annotated datasets to identify and classify specific phrases as 'Activity', 'Actor', 'Business Object', or 'Conditional Clause'.20 Subsequently, Relation Extraction (RE) models can be used to identify the relationships between these entities, such as determining that one activity follows another.24 Foundational NLP libraries like spaCy and NLTK provide the essential tools, such as tokenization, part-of-speech tagging, and dependency parsing, that serve as building blocks for these complex pipelines.11 However, the major drawback of these approaches is their heavy reliance on large, manually annotated training datasets, which are expensive and time-consuming to create for the specialized domain of business processes.

#### 2.3.2. The Emergence of Large Language Models in Process Generation

The recent emergence of Large Language Models (LLMs), such as the GPT family of models, has catalyzed a paradigm shift in NLP and, by extension, in text-based process discovery.10 These models, pre-trained on vast internet-scale text corpora, have demonstrated a remarkable ability to understand complex, nuanced language and generate structured outputs with minimal or no task-specific training (a technique known as zero-shot or few-shot learning).9

Several recent research efforts and commercial tools have begun to leverage LLMs for end-to-end Text-to-BPMN conversion. In this approach, a textual process description is provided to an LLM via a carefully engineered prompt, and the model is instructed to directly generate a structured representation of the process, such as BPMN 2.0 XML or an intermediate JSON format.9 This method significantly lowers the barrier to entry and can handle a wide range of linguistic styles and complexities.9

However, this end-to-end approach is not without its challenges. There exists a fundamental tension between the probabilistic, and at times creative, nature of LLMs and the strict, formal requirements of the BPMN 2.0 standard. LLMs are generative models that are known to be susceptible to "hallucinations"—generating plausible but factually incorrect or logically inconsistent information.30 A single misplaced tag or an illogical sequence flow generated by an LLM can render an entire BPMN XML file invalid and unusable.13

This tension has given rise to a more robust, hybrid approach. Systems like the recently proposed Nala2BPMN use LLMs for the tasks at which they excel—semantic understanding, entity extraction, and resolving ambiguity—to produce a structured intermediate representation (e.g., a JSON object listing activities and their dependencies). This structured output is then fed into a deterministic, rule-based algorithm that is responsible for constructing the final, syntactically valid BPMN 2.0 model.30 This hybrid architecture leverages the strengths of both paradigms: the semantic flexibility of LLMs and the structural guarantees of algorithmic generation. This project will adopt and extend this hybrid model, as it offers the most promising path to generating models that are both semantically rich and formally correct.

|Approach|Core Principle|Strengths|Weaknesses|Key References|
|---|---|---|---|---|
|**Rule-Based/Syntactic**|Relies on predefined linguistic patterns and grammatical structures.|High precision for simple, standardized text; interpretable logic.|Brittle; fails with linguistic variation; high manual effort to create and maintain rules.|20|
|**Traditional ML (NER+RE)**|Supervised learning on manually annotated datasets to classify entities and relations.|More robust to linguistic variation than rule-based systems.|Requires large, expensive annotated datasets; models components in isolation, potentially missing holistic context.|20|
|**End-to-End LLM**|Zero/few-shot prompting of a large, pre-trained generative model to directly output BPMN.|High flexibility; handles complex and ambiguous language well; low initial setup effort.|Prone to hallucinations; may generate syntactically invalid or logically inconsistent BPMN; lacks interpretability.|14|
|**Hybrid LLM (Proposed)**|LLM for semantic extraction to an intermediate format; deterministic algorithm for final model construction.|Balances semantic flexibility with structural guarantees; mitigates hallucination risk; allows for user validation at intermediate steps.|More complex system architecture than end-to-end LLM.|30|

### 2.4. Paradigms for Interactive Process Model Analysis and Refinement

The automated generation of a process model, regardless of the technique used, is only the first step in a larger knowledge discovery workflow. Particularly for knowledge-intensive and non-routine processes, models must be treated as dynamic artifacts that can be explored, validated, and adapted by domain experts.32 The proposed system's interactive features are therefore grounded in established principles from the fields of Visual Analytics and Interactive Machine Learning.

Visual Analytics (VA) is a discipline focused on the science of analytical reasoning facilitated by interactive visual interfaces. It emphasizes the powerful synergy that can be achieved by combining automated data analysis techniques with the perceptual and cognitive abilities of a human analyst.16 The core principle of VA, often summarized as "Analyze First, Show the Important, Zoom, Filter and Analyze Further, Details on Demand," provides a theoretical foundation for the design of the Document-based Process Model Explorer.16 The automated model generation serves as the "Analyze First" step. The interactive interface then empowers the user to "Zoom and Filter" by focusing on specific parts of the text or model, and to get "Details on Demand" through features like the properties panel.

Relatedly, the field of Interactive Machine Learning explores systems where human users provide feedback to iteratively guide and refine the behavior of a machine learning model.36 The "Regenerate" button envisioned in the mockup is a direct application of this paradigm. It creates a feedback loop where the user can provide corrective input—either by modifying the source text or providing explicit instructions—to steer the LLM towards generating a more accurate and contextually appropriate process model. This collaborative approach transforms the user from a passive consumer of a generated artifact into an active co-creator, which is essential for building trust and ensuring the final model's validity. The future of professional modeling tools, such as those offered by ARIS and viflow, will likely incorporate such AI-powered "co-pilots" that assist rather than replace the human modeler, and this project serves as a research prototype for this emerging paradigm of human-AI co-creation in the BPM domain.38

## 3. Proposed System: The Document-based Process Model Explorer

### 3.1. Conceptual Framework and System Architecture

The Document-based Process Model Explorer will be architected as a modern, client-server web application to ensure accessibility, scalability, and a responsive user experience. The system is conceptually divided into three main tiers: a frontend client, a backend server, and an external LLM service.

- **Frontend (Client):** This will be a Single-Page Application (SPA) running entirely in the user's web browser. It is responsible for rendering the entire user interface as depicted in the mockup, including the document viewer, the interactive BPMN canvas, the properties panel, and the lists for managing documents and models. All user interactions, such as text highlighting, model element selection, and editing, will be handled by the client-side application to provide a fluid and immediate experience.
    
- **Backend (Server):** This component will be implemented as a service that exposes a RESTful API for the frontend to consume. Its primary responsibilities include handling file uploads, orchestrating the complex NLP pipeline for process model generation, persisting documents and their associated models in a repository, and serving this data back to the client upon request.
    
- **High-Level Workflow:** The interaction between these components follows a clear, logical sequence:
    
    1. The user uploads a document (e.g., a.txt,.docx, or.pdf file) through the frontend interface.
        
    2. The frontend sends the document file to the backend via an API call.
        
    3. The backend's "Transformation Engine" is invoked. It processes the document's text through the NLP pipeline and generates a corresponding BPMN 2.0 XML representation.
        
    4. The backend stores the original document, the generated BPMN XML, and the crucial mapping data that links text to model elements.
        
    5. The backend responds to the frontend's request, providing the extracted document text, the BPMN XML, and the mapping data.
        
    6. The frontend then renders the text in the document panel and uses the BPMN XML to render the process diagram on the canvas. Finally, it uses the mapping data to establish the interactive, bidirectional links between the two views.
        

### 3.2. Core Component 1: The Document-to-Process Transformation Engine (Backend)

This backend component is the analytical heart of the system, responsible for converting unstructured text into a valid, structured BPMN model. It will implement the hybrid LLM approach identified as the most robust in the state-of-the-art analysis.

#### 3.2.1. Text Preprocessing

Upon receiving a document file, the first step is to extract clean, raw text content. The backend will use specialized libraries (e.g., `python-docx` for.docx, `PyPDF2` for.pdf) to parse the files. This stage will strip away complex formatting (e.g., fonts, colors) while attempting to preserve essential structural information such as paragraphs, headings, and lists, which can provide important contextual clues for the subsequent NLP steps.

#### 3.2.2. Process Element and Relation Extraction Pipeline

This multi-step pipeline is designed to maximize accuracy and enable the system's core interactive features.

- **Step 1 (LLM-based Entity Extraction):** The preprocessed text is sent as part of a carefully engineered prompt to a powerful LLM, such as GPT-4. The prompt will be designed using established prompt engineering principles, instructing the LLM to assume the persona of an expert business process analyst. Its task will be to thoroughly read the text and extract all relevant process elements, outputting them in a predefined, structured JSON format.14 This leverages the LLM's advanced natural language understanding capabilities to handle complex sentence structures and semantic nuances.29 The target JSON schema will be explicitly defined to capture:
    
    - `activities`: An array of objects, each with a unique ID and a descriptive name.
        
    - `gateways`: An array of objects, each with an ID, type (e.g., 'exclusive', 'parallel'), and any associated conditions.
        
    - `events`: An array of objects for start and end points of the process.
        
    - `sequence_flow`: An array of objects defining the directed connections, each specifying a source element ID and a target element ID.
        
- **Step 2 (Source Mapping):** This step is critical for enabling the system's interactive functionality. The LLM prompt will include an additional instruction: for every extracted element (activity, gateway, etc.), it must also return the exact character indices or text spans from the original document that correspond to that element. This source mapping information will be embedded directly within the output JSON, creating a rich, traceable link between the extracted semantic concepts and their textual origins.
    

#### 3.2.3. BPMN 2.0 XML Generation

The final stage of the transformation is to convert the intermediate JSON representation into a standard-compliant BPMN 2.0 XML file.

- A deterministic, rule-based algorithm will be implemented to parse the JSON structure. This algorithm will not involve any probabilistic or generative logic, ensuring its output is predictable and reliable.
    
- It will iterate through the arrays of activities, gateways, and events, creating the corresponding XML nodes. It will then use the `sequence_flow` data to construct the connections between them. Crucially, this algorithm will also generate the necessary graphical layout information (the BPMN Diagram Interchange or DI section of the XML), which is required for a BPMN renderer to display the model correctly. This final step guarantees that the output is always syntactically valid and can be consumed by any standard BPMN tool, effectively mitigating the risk of LLM hallucinations producing malformed models.30
    

### 3.3. Core Component 2: The Interactive Visualization and Exploration Interface (Frontend)

The frontend is where the user interacts with the system's output, making it a critical component for the project's success. It will be developed using a modern JavaScript framework and will heavily leverage the capabilities of the `bpmn-js` library. This library is the industry standard for web-based BPMN rendering and modeling, chosen for its maturity, comprehensive API, extensibility, and robust community support.40

#### 3.3.1. Bidirectional Text-Model Synchronization

This is the cornerstone interactive feature derived from the mockup, providing a seamless link between the unstructured source and the structured model. Its implementation relies on the source mapping data generated by the backend.

- **Text-to-Model Highlighting:** When a user selects or hovers over a span of text in the document viewer, the frontend will capture this event. It will then consult the mapping data to find if this text span corresponds to a known process element ID. If a match is found, it will use the `bpmn-js` Overlays API or a custom renderer to apply a distinct visual style (e.g., a colored border or highlight) to the corresponding BPMN element on the canvas, providing immediate visual feedback.42
    
- **Model-to-Text Highlighting:** Conversely, when a user clicks on a BPMN element (a task, gateway, etc.) on the canvas, the frontend will capture this interaction using the `bpmn-js` event bus.42 It will retrieve the element's ID, look up the corresponding text spans in the mapping data, and then programmatically highlight those spans in the document viewer, instantly showing the user the textual basis for that part of the model.
    

#### 3.3.2. User-Driven Model Refinement and Regeneration

The system is designed to be more than a static viewer; it is an active modeling environment.

- The properties panel, shown in the top-right of the mockup, will be populated with the details of any selected BPMN element. Users will be able to perform basic edits, such as renaming a task or changing a gateway's condition. These modifications will be handled by the `bpmn-js` modeler instance, which manages the underlying BPMN data model.
    
- The "Regenerate" button facilitates an interactive refinement loop.9 When clicked, it can trigger a workflow where the user provides corrective feedback in natural language (e.g., "Combine the 'Verify Invoice' and 'Check Invoice' steps into a single task called 'Invoice Verification'"). This feedback, along with the original context, is sent back to the backend LLM to generate an improved version of the intermediate JSON, which is then used to re-render the model.
    

#### 3.3.3. Hierarchical Process Navigation via Subprocess Linking

The mockup illustrates a key feature for managing complexity: hierarchical process decomposition. A task in one model (e.g., "Model_7") can represent an entire subprocess that is detailed in another model.

- This will be implemented by leveraging the BPMN concept of a "Call Activity" or a collapsed subprocess. In the properties panel for a selected task, a dropdown menu will be populated with a list of all other process models available in the repository.
    
- When a user selects a model from this list, the task's type will be changed to a subprocess, and a link to the selected model will be stored in its metadata.
    
- A visual indicator (e.g., a '+' icon) will appear on the task. Clicking this icon will trigger the frontend to load and display the linked subprocess model, either in a modal window, an expandable view, or by navigating the main canvas to the new model, thus enabling seamless hierarchical exploration of complex processes.
    

### 3.4. Core Component 3: The Process Model Repository

To support a persistent user workflow, a simple repository will be implemented on the backend.

- A database (such as SQLite for a self-contained prototype or a more scalable document database like MongoDB) will be used to store user-uploaded documents, the generated BPMN 2.0 XML files, and the associated text-to-model JSON mapping data.
    
- The backend will expose API endpoints for creating, retrieving, updating, and deleting these artifacts. The frontend will use these endpoints to populate the "Documents" and "Models" lists shown in the mockup, allowing users to manage their workspace, load previous work, and organize their process analysis projects.
    

## 4. Research Methodology and Implementation Plan

### 4.1. System Development and Technology Stack

This project will be conducted following the principles of the **Design Science Research Methodology (DSRM)**. DSRM is a well-established framework in Information Systems and Computer Science research for the creation and evaluation of novel IT artifacts, ensuring both practical relevance and academic rigor.9 The methodology involves iterative cycles of problem identification, solution design, artifact development, and evaluation. The technology stack has been carefully selected to align with the project's requirements and the current state-of-the-art in web development and NLP.

- **Frontend:** The client-side application will be developed using **React**. While other frameworks like Vue and Angular offer compelling features, React's component-based architecture, vast ecosystem of libraries, extensive community support, and overall popularity make it an ideal choice for building a complex and interactive user interface such as the one proposed.44 The core process visualization and modeling capabilities will be implemented using the
    
    **`bpmn-js`** library, which provides the necessary APIs for rendering diagrams, handling user interactions, and modifying model elements programmatically.40
    
- **Backend:** The server-side application will be built using **Python** with the **Flask** web framework. While Node.js offers high performance for I/O-intensive applications, Python's unparalleled dominance in the NLP and machine learning ecosystem makes it the superior choice for this project's backend.46 Python provides seamless access to state-of-the-art NLP libraries (e.g., spaCy, NLTK) and official, well-maintained client libraries for interacting with LLM APIs, which is critical for the transformation engine.47 Flask is chosen for its lightweight nature and simplicity, allowing for rapid development of the required RESTful API.
    
- **LLM Service:** The system will be designed to interface with **OpenAI's GPT-4 API**. This model is selected for its advanced capabilities in complex reasoning, instruction following, and structured data generation, which have been demonstrated to be highly effective for tasks similar to process extraction.14
    

### 4.2. Evaluation Strategy

To rigorously answer the research questions, a comprehensive, two-part evaluation strategy will be employed. This strategy is designed to assess both the technical performance of the automated generation engine and the practical usability of the interactive system as a whole. A ground-truth dataset will be created as the basis for this evaluation, consisting of 10-15 diverse procedural text documents (e.g., excerpts from technical manuals, business procedures) and their corresponding "gold standard" BPMN models, which will be manually created and validated by a human expert.

#### 4.2.1. Quantitative Assessment of Model Generation Quality (RQ1)

This part of the evaluation will focus on objectively measuring the accuracy and correctness of the process models generated by the system's backend engine. For each document in the test dataset, the system will be used to generate a BPMN model. This generated model will then be systematically compared against the manually created gold standard using a set of established metrics from the fields of information retrieval and graph theory.

- **Element-level Analysis:** The set of elements (tasks, gateways, events) in the generated model will be compared to the set in the gold standard model. Standard information retrieval metrics will be calculated:
    
    - **Precision:** The proportion of generated elements that are correct (i.e., also present in the gold standard).
        
    - **Recall:** The proportion of correct elements from the gold standard that were successfully identified by the system.
        
    - **F1-score:** The harmonic mean of precision and recall, providing a single, balanced measure of element-level accuracy.
        
- **Structural Analysis:** To assess the correctness of the process flow, the graph structure of the generated model will be compared to that of the gold standard. A **graph-edit distance** algorithm will be used for this purpose.49 This metric calculates the minimum number of "edit" operations (node insertion/deletion/substitution, edge insertion/deletion) required to transform one graph into the other, providing a quantitative measure of their structural similarity.51
    

#### 4.2.2. Qualitative Assessment of System Usability (RQ2)

This part of the evaluation will focus on assessing the effectiveness and usability of the interactive interface from a human user's perspective. A formal user study will be conducted with a target group of 10-15 participants, ideally comprising individuals with some familiarity with business processes but not necessarily with BPMN (e.g., business students, junior analysts).

- **Task-based Scenarios:** Participants will be given a series of realistic tasks to perform using the system. For example: "Upload the provided document describing the expense report process. Review the automatically generated model and identify any discrepancies. Use the system's features to correct the name of the 'Submit Report' task to 'Submit Expense Report'."
    
- **System Usability Scale (SUS):** After completing the tasks, each participant will be asked to fill out the **System Usability Scale (SUS)** questionnaire. SUS is a highly reliable and widely used industry-standard 10-item survey that provides a single, normalized score from 0 to 100 representing the overall perceived usability of a system.52 It is an excellent tool for benchmarking the system's usability against established norms.55
    
- **Qualitative Feedback:** During the study, a think-aloud protocol will be employed, where participants verbalize their thoughts as they interact with the system. This will be supplemented by a semi-structured interview at the end of the session to gather in-depth qualitative feedback on the user experience, with a particular focus on the perceived utility and intuitiveness of the core interactive features, such as the bidirectional text-model linking.
    

This dual-pronged evaluation ensures that the project's success is measured not only by the raw accuracy of its AI component but also by the effectiveness of its human-computer interface in supporting a real-world analysis task.

|Dimension|Research Question|Methodology|Metrics|Success Criteria|
|---|---|---|---|---|
|**Model Generation Quality**|RQ1: To what extent can modern NLP techniques... automatically generate... correct BPMN 2.0 models?|Automated comparison of system-generated models against a pre-defined gold-standard dataset.|- Precision, Recall, F1-score (for tasks, gateways). - Normalized graph-edit distance (for structural similarity).|Target an F1-score greater than 0.75 for process elements and an average normalized graph similarity score greater than 0.80.|
|**System Usability**|RQ2: How can an interactive visual interface... enhance a user's ability to understand, validate, and refine... models?|Formal user study with task-based scenarios, questionnaires, and think-aloud protocol.|- System Usability Scale (SUS) score. - Task completion rate. - Qualitative feedback themes from interviews.|Achieve an average SUS score above 68 (the established industry average) and a task completion rate exceeding 90%.|

## 5. Project Timeline and Deliverables

### 5.1. Phased Project Plan (6-Month Timeline)

To ensure the successful and timely completion of this thesis project, a structured, phased approach will be adopted. The entire project is planned over a 24-week (approximately 6-month) period, which is a typical duration for a master's thesis in computer science.56 The timeline is broken down into four major phases: Research & Planning, System Development, Evaluation, and Thesis Writing. A detailed Gantt chart is provided below to visualize the schedule, task dependencies, and key milestones. This plan demonstrates the feasibility of the proposed work and provides a clear roadmap for execution.58

|Phase|Task|Week 1-4|Week 5-8|Week 9-12|Week 13-16|Week 17-20|Week 21-24|
|---|---|---|---|---|---|---|---|
|**1. Research & Planning**|Comprehensive Literature Review & Technology Stack Finalization|████||||||
||Thesis Proposal Finalization & Defense|████||||||
|**2. System Development**|Backend: API & Transformation Engine (NLP Pipeline)||████|████||||
||Frontend: UI Implementation & `bpmn-js` Integration|||████|████|||
||Full System Integration, Debugging & Testing|||||████||
|**3. Evaluation**|Preparation of Gold-Standard Dataset & User Study Materials||||████|||
||Execution of Quantitative Evaluation (Model Quality)|||||████||
||User Recruitment & Execution of Usability Study||||||████|
|**4. Thesis Writing**|Writing: Introduction & Background Chapters||████|||||
||Writing: System Design & Implementation Chapters|||||████||
||Writing: Evaluation & Results Chapters||||||████|
||Final Draft Compilation, Revisions, & Final Submission|||||||

### 5.2. Key Milestones and Expected Outcomes

The project timeline is punctuated by several key milestones that will be used to track progress and ensure the project remains on schedule.

- **End of Month 1 (Week 4):**
    
    - **Milestone:** Successful defense of the finalized thesis proposal.
        
    - **Outcome:** A clear, committee-approved research plan.
        
- **End of Month 2 (Week 8):**
    
    - **Milestone:** A functional prototype of the backend transformation engine is complete.
        
    - **Outcome:** The system can accept a text file and generate a corresponding intermediate JSON representation using the LLM pipeline.
        
- **End of Month 4 (Week 16):**
    
    - **Milestone:** Version 1.0 of the integrated system is complete and deployed for testing.
        
    - **Outcome:** A functional web application where a user can upload a document, view the generated model, and use the core interactive features (bidirectional linking, properties panel).
        
- **End of Month 5 (Week 20):**
    
    - **Milestone:** All quantitative and qualitative evaluation activities are completed.
        
    - **Outcome:** A complete set of results from the model quality assessment and the user usability study, ready for analysis and inclusion in the thesis.
        
- **End of Month 6 (Week 24):**
    
    - **Milestone:** Final submission of the master's thesis manuscript and all associated project artifacts.
        
    - **Outcome:** The primary deliverables of the project are completed, including:
        
        1. A fully functional web application embodying the Document-based Process Model Explorer.
            
        2. A comprehensive thesis document detailing the theoretical background, system design, implementation, evaluation, and conclusions of the research.
            
        3. The complete source code repository for the system.
            
        4. The potential for a high-quality academic publication (e.g., a conference or journal paper) based on the novel contributions of the research.
            

## 6. Conclusion and Avenues for Future Work

This thesis proposes the design, development, and rigorous evaluation of the "Document-based Process Model Explorer." This novel system represents a significant step forward in the field of automated process discovery by addressing a critical gap in existing approaches. By integrating a hybrid LLM-based extraction engine with an interactive visual analytics interface, the project moves beyond simple, static model generation. It introduces a human-in-the-loop paradigm that empowers users to collaboratively explore, validate, and refine process models derived from unstructured text. The core contribution is this synergistic approach, which leverages the semantic power of AI while retaining the essential oversight and contextual knowledge of a human expert, thereby making the powerful tools of business process analysis more accessible, trustworthy, and effective.

Upon successful completion, this research will not only deliver a functional and empirically validated software artifact but will also contribute to the broader academic discourse on human-AI collaboration in knowledge-intensive domains. The findings will provide valuable insights into the quality of LLM-generated process models and the utility of interactive visualization for model validation.

The scope of this master's thesis is necessarily focused, leaving several exciting avenues for future research and development. Potential extensions to this work include:

- **Advanced Model Refinement:** Enhancing the interactive capabilities to support more complex model refinements. For example, allowing users to graphically manipulate the BPMN model (e.g., by dragging to re-route a sequence flow) and have those structural changes be reflected back into the intermediate JSON representation, or even used to fine-tune the underlying LLM.
    
- **Collaborative Modeling:** Extending the platform to support real-time, multi-user collaboration. This would allow a team of stakeholders (e.g., a domain expert and a business analyst) to work together on validating and refining a generated model simultaneously.
    
- **Integration with Process Execution Engines:** Adding functionality to export the validated, high-quality BPMN models directly to commercial or open-source process execution engines like Camunda or Bonita. This would complete the lifecycle from unstructured knowledge discovery to executable process automation.
    
- **Broader Document Corpus Analysis:** Training and evaluating the system on a wider and more challenging variety of document types. This could include highly unstructured formats such as meeting minutes, email chains, or customer support chat logs, which would require more advanced NLP techniques for discourse analysis and conversation threading.
    

## 7. References

_(A comprehensive list of all cited sources and relevant literature will be included here in the final proposal.)_