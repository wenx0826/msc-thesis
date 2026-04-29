So now, let me quickly create a demo project and upload multiple documents.

  
As I introduced, you can start modeling by selecting only the relevant parts from the documents, since we support using selected content as input for the LLM.

  
For example, here we are only modeling part of the document. After making a selection, you can drag the handles to adjust it. It also supports multi-selection, but we don’t need it here, so we can remove it.


Then, you can click this button to generate a new model.

There is also an advanced prompt option. If the process description is not well structured, you can provide additional instructions. However, we don’t need that now, so we will proceed with the simple mode.

Once the model is generated, you can decide whether you are satisfied. If yes, you can click “Save.” If not, you can discard it and adjust your selection. Here, we proceed with saving.

  

After that, there are several ways to edit the model.

First, you can edit it manually.

  

Second, you can use the refinement mode. 

For example, we can add a task at the end and send the request. 
Then you can choose to either replace the current model or save it as a new version. 
If you save it as a new version, a V2 will be created, while V1 remains the initial version.

  

Another option is to adjust the selected text.
If you want to include more information, you can modify the text and regenerate the model. However, some previous changes may be lost, because this mode creates a new model from scratch based on the updated selection.

  

You can also use the transform menu to modify the selection. However, you must apply the changes to save them; otherwise, any manual changes will be lost. This is how the feature is currently designed.

  

Now, let me quickly switch to another document and create a model for it.

  

As you can see from this graph, another model has been generated from this document.

  

We also provide a feature to quickly link it as a subprocess. After linking, you can see a new relationship represented by an arrow. This shows how the subprocess and the main process are connected.

  

In addition, there are several convenient interactions. You can hover over a model to preview it, or double-click to open it directly.

  

If you prefer, you can also switch to a list view to see all models.

  

Finally, you can export the result as a CBE tree format and import it into CBE.

  

The last feature I would like to show is the statistics page, which is not fully ready yet. One design idea here is a soft-delete mechanism. For example, if you delete a model, you can still restore it from this page, and all your models will be recovered.

  

This is how the system is designed.


---
Before moving to the prototype demo, I will briefly give you the overview of the application we implemented. Firstly, there will be a homepage, and it is used to organize all the cases, all the use cases, and now we just call it, use the word project, as it's more software-oriented. Within, for each project, there will be one workspace page for it, which is the modeling, for the modeling workflow. And finally, for each project, there will be a dedicated statistics page for it, where you can view some key story data, like how many documents you have, how many models you have. Now, let me jump to the demo. So now let me quickly create a demo project and then upload multiple, upload the requirements, the required documents. And now we can start to modeling. As I introduced here, we just want to, for example, just to model this validation process. And as introduced, we could select the needed part, and you could also move the handle to adjust the text. So you could also collect multiple selections is enabled, but since we don't need it, we can delete it. Now we can go proceed to generate the model. Here is the advanced mode. If you want to embed it with some special instructions, you could input it here, but we just go proceed to generate the model. Okay, here, after a model is generated, you could choose to save it. If you are not satisfied, you could discard it or to readjust the text or to adjust the text or try the advanced mode, but here we just go with, we just save it. After you save, the model is persistent, and then you could, there are different ways to modify it. For example, you could manually edit. Okay, let me regenerate one more time. After regeneration, you could choose replace the current one or save as a new model or cancel if you discard it. You cancel these changes, give we can proceed with a new model, then you will see you can switch it with the original version. Now let me quickly switch to another document and select the text to generate another model for it. And then save it. So here then we just connected two different models as here to make it to as firstly change this type to subprocess and then link it with another model. As you can see here, here it indicates the relationship. And in the statistics page, you could see some data which is not fully ready, but...