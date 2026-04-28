Good morning everyone. I’m Xin. Welcome to this thesis final  presentation on topic—Document-Based Process Modeler.

Let me begin with the motivation.

![[Recording 20260426212318.m4a]]

![[Pasted image 20260426213058.png]]
With the rise of large language models, many AI-assisted tools have emerged, which have greatly improved the efficiency of process modeling.

However, most of these tools only support text input.
At the same time, in practice, process information is often stored in documents, like requirement specifications, reports, guidelines, or SOPs, usually as PDFs or Word files.

This creates a gap between real-world data and current AI-assisted tools.

In addition, current tools typically focus on a single model, making it less flexible and convenient to decompose one big processes into sub-processes or to connect related models, especially in large or complex scenarios.

So, with these limitations, current AI-assisted tools are still not ideal for process modeling from documents.

![[Recording 20260426213219.m4a]]
Before going further, let’s briefly look at the current AI-assisted process modeling tools. First, in academic area, this table shows existing tools. ? 

Next, I will briefly highlight a few examples.



<font color="#646a73"> In academia, early work such as ProMoAI, proposed around 2024, already supports iterative refinement of process models.</font>

<font color="#646a73"> Since then, different approaches have explored various aspects, such as improving efficiency, supporting richer input types like text or voice, and enabling more advanced interactions, for example local querying or error detection.</font>



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

## **🎯 收口（引出你的研究）**


> Therefore, the key question is:

> How can documents be more effectively integrated into AI-assisted process modeling in a way that supports verification and traceability?