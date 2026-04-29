
With the rise of large language models, many AI-assisted tools have emerged, which have greatly improved the efficiency of process modeling.

However, most of these tools are primarily designed for text input. A few tools have started to support document upload, but this is usually not their primary design focus.

At the same time, in practice, most process information is typically stored in documents.

  

In addition, current tools usually focus on a single model. This makes it less flexible to decompose large processes into sub-processes or to connect related models, especially in complex scenarios.

So, with these limitations, current AI-assisted tools are still not ideal for process modeling from documents.

  

Before we go further, let’s briefly look at the current landscape of AI-assisted tools.

In the academic area, this table shows most of the existing tools. The first one, one of the earliest, is ProMoAI, published in 2024. At that time, it already supported not only automated generation but also iterative refinement.

  

However, most academic tools mainly focus on aspects such as model correctness, quality, token efficiency, or prompting strategies. Here, I only highlight a few examples with some special features.

  

The first is AutoBPMN.AI. It is actually the only one among these tools that supports file upload. However, as you can see, it only supports TXT format. After uploading, you can edit the text, but you lose the exact source of the original document.

  

The last one shown here supports multiple input modalities. For example, it allows audio upload.

  

Several other tools I would like to briefly mention include one that focuses on error detection and more advanced BPMN features, such as collaboration between different lanes. Another recent tool focuses on querying specific parts of the model.

  

That is the overview of current academic tools.

  

In industry, one commercial tool I found recently already supports document upload. As you can see, with appropriate prompts, it allows you to extract the required information from documents. However, although document upload is supported, it is still not ideal for process modeling from documents.

  

The main challenges include difficulty in verifying model correctness and a lack of traceability between the source text and the model.

  

Based on these challenges, we propose a different design solution for this scenario.

  

The basic features should meet the following criteria. First, it should support multiple document uploads. After uploading a document, users should be able to view its content, select relevant parts, and then use these selections with an LLM service to directly generate models, improving efficiency.

  

In addition, the view should support multiple models simultaneously, allowing users to have a clearer overview of their project or use case.

  

Beyond these basic requirements, we also include value-added features such as iterative design through a chatbot.

  

Furthermore, since documents naturally involve updates and versioning, we introduce features such as document updates and versioning, and we design the model to support versioning as well.

  

Before moving to the prototype demo, I will briefly give a system overview.

  

The final implementation of the web application consists of three pages. The first is the entry page, where users can organize all their use cases. For each use case, a new project can be created.

  

Then, users move to the workspace page, which is the main modeling view.

  

Finally, for each project, there is a dedicated statistics page where users can view historical information. This part is not fully developed yet, but we plan to include it.

  

Now let me move to the prototype demo.

  

And that concludes the live demo. Now let’s move on to the evaluation part.

  

The procedure is as follows. We invited four experts to participate in our trial. First, I introduced the system, and then assigned them tasks.

  

The first task was a fictional scenario consisting of two Word files. The second task was a real-world SOP procedure with five pages.

  

If time permitted, participants also completed a questionnaire with four open-ended questions, asking about their most liked features, disliked aspects, and expected improvements or additional features.

  

Finally, we included a usage intention question, asking whether they would like to use the system in the future.

  

Regarding the results, the overall feedback was that the tool is intuitive and useful. Here are two screenshots created by one expert during the evaluation.

  

However, since participants had different interests, their feedback varied across different aspects.

  

The most positive aspects mentioned include the integrated service, fast response time, and good output quality.

  

The model versioning feature was also considered very helpful, although one expert expected a comparison feature.

  

The process relationship feature was perceived as convenient and useful.

  

The graph view was mentioned as helpful for larger systems, although improvements were suggested, such as enhancing visual clarity.

  

The augmented model data feature was also positively mentioned.

  

Regarding improvements, one issue identified is that when viewing a model, if the user wants to start a new model from scratch, they must first deselect the current model and clear its contents. Otherwise, the system assumes the user is editing the existing model.

  

This is a limitation of the multi-model workspace design. Although it is intuitive, it requires some time for users to become familiar with it.

  

Another issue mentioned is that the confirmation step for accepting a model was considered unnecessary by two participants. From a design perspective, this feature could remain but be made optional through a settings page.

  

Another problem is the lack of transparency in how the LLM services are used. Since we use two different modes—one based on selected text and another based on chatbot interaction—I often had to explain this to users.

  

One idea is to introduce a switch button to combine these two modes, improving usability.

  

Another important issue is document readability. Since the system aims to support the full workflow from document reading to model export, document readability is critical and should be continuously improved.

  

Finally, some interesting findings emerged. Participants expressed interest in more advanced features, such as AI-assisted document interaction. For example, the chatbot could automatically identify and select process-related text, reducing manual work.

  

Another expectation relates to traceability. While we provide a link between source text and generated models, there is still a gap between the actually used text and the model. Participants expect more fine-grained traceability.

  

For example, if 1000 words are selected but only a small part is used in the model, the system should indicate exactly which part was used.

  

This is currently challenging due to limitations of LLM capabilities, but it could be a future research direction, possibly through fine-tuned APIs.

  

That concludes my presentation. Thank you for listening!
  

  


  



  



