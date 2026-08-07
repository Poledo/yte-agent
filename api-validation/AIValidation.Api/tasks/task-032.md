Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ source code trước khi thực hiện thay đổi.

==================================================

Task-032

tạo frontend ra 1 thư mục riêng, tách ra khỏi backend, để sau này có thể phát triển độc lập.

You are acting as a Senior Angular Architect.

Do NOT generate code immediately.

First redesign the frontend into a modern enterprise Angular application.

==================================================
GOAL
==================================================

Build a modern AI Platform frontend.

Technology:

- Angular (latest stable version)
- TypeScript
- Angular Material
- SCSS

The application must be maintainable for many years.

==================================================
ARCHITECTURE
==================================================

Use modern Angular architecture.

Requirements:

- Standalone Components
- Signals
- Lazy Loading
- Route-level Code Splitting
- Functional Guards
- Functional Interceptors
- RxJS where appropriate
- Strong typing
- Strict mode enabled

Avoid outdated NgModule-based architecture unless required.

==================================================
PROJECT STRUCTURE
==================================================

Design the complete folder structure.

Example:

src/

app/

core/

shared/

features/

layout/

auth/

assets/

environments/

Provide a detailed explanation for each folder.

==================================================
LAYOUT
==================================================

Modern Admin Dashboard.

Need:

Top Navigation

Left Sidebar

Collapsible Menu

Breadcrumb

Global Search

Notification Center

User Menu

Dark Mode

Responsive Layout

Fullscreen Support

==================================================
AUTHENTICATION
==================================================

Support

Login

Logout

Refresh Token

Google Login

Microsoft Login

Remember Me

Forgot Password

Reset Password

Profile

Change Password

==================================================
AUTHORIZATION
==================================================

Permission-based UI.

Menu should be generated dynamically according to permissions.

Buttons

Pages

Tabs

Actions

must all support permission checking.

==================================================
PAGES
==================================================

Dashboard

User Management

Role Management

Permission Management

Document Management

Knowledge Base

Prompt Management

Validation

AI Chat

Model Management

Audit Logs

Settings

Profile

System Monitoring

==================================================
DOCUMENT MANAGEMENT
==================================================

Support

Upload

Drag & Drop

Preview

Search

Delete

Version History

Metadata

==================================================
KNOWLEDGE
==================================================

Tree View

Search

Category

Tags

Import

Export

==================================================
PROMPTS
==================================================

Prompt Editor

Syntax Highlight

Version History

Compare Versions

Preview

==================================================
AI CHAT
==================================================

Modern Chat UI.

Need

Streaming Response

Markdown

Code Highlight

Citation

Copy

Regenerate

Conversation History

==================================================
VALIDATION
==================================================

Display validation results.

Grouped by

Severity

Category

Rule

Support filtering.

==================================================
DASHBOARD
==================================================

Charts

Statistics

Recent Activities

System Health

Model Usage

Document Count

Users

==================================================
STATE MANAGEMENT
==================================================

Recommend the most suitable approach.

Explain whether to use:

Signals

RxJS

NgRx

or hybrid.

==================================================
API LAYER
==================================================

Typed API clients.

Centralized API service.

Automatic token refresh.

Error handling.

Retry policy.

==================================================
UI/UX
==================================================

Modern Design.

Simple.

Minimal.

Professional.

Smooth animation.

Skeleton Loading.

Empty State.

Error State.

Loading State.

Toast Notification.

Dialog.

Context Menu.

==================================================
TABLES
==================================================

Reusable Data Table Component.

Need

Sorting

Filtering

Column Chooser

Pagination

Export

Selection

==================================================
FORMS
==================================================

Reusable Form Components.

Validation

Error Display

Dynamic Forms

==================================================
THEME
==================================================

Support

Light

Dark

System

Custom Theme

==================================================
INTERNATIONALIZATION
==================================================

Support

Vietnamese

English

==================================================
TESTING
==================================================

Design testing strategy.

==================================================
OUTPUT
==================================================

Do NOT generate code.

Generate:

1. Overall Frontend Architecture

2. Folder Structure

3. Feature Structure

4. Routing Structure

5. State Management Design

6. Authentication Flow

7. Authorization Flow

8. Component Design

9. Shared Components

10. Layout Design

11. Theme Design

12. API Layer Design

13. UI Design Principles

14. Angular Libraries Recommendation

15. Development Roadmap

Finally divide the frontend into small implementation tasks.

Each task should be independent.

Each task should be testable.

Each task should be reviewable.

