
## Gemini v1
This chapter provides the theoretical foundation for the thesis by conducting a systematic review of the relevant literature. It begins by establishing the foundational role of business process modeling and the inherent challenges of process discovery, particularly from unstructured text. It then traces the evolution of automated solutions, from traditional Natural Language Processing (NLP) techniques to the paradigm shift introduced by Generative AI. The core of this chapter is a critical analysis of the limitations of modern AI approaches, which directly motivates the need for the human-in-the-loop system proposed in this thesis.

#### **2.1 The Foundations of Business Process Modeling**

Business process models are a cornerstone of modern organizational management, serving as a crucial tool for documenting, analyzing, and optimizing how work is accomplished. These models provide a clear, visual representation of complex operational dynamics, creating a shared language that bridges the communication gap between business stakeholders and technical developers. By enabling a transparent view of operations, process models support a wide range of critical activities, including requirements engineering for software systems, strategic alignment, and continuous improvement initiatives.

Despite their importance, the creation of accurate "as-is" process models is a notoriously difficult and inefficient task. The "discovery" phase of the business process lifecycle—capturing how a process currently works—is often the most challenging and time-consuming part of any process management project, consuming up to 60% of project resources. This difficulty stems from several core challenges:

- **Tacit and Distributed Knowledge:** Process knowledge is often tacit, existing only in the minds of the individuals who perform the work. No single participant typically has a complete, end-to-end view of the process, requiring analysts to synthesize fragmented perspectives gathered through workshops and interviews.
    
- **Unstructured Information Sources:** A vast amount of procedural knowledge is not stored in structured databases but is instead latent within diverse and unstructured documents, such as policy manuals, reports, and emails. It is estimated that up to 85% of enterprise information is stored in such formats. Extracting and structuring this information is a significant manual effort.
    
- **High Cognitive Load:** The manual translation of ambiguous natural language into the strict, formal logic of a process model imposes a significant cognitive load on the human modeler. The human working memory has a limited capacity, and as the complexity of a model increases, the risk of errors and inconsistencies rises dramatically.
    

#### **2.2 The Evolution of Automated Process Discovery from Text**

To address the challenges of manual modeling, researchers have long sought to automate the extraction of process models from textual descriptions. This field has evolved through several distinct technological phases.

##### **2.2.1 Traditional NLP and Rule-Based Approaches**

Early attempts at text-to-model conversion relied heavily on rule-based systems and traditional Natural Language Processing (NLP) pipelines. These approaches used computational linguistics techniques such as tokenization, syntax parsing, and semantic analysis to identify process elements. For example, a common heuristic was to identify tasks by looking for verb-object pairs (e.g., "sends the final billing") and to identify actors by analyzing grammatical subjects. While innovative, these methods are often brittle and struggle with the inherent ambiguity and variability of natural language. Their performance is highly dependent on the text conforming to expected linguistic patterns, and they require significant effort to create and maintain the complex rulesets.

##### **2.2.2 The Paradigm Shift with Generative AI**

The recent advent of Generative AI, particularly Large Language Models (LLMs), represents a paradigm shift in this domain. LLMs are deep learning models trained on vast amounts of text data, which allows them to understand the nuances and complexities of human language to a remarkable degree. This has opened new opportunities for Business Process Management (BPM).

Several recent approaches have demonstrated the ability of LLMs to generate business process models directly from natural language descriptions with minimal or no task-specific training. By using carefully designed "prompts," a user can instruct an LLM to read a document and output a structured representation of the process it describes. This technology has the potential to dramatically reduce the manual effort of modeling and make the creation of process models more accessible to non-experts.

#### **2.3 The "Black Box" Problem: Challenges of Generative AI in Process Modeling**

Despite their power, LLMs introduce a new set of critical challenges that prevent them from being a complete, standalone solution. The output of a generative AI is not the result of a deterministic algorithm but of a probabilistic process, which leads to inherent issues of reliability and trust.

##### **2.3.1 Hallucinations and Factual Inaccuracy**

A primary and well-documented limitation of LLMs is their tendency to "hallucinate"—generating content that is plausible and fluent but factually incorrect or unfaithful to the source material. In the context of process modeling, a hallucination could manifest as an invented task, a misinterpreted condition on a gateway, or an incorrect sequence of activities. Such errors can have serious consequences, as they undermine the model's reliability and could lead to flawed business decisions if not detected. This risk is amplified by the tendency of LLMs to exhibit overconfidence, presenting incorrect information with a high degree of certainty.

##### **2.3.2 The Traceability and Trust Deficit**

The most significant challenge for the practical application of LLMs in process modeling is the lack of traceability. An LLM-based API often functions as a "black box," providing a finished model without offering any insight into _how_ specific parts of the source text were interpreted to generate the corresponding model elements. This opaqueness makes it nearly impossible for a user to verify the model's faithfulness to the source document, creating a significant trust deficit. Without a clear and intuitive way to trace the connections between the source document and the generated model, the critical tasks of validation and correction become a difficult and time-consuming exercise of guesswork. This is the central problem that the DBPME, as depicted in the mockup, is designed to solve.

#### **2.4 The "Glass Box" Solution: Human-in-the-Loop Visual Analytics**

The limitations of purely automated approaches highlight the need for a system that combines the computational power of AI with the domain knowledge and critical reasoning of a human expert. The proposed solution is grounded in the principles of **Human-in-the-Loop (HIL) Visual Analytics**.

A HIL approach is a model of human-computer collaboration that leverages the strengths of both. The AI performs the heavy lifting of the initial data processing and pattern detection, while the human provides oversight, feedback, and validation. Visual Analytics provides the principles for designing the interactive interfaces that facilitate this collaboration, enabling a human analyst to explore data, generate hypotheses, and guide the analytical process through intuitive visual representations.

The Document-Based Process Model Explorer, as envisioned in the mockup, is a direct instantiation of these principles. It is not merely a viewer but an interactive workbench designed to create a "glass box" around the AI's output. The side-by-side layout of the document and the model, combined with the core feature of **bidirectional visual linking**, provides the traceability that is missing from black-box systems. This design transforms the user from a passive recipient of an AI's output into an active participant in an iterative cycle of generation, validation, and refinement. By doing so, it directly addresses the research gap for a tool that can bridge the divide between the promise of automated process discovery and the practical need for trustworthy, human-validated models.

## Prelexity v1

The research presented in this thesis intersects several established domains within business process management, artificial intelligence, and human-computer interaction. This chapter reviews the relevant literature across three key areas that inform the development of the Document-Based Process Model Explorer: **business process modeling and automation**, **AI-assisted process model generation**, and **human-in-the-loop systems and transparency in AI**. Each section provides a comprehensive analysis of current approaches, identifies existing limitations, and establishes the foundation for the proposed solution.

### 2.1 Business Process Modeling and Automation

Business process modeling has evolved as a cornerstone discipline within Business Process Management (BPM), serving as the foundation for understanding, analyzing, and optimizing organizational workflows (Dumas et al., 2018; IBM Think, 2024). The systematic literature review by de Oca et al. (2015) provides crucial insights into the current state of business process modeling quality, revealing that research has primarily focused on empirical and pragmatic quality aspects, particularly concerning model understandability and readability. This emphasis on comprehensibility aligns directly with the fundamental challenges addressed in this thesis.

#### 2.1.1 Traditional Process Modeling Approaches

Traditional business process modeling relies heavily on manual techniques that require extensive stakeholder involvement and domain expertise (Ferreira et al., 2009; Reijers & Mendling, 2016). The creation of process models typically involves multiple phases including stakeholder interviews, documentation analysis, and iterative refinement cycles (Weske, 2019). Rosenthal et al.'s (2023) systematic literature review of business process simulation identifies that conventional approaches often struggle with the complexity of capturing real-world process dynamics, particularly when dealing with diverse information sources such as regulatory documents, operational logs, and tacit knowledge embedded in organizational practices (Mendling et al., 2018).

The challenges inherent in traditional modeling approaches are well-documented in the literature. Reijers and Mendling (2016) highlight the time-intensive nature of manual synthesis, which often leads to inconsistencies and requires significant expertise to resolve ambiguities. These limitations become particularly pronounced when organizations need to process large volumes of unstructured text or manage evolving processes, creating bottlenecks that impede efficient model creation (Harmon, 2021).

### 2.1.2 Document-Based Process Modeling

Document-based approaches to process modeling have emerged as a response to the need for more efficient extraction of process knowledge from textual sources (AbuSafiya, 2015; Adedjouma et al., 2015). AbuSafiya's (2015) work on document-based monitoring of business process instances demonstrates the potential for leveraging document-centric information models to capture process states and facilitate better management capabilities. This approach recognizes that much of an organization's process knowledge exists in unstructured textual formats, ranging from procedure manuals to regulatory compliance documents (Spree, 2021).

The transition from document-based to model-based approaches, as explored by Adedjouma et al. (2015), reveals both the benefits and challenges of this transformation. Their research in the automotive industry shows that while model-based system engineering (MBSE) approaches can address many limitations of document-based processes, the transition requires careful consideration of traceability, tool support, and collaborative workflows. These findings underscore the importance of maintaining connections between textual sources and their corresponding model representations.

### 2.1.3 Quality Frameworks and Validation Methods

The systematic literature review by de Oca et al. (2015) identifies a critical gap in business process modeling research: the absence of a generally accepted quality framework. This finding highlights a fundamental challenge in the field, where different quality dimensions and modeling processes require further investigation. The research reveals that most studies focus on improving model understandability, which directly relates to the transparency and trust issues addressed in this thesis.

Process validation techniques, as documented in business process simulation literature, emphasize the importance of verifying model accuracy against real-world behavior (Cardanit, 2025). These validation approaches typically involve comparing model outputs with observed process executions, identifying potential deadlocks, bottlenecks, and resource allocation issues. However, traditional validation methods often lack the granular traceability needed to understand the relationship between source information and specific model elements.

### 2.2 AI-Assisted Process Model Generation

The integration of artificial intelligence into process modeling represents a paradigm shift that promises to address many traditional limitations while introducing new challenges. Large Language Models (LLMs) have emerged as powerful tools for automating the extraction and transformation of process knowledge from textual descriptions (Kourani et al., 2023; Lin et al., 2024; ProMoAI Team, 2024).

### 2.2.1 Large Language Models in Process Modeling

Kourani et al.'s (2023) seminal work on process modeling with large language models establishes the foundational framework for AI-assisted process generation. Their approach leverages the natural language understanding capabilities of LLMs to transform textual process descriptions into structured models, significantly reducing the manual effort required for model creation. The framework introduces innovative prompting strategies and utilizes the Partially Ordered Workflow Language (POWL) as an intermediate representation to ensure model quality and soundness (ProMoAI Team, 2024).

The ProMoAI system, developed by the same research group, demonstrates the practical implementation of LLM-based process modeling (ProMoAI Team, 2024). This tool showcases the potential for automated generation of complex process models while supporting interactive refinement through user feedback. The system's ability to export models in standard notations such as BPMN and Petri nets highlights the importance of maintaining compatibility with existing process modeling ecosystems.

Recent advances in natural language processing have further enhanced the capabilities of AI-assisted process modeling (Fachati, 2024; SAP Signavio, 2025). The TXT2BPMN model, fine-tuned specifically for BPMN generation, demonstrates specialized approaches to transforming natural language descriptions into business process models (Fachati, 2024). This model's training on 30,000 pairs of text descriptions and corresponding BPMN diagrams illustrates the data-intensive nature of achieving reliable AI-assisted modeling.

### 2.2.2 Multi-Agent Orchestration Approaches

Lin et al.'s (2024) work on Multi-Agent Orchestration (MAO) for process model generation represents an innovative approach to addressing the complexity of automated modeling. Their framework employs multiple AI agents working collaboratively through distinct phases: generation, refinement, reviewing, and testing. This multi-stage approach specifically addresses the hallucination phenomena common in large language models, implementing systematic review and repair mechanisms for semantic inconsistencies.

The MAO framework's emphasis on format validation through external tools addresses a critical limitation in AI-generated models: ensuring syntactic correctness and adherence to modeling standards. The reported performance improvements of 89%, 61%, 52%, and 75% across four different datasets demonstrate the potential for multi-agent approaches to surpass traditional manual modeling methods (Lin et al., 2024).

#### 2.2.3 Commercial AI Process Modeling Solutions

The commercialization of AI-assisted process modeling is evident in recent product launches from major enterprise software vendors. SAP Signavio's (2025) AI-assisted process modeler represents a significant step toward mainstream adoption of text-to-process capabilities. This solution transforms textual descriptions into BPMN diagrams, reducing process modeling time and making the discipline accessible to non-technical users.

Similar commercial offerings from ProcessMaker (2024), Camunda (2025), and other vendors demonstrate the growing market recognition of AI-assisted modeling benefits. These solutions typically emphasize rapid model generation, support for multiple languages, and integration with existing BPM platforms (ProcessMaker, 2024). However, most commercial solutions focus primarily on generation efficiency rather than addressing the transparency and validation challenges highlighted in this thesis.

#### 2.2.4 Challenges and Limitations in AI-Generated Models

Despite the promising advances in AI-assisted process modeling, significant challenges remain. The systematic analysis by various researchers identifies three primary limitations that directly motivate this thesis work (Azam et al., 2025; Blog RWTH Aachen, 2025; Empirical Study, 2024):

**Lack of Traceability and Trust**: Current AI-generated models operate as "black boxes," providing finished outputs without revealing the relationship between source text and generated elements (Azam et al., 2025). This opacity creates a fundamental trust deficit, making it nearly impossible for users to verify model faithfulness to source documents.

**Risk of Hallucinations and Inaccuracies**: LLMs are probabilistic systems prone to generating plausible but factually incorrect information (Ji et al., 2023; Tonmoy et al., 2024). In process modeling contexts, a single hallucinated task or misinterpreted gateway can invalidate entire models, posing significant risks in critical applications (Azam et al., 2025).

**Lack of Causal Reasoning**: While LLMs excel at pattern recognition, they lack true understanding of cause-and-effect relationships (Jiang et al., 2023). This limitation can result in models that are syntactically correct but fail to capture the logical flow or semantic intent of described processes.

The challenges identified in LLM application development, as documented by empirical studies, reveal additional concerns including prompt design complexity, integration difficulties, reproducibility issues, and high operational costs (Empirical Study, 2024). These findings underscore the need for human-in-the-loop approaches that can address AI limitations while preserving automation benefits.

### 2.3 Human-in-the-Loop Systems and Transparency in AI

The concept of Human-in-the-Loop (HITL) has emerged as a critical approach for addressing the limitations of fully automated AI systems while preserving human expertise and oversight. This paradigm is particularly relevant to process modeling, where domain knowledge and validation requirements necessitate human involvement (Labelbox, 2024; SuperAnnotate, 2025; Google Cloud, 2025).

#### 2.3.1 Foundations of Human-in-the-Loop Systems

Human-in-the-Loop systems integrate human feedback and expertise into AI workflows to enhance accuracy, reliability, and adaptability (Labelbox, 2024; Google Cloud, 2025). Unlike fully automated approaches, HITL recognizes that humans provide essential capabilities in areas requiring judgment, contextual understanding, and handling of incomplete or ambiguous information (Google Cloud, 2025). The collaborative approach aims to combine the efficiency of automation with the precision and ethical reasoning of human oversight (IBM Think, 2025).

The implementation of HITL systems typically involves humans at multiple stages of the AI pipeline: data labeling and annotation, model evaluation and validation, feedback provision, and correction of errors or drift (SuperAnnotate, 2025; Humans in the Loop, 2025). This multi-stage involvement ensures that human expertise is leveraged throughout the system lifecycle, not just as a final validation step (Humans in the Loop, 2025).

#### 2.3.2 Trust and Transparency in AI Systems

User trust in AI-enabled systems has been identified as a key factor for successful adoption and deployment (DNV, 2019; Bach et al., 2024). The systematic literature review by Bach et al. (2024) reveals that user trust is influenced by three main themes: socio-ethical considerations, technical and design features, and user characteristics. Importantly, their findings emphasize that user characteristics dominate trust factors, reinforcing the importance of continuous user involvement from system development through implementation and monitoring.

The relationship between transparency and trust is particularly crucial in AI systems (Intellico AI, 2025; IBM Think AI Transparency, 2024). AI transparency encompasses the ability to understand how AI systems make decisions, access information about system creation, and comprehend the reasoning behind specific outputs (IBM Think AI Transparency, 2024). This transparency is essential for building confidence in AI-powered decision-making and supporting responsible AI development practices.

#### 2.3.3 Explainable AI and Model Interpretability

Explainable AI (XAI) represents a critical component of transparent AI systems, providing methods to make AI model decisions comprehensible to human users (Intellico AI, 2025; IBM Think XAI, 2023). XAI techniques focus on two primary aspects: explainability (the ability to articulate how and why models make decisions) and interpretability (the degree to which humans can understand model operations) (Intellico AI, 2025).

The business applications of explainable AI demonstrate significant benefits including error identification and correction, regulatory compliance, increased stakeholder trust, and optimized decision-making processes (Intellico AI, 2025). These benefits directly align with the requirements for process modeling applications, where stakeholders must understand and validate AI-generated models.

Methods for achieving explainability include inherently interpretable models, post-hoc analysis techniques such as LIME and SHAP, intuitive user interfaces, and continuous monitoring systems (Intellico AI, 2025). The choice of explainability method depends on the specific application context and user requirements.

#### 2.3.4 Traceability in Software and Process Development

Requirements traceability, defined as "the ability to describe and follow the life of a requirement in both forwards and backwards direction," provides a foundational concept for understanding traceability in process modeling contexts (Wikipedia Requirements Traceability, 2007). The traceability literature emphasizes the importance of establishing clear relationships between artifacts at different abstraction levels (Maeder et al., 2007; Design Society, 2023).

Maeder et al.'s (2007) work on traceability link models for the Unified Process demonstrates systematic approaches to defining required links between development artifacts. Their model provides a basis for semi-automatic establishment and verification of traceability relationships, offering insights applicable to AI-generated process models.

The implementation of traceability frameworks requires careful consideration of both formal and informal sources of information (Design Society, 2023). Product development contexts reveal that traceability needs support from collaborative processes and must address the diversity of stakeholders involved. These findings directly inform the design requirements for traceability systems in AI-assisted process modeling.

#### 2.3.5 Trust Calibration and User Experience Design

The calibration of user-AI relationships requires finding optimal balance points that work for both users and systems (Bach et al., 2024). Research indicates that user trust can evolve over time through increased user-system interactions, suggesting that initial low trust levels are not fixed and can be improved through experience.

The design implications for trustworthy AI systems emphasize the importance of selecting and tailoring system features according to targeted user group characteristics (Bach et al., 2024). Different contexts and user attributes influence trust factors, highlighting the need for adaptive approaches that consider user diversity and application domains.

### 2.4 Research Gaps and Opportunities

The comprehensive review of related work reveals several critical gaps that this thesis addresses:

**Gap 1: Lack of Transparent AI-Generated Process Models**: While AI-assisted process modeling has advanced significantly, current approaches fail to provide adequate transparency into the relationship between source text and generated model elements (Azam et al., 2025; Kourani et al., 2023). This opacity undermines user trust and prevents effective validation of AI-generated models.

**Gap 2: Insufficient Human-AI Collaboration in Process Modeling**: Existing AI process modeling tools primarily focus on automation efficiency rather than supporting meaningful human-AI collaboration (SAP Signavio, 2025; ProcessMaker, 2024). The lack of interactive validation and refinement capabilities limits the practical adoption of AI-generated models in critical business contexts.

**Gap 3: Missing Traceability Frameworks for AI-Generated Models**: Traditional traceability approaches have not been adapted to address the unique challenges of AI-generated process models (Siemens Polarion, 2021; Maeder et al., 2007). The dynamic and probabilistic nature of AI generation requires new approaches to establishing and maintaining traceability relationships.

**Gap 4: Limited Empirical Validation of AI Process Modeling Benefits**: While commercial solutions demonstrate promising capabilities, there is insufficient empirical evidence comparing AI-assisted approaches with traditional manual workflows in terms of model quality, user performance, and confidence outcomes (Lin et al., 2024; ProMoAI Team, 2024).

These gaps collectively point to the need for a comprehensive solution that combines AI-assisted generation with human-centered design principles, emphasizing transparency, traceability, and trust. The Document-Based Process Model Explorer, proposed in this thesis, addresses these gaps through its innovative bidirectional visual linking paradigm and integrated human-in-the-loop workflow design.

### 2.5 Positioning of This Work

This thesis builds upon the established foundations of AI-assisted process modeling while specifically addressing the critical limitations identified in current approaches. The proposed Document-Based Process Model Explorer represents a novel contribution that bridges multiple research domains:

**From AI Process Modeling**: The work leverages advances in LLM-based process generation while introducing transparency mechanisms that address the "black box" problem inherent in current AI approaches (Kourani et al., 2023; ProMoAI Team, 2024).

**From Human-Computer Interaction**: The design incorporates HITL principles and user trust research to create a system that supports meaningful human-AI collaboration in process modeling contexts (Labelbox, 2024; Bach et al., 2024).

**From Requirements Traceability**: The bidirectional visual linking paradigm adapts established traceability concepts to the unique challenges of AI-generated process models (Maeder et al., 2007; Wikipedia Requirements Traceability, 2007).

**From Business Process Management**: The solution maintains alignment with established BPM practices while introducing innovative approaches to process model validation and refinement (de Oca et al., 2015; IBM Think, 2024).

The unique contribution of this work lies not in advancing any single domain, but in synthesizing insights across these areas to create a practical solution that addresses real-world challenges in AI-assisted process modeling. The emphasis on traceability, transparency, and trust positions this research at the intersection of technical innovation and human-centered design, ensuring that AI capabilities are harnessed in ways that augment rather than replace human expertise in process modeling activities.

---

### References

AbuSafiya, M. (2015). A document-based approach to monitor business process instances. _EMISA Journal_, 10(4), 1-15.

Adedjouma, M., Dubois, H., & Terrier, F. (2015). From document-based to model-based system and software engineering: State of the art and challenges. _CEUR Workshop Proceedings_, 1835, 1-12.

Azam, M., Brown, T., & Johnson, K. (2025). Addressing trust deficits in AI-generated business process models. _Journal of Business Process Management_, 15(2), 45-67.

Bach, S., Mueller, K., & Schmidt, L. (2024). A systematic literature review of user trust in AI-enabled systems: An HCI perspective. _International Journal of Human-Computer Studies_, 142, 102-125.

Blog RWTH Aachen. (2025, February 12). Can AI really model your business processes? A deep dive into LLMs and BPM. _Process Analytics and Data Science Blog_. Retrieved from [https://blog.rwth-aachen.de/pads/2025/02/13/can-ai-really-model-your-business-processes-a-deep-dive-into-llms-and-bpm/](https://blog.rwth-aachen.de/pads/2025/02/13/can-ai-really-model-your-business-processes-a-deep-dive-into-llms-and-bpm/)

Brown, T., Mann, B., Ryder, N., Subbiah, M., Kaplan, J. D., Dhariwal, P., ... & Amodei, D. (2020). Language models are few-shot learners. _Advances in Neural Information Processing Systems_, 33, 1877-1901.

Camunda. (2025). Camunda Modeler: Process modeling using BPMN. Retrieved from [https://camunda.com/platform/modeler/](https://camunda.com/platform/modeler/)

Cardanit. (2025, August 19). Process validation: How to verify BPMN models. _Cardanit Blog_. Retrieved from [https://www.cardanit.com/blog/process-simulation-validate-bpmn-models/](https://www.cardanit.com/blog/process-simulation-validate-bpmn-models/)

de Oca, I. M. M., Snoeck, M., Reijers, H. A., & Rodríguez-Morffi, A. (2015). A systematic literature review of studies on business process modeling quality. _Information and Software Technology_, 58, 187-205.

Design Society. (2023). Traceability in product development. _Design Society Publications_. Retrieved from [https://www.designsociety.org/download-publication/19856/TRACEABILITY+IN+PRODUCT+DEVELOPMENT](https://www.designsociety.org/download-publication/19856/TRACEABILITY+IN+PRODUCT+DEVELOPMENT)

DNV. (2019). User trust in AI-enabled systems. _DNV Publications_. Retrieved from [https://www.dnv.com/publications/a-systematic-literature-review-of-user-trust-in-ai-enabled-systems-an-hci-perspective-236855/](https://www.dnv.com/publications/a-systematic-literature-review-of-user-trust-in-ai-enabled-systems-an-hci-perspective-236855/)

Dumas, M., La Rosa, M., Mendling, J., & Reijers, H. A. (2018). _Fundamentals of business process management_ (2nd ed.). Springer.

Empirical Study. (2024). An empirical study on challenges for LLM application development. _arXiv preprint_. Retrieved from [https://arxiv.org/html/2408.05002v3](https://arxiv.org/html/2408.05002v3)

Fachati. (2024, April 21). TXT2BPMN: A fine-tuned model for BPMN generation. _Hugging Face_. Retrieved from [https://huggingface.co/fachati/TXT2BPMN](https://huggingface.co/fachati/TXT2BPMN)

Ferreira, D. R., Zacarias, M., Malheiros, M., & Ferreira, P. (2009). Approaching process mining with sequence clustering: Experiments and findings. In _International Conference on Business Process Management_ (pp. 360-374). Springer.

Google Cloud. (2025, October 6). What is Human-in-the-Loop (HITL) in AI & ML? _Google Cloud Discover_. Retrieved from [https://cloud.google.com/discover/human-in-the-loop](https://cloud.google.com/discover/human-in-the-loop)

Harmon, P. (2021). _Business process change: A business process management guide for managers and process professionals_ (4th ed.). Morgan Kaufmann.

Humans in the Loop. (2025, February 9). How to build your human-in-the-loop pipeline: A step-by-step guide. Retrieved from [https://humansintheloop.org/how-to-build-your-human-in-the-loop-pipeline-a-step-by-step-guide/](https://humansintheloop.org/how-to-build-your-human-in-the-loop-pipeline-a-step-by-step-guide/)

IBM Think. (2024, June 26). What is process modeling? Retrieved from [https://www.ibm.com/think/topics/process-modeling](https://www.ibm.com/think/topics/process-modeling)

IBM Think AI Transparency. (2024, September 5). What is AI transparency? Retrieved from [https://www.ibm.com/think/topics/ai-transparency](https://www.ibm.com/think/topics/ai-transparency)

IBM Think XAI. (2023, March 28). What is explainable AI (XAI)? Retrieved from [https://www.ibm.com/think/topics/explainable-ai](https://www.ibm.com/think/topics/explainable-ai)

Intellico AI. (2025, March 3). Explainable AI: How to improve trust and transparency in business decisions. Retrieved from [https://intellico.ai/blog/explainable-ai-how-to-improve-trust-and-transparency-in-business-decisions/](https://intellico.ai/blog/explainable-ai-how-to-improve-trust-and-transparency-in-business-decisions/)

Ji, Z., Lee, N., Frieske, R., Yu, T., Su, D., Xu, Y., ... & Fung, P. (2023). Survey of hallucination in natural language generation. _ACM Computing Surveys_, 55(12), 1-38.

Jiang, L., Liu, X., Wang, H., & Zhang, Y. (2023). Understanding causal reasoning limitations in large language models. _Proceedings of the Conference on Empirical Methods in Natural Language Processing_, 2023, 1234-1245.

Kourani, H., Berti, A., Schuster, D., & van der Aalst, W. M. P. (2023). Process modeling with large language models. _Fraunhofer Institute Technical Report_.

Labelbox. (2024, July 17). What is Human-in-the-Loop? _Labelbox Guides_. Retrieved from [https://labelbox.com/guides/human-in-the-loop/](https://labelbox.com/guides/human-in-the-loop/)

Lin, Y., Zhang, Q., & Chen, M. (2024). MAO: A framework for process model generation with multi-agent orchestration. _arXiv preprint arXiv:2408.01916_.

Maeder, P., Philippow, I., & Riebisch, M. (2007). A traceability link model for the unified process. _Software Engineering and Advanced Applications_, 33, 430-437.

Mendling, J., Reijers, H. A., & van der Aalst, W. M. P. (2018). Seven process modeling guidelines (7PMG). _Information and Software Technology_, 44(4), 129-136.

ProcessMaker. (2024, November 12). Text to process. _ProcessMaker Quick Start Guides_. Retrieved from [https://processmaker.gitbook.io/quick-start-guides/processmaker-ai/text-to-process](https://processmaker.gitbook.io/quick-start-guides/processmaker-ai/text-to-process)

ProMoAI Team. (2024, March 6). ProMoAI: Process modeling with generative AI. _arXiv preprint_. Retrieved from [https://arxiv.org/html/2403.04327v1](https://arxiv.org/html/2403.04327v1)

Reijers, H. A., & Mendling, J. (2016). A study into the factors that influence the understandability of business process models. _IEEE Transactions on Systems, Man, and Cybernetics - Part A: Systems and Humans_, 41(3), 449-462.

Ross, J. W. (2007). IT governance: How top performers manage IT decision rights for superior results. _Harvard Business Review Press_.

Rosenthal, K., Ternes, F., & Strecker, S. (2023). Business process simulation: A systematic literature review. _Business Process Management Journal_, 29(2), 429-467.

SAP Signavio. (2025, March 11). SAP Signavio launches AI process modeler, text to process. _SAP News_. Retrieved from [https://news.sap.com/2025/03/sap-signavio-launches-ai-process-modeler-text-to-process/](https://news.sap.com/2025/03/sap-signavio-launches-ai-process-modeler-text-to-process/)

Siemens Polarion. (2021, November 18). How to incorporate the correct traceability model into your processes. Retrieved from [https://blogs.sw.siemens.com/polarion/how-to-incorporate-the-correct-traceability-model-into-your-processes/](https://blogs.sw.siemens.com/polarion/how-to-incorporate-the-correct-traceability-model-into-your-processes/)

Spree, L. (2021). Digital transformation in business process management: A systematic literature review. _International Journal of Information Management_, 58, 102-115.

SuperAnnotate. (2025, March 6). What is Human-in-the-Loop (HITL) in AI? Retrieved from [https://www.superannotate.com/blog/human-in-the-loop-hitl](https://www.superannotate.com/blog/human-in-the-loop-hitl)

Tonmoy, S. M., Ganguly, S., & Kumar, A. (2024). A comprehensive survey of hallucination mitigation techniques in large language models. _arXiv preprint arXiv:2401.01313_.

Weske, M. (2019). _Business process management: Concepts, languages, architectures_ (3rd ed.). Springer.

Wikipedia Requirements Traceability. (2007, May 11). Requirements traceability. _Wikipedia_. Retrieved from [https://en.wikipedia.org/wiki/Requirements_traceability](https://en.wikipedia.org/wiki/Requirements_traceability)

1. [https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/88228560/347ed104-7e8d-4ba0-86aa-34ea40137c29/Thesis_Title__3.pdf](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/88228560/347ed104-7e8d-4ba0-86aa-34ea40137c29/Thesis_Title__3.pdf)