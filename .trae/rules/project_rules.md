AI Project Rules: Next.js Full-Stack Best Practices for Solo Developers v2.0

This document defines the core rules and best practices for building modern full-stack applications using the specified tech stack (Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Prisma, Clerk, Sanity, Vercel). The AI assistant must strictly adhere to all guidelines herein when generating, refactoring, or reviewing code to ensure quality, consistency, and performance.

0. AI Collaboration Methodology

- First Principle: Think Before You Code. Before writing any code, you must first describe your implementation plan in detail using pseudocode or a step-by-step list.
- Adhere Strictly to User Requirements. Actively ask for clarification on any ambiguities.
- Write Complete and Runnable Code. Do not leave // TODO comments, placeholders, or unimplemented features.
- Prioritize Readability and Maintainability over premature performance optimization.
- Security is the Highest Priority. Always consider potential security risks when handling user input, authentication, authorization, and third-party data.

1. Core Architecture & Project Structure

- Always use the Next.js App Router structure. All pages, layouts, and route files must be created within the app/ directory.
- Adhere to a layered architecture to separate concerns clearly:
  - app/ (Routing Layer): Contains only route files like layout.tsx, page.tsx, loading.tsx, error.tsx, etc.
  - app/ui/ (UI Layer): Contains all reusable client ('use client') and server UI components. Encourage using a micro-folder structure for complex components (e.g., app/ui/button/index.tsx, app/ui/button/- \* riants.ts).
  - app/lib/ (Logic Layer): Contains core business logic, such as prisma.ts, dal.ts (Data Access Layer), actions.ts (Server Actions), and utils.ts.
  - app/services/ (Service Layer): Contains platform-agnostic core business logic reusable across multiple clients (e.g., Web, mobile apps).
- UI components should primarily be from shadcn/ui, added via the pnpm dlx shadcn-ui@latest add [component] command and customized through the global theme.
- Naming Conventions:
  - Directories and Component Files: Use kebab-case (e.g., like-button/index.tsx).
  - Components and Types: Use PascalCase (e.g., function LikeButton, type LikeButtonProps).
  - Variables and Functions: Use camelCase.
  - Booleans: Use prefixes like is, has, should, can (e.g., isLoading, hasError).
  - Event Handlers: Use the handle prefix (e.g., handleClick, handleSubmit).
- Wrapper Component Principle:
  - When creating a custom component that wraps or acts as a proxy for another component (especially from a UI library like next-themes), you must import and reuse the Props type definition from the original component or its library. It is strictly prohibited to use any or broad generic types like Record<string, unknown> merely to silence TypeScript errors. The goal is to inherit and enforce strong type safety, autocompletion, and maintainability.

2. Data Layer (Prisma & Database)

- prisma/schema.prisma is the Single Source of Truth for the database structure. All data model definitions and modifications must originate in this file.
- Use `pnpm prisma migrate dev` for applying schema changes in the local development environment.
- Use `pnpm prisma migrate deploy` within the build script in package.json for production database migrations.
- All database read operations must be encapsulated within functions in the Data Access Layer (app/lib/dal.ts).
- All data-fetching functions exported from the DAL for use in Server Components must be wrapped with React.cache to enable automatic request deduplication within a single render pass.
- All database write operations (Create, Update, Delete) must be executed within Server Actions, which in turn call functions from the DAL.
- When passing data from the server to the client, always use a DTO (Data Transfer Object) to ensure only necessary and safe fields are exposed. Never pass complete Prisma model objects as props to Client Components.
- For multiple database write operations that need to be atomic, always use prisma.$transaction.

3. Authentication & Authorization (Clerk)

- Authentication must be implemented using @clerk/nextjs.
- Route protection must be configured in middleware.ts at the project root by defining the publicRoutes array in authMiddleware.
- To access user information in Client Components, always use the useUser() hook.
- To access user information on the server, always use the auth() helper from @clerk/nextjs/server.
- Authorization logic (e.g., role-based checks) must be performed on the server-side, using auth().sessionClaims.metadata.role.
- For UI elements that need to be conditionally rendered based on auth state or role, prefer using the <Protect> component from Clerk.
- A Clerk Webhook handler must be implemented to sync user data to the local Postgres User table.

4. Content Management (Sanity)

- For rich text, blog posts, and image galleries, Sanity must be used as the Headless CMS.
- Each independent website must correspond to a separate Sanity Project.
- Each Sanity Project must be configured with two Datasets: production and development.
- Data fetching from Sanity must use GROQ. Prefer using reference dereferencing (->) for relational data.
- For public-facing production pages, the Sanity Client must be configured with useCdn: true.
- For Live Preview and build-time data fetching, the Sanity Client must be configured with useCdn: false.

5. State, Caching & Fetching

- Default to static rendering. Only opt into dynamic rendering when a page depends on request-time information or uses uncached data fetches.
- The fetch API caching behavior follows the auto mode. Use { next: { revalidate: <seconds> } } for ISR and { cache: 'no-store' } for dynamic data.
- Server Components must not call their own Route Handlers. Server-side data interaction should be done by directly calling DAL/Service layer functions.
- Route Handlers are exclusively for serving external clients, receiving webhooks, and acting as a secure proxy for Client Components.
- Any successful database write operation (in a Server Action) must be followed by a call to revalidateTag (preferred) or revalidatePath.
- For complex client-side data fetching, use libraries like SWR or TanStack Query.

6. Testing & Error Handling

- The core testing strategy is to "test user behavior, not implementation details".
- End-to-End (E2E) tests are the highest priority. Use Playwright for critical user flows.
- Unit/Integration tests are the second priority, using Vitest. Primary targets are Server Actions and standalone business logic functions.
- Robust Error Handling: Must use try...catch blocks for all fallible operations (API calls, DB operations, Server Actions).
- Guard Clauses: Prefer using guard clauses at the beginning of functions to handle errors, permissions, and edge cases, avoiding deeply nested if statements.

7. UI/UX Design & Visual Polish

- Prioritize color and font weight for hierarchy, not just font size. Use heavier weights for primary elements and muted colors for secondary information.
- Establish a clear action hierarchy: Use solid buttons for primary actions, outline/secondary for secondary, and ghost/link for tertiary.
- Embrace whitespace by default. Use a predefined spacing system from tailwind.config.ts and avoid magic numbers.
- Constrain line length for readability using max-w-\* utilities for text-heavy content.
- Group related elements visually by ensuring the space between groups is larger than the space within them.
- Use baseline alignment (items-baseline) for text of different sizes on the same line.
- Use borders sparingly, preferring shadows or background colors for separation.
- Ensure text on images is legible by using overlays or text shadows.
- Design thoughtful empty states with guiding copy and a clear Call-to-Action (CTA).
