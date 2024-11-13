import os

# Define sections and content for individual markdown files

sections = {
"overview.md": """

## Overview

The Office Supplies Tracker is a web application designed to manage and track office and cleaning supplies such as clipboards, pens, post-its, paper towels, water bottles, etc. It allows users to monitor inventory levels, request new supplies, and manage supply orders.
""",
"features.md": """

## Features

- **Inventory Management**: Track quantities of various office and cleaning supplies.
- **User Authentication**: Local authentication with username and password.
- **Role-Based Access Control (RBAC)**: Different user roles (e.g., Admin, Staff) with specific permissions.
- **Supply Requests**: Users can request new supplies when inventory is low.
- **Notifications**: Alert users/admins when supplies reach a minimum threshold.
- **Reporting**: Generate reports on supply usage over time.
  """,
  "tech_stack.md": """

## Tech Stack

- **Backend**:
  - [Neon.tech](https://neon.tech/) (PostgreSQL Database)
  - [Prisma](https://www.prisma.io/) ORM
- **Frontend**:
  Next Js
- **Authentication**:
  - Local authentication using usernames and passwords
- **Additional Tools**:
  - Testing frameworks (e.g., Jest, Playwright)
  - Deployment platforms (e.g., Vercel, Netlify)
    """,
    "requirements.md": """

## Requirements

### Functional Requirements

- Users can log in and log out securely.
- Admins can add, update, or delete supplies.
- Staff can view supplies and request new orders.
- The system should maintain an audit log of all transactions.

### Non-Functional Requirements

- The application should be responsive and work on all modern browsers.
- Data should be securely stored and transmitted.
- The system should be scalable to accommodate future features.
  """,
  "architecture.md": """

## Architecture

The application follows a **client-server architecture**:

- **Frontend**: Built with NextJs for a reactive UI.
- **Backend**: Uses Prisma to interact with a PostgreSQL database hosted on Neon.tech.
- **API Layer**: RESTful APIs for communication between frontend and backend.
  """,
  "database_schema.md": """

## Database Schema

### Entities

- **User**
  - `id` (UUID, Primary Key)
  - `username` (String, Unique)
  - `password` (Hashed String)
  - `role` (Enum: Admin, Staff)
- **Supply**
  - `id` (UUID, Primary Key)
  - `name` (String)
  - `description` (String)
  - `quantity` (Integer)
  - `minimum_threshold` (Integer)
- **Request**
  - `id` (UUID, Primary Key)
  - `user_id` (Foreign Key to User)
  - `supply_id` (Foreign Key to Supply)
  - `quantity` (Integer)
  - `status` (Enum: Pending, Approved, Denied)
  - `created_at` (Timestamp)
- **AuditLog**
  - `id` (UUID, Primary Key)
  - `action` (String)
  - `user_id` (Foreign Key to User)
  - `timestamp` (Timestamp)
    """,
    "backend_setup.md": """

## Backend Setup

### 1. Initialize Prisma

```bash
npm install prisma --save-dev
npx prisma init
```

---

### `overview.md`

```markdown
## Overview

The Office Supplies Tracker is a web application designed to manage and track office and cleaning supplies such as clipboards, pens, post-its, paper towels, water bottles, etc. It allows users to monitor inventory levels, request new supplies, and manage supply orders.
```

---

### `features.md`

```markdown
## Features

- **Inventory Management**: Track quantities of various office and cleaning supplies.
- **User Authentication**: Local authentication with username and password.
- **Role-Based Access Control (RBAC)**: Different user roles (e.g., Admin, Staff) with specific permissions.
- **Supply Requests**: Users can request new supplies when inventory is low.
- **Notifications**: Alert users/admins when supplies reach a minimum threshold.
- **Reporting**: Generate reports on supply usage over time.
```

---

### `tech_stack.md`

```markdown
## Tech Stack

- **Backend**:
  - [Neon.tech](https://neon.tech/) (PostgreSQL Database)
  - [Prisma](https://www.prisma.io/) ORM
- **Frontend**:
  NextJs
- **Authentication**:
  - Local authentication using usernames and passwords
- **Additional Tools**:
  - Testing frameworks (e.g., Jest, Playwright)
  - Deployment platforms (e.g., Vercel, Netlify)
```

---

### `requirements.md`

```markdown
## Requirements

### Functional Requirements

- Users can log in and log out securely.
- Admins can add, update, or delete supplies.
- Staff can view supplies and request new orders.
- The system should maintain an audit log of all transactions.

### Non-Functional Requirements

- The application should be responsive and work on all modern browsers.
- Data should be securely stored and transmitted.
- The system should be scalable to accommodate future features.
```

---

### `architecture.md`

```markdown
## Architecture

The application follows a **client-server architecture**:

- **Frontend**: Built with NextJs for a reactive UI.
- **Backend**: Uses Prisma to interact with a PostgreSQL database hosted on Neon.tech.
- **API Layer**: RESTful APIs for communication between frontend and backend.
```

---

### `database_schema.md`

```markdown
## Database Schema

### Entities

- **User**
  - `id` (UUID, Primary Key)
  - `username` (String, Unique)
  - `password` (Hashed String)
  - `role` (Enum: Admin, Staff)
- **Supply**
  - `id` (UUID, Primary Key)
  - `name` (String)
  - `description` (String)
  - `quantity` (Integer)
  - `minimum_threshold` (Integer)
- **Request**
  - `id` (UUID, Primary Key)
  - `user_id` (Foreign Key to User)
  - `supply_id` (Foreign Key to Supply)
  - `quantity` (Integer)
  - `status` (Enum: Pending, Approved, Denied)
  - `created_at` (Timestamp)
- **AuditLog**
  - `id` (UUID, Primary Key)
  - `action` (String)
  - `user_id` (Foreign Key to User)
  - `timestamp` (Timestamp)
```

---

### `backend_setup.md`

````markdown
## Backend Setup

### 1. Initialize Prisma

```bash
npm install prisma --save-dev
npx prisma init
```
````

### 2. Configure Database

Set up a PostgreSQL database on Neon.tech and update the `DATABASE_URL` in `.env` file.

```env
DATABASE_URL="postgresql://user:password@host:port/database"
```

### 3. Define Prisma Schema

Update `prisma/schema.prisma` with the database schema defined above.

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Migrate Database

```bash
npx prisma migrate dev --name init
```

### 6. Set Up Server

Create an Express.js or similar server to handle API requests.

```bash
npm install express
```

### 7. Implement API Endpoints

- **Authentication**
  - `POST /api/login`
  - `POST /api/logout`
- **Supplies**
  - `GET /api/supplies`
  - `POST /api/supplies` (Admin only)
  - `PUT /api/supplies/:id` (Admin only)
  - `DELETE /api/supplies/:id` (Admin only)
- **Requests**
  - `POST /api/requests`
  - `GET /api/requests` (Admin can view all)
  - `PUT /api/requests/:id` (Admin can approve/deny)

````

---

### `frontend_setup.md`

```markdown
## Frontend Setup

  something here

### 4. Build UI Components

- **Login Page**
- **Dashboard**
- **Inventory List**
- **Request Form**
- **Admin Panel**

### 5. State Management



### 6. API Integration

Use `fetch` or `axios` to communicate with the backend APIs.

````

---

### `authentication_and_authorization.md`

```markdown
## Authentication and Authorization

### Local Authentication

- Use bcrypt to hash passwords.
- Implement session management with cookies or JWTs.

### Role-Based Access Control (RBAC)

- Middleware to check user roles before allowing access to certain endpoints.
- Frontend route guards to prevent unauthorized access to pages.
```

---

### `testing.md`

````markdown
## Testing

### Unit Tests

- Use Jest for testing individual functions and components.

```bash
npm install --save-dev jest
```
````

### Integration Tests

- Use Supertest for API endpoint testing.

```bash
npm install --save-dev supertest
```

### End-to-End Tests

- Use Playwright or Cypress for testing user flows.

```bash
npm install --save-dev playwright
```

### Testing Strategy

- Write tests for each tollgate to ensure new features work as expected.
- Use CI/CD pipelines to automate testing.

````

---

### `deployment.md`

```markdown
## Deployment

### Backend Deployment

- Deploy the backend server to platforms like Heroku, AWS, or DigitalOcean.
- Ensure environment variables are securely managed.

### Frontend Deployment

- Deploy the frontend to Vercel or Netlify.
- Set up build scripts in `package.json`.

### Continuous Integration/Continuous Deployment (CI/CD)

- Use GitHub Actions or GitLab CI for automating tests and deployments.
````

---

### `tollgate_process.md`

```markdown
## Tollgate Process

At each tollgate, perform the following steps:

1. **Code Review**: Ensure code meets quality standards.
2. **Testing**: Run all unit, integration, and E2E tests.
3. **Documentation**: Update documentation with new features or changes.
4. **Deployment**: Deploy to a staging environment for further testing.
5. **Approval**: Get sign-off before deploying to production.
```

---

### `additional_considerations.md`

```markdown
## Additional Considerations

### Security

- Implement input validation to prevent SQL injection and XSS attacks.
- Use HTTPS to encrypt data in transit.

### Performance

- Implement caching strategies where appropriate.
- Optimize database queries with indexing.

### Scalability

- Design the system to handle an increasing number of users and data.
- Consider microservices architecture if needed in the future.

### Logging and Monitoring

- Use tools like Winston for logging.
- Set up monitoring dashboards to track application health.

### Internationalization (i18n)

- Plan for multiple languages if needed by using localization libraries.
```

---
