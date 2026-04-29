

Hello and welcome. This video shows how to get started with the tool, Document-Based Process Modeler step by step. 
To get started, we create a new project. Then The modeling workspace opens automatically.   

We now upload documents.  Currently, it supports document formats in TXT, DOC, and PDF.
In this example, we model a release approval process. 

We begin by selecting text passages relevant to the process. 
Multiple passages can be selected across the document. 
A selected passage can be adjusted directly. 
Its range can be refined by dragging the handles, and it can be recolored or removed using the toolbar. 
A color can also be chosen before making a selection. 

We now generate the model. 
An advanced mode is available if additional instructions are needed. 
Here, we proceed directly. 

Once the model is generated, it is presented as a draft for review. 
It can then be either saved or discarded.  
Here, we save the model. 
The model is then saved, with a link to the text established.  

Further modifications can be made in several ways. It can be edited manually or refined with AI based on the current model. The linked text selections can also be adjusted. Changes must be applied to update the traceability. Alternatively, the model can be regenerated based on the current text selections, optionally with additional instructions. Any regenerated model is presented for review before proceeding. 

**At this stage, it can be saved as a new version or used to replace the current one.** **Previous versions can also be revisited, restored, or used to create new versions.**

The model can also be renamed in the editor or through the model options. The selected text is also preserved as part of the model.

Next, we move to another document and create a new model. This model is a subprocess of the main approval process. To reflect this, we go back to the main model, select a task, set it as a subprocess, and choose the model to link. The subprocess model can be quickly accessed by double-clicking the task. 

These relationships are also reflected in the graph view, where connections between models can be clearly explored, and the nodes are clickable for quick navigation. 

Documents can also be updated by uploading new versions, with existing links retained where possible. 

Once the models are ready, they can be exported for further use or integration with other tools.

A statistics view is also available, providing insights into the models and allowing recovery of previously removed items. 
------
So now let me quickly create a demo project and upload multiple uploads and documents. So now you can start as I introduced, you can start to model by, for example, here we only modeling part of it as we would like to support, you only select the needed part from the documents as the input for the LM. For example, here you could, after your selection, you could drag the handle to adjust the selection or it can also support multi-selection, but we don't need it. We can delete it. Here you could start by clicking this button to generate a new model. There is actually a new prompt, an advanced feature where you could, if the process is description itself is not so well structured, you could try to give it a little instructions for it, but we don't need it. We just go proceed with the simple mode. OK, so let's, here you have to decide if you want to, if you're satisfied, you click save. If you think it is not good, you could try to discard and adjust the selection. Here we proceed with the save button. And after that, you could, there are several modes you could edit it. First one is, of course, you could manual edit. And then you could use this mode. This mode is a refinement where you could send the, for example, we can just like add a task as at the end. So then send it. You could have options to replace it with replace the current one or save it as a new version. And if you save it as a new version, you will have a version V2 created, V1 is your the initial one. Another mode is you could also adjust the text a little. If you think that you want to include more information for this model, for this model, you can also adjust the model and then go proceed with the regenerate model, but some changes you may lost, as this mode is currently designed as the select text, a new model from scratch will be created. But also here, if you want to, you could also have the transform menu, change the selections, but you have to apply the changes for you to save it, otherwise you change it, your manual changes will be lost. This is how the feature is designed. Then I'll just let me quickly to another document and model and create a model for it.


You can see from this graph, you can see one model is generated also towards this document, and now we actually feature we could link, quickly link it with the subprocess model, and then you have a new relationship here as there is arrow shows, and here it is how the subprocess and process relationship should be established, and after that, there is also several convenient design like you could hover on it to view it or double-click here to view the process directly, and you could also hover and see here. And then another view of this list, if you want to do this, you could have another list view of the models. At the same time, as the last step, you could export the test set as CBE tree format and import it to CBE. And the last feature I would like to show you is the statistics page, which is not ready yet. But one feature design here is we could, as the system is designed as soft delete, for example, if you delete this model, if you just try to delete this model, and you have a way to restore it from this page, and then all your models will recover. This is how the system is designed. 