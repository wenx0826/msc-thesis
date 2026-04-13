workspace {

model {

user = person "Process Modeler" "Creates and manages process models derived from documents"

  

llm = softwareSystem "LLM Interface" "LLM hosted at autobpmn.ai." {

tags "External"

}

  

cpee = softwareSystem "CPEE CDN" "Flow editor and renderer components loaded from cpee.org." {

tags "External"

}

  

dbpm = softwareSystem "Document-Based Process Modeller (DBPM)" {

frontend = container "Frontend" "MPA containing pages: homepage, workspace, and statistics." "JavaScript and jQuery"

backend = container "Backend" "REST API. Modules: projects, documents, models, document-model-links, logs." "Node.js, Fastify"

sqlite = container "Database" "Metadata: project information, document metadata, model metadata, document-model links, statistics data, etc." "SQLite"

files = container "File Storage" "Documents stored as HTML, XML model data, YAML event logs." "Filesystem"

}

  

user -> frontend "Uses" "Browser / HTTP"

frontend -> backend "CRUD" "REST / JSON"

backend -> sqlite "Read / write" "SQL"

backend -> files "Read / write" "File I/O"

frontend -> llm "Send selection → receive CPEE XML" "HTTPS"

frontend -> cpee "Load editor and renderer" "HTTPS / CDN"

}

  

views {

container dbpm "DBPM-Containers" {

include *

autolayout lr

title "DBPM — System Context & Containers"

}

  

theme default

}

}