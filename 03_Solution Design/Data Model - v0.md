  

Firstly, Project, Document, Model and Document Model Link are the minimal tables needed to support the proposed system. It is also how the system was implemented when it first adopted the database. The Document and Model tables were used to store metadata like name, words count of a document. Theoretically, the Document Model Link table can be stored as an attribute within the model version, since the system is currently designed to allow one model to be derived from only one document. But it is a decision made very early to store it in a separate table to easily support a potentially many-to-many (M2M) relationship in the future.

  

The Model Version table is added when the model versioning feature is about to be implemented. The Document Version table is added at the same time to prepare for supporting the Document Update feature, as both tables follow a similar logic at the DB operation level.

  

The Subprocess Link table is an additional table used to support the Project Graph. As this relationship information has been embedded in Model Data, the model visualization itself does not need this data. However, for the project graph, the relationship is hard to be parsed from the model data; therefore, such a table is designed to easily retrieve the process-subprocess relationship.

  

The Selection and Selection History tables are then added when designing the Document Update feature. Before the selection data (e.g., color, position) for a Document Model Link is stored as an attribute in the format of a stringified JSON object. To better support auto-reanchoring for document upload, Selection and Selection History are designed as separate tables. The separate Selection table can make selection data easier to retrieve for reanchor operations. Besides, a Selection History is designed to make it easier to track the quality of reanchor.

  

Finally, the Generation Attempt and Version Event tables are the two tables designed to monitor the system behavior. The Generation Attempt table is used to monitor the accept/decline decision for the LLM-generated output. The Version Event is mainly to store the manual edit behavior or a system auto-update behavior, e.g., selection reanchor for document update