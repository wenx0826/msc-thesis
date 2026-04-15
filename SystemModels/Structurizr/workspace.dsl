workspace "Document-Based Process Modeler" "Structurizr model of the document-based process modeling system architecture" {

    !identifiers hierarchical



    model {
       u = person "User" "A modeling or domain expert"
        llm = softwareSystem "AutoBPMN.AI\nLLM Service" "Provides LLM REST service for process model creation and redesign" "HTTPS API" {
            tags "LLMService" 
        }
        ss = softwareSystem "Document-Based Process Modeler" "Supports the modeling process from document upload to model creation, modification and management" {
            fe = container "Frontend" "Browser-based user interface" {
                technology "JavaScript, HTML, CSS"
                tags "FE"

                homePage = component "Home Page" "Landing page for project creation, project browsing, and high-level overview statistics" "HTML + ES modules" {
                    tags "Page"
                }
                workspacePage = component "Workspace Page" "Main three-pane workspace for document viewing, model editing, and graph-based navigation" "HTML + ES modules" {
                    tags "Page"
                }
                wsBootstrap = component "Workspace Bootstrap" "Initializes the workspace page, validates the selected project, lazy-loads UI modules, and starts the initial workspace load" "pages/workspace/init.js" {
                    tags "WorkspaceFeature"
                }
                wsUI = component "Workspace UI Module" "Coordinates the workspace shell, header, document pane, model editor pane, review controls, and project graph interactions" "pages/workspace/ui/*.js" {
                    tags "WorkspaceFeature"
                }
                wsState = component "Workspace Stores" "Client-side state for workspace context, documents, selections, models, editor state, and graph projection" "pages/workspace/store/*.js" {
                    tags "WorkspaceFeature"
                }
                wsServices = component "Workspace Services" "Orchestrates workspace loading, document operations, model operations, version handling, and traceability actions" "pages/workspace/services/*.js" {
                    tags "WorkspaceFeature"
                }
                docInteractionModule = component "Document Interaction Module" "Provides document HTML processing, text selection handling, and overlay utilities used by the workspace page" "modules/document/*.js" {
                    tags "WorkspaceFeature"
                }
                modelEditorAdapter = component "Model Editor Adapter" "Provides CPEE-based model rendering, endpoint loading, XML helpers, and editor integration used by the workspace page" "modules/model/*.js" {
                    tags "WorkspaceFeature"
                }
                statsPage = component "Stats Page" "Statistics page for inspecting project-level usage and modeling metrics" "HTML + ES modules" {
                    tags "Page"
                }
                documentViewer = component "Document Viewer" "Document rendering area with text selections, overlays, and traceability markers" "HTML + ES modules" {
                    tags "Page"
                }
                modelViewer = component "Model Viewer" "Model preview and rendering area for inspecting persisted process models" "HTML + ES modules" {
                    tags "Page"
                }

                apiClient = component "Backend API Client" "Fetch-based client for backend endpoints covering projects, documents, models, links, logs, and statistics" "Fetch API" {
                    tags "APIClient"
                }
                persistenceLoader = component "Persistence File Loader" "Loads persisted artifacts such as document HTML and model XML from backend-exposed persistence paths" "HTTP GET" {
                    tags "Storage"
                }
                llmClient = component "LLM Client" "Invokes the AutoBPMN.AI endpoint to generate or refine process models from selected text and prompts" "HTTP (multipart/form-data)" {
                    tags "LLMClient"
                }
                sharedUtils = component "Shared Utilities" "Shared helper modules for DOM manipulation, URL handling, and common frontend logic" "JavaScript modules" {
                    tags "Shared"
                }
            }
            be = container "Backend" "Server-side application exposing APIs and managing persistence" {
                technology "Node.js (Fastify)"
                tags "BE"

                api = component "Fastify App" "Single server process that serves the frontend, exposes REST APIs, and publishes persisted artifacts" "Node.js (Fastify)" {
                    tags "API"
                }

                projectsRoutes = component "Projects Routes" "HTTP routes under /projects for project lifecycle and workspace aggregation" "Fastify plugin" {
                    tags "Routes"
                }
                projectsService = component "Projects Service" "Coordinates project operations and aggregates related documents, models, and statistics" "JavaScript module" {
                    tags "Service"
                }
                projectsRepo = component "Projects Repository" "Repository for project metadata stored in SQLite" "better-sqlite3" {
                    tags "Repository"
                }

                documentsRoutes = component "Documents Routes" "HTTP routes under /documents for upload, versioning, metadata updates, and restoration" "Fastify plugin" {
                    tags "Routes"
                }
                documentsService = component "Documents Service" "Handles document lifecycle, versioning, content persistence, and cascaded updates to linked models" "JavaScript module" {
                    tags "Service"
                }
                documentsRepo = component "Documents Repository" "Repository for document metadata and latest-version pointers" "better-sqlite3" {
                    tags "Repository"
                }
                documentVersionsRepo = component "Document Versions Repository" "Repository for immutable document version records" "better-sqlite3" {
                    tags "Repository"
                }
                documentsStorage = component "Documents Storage" "Filesystem storage for serialized document content in /persistence/documents" "Filesystem" {
                    tags "Storage"
                }

                modelsRoutes = component "Models Routes" "HTTP routes under /models for model creation, versioning, updates, subprocess links, and generation logging" "Fastify plugin" {
                    tags "Routes"
                }
                modelsService = component "Models Service" "Handles model lifecycle, version management, XML enrichment, subprocess binding, and generation-attempt tracking" "JavaScript module" {
                    tags "Service"
                }
                modelsRepo = component "Models Repository" "Repository for model metadata and latest-version pointers" "better-sqlite3" {
                    tags "Repository"
                }
                modelVersionsRepo = component "Model Versions Repository" "Repository for immutable model version records" "better-sqlite3" {
                    tags "Repository"
                }
                modelGenerationAttemptsRepo = component "Model Generation Attempts Repository" "Repository for persisted generation-attempt metadata and outcomes" "better-sqlite3" {
                    tags "Repository"
                }
                modelVersionEventsRepo = component "Model Version Events Repository" "Repository for manual and automatic model version lifecycle events" "better-sqlite3" {
                    tags "Repository"
                }
                modelSubprocessesRepo = component "Model Subprocesses Repository" "Repository for task-to-subprocess bindings between models" "better-sqlite3" {
                    tags "Repository"
                }
                modelsStorage = component "Models Storage" "Filesystem storage for serialized model XML in /persistence/models" "Filesystem" {
                    tags "Storage"
                }

                linksRoutes = component "Document-Model Links Routes" "HTTP routes under /document-model-links for traceability links and selection operations" "Fastify plugin" {
                    tags "Routes"
                }
                linksService = component "Document-Model Links Service" "Maintains document-model traceability links, current selections, and selection history" "JavaScript module" {
                    tags "Service"
                }
                linksRepo = component "Document-Model Links Repository" "Repository for links, selections, and their history stored in SQLite" "better-sqlite3" {
                    tags "Repository"
                }

                logsService = component "Logs Service" "Writes append-only project event logs for auditing and analysis" "JavaScript module" {
                    tags "Service"
                }
                logsRepo = component "Logs Repository" "Filesystem-based persistence for append-only log files in /persistence/logs" "Filesystem" {
                    tags "Repository"
                }

                baseSqlRepo = component "Base SQL Repository" "Shared repository utilities for common SQLite access patterns" "JavaScript module" {
                    tags "Shared"
                }
            }
            fs = container "File Storage" "Local file system storage for documents, models, and logs" {
                technology "Local file system"
                tags "Directory"
            }
            db = container "Database" "Structured store for project, document metadata, model metadata, document-model links, statistic data, ect." {
                technology "SQLite"
                tags "Database"
            }
        }
        u -> ss.fe "Interacts with"
        ss.fe -> llm "Makes API requests to"
        ss.fe -> ss.be "Makes API requests to"
        ss.be -> ss.fs "Reads from and writes to"
        ss.be -> ss.db "Reads from and writes to"

        ss.fe -> ss.be.api "Calls HTTP API"

        ss.fe.homePage -> ss.fe.apiClient "Loads projects + overview"
        ss.fe.homePage -> ss.fe.sharedUtils "Uses"

        ss.fe.workspacePage -> ss.fe.apiClient "Loads and updates project state"
        ss.fe.workspacePage -> ss.fe.wsBootstrap "Bootstraps feature"
        ss.fe.workspacePage -> ss.fe.wsUI "Hosts feature UI"

        ss.fe.wsBootstrap -> ss.fe.apiClient "Validates project"
        ss.fe.wsBootstrap -> ss.fe.wsUI "Lazy-loads"
        ss.fe.wsBootstrap -> ss.fe.wsServices "Starts initial workspace load"

        ss.fe.wsUI -> ss.fe.wsState "Reads reactive state"
        ss.fe.wsUI -> ss.fe.wsServices "Invokes user actions"
        ss.fe.wsUI -> ss.fe.docInteractionModule "Renders selections and overlays"
        ss.fe.wsUI -> ss.fe.modelEditorAdapter "Renders and edits models"
        ss.fe.wsUI -> ss.fe.sharedUtils "Uses"

        ss.fe.wsServices -> ss.fe.apiClient "Calls projects/documents/models/links APIs"
        ss.fe.wsServices -> ss.fe.llmClient "Generates and refines models"
        ss.fe.wsServices -> ss.fe.wsState "Updates state"
        ss.fe.wsServices -> ss.fe.docInteractionModule "Transforms document input"
        ss.fe.wsServices -> ss.fe.modelEditorAdapter "Loads editor data and endpoints"

        ss.fe.statsPage -> ss.fe.apiClient "Loads statistics"
        ss.fe.statsPage -> ss.fe.sharedUtils "Uses"

        ss.fe.documentViewer -> ss.fe.apiClient "Loads trace selections"
        ss.fe.documentViewer -> ss.fe.persistenceLoader "Loads document content"
        ss.fe.documentViewer -> ss.fe.sharedUtils "Uses"

        ss.fe.modelViewer -> ss.fe.apiClient "Loads model XML"
        ss.fe.modelViewer -> ss.fe.sharedUtils "Uses"

        ss.fe.apiClient -> ss.be.api "Requests JSON APIs"
        ss.fe.persistenceLoader -> ss.fs "Reads"
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

        component ss.fe "WorkspacePageFrontend" {
            include ss.fe.workspacePage
            include ss.fe.wsBootstrap
            include ss.fe.wsUI
            include ss.fe.wsState
            include ss.fe.wsServices
            include ss.fe.docInteractionModule
            include ss.fe.modelEditorAdapter
            include ss.fe.apiClient
            include ss.fe.llmClient
            include ss.fe.sharedUtils
            include ss.be.api
            include llm

            autolayout lr
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