# Master's Thesis Proposal: Development of a Document-Based Process Model Explorer Web Application

## Title

Document-Based Process Model Explorer: A Web Application for Automated Extraction and Visualization of Process Models from Textual Documents

## Introduction

In today's fast-paced business environment, organizations rely heavily on process modeling to document, analyze, and optimize their operations. Process models, such as those represented in Business Process Model and Notation (BPMN), provide a visual representation of workflows, activities, actors, and dependencies. However, creating these models manually from textual documents—like reports, manuals, or procedural guidelines—is time-consuming, error-prone, and requires expertise in modeling notations. This is particularly challenging in domains like business process management (BPM), where documents often contain natural language descriptions of processes that need to be translated into structured models.

The proposed master's thesis aims to develop an online web application called the "Document-Based Process Model Explorer" (DBPME). This tool will allow users to upload various document formats (e.g., TXT, PDF, DOC), automatically extract process elements using natural language processing (NLP) and large language models (LLMs), generate interactive process models (e.g., BPMN-like diagrams), and enable exploration through linked text highlights and model properties. The mockup provided illustrates key features: a document list for uploads, a central model viewer with flowcharts, and side panels for properties and related documents.

This project addresses the gap between unstructured textual data and structured process representations, leveraging recent advancements in AI-driven process extraction to enhance accessibility for non-experts. By automating this process, DBPME can improve efficiency in industries such as manufacturing, healthcare, and software development, where process documentation is critical.

## Problem Statement

Traditional process modeling tools, like Bizagi Modeler or Camunda Modeler, focus on manual diagram creation and require users to interpret and input data from documents themselves. Existing automated approaches for extracting process models from text are often research prototypes, limited to specific datasets, or not integrated into user-friendly web interfaces. Challenges include handling linguistic variations (e.g., synonyms, ambiguities), supporting multiple document formats, and providing interactive exploration features.

Current limitations highlighted in literature include the lack of comprehensive datasets for training, inconsistent evaluation metrics, and scalability issues with complex texts. Moreover, while tools exist for declarative or imperative model extraction, few offer end-to-end web-based solutions that link extracted models back to source texts for verification and editing.

## Objectives

The primary objective is to design, implement, and evaluate a web application that automates process model generation from documents. Specific sub-objectives include:

1. Develop a backend system for document parsing and process element extraction using NLP and LLMs.
2. Create a frontend interface for uploading documents, visualizing models, and interacting with elements (e.g., highlighting linked text).
3. Support multiple model types (e.g., BPMN, declarative constraints) and document formats.
4. Evaluate the tool's accuracy, usability, and performance against benchmarks.
5. Contribute to the field by open-sourcing the application and documenting methodologies for future extensions.

## Literature Review

Research on process model extraction from text has advanced significantly with NLP and AI techniques. Early methods used rule-based parsing to map textual descriptions to BPMN elements, involving steps like tokenization, semantic analysis with tools like Stanford Parser and WordNet, and anaphora resolution to handle pronouns and references. These approaches achieve around 77% similarity to manual models but struggle with noise and meta-sentences.

More recent works leverage LLMs for entity detection (activities, actors), relation extraction, and model generation. A universal prompting strategy using models like GPT-4o outperforms traditional methods by up to 8% in F1 scores on datasets like PET, enabling BPMN generation through modular prompts with chain-of-thought and few-shot learning. Declarative models, focusing on constraints rather than sequences, have been extracted using similar NLP for verb/noun identification and temporal relations, contrasting with imperative BPMN by better handling flexible processes.

Benchmarking studies compare tools on datasets like PET, revealing gaps in handling long-distance relations and implicit information. Commercial tools like Bonita AI BPMN Generator demonstrate practical applications but lack open integration. This thesis builds on these by integrating LLM-based extraction into a web platform, addressing usability for real-world documents.

## Methodology

The development will follow an agile approach, divided into phases:

### System Architecture

- **Frontend**: Built with React.js for interactive UI, including drag-and-drop uploads, diagram rendering (using libraries like React Flow or BPMN.js), and text highlighting.
- **Backend**: Node.js or Python (Flask/Django) server for processing. Document parsing via libraries like pdf.js, docx, or Tika for multi-format support.
- **Extraction Engine**: Integrate NLP tools (spaCy, NLTK) for preprocessing and LLMs (e.g., via OpenAI API or Hugging Face models) for element extraction. Use prompting strategies to identify activities, gateways, flows, and relations.
- **Database**: MongoDB or PostgreSQL to store models, documents, and linkages.
- **Deployment**: Host on AWS or Vercel for scalability.

### Implementation Steps

1. **Document Ingestion**: Upload and parse files, extract text.
2. **Process Extraction**: Apply LLM prompts to detect elements; generate BPMN XML or JSON representations.
3. **Model Generation**: Convert extractions to visual diagrams, link to text snippets.
4. **Exploration Features**: Allow renaming, deleting, exporting models; regenerate on edits.
5. **Testing**: Unit tests for extraction accuracy; user studies for usability.

### Evaluation

- **Quantitative**: Compare generated models to ground truth using metrics like Graph Edit Distance on PET dataset. Aim for >80% accuracy.
- **Qualitative**: User feedback via surveys on interface intuitiveness.
- **Performance**: Measure response times for extraction on varied document sizes.

## Timeline

- **Month 1-2**: Literature review, requirements gathering, prototype design.
- **Month 3-4**: Backend development and extraction engine.
- **Month 5-6**: Frontend implementation and integration.
- **Month 7**: Testing, evaluation, and refinements.
- **Month 8**: Thesis writing and defense preparation.

## Expected Outcomes

The thesis will deliver a functional web application, a comprehensive report on methodologies and evaluations, and potential publications on AI-driven process exploration. This tool could serve as a foundation for commercial extensions, reducing manual modeling efforts by 50-70% based on literature benchmarks.

## References

- See citations inline for sources.
