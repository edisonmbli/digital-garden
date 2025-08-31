# Hackers & Albums: An AI-Powered Digital Album & Blog

A production-grade, open-source digital photo album & blog, built with Next.js, Clerk, Sanity, and Neon. The entire development process, conducted in close collaboration with an AI co-pilot, is documented in a [17-part tutorial series](https://www.edisonmbli.com/en/log).

**[Live Demo](https://www.edisonmbli.com/en)** | **[Full Tutorial Series](https://www.edisonmbli.com/en/log)**

## About This Project: An Experiment in AI Co-Development

This project began with a simple question: in the age of AI, can a solo developer _truly_ build, launch, and maintain a production-grade application from scratch?

This repository is my answer to that question. It is, **first and foremost, a public experiment in AI co-development, and only secondarily, a product.**

To be frank, the application itself is not a groundbreaking startup. It's a personal "online album" built to solve a real pain point: sharing photos without the heavy compression of social media. The true value of this project lies in the **process**. It's a complete, documented journey of a novice indie developer learning to leverage AI to explore, learn, and ultimately build something real, useful, and production-ready.

The entire journey—the successes, the pitfalls, the late-night bug fixes, and the "aha!" moments—is unreservedly documented in the accompanying [tutorial series](https://www.edisonmbli.com/en/log).

## Key Features

- 🖼️ **Masonry Photo Gallery**: A beautiful, responsive masonry grid for photo collections, respecting original aspect ratios.
- 📸 **Immersive Polaroid-style Preview**: An emotionally resonant, algorithmically sized photo modal with spring animations.
- 🌐 **Full Internationalization (i18n)**: Complete English and Chinese language support from day one, built into the core architecture.
- 💬 **Mini Community System**: User authentication (Clerk), likes, and nested comments with a full backend moderation system.
- ✍️ **Markdown Blog**: A personal blog with a real-time Markdown previewer that syncs content to Sanity's Portable Text format.
- 🛡️ **Enterprise-Grade Security**: A multi-layered defense system including hotlink protection, API rate-limiting, and a secure image proxy to protect digital assets.
- 🚀 **Performance-Optimized**: Built for speed with a multi-layer caching strategy, SSG/ISR, `next/image`, and a focus on Core Web Vitals.
- 🤖 **AI Co-Developed**: Over 95% of the code was written in collaboration with an AI partner, guided by human architectural decisions.

## Tech Stack & Architectural Highlights

This project was built with a modern, production-ready, and scalable tech stack.

**Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, Framer Motion
**Backend:** Next.js (Route Handlers, Server Actions), Sanity (Headless CMS), Neon (Serverless Postgres), Prisma (ORM)
**Authentication:** Clerk
**Deployment:** Vercel
**Monitoring:** Sentry

### Key Architectural Decisions

This isn't just a collection of features; it's a system built on a set of deliberate architectural principles designed to showcase modern web development best practices. This approach highlights my experience in moving beyond a standard PM role into technical architecture and strategy.

- **AI Co-Development Model**: A "Captain & Co-pilot" workflow was used throughout. As the human "captain," I was responsible for the "invisible" work: product requirements, technical architecture, course-correction, and problem decomposition. The AI acted as the "co-pilot," handling over 95% of the "visible" work: writing code, drafting content, and executing clear instructions. You can read a full retrospective [here](https://www.edisonmbli.com/en/log/AI_colaboration_en).
- **Dual-Core Data Architecture**: A clear separation of concerns between two data sources. **Sanity CMS** is used for structured content creation (articles, photos), while a **Postgres** database (Neon) handles all relational, interactive data (users, likes, comments). A Data Access Layer (DAL) unifies them.
- **Defense-in-Depth Security**: The application is protected by a multi-layered security system, including a strict Content Security Policy, rate-limiting on sensitive actions, input validation with Zod, and a custom secure image proxy to prevent hotlinking and hide the CMS sensitive information.
- **Performance-First & Multi-Layer Caching**: The architecture is designed for speed, leveraging a three-layer caching strategy (Cloudflare CDN, Vercel Edge Cache, Sanity CDN) and prioritizing Static Site Generation (SSG/ISR) wherever possible to achieve excellent Core Web Vitals.

## Getting Started: From Zero to Deployed

This repository is the complete source code for a 17-part tutorial series on building a production-grade application. The setup is comprehensive, involving several third-party services.

There are two main ways to get started:

### 1. The Fast Path: One-Click Deploy to Vercel (Recommended)

The quickest and easiest way to have your own live version of this project is to deploy it directly to Vercel. This allows you to have a running application in minutes.

**After deploying, you will need to:**

1.  Create your own free accounts for **Clerk**, **Sanity**, and **Neon**.
2.  Follow the setup steps in their respective dashboards.
3.  Add the required API keys and database URLs as Environment Variables in your new Vercel project's settings.

The detailed process for configuring these services for a production environment is covered in the **[Deployment Tutorial](https://www.edisonmbli.com/en/log/deployment_en)**.

### 2. For a Deeper Dive: Running Locally

Setting up the local development environment is a more involved process, as it requires configuring the full stack (database, authentication, CMS) on your machine. This is a fantastic way to understand the project's inner workings but is more complex than a simple `pnpm dev`.

**The complete, step-by-step guide for the local setup is detailed throughout the [tutorial series](https://www.edisonmbli.com/en/log).** The repository's code corresponds to the final state of the tutorials.

For experienced developers who wish to set it up directly, here is a high-level overview of the steps involved:

1.  **Clone & Install:**

    ```bash
    git clone https://github.com/edisonmbli/digital-garden.git
    cd digital-garden
    pnpm install
    ```

2.  **Set Up External Services:**
    You will need to create your own **development instances** for the following services:
    - **Clerk**: For user authentication.
    - **Sanity**: For content management.
    - **Neon**: For the PostgreSQL database.

3.  **Configure Environment Variables:**
    Copy the `.env.example` file to `.env.local` and populate it with the API keys and connection strings from the services you created in the previous step.

    ```bash
    cp .env.example .env.local
    ```

4.  **Initialize Local Database:**
    - Ensure Docker Desktop is running.
    - Start the local PostgreSQL container:
      ```bash
      docker-compose up -d
      ```
    - Apply the database schema using Prisma:
      ```bash
      pnpm prisma db push
      ```

5.  **Run the Application:**

    ```bash
    pnpm dev
    ```

The application should now be running on `http://localhost:3000`.

### Why this revision is more effective:

- **Manages Expectations**: It immediately clarifies that the local setup is non-trivial, preventing user frustration.
- **Provides a "Quick Win"**: The "One-Click Deploy" option is a fantastic feature of modern platforms like Vercel. By placing it first, you give users an instant sense of accomplishment and a live project they can immediately start configuring.
- **Respects the User's Time**: It correctly positions the full tutorial series as the primary source of documentation for a deep dive, rather than trying to poorly replicate it in the README.
- **Polite and Professional**: The tone is helpful and guiding. It doesn't say "it's too hard for you"; it says, "For a deeper dive, the full guide is here." This respects the intelligence of the reader.
- **Still Provides a Roadmap**: The high-level overview for local setup is still present, acting as a mental checklist for experienced developers who want to jump right in.

---

## A Tribute to "Hackers & Painters"

The name of this project, **"Hackers & Albums,"** is my personal tribute to Paul Graham's classic book, "Hackers & Painters," which has profoundly shaped my values regarding technology and creation.

There's an idea in the book that I believe shines brighter than ever in today's AI explosion:

> "The computer is just a medium to express your ideas, like a painter's pigments and brushes, or an architect's steel and concrete. The real work is born in your mind."

In the past, only a few "painters" (developers) who had mastered the complex techniques of the "paintbrush" (coding ability) could turn the ideas in their minds into reality. Today, AI is becoming that incredibly powerful "paintbrush" in all of our hands. It allows us to focus more on _what_ to paint and _why_ to paint it, rather than getting overly bogged down in _how_ to paint. This, perhaps, is the most precious gift the age of AI has given to every one of us independent creators.

## License

This project, including all tutorial content and source code, is licensed under the [**Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0)**](https://creativecommons.org/licenses/by-nc-sa/4.0/). Please see the [LICENSE](https://creativecommons.org/licenses/by-nc-sa/4.0/) file for the full legal text.

**This license also explicitly covers all creative assets displayed on the live project website (edisonmbli.com), including but not limited to all photographic works and written articles.**

**In plain English, this means you are free to:**

- ✅ **Share**: Copy and redistribute the material in any medium or format.
- ✅ **Adapt**: Remix, transform, and build upon the material for **non-commercial purposes**.

**Under the following terms:**

- ✍️ **Attribution**: You must give appropriate credit, provide a link to the license, and indicate if changes were made.
- 🔄 **ShareAlike**: If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.
- 🚫 **NonCommercial**: You may **not** use the material for any commercial purposes.

**What does "Commercial Purposes" include?**

To be crystal clear, any use of this project's code or content for direct or indirect commercial gain is **strictly prohibited**. This includes, but is not limited to:

- Using the code or content on a corporate or personal monetized website/blog.
- Using the material in any form of paid educational content (e.g., courses, paid tutorials, workshops).
- Repackaging or selling the project or its derivatives.
- Any other activities where the primary purpose is commercial advantage or monetary compensation.

## The goal of this project is to share knowledge freely with fellow indie developers. If you have any questions about a specific use case, please feel free to reach out.
