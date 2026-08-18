# 🇺🇬 School ERP — Project Documentation

**Project:** School ERP for Uganda  
**Status:** Development  
**Current Phase:** Foundation / Development Environment Setup

---

## 1. Project Vision

The goal is to build a modern School ERP platform designed for schools in Uganda.

The system will provide a single platform through which different school users can perform their responsibilities.

The fundamental design principle is:

> One application, one codebase, multiple roles, multiple devices.

The application should work across:

- Mobile phones
- Tablets
- Laptops
- Desktop computers

The system will be developed as a Progressive Web App (PWA), allowing users to access it through a browser and, where supported, install it like an application.

---

# 2. Core Architecture

The project uses a monorepo-based full-stack TypeScript architecture.

High-level architecture:

```text
                         SCHOOL ERP
                             |
             +---------------+---------------+
             |                               |
       Frontend Application             Backend API
             |                               |
          Next.js                         NestJS
             |                               |
             +---------------+---------------+
                             |
                         PostgreSQL
                         Planned supporting infrastructure:
                                                  SCHOOL ERP
                             |
                 +-----------+-----------+
                 |                       |
              Next.js                  NestJS
                PWA                     API
                 |                       |
                 +-----------+-----------+
                             |
                         PostgreSQL
                             |
                 +-----------+-----------+
                 |                       |
              Redis                 Background Jobs
                                      BullMQ
3. Technology Stack
Area	Technology
Frontend	Next.js
Frontend language	TypeScript
UI	React
Styling	Tailwind CSS
Backend	NestJS
Backend language	TypeScript
Database	PostgreSQL
ORM	Prisma
Cache	Redis
Background jobs	BullMQ
Package manager	pnpm
Repository	Git
Remote repository	GitHub
Containers	Docker
Frontend deployment model	PWA
4. Device Strategy

The ERP will not use separate mobile and desktop applications.

Instead, one responsive application will serve:

                    ONE APPLICATION
                          |
            +-------------+-------------+
            |             |             |
          Mobile        Tablet        Desktop
            |             |             |
            +-------------+-------------+
                          |
                     Next.js PWA

The interface will adapt to different screen sizes and device capabilities.

Example:

Phone  -> Attendance
Tablet -> Marks entry
Laptop -> Administration

Users should not need separate applications for different devices.

5. PWA Strategy

The frontend will eventually be enhanced with Progressive Web App capabilities.

Target experience:

Browser
   |
   v
School ERP
   |
   +-- Installable
   +-- Responsive
   +-- Mobile friendly
   +-- Desktop friendly
   +-- Offline capabilities where appropriate

PWA functionality has not yet been fully implemented.

6. Monorepo Structure

The intended repository structure is:

school-erp/
|
+-- apps/
|   +-- web/
|   +-- api/
|
+-- packages/
|   +-- ui/
|   +-- types/
|   +-- config/
|
+-- docs/
|
+-- docker/
|
+-- package.json
+-- pnpm-workspace.yaml
+-- .gitignore
+-- README.md
Applications
apps/web

Next.js frontend application.

apps/api

NestJS backend API.

Shared Packages
packages/ui

Reusable UI components.

packages/types

Shared TypeScript types.

packages/config

Shared project configuration.

Documentation
docs

Technical documentation, architecture decisions, development notes, and project governance.

Infrastructure
docker

Docker and container-related configuration.

7. Why a Monorepo

A monorepo allows the frontend and backend to share common code and definitions.

Potential shared resources include:

TypeScript types
Validation schemas
UI components
Configuration
Common utilities

This reduces duplication and helps keep frontend and backend contracts consistent.

8. Development Environment

Development operating system:

Windows 10
10.0.19045.6466

Installed tools:

Node.js
v24.11.0


npm
11.6.2


Git
2.51.2.windows.1


pnpm
11.21.0


Docker
29.7.2


Docker Compose
5.3.1


WSL
2.7.11.0

Project location:

E:\school-erp
9. Docker

Docker Desktop is installed and operational.

WSL 2 is configured.

Docker will eventually be used for development infrastructure such as:

Docker
|
+-- PostgreSQL
|
+-- Redis
|
+-- Other supporting services

PostgreSQL has not yet been configured for this project.

10. Git and GitHub

Git repository:

E:\school-erp

Default branch:

main

GitHub repository:

https://github.com/brunocoder256/school-erp.git

The local repository is connected to GitHub through the origin remote.

The initial repository content has already been pushed to GitHub.

11. Package Manager

The project uses pnpm.

Current version:

pnpm 11.21.0

The root package.json uses an exact package-manager version:

"packageManager": "pnpm@11.21.0"

The project uses pnpm workspaces for the monorepo.

12. Frontend

The frontend application is located at:

apps/web

Technology:

Next.js 16.3.0

Configured features:

TypeScript        Yes
ESLint            Yes
Tailwind CSS      Yes
src/ directory    Yes
App Router        Yes
Turbopack         Yes
React Compiler    No for now

The source structure begins with:

apps/web/
|
+-- src/
    |
    +-- app/
13. Current Frontend Status

The Next.js application is successfully running locally.

Development command:

pnpm --filter web dev

Local development URL:

http://localhost:3000

The application has successfully loaded in the browser.

14. Problems Resolved During Setup
Docker / WSL

Docker initially failed because the Docker Linux engine was not available.

WSL was updated and configured.

pnpm Installation

Installing pnpm directly through npm initially encountered network errors.

Corepack was subsequently used to activate pnpm.

Package Manager Configuration

An invalid package-manager configuration was encountered.

The project was configured to use:

"packageManager": "pnpm@11.21.0"
npm Registry Connectivity

The connection to the npm registry was intermittently slow and produced ECONNRESET and timeout errors.

pnpm fetch timeout and retry settings were increased.

Dependencies were eventually installed successfully.

pnpm Build Approval

pnpm initially reported an ignored build script for:

unrs-resolver

The dependency was explicitly approved using pnpm's build approval mechanism.

A subsequent installation completed successfully.

15. Current Architecture Status

Current implemented portion:

                         SCHOOL ERP
                             |
                      +------+------+
                      |             |
                   Next.js       Future API
                      |             |
                      |          NestJS
                      |             |
                      +------+------+
                             |
                       Future Database
                             |
                         PostgreSQL

Implemented:

Development environment       Yes
Git                           Yes
GitHub                        Yes
pnpm workspace                Yes
Next.js                       Yes
TypeScript                    Yes
Tailwind CSS                  Yes
ESLint                        Yes
App Router                    Yes
Next.js development server    Yes

Planned:

NestJS API                    Pending
PostgreSQL                    Pending
Prisma                        Pending
Redis                         Pending
BullMQ                        Pending
Authentication               Pending
Authorization/RBAC            Pending
Multi-tenancy                 Pending
PWA layer                     Pending
Offline synchronization       Pending
ERP modules                   Pending
Production deployment         Pending
16. Planned ERP Modules

The system is expected to eventually include modules such as:

School Management
|
+-- Students
+-- Staff
+-- Parents / Guardians
+-- Classes
+-- Subjects
+-- Academic Years
+-- Terms
|
+-- Attendance
+-- Examinations
+-- Marks
+-- Report Cards
|
+-- Fees
+-- Payments
+-- Financial Reports
|
+-- Timetables
+-- Communication
+-- Library
+-- Transport
+-- Reports

The final module list will be refined during requirements analysis.

17. Development Philosophy

Development will follow a controlled incremental process:

Plan
 |
 v
Implement
 |
 v
Run
 |
 v
Verify
 |
 v
Commit
 |
 v
Push
 |
 v
Next feature

We will avoid building large sections of the ERP without verification.

Each major milestone should be:

Implemented
Tested
Reviewed
Committed
Pushed to GitHub
18. AI-Assisted Development

AI tools may be used as development assistants.

ChatGPT

Primary uses:

Architecture planning
Requirements analysis
Database design
Security planning
Technical documentation
Development roadmap
Code review
Debugging assistance
Claude

Primary uses may include:

Code implementation
Refactoring
Repository-level changes
Tests
Debugging
Implementation assistance

AI-generated code must be reviewed and tested before being considered part of the production system.

19. Development Rules

The following rules apply to the project:

Rule 1 — One source of truth

Architecture decisions should be documented.

Rule 2 — Small changes

Avoid making large uncontrolled changes.

Rule 3 — Verify before proceeding

A feature should work before moving to the next foundation layer.

Rule 4 — Git frequently

Important milestones should be committed.

Rule 5 — No secrets in Git

Passwords, API keys, database credentials, tokens, and other secrets must never be committed.

Rule 6 — Production data stays separate

Real school/student information must never be used casually during development.

Rule 7 — Security is designed early

Authentication, authorization, tenant isolation, audit logging, and data protection are architectural concerns, not final-stage additions.

20. Current Milestone
Milestone 1 — Development Foundation

Status:

COMPLETE

Completed:

Windows development environment
WSL 2
Docker
Git
GitHub
pnpm
Monorepo foundation
Next.js
TypeScript
Tailwind CSS
ESLint
App Router
Local development server
21. Next Milestones
Milestone 2 — Project Documentation & Governance

Implemented:

Permanent documentation
Development conventions
Commit documentation to GitHub
Milestone 3 — Backend Foundation

Implemented:

NestJS application
pnpm workspace integration
API structure
Frontend/backend development workflow
Milestone 4 — Infrastructure

Implemented:

Docker Compose
PostgreSQL
Redis
Environment configuration
Milestone 5 — Database

Implemented:

Prisma
Database connection
Initial schema
Migrations
Milestone 6 — Identity and Access

Implemented:

Users
Authentication
Roles
Permissions
School/tenant isolation
Milestone 7 — Core School Domain

Implemented:

Schools
Academic years
Terms
Classes
Subjects
Students
Staff
Guardians
Milestone 8 — Academic Structure & Uganda Education Model

Implemented:

Configurable education sections
Configurable academic levels and progression
Academic classes and streams
Subject catalog, categories, offerings and combinations
Tenant-scoped seed data for a representative Ugandan school
Milestone 9 — Academic Operations

Planned:

Attendance
Exams
Marks
Report cards
Timetables
Milestone 10 — Finance

Planned:

Fees
Invoices
Payments
Balances
Financial reporting
Milestone 11 — PWA and Offline Capabilities

Planned:

Installability
Service worker
Caching
Offline support where appropriate
Synchronization
22. Current Project Principle

The most important architectural principle is:

Build a robust foundation first, then build the ERP modules on top of it.

The project should remain maintainable as the number of schools, users, students, transactions, and modules grows.

23. Current Status

Project: School ERP for Uganda

Phase: Foundation

Status: 🟢 Active Development

Frontend: 🟢 Running

Backend: 🟢 Running (NestJS API with Prisma)

Database: 🟢 PostgreSQL configured and migrated

PWA: 🔴 Not yet implemented

Production: 🔴 Not yet deployed

Implemented milestones: Backend foundation, Infrastructure, Database,
Identity and Access, School domain (academic years, terms, students,
enrollment), and the Academic Structure & Uganda Education Model foundation
(configurable sections, levels, progression, classes, streams, subject
catalog, offerings, combinations).

Planned milestones: Academic operations (attendance, exams, marks, report
cards, timetables), Finance, PWA and offline capabilities.