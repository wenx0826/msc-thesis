So now, let me quickly create a demo project and upload multiple documents.

  
As I introduced, you can start modeling by selecting only the relevant parts from the documents, since we support using selected content as input for the LLM.

  
For example, here we are only modeling part of the document. After making a selection, you can drag the handles to adjust it. It also supports multi-selection, but we don’t need it here, so we can remove it.


Then, you can click this button to generate a new model.

There is also an advanced prompt option. If the process description is not well structured, you can provide additional instructions. However, we don’t need that now, so we will proceed with the simple mode.

Once the model is generated, you can decide whether you are satisfied. If yes, you can click “Save.” If not, you can discard it and adjust your selection. Here, we proceed with saving.

  

After that, there are several ways to edit the model.

First, you can edit it manually.

  

Second, you can use the refinement mode. For example, we can add a task at the end and send the request. Then you can choose to either replace the current model or save it as a new version. If you save it as a new version, a V2 will be created, while V1 remains the initial version.

  

Another option is to adjust the selected text. If you want to include more information, you can modify the text and regenerate the model. However, some previous changes may be lost, because this mode creates a new model from scratch based on the updated selection.

  

You can also use the transform menu to modify the selection. However, you must apply the changes to save them; otherwise, any manual changes will be lost. This is how the feature is currently designed.

  

Now, let me quickly switch to another document and create a model for it.

  

As you can see from this graph, another model has been generated from this document.

  

We also provide a feature to quickly link it as a subprocess. After linking, you can see a new relationship represented by an arrow. This shows how the subprocess and the main process are connected.

  

In addition, there are several convenient interactions. You can hover over a model to preview it, or double-click to open it directly.

  

If you prefer, you can also switch to a list view to see all models.

  

Finally, you can export the result as a CBE tree format and import it into CBE.

  

The last feature I would like to show is the statistics page, which is not fully ready yet. One design idea here is a soft-delete mechanism. For example, if you delete a model, you can still restore it from this page, and all your models will be recovered.

  

This is how the system is designed.