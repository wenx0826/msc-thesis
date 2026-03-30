https://docs.google.com/forms/d/1z8tQs6BhK9DI4bTQMJhW-TaePJTFmM39FKR7MbfYHOk/edit#responses

## 1. What aspects of the system did you like while using it?

Expert 1:
- Intuitive to use - Fast - Quality good for a first draft
- Displaying other models on the right side helps users compare different versions
- Logging the prompts the user provided is essential (for the future)

Expert 2:
- The versioning is extremely useful. 
- Connecting with the subprocesses is convenient. 
- The visualization is helpful for larger systems. 
- Using the system is intuitive. 
- Plenty of extra features for analysis, including the logs and the statistics page. 
- Overall an extremely useful tool that just needs two more essential features (see below).

Expert 3:
- documents can be split into multiple inputs for process creation
- link between text and models is clear
- text which led to changes in the model are included in the XML data
- version management is nice
- linking between sub-/superprocesses works well

~~Expert 4:~~
- ~~I like the easy upload feature.~~
- ~~The process model is generated quickly after clicking on "Generate".~~
## 2. What aspects of the system did you not like or find problematic?

~~Expert 1: I answer to this question in the next~~

Expert 2: 
- <span style="background:rgba(140, 140, 140, 0.12)">On the main projects page I cannot open in a new Tab. </span>
- <span style="background:rgba(240, 107, 5, 0.2)">Uploading pdfs is inconvenient as they are displayed very badly.</span> 
- <span style="background:rgba(3, 135, 102, 0.2)">The extra save click after every generation is unneeded, especially since the system has very good version management anyway.</span>

Expert 3:
- visualization between sub-/superprocesses is not broken down by their version 
- changes (i.e., sub-/superprocess relationships get lost when adapting the process model with a new prompt or when adding new text) 
- <span style="background:rgba(240, 200, 0, 0.2)">saving of newly generated models and deselection of model to create new model sometimes feels strange but it makes sense once it is understood</span>

Expert 4:
- <span style="background:rgba(240, 200, 0, 0.2)">Selecting and deselecting the text is unintuitive</span>.
- ~~The use of the tool is not clear to me~~
- <span style="background:rgba(240, 200, 0, 0.2)">How I can change something, start new iterations, and</span> ~~select models~~ <span style="background:rgba(240, 200, 0, 0.2)">is not totally clear</span>. 
- <span style="background:rgba(240, 107, 5, 0.2)">How to interpret the knowledge graph is not clear.</span>

## 3. What improvements or additional features would you most like to see in the system?

Expert 1: 
1. How to you measure the quality from your process model? Can you do it automatically? Would it be possible to increase the quality of the model automatically? (e.g., when there are activities duplicated, look for a way to avoid it) -> "Refactoring large process model repositories" https://www.sciencedirect.com/science/article/pii/S0166361510001843 (This paper proposes a catalogue of process model “smells” for identifying refactoring opportunities.) 
2. When the LLM generates a model and then you send instructions to modify it, it would be really useful that the LLM indicates in natural language text the differences between the two models. "Identifying and Evaluating Change Patterns and Change Support Features in Process-Aware Information Systems" (https://dbis.eprints.uni-ulm.de/id/eprint/419/) 
3. When the user sends an instruction to the LLM, does the LLM try to find a change pattern and then apply it?, as it has been done in "Conversational Process Model Redesign" (https://arxiv.org/abs/2505.05453) 
4. It can be useful to let the user grade manually the quality of the model and even adding a extra note. To improve LLM answers in the future / similar direction to reinforcement learning. (see https://huggingface.co/learn/llm-course/chapter12/2) 
5. How the user can know which parts of the selected text were considered for modelling? 
6. When something remains ambiguous and the LLM interprets it in a certain way, can this be flagged so that the user is aware of the ambiguity? 
7. In the documentation it can be useful to add a diagram representing the interaction between the human, LLM, and others. 
8. In the bottom-right corner, there is a knowledge representation showing the connections between processes / subprocesses / docus. This box should be labeled more clearly, and the nodes should be better differentiated. It was difficult to distinguish between nodes representing documents and those representing models. 
9. <span style="background:rgba(240, 200, 0, 0.2)">Instead of calling the button to unselect text "delete selection" call it "unselect text". This might be personal but I though after clicking on "delete selection" the text which is selected it would be deleted. </span>
10. <span style="background:rgba(3, 135, 102, 0.2)">Save the first version generated by the LLM by default.</span> 
11. <span style="background:rgba(240, 200, 0, 0.2)">Instead of calling the "deselect" model like that, better call it "clear view" or something which is more intuitive.</span> 
12. <span style="background:rgba(240, 200, 0, 0.2)">When using the tool, it was unclear whether the LLM considers the full text along with the instructions, or only the instructions when answering a query. </span>
13. <span style="background:rgba(5, 117, 197, 0.2)">It was not intuitive that submitting a new prompt creates a new version of the model. In contrast, manually modifying the model does not create a new version, and it is not possible to revert those changes. </span>
14. <span style="background:rgba(92, 92, 92, 0.2)">After generating a model, if I deselected it and then selected different text to regenerate it, the output was still based on the previous information.</span>
15. It would be very useful to not only have a console for iteratively refining the process model through instructions, but also to ask the LLM questions about the model it generated. In practice, when a colleague creates a process model from scratch and we review it, we often have several follow-up questions. The same should apply here. For example, I would like to be able to ask the LLM about specific design decisions ~ such as the purpose of introducing a particular XOR gateway.

Expert 2: 
(A) Very Important: 
	(1) Add a feature to search for processes fitting to a simple instructions from the documents which then selects which parts of the document are used for grounding, which the user can then extend. 
	(2) Add an option to add already generated Models to the context information, such that it does not generate activities in multiple processes. 
(B) Medium Effort, but highly valuable: 
	Look into better printing of uploaded pdfs, there are countless pdf pretty printing libraries that could help here. 
(C) Minor Features: 
	(1) Make the extra save click unnecessary, default behavior should be to add a new version no matter where on the screen I click after generate. 
	(2) In the start page add a "open in new page" option, I am unsure how it is missing. 
	(3) Add an option to prompt different models. 
	(4) Quick start video button is still missing. 
	(5) When swapping documents Simple: go back to top; Ideal: keep a per document state of the scroll "distance"

Expert 3:
-  relationship (i.e., super-/subprocess) visualization graph allows to choose versions or shows just the last version

Expert 4: 
- ~~Differentiation, that the UI reflects one use case/ instance~~ 
- Fix the bugs: For example, if I only select one word, there should be a warning or error message that with this context, no process model, or a default model is created.
- More context in the knowledge graph: For example distance and interpretation of similar or dissimilar processes models and texts.


## 4. If you needed to model processes from documents in the future, would you consider using this system? Why or why not?

Expert 1: 
Yes, it has definitely potential. However, I cannot fully assess how useful the tool is, because before modeling a process I need to understand the problem and how the process should look. I am concerned that generating a draft process without fully reading the documentation could introduce bias. This could be mitigated by indicating which parts were not considered or modeled~this link was missing. Users may require time to process the info. If a draft is generated too quickly, this assimilation step may be bypassed :?

Expert 2:
Yes, particularly the repository feature to connect the different models is already very valuable. However, it still desperately needs a way to generate models from documents with an instruction that makes the LLM search the document first (i.e., RAG).

Expert 3: 
yes, because it is easy to use and shows which text is/was used for different process models in an easily understandable way

~~Expert 4~~: 
~~I have no answer here~~