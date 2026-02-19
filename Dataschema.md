## projects

- id (PK)
- name
- generated_model_count
- created_at
- deleted_at

---

## documents (versioned)

- version_id (PK)
- document_id
- project_id (FK → projects.id)
- name
- storage_path
- words_count
- created_at
- deleted_at

Index: - project_id
    

---

## models (versioned)

- version_id (PK)
- model_id
- project_id (FK → projects.id)
- name
- storage_path
- selected_words_count
- created_at
- deleted_at
  

Index:
- project_id

---

## traces

- id (PK)
- document_version_id (FK → documents.version_id)
- model_version_id (FK → models.version_id)
- selections
- created_at
- deleted_at


Indexes:
- document_version_id
- model_version_id
    

---

## model_update_events

- id (PK)
- model_version_id (FK → models.version_id)
- type
- details
- created_at
- deleted_at
  

Index:
- model_version_id