Đọc toàn bộ tài liệu trong thư mục docs.

Đọc toàn bộ source code trước khi thực hiện thay đổi.

==================================================

Task-026

Implement ICD Master Data Import from JSON.

Context

The project already has Rule Engine Core completed.

Under:

docs/analis/03_Icd_data/

there are two files:

- icd_meta.json
- icd_rows.json

These files are the official ICD master data and must become the source for ICD validation.

Requirements

1. Analyze the structure of both JSON files.

2. Determine how ICD information maps to the current database schema.

3. If ICD records are not already present in the database:
   - import them.
   - avoid inserting duplicates.
   - use ICD Code as the unique key.

4. If an ICD already exists:
   - update changed fields.
   - preserve database integrity.

5. Implement an ICD import service.

Suggested name:

IIcdImportService
IcdImportService

6. The import process should:

- Read icd_meta.json.
- Read icd_rows.json.
- Validate JSON format.
- Map JSON to database entities.
- Insert or update records.

7. Log:

- Total records.
- Inserted records.
- Updated records.
- Skipped records.
- Errors.

8. The importer must be idempotent.
Running it multiple times must not create duplicate ICD records.

9. Follow existing architecture:
- Repository Pattern
- Dependency Injection
- EF Core

10. Do not modify Rule Engine.

11. Do not implement validation rules yet.

12. Add XML documentation.

Output

- JSON parser
- Import service
- Mapping logic
- Database synchronization
- Logging