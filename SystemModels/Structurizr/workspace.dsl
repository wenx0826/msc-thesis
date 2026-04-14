workspace "Name" "Description" {

    !identifiers hierarchical



    model {
       u = person "User" "A modeling or domain expert"
        llm = softwareSystem "AutoBPMN.AI\nLLM Service" "Provides LLM REST service for process model creation and redesign" "HTTPS API" {
            tags "LLMService" 
        }
        ss = softwareSystem "Document-Based Process Modeler" "Supports the modeling process from document upload to model creation, modification and management" {
            fe = container "Frontend" {
                technology "Static HTML + ES modules"
                tags "FE"

                homePage = component "Home Page" "Project listing/creation and overview dashboard" "HTML + ES modules" {
                    tags "Page"
                }
                workspacePage = component "Workspace Page" "Main modelling workspace" "HTML + ES modules" {
                    tags "Page"
                }
                statsPage = component "Stats Page" "Project statistics" "HTML + ES modules" {
                    tags "Page"
                }
                documentViewer = component "Document Viewer" "Read-only document view with selection overlays" "HTML + ES modules" {
                    tags "Page"
                }
                modelViewer = component "Model Viewer" "Read-only model preview/renderer" "HTML + ES modules" {
                    tags "Page"
                }

                apiClient = component "Backend API Client" "Fetch-based client for backend routes (projects/documents/models/links/logs/stats)" "Fetch API" {
                    tags "APIClient"
                }
                persistenceLoader = component "Persistence File Loader" "Loads persisted artifacts via static /persistence paths" "HTTP GET" {
                    tags "Storage"
                }
                llmClient = component "LLM Client" "Calls AutoBPMN.AI LLM endpoint for model generation" "HTTP (multipart/form-data)" {
                    tags "LLMClient"
                }
                sharedUtils = component "Shared Utilities" "Shared DOM/URL/helpers used by pages" "JavaScript modules" {
                    tags "Shared"
                }
            }
            be = container "Backend" {
                technology "Node.js (Fastify)"
                tags "BE"

                api = component "Fastify App" "HTTP API server and static file serving" "Node.js (Fastify)" {
                    tags "API"
                }

                projectsRoutes = component "Projects Routes" "Routes under /projects" "Fastify plugin" {
                    tags "Routes"
                }
                projectsService = component "Projects Service" "Project orchestration" "JavaScript module" {
                    tags "Service"
                }
                projectsRepo = component "Projects Repository" "SQL access for projects" "better-sqlite3" {
                    tags "Repository"
                }

                documentsRoutes = component "Documents Routes" "Routes under /documents" "Fastify plugin" {
                    tags "Routes"
                }
                documentsService = component "Documents Service" "Document versions, content and metadata" "JavaScript module" {
                    tags "Service"
                }
                documentsRepo = component "Documents Repository" "SQL access for documents" "better-sqlite3" {
                    tags "Repository"
                }
                documentVersionsRepo = component "Document Versions Repository" "SQL access for document_versions" "better-sqlite3" {
                    tags "Repository"
                }
                documentsStorage = component "Documents Storage" "Persist document HTML in /persistence/documents" "Filesystem" {
                    tags "Storage"
                }

                modelsRoutes = component "Models Routes" "Routes under /models" "Fastify plugin" {
                    tags "Routes"
                }
                modelsService = component "Models Service" "Model/version lifecycle and generation attempt tracking" "JavaScript module" {
                    tags "Service"
                }
                modelsRepo = component "Models Repository" "SQL access for models" "better-sqlite3" {
                    tags "Repository"
                }
                modelVersionsRepo = component "Model Versions Repository" "SQL access for model_versions" "better-sqlite3" {
                    tags "Repository"
                }
                modelGenerationAttemptsRepo = component "Model Generation Attempts Repository" "SQL access for model_generation_attempts" "better-sqlite3" {
                    tags "Repository"
                }
                modelVersionEventsRepo = component "Model Version Events Repository" "SQL access for model_version_events" "better-sqlite3" {
                    tags "Repository"
                }
                modelSubprocessesRepo = component "Model Subprocesses Repository" "SQL access for model_subprocesses" "better-sqlite3" {
                    tags "Repository"
                }
                modelsStorage = component "Models Storage" "Persist model XML in /persistence/models" "Filesystem" {
                    tags "Storage"
                }

                linksRoutes = component "Document-Model Links Routes" "Routes under /document-model-links" "Fastify plugin" {
                    tags "Routes"
                }
                linksService = component "Document-Model Links Service" "Manage links and selection history" "JavaScript module" {
                    tags "Service"
                }
                linksRepo = component "Document-Model Links Repository" "SQL access for linking + selections" "better-sqlite3" {
                    tags "Repository"
                }

                logsService = component "Logs Service" "Append-only project log events" "JavaScript module" {
                    tags "Service"
                }
                logsRepo = component "Logs Repository" "Append to /persistence/logs" "Filesystem" {
                    tags "Repository"
                }

                baseSqlRepo = component "Base SQL Repository" "Shared SQL repository utilities" "JavaScript module" {
                    tags "Shared"
                }
            }
            fs = container "Directory" {
                technology "Local filesystem (/persistence)"
                tags "Directory"
            }
            db = container "Database" {
                technology "SQLite (better-sqlite3)"
                tags "Database"
            }
        }
        u -> ss.fe "Interacts with"
        ss.fe -> llm "Makes API requests to"
        ss.fe -> ss.be "Reads from and writes to"
        ss.be -> ss.fs "Reads from and writes to"
        ss.be -> ss.db "Reads from and writes to"

        ss.fe -> ss.be.api "Calls HTTP API"

        ss.fe.homePage -> ss.fe.apiClient "Loads projects + overview"
        ss.fe.homePage -> ss.fe.sharedUtils "Uses"

        ss.fe.workspacePage -> ss.fe.apiClient "Loads and updates project state"
        ss.fe.workspacePage -> ss.fe.persistenceLoader "Loads documents/models/logs"
        ss.fe.workspacePage -> ss.fe.sharedUtils "Uses"
        ss.fe.workspacePage -> ss.fe.llmClient "Generates models"

        ss.fe.statsPage -> ss.fe.apiClient "Loads statistics"
        ss.fe.statsPage -> ss.fe.sharedUtils "Uses"

        ss.fe.documentViewer -> ss.fe.apiClient "Loads trace selections"
        ss.fe.documentViewer -> ss.fe.persistenceLoader "Loads document content"
        ss.fe.documentViewer -> ss.fe.sharedUtils "Uses"

        ss.fe.modelViewer -> ss.fe.apiClient "Loads model XML"
        ss.fe.modelViewer -> ss.fe.sharedUtils "Uses"

        ss.fe.apiClient -> ss.be.api "Requests JSON APIs"
        ss.fe.persistenceLoader -> ss.fs "Reads /persistence/*"
        ss.fe.llmClient -> llm "Requests model generation"

        ss.be.api -> ss.be.projectsRoutes "Registers"
        ss.be.api -> ss.be.documentsRoutes "Registers"
        ss.be.api -> ss.be.modelsRoutes "Registers"
        ss.be.api -> ss.be.linksRoutes "Registers"

        ss.be.projectsRoutes -> ss.be.projectsService "Invokes"
        ss.be.projectsService -> ss.be.projectsRepo "Reads/writes"
        ss.be.projectsService -> ss.be.documentsService "Queries"
        ss.be.projectsService -> ss.be.modelsService "Queries"
        ss.be.projectsService -> ss.be.logsService "Logs events"

        ss.be.documentsRoutes -> ss.be.documentsService "Invokes"
        ss.be.documentsService -> ss.be.documentsRepo "Reads/writes"
        ss.be.documentsService -> ss.be.documentVersionsRepo "Reads/writes"
        ss.be.documentsService -> ss.be.documentsStorage "Reads/writes"
        ss.be.documentsService -> ss.be.linksService "Copies links"
        ss.be.documentsService -> ss.be.modelsService "Triggers rewrite/cascade"
        ss.be.documentsService -> ss.be.logsService "Logs events"

        ss.be.modelsRoutes -> ss.be.modelsService "Invokes"
        ss.be.modelsService -> ss.be.modelsRepo "Reads/writes"
        ss.be.modelsService -> ss.be.modelVersionsRepo "Reads/writes"
        ss.be.modelsService -> ss.be.modelGenerationAttemptsRepo "Reads/writes"
        ss.be.modelsService -> ss.be.modelVersionEventsRepo "Reads/writes"
        ss.be.modelsService -> ss.be.modelSubprocessesRepo "Reads/writes"
        ss.be.modelsService -> ss.be.modelsStorage "Reads/writes"
        ss.be.modelsService -> ss.be.linksService "Reads/writes"
        ss.be.modelsService -> ss.be.logsService "Logs events"

        ss.be.linksRoutes -> ss.be.linksService "Invokes"
        ss.be.linksService -> ss.be.linksRepo "Reads/writes"

        ss.be.logsService -> ss.be.logsRepo "Appends"

        ss.be.projectsRepo -> ss.db "Queries"
        ss.be.documentsRepo -> ss.db "Queries"
        ss.be.documentVersionsRepo -> ss.db "Queries"
        ss.be.modelsRepo -> ss.db "Queries"
        ss.be.modelVersionsRepo -> ss.db "Queries"
        ss.be.modelGenerationAttemptsRepo -> ss.db "Queries"
        ss.be.modelVersionEventsRepo -> ss.db "Queries"
        ss.be.modelSubprocessesRepo -> ss.db "Queries"
        ss.be.linksRepo -> ss.db "Queries"

        ss.be.documentsStorage -> ss.fs "Reads/writes"
        ss.be.modelsStorage -> ss.fs "Reads/writes"
        ss.be.logsRepo -> ss.fs "Reads/writes"
    }
/*
element <tag> {
    shape <Box|RoundedBox|Circle|Ellipse|Hexagon|Diamond|Cylinder|Bucket|Pipe|Person|Robot|Folder|WebBrowser|Window|Terminal|Shell|MobileDevicePortrait|MobileDeviceLandscape|Component>
    icon <file|url>
    width <integer>
    height <integer>
    background <#rrggbb|color name>
    color <#rrggbb|color name>
    colour <#rrggbb|color name>
    stroke <#rrggbb|color name>
    strokeWidth <integer: 1-10>
    fontSize <integer>
    border <solid|dashed|dotted>
    opacity <integer: 0-100>
    metadata <true|false>
    description <true|false>
    properties {
        name value
    }
}
*/

    views {
        systemContext ss "SystemContext" {
            include *
        }

        container ss "Architecture" {
            include *
        }

        component ss.be "BackendComponents" {
            include *
            include ss.fe
            include ss.fs
            include ss.db
        }

        component ss.fe "FrontendComponents" {
            include *
            include ss.be.api
            include ss.fs
            include llm
        }

        styles {
            element "Element" {
                //color #2b2b2b
                //stroke #2b2b2b
                color #0773af
                stroke #0773af
                strokeWidth 5
                shape roundedbox
            }
            element "Component" {
                shape component
            }
            element "Person" {
                color #55aa55
                stroke #55aa55
                shape person
            }
            element "LLMService" {
                color #f88728
                stroke #f88728
                shape hexagon
            }
            element "API" {
                shape hexagon
            }
            element "Page" {
                shape WebBrowser
            }
            element "LLMClient" {
                shape hexagon
            }
            element "FE" {
                shape WebBrowser
            }
            element "BE" {
                shape Shell
            }
            element "Database" {
                shape cylinder
            }
            element "Directory" {
                shape Folder
            }
            element "Boundary" {
                strokeWidth 5
            }
            relationship "Relationship" {
                thickness 4
            }
        }
    }

    configuration {
        scope softwaresystem
    }

}