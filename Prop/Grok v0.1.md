# Master's Thesis Proposal: Development of a Document-Based Process Model Explorer Web Application

## 1. Introduction

### 1.1 Motivation

In the realm of business process management (BPM), organizations increasingly depend on accurate and efficient process modeling to document, analyze, and improve their operational workflows. Process models, often represented using standards like Business Process Model and Notation (BPMN), offer visual depictions of activities, actors, decisions, and sequences, enabling better understanding and optimization of business operations. However, the traditional approach to creating these models relies heavily on manual interpretation of textual documents such as procedural manuals, reports, regulatory guidelines, and emails. This manual process is not only labor-intensive and time-consuming but also prone to errors, inconsistencies, and subjectivity, particularly when dealing with complex or ambiguous natural language descriptions.

The motivation for developing the Document-Based Process Model Explorer (DBPME) stems from the growing volume of unstructured textual data in organizations and the need for automated tools to bridge the gap between this data and structured process representations. Recent advancements in natural language processing (NLP) and large language models (LLMs) have demonstrated potential in extracting structured information from text, yet practical, user-friendly applications remain scarce. For instance, industries like healthcare, manufacturing, and finance generate vast amounts of procedural documentation that could benefit from automation, reducing the time experts spend on modeling from weeks to hours and minimizing oversights in process documentation. Moreover, non-experts, such as business analysts without deep modeling expertise, often struggle with existing tools that require manual diagram creation, leading to bottlenecks in process improvement initiatives.

By automating the extraction and visualization of process models, DBPME addresses real-world challenges in BPM, such as handling linguistic variations (e.g., synonyms, ambiguities, and implicit relations), supporting diverse document formats (TXT, PDF, DOC), and providing interactive exploration features like text-model linkages for verification. This tool could enhance decision-making, compliance, and efficiency, especially in dynamic environments where processes evolve rapidly. Ultimately, the project is driven by the opportunity to leverage AI to democratize process modeling, making it accessible and scalable, while contributing to the intersection of information systems (IS) research and practical BPM tools. (Approximately 1 page in length when formatted.)

### 1.2 Research Questions

This thesis is guided by the following research questions, designed to explore the development, usability, and impact of an automated process model extraction tool:

1. How can natural language processing techniques and large language models be integrated to accurately extract and represent process elements from unstructured textual documents?  
    This question investigates the technical mechanisms for parsing text, identifying key components like activities, gateways, and flows, and generating structured models such as BPMN diagrams. To prove the effectiveness of the potential solution, I plan to develop a prototype using modular prompting strategies with LLMs (e.g., GPT-4) and evaluate it through accuracy metrics like F1 scores and graph edit distance on benchmark datasets, demonstrating improvements over baseline methods.
2. What interactive features in a web-based interface best support users in exploring, validating, and refining automatically generated process models?  
    This focuses on user-centered design elements, such as text highlighting, model editing, and property panels, to enhance usability. The solution's quality will be proven via user studies involving tasks like model correction, measuring metrics such as task completion time and satisfaction scores (e.g., System Usability Scale), comparing against manual tools to show reduced cognitive load and higher adoption rates.
3. To what extent does an automated document-based process model explorer improve efficiency and accuracy in business process management compared to traditional manual approaches?  
    This examines the broader impact on BPM workflows, including time savings and error reduction. Proof will come from comparative evaluations, such as controlled experiments where participants model processes with and without the tool, quantifying benefits through performance indicators like model completeness and generation speed, alongside qualitative feedback to validate real-world applicability.

### 1.3 Contribution

The primary contribution of this thesis is the design and implementation of DBPME, a novel web-based application that uniquely integrates LLM-driven process extraction with an interactive explorer interface, linking generated models directly to source text for seamless validation—a feature not comprehensively addressed in existing prototypes. Unlike prior research tools limited to specific datasets or offline use, DBPME supports multi-format document uploads, real-time regeneration, and export options, making it accessible for non-experts and scalable for enterprise applications. Additionally, by open-sourcing the tool and providing a reusable framework for LLM prompting in BPM, this work advances the field beyond current rule-based or LLM-only approaches, offering empirical evidence of efficiency gains (e.g., 50-70% time reduction) through rigorous evaluations. This fills a gap in IS research by delivering a practical artifact that bridges academic advancements in NLP with real-world BPM needs. (Approximately 1/2 page.)

### 1.4 Methodology

This thesis employs Design Science Research (DSR) in Information Systems, as outlined by Hevner et al. (2004), to systematically develop and evaluate the DBPME artifact.

(1) Summary of Design Science: DSR is a problem-solving paradigm in IS that focuses on creating innovative IT artifacts to address organizational challenges, complementing behavioral science by emphasizing practical utility over mere explanation. It involves stakeholders (e.g., researchers, practitioners, managers) who interact with the research process. Key elements include artifacts—defined as constructs (vocabulary/symbols), models (abstractions), methods (algorithms/practices), and instantiations (prototypes/systems)—that are built and evaluated rigorously. The process follows an iterative search approach, often a build-evaluate loop, guided by seven guidelines: producing a viable artifact, ensuring problem relevance, rigorous evaluation, clear contributions, methodological rigor, search-based design, and effective communication. This framework balances relevance (business needs) and rigor (theoretical foundations), drawing from environments like technology and organizations, and knowledge bases such as methodologies and foundations.

(2) Application to This Case: In this thesis, stakeholders include end-users (business analysts and process modelers seeking efficient tools), IS researchers (advancing NLP in BPM), and organizational managers (deciding on tool adoption for process optimization). The primary artifact is the DBPME web application (an instantiation), supported by secondary artifacts: extraction algorithms using LLMs (methods), generated process models like BPMN diagrams (models), and prompting constructs for entity/relation detection (constructs). The research steps align with DSR's iterative process: First, identify the problem through literature and requirements analysis (relevance guideline). Then, design and build the artifact using agile development—frontend with React.js for interactivity, backend with Python/LLMs for extraction, and database for storage. Evaluation follows rigorous methods (e.g., experiments, user studies) to assess utility, iterating via a generate/test cycle until refinements meet benchmarks. Contributions will be communicated through the thesis, open-source code, and potential publications, ensuring rigor via theoretical grounding in NLP literature and relevance to BPM challenges. (Approximately 1.5 pages.)

### 1.5 Evaluation

The evaluation of DBPME will be multifaceted, directly tied to the research questions to demonstrate the proposal's effectiveness. For RQ1 on extraction accuracy, quantitative metrics such as precision, recall, F1 scores, and graph edit distance will be applied to compare generated models against ground-truth benchmarks like the Process Extraction from Text (PET) dataset, aiming for over 80% accuracy and outperforming baselines by 5-10% through LLM prompting optimizations. RQ2 on interface features will be assessed via usability testing with 20-30 participants (e.g., business students and professionals), using the System Usability Scale (SUS) for scores above 70 and task-based metrics like error rates and completion times, supplemented by think-aloud protocols for qualitative insights on features like text linking.

For RQ3 on overall efficiency, comparative experiments will measure time savings and model quality against manual tools (e.g., Camunda Modeler), with statistical analysis (t-tests) to validate improvements. Performance testing will evaluate scalability on document sizes up to 100 pages, ensuring response times under 30 seconds. Challenges like dataset biases will be mitigated through diverse test cases, and ethical considerations (e.g., data privacy) addressed. This rigorous, mixed-methods approach, aligned with Hevner's evaluation guideline, will prove the tool's value in enhancing BPM practices. (Approximately 1 page.)

### 1.6 Structure

The thesis will be organized into the following chapters:

- **Chapter 1: Introduction** - Provides background, motivation, research questions, contributions, methodology overview, and thesis structure.
- **Chapter 2: Related Work** - Reviews existing literature on process model extraction, NLP/LLM applications in BPM, and DSR in IS.
- **Chapter 3: Methodology** - Details the DSR approach, system architecture, and development process for DBPME.
- **Chapter 4: Implementation** - Describes the technical realization, including frontend, backend, extraction engine, and features.
- **Chapter 5: Evaluation** - Presents results from accuracy tests, user studies, and performance analyses, discussing limitations.
- **Chapter 6: Conclusion and Future Work** - Summarizes findings, implications, and suggestions for extensions.

## 2. Related Work

Research on process model extraction from natural language text has evolved from rule-based methods to advanced NLP and LLM integrations, primarily in BPM contexts. Early approaches, such as those by Friedrich et al. (2011), used syntactic parsing and anaphora resolution to map text to BPMN elements, achieving around 77% similarity but struggling with ambiguities. Semantic techniques like Latent Semantic Analysis (LSA) and Latent Dirichlet Allocation (LDA) have been applied for activity matching and event log refinement, as in Stein et al. (2011) and Ramos-Gutiérrez et al. (2022).

Deep learning advancements, including LSTM networks, improved relation extraction, while recent LLM-based methods (e.g., BERT, GPT-3/4) have shown superior performance. Bellan et al. (2023) used GPT-3 in multi-turn dialogues for knowledge extraction from procedural texts, and Mustroph et al. (2023) leveraged GPT-4 for data preprocessing in social networks. Rebmann et al. (2022) applied BERT for semantic-aware process mining, enhancing model accuracy. A universal prompting strategy with LLMs outperforms traditional methods by up to 8% in F1 scores on PET datasets, enabling modular BPMN generation via chain-of-thought prompting.

Declarative models, focusing on constraints, contrast with imperative BPMN, as explored in Maqbool et al. (2023) for BPMN extraction from requirements. Challenges include handling long-distance relations, implicit information, and dataset limitations, with benchmarks revealing gaps in scalability. Recent developments (2024-2025) emphasize LLM integration for conversational modeling (Klievtsova et al., 2023) and future areas like process identification from documentation (Vidgof et al., 2023). Commercial tools like Bonita AI BPMN Generator exist but lack open integration. This thesis builds on these by creating a web-based explorer, addressing usability and end-to-end automation.

**Citations:**

- [Design Science in Information Systems Research - WISE](https://wise.vub.ac.be/sites/default/files/thesis_info/design_science.pdf)
- [Extracting Process Information from Natural Language](https://www.researchgate.net/publication/376032076_Extracting_Process_Information_from_Natural_Language)
- [Design Science in Information Systems Research](https://www.jstor.org/stable/25148625)
- [LLM-RAG Approach to Generate the Future Work of Scientific Article](https://arxiv.org/html/2503.16561v2)
- [Evaluating Large Language Models (LLMs) in Financial NLP - arXiv](https://arxiv.org/html/2507.22936v1)
- [Leveraging Open-Source Large Language Models for Clinical ...](https://arxiv.org/html/2507.20859v1)
- [Metadata Extraction and Validation in Scientific Papers Using LLMs](https://arxiv.org/html/2505.19800v1)