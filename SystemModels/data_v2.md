# Data Model — Entity Relationship Diagram

```plantuml
@startuml

skinparam linetype ortho
hide empty methods

' ── Entities ────────────────────────────────────────────────────────

entity projects {
  * id           : TEXT  <<PK>>
  --
  * name         : TEXT
  * latest_model_number : INTEGER
  * created_at   : TEXT
    deleted_at   : TEXT
}

entity documents {
  * id                    : TEXT  <<PK>>
  --
  * project_id            : TEXT  <<FK → projects>>
    latest_version_id     : TEXT  <<FK → document_versions, nullable>>
  * name                  : TEXT
  * latest_version_number : INTEGER
  * created_at            : TEXT
    deleted_at            : TEXT
}

entity document_versions {
  * id             : TEXT  <<PK>>
  --
  * document_id    : TEXT  <<FK → documents>>
    restored_from  : TEXT  <<FK → document_versions, nullable>>
  * version_number : INTEGER
  * name           : TEXT
  * filename       : TEXT
  * words_count    : INTEGER
  * created_at     : TEXT
}

entity models {
  * id                    : TEXT  <<PK>>
  --
  * project_id            : TEXT  <<FK → projects>>
    latest_version_id     : TEXT  <<FK → model_versions, nullable>>
  * name                  : TEXT
  * latest_version_number : INTEGER
  * created_at            : TEXT
    deleted_at            : TEXT
}

entity model_versions {
  * id                   : TEXT  <<PK>>
  --
  * model_id             : TEXT  <<FK → models>>
    restored_from        : TEXT  <<FK → model_versions, nullable>>
  * version_number       : INTEGER
  * name                 : TEXT
    selected_words_count : INTEGER
  * created_at           : TEXT
}

entity document_model_links {
  * id                   : TEXT  <<PK>>
  --
  * document_version_id  : TEXT  <<FK → document_versions>>
  * model_version_id     : TEXT  <<FK → model_versions>>
  * created_at           : TEXT
}

entity document_model_link_selections {
  * id             : TEXT    <<PK>>
  --
  * link_id        : TEXT    <<FK → document_model_links>>
  * start          : INTEGER
  * end            : INTEGER
  * exact          : TEXT
    prefix         : TEXT
    suffix         : TEXT
  * style          : TEXT    <<JSON object>>
  * review_status  : TEXT    <<none|pending|notified>>
    deleted_at     : TEXT
  * created_at     : TEXT
}

entity document_model_link_selection_history {
  * id           : TEXT    <<PK>>
  --
  * selection_id : TEXT    <<FK → document_model_link_selections>>
  * type         : TEXT    <<manual|auto_reanchor>>
  * start        : INTEGER
  * end          : INTEGER
  * exact        : TEXT
    prefix       : TEXT
    suffix       : TEXT
  * style        : TEXT    <<JSON object>>
  * created_at   : TEXT
}

entity model_version_events {
  * id                   : TEXT  <<PK>>
  --
  * model_version_id     : TEXT  <<FK → model_versions>>
  * type                 : TEXT  <<manual_*|auto_*>>
    selected_words_count : INTEGER
  * created_at           : TEXT
}

entity model_generation_attempts {
  * id                       : TEXT  <<PK>>
  --
  * project_id               : TEXT  <<FK → projects>>
    base_model_version_id    : TEXT  <<FK → model_versions, nullable>>
    result_model_version_id  : TEXT  <<FK → model_versions, nullable>>
  * generation_type          : TEXT  <<new|regeneration|refinement>>
  * generation_input_mode    : TEXT  <<selection_only|selection_with_prompt|prompt>>
  * result                   : TEXT  <<accepted_new_model|accepted_replace|accepted_new_version|declined>>
    prompt                   : TEXT
    selected_words_count     : INTEGER
  * created_at               : TEXT
}

entity model_subprocesses {
  * id                   : TEXT  <<PK>>
  --
  * model_version_id     : TEXT  <<FK → model_versions>>
  * task_id              : TEXT
  * subprocess_model_id  : TEXT  <<FK → models>>
  * created_at           : TEXT
    deleted_at           : TEXT
}


' ── Relationships ────────────────────────────────────────────────────
'
' Notation:  ||  = exactly one          |o  = zero or one
'            |{  = one or more          o{  = zero or more
'
' Each relationship comment reads:  LEFT cardinality ←→ RIGHT cardinality

' projects → documents
' One project owns zero-or-more documents
projects            ||--o{  documents                               : "owns"

' projects → models
' One project owns zero-or-more models
projects            ||--o{  models                                  : "owns"

' projects → model_generation_attempts
' One project records zero-or-more generation attempts
projects            ||--o{  model_generation_attempts               : "records"

' documents → document_versions  (ownership via document_id, NOT NULL)
' One document has zero-or-more versions
documents           ||--o{  document_versions                       : "has versions"

' documents → document_versions  (denorm pointer via latest_version_id, nullable)
' A document points to zero-or-one latest version;
' a document_version is the "latest" of zero-or-one document
documents           |o..o|  document_versions                       : "latest (nullable)"

' document_versions self-reference  (restored_from, nullable)
' A version may be restored from zero-or-one source version;
' one source version may be the origin of zero-or-more restored copies
document_versions   |o--o{  document_versions                       : "restored from"

' models → model_versions  (ownership via model_id, NOT NULL)
' One model has zero-or-more versions
models              ||--o{  model_versions                          : "has versions"

' models → model_versions  (denorm pointer via latest_version_id, nullable)
' A model points to zero-or-one latest version;
' a model_version is the "latest" of zero-or-one model
models              |o..o|  model_versions                          : "latest (nullable)"

' model_versions self-reference  (restored_from, nullable)
' A version may be restored from zero-or-one source version;
' one source version may be the origin of zero-or-more restored copies
model_versions      |o--o{  model_versions                          : "restored from"

' document_versions × model_versions  →  document_model_links  (junction / many-to-many)
' One document_version appears in zero-or-more links
document_versions   ||--o{  document_model_links                    : "linked via"
' One model_version appears in zero-or-more links
model_versions      ||--o{  document_model_links                    : "linked via"

' document_model_links → document_model_link_selections
' One link has zero-or-more selections
document_model_links            ||--o{  document_model_link_selections          : "has"

' document_model_link_selections → document_model_link_selection_history
' One selection has zero-or-more history entries (append-only log)
document_model_link_selections  ||--o{  document_model_link_selection_history   : "history"

' model_versions → model_version_events
' One model_version has zero-or-more audit events
model_versions      ||--o{  model_version_events                    : "has events"

' model_versions → model_generation_attempts  (base_model_version_id, nullable)
' A model_version is the base of zero-or-more attempts;
' an attempt has zero-or-one base version (NULL for generation_type = 'new')
model_versions      |o--o{  model_generation_attempts               : "base of"

' model_versions → model_generation_attempts  (result_model_version_id, nullable)
' A model_version is the result of zero-or-more attempts;
' an attempt has zero-or-one result version (NULL when result = 'declined')
model_versions      |o--o{  model_generation_attempts               : "result of"

' model_versions → model_subprocesses  (model_version_id, NOT NULL)
' One model_version hosts zero-or-more subprocess slot entries
model_versions      ||--o{  model_subprocesses                      : "hosts"

' models → model_subprocesses  (subprocess_model_id, NOT NULL)
' One model is used-as-subprocess in zero-or-more slots
models              ||--o{  model_subprocesses                      : "used as subprocess"

@enduml
```
