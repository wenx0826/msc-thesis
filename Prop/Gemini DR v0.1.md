Prompt: 
# A Proposal for a Document-based Process Model Explorer

## 1. Introduction

### 1.1 Motivation

A significant portion of any organization's operational knowledge is not stored in structured databases but is instead embedded within a vast and growing collection of unstructured documents.1 Manuals for standard operating procedures (SOPs), internal policy documents, project reports, and interview transcripts all contain detailed, context-rich descriptions of how work is actually performed. This "latent" process knowledge is a valuable asset, yet it remains largely inaccessible to the powerful automated analysis and optimization techniques that define modern Business Process Management (BPM).3 The task of manually extracting this knowledge and translating it into formal process models is the primary bottleneck in the BPM lifecycle.

This manual modeling is an exceptionally demanding endeavor. It is time-consuming, requires significant financial investment, and is highly susceptible to the subjective interpretations of the analyst performing the task.4 Organizations can spend hundreds of thousands of dollars each year on these efforts, which demand specialized expertise in formal notations like the Business Process Model and Notation (BPMN).6 This high barrier to entry frequently leads to process documentation that is incomplete, outdated, or simply inaccurate. Such deficiencies undermine critical business initiatives that rely on a clear and precise understanding of "as-is" processes, including regulatory compliance audits, digital transformation projects, and the implementation of automation.4 Furthermore, a persistent communication gap often exists between the domain experts, who possess the deep, intrinsic knowledge of the processes, and the BPMN specialists tasked with formalizing them. This disconnect can lead to models that fail to accurately reflect operational reality.9

The core problem this research aims to solve is the profound cognitive and semantic gap between these unstructured, human-readable texts and the structured, machine-readable process models.10 While BPMN was conceived as a common language to bridge the divide between business and technical stakeholders, its effective use still requires a level of training that many domain experts do not possess.12 This effectively disenfranchises the very individuals who understand the processes most intimately from participating directly in their formalization.

Recent breakthroughs in Natural Language Processing (NLP), particularly the emergence of powerful Large Language Models (LLMs), offer a transformative opportunity to automate the initial translation from text to a formal BPMN model.9 However, a fully automated, "black box" approach is fundamentally insufficient. The inherent ambiguity, nuance, and contextual dependencies of natural language mean that any automatically generated model is, at best, a high-fidelity draft. It requires rigorous validation, contextual refinement, and correction by a human expert to be trustworthy.11 The challenge is not merely one of translation but of creating a verifiable and faithful representation of reality.

This project, the "Document-based Process Model Explorer," is motivated by the critical need for a _human-in-the-loop_ system that transcends static, one-shot generation. The innovation, as envisioned in the project's user interface mockup, lies in the creation of an **interactive visual analytics environment**.16 This environment is designed to foster a collaborative dialogue between the user and the automated system. Instead of merely presenting a final, static model, the Explorer will empower users to visually trace the connections between source text fragments and their corresponding model elements. It will allow them to iteratively refine the model through direct manipulation and feedback, and ultimately to validate its correctness against the source document. This interactive paradigm directly addresses the limitations of purely automated approaches by making the user an active participant in the sensemaking and validation process. This ensures the final model is not only formally correct but also semantically faithful to the original procedural knowledge.

### 1.2 Research Questions

This thesis is guided by the following research questions, which are designed to explore the feasibility, quality, and usability of the proposed system.

- RQ1: To what extent can modern NLP techniques, specifically LLM-based pipelines, automatically generate syntactically and semantically correct BPMN 2.0 models from unstructured procedural texts?
    
    This question addresses the core technical feasibility of the project. It moves beyond a simple "yes/no" to investigate the quality of the automated generation. To answer this, a quantitative evaluation will be performed. A "gold standard" dataset of text-model pairs will be created. The system's generated models will be compared against this standard using established metrics like precision, recall, and F1-score for model elements (tasks, gateways) and graph-edit distance to measure structural similarity.18 This will provide an objective measure of the generation engine's performance.
    
- RQ2: How can an interactive visual interface, featuring bidirectional linking between text and model elements, enhance a user's ability to understand, validate, and refine automatically generated process models?
    
    This question focuses on the human-computer interaction aspect of the system. It seeks to understand the value added by the interactive features. The answer will be derived from a formal user study. Participants will perform a series of validation and refinement tasks using the system. Their performance and experience will be measured using the industry-standard System Usability Scale (SUS) questionnaire, task completion rates, and qualitative feedback gathered through a think-aloud protocol and post-session interviews.20
    
- RQ3: What specific interactive features and visual cues are most effective in facilitating the cognitive process of aligning textual descriptions with their corresponding BPMN model elements?
    
    This question delves deeper into the usability aspect, aiming to identify which specific design choices contribute most to the system's effectiveness. While RQ2 asks if the interface helps, RQ3 asks how it helps. This will be investigated through the qualitative analysis of the user study data. By analyzing user behaviors, comments from the think-aloud protocol, and interview responses, we can identify which features (e.g., bidirectional highlighting, the properties panel, subprocess navigation) were most frequently used, most intuitive, and most helpful in resolving ambiguities and correcting errors.
    

### 1.3 Contribution

This research will make three primary contributions to the fields of Business Process Management (BPM) and Human-Computer Interaction (HCI).

1. **A Novel System Architecture:** The project will deliver the design and implementation of an integrated, web-based platform that synergistically combines a sophisticated NLP-based process extraction engine with an interactive BPMN visualization and editing front-end. While others have explored text-to-model generation, this work focuses on creating a cohesive, end-to-end system that tightly couples the generation logic with a user-centric validation interface, realizing the vision presented in the initial mockup.
    
2. **An Interactive Exploration Paradigm:** The core innovation of this work is the development and application of a bidirectional synchronization mechanism that visually and dynamically links textual phrases to their corresponding BPMN elements. This feature provides a novel and intuitive method for model validation, traceability, and exploration. It moves beyond the state-of-the-art in static model generation by creating a "glass box" where the user can see precisely how the model is grounded in the source text, fostering trust and enabling more effective human-in-the-loop refinement.
    
3. **A Rigorous Empirical Evaluation:** The thesis will provide a comprehensive, multi-faceted evaluation of the developed system. This is a critical contribution, as many novel systems are presented without rigorous assessment. This evaluation will assess both the objective quality of the automatically generated models against a gold standard (addressing RQ1) and the subjective usability and effectiveness of the interactive environment through a formal user study (addressing RQ2 and RQ3). This dual evaluation provides a holistic validation of the proposed solution.
    

### 1.4 Methodology

This project will be conducted using the **Design Science Research Methodology (DSRM)**, a well-established framework for research in Information Systems.37 DSR is particularly suited for this project as its primary goal is the creation and evaluation of a novel IT artifact designed to solve a real-world problem.39

**(1) Summary of Design Science Research**

Design Science Research is a problem-solving paradigm that seeks to create innovative artifacts to address relevant problems.41 Unlike behavioral science, which aims to develop and verify theories that

_explain_ reality, design science aims to _create_ things that serve human purposes.39 The research process is inherently iterative, cycling through the activities of building an artifact and evaluating its performance in a given context.40

Hevner et al. describe this process through three interconnected cycles: the _Relevance Cycle_, which connects the research to the problem environment and defines its requirements; the _Rigor Cycle_, which grounds the research in the existing knowledge base of theories and methods; and the _Design Cycle_, which is the core iterative process of constructing and evaluating the artifact.41 The outputs of DSR are not just the final system but also the knowledge gained in the process, which can be in the form of constructs, models, methods, or instantiations.43

**(2) Application of DSRM to this Project**

The DSRM will be applied to this thesis as follows:

- **Stakeholders:** The primary stakeholders for this research are the individuals and groups involved in understanding and managing business processes.44 This includes:
    
    - **Business Analysts and Process Modelers:** Who will use the tool to accelerate their modeling work and improve accuracy.
        
    - **Domain Experts / Subject Matter Experts (SMEs):** Who possess deep process knowledge but may lack formal BPMN skills. The tool is designed to empower them to validate and refine models directly.
        
    - **Managers:** Who rely on accurate process models for decision-making, compliance, and strategic planning.
        
    - **IT Developers:** Who implement the processes and can use the validated models as clear specifications.
        
- **Artifacts:** The research will produce several artifacts, consistent with the DSR framework 40:
    
    - **Constructs:** The conceptual vocabulary for the system, such as the concept of "bidirectional text-model synchronization."
        
    - **Models:** The high-level system architecture that integrates the NLP backend with the interactive frontend.
        
    - **Methods:** The specific hybrid LLM-based pipeline for transforming text into a structured intermediate format and then into valid BPMN 2.0 XML.
        
    - **Instantiation:** The final, implemented "Document-based Process Model Explorer" web application, which serves as the proof-of-concept and the primary object of evaluation.
        
- **Steps:** The research will follow the six-step DSRM process model proposed by Peffers et al. 37:
    
    1. **Problem Identification and Motivation:** This has been conducted and is detailed in the Motivation section (1.1). The problem is the inefficiency and inaccuracy of manual process modeling from text.
        
    2. **Define Objectives for a Solution:** The objectives are to create a system that can (a) accurately generate a draft BPMN model from text, (b) provide an interactive interface for users to validate and refine this model, and (c) ensure the final model is both formally correct and semantically faithful to the source.
        
    3. **Design and Development:** This phase involves the detailed design of the system architecture and the implementation of the backend transformation engine and the frontend visualization interface using the chosen technology stack.
        
    4. **Demonstration:** The artifact will be demonstrated by using it to solve an instance of the problem, such as processing a sample procedural document and showcasing the interactive refinement workflow.
        
    5. **Evaluation:** This crucial step involves rigorously evaluating the artifact against the objectives defined in step 2. The detailed plan for this is outlined in the Evaluation section (1.5).
        
    6. **Communication:** The results of the research will be communicated through the master's thesis document itself, and potentially through academic publications or presentations.
        

### 1.5 Evaluation

A robust, two-part evaluation strategy will be employed to rigorously assess the developed artifact and answer the research questions. This strategy is designed to measure both the technical performance of the automated generation engine and the practical usability of the interactive system. A ground-truth dataset will be established, consisting of 10-15 diverse procedural text documents and their corresponding "gold standard" BPMN models, which will be manually created and validated by an expert.

**Part 1: Quantitative Assessment of Model Generation Quality (for RQ1)**

This evaluation will objectively measure the accuracy of the process models generated by the system's backend engine. For each document in the test dataset, a BPMN model will be automatically generated. This model will then be systematically compared against the gold standard using established metrics.

- **Element-level Analysis:** The set of generated elements (tasks, gateways, events) will be compared to the gold standard to calculate standard information retrieval metrics:
    
    - **Precision:** What proportion of the generated elements are correct?
        
    - **Recall:** What proportion of the correct elements were successfully identified?
        
    - **F1-score:** The harmonic mean of precision and recall, providing a single, balanced measure of accuracy.
        
- **Structural Analysis:** To assess the correctness of the process flow, the graph structure of the generated model will be compared to the gold standard. A **graph-edit distance** algorithm will be used to calculate the minimum number of operations (e.g., node insertion/deletion, edge insertion/deletion) required to transform the generated graph into the gold standard graph.18 This provides a quantitative score of their structural similarity.
    

**Part 2: Qualitative Assessment of System Usability (for RQ2 & RQ3)**

This evaluation will assess the effectiveness and usability of the interactive interface from a human user's perspective. A formal user study will be conducted with 10-15 participants, ideally individuals with some familiarity with business processes but not necessarily deep expertise in BPMN (e.g., business students or junior analysts).

- **Task-based Scenarios:** Participants will be given realistic tasks, such as: "Given this document, use the system to generate a process model. Review the model and use the interactive features to identify and correct any discrepancies you find between the text and the diagram."
    
- **System Usability Scale (SUS):** After completing the tasks, each participant will complete the SUS questionnaire. This is a reliable, industry-standard 10-item survey that yields a single score from 0 to 100, representing the overall perceived usability of the system.20
    
- **Qualitative Feedback:** A think-aloud protocol will be used during the study, where participants verbalize their thought processes. This will be followed by a semi-structured interview to gather in-depth feedback on their experience, focusing specifically on the perceived utility and intuitiveness of the core interactive features (e.g., the bidirectional linking) to answer RQ3.
    

### 1.6 Structure

The final thesis will be organized into the following chapters:

- **Chapter 1: Introduction:** This chapter will present the motivation for the research, define the core problem, state the research questions, and outline the contributions and methodology, as detailed in this proposal.
    
- **Chapter 2: Related Work:** This chapter will provide a comprehensive review of the state of the art in relevant fields, including Business Process Modeling with BPMN, process discovery from text, NLP techniques for information extraction, and interactive visual analytics.
    
- **Chapter 3: System Design and Architecture:** This chapter will detail the conceptual framework and technical architecture of the "Document-based Process Model Explorer," describing the design of the backend transformation engine and the frontend interactive interface.
    
- **Chapter 4: Implementation:** This chapter will describe the implementation of the system, including the specific technologies, libraries, and algorithms used to build the working prototype.
    
- **Chapter 5: Evaluation:** This chapter will present the methodology and results of the two-part evaluation. It will detail the findings from both the quantitative model quality assessment and the qualitative user study.
    
- **Chapter 6: Discussion:** This chapter will interpret the evaluation results, discuss their implications for the research questions, acknowledge the limitations of the study, and reflect on the overall findings.
    
- **Chapter 7: Conclusion and Future Work:** This chapter will summarize the key contributions of the thesis and propose promising directions for future research that can build upon this work.
    

## 2. Related Work

_(This section is adapted from the "Background and State of the Art" section of the initial report.)_

### 2.1 Foundations of Business Process Modeling with BPMN 2.0

Business Process Model and Notation (BPMN) is the de facto international standard for graphically representing business processes.9 Its value lies in providing a standardized visual language that is intuitive for business stakeholders while being precise enough to represent complex semantics for technical implementation.13 This allows BPMN to serve as a critical bridge, closing the communication gap between business-led process design and IT-led process implementation.13 The BPMN 2.0 specification defines a rich set of graphical elements, including Flow Objects (Events, Activities, Gateways) that define process behavior and Connecting Objects (like Sequence Flows) that show the order of execution.13 A foundational understanding of these core elements is essential, as they form the target structure that the proposed system's NLP engine must extract from text.

### 2.2 The Evolution of Process Discovery: From Event Logs to Text Mining

The field of process discovery has traditionally been dominated by Process Mining, a data-driven approach that automatically constructs process models by analyzing structured event logs from enterprise systems.1 However, a key limitation of process mining is its dependence on high-quality event logs. Many critical business activities, especially those involving human decision-making or offline tasks, are never recorded in these systems.1 This "dark matter" of process knowledge is instead captured in unstructured documents.3 This has spurred the growth of a complementary field: Automated Business Process Discovery (ABPD) from unstructured text.5 This area applies text mining and NLP techniques to discover the "hidden" processes described in documents, offering greater accuracy than manual interviews and providing visibility into end-to-end workflows that are invisible to log-based analysis.4 This thesis is situated at the forefront of this research direction.

### 2.3 A Survey of NLP Techniques for Process Element Extraction

The central technical challenge is the automated transformation of natural language into the structured elements of a BPMN model. Approaches to this problem have evolved significantly.

|Approach|Core Principle|Strengths|Weaknesses|
|---|---|---|---|
|**Rule-Based/Syntactic**|Relies on predefined linguistic patterns and grammatical structures.|High precision for simple, standardized text; interpretable logic.|Brittle; fails with linguistic variation; high manual effort to create and maintain rules.|
|**Traditional ML (NER+RE)**|Supervised learning on manually annotated datasets to classify entities and relations.|More robust to linguistic variation than rule-based systems.|Requires large, expensive annotated datasets; models components in isolation.|
|**End-to-End LLM**|Zero/few-shot prompting of a large, pre-trained generative model to directly output BPMN.|High flexibility; handles complex and ambiguous language well; low initial setup effort.|Prone to hallucinations; may generate syntactically invalid or logically inconsistent BPMN.|
|**Hybrid LLM (Proposed)**|LLM for semantic extraction to an intermediate format; deterministic algorithm for final model construction.|Balances semantic flexibility with structural guarantees; mitigates hallucination risk.|More complex system architecture than end-to-end LLM.|

Early systems used rule-based methods (e.g., identifying tasks by finding verb-object pairs), which were precise but brittle.25 Supervised machine learning techniques, such as Named Entity Recognition (NER) and Relation Extraction (RE), offered more robustness but required large, manually annotated datasets, which are expensive to create.25 The recent emergence of Large Language Models (LLMs) has catalyzed a paradigm shift, enabling end-to-end Text-to-BPMN conversion with minimal task-specific training.9 However, the probabilistic nature of LLMs makes them prone to "hallucinations" that can result in invalid BPMN XML.13 To mitigate this, a more robust

**hybrid approach** has emerged. Systems like Nala2BPMN use an LLM for the semantic understanding task of extracting process elements into a structured intermediate format (e.g., JSON), and then use a deterministic, rule-based algorithm to construct the final, syntactically valid BPMN model from that intermediate representation.29 This project will adopt and extend this hybrid model, as it offers the most promising path to generating models that are both semantically rich and formally correct.

### 2.4 Paradigms for Interactive Process Model Analysis and Refinement

Automated model generation is only the first step. The generated models must be explored, validated, and refined by domain experts.30 The proposed system's interactive features are grounded in established principles from Visual Analytics and Interactive Machine Learning. Visual Analytics (VA) is the science of analytical reasoning facilitated by interactive visual interfaces, emphasizing the synergy between automated analysis and human cognition.16 The core VA principle of "Analyze First, Show the Important, Zoom, Filter and Analyze Further, Details on Demand" provides a theoretical foundation for the Explorer's design.16 Similarly, Interactive Machine Learning explores systems where users provide feedback to iteratively guide and refine a model's behavior.33 The "Regenerate" function envisioned in the mockup is a direct application of this paradigm, creating a feedback loop that transforms the user from a passive consumer into an active co-creator. This project serves as a research prototype for this emerging paradigm of human-AI co-creation in the BPM domain.35