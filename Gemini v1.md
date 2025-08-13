### Chapter 1: Introduction

**1.1. Background**

**1.1.1. Business Process Management (BPM)**

Business Process Management is a systematic approach to identifying, designing, executing, documenting, measuring, monitoring, and controlling business processes. Its goal is to improve organizational efficiency, effectiveness, and adaptability to change. By focusing on the flow of work, BPM enables organizations to align their operations with strategic goals, leading to enhanced performance, reduced costs, and improved customer satisfaction.

**1.1.2. Process Modeling**

A central tenet of BPM is the creation of process models, which are graphical representations of a business process. These models, often expressed in standardized notations like **Business Process Model and Notation (BPMN)**, provide a clear, unambiguous view of how work is performed. They serve as a vital communication tool for stakeholders, a blueprint for system development, and a basis for process analysis and optimization.

**1.1.3. The Problem with Unstructured Documents**

A significant challenge arises from the fact that a large amount of an organization’s process knowledge is not stored in formal, structured models. Instead, it is embedded within unstructured or semi-structured documents, such as standard operating procedures (SOPs), policy manuals, legal contracts, and emails. This creates a disconnect between the "as-is" process, as described in text, and its formal, modeled representation.

**1.2. Problem Statement**

**1.2.1. The Manual Gap**

The current practice for creating process models from documents is largely manual. It requires process analysts to read and interpret complex texts, extract relevant process steps, and translate them into a formal notation. This is a time-consuming, tedious task that is prone to misinterpretation and errors. The process often relies on the subjective judgment of the analyst, leading to inconsistencies and a high degree of variability in the resulting models. This manual gap represents a significant bottleneck in BPM initiatives.

**1.2.2. The Need for Automation**

To overcome these challenges, there is a clear need for a tool that can semi-automatically bridge the gap between textual descriptions and formal process models. Such a tool should not only assist in the extraction of process information but also provide an interactive, user-friendly interface that empowers the user to validate and refine the automatically generated model, ensuring accuracy and reliability.

**1.3. Research Questions**

This thesis is guided by the following primary and sub-research questions:

**1.3.1. Main Research Question:**

How can a semi-automated, user-centric system effectively and efficiently generate accurate business process models from unstructured textual documents?

**1.3.2. Sub-Questions:**

- What is the optimal combination of Natural Language Processing (NLP) techniques for identifying and extracting key process elements (tasks, events, gateways) from textual descriptions?
    
- How does an interactive, visually-linked user interface (connecting text to model elements) impact a user's ability to correct and refine a generated process model?
    
- To what extent does this approach improve the efficiency and accuracy of process modeling compared to a purely manual approach?
    

**1.4. Research Objectives**

The main objectives of this thesis are:

- **Development of a Prototype:** To design and implement a web-based prototype, the "Document-based Process Model Explorer," that can process unstructured documents and generate a preliminary BPMN model.
    
- **Evaluation of Effectiveness:** To empirically evaluate the prototype's performance, assessing its efficiency (time savings), accuracy (quality of the generated models), and usability (user satisfaction).
    
- **Contribution to the Field:** To provide a novel framework and proof-of-concept that demonstrates a more effective and accessible method for process discovery from text, thereby contributing to the fields of BPM and Information Systems.
    

**1.5. Scope of the Thesis**

This thesis focuses specifically on the semi-automatic discovery of process models from textual documents. It will address the extraction of core process elements and their relationships. The scope does not include other process mining activities, such as conformance checking, performance analysis, or process enhancement. The developed prototype will be a proof-of-concept, designed to validate the research approach rather than to be a fully featured commercial product.

**1.6. Thesis Structure**

The remainder of this thesis is structured as follows:

- **Chapter 2:** Provides a comprehensive review of the relevant academic literature, covering process mining, text-based process discovery, and user-centered design.
    
- **Chapter 3:** Details the proposed methodology, including the architectural design of the prototype and the specific NLP techniques to be employed.
    
- **Chapter 4:** Describes the implementation of the "Document-based Process Model Explorer" prototype.
    
- **Chapter 5:** Presents the evaluation results, analyzing the efficiency, accuracy, and usability of the system.
    
- **Chapter 6:** Concludes the thesis by summarizing the findings, discussing the limitations, and outlining directions for future research.
    

---

### Chapter 2: Literature Review

**2.1. Introduction**

This chapter provides a critical review of the academic literature relevant to this thesis. It establishes the theoretical foundation for the research by examining existing work in process mining, text-based process discovery, and user-centered design. The goal is to identify key concepts, methodologies, and, most importantly, the research gaps that the "Document-based Process Model Explorer" aims to address.

**2.2. Foundations in Business Process Management**

**2.2.1. Business Process Management Systems (BPMS)**

BPMS are software solutions designed to support the entire BPM lifecycle. They provide tools for process modeling, execution, and monitoring. While these systems are highly effective for managing formalized processes, they rely on pre-existing models, highlighting the importance of the initial process discovery phase.

**2.2.2. Business Process Modeling and Notation (BPMN)**

BPMN is the industry standard for modeling business processes. It provides a rich set of graphical elements to represent tasks, events, gateways, and control flows. The widespread adoption of BPMN underscores the value of having a standardized, graphical language for communicating process logic.

**2.3. Process Discovery and Process Mining**

**2.3.1. Event Log-Based Process Mining**

Process mining is a field of research that focuses on discovering, monitoring, and improving real-life processes by analyzing event logs. Foundational work, such as the α-algorithm (van der Aalst et al., 2004), demonstrated how structured data from IT systems can be used to automatically discover process models. This approach, however, is fundamentally limited to systems that generate rich event logs.

**2.3.2. Limitations with Unstructured Data**

The major limitation of traditional process mining is its dependency on structured event data. In many organizational contexts, a process is defined not by a software system's event log but by a human-written document. This has led to the emergence of research into text-based process discovery, which seeks to apply computational linguistics to unstructured text.

**2.4. Text-Based Process Discovery**

This is the most relevant body of work for my thesis. Researchers have attempted to solve the text-to-model problem using different computational approaches.

**2.4.1. Rule-Based Approaches**

Early research, such as that by **Leopold et al. (2012)**, focused on rule-based methods. These approaches use linguistic patterns and syntactic rules to identify process elements. For example, a verb in an imperative sentence might be tagged as a task, while specific keywords like "if" or "otherwise" are used to infer gateways. While these methods are transparent and effective for simple texts, they often fail to handle the complexities of natural language, such as ambiguity, anaphora resolution, and implicit logic.

**2.4.2. Machine Learning Approaches**

More recently, machine learning, particularly deep learning, has been applied to this problem. These models can learn complex patterns from data, potentially overcoming the limitations of rule-based systems. However, this approach faces significant hurdles, including the scarcity of large, labeled training datasets and the "black box" nature of many models, which makes it difficult to understand or correct the model's output.

**2.5. Natural Language Processing (NLP) Techniques**

My work will leverage specific NLP techniques to address the challenges of text-based process discovery.

**2.5.1. Information Extraction (IE) and Named Entity Recognition (NER)**

IE and NER are crucial for identifying and classifying process-relevant entities. Instead of traditional entities like names and locations, my system will need to identify "process entities" such as tasks, actors, and data objects.

**2.5.2. Semantic Role Labeling (SRL) and Dependency Parsing**

More advanced techniques like dependency parsing and SRL are vital for understanding the relationships between words in a sentence. This is necessary to correctly map a sentence like "The clerk sends the invoice" to a BPMN task where "clerk" is the actor and "invoice" is the data object.

**2.6. User-Centered Design in Process Modeling**

My thesis is not just about automation; it is about creating an effective user experience.

**2.6.1. Human-in-the-Loop Systems**

My system is a classic example of a **human-in-the-loop system**. Research in this area emphasizes that for complex tasks where automated systems are not 100% accurate, an interactive approach that allows human validation and correction is often superior. This approach builds trust and ensures the quality of the final output.

**2.6.2. Interactive Visualization and Visual Analytics**

The design of the "Explorer" interface is informed by the field of visual analytics. The use of linked views, where a change or highlight in one pane (e.g., the document text) is reflected in another (the process model), is a proven method for improving data exploration and understanding.

**2.7. Synthesis and Research Gap**

The literature shows that while significant progress has been made in text-based process discovery, a key gap remains: the lack of an integrated, interactive system that effectively combines the power of NLP with a user-centric design. Existing automated methods often suffer from accuracy issues and a lack of transparency, while manual methods are inefficient. My research aims to fill this gap by creating a transparent, semi-automated tool that empowers users to actively participate in and validate the process modeling task, thereby achieving a higher level of efficiency and accuracy.