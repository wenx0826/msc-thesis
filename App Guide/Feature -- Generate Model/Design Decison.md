1. **Consistency with your current UI:** regeneration already forces an explicit decision (Cancel / Replace / Save as new version), but first creation auto-saves. Two different patterns for similar AI output is confusing.
    
2. **User control and trust:** first generated models are often imperfect; requiring confirmation avoids “the system did something permanent without me”.
    
3. **Lower cleanup cost:** auto-create triggers real side effects (model entry, links/traces, graph updates). Undoing that is heavier than just discarding a draft.
    
4. **Less workspace clutter:** without confirmation, low-quality first outputs accumulate and pollute model lists/version history.
    
5. **Safer default for uncertain AI output:** when output quality varies, confirm-before-persist is the more reliable UX baseline.