```plantuml
@startuml
!theme plain

entity "Project" as Project {
  name : TEXT
  content : TEXT
  documents: List
}

entity "Document" as Document {
  name : TEXT
  content : TEXT
}

entity "Model" as Model {
  name : TEXT
  dataa : XML
  svg: SVG
}

entity "Trace" as Trace {
  document_id : INT
  model_id : INT
  color: String
  selections : JSON   // [{color,start_offset, end_offset, text}]
}
// benefit: 
// - quick lookup model's document 
// - modifiable to M2M

' --- Relationships ---
Document ||--o{ Trace : "has mappings"
Model ||--o{ Trace : "mapped in"

@enduml
```