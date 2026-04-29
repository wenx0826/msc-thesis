Good morning everyone. I’m Xin. Welcome to this thesis final  presentation on topic—Document-Based Process Modeler.

Let me begin with the motivation.

![[Recording 20260426212318.m4a]]

![[Pasted image 20260426213058.png]]
<font color="#646a73">With the rise of large language models, many AI-assisted tools have emerged, which have greatly improved the efficiency of process modeling.</font>

<font color="#646a73">However, most of these tools only support text input.</font>
<font color="#646a73">At the same time, in practice, process information is often stored in documents, like requirement specifications, reports, guidelines, or SOPs, usually as PDFs or Word files.</font>

<font color="#646a73">This creates a gap between real-world data and current AI-assisted tools.</font>
<font color="#646a73">In addition, current tools typically focus on a single model, making it less flexible and convenient to decompose one big processes into sub-processes or to connect related models, especially in large or complex scenarios.</font>

<font color="#646a73">So, with these limitations, current AI-assisted tools are still not ideal for process modeling from documents.</font>



With the rise of large language models, many AI-assisted tools have emerged, which have greatly improved the efficiency of process modeling.

However, most of these tools are primarily designed for text input.
A few tools have started to support document upload, but this is usually not their primary design focus.
At the same time, in practice, process information is typically stored in documents.

In addition, current tools usually focus on a single model~~, which makes it less flexible when dealing with large or complex processes.~~,
This makes it less flexible to decompose one large process into sub-processes or to connect related models, especially in complex scenarios.

~~In real-world scenarios, one process could be described across multiple documents, or one document may contain several sub-processes that should be modeled separately and then connected.~~

So, ~~with these limitations, Therefore, despite recent progress,~~ current AI-assisted tools are still not ideal for process modeling from documents.

![[Recording 20260428202046.m4a]]


Before going further, let’s briefly look at the current AI-assisted process modeling tools. First, in the academic area, this table shows most of the existing tools. The first one, one of the earliest, is ProMoAI, published in 2024. At that time, it already supported not only automated generation but also iterative refinement.
  
However, most academic tools mainly focus on scientific aspects such as model correctness, quality, token efficiency, or prompting strategies. Here, I only highlight a few examples with some special features.

![[Recording 20260429141507.m4a]]


This is ProMoAI, proposed in 2024. It already supports iterative refinement of process models.

This is AutoBPMN.AI, which focuses on generating executable process models.

This approach supports richer input types, such as text, voice, or audio.

This work focuses more on improving interaction with the user.


In industry, tools such as BA Copilot already support document upload and allow users to extract information from documents.




However, although the document upload has been supported by the one tool, these approaches still do not fully address the challenges of using documents for process modeling.


To better understand how current tools address these challenges,
 let us briefly review existing approaches in academia.
 Various approaches have been proposed in academia.
 These tools support conversational interaction, iterative refinement,
 and model generation from textual input.
### **AI-Assisted Process Modeling in Academia**

> various approaches have been proposed for AI-assisted process modeling.


> Since around 2024, initial approaches such as ProMoAI already support iterative refinement of process models.


> Since then, different works have explored various aspects, such as improving efficiency, supporting more BPMN elements, and enhancing interaction capabilities.


> The table shows representative approaches in this area.


---

# **🎤 🟦 Slide 2**

### **From Documents to Modeling: Remaining Challenges**

  

（你的 document + dialogue 图那页）

---

## **🔗 过渡（最关键一句）**

  

> While these approaches mainly focus on modeling from textual input,

> in reality, process knowledge often exists in documents.

---

## **🧠 现实 + 当前方式**

> In practice, process knowledge is typically stored in documents such as PDFs or SOPs.

> Current tools mainly rely on prompt-based interaction to extract and use this information.


## **⚠️ 核心问题（你的真正 gap 🔥）**

  

> However, several challenges still remain.

> In particular, it is difficult to verify and trace how the extracted information is used to construct the process model.

> In addition, the interaction often lacks transparency and may involve high token cost.

---



Before we go in further, let's briefly look at the current landscape of AI-assisted tools. In the academic area, this table shows basically most of the existing tools. The first one, the very beginning one, is promo AI, published in 2024. And at the time, it already supported besides automated generation, but also iterative refinement. But actually, most academic tools only focus on the aspects like more scientific or anti-like model correctness, quality, token efficiency, or prompting strategies. But I just show a few examples of some special features here. The first is AutoBTM AI. Here is actually, it is the only one among all the tools which has supported file upload. But as you see, after you, but only in TXT form. And after upload, you could edit the text, but you will lose the source, the exact source of the original document. And the last one is, this tool has some more multiple input modalities, like you can see, it support audio upload. Several other tools I would like to introduce shortly is that, for example, this tool is contribute to error detection on more advanced BTM features, like collaboration between different lists. And the last one is that this one is a recent one, which focus on the query for the small part, query on a second part of the model. That's the current academic tools. In the industry, one commercial tool I recently found is it already support document upload. As you can see, you could, with some prompt, appropriate prompt, you could extract several, it should allow you to extract the information needed from documents. But although the document upload is supported, it's not still not so ideal for the process modeling from documents. Main challenges like, like you are hard to verify the model correctness, and also you lack the traceability between the source text and the model. Now, based on these challenges, we would like to propose a different design solution for this scenario. The basic feature is it should have, it should meet the following criteria. Firstly, it should support multiple document upload. Then after a document is uploaded, you should able to view the content, then select the needed part, and then we use these selections and leverage the one LM service to directly generate the model to increase the efficiency. Besides that, the view should support multi-models at the same time, so that you could have, so that it gives you a more clear overview of your project, of your use case you are working on. And then besides that basic requirements, we would like also add some value added features like iterative design with this chatbot. And besides that, as the documents naturally support, naturally have versioning and update issues, so we would like to introduce feature like document update and like the document support versioning in the model is we would like to design to support versioning as well. Then we could, before we jump to the project demo, I shortly, I will give, I will give you a system overview briefly. The final implementation of the web application consists of three pages. The first one is the entry page where you could organize all your use cases. And for each use cases you are actually working on, you create a new project for it. Then you will jump to the workspace page, which is the modeling view for you. And then there, for each project, there will be a dedicated statistic page for it where you could have some history there to be used. It's not fully ready, but we would like to offer this. Now let me jump to the prototype demo. 
And that's it for the live demo. Now let's move back to the evaluation part.
The procedure is like this, we invited four experts at our trial, and the procedure is designed as I will firstly give an introduction of the system and then assign them to tasks. The first one is fictional scenario consisting of two... We can start word files. And the task two is a real-world SOP procedure with five pages assigned. And if time permitted, and then there will be a questionnaire with four open-ended questions to ask them feedback about their most liked part, which part they don't like, and what's the improvements or additional features they expected. And at last, there is one potential use intention question, use intention question to ask if they would like to use them in the future. Regarding the results, the overall feedback received is that the tool is intuitive and useful. So here are two screenshots one expert created during the evaluation. But as other experts have different interests, so the expected improvements and the part they like is a little bit spread with different aspects. And the most positive aspect they mentioned is firstly, the integrated service, what they received is fast and the quality, especially the good quality of it. Then is this model version feature is the overall, the feedback received is very helpful. But one expert mentioned that he is expecting the comparison feature. And then this process relationship is also perceived as convenient and useful. And then is this graph is perceived as one participant mentioned that it is helpful for larger systems. And also the more improvement is expected, like make it the visual more, use more visual representative as here is not this hard to distinguish something like this. And at last, the augmented model data is considered as what is. It is mentioned as well considered. And for the next part, one, so one, not one, so the true feedback is better, but I've already noticed this issue is current. When you are viewing one model and if you want to start to have new one new model from scratch, you have to deselect the current, click this button to clear the comments of the current model, then you can only, otherwise you can, the system will assume that you are editing the current model. So this is one, as we are introducing a multiple model workspace, this is the only design I can think of right now, and it's inevitable. So it's require some user, although it's intuitive at the beginning, it just needs some familiar time. And the other part they mentioned is that the reviews that if you want to accept the model or not, is mentioned by two participants as unnecessary, but it should be, but it is, from the point of design, we could keep this feature, but simply introduce one setting page if they want to or not. But this problem is, can't to in the future list to be reduced. And another problem mentioned is that the usage of the other service is lack of transparency. It means that I have sometimes explain twice as we are introducing two models to use it. One is with selected text and with one anti-model, and the other mode is using the chatbot as the current model plus a plus a prompt, which is calling the, I have to, from my experience, is that I have to read. introducing this feature to the users. So I was just thinking we could have, as we are having a third part, as we are introducing a three part of input for the other service, one is the selected part, one is model, and one is prompt. So I think we could, my one idea is we could make it by a switch button like that to combine these two features with one switch button like that to improve the usability. And the last one is one complaint received is document readability issues, which is quite important for the system as we want to design a system as convenient to the modeling workflow from document reading to the end export. So the document reading is also an important, very important part for the system. So it should be, it just, it should be a component we keep improving, but it depends on the library used. And the last, the last two point I want to highlight is the findings collected. It's just the feedback we collected during the evaluation results, very interesting findings as our, as our participants, other, other participants show very interest to these two, but they have some very advanced requirements, expectations like one address I received, which is also important or considered as an important future work direction is the document interaction. Like you mentioned is we could embed some AI search but for example, we have, we issue work like this, we ask the chatbot to help me select a process related to what, for example, and then there is some auto selection function to reduce manual work. The other one is the modeling. For the link part, as our transparency traceability is offered as the source text and the generated model, there is actually a gap between the actually used part, actually used texts, and the modeling, the models. So they are expecting that there should be the traceability should be narrowed down to the actual use part. For example, if you select 1000 words, but the current AI service don't have the ability to process so large text. It could be generate a process with three small tasks, with three tasks only for this situation, but it is quite advanced for now for the capability of AI service. But we could try to fine-tune an API service for exactly for this tool. Maybe it's one working direction. That's the end of my presentation. Thank you for listening!