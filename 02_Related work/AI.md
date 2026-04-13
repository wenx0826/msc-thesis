This literature review synthesizes the recent advancements in Large Language Model (LLM)-based business process modeling, focusing on the transformation of natural language into structured **Business Process Model and Notation (BPMN)** diagrams.

1. The Paradigm Shift from Rule-Based to LLM-Driven Modeling

Traditionally, automating process model generation relied on **rule-based NLP** and computational linguistics, such as part-of-speech tagging and syntactic parsing. These approaches often struggled with linguistic ambiguity, complex sentence structures, and domain-specific terminology. The advent of **LLMs** has transformed the field by providing a more flexible way to interpret natural language and generate structured outputs. ==Research indicates that AI-generated models are often preferred over those created by inexperienced human modelers, potentially reducing the time spent on process management projects by up to 60%.==

2. Technical Architectures and Intermediate Representations

A central theme in current research is the debate between direct XML generation and the use of **intermediate representations**.

- **Direct XML Manipulation:** While common, generating BPMN 2.0 XML directly is often verbose, slow, and prone to syntax errors and reference hallucinations during complex modifications.
- **Structured Intermediate Formats:** To improve reliability, many systems utilize structured formats like **JSON** (BPMN Assistant, BPMN-Chatbot) or **POWL** (ProMoAI). **BPMN Assistant** demonstrates that a JSON-based approach can reduce output token counts by over 75% and generation latency by 43% compared to direct XML. Similarly, **ProMoAI** uses POWL to provide inherent structural guarantees, such as avoiding dead nodes in the process.
- **Block-Structured vs. Graph-Structured:** Tools like the **BPMN-Chatbot** use block-structured intermediate formats to compute planar graphs that ensure deterministic coordinates for elements, improving visual consistency during iterative edits.

3. Interaction Paradigms: Conversational and Direct Manipulation

Modern tools have moved beyond one-shot generation to support **iterative refinement**.

- **Conversational Interfaces:** Systems like **KICoPro**, **PRODIGY**, and **AutoBPMN.AI** allow users to refine models through guided dialogue. This enables users to clarify logic, add elements, or optimize workflows step-by-step.
- **Direct Manipulation:** **HyperMod** introduces a hybrid approach where users can select specific visual elements in a diagram to ground their natural language prompts (e.g., "extend the error-handling for _this_ sub-process"). This reduces the mental load of referring to elements textually and conveys intent more unambiguously.

4. Multimodality: Expanding Input Sources

Researchers are increasingly exploring inputs beyond structured text.

- **Audio and Voice:** Tools such as **LLM4BPMNGen** and **BPMN-Chatbot** support voice recordings and audio uploads, which are transcribed into text using models like Whisper-1 before being modeled.
- **Video and Multimodal AI:** A groundbreaking study in judicial workflows proposes a two-stage pipeline using **NotebookLM** (Gemini) for multimodal video analysis and **ChatGPT** (GPT-4) for XML generation. This allows domain experts to describe processes naturally on camera, eliminating the need for manual transcription and capturing nuances like gestures.

5. Human Factors and Practical Evaluation

Recent studies emphasize the importance of **human-centered evaluation** alongside automated benchmarks.

- **The Usability-Trust Gap:** **KICoPro**'s evaluation with experts revealed that while usability is perceived as high, trust in output reliability remains low. Experts rated reliability as the most critical concern, noting that LLMs can sometimes violate BPMN standards or organization-specific conventions.
- **The Prompting Paradox:** Users often understand the goal of generating a model but struggle to formulate prompts that achieve useful results, leading to a "gulf of execution".
- **Enterprise Constraints:** In industrial contexts like the **Hilti Group**, data privacy is a significant barrier to using public APIs, driving interest in locally hosted, open-weight models like **DeepSeek V3**. Research shows that using structured intermediate representations can significantly boost the performance of these smaller models, making them viable for enterprise use.

6. Conclusion and Future Directions

While current LLM tools excel at "tabula rasa" generation of simple processes, significant challenges remain. Most existing tools do not yet support advanced BPMN elements such as **pools, lanes, message flows, and data objects**. Future research is expected to focus on integrating domain-specific ontologies, improving the handling of cyclic dependencies, and developing collaborative modeling environments in the industrial metaverse.

NotebookLM 提供的内容未必准确，因此请仔细核查回答内容。