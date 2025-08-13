
```mermaid
flowchart LR
    UI[Frontend (Next.js, Tailwind, shadcn/ui)]
    API[App API (NestJS, Matching, Moderation)]
    DB[App DB (Postgres + pgvector)]
    AI[AI Services (OpenAI, Moderation, Summaries)]
    RosterInterface[RosterProvider Interface]
    TimeBack[TimeBackRosterProvider (TimeBack API)]
    Mock[MockRosterProvider (Fake CSV/JSON data)]

    UI -->|User interactions| API
    API -->|Store profiles, matches, conversations| DB
    API -->|Summaries, moderation, embeddings| AI
    API -->|Roster sync calls| RosterInterface
    RosterInterface -->|If approved| TimeBack
    RosterInterface -->|For demo/mock data| Mock
```
