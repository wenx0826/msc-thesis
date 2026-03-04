
A process analyst starts in the DBPM home page and creates a new project for a process she wants to formalize. Inside the workspace, she uploads several source documents (for example PDFs and DOCX files). The system converts and stores their content, creates version v1 for each document, computes word statistics, and logs each upload as an auditable project event.

She opens one document in the document viewer and highlights relevant passages that describe activities, decisions, and responsibilities. These selections become the evidence base for modeling. She clicks “Generate new model,” and DBPM creates a model linked to that document version. At creation time, the system stores a trace record connecting the model version to the selected text ranges and injects DBPM metadata into the model XML (document_id, document_version_id, selected text).

The new model appears in the model editor and in the project graph. She refines the workflow manually by editing tasks and properties. Each save creates model update events (for example structural change vs. property change), updates the persisted XML, and appends log entries. If she changes text selections later, DBPM updates the trace and synchronizes the model’s embedded metadata so the model always points to the current evidence.

When source documents evolve, she uploads a new document version. DBPM preserves history, copies existing traces to the new version, and rewrites relevant model XML metadata in the background so traceability remains consistent across versions. If she needs a controlled checkpoint, she creates a new model version (or reverts from an older one), keeping a full version chain.

For modularization, she marks a task as a subprocess and links it to another model. The project graph updates to show document-to-model generation links and model-to-model subprocess links. If content becomes obsolete, she soft-deletes documents or models; DBPM cascades where required and still allows restoration.

At any point, she opens the statistics page to review active/deleted counts, words, versions, and model-update summaries, and opens/downloads YAML logs for audit. She can also open read-only document and workflow viewers via direct links.  
The session ends with a fully versioned, traceable, and auditable process modeling state grounded in source documents.