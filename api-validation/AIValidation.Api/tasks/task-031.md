Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ source code trước khi thực hiện thay đổi.

==================================================

Task-031

You are acting as a Senior Software Architect.

Your task is NOT to write code immediately.

Your first responsibility is to redesign the current AI Validation project into a modern, enterprise-grade software architecture that can be maintained for many years.

==================================================
CURRENT PROJECT
==================================================

Current backend:
- ASP.NET Core (.NET 10)
- REST API
- PostgreSQL
- Entity Framework Core
- OpenAPI + Scalar
- Existing AI Validation module
- Existing Rule Engine
- Existing RAG knowledge
- Existing LLM Provider abstraction

Current frontend:
- Chrome Extension

==================================================
GOAL
==================================================

The project will evolve into a complete AI Platform instead of only an AI Validation API.

The platform must support:

1. User Management
2. Authentication
3. Authorization
4. AI Validation
5. Knowledge Base
6. RAG
7. Prompt Management
8. AI Model Management
9. Document Management
10. Audit Logs
11. System Configuration
12. Multi-provider AI
13. Future Plugin Modules

The architecture must be suitable for long-term development.

==================================================
BACKEND REQUIREMENTS
==================================================

Use

.NET 10

Design a modern architecture based on

Vertical Slice Architecture

combined with

Clean Architecture principles

Avoid unnecessary complexity.

Backend should include:

Authentication

- Local Login
- Google Login
- Microsoft Login
- JWT
- Refresh Token
- Email verification
- Password reset

Authorization

Implement RBAC.

Need these entities:

Users

Roles

Permissions

RolePermissions

UserRoles

Permission must be able to map to

Controller

Action

or Endpoint

Support policy-based authorization.

Permission examples:

Knowledge.View

Knowledge.Edit

Knowledge.Delete

Validation.Execute

Prompt.Manage

System.Admin

User.Manage

Role.Manage

Audit.View

AI.Chat

AI.Validation

etc.

==================================================
DOCUMENT MANAGEMENT
==================================================

Support uploading documents.

Supported formats:

pdf

docx

xlsx

txt

md

html

json

csv

The uploaded documents will later be indexed into RAG.

Need architecture for

Storage Provider

Document Parser

Chunking

Embedding

Vector Store

==================================================
RAG
==================================================

Need architecture only.

Support

Chroma

Milvus

PGVector

FAISS

through abstraction.

==================================================
AI
==================================================

Support multiple providers.

OpenAI

Azure OpenAI

Claude

Gemini

OpenRouter

Ollama

vLLM

through Provider Pattern.

==================================================
DATABASE
==================================================

Use PostgreSQL.

Need complete database design.

Include

Identity

Permissions

Documents

Knowledge

Prompt

Audit

Settings

Validation

AI Conversation

==================================================
AUDIT
==================================================

Every important action should be logged.

==================================================
CONFIGURATION
==================================================

System settings stored in database.

==================================================
API
==================================================

REST API

OpenAPI

Scalar

Versioning

ProblemDetails

Result Pattern

Global Exception Middleware

==================================================
FRONTEND
==================================================

Frontend will be completely rewritten.

Use

Angular (latest LTS)

Requirements:

Modern architecture

Standalone Components

Signals

Lazy Loading

Feature Modules

Angular Material

Modern UI

Responsive

Dark Mode

Permission-based Menu

Permission-based Routing

Authentication

Dashboard

User Management

Role Management

Permission Management

Document Management

Knowledge Management

Prompt Management

AI Validation

Settings

Audit Logs

System Monitoring

Modern UX

==================================================
CODING STANDARDS
==================================================

Use

SOLID

Clean Code

XML Documentation

FluentValidation

Mapperly

Serilog

HybridCache

Dependency Injection

Repository Pattern only where appropriate.

Avoid Generic Repository if unnecessary.

==================================================
OUTPUT
==================================================

Do NOT generate code.

Instead generate:

1. Overall System Architecture

2. Solution Folder Structure

3. Project Structure

4. Backend Folder Structure

5. Angular Folder Structure

6. Database Design

7. Entity Relationship Diagram

8. Identity Design

9. Authorization Design

10. Permission Design

11. Authentication Flow

12. Document Upload Flow

13. RAG Flow

14. AI Provider Flow

15. Validation Flow

16. Sequence Diagrams

17. Deployment Architecture

18. Recommended NuGet packages

19. Recommended Angular libraries

20. Roadmap

Finally divide the implementation into small development tasks.

Each task should be independent.

Each task should be reviewable.

Each task should be testable.

Do not skip architectural analysis.

This document will become the blueprint for the entire project.

