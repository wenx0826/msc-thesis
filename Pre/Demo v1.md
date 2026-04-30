Now let me quickly create a new demo project and upload the prepared documents.

  

Here, what we have is a visual specification, but we only need the validation part. So we will focus on modeling the validation process only.

  

Now we can proceed with selecting the relevant content. After making a selection, you can also adjust it, but this part is already what we need. You can start with a small segment like this, although multi-selection is also supported.

  

Then, by clicking this button, you can generate a model. There is also an advanced mode where you can add additional instructions, but for now we will proceed directly.

  

After the model is generated, it appears as a draft and needs to be reviewed. Here, we can clearly see that the model is incorrect—for example, the gateway is wrong, since all activities must be completed before proceeding.

  

So we can discard it and try again with a better instruction, such as: “all validation activities must be completed” or “use a parallel gateway.”

  

Now the result should be correct.

---

Once a model is generated, there are several ways to modify it.

  

First, you can edit it manually, for example by adding or adjusting tasks.

  

Second, you can modify it using prompts. For demonstration, we can add a task at the end. When using the LLM for modification, the result will again require review. At this stage, you can cancel, replace the current model, or save it as a new version.

  

If you save it as a new version, you can always switch back to the previous one. For example, here we can restore the initial version.

  

Another way to modify the model is to append or adjust tasks. For example, we can rename this task to “validation output handling.” Let’s save this as a new version.

  

You can also manually link tasks together. Just make sure to apply the changes so that they are saved.

  

If you open the XML view, you can see that all selections are embedded in the model data.

---

Another option is the regenerate mode. You can regenerate the model with or without additional instructions.

  

This mode essentially creates a new model from the selected text, so it behaves similarly to generating a model from scratch. However, if you want to avoid creating too many versions, you can choose to replace the current model instead.

  

For example, we regenerate it once more. If the new version is better, we can simply replace the current one.

---

Now, an important point to note:

  

If you want to create a completely new model from scratch, you must first deselect the current model. Otherwise, the system assumes you want to continue modifying the existing one.

  

So here, we deselect it and generate a new model for another part of the document.

---

Now let me quickly generate another model from a different document, which represents a subprocess.

  

Once it is generated, I can show you how to link it.

  

By clicking this button and selecting “subprocess,” we can link the models. As you can see in the graph, the relationship is now established.

  

You can also double-click to jump directly to the subprocess.

---

Finally, you can export the result and import it into CPE.

  

Another component is the statistics page. Although it is not fully developed yet, it shows information such as how many models you have and how they are distributed across projects.

  

Additionally, all entities in the system use a soft-delete mechanism. For example, if you delete a model, you can still recover it by clicking the restore button.

---

That’s all I would like to show for the demo.