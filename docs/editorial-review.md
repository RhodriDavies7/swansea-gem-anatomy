# Shared anatomy answer review — 11 September 2026

58 reviewed synonym pairs now share canonical records. 713 original multi-answer questions were compared; new differences introduced by the synonym merges were also compared. Each current fact has one preferred answer. Originals remain in `variants`, and every original model card still references its original variant for audit/recovery. Normal revision resolves the preferred answer.

Selection prioritised an answer that directly addresses the question, names the relevant structure or nerve, and retains useful clinical distinctions. Complementary answers were combined, including male/female pelvic relations and proximal/distal nerve lesions. This was an editorial review of supplied guides with targeted checks, not an independent clinical validation of every fact.

Three same-name collisions were separated using the original model/card context: tongue vs skull foramen caecum; median vs ulnar common palmar digital nerves; fibrous tympanic annulus vs bony tympanic ring. Hand and foot structures remain separate. Composite model labels are not automatically treated as synonyms of one component.

## Targeted checks

- [Optic nerve](https://www.ncbi.nlm.nih.gov/sites/books/NBK507907/): CN II identity, vision and prechiasmal lesion effects.
- [Pupillary pathway](https://www.ncbi.nlm.nih.gov/books/NBK553169/?report=reader): afferent optic pathway.
- [Tongue](https://www.ncbi.nlm.nih.gov/books/NBK507782/): lingual foramen caecum and thyroglossal origin.
- [Skull foramina](https://www.ncbi.nlm.nih.gov/books/NBK546621/?report=printable): cranial foramen caecum.
- [Tympanic annulus study](https://pubmed.ncbi.nlm.nih.gov/15668036/): fibrous annulus is distinct from the bony tympanic ring.
- [Flexor carpi ulnaris](https://ncbi.nlm.nih.gov/books/NBK526051/): ulnar motor supply and variable root conventions.

`content/editorial-review.json` records the initial and merged-answer decisions; the actual current preferred variant in each structure file is authoritative. `content/synonym-merges.json` records the reviewed merge pairs. Archived records are in `content/merged/`. The source-guide regression test verifies every original card, answer, tag and order.
