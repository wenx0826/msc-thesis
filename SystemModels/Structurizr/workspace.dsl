workspace "Name" "Description" {

    !identifiers hierarchical



    model {
        u = person "User" "Modeling expert, or domain expert who needs to created process models based on documents"
        llm = softwareSystem "AutoBPMN.AI LLM Service" "" {
            tags "LLMService" 
        }
        ss = softwareSystem "Document-Based Process Modeler" {
            fe = container "Web Application" {
                tags "FE"
            }
            be = container "Backend" {
                technology "Node.js"
                tags "BE"
            }
            fs = container "Directory" {
                tags "Directory"
            }
            db = container "Database" {
                tags "Database"
            }
        }
        u -> ss.fe "Uses"
        ss.fe -> llm "Reads from and writes to"
        ss.fe -> ss.be "Reads from and writes to"
        ss.be -> ss.fs "Reads from and writes to"
        ss.be -> ss.db "Reads from and writes to"
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

        styles {
            element "Element" {
                //color #2b2b2b
                //stroke #2b2b2b
                color #0773af
                stroke #0773af
                strokeWidth 5
                shape roundedbox
            }
            element "Person" {
                color #55aa55
                stroke #55aa55
                shape person
            }
            element "LLMService" {
                color #f88728
                stroke #f88728
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